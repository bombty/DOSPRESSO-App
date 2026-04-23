/**
 * HQ Kiosk PIN Audit — Scheduler entegrasyonu
 *
 * Politika: docs/pilot/hq-kiosk-pin-politikasi.md §3.1
 *
 * - `runHqKioskPinAudit()` script mantığını çalıştırır, JSON+MD üretir,
 *   sonucu döndürür. Hem CLI script (`scripts/pilot/audit-hq-kiosk-pins.ts`)
 *   hem de scheduler bu fonksiyonu çağırır.
 * - `startHqKioskPinAuditScheduler()` her gece 02:00 (Europe/Istanbul) audit'i
 *   tetikler. FAIL durumunda `audit_logs` tablosuna alarm düşer.
 */
import { and, eq, inArray, ne } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import { db } from "../db";
import { auditLogs, branchStaffPins, users, branches } from "@shared/schema";
import { schedulerManager } from "../scheduler-manager";

export const HQ_BRANCH_ID = 23;

export const HQ_ROLES = [
  "admin",
  "ceo",
  "cgo",
  "ceo_observer",
  "muhasebe_ik",
  "satinalma",
  "kalite_kontrol",
  "marketing",
  "teknik",
  "trainer",
  "coach",
  "destek",
  "yatirimci_hq",
] as const;

export interface HqKioskPinAuditViolation {
  pinId: number;
  branchId: number;
  branchName: string;
  userId: string;
  username: string;
  fullName: string | null;
  role: string;
  createdAt: string | null;
}

export interface HqKioskPinAuditResult {
  status: "PASS" | "FAIL";
  violationCount: number;
  violations: HqKioskPinAuditViolation[];
  jsonPath: string;
  mdPath: string;
  runAt: string;
}

const REPORT_TIMEZONE = "Europe/Istanbul";

/**
 * Rapor tarih damgası DAİMA Europe/Istanbul üzerinden üretilir.
 * Sunucu UTC'de çalıştığında 02:00 TR henüz UTC'nin önceki gününde
 * olabilir; bu nedenle scheduler tetiklemesi ile dosya adı arasındaki
 * tutarsızlığı engellemek için tek tip kaynak.
 */
function ymd(d: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: REPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

function buildMarkdown(rows: HqKioskPinAuditViolation[], runAt: Date): string {
  const stamp = runAt.toISOString();
  const status = rows.length === 0 ? "PASS" : "FAIL";
  const lines: string[] = [];
  lines.push(`# HQ Kiosk PIN Audit — ${ymd(runAt)}`);
  lines.push("");
  lines.push(`- **Çalıştırma:** ${stamp}`);
  lines.push(`- **Politika:** \`docs/pilot/hq-kiosk-pin-politikasi.md\` §3`);
  lines.push(`- **Kapsam:** \`branch_staff_pins.is_active = true\` AND \`branch_id != ${HQ_BRANCH_ID}\` AND HQ rolü`);
  lines.push(`- **HQ rolleri:** ${HQ_ROLES.map((r) => `\`${r}\``).join(", ")}`);
  lines.push(`- **İhlal sayısı:** ${rows.length}`);
  lines.push(`- **Durum:** **${status}**`);
  lines.push("");

  if (rows.length === 0) {
    lines.push("## Sonuç");
    lines.push("");
    lines.push("HQ rolündeki hiçbir kullanıcının HQ branch dışında aktif kiosk PIN'i yok. Politika ihlali bulunmadı.");
    return lines.join("\n") + "\n";
  }

  lines.push("## İhlal Listesi");
  lines.push("");
  lines.push("| PIN ID | Branch | Kullanıcı | Rol | Ad Soyad | Oluşturma |");
  lines.push("|--------|--------|-----------|-----|----------|-----------|");
  for (const r of rows) {
    lines.push(
      `| ${r.pinId} | ${r.branchId} (${r.branchName}) | \`${r.username}\` | ${r.role} | ${r.fullName ?? "-"} | ${r.createdAt ?? "-"} |`,
    );
  }
  lines.push("");
  lines.push("## Deaktive SQL");
  lines.push("");
  lines.push("```sql");
  lines.push("-- Aşağıdaki PIN kayıtlarını manuel onay sonrası deaktive et:");
  for (const r of rows) {
    lines.push(
      `UPDATE branch_staff_pins SET is_active = false, updated_at = NOW() WHERE id = ${r.pinId}; -- ${r.username} @ ${r.branchName}`,
    );
  }
  lines.push("```");
  lines.push("");
  lines.push("## Aksiyon");
  lines.push("");
  lines.push("1. Her satırı ilgili kullanıcı/şube müdürü ile doğrula.");
  lines.push("2. Onay sonrası yukarıdaki SQL'i prod DB'de çalıştır.");
  lines.push("3. Bu script'i tekrar çalıştır → PASS bekleniyor.");
  return lines.join("\n") + "\n";
}

