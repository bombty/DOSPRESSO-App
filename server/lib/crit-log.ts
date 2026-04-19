/**
 * ═══════════════════════════════════════════════════════════════════
 * Sprint E — Critical Log Helper
 *
 * Bağlam: Sprint D'de 6 P0 yerinde [CRITICAL][PDKS-SYNC] prefix'li
 * console.error eklendi. Ama bu log'lar sadece Replit stdout'una
 * gidiyor; admin panelinde görünmüyor.
 *
 * Bu helper:
 *   1. console.error'ı AYNI ŞEKİLDE yazar (mevcut pattern bozulmaz)
 *   2. system_critical_logs tablosuna insert eder (kalıcı)
 *   3. Hata fırlatmaz (helper'ın kendi fail'i pipeline'ı bozmaz)
 *
 * Kullanım:
 *   await critLog('PDKS-SYNC', 'Branch kiosk giris pdks yazılamadı', {
 *     userId, branchId, error: errMessage,
 *   });
 *
 * Migration: startup'ta system_critical_logs tablosu CREATE edilir
 * (Drizzle migration şemasına bağımlı değil - manuel SQL).
 *
 * Hazırlayan: Claude (Sprint E, 19 Nis 2026 gece)
 * ═══════════════════════════════════════════════════════════════════
 */

import { db } from "../db";
import { sql } from "drizzle-orm";
import { systemCriticalLogs } from "@shared/schema";

/**
 * Kritik log kaydı — console.error + DB insert.
 *
 * @param tag  Kısa kategorik etiket. Sprint D pattern: "PDKS-SYNC",
 *             "HQ-KIOSK", "FAB-KIOSK". Diğer modüller için:
 *             "AGENT-FAIL", "MIGRATION-ERR", "SCHEDULER-ERR", vs.
 * @param message İnsanca özet mesaj (ilk 200 char'a trim'lenir)
 * @param context Structured data: userId, branchId, error, stack vs.
 * @param sourceLocation Opsiyonel: "file.ts:123" formatında.
 */
export async function critLog(
  tag: string,
  message: string,
  context?: Record<string, any>,
  sourceLocation?: string,
): Promise<void> {
  // 1. console.error — mevcut pattern korunsun (Replit logs)
  const prefix = `[CRITICAL][${tag}]`;
  console.error(prefix, message, context || {});

  // 2. DB persist — non-blocking (kendi hatası pipeline'ı bozmaz)
  try {
    await db.insert(systemCriticalLogs).values({
      tag: tag.substring(0, 50),
      message: message.substring(0, 500), // insan okunur kısım kesilsin
      context: context || null,
      sourceLocation: sourceLocation?.substring(0, 200) || null,
      status: "new",
    });
  } catch (insertErr: any) {
    // Meta-silent failure: critLog fail ederse sadece stderr'e yaz,
    // throw ETME (sonsuz döngü riski var).
    console.error(
      `[CRITICAL-META] critLog insert failed for tag=${tag}:`,
      insertErr?.message || insertErr,
    );
  }
}

/**
 * Startup migration — system_critical_logs tablosunu CREATE eder.
 * Drizzle schema-05.ts'te tanımlı ama Drizzle migration kırık, manuel SQL.
 * Idempotent (IF NOT EXISTS), server/index.ts startup hook'unda çağrılır.
 */
export async function migrateCriticalLogsTable(): Promise<void> {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS system_critical_logs (
        id SERIAL PRIMARY KEY,
        tag VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        context JSONB,
        source_location VARCHAR(200),
        status VARCHAR(20) NOT NULL DEFAULT 'new',
        acknowledged_by_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
        acknowledged_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS system_critical_logs_created_idx
        ON system_critical_logs (created_at DESC)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS system_critical_logs_status_idx
        ON system_critical_logs (status)
    `);
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS system_critical_logs_tag_idx
        ON system_critical_logs (tag)
    `);
    console.log("[Sprint E] system_critical_logs table + indexes ready");
  } catch (e: any) {
    console.error("[Sprint E] Migration error:", e?.message || e);
  }
}
