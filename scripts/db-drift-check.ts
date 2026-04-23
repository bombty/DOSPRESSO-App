/**
 * DB Drift Kontrolü
 *
 * Drizzle schema (shared/schema/*) içindeki UNIQUE constraint, unique/normal
 * index ve foreign key tanımlarını gerçek PostgreSQL veritabanı ile
 * karşılaştırır. Drift varsa konsola raporlar ve scripts/db-drift-fix.sql
 * dosyasına eksik constraint/index'leri eklemek için ALTER/CREATE INDEX
 * komutları üretir.
 *
 * Kullanım:
 *   tsx scripts/db-drift-check.ts            # rapor + scripts/db-drift-fix.sql üret
 *   tsx scripts/db-drift-check.ts --check    # CI modu: gerçek drift varsa exit 1
 *   tsx scripts/db-drift-check.ts --check --strict
 *                                            # ek olarak FK çıkarımı atlanan
 *                                            # tabloları (cross-file circular
 *                                            # import) da fail olarak say.
 *
 * Runbook (her ortam için ayrı uygulanır):
 *   1. tsx scripts/db-drift-check.ts             # raporu oku, fix.sql üret
 *   2. scripts/db-drift-fix.sql gözden geçir     # duplicate / orphan satır kontrolü
 *   3. psql $DATABASE_URL -f scripts/db-drift-fix.sql
 *   4. tsx scripts/db-drift-check.ts --check     # exit 0 olduğunu doğrula
 */

import { writeFileSync } from "node:fs";
import { is } from "drizzle-orm";
import {
  PgTable,
  getTableConfig,
  type PgColumn,
} from "drizzle-orm/pg-core";
import { pool } from "../server/db";
import * as schema from "../shared/schema";

type IndexColumnLike = { name?: string };
function hasName(value: unknown): value is IndexColumnLike & { name: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "name" in value &&
    typeof (value as IndexColumnLike).name === "string"
  );
}

type ExpectedUnique = {
  table: string;
  name: string | undefined;
  columns: string[];
  source: "column" | "table";
};

type ExpectedIndex = {
  table: string;
  name: string;
  columns: string[];
  unique: boolean;
};

type ExpectedFk = {
  table: string;
  name: string | undefined;
  columns: string[];
  refTable: string;
  refColumns: string[];
};

const FIX_FILE = "scripts/db-drift-fix.sql";
const CHECK_MODE = process.argv.includes("--check");
const STRICT_MODE = process.argv.includes("--strict");

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function deriveUniqueName(table: string, columns: string[]): string {
  // Drizzle default: <table>_<col1>_<col2>_..._unique
  return `${table}_${columns.join("_")}_unique`;
}

async function collectExpected() {
  const tables = new Set<string>();
  const expectedUniques: ExpectedUnique[] = [];
  const expectedIndexes: ExpectedIndex[] = [];
  const expectedFks: ExpectedFk[] = [];

  const skippedFks: Array<{ table: string; reason: string }> = [];

  for (const exported of Object.values(schema)) {
    if (!is(exported, PgTable)) continue;
    const cfg = getTableConfig(exported);
    if (cfg.schema && cfg.schema !== "public") continue;
    tables.add(cfg.name);

    // Column-level .unique()
    for (const col of cfg.columns) {
      if (col.isUnique) {
        expectedUniques.push({
          table: cfg.name,
          name: col.uniqueName ?? deriveUniqueName(cfg.name, [col.name]),
          columns: [col.name],
          source: "column",
        });
      }
    }

    // Table-level unique(...) constraints
    for (const u of cfg.uniqueConstraints) {
      const cols = u.columns.map((c: PgColumn) => c.name);
      expectedUniques.push({
        table: cfg.name,
        name: u.name ?? deriveUniqueName(cfg.name, cols),
        columns: cols,
        source: "table",
      });
    }

    // Indexes (including uniqueIndex). Index.config exposes everything publicly.
    for (const idx of cfg.indexes) {
      const { name, columns, unique } = idx.config;
      const cols: string[] = columns.filter(hasName).map((c) => c.name);
      // SQL-only indexes (no column names) don't drift in a meaningful way here.
      if (!name || cols.length === 0) continue;
      expectedIndexes.push({
        table: cfg.name,
        name,
        columns: cols,
        unique: !!unique,
      });
    }

    // Foreign keys. fk.reference() may throw if a referenced table is not yet
    // initialized due to cross-file circular imports (a known issue in this
    // repo). We surface those skips explicitly instead of swallowing them.
    for (const fk of cfg.foreignKeys) {
      try {
        const ref = fk.reference();
        const cols = ref.columns.map((c: PgColumn) => c.name);
        const refCols = ref.foreignColumns.map((c: PgColumn) => c.name);
        const refTable = getTableConfig(ref.foreignTable).name;
        expectedFks.push({
          table: cfg.name,
          name: fk.getName(),
          columns: cols,
          refTable,
          refColumns: refCols,
        });
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        skippedFks.push({ table: cfg.name, reason });
      }
    }
  }

  return { tables, expectedUniques, expectedIndexes, expectedFks, skippedFks };
}