export async function runHqKioskPinAudit(): Promise<HqKioskPinAuditResult> {
  const runAt = new Date();

  const rawRows = await db
    .select({
      pinId: branchStaffPins.id,
      branchId: branchStaffPins.branchId,
      branchName: branches.name,
      userId: branchStaffPins.userId,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      createdAt: branchStaffPins.createdAt,
    })
    .from(branchStaffPins)
    .innerJoin(users, eq(users.id, branchStaffPins.userId))
    .innerJoin(branches, eq(branches.id, branchStaffPins.branchId))
    .where(
      and(
        eq(branchStaffPins.isActive, true),
        ne(branchStaffPins.branchId, HQ_BRANCH_ID),
        inArray(users.role, HQ_ROLES as unknown as string[]),
      ),
    );

  const violations: HqKioskPinAuditViolation[] = rawRows.map((r) => {
    const fullName = [r.firstName, r.lastName].filter(Boolean).join(" ").trim() || null;
    return {
      pinId: r.pinId,
      branchId: r.branchId,
      branchName: r.branchName ?? `branch-${r.branchId}`,
      userId: r.userId,
      username: r.username ?? "(no-username)",
      fullName,
      role: r.role,
      createdAt: r.createdAt ? new Date(r.createdAt as unknown as string).toISOString() : null,
    };
  });

  const outDir = join(process.cwd(), "docs", "pilot", "audit");
  mkdirSync(outDir, { recursive: true });

  const stamp = ymd(runAt);
  const jsonPath = join(outDir, `hq-kiosk-pins-${stamp}.json`);
  const mdPath = join(outDir, `hq-kiosk-pins-${stamp}.md`);

  const status: "PASS" | "FAIL" = violations.length === 0 ? "PASS" : "FAIL";

  const payload = {
    runAt: runAt.toISOString(),
    policy: "docs/pilot/hq-kiosk-pin-politikasi.md#3",
    hqBranchId: HQ_BRANCH_ID,
    hqRoles: HQ_ROLES,
    violationCount: violations.length,
    status,
    violations,
  };

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  writeFileSync(mdPath, buildMarkdown(violations, runAt), "utf-8");

  return {
    status,
    violationCount: violations.length,
    violations,
    jsonPath,
    mdPath,
    runAt: runAt.toISOString(),
  };
}

async function logAuditAlarm(result: HqKioskPinAuditResult): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      eventType: "kiosk.hq_pin_audit_alert",
      action: "ALERT",
      resource: "branch_staff_pins",
      actorRole: "system",
      details: {
        source: "hq-kiosk-pin-audit-scheduler",
        status: result.status,
        violationCount: result.violationCount,
        runAt: result.runAt,
        jsonReport: result.jsonPath,
        mdReport: result.mdPath,
        violations: result.violations.map((v) => ({
          pinId: v.pinId,
          branchId: v.branchId,
          branchName: v.branchName,
          userId: v.userId,
          username: v.username,
          role: v.role,
        })),
      },
    });
  } catch (err) {
    console.error("[HQ Kiosk PIN Audit] audit_logs insert failed:", err);
  }
}

let auditRunning = false;

async function tickHqKioskPinAudit(): Promise<void> {
  if (auditRunning) return;
  auditRunning = true;
  try {
    const result = await runHqKioskPinAudit();
    if (result.status === "FAIL") {
      console.warn(
        `[HQ Kiosk PIN Audit] FAIL — ${result.violationCount} ihlal. Rapor: ${result.mdPath}`,
      );
      await logAuditAlarm(result);
    } else {
      console.log(
        `[HQ Kiosk PIN Audit] PASS — ihlal yok. Rapor: ${result.mdPath}`,
      );
    }
  } catch (err) {
    console.error("[HQ Kiosk PIN Audit] çalıştırma hatası:", err);
  } finally {
    auditRunning = false;
  }
}

/**
 * 10 dakikada bir kontrol; sadece Europe/Istanbul saatiyle 02:00-02:09
 * aralığında audit'i çalıştırır. Diğer schedulerlarla aynı pattern.
 */
export function startHqKioskPinAuditScheduler(): void {
  schedulerManager.registerInterval(
    "hq-kiosk-pin-audit-daily",
    async () => {
      const now = new Date(
        new Date().toLocaleString("en-US", { timeZone: "Europe/Istanbul" }),
      );
      if (now.getHours() === 2 && now.getMinutes() < 10) {
        await tickHqKioskPinAudit();
      }
    },
    10 * 60 * 1000,
  );
  console.log(
    "[HQ Kiosk PIN Audit] scheduler started (daily @ 02:00 Europe/Istanbul)",
  );
}
