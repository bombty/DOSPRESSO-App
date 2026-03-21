import { db } from "../db";
import {
  branches, users, checklists, checklistAssignments, branchRecurringTasks,
  shifts, slaRules, certificateSettings, customerFeedback, trainingAssignments,
  payrollParameters, suppliers, purchaseOrders, haccpControlPoints,
  qualityAudits, pdksRecords, employeeOnboarding, factoryDailyTargets,
} from "@shared/schema";
import { eq, and, isNull, sql, gte } from "drizzle-orm";

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
    const factoryBranch = activeBranches.find(b => b.name.includes("Fabrika"));

    // ============================================
    // CATEGORY 1: PERSONNEL GAPS
    // ============================================
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

    // ============================================
    // CATEGORY 2: CHECKLIST GAPS
    // ============================================
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
          targetRoles: ["coach", "trainer", "supervisor", "mudur", "kalite_kontrol"],
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
          targetRoles: ["coach", "trainer", "supervisor", "mudur", "kalite_kontrol"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "checklist-closing",
        });
      }
    }

    // ============================================
    // CATEGORY 3: RECURRING TASKS
    // ============================================
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

    // ============================================
    // CATEGORY 4: CONFIGURATION & SYSTEM
    // ============================================
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

    // ============================================
    // CATEGORY 5: MUHASEBE / İK GAPS
    // ============================================
    const payrollParamCount = await db.select({ count: sql<number>`count(*)::int` }).from(payrollParameters).where(eq(payrollParameters.isActive, true));
    if (Number(payrollParamCount[0]?.count || 0) === 0) {
      gaps.push({
        id: "bordro-no-active-params",
        category: "configuration",
        severity: "high",
        title: "Bordro parametreleri aktif değil",
        description: "Aktif bordro parametresi bulunamadı. SGK, vergi oranları ve asgari ücret bilgilerini kontrol edin ve aktif bir parametre seti oluşturun.",
        deepLink: "/bordro?tab=parametreler",
        targetRoles: ["admin", "muhasebe_ik"],
        autoResolvable: false,
        checkFn: "bordro-params",
      });
    }

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    for (const branch of shopBranches) {
      const branchStaff = allUsers.filter(u => u.branchId === branch.id && ["barista", "bar_buddy", "stajyer", "supervisor", "mudur", "supervisor_buddy"].includes(u.role));
      if (branchStaff.length === 0) continue;

      const pdksResult = await db.select({ count: sql<number>`count(DISTINCT user_id)::int` })
        .from(pdksRecords)
        .where(and(
          eq(pdksRecords.branchId, branch.id),
          gte(pdksRecords.recordDate, thirtyDaysAgo),
        ));

      const usersWithPdks = Number(pdksResult[0]?.count || 0);
      const missingPdks = branchStaff.length - usersWithPdks;

      if (missingPdks > 0 && usersWithPdks < branchStaff.length) {
        gaps.push({
          id: `pdks-missing-records-${branch.id}`,
          category: "data",
          severity: "medium",
          title: `${branch.name}: ${missingPdks} personelin PDKS kaydı yok`,
          description: `${branch.name} şubesinde ${branchStaff.length} personelden ${missingPdks} kişinin son 30 günde PDKS kaydı bulunmuyor. Devam takibi için kiosk kullanımını kontrol edin.`,
          deepLink: `/devam-takibi?branchId=${branch.id}`,
          targetRoles: ["admin", "muhasebe_ik", "supervisor", "mudur", "coach"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "pdks-missing",
        });
      }
    }

    // ============================================
    // CATEGORY 6: SATINALMA GAPS
    // ============================================
    const supplierCount = await db.select({ count: sql<number>`count(*)::int` }).from(suppliers);
    if (Number(supplierCount[0]?.count || 0) < 3) {
      gaps.push({
        id: "satinalma-low-suppliers",
        category: "data",
        severity: "medium",
        title: `Tedarikçi listesi eksik (${supplierCount[0]?.count || 0} kayıt)`,
        description: "Tedarikçi veritabanında yeterli kayıt yok. Excel ile toplu import yaparak tedarikçi bilgilerini ekleyin.",
        deepLink: "/satinalma?tab=tedarikciler",
        targetRoles: ["satinalma", "admin"],
        autoResolvable: false,
        checkFn: "satinalma-suppliers",
      });
    }

    const poCount = await db.select({ count: sql<number>`count(*)::int` }).from(purchaseOrders);
    if (Number(poCount[0]?.count || 0) === 0) {
      gaps.push({
        id: "satinalma-no-orders",
        category: "data",
        severity: "medium",
        title: "Satınalma siparişi henüz oluşturulmamış",
        description: "Sistemde hiç satınalma siparişi kaydı yok. İlk siparişi oluşturarak satınalma sürecinizi başlatın.",
        deepLink: "/satinalma?tab=siparisler",
        targetRoles: ["satinalma", "admin"],
        autoResolvable: false,
        checkFn: "satinalma-orders",
      });
    }

    // ============================================
    // CATEGORY 7: FABRİKA MÜDÜR GAPS
    // ============================================
    if (factoryBranch) {
      const factoryStaff = allUsers.filter(u => u.branchId === factoryBranch.id && ["stajyer", "fabrika_operator", "fabrika_personel"].includes(u.role));
      const onboardingResult = await db.select({ count: sql<number>`count(*)::int` })
        .from(employeeOnboarding)
        .where(eq(employeeOnboarding.status, "in_progress"));

      const activeOnboarding = Number(onboardingResult[0]?.count || 0);
      if (activeOnboarding > 0) {
        gaps.push({
          id: "fabrika-onboarding-pending",
          category: "training",
          severity: "high",
          title: `${activeOnboarding} personelin onboarding süreci devam ediyor`,
          description: `${activeOnboarding} personelin onboarding programı tamamlanmamış. İlerleme durumlarını kontrol edin ve gerekli adımları tamamlayın.`,
          deepLink: "/personel-onboarding",
          targetRoles: ["admin", "fabrika_mudur", "coach", "trainer"],
          targetBranchId: factoryBranch.id,
          autoResolvable: false,
          checkFn: "fabrika-onboarding",
        });
      }

      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weekAgoDateStr = weekAgo.toISOString().slice(0, 10);
      const factoryTargetCount = await db.select({ count: sql<number>`count(*)::int` })
        .from(factoryDailyTargets)
        .where(sql`${factoryDailyTargets.targetDate} >= ${weekAgoDateStr}::date`);

      if (Number(factoryTargetCount[0]?.count || 0) === 0) {
        gaps.push({
          id: "fabrika-no-weekly-targets",
          category: "configuration",
          severity: "medium",
          title: "Fabrika üretim hedefleri bu hafta tanımlı değil",
          description: "Bu hafta için fabrika istasyonlarında üretim hedefi girilmemiş. Günlük hedef belirleme yaparak üretim takibini başlatın.",
          deepLink: "/fabrika?tab=hedefler",
          targetRoles: ["fabrika_mudur", "admin"],
          targetBranchId: factoryBranch.id,
          autoResolvable: false,
          checkFn: "fabrika-targets",
        });
      }

      const weekAgoStr = weekAgo.toISOString().slice(0, 10);
      const factoryShiftWeek = await db.select({ count: sql<number>`count(*)::int` })
        .from(shifts)
        .where(and(
          eq(shifts.branchId, factoryBranch.id),
          sql`${shifts.shiftDate} >= ${weekAgoStr}::date`,
          isNull(shifts.deletedAt),
        ));

      if (Number(factoryShiftWeek[0]?.count || 0) === 0 && factoryStaff.length > 0) {
        gaps.push({
          id: "fabrika-no-shift-plan",
          category: "configuration",
          severity: "medium",
          title: "Fabrika vardiya planı bu hafta oluşturulmamış",
          description: `Fabrikada ${factoryStaff.length} personel var ama bu hafta için vardiya planı girilmemiş. Vardiya planlaması yapın.`,
          deepLink: "/vardiya-planlama?branchId=" + factoryBranch.id,
          targetRoles: ["fabrika_mudur", "admin"],
          targetBranchId: factoryBranch.id,
          autoResolvable: false,
          checkFn: "fabrika-shifts",
        });
      }
    }

    // ============================================
    // CATEGORY 8: KALİTE KONTROL GAPS
    // ============================================
    const haccpCount = await db.select({ count: sql<number>`count(*)::int` }).from(haccpControlPoints);
    if (Number(haccpCount[0]?.count || 0) < 5) {
      gaps.push({
        id: "kalite-haccp-insufficient",
        category: "settings",
        severity: "medium",
        title: `HACCP kontrol noktaları yetersiz (${haccpCount[0]?.count || 0} tanımlı)`,
        description: "HACCP kontrol noktaları yeterince tanımlı değil. Gıda güvenliği için kritik kontrol noktalarını sisteme ekleyin.",
        deepLink: "/kalite-denetimi",
        targetRoles: ["admin", "kalite_kontrol", "gida_muhendisi", "coach"],
        autoResolvable: false,
        checkFn: "kalite-haccp",
      });
    }

    const recentAuditCount = await db.select({ count: sql<number>`count(*)::int` })
      .from(qualityAudits)
      .where(gte(qualityAudits.createdAt, thirtyDaysAgo));

    if (Number(recentAuditCount[0]?.count || 0) === 0) {
      gaps.push({
        id: "kalite-no-recent-audits",
        category: "data",
        severity: "high",
        title: "Son 30 günde kalite denetimi yapılmamış",
        description: "Son 30 gün içinde hiç kalite denetimi kaydı bulunmuyor. Şubelerde düzenli kalite denetimi yapılması gerekmektedir.",
        deepLink: "/denetimler",
        targetRoles: ["admin", "kalite_kontrol", "gida_muhendisi", "coach"],
        autoResolvable: false,
        checkFn: "kalite-audits",
      });
    }

    // ============================================
    // CATEGORY 9: BRANCH-LEVEL SHIFT GAPS (per branch this week)
    // ============================================
    const weekStartStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - d.getDay() + 1);
      return d.toISOString().slice(0, 10);
    })();

    for (const branch of shopBranches) {
      const branchStaff = allUsers.filter(u => u.branchId === branch.id && ["barista", "bar_buddy", "stajyer", "supervisor", "mudur", "supervisor_buddy"].includes(u.role));
      if (branchStaff.length === 0) continue;

      const weekShifts = await db.select({ count: sql<number>`count(DISTINCT assigned_to_id)::int` })
        .from(shifts)
        .where(and(
          eq(shifts.branchId, branch.id),
          sql`${shifts.shiftDate} >= ${weekStartStr}::date`,
          isNull(shifts.deletedAt),
        ));

      const assignedCount = Number(weekShifts[0]?.count || 0);
      const unassigned = branchStaff.length - assignedCount;

      if (assignedCount === 0 && branchStaff.length >= 2) {
        gaps.push({
          id: `shift-no-plan-${branch.id}`,
          category: "configuration",
          severity: "high",
          title: `${branch.name}: Bu hafta vardiya planı yok`,
          description: `${branch.name} şubesinde ${branchStaff.length} personel var ama bu hafta hiç vardiya planı oluşturulmamış.`,
          deepLink: `/vardiya-planlama?branchId=${branch.id}`,
          targetRoles: ["mudur", "supervisor", "coach"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "shift-weekly-plan",
        });
      } else if (unassigned > 0 && assignedCount > 0) {
        gaps.push({
          id: `shift-missing-staff-${branch.id}`,
          category: "configuration",
          severity: "medium",
          title: `${branch.name}: Bu hafta vardiya planında ${unassigned} personel eksik`,
          description: `${branch.name} şubesinde ${branchStaff.length} personelden ${unassigned} kişi bu haftanın vardiya planına dahil edilmemiş.`,
          deepLink: `/vardiya-planlama?branchId=${branch.id}`,
          targetRoles: ["mudur", "supervisor", "coach"],
          targetBranchId: branch.id,
          autoResolvable: false,
          checkFn: "shift-missing-staff",
        });
      }
    }

  } catch (error) {
    console.error("[System Completeness] Gap detection failed:", error);
  }

  return gaps;
}
