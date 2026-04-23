/**
 * HQ Kiosk PIN Audit Script (CLI)
 *
 * AMAÇ:
 * - HQ rollerindeki kullanıcıların HQ branch (23) DIŞINDA aktif kiosk PIN'i
 *   olup olmadığını denetler. Politika: docs/pilot/hq-kiosk-pin-politikasi.md §3
 * - Sprint #128 ile yeni PIN açılması engellendi; bu script geçmiş kayıtları
 *   periyodik olarak tarayıp pilot raporuna ekler.
 * - Asıl audit mantığı `server/scheduler/hq-kiosk-pin-audit.ts` altında ortak
 *   modüle taşındı; scheduler (Task #212) ve bu CLI aynı kodu kullanır.
 *
 * ÇALIŞTIRMA:
 *   tsx scripts/pilot/audit-hq-kiosk-pins.ts
 *
 * ÇIKTI:
 *   - docs/pilot/audit/hq-kiosk-pins-<YYYY-MM-DD>.json
 *   - docs/pilot/audit/hq-kiosk-pins-<YYYY-MM-DD>.md
 *   - stdout: PASS / FAIL özeti
 *
 * EXIT CODE:
 *   0 → PASS (0 ihlal)
 *   1 → FAIL (>=1 ihlal var, manuel deaktive gerekli)
 *   2 → Beklenmedik hata
 */

import { runHqKioskPinAudit } from "../../server/scheduler/hq-kiosk-pin-audit";

async function main(): Promise<number> {
  const startedAt = new Date();
  console.log(`[audit-hq-kiosk-pins] ${startedAt.toISOString()} — başlıyor`);

  const result = await runHqKioskPinAudit();

  console.log(`[audit-hq-kiosk-pins] JSON  → ${result.jsonPath}`);
  console.log(`[audit-hq-kiosk-pins] MD    → ${result.mdPath}`);
  console.log(`[audit-hq-kiosk-pins] İhlal: ${result.violationCount}`);
  console.log(`[audit-hq-kiosk-pins] DURUM: ${result.status}`);

  return result.status === "PASS" ? 0 : 1;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error("[audit-hq-kiosk-pins] HATA:", err);
    process.exit(2);
  });
