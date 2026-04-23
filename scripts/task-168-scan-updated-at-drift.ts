/**
 * Task #168: 'updated_at' kolon drift'i toplu tarama.
 *
 * Drizzle şemada (shared/schema/*) `updatedAt` (DB adı: updated_at) kolonu
 * tanımlı tüm tabloları bulur, gerçek PostgreSQL veritabanında bu kolonun
 * mevcut olup olmadığını kontrol eder. Eksik olanlar için task #156 ile aynı
 * pattern'i kullanan idempotent bir migration SQL üretir:
 *
 *   1) ALTER TABLE ... ADD COLUMN IF NOT EXISTS updated_at timestamptz
 *   2) UPDATE ... SET updated_at = COALESCE(created_at, NOW()) WHERE NULL
 *   3) ALTER COLUMN SET DEFAULT NOW(), SET NOT NULL
 *   4) BEFORE UPDATE trigger
 *
 * Kullanım:
 *   tsx scripts/task-168-scan-updated-at-drift.ts
 *     → Konsola rapor + scripts/task-168-updated-at-drift-fix.sql üretir
 *
 *   tsx scripts/task-168-scan-updated-at-drift.ts --check
 *     → CI modu: drift varsa exit 1 (SQL yine de yazılır).
 */

import { writeFileSync } from "node:fs";
import { is } from "drizzle-orm";
import { PgTable, getTableConfig } from "drizzle-orm/pg-core";
import { pool } from "../server/db";
import * as schema from "../shared/schema";

const FIX_FILE = "scripts/task-168-updated-at-drift-fix.sql";
const CHECK_MODE = process.argv.includes("--check");

type Expected = {
  table: string;
  hasCreatedAt: boolean;
};

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

async function collectExpected(): Promise<Expected[]> {
  const out: Expected[] = [];
  const seen = new Set<string>();
  for (const exported of Object.values(schema)) {
    if (!is(exported, PgTable)) continue;
    const cfg = getTableConfig(exported);
    if (cfg.schema && cfg.schema !== "public") continue;
    if (seen.has(cfg.name)) continue;

    const cols = cfg.columns.map((c) => c.name);
    if (!cols.includes("updated_at")) continue;

    seen.add(cfg.name);
    out.push({
      table: cfg.name,
      hasCreatedAt: cols.includes("created_at"),
    });
  }
  return out.sort((a, b) => a.table.localeCompare(b.table));
}

async function collectActual(tables: string[]) {
  if (tables.length === 0) return { existing: new Set<string>(), withCol: new Set<string>() };

  const tablesRes = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
         AND table_name = ANY($1)`,
    [tables],
  );
  const existing = new Set(tablesRes.rows.map((r) => r.table_name));

  const colsRes = await pool.query<{ table_name: string }>(
    `SELECT table_name FROM information_schema.columns
       WHERE table_schema = 'public'
         AND column_name = 'updated_at'
         AND table_name = ANY($1)`,
    [tables],
  );
  const withCol = new Set(colsRes.rows.map((r) => r.table_name));

  return { existing, withCol };
}

function buildMigration(missing: Expected[]): string {
  const lines: string[] = [];
  lines.push("-- Task #168: Eksik updated_at kolonlarını topluca tamamla");
  lines.push(`-- Üretildi: ${new Date().toISOString()}`);
  lines.push("-- Bu dosya scripts/task-168-scan-updated-at-drift.ts tarafından üretilmiştir.");
  lines.push("-- Pattern: task #156 (factory_ingredient_nutrition) ile birebir aynı.");
  lines.push("--   1) Kolonu NULLABLE ekle  2) created_at ile backfill");
  lines.push("--   3) DEFAULT NOW() + NOT NULL  4) BEFORE UPDATE trigger");
  lines.push("");
  lines.push("BEGIN;");
  lines.push("");
  lines.push(
    "-- Tek bir paylaşılan trigger fonksiyonu — her tabloya ayrı fonksiyon yaratmak yerine",
  );
  lines.push("-- generic bir fonksiyon kullanıyoruz (idempotent CREATE OR REPLACE).");
  lines.push("CREATE OR REPLACE FUNCTION set_updated_at_timestamp()");
  lines.push("RETURNS TRIGGER AS $$");
  lines.push("BEGIN");
  lines.push("  NEW.updated_at = NOW();");
  lines.push("  RETURN NEW;");
  lines.push("END;");
  lines.push("$$ LANGUAGE plpgsql;");
  lines.push("");

  for (const m of missing) {
    const t = quoteIdent(m.table);
    const trgName = quoteIdent(`trg_${m.table}_updated_at`);
    const backfill = m.hasCreatedAt
      ? "SET updated_at = COALESCE(created_at, NOW())"
      : "SET updated_at = NOW()";

    lines.push(`-- ${m.table}`);
    lines.push(`ALTER TABLE ${t} ADD COLUMN IF NOT EXISTS updated_at timestamptz;`);
    lines.push(`UPDATE ${t} ${backfill} WHERE updated_at IS NULL;`);
    lines.push(`ALTER TABLE ${t}`);
    lines.push(`  ALTER COLUMN updated_at SET DEFAULT NOW(),`);
    lines.push(`  ALTER COLUMN updated_at SET NOT NULL;`);
    lines.push(`DROP TRIGGER IF EXISTS ${trgName} ON ${t};`);
    lines.push(
      `CREATE TRIGGER ${trgName} BEFORE UPDATE ON ${t} FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();`,
    );
    lines.push("");
  }

  lines.push("COMMIT;");
  lines.push("");
  return lines.join("\n");
}

async function main() {
  console.log("Task #168 — updated_at drift tarama başlıyor...\n");

  const expected = await collectExpected();
  const tableNames = expected.map((e) => e.table);
  const { existing, withCol } = await collectActual(tableNames);

  const missingTable: string[] = [];
  const missingCol: Expected[] = [];
  const ok: string[] = [];

  for (const e of expected) {
    if (!existing.has(e.table)) {
      missingTable.push(e.table);
      continue;
    }
    if (!withCol.has(e.table)) {
      missingCol.push(e);
    } else {
      ok.push(e.table);
    }
  }

  console.log(`Şemada updatedAt tanımlı tablo : ${expected.length}`);
  console.log(`DB'de updated_at kolonu var    : ${ok.length}`);
  console.log(`DB'de eksik kolon              : ${missingCol.length}`);
  console.log(`DB'de tablo yok (atlandı)      : ${missingTable.length}\n`);

  if (missingTable.length) {
    console.log("ℹ️  DB'de bulunmayan tablolar (ayrı task ile yaratılmalı):");
    for (const t of missingTable) console.log(`  - ${t}`);
    console.log("");
  }

  if (missingCol.length) {
    console.log("⚠️  Eksik updated_at kolonu olan tablolar:");
    for (const m of missingCol) {
      console.log(`  - ${m.table}${m.hasCreatedAt ? "" : "  (created_at YOK — backfill NOW())"}`);
    }
    console.log("");

    const sql = buildMigration(missingCol);
    writeFileSync(FIX_FILE, sql);
    console.log(`✏️  Migration yazıldı: ${FIX_FILE}`);
  } else {
    console.log("✅ Eksik updated_at kolonu yok.");
  }

  await pool.end();

  if (CHECK_MODE && missingCol.length > 0) {
    console.error(`\n❌ ${missingCol.length} tabloda updated_at drift var. CI başarısız.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Tarama hata aldı:", err);
  process.exit(2);
});
