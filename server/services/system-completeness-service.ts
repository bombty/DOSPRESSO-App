import { db } from "../db";
import { branches, users, checklists, checklistAssignments, branchRecurringTasks, shifts, slaRules, certificateSettings, customerFeedback, trainingAssignments } from "@shared/schema";
import { eq, and, isNull, sql, inArray } from "drizzle-orm";

export interface CompletenessItem {
  id: string;
  category: "personnel" | "checklist" | "settings" | "data" | "training" | "configuration";
  severity: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  deepLink: string;
  targetRoles: string[];
  targetBranchId?: number;
  autoResolvable: boolean;
  checkFn: string;
}

const HQ_BRANCH_KEYWORDS = ["HQ", "Merkez", "Fabrika"];

function isHQOrFactory(branchName: string): boolean {
  return HQ_BRANCH_KEYWORDS.some(kw => branchName.includes(kw));
}

export async function detectSystemGaps(): Promise<CompletenessItem[]> {
  const gaps: CompletenessItem[] = [];

  try {
    const activeBranches = await db.select().from(branches).where(eq(branches.isActive, true));
    const allUsers = await db.select({
      id: users.id,
      role: users.role,
      branchId: users.branchId,
      isActive: users.isActive,
    }).from(users).where(eq(users.isActive, true));

    const shopBranches = activeBranches.filter(b => !isHQOrFactory(b.name));

    for (const branch of activeBranches) {
      const branchUsers = allUsers.filter(u => u.branchId === branch.id);
      const roles = branchUsers.map(u => u.role);

      if (isHQOrFactory(branch.name)) continue;

      if (!roles.includes("mudur") && !roles.includes("supervisor")) {
        gaps.push({
          id: `personnel-no-manager-${branch.id}`,
          category: "personnel",
          severity: "critical",
          title: `${branch.name}: Şube yöneticisi yok`,
          description: `${branch.name} şubesinde müdür veya supervisor tanımlı değil. Şube operasyonları yönetilemez. Hemen bir yönetici atayın.`,
          deepLink: `/admin?tab=users&action=create&branchId=${branch.id}`,
          targetRoles: ["admin", "coach", "muhasebe_ik"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "personnel-manager-check",
        });
      }

      const staffCount = roles.filter(r => ["barista", "bar_buddy", "stajyer"].includes(r)).length;
      if (staffCount < 2) {
        gaps.push({
          id: `personnel-low-staff-${branch.id}`,
          category: "personnel",
          severity: staffCount === 0 ? "critical" : "high",
          title: `${branch.name}: Yetersiz personel (${staffCount} kişi)`,
          description: `${branch.name} şubesinde sadece ${staffCount} barista/stajyer var. En az 2-3 personel hesabı oluşturun.`,
          deepLink: `/admin?tab=users&action=create&branchId=${branch.id}`,
          targetRoles: ["admin", "coach", "muhasebe_ik"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "personnel-staff-count",
        });
      }

      if (!roles.includes("sube_kiosk")) {
        gaps.push({
          id: `personnel-no-kiosk-${branch.id}`,
          category: "personnel",
          severity: "medium",
          title: `${branch.name}: Kiosk hesabı yok`,
          description: `${branch.name} şubesinde kiosk kullanıcısı tanımlı değil. PDKS ve görev takibi için kiosk hesabı gereklidir.`,
          deepLink: `/admin?tab=users&action=create&branchId=${branch.id}&role=sube_kiosk`,
          targetRoles: ["admin"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "personnel-kiosk-check",
        });
      }
    }

    const allAssignments = await db.select({
      branchId: checklistAssignments.branchId,
      checklistId: checklistAssignments.checklistId,
      isActive: checklistAssignments.isActive,
    }).from(checklistAssignments).where(eq(checklistAssignments.isActive, true));

    const allChecklists = await db.select({
      id: checklists.id,
      title: checklists.title,
      category: checklists.category,
      isActive: checklists.isActive,
    }).from(checklists).where(eq(checklists.isActive, true));

    const openingKeywords = ["açılış", "opening", "sabah"];
    const closingKeywords = ["kapanış", "closing", "akşam"];

    const openingChecklistIds = allChecklists
      .filter(c => openingKeywords.some(kw => (c.category || "").toLowerCase().includes(kw) || (c.title || "").toLowerCase().includes(kw)))
      .map(c => c.id);

    const closingChecklistIds = allChecklists
      .filter(c => closingKeywords.some(kw => (c.category || "").toLowerCase().includes(kw) || (c.title || "").toLowerCase().includes(kw)))
      .map(c => c.id);

    for (const branch of shopBranches) {
      const branchAssignments = allAssignments.filter(a => a.branchId === branch.id);
      const assignedChecklistIds = branchAssignments.map(a => a.checklistId);

      const hasOpening = openingChecklistIds.some(id => assignedChecklistIds.includes(id));
      const hasClosing = closingChecklistIds.some(id => assignedChecklistIds.includes(id));

      if (!hasOpening) {
        gaps.push({
          id: `checklist-no-opening-${branch.id}`,
          category: "checklist",
          severity: "high",
          title: `${branch.name}: Açılış checklist'i atanmamış`,
          description: `${branch.name} şubesi için açılış kontrol listesi atanmamış. Personel sabah açılışta ne yapacağını bilemez. Coach veya Supervisor olarak checklist atayın.`,
          deepLink: `/checklistler?branchId=${branch.id}`,
          targetRoles: ["coach", "trainer", "supervisor", "mudur"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "checklist-opening",
        });
      }

      if (!hasClosing) {
        gaps.push({
          id: `checklist-no-closing-${branch.id}`,
          category: "checklist",
          severity: "high",
          title: `${branch.name}: Kapanış checklist'i atanmamış`,
          description: `${branch.name} şubesi için kapanış kontrol listesi atanmamış. Kapanış checklist'i atayın.`,
          deepLink: `/checklistler?branchId=${branch.id}`,
          targetRoles: ["coach", "trainer", "supervisor", "mudur"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "checklist-closing",
        });
      }
    }

    const recurringTasks = await db.select({
      branchId: branchRecurringTasks.branchId,
    }).from(branchRecurringTasks).where(isNull(branchRecurringTasks.deletedAt));

    const branchesWithRecurring = new Set(recurringTasks.map(t => t.branchId));

    for (const branch of shopBranches) {
      if (!branchesWithRecurring.has(branch.id)) {
        gaps.push({
          id: `tasks-no-recurring-${branch.id}`,
          category: "checklist",
          severity: "medium",
          title: `${branch.name}: Tekrarlayan görev tanımlı değil`,
          description: `${branch.name} şubesinde haftalık/aylık tekrarlayan görev yok. Cam silme, genel temizlik gibi periyodik görevleri tanımlayın.`,
          deepLink: `/sube-gorevler/${branch.id}?tab=recurring`,
          targetRoles: ["coach", "supervisor", "mudur"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "tasks-recurring",
        });
      }
    }

    const shiftCount = await db.select({ count: sql<number>`count(*)::int` }).from(shifts).where(isNull(shifts.deletedAt));
    if (Number(shiftCount[0]?.count || 0) === 0) {
      gaps.push({
        id: "config-no-shifts",
        category: "configuration",
        severity: "critical",
        title: "Vardiya planı oluşturulmamış",
        description: "Hiçbir şube için vardiya planı girilmemiş. Personelin hangi saatlerde çalışacağını belirlemek için vardiya planı oluşturun.",
        deepLink: "/vardiya-planlama",
        targetRoles: ["admin", "coach", "mudur"],
        autoResolvable: false,
        checkFn: "config-shifts",
      });
    }

    const slaCount = await db.select({ count: sql<number>`count(*)::int` }).from(slaRules).where(eq(slaRules.isActive, true));
    if (Number(slaCount[0]?.count || 0) === 0) {
      gaps.push({
        id: "config-no-sla",
        category: "configuration",
        severity: "medium",
        title: "SLA kuralları tanımlı değil",
        description: "Servis seviyesi anlaşma kuralları oluşturulmamış. Görev tamamlama süreleri ve ihlal bildirimleri çalışmaz.",
        deepLink: "/admin?tab=sla",
        targetRoles: ["admin", "coach"],
        autoResolvable: false,
        checkFn: "config-sla",
      });
    }

    const certCount = await db.select({ count: sql<number>`count(*)::int` }).from(certificateSettings);
    if (Number(certCount[0]?.count || 0) < 4) {
      gaps.push({
        id: "config-certificates-incomplete",
        category: "settings",
        severity: "low",
        title: "Sertifika imza ayarları eksik",
        description: "Sertifika imzalayan bilgileri tamamlanmamış. Sertifika basımı için imza ayarlarını yapılandırın.",
        deepLink: "/akademi-hq?tab=certs",
        targetRoles: ["trainer", "coach"],
        autoResolvable: false,
        checkFn: "config-certificates",
      });
    }

    const feedbackCount = await db.select({ count: sql<number>`count(*)::int` }).from(customerFeedback);
    if (Number(feedbackCount[0]?.count || 0) < 5) {
      gaps.push({
        id: "config-feedback-inactive",
        category: "data",
        severity: "medium",
        title: "Müşteri geri bildirimi henüz aktif değil",
        description: "QR kod ile müşteri geri bildirimi henüz toplanmamış. Şubelere QR kodları yerleştirin ve müşterileri yönlendirin.",
        deepLink: "/crm?tab=feedback",
        targetRoles: ["coach", "cgo", "ceo"],
        autoResolvable: false,
        checkFn: "config-feedback",
      });
    }

    const trainingCount = await db.select({ count: sql<number>`count(*)::int` }).from(trainingAssignments);
    if (Number(trainingCount[0]?.count || 0) < 10) {
      gaps.push({
        id: "training-no-assignments",
        category: "training",
        severity: "medium",
        title: "Eğitim modülleri personele atanmamış",
        description: "Eğitim modülleri mevcut ama personele yeterince atanmamış. Rollere göre zorunlu eğitimleri atayın.",
        deepLink: "/akademi-hq?tab=training",
        targetRoles: ["trainer", "coach"],
        autoResolvable: false,
        checkFn: "training-assignments",
      });
    }

  } catch (error) {
    console.error("[System Completeness] Gap detection failed:", error);
  }

  return gaps;
}
