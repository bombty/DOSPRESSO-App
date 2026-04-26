/**
 * Drizzle baseline migration "already applied" işaretleyici (Task #255).
 *
 * Mevcut canlı veritabanı zaten 444+ tabloya sahipken, drizzle-kit generate
 * ile üretilen migrations/0000_baseline.sql tüm tabloları bare CREATE TABLE
 * ile tanımlar. drizzle-orm/migrator bu baseline'ı çalıştırırsa "table
 * already exists" hatasıyla patlar.
 *
 * Bu script baseline'ı drizzle.__drizzle_migrations tablosuna "uygulandı"
 * olarak ekler — gerçek SQL çalıştırılmaz. Sonradan eklenen versiyonlu
 * migration'lar (örn. 0001_*) normal şekilde uygulanmaya devam eder.
 *
 * Kullanım: tsx scripts/db-mark-baseline-applied.ts
 *
 * Not: Idempotent — baseline daha önce işaretlendiyse mesaj basıp çıkar.
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pool } from "../server/db";

const MIGRATION_DIR = resolve(import.meta.dirname, "..", "migrations");
const JOURNAL_PATH = resolve(MIGRATION_DIR, "meta/_journal.json");

type JournalEntry = {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type Journal = {
  version: string;
  dialect: string;
  entries: JournalEntry[];
};

function hashSql(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

async function main() {
  const journalRaw = readFileSync(JOURNAL_PATH, "utf-8");
  const journal: Journal = JSON.parse(journalRaw);
  const baseline = journal.entries.find((e) => e.tag.endsWith("_baseline"));

  if (!baseline) {
    console.error(
      "❌ migrations/meta/_journal.json içinde *_baseline tag'li bir entry bulunamadı.",
    );
    process.exit(1);
  }

  const sqlPath = resolve(MIGRATION_DIR, `${baseline.tag}.sql`);
  const sqlContent = readFileSync(sqlPath, "utf-8");
  const hash = hashSql(sqlContent);

  console.log(`Baseline tag : ${baseline.tag}`);
  console.log(`SQL dosyası   : ${sqlPath}`);
  console.log(`SHA-256 hash  : ${hash}`);

  const existing = await pool.query<{ id: number; hash: string }>(
    `SELECT id, hash FROM drizzle.__drizzle_migrations WHERE hash = $1`,
    [hash],
  );

  if (existing.rowCount && existing.rowCount > 0) {
    console.log(
      `✅ Baseline zaten işaretlenmiş (id=${existing.rows[0].id}). Yapılacak iş yok.`,
    );
    await pool.end();
    return;
  }

  await pool.query(
    `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)`,
    [hash, baseline.when],
  );
  console.log(
    `✅ Baseline drizzle.__drizzle_migrations tablosuna 'uygulandı' olarak eklendi.`,
  );
  await pool.end();
}

main().catch((err) => {
  console.error("❌ Baseline işaretleme hatası:", err);
  process.exit(1);
});
