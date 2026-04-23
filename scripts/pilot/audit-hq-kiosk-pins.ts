/**
 * HQ Kiosk PIN Audit Script
 *
 * AMAÇ:
 * - HQ rollerindeki kullanıcıların HQ branch (23) DIŞINDA aktif kiosk PIN'i
 *   olup olmadığını denetler. Politika: docs/pilot/hq-kiosk-pin-politikasi.md §3
 * - Sprint #128 ile yeni PIN açılması engellendi; bu script geçmiş kayıtları
 *   periyodik olarak tarayıp pilot raporuna ekler.
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

import { db } from "../../server/db";
import { branchStaffPins, users, branches } from "@shared/schema";
import { and, eq, inArray, ne } from "drizzle-orm";
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const HQ_BRANCH_ID = 23;

const HQ_ROLES = [
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

interface AuditRow {
  pinId: number;
  branchId: number;
  branchName: string;
  userId: string;
  username: string;
  fullName: string | null;
  role: string;
  createdAt: string | null;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function buildMarkdown(rows: AuditRow[], runAt: Date): string {
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

async function main(): Promise<number> {
  const runAt = new Date();
  console.log(`[audit-hq-kiosk-pins] ${runAt.toISOString()} — başlıyor`);

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

  const rows: AuditRow[] = rawRows.map((r) => {
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

  const payload = {
    runAt: runAt.toISOString(),
    policy: "docs/pilot/hq-kiosk-pin-politikasi.md#3",
    hqBranchId: HQ_BRANCH_ID,
    hqRoles: HQ_ROLES,
    violationCount: rows.length,
    status: rows.length === 0 ? "PASS" : "FAIL",
    violations: rows,
  };

  writeFileSync(jsonPath, JSON.stringify(payload, null, 2) + "\n", "utf-8");
  writeFileSync(mdPath, buildMarkdown(rows, runAt), "utf-8");

  console.log(`[audit-hq-kiosk-pins] JSON  → ${jsonPath}`);
  console.log(`[audit-hq-kiosk-pins] MD    → ${mdPath}`);
  console.log(`[audit-hq-kiosk-pins] İhlal: ${rows.length}`);
  console.log(`[audit-hq-kiosk-pins] DURUM: ${payload.status}`);

  return rows.length === 0 ? 0 : 1;
}

main()
  .then((code) => {
    process.exit(code);
  })
  .catch((err) => {
    console.error("[audit-hq-kiosk-pins] HATA:", err);
    process.exit(2);
  });