async function collectActual(tables: Set<string>) {
  const tableList = Array.from(tables);

  // Actual unique constraints (UNIQUE only, not PRIMARY KEY)
  const uniqueRes = await pool.query<{
    table_name: string;
    constraint_name: string;
    columns: string[];
  }>(
    `
    SELECT
      tc.table_name,
      tc.constraint_name,
      array_agg(kcu.column_name::text ORDER BY kcu.ordinal_position)::text[] AS columns
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'UNIQUE'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY($1)
    GROUP BY tc.table_name, tc.constraint_name
    `,
    [tableList],
  );

  // Actual indexes (incl. unique indexes that may not be backed by a constraint)
  const indexRes = await pool.query<{
    table_name: string;
    index_name: string;
    is_unique: boolean;
    columns: string[];
  }>(
    `
    SELECT
      t.relname AS table_name,
      i.relname AS index_name,
      ix.indisunique AS is_unique,
      array_agg(a.attname::text ORDER BY array_position(ix.indkey::int[], a.attnum))::text[] AS columns
    FROM pg_class t
    JOIN pg_namespace n ON n.oid = t.relnamespace
    JOIN pg_index ix ON ix.indrelid = t.oid
    JOIN pg_class i ON i.oid = ix.indexrelid
    JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
    WHERE n.nspname = 'public'
      AND t.relname = ANY($1)
      AND ix.indisprimary = false
    GROUP BY t.relname, i.relname, ix.indisunique
    `,
    [tableList],
  );

  // Actual foreign keys (pg_constraint kullanılıyor — information_schema
  // versiyonu çoklu sütun referanslarında yanlış sonuç üretebiliyor)
  const fkRes = await pool.query<{
    table_name: string;
    constraint_name: string;
    columns: string[];
    ref_table: string;
    ref_columns: string[];
  }>(
    `
    SELECT
      cls.relname AS table_name,
      c.conname AS constraint_name,
      (
        SELECT array_agg(a.attname ORDER BY ord.idx)
        FROM unnest(c.conkey) WITH ORDINALITY AS ord(attnum, idx)
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid AND a.attnum = ord.attnum
      )::text[] AS columns,
      fcls.relname AS ref_table,
      (
        SELECT array_agg(a.attname ORDER BY ord.idx)
        FROM unnest(c.confkey) WITH ORDINALITY AS ord(attnum, idx)
        JOIN pg_attribute a
          ON a.attrelid = c.confrelid AND a.attnum = ord.attnum
      )::text[] AS ref_columns
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_class fcls ON fcls.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = cls.relnamespace
    WHERE c.contype = 'f'
      AND n.nspname = 'public'
      AND cls.relname = ANY($1)
    `,
    [tableList],
  );

  // Tables that actually exist in DB
  const tablesRes = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
  );
  const actualTables = new Set(tablesRes.rows.map((r) => r.table_name));

  return {
    actualTables,
    actualUniqueConstraints: uniqueRes.rows,
    actualIndexes: indexRes.rows,
    actualFks: fkRes.rows,
  };
}

