/**
 * Task #134 — Schema'da tanımlı eksik FK'leri DB'ye ekle.
 *
 * Drizzle schema'da `.references()` ile tanımlı ama PostgreSQL'de bulunmayan
 * tüm foreign key constraint'leri tespit eder, her biri için orphan satır
 * kontrolü yapar (nullable kolonlarda NULL'a çeker, NOT NULL kolonlarda
 * uyarı verir) ve ardından ALTER TABLE ADD CONSTRAINT ile FK'yi ekler.
 *
 * Kullanım:
 *   tsx scripts/task-134-add-missing-fks.ts            # tek tek uygula
 *   tsx scripts/task-134-add-missing-fks.ts --dry-run  # sadece raporla
 */

import { is } from "drizzle-orm";
import { PgTable, getTableConfig, type PgColumn } from "drizzle-orm/pg-core";
import { pool } from "../server/db";
import * as schema from "../shared/schema";

const DRY_RUN = process.argv.includes("--dry-run");

type Fk = {
  table: string;
  name: string;
  columns: string[];
  refTable: string;
  refColumns: string[];
};

function q(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function collectExpectedFks(): Promise<{ fks: Fk[]; tables: Set<string> }> {
  const fks: Fk[] = [];
  const tables = new Set<string>();
  for (const exported of Object.values(schema)) {
    if (!is(exported, PgTable)) continue;
    const cfg = getTableConfig(exported);
    if (cfg.schema && cfg.schema !== "public") continue;
    tables.add(cfg.name);
    for (const fk of cfg.foreignKeys) {
      try {
        const ref = fk.reference();
        fks.push({
          table: cfg.name,
          name: fk.getName(),
          columns: ref.columns.map((c: PgColumn) => c.name),
          refTable: getTableConfig(ref.foreignTable).name,
          refColumns: ref.foreignColumns.map((c: PgColumn) => c.name),
        });
      } catch {
        // Cross-file circular import; skip — not in scope here.
      }
    }
  }
  return { fks, tables };
}

async function collectActualFks(tables: Set<string>) {
  const res = await pool.query<{
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
      (SELECT array_agg(a.attname ORDER BY ord.idx)
         FROM unnest(c.conkey) WITH ORDINALITY AS ord(attnum, idx)
         JOIN pg_attribute a
           ON a.attrelid = c.conrelid AND a.attnum = ord.attnum)::text[] AS columns,
      fcls.relname AS ref_table,
      (SELECT array_agg(a.attname ORDER BY ord.idx)
         FROM unnest(c.confkey) WITH ORDINALITY AS ord(attnum, idx)
         JOIN pg_attribute a
           ON a.attrelid = c.confrelid AND a.attnum = ord.attnum)::text[] AS ref_columns
    FROM pg_constraint c
    JOIN pg_class cls ON cls.oid = c.conrelid
    JOIN pg_class fcls ON fcls.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = cls.relnamespace
    WHERE c.contype = 'f' AND n.nspname = 'public'
      AND cls.relname = ANY($1)
    `,
    [Array.from(tables)],
  );
  return res.rows;
}

async function tableExists(name: string): Promise<boolean> {
  const r = await pool.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema='public' AND table_name=$1`,
    [name],
  );
  return r.rowCount! > 0;
}

async function isNullable(table: string, column: string): Promise<boolean> {
  const r = await pool.query<{ is_nullable: string }>(
    `SELECT is_nullable FROM information_schema.columns
     WHERE table_schema='public' AND table_name=$1 AND column_name=$2`,
    [table, column],
  );
  if (r.rowCount === 0) return false;
  return r.rows[0].is_nullable === "YES";
}

function colsEq(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

async function main() {
  const { fks, tables } = await collectExpectedFks();
  const actual = await collectActualFks(tables);

  const missing = fks.filter(
    (e) =>
      !actual.some(
        (a) =>
          a.table_name === e.table &&
          a.ref_table === e.refTable &&
          colsEq(a.columns, e.columns) &&
          colsEq(a.ref_columns, e.refColumns),
      ),
  );

  console.log(`\nToplam FK (schema)       : ${fks.length}`);
  console.log(`DB'de mevcut FK         : ${actual.length}`);
  console.log(`Eksik (uygulanacak)     : ${missing.length}`);
  console.log(DRY_RUN ? "Mod                     : DRY-RUN\n" : "Mod                     : APPLY\n");

  let applied = 0;
  let skippedNoTable = 0;
  let skippedExists = 0;
  let orphansFixed = 0;
  let failures: Array<{ fk: Fk; reason: string }> = [];

  for (const fk of missing) {
    const tag = `${fk.table}(${fk.columns.join(",")}) → ${fk.refTable}(${fk.refColumns.join(",")})`;

    // 1) Tabloların var olduğunu doğrula
    if (!(await tableExists(fk.table)) || !(await tableExists(fk.refTable))) {
      console.log(`  ⏭️  SKIP (tablo yok): ${tag}`);
      skippedNoTable++;
      continue;
    }

    // 2) Aynı isimde constraint zaten var mı (schema mismatch ile)?
    const existsByName = await pool.query(
      `SELECT 1 FROM pg_constraint c
        JOIN pg_class cls ON cls.oid = c.conrelid
        JOIN pg_namespace n ON n.oid = cls.relnamespace
        WHERE n.nspname='public' AND cls.relname=$1 AND c.conname=$2`,
      [fk.table, fk.name],
    );
    if (existsByName.rowCount! > 0) {
      console.log(`  ⏭️  SKIP (aynı isimde constraint var): ${fk.name}`);
      skippedExists++;
      continue;
    }

    // 3) Orphan satır kontrolü (sadece tek-kolonlu FK'ler için ki hepsi öyle)
    if (fk.columns.length !== 1 || fk.refColumns.length !== 1) {
      console.log(`  ⚠️  Çok kolonlu FK manuel inceleme gerek: ${tag}`);
      failures.push({ fk, reason: "multi-column FK" });
      continue;
    }
    const childCol = fk.columns[0];
    const parentCol = fk.refColumns[0];

    const orphanRes = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*)::text AS cnt FROM ${q(fk.table)} child
        WHERE child.${q(childCol)} IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM ${q(fk.refTable)} parent
             WHERE parent.${q(parentCol)} = child.${q(childCol)}
          )`,
    );
    const orphanCount = parseInt(orphanRes.rows[0].cnt, 10);

    if (orphanCount > 0) {
      const nullable = await isNullable(fk.table, childCol);
      console.log(
        `  🧹  Orphan satır: ${orphanCount} (${tag}, nullable=${nullable})`,
      );
      if (DRY_RUN) {
        // Just report
      } else if (nullable) {
        await pool.query(
          `UPDATE ${q(fk.table)} SET ${q(childCol)} = NULL
            WHERE ${q(childCol)} IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM ${q(fk.refTable)} parent
                 WHERE parent.${q(parentCol)} = ${q(fk.table)}.${q(childCol)}
              )`,
        );
        orphansFixed += orphanCount;
      } else {
        console.log(
          `     ❌ Kolon NOT NULL — manuel müdahale gerekli, FK eklenmedi.`,
        );
        failures.push({
          fk,
          reason: `${orphanCount} orphan satır + NOT NULL kolon`,
        });
        continue;
      }
    }

    // 4) FK constraint'i ekle
    const sql = `ALTER TABLE ${q(fk.table)} ADD CONSTRAINT ${q(fk.name)} FOREIGN KEY (${q(childCol)}) REFERENCES ${q(fk.refTable)} (${q(parentCol)})`;
    if (DRY_RUN) {
      console.log(`  📝  ${sql}`);
      continue;
    }
    try {
      await pool.query(sql);
      console.log(`  ✅  ${tag}`);
      applied++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.log(`  ❌  FAIL ${tag}: ${msg}`);
      failures.push({ fk, reason: msg });
    }
  }

  console.log(`\n─── Özet ───`);
  console.log(`Eklenen FK              : ${applied}`);
  console.log(`Temizlenen orphan satır : ${orphansFixed}`);
  console.log(`Atlanan (tablo yok)     : ${skippedNoTable}`);
  console.log(`Atlanan (zaten var)     : ${skippedExists}`);
  console.log(`Başarısız               : ${failures.length}`);
  if (failures.length) {
    console.log("\nBaşarısız FK'ler (manuel inceleme):");
    for (const f of failures) {
      console.log(
        `  - ${f.fk.table}(${f.fk.columns.join(",")}) → ${f.fk.refTable}(${f.fk.refColumns.join(",")}): ${f.reason}`,
      );
    }
  }

  await pool.end();
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error(err);
  await pool.end();
  process.exit(2);
});