function colsEq(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((v, i) => v === b[i]);
}

type IndexMismatch = {
  expected: ExpectedIndex;
  actualColumns: string[];
  actualUnique: boolean;
};

async function main() {
  console.log("Drizzle schema → PostgreSQL drift kontrolü başlıyor...\n");

  const { tables, expectedUniques, expectedIndexes, expectedFks, skippedFks } =
    await collectExpected();
  const { actualTables, actualUniqueConstraints, actualIndexes, actualFks } =
    await collectActual(tables);

  const fixSql: string[] = [];
  const missingTables: string[] = [];
  const missingUniques: ExpectedUnique[] = [];
  const missingIndexes: ExpectedIndex[] = [];
  const mismatchedIndexes: IndexMismatch[] = [];
  const missingFks: ExpectedFk[] = [];

  for (const t of tables) {
    if (!actualTables.has(t)) missingTables.push(t);
  }

  // DB'de olmayan tablolardaki constraint/index/FK'leri ayrı raporlayacağız;
  // fix.sql'e eklenmemeli (tablo yoksa ALTER fail eder).
  const tableExists = (t: string) => actualTables.has(t);

  // Unique constraints: match by column-set on the same table
  for (const exp of expectedUniques) {
    // Drift OK if either a real UNIQUE constraint OR a unique index covers
    // the same exact column-set on the same table.
    const constraintMatch = actualUniqueConstraints.some(
      (a) => a.table_name === exp.table && colsEq(a.columns, exp.columns),
    );
    const uniqueIndexMatch = actualIndexes.some(
      (a) =>
        a.table_name === exp.table &&
        a.is_unique &&
        colsEq(a.columns, exp.columns),
    );
    if (!constraintMatch && !uniqueIndexMatch) {
      missingUniques.push(exp);
    }
  }

  // Indexes: match by name AND validate columns + uniqueness. A name-only
  // match with mismatched definition is reported as a mismatch (drift), not
  // a clean pass — manual intervention required (DROP + CREATE).
  for (const exp of expectedIndexes) {
    const match = actualIndexes.find(
      (a) => a.table_name === exp.table && a.index_name === exp.name,
    );
    if (!match) {
      missingIndexes.push(exp);
      continue;
    }
    if (
      !colsEq(match.columns, exp.columns) ||
      match.is_unique !== exp.unique
    ) {
      mismatchedIndexes.push({
        expected: exp,
        actualColumns: match.columns,
        actualUnique: match.is_unique,
      });
    }
  }

  // Foreign keys: match by column-set + ref table + ref column-set
  for (const exp of expectedFks) {
    const match = actualFks.some(
      (a) =>
        a.table_name === exp.table &&
        a.ref_table === exp.refTable &&
        colsEq(a.columns, exp.columns) &&
        colsEq(a.ref_columns, exp.refColumns),
    );
    if (!match) {
      missingFks.push(exp);
    }
  }

  // ───────────────── Report ─────────────────
  console.log(`Schema'da tanımlı tablo sayısı : ${tables.size}`);
  console.log(`DB'de bulunmayan tablo         : ${missingTables.length}`);
  console.log(`Eksik UNIQUE constraint        : ${missingUniques.length}`);
  console.log(`Eksik index                    : ${missingIndexes.length}`);
  console.log(`Tanım uyuşmazlığı (index)      : ${mismatchedIndexes.length}`);
  console.log(`Eksik foreign key              : ${missingFks.length}`);
  console.log(`Atlanan FK (resolve edilemedi) : ${skippedFks.length}\n`);

  if (skippedFks.length) {
    console.log("ℹ️  FK çıkarımı sırasında atlanan tablolar:");
    const grouped = new Map<string, number>();
    for (const s of skippedFks) {
      grouped.set(s.table, (grouped.get(s.table) ?? 0) + 1);
    }
    for (const [t, n] of grouped) {
      const sample = skippedFks.find((s) => s.table === t)!;
      console.log(`  - ${t}: ${n} FK (sebep: ${sample.reason})`);
    }
    console.log("");
  }

  if (missingTables.length) {
    console.log("⚠️  DB'de olmayan tablolar (şemada var):");
    for (const t of missingTables) console.log(`  - ${t}`);
    console.log("");
  }

  if (missingUniques.length) {
    console.log("⚠️  Eksik UNIQUE constraint'ler:");
    for (const u of missingUniques) {
      console.log(
        `  - ${u.table}(${u.columns.join(", ")})  [name=${u.name ?? "-"}, src=${u.source}]`,
      );
    }
    console.log("");
  }

  if (missingIndexes.length) {
    console.log("⚠️  Eksik index'ler:");
    for (const i of missingIndexes) {
      console.log(
        `  - ${i.name} ON ${i.table}(${i.columns.join(", ")})${i.unique ? " [UNIQUE]" : ""}`,
      );
    }
    console.log("");
  }

  if (mismatchedIndexes.length) {
    console.log("⚠️  Tanım uyuşmazlığı olan index'ler (manuel DROP+CREATE gerek):");
    for (const m of mismatchedIndexes) {
      const e = m.expected;
      console.log(
        `  - ${e.name} ON ${e.table}: bekleniyor (${e.columns.join(", ")})${e.unique ? " UNIQUE" : ""} | gerçek (${m.actualColumns.join(", ")})${m.actualUnique ? " UNIQUE" : ""}`,
      );
    }
    console.log("");
  }

  if (missingFks.length) {
    console.log("⚠️  Eksik foreign key'ler:");
    for (const f of missingFks) {
      console.log(
        `  - ${f.table}(${f.columns.join(", ")}) → ${f.refTable}(${f.refColumns.join(", ")})  [name=${f.name ?? "-"}]`,
      );
    }
    console.log("");
  }

  // ───────────────── Fix SQL üret ─────────────────
  const fixableFks = missingFks.filter(
    (f) => tableExists(f.table) && tableExists(f.refTable),
  );

  if (missingUniques.length || missingIndexes.length || fixableFks.length) {
    fixSql.push("-- DB DRIFT FIX SCRIPT");
    fixSql.push(`-- Üretildi: ${new Date().toISOString()}`);
    fixSql.push(
      "-- Bu dosya scripts/db-drift-check.ts tarafından otomatik üretilir.",
    );
    fixSql.push("-- Çalıştırmadan önce gözden geçirin (özellikle veri çakışmalarına dikkat).");
    fixSql.push("");
    fixSql.push("BEGIN;");
    fixSql.push("");

    const applicableUniques = missingUniques.filter((u) => tableExists(u.table));
    const applicableIndexes = missingIndexes.filter((i) => tableExists(i.table));
    const skippedUniques = missingUniques.length - applicableUniques.length;
    const skippedIndexes = missingIndexes.length - applicableIndexes.length;

    if (applicableUniques.length) {
      fixSql.push("-- Eksik UNIQUE constraint'ler");
      fixSql.push(
        "-- NOT: Mevcut tabloda duplicate veri varsa ALTER fail eder; önce SELECT ile kontrol edin.",
      );
      for (const u of applicableUniques) {
        const name = u.name ?? deriveUniqueName(u.table, u.columns);
        const cols = u.columns.map(quoteIdent).join(", ");
        fixSql.push(
          `ALTER TABLE ${quoteIdent(u.table)} ADD CONSTRAINT ${quoteIdent(name)} UNIQUE (${cols});`,
        );
      }
      fixSql.push("");
    }

    if (applicableIndexes.length) {
      fixSql.push("-- Eksik index'ler");
      for (const i of applicableIndexes) {
        const cols = i.columns.map(quoteIdent).join(", ");
        const kw = i.unique ? "UNIQUE INDEX" : "INDEX";
        fixSql.push(
          `CREATE ${kw} IF NOT EXISTS ${quoteIdent(i.name)} ON ${quoteIdent(i.table)} (${cols});`,
        );
      }
      fixSql.push("");
    }

    if (fixableFks.length) {
      fixSql.push("-- Eksik foreign key'ler");
      fixSql.push(
        "-- NOT: Orphan satır varsa ALTER fail eder; önce SELECT ile kontrol edin.",
      );
      for (const f of fixableFks) {
        const name =
          f.name ??
          `${f.table}_${f.columns.join("_")}_${f.refTable}_${f.refColumns.join("_")}_fk`;
        const cols = f.columns.map(quoteIdent).join(", ");
        const refCols = f.refColumns.map(quoteIdent).join(", ");
        fixSql.push(
          `ALTER TABLE ${quoteIdent(f.table)} ADD CONSTRAINT ${quoteIdent(name)} FOREIGN KEY (${cols}) REFERENCES ${quoteIdent(f.refTable)} (${refCols});`,
        );
      }
      fixSql.push("");
    }

    const skippedFkCount = missingFks.length - fixableFks.length;
    if (skippedUniques + skippedIndexes + skippedFkCount > 0) {
      fixSql.push(
        `-- ${skippedUniques} UNIQUE, ${skippedIndexes} index ve ${skippedFkCount} FK, DB'de olmayan tablolar için atlandı.`,
      );
      fixSql.push(
        "-- Önce eksik tabloları yaratmak için: npm run db:push (veya scripts/pilot/* script'leri)",
      );
      fixSql.push("");
    }

    if (mismatchedIndexes.length > 0) {
      fixSql.push(
        `-- ${mismatchedIndexes.length} index için tanım uyuşmazlığı var (DROP+CREATE gerek);`,
      );
      fixSql.push(
        "-- otomatik üretilmedi, üstteki konsol raporundan manuel uygulayın.",
      );
      fixSql.push("");
    }

    fixSql.push("COMMIT;");
    fixSql.push("");

    writeFileSync(FIX_FILE, fixSql.join("\n"));
    console.log(`✏️  Fix SQL yazıldı: ${FIX_FILE}`);
  } else {
    console.log("✅ Drift yok — fix script üretilmedi.");
  }

  await pool.end();

  // skippedFks = FK çıkarımı sırasında cross-file circular import nedeniyle
  // resolve edilemeyen tablolar. Bu DB drift değil; tooling kısıtı.
  // Default'ta uyarı olarak konsola basılır ama --check exit'ini etkilemez.
  // --strict ile birlikte ise CI fail olur (kod tabanı temizlendiğinde aktif edilebilir).
  const driftCount =
    missingTables.length +
    missingUniques.length +
    mismatchedIndexes.length +
    missingIndexes.length +
    missingFks.length;
  const strictExtras = STRICT_MODE ? skippedFks.length : 0;

  if (CHECK_MODE && driftCount + strictExtras > 0) {
    const parts = [`${driftCount} drift`];
    if (strictExtras) parts.push(`${strictExtras} resolve edilemeyen FK (--strict)`);
    console.error(`\n❌ ${parts.join(" + ")} tespit edildi. CI başarısız.`);
    process.exit(1);
  }
  if (skippedFks.length && !STRICT_MODE) {
    console.warn(
      `\nℹ️  ${skippedFks.length} FK resolve edilemedi (yukarıda listelendi). ` +
        `--strict ile CI fail olarak işaretlenebilir.`,
    );
  }
}

main().catch((err) => {
  console.error("Drift check hata aldı:", err);
  process.exit(2);
});
