import { db } from "./db";
import { 
  branches, users, equipmentFaults, equipment, tasks, customerFeedback,
  leaveRequests, quizzes, checklistCompletions, productComplaints,
  employeePerformanceScores, branchAuditScores, shifts, recipes,
  trainingCompletions, auditInstances, productionBatches, purchaseOrders,
  dashboardAlerts, notifications,
  inventory, suppliers, goodsReceipts, supplierQuotes
} from "@shared/schema";
import { eq, desc, sql, and, or, count, avg, gte, lte } from "drizzle-orm";

function redactName(firstName?: string | null, lastName?: string | null, showFull: boolean = false): string {
  const f = firstName?.trim();
  const l = lastName?.trim();
  if (!f && !l) return "Personel";
  if (showFull) return `${f || ""} ${l || ""}`.trim();
  const fInitial = f ? f[0] + "." : "";
  const lInitial = l ? l[0] + "." : "";
  return `${fInitial}${lInitial}`.trim() || "Personel";
}

const NAV_LINKS: Record<string, { label: string; path: string }> = {
  dashboard: { label: "Ana Sayfa", path: "/" },
  branches: { label: "Subeler", path: "/subeler" },
  branch_detail: { label: "Sube Detayi", path: "/sube/{id}" },
  faults: { label: "Ariza Yonetimi", path: "/ariza" },
  fault_detail: { label: "Ariza Detayi", path: "/ariza/{id}" },
  equipment: { label: "Ekipman Yonetimi", path: "/yonetim/ekipman-yonetimi" },
  equipment_detail: { label: "Ekipman Detayi", path: "/equipment/{id}" },
  tasks: { label: "Gorevler", path: "/gorevler" },
  checklists: { label: "Checklistler", path: "/checklists" },
  personnel: { label: "Personel Listesi", path: "/ik" },
  personnel_detail: { label: "Personel Detayi", path: "/personel/{id}" },
  profile: { label: "Profilim", path: "/profil" },
  training: { label: "Egitim Programi", path: "/egitim-programi" },
  academy: { label: "Akademi", path: "/akademi" },
  recipes: { label: "Receteler", path: "/receteler" },
  shifts: { label: "Vardiya Planlama", path: "/vardiya-planlama" },
  leave: { label: "Izin Talepleri", path: "/izin-talepleri" },
  reports: { label: "Raporlar", path: "/raporlar" },
  inspections: { label: "Denetimler", path: "/denetimler" },
  lost_found: { label: "Kayip Esya", path: "/kayip-esya" },
  attendance: { label: "Yoklama", path: "/ik" },
  knowledge_base: { label: "Bilgi Bankasi", path: "/bilgi-bankasi" },
  factory: { label: "Fabrika", path: "/fabrika" },
  procurement: { label: "Satınalma", path: "/satinalma" },
  quality: { label: "Kalite Kontrol", path: "/kalite-kontrol-dashboard" },
  crm: { label: "CRM", path: "/crm" },
  analytics: { label: "Analitik", path: "/analitik" },
  notifications: { label: "Bildirimler", path: "/bildirimler" },
  admin: { label: "Admin Paneli", path: "/admin" },
  performance: { label: "Performansim", path: "/performansim" },
  branch_health: { label: "Sube Saglik Skoru", path: "/sube-saglik-skoru" },
  employee_of_month: { label: "Ayın Çalışanı", path: "/ayin-calisani" },
  support: { label: "Destek", path: "/destek" },
  complaints: { label: "Sikayetler", path: "/sikayetler" },
  cash_reports: { label: "Kasa Raporlari", path: "/kasa-raporlari" },
  accounting: { label: "Muhasebe", path: "/muhasebe" },
  agent_center: { label: "Agent Merkezi", path: "/agent-merkezi" },
};

function buildNavLinksPrompt(role: string): string {
  const hqLinks = ["dashboard", "branches", "faults", "equipment", "tasks", "checklists", "personnel", "training", "academy", "reports", "inspections", "notifications", "branch_health", "employee_of_month", "agent_center"];
  const branchLinks = ["dashboard", "faults", "tasks", "checklists", "training", "academy", "recipes", "shifts", "leave", "attendance", "performance", "lost_found", "notifications"];
  const adminLinks = [...hqLinks, "admin", "knowledge_base"];
  const coachLinks = ["dashboard", "branches", "inspections", "personnel", "training", "academy", "reports", "branch_health", "crm"];
  const trainerLinks = ["dashboard", "training", "academy", "recipes", "personnel", "reports"];
  const teknikLinks = ["dashboard", "faults", "equipment", "branches"];
  const faktoryLinks = ["dashboard", "factory", "quality", "reports"];
  const satinalmaLinks = ["dashboard", "procurement", "reports"];
  const muhasebeLinks = ["dashboard", "accounting", "cash_reports", "reports", "personnel"];
  const destekLinks = ["dashboard", "support", "faults", "complaints"];

  let linkKeys: string[];
  if (["ceo", "cgo"].includes(role)) linkKeys = hqLinks;
  else if (role === "admin") linkKeys = adminLinks;
  else if (role === "coach") linkKeys = coachLinks;
  else if (role === "trainer") linkKeys = trainerLinks;
  else if (["teknik", "ekipman_teknik"].includes(role)) linkKeys = teknikLinks;
  else if (["fabrika", "fabrika_mudur", "fabrika_sorumlu"].includes(role)) linkKeys = faktoryLinks;
  else if (role === "satinalma") linkKeys = satinalmaLinks;
  else if (role === "muhasebe") linkKeys = muhasebeLinks;
  else if (role === "destek") linkKeys = destekLinks;
  else if (["supervisor", "manager"].includes(role)) linkKeys = [...branchLinks, "inspections", "branch_health"];
  else linkKeys = branchLinks;

  const lines = linkKeys
    .filter(k => NAV_LINKS[k])
    .map(k => `- ${NAV_LINKS[k].label}: ${NAV_LINKS[k].path}`);
  return lines.join("\n");
}

export async function gatherAIAssistantContext(user: any) {
  const role = user.role;
  const branchId = user.branchId;
  const userId = user.id;
  let roleDescription = "";
  let roleContext = "";
  let accessibleData = "";

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const today = new Date().toISOString().slice(0, 10);

  try {
    if (["ceo", "cgo", "admin"].includes(role)) {
      const [branchesData, usersData, faultsData, feedbackData, complaintsData, leavesData, tasksData, perfData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(customerFeedback),
        db.select().from(productComplaints),
        db.select().from(leaveRequests),
        db.select().from(tasks),
        db.select().from(employeePerformanceScores),
      ]);

      const activeUsers = usersData.filter(u => u.isActive);
      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
      const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");
      const pendingLeaves = leavesData.filter((l: any) => l.status === "pending" || l.status === "beklemede");
      const pendingTasks = tasksData.filter((t: any) => t.status === "pending" || t.status === "beklemede");
      const openComplaints = complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu" && c.status !== "closed");

      const avgFeedback = feedbackData.length > 0
        ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1)
        : "Veri yok";

      const faultsByBranch: Record<number, { name: string; count: number }> = {};
      for (const f of openFaults) {
        const bid = (f as any).branchId;
        if (bid) {
          if (!faultsByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            faultsByBranch[bid] = { name: br?.name || `Sube #${bid}`, count: 0 };
          }
          faultsByBranch[bid].count++;
        }
      }
      const topFaultBranches = Object.values(faultsByBranch).sort((a, b) => b.count - a.count).slice(0, 5);

      const branchUserCounts: Record<number, { name: string; total: number }> = {};
      for (const u of activeUsers) {
        if (u.branchId) {
          if (!branchUserCounts[u.branchId]) {
            const br = branchesData.find(b => b.id === u.branchId);
            branchUserCounts[u.branchId] = { name: br?.name || `Sube #${u.branchId}`, total: 0 };
          }
          branchUserCounts[u.branchId].total++;
        }
      }

      const roleDistribution: Record<string, number> = {};
      for (const u of activeUsers) {
        roleDistribution[u.role] = (roleDistribution[u.role] || 0) + 1;
      }

      const lowPerfUsers = perfData
        .filter(p => p.weeklyTotalScore !== null && Number(p.weeklyTotalScore) < 50)
        .sort((a, b) => Number(a.weeklyTotalScore) - Number(b.weeklyTotalScore))
        .slice(0, 5);

      const lowPerfDetails = lowPerfUsers.map(p => {
        const u = usersData.find(us => us.id === p.userId);
        const br = u?.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `${redactName(u?.firstName, u?.lastName)} (${u?.role || "?"}, ${br?.name || "HQ"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
      });

      const topPerfUsers = perfData
        .filter(p => p.weeklyTotalScore !== null && Number(p.weeklyTotalScore) > 0)
        .sort((a, b) => Number(b.weeklyTotalScore) - Number(a.weeklyTotalScore))
        .slice(0, 5);

      const topPerfDetails = topPerfUsers.map(p => {
        const u = usersData.find(us => us.id === p.userId);
        const br = u?.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `${redactName(u?.firstName, u?.lastName)} (${u?.role || "?"}, ${br?.name || "HQ"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
      });

      if (role === "ceo") roleDescription = "DOSPRESSO CEO'su - Tum sirket verilerine tam erisim";
      else if (role === "cgo") roleDescription = "DOSPRESSO CGO'su (Chief Growth Officer)";
      else roleDescription = "Sistem Yoneticisi - Tum verilere tam erisim";

      roleContext = `SIRKET GENEL DURUMU:
- Toplam Sube: ${branchesData.length}
- Aktif Personel: ${activeUsers.length} (Toplam: ${usersData.length})
- Acik Arizalar: ${openFaults.length} (Kritik/Yuksek: ${criticalFaults.length})
- Bekleyen Izin Talepleri: ${pendingLeaves.length}
- Bekleyen Gorevler: ${pendingTasks.length}
- Açık Ürün Şikayetleri: ${openComplaints.length}
- Müşteri Değerlendirme Ortalaması: ${avgFeedback}/5 (${feedbackData.length} değerlendirme)

EN COK ARIZA OLAN SUBELER:
${topFaultBranches.length > 0 ? topFaultBranches.map((b, i) => `${i+1}. ${b.name}: ${b.count} acik ariza`).join("\n") : "- Ariza verisi yok"}

EN DUSUK PERFORMANSLI PERSONEL:
${lowPerfDetails.length > 0 ? lowPerfDetails.map((d, i) => `${i+1}. ${d}`).join("\n") : "- Performans verisi henuz yok"}

EN YUKSEK PERFORMANSLI PERSONEL:
${topPerfDetails.length > 0 ? topPerfDetails.map((d, i) => `${i+1}. ${d}`).join("\n") : "- Performans verisi henuz yok"}

SUBE BAZLI PERSONEL DAGILIMI:
${Object.values(branchUserCounts).sort((a, b) => b.total - a.total).slice(0, 8).map(b => `- ${b.name}: ${b.total} kisi`).join("\n")}

ROL DAGILIMI:
${Object.entries(roleDistribution).sort(([,a], [,b]) => b - a).slice(0, 8).map(([r, c]) => `- ${r}: ${c}`).join("\n")}`;

      accessibleData = "Tum sirket verileri, tum subeler, personel performanslari, finansal ozet, ariza takibi, kalite metrikleri";

    } else if (role === "coach") {
      const [branchesData, usersData, faultsData, perfData, complaintsData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(employeePerformanceScores),
        db.select().from(productComplaints),
      ]);

      let inspectionsData: any[] = [];
      let feedbackData: any[] = [];
      let trainingData: any[] = [];
      try {
        [inspectionsData, feedbackData, trainingData] = await Promise.all([
          db.select().from(auditInstances),
          db.select().from(customerFeedback),
          db.select().from(trainingCompletions),
        ]);
      } catch (e) { console.log("Coach extra context error:", e); }

      const activeUsers = usersData.filter(u => u.isActive);

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
      const faultsByBranch: Record<number, { name: string; count: number }> = {};
      for (const f of openFaults) {
        const bid = (f as any).branchId;
        if (bid) {
          if (!faultsByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            faultsByBranch[bid] = { name: br?.name || `Sube #${bid}`, count: 0 };
          }
          faultsByBranch[bid].count++;
        }
      }

      const branchStats = branchesData.map(branch => {
        const branchUsers = activeUsers.filter(u => u.branchId === branch.id);
        const branchFaults = openFaults.filter((f: any) => f.branchId === branch.id);
        const branchPerf = perfData.filter(p => branchUsers.some(u => u.id === p.userId));
        const avgScore = branchPerf.length > 0
          ? (branchPerf.reduce((s, p) => s + Number(p.weeklyTotalScore || 0), 0) / branchPerf.length).toFixed(0)
          : "-";
        return {
          name: branch.name,
          id: branch.id,
          personnel: branchUsers.length,
          openFaults: branchFaults.length,
          avgScore
        };
      });

      const lowPerfBranchUsers = perfData
        .filter(p => p.weeklyTotalScore !== null && Number(p.weeklyTotalScore) < 50)
        .sort((a, b) => Number(a.weeklyTotalScore) - Number(b.weeklyTotalScore))
        .slice(0, 8);

      const lowPerfDetails = lowPerfBranchUsers.map(p => {
        const u = usersData.find(us => us.id === p.userId);
        const br = u?.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `${redactName(u?.firstName, u?.lastName)} (${u?.role || "?"}, ${br?.name || "?"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
      });

      const recentInspections = inspectionsData.filter((ins: any) => {
        const d = ins.completedAt || ins.createdAt;
        return d && new Date(d) >= thirtyDaysAgo;
      });
      const inspectionsByBranch: Record<number, { name: string; scores: number[] }> = {};
      for (const ins of recentInspections) {
        const bid = (ins as any).branchId;
        const score = (ins as any).totalScore || (ins as any).score;
        if (bid && score !== null && score !== undefined) {
          if (!inspectionsByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            inspectionsByBranch[bid] = { name: br?.name || `Sube #${bid}`, scores: [] };
          }
          inspectionsByBranch[bid].scores.push(Number(score));
        }
      }
      const branchInspectionAvgs = Object.values(inspectionsByBranch)
        .map(b => ({ name: b.name, avg: (b.scores.reduce((s, v) => s + v, 0) / b.scores.length).toFixed(0), count: b.scores.length }))
        .sort((a, b) => Number(a.avg) - Number(b.avg));

      const branchTrainingRates = branchesData.map(branch => {
        const branchUsers = activeUsers.filter(u => u.branchId === branch.id);
        const branchTrainings = trainingData.filter(t => branchUsers.some(u => u.id === t.userId));
        const rate = branchUsers.length > 0 ? ((branchTrainings.length / branchUsers.length) * 100).toFixed(0) : "0";
        return { name: branch.name, rate, count: branchTrainings.length, users: branchUsers.length };
      }).sort((a, b) => Number(a.rate) - Number(b.rate));

      const feedbackByBranch: Record<number, { name: string; ratings: number[] }> = {};
      for (const fb of feedbackData) {
        const bid = (fb as any).branchId;
        if (bid && fb.rating) {
          if (!feedbackByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            feedbackByBranch[bid] = { name: br?.name || `Sube #${bid}`, ratings: [] };
          }
          feedbackByBranch[bid].ratings.push(fb.rating);
        }
      }
      const branchFeedbackAvgs = Object.values(feedbackByBranch)
        .map(b => ({ name: b.name, avg: (b.ratings.reduce((s, v) => s + v, 0) / b.ratings.length).toFixed(1), count: b.ratings.length }))
        .sort((a, b) => Number(a.avg) - Number(b.avg));

      const lowScoreBranches = branchStats.filter(b => b.avgScore !== "-" && Number(b.avgScore) < 50);

      roleDescription = "DOSPRESSO Coach - Sube denetimi ve personel gelistirme";
      roleContext = `COACH DASHBOARD:
- Toplam Sube: ${branchesData.length}
- Aktif Personel: ${activeUsers.length}
- Toplam Acik Ariza: ${openFaults.length}
- Toplam Denetim: ${inspectionsData.length} (Son 30 Gun: ${recentInspections.length})
- Açık Ürün Şikayeti: ${complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu").length}
- Müşteri Geri Bildirimi: ${feedbackData.length}

SUBE PERFORMANS OZETI:
${branchStats.slice(0, 10).map((b, i) => `${i+1}. ${b.name} | Personel: ${b.personnel} | Acik Ariza: ${b.openFaults} | Ort. Skor: ${b.avgScore}`).join("\n")}

SON DENETIM SKORLARI (Sube Bazli - Son 30 Gun):
${branchInspectionAvgs.length > 0 ? branchInspectionAvgs.slice(0, 8).map((b, i) => `${i+1}. ${b.name}: Ort. ${b.avg}/100 (${b.count} denetim)`).join("\n") : "- Denetim verisi yok"}

SUBE BAZLI EGITIM TAMAMLAMA ORANLARI:
${branchTrainingRates.slice(0, 8).map((b, i) => `${i+1}. ${b.name}: %${b.rate} (${b.count}/${b.users})`).join("\n")}

MÜŞTERİ GERİ BİLDİRİM ORTALAMALARI (Sube Bazli):
${branchFeedbackAvgs.length > 0 ? branchFeedbackAvgs.slice(0, 5).map((b, i) => `${i+1}. ${b.name}: ${b.avg}/5 (${b.count} değerlendirme)`).join("\n") : "- Geri bildirim verisi yok"}

DIKKAT GEREKTIREN SUBELER (Dusuk Performans):
${lowScoreBranches.length > 0 ? lowScoreBranches.map((b, i) => `${i+1}. ${b.name} - Ort. Skor: ${b.avgScore} | Ariza: ${b.openFaults}`).join("\n") : "- Dusuk performansli sube yok"}

PERFORMANSI DUSUK PERSONEL:
${lowPerfDetails.length > 0 ? lowPerfDetails.map((d, i) => `${i+1}. ${d}`).join("\n") : "- Veri yok"}

EN COK ARIZA OLAN SUBELER:
${Object.values(faultsByBranch).sort((a, b) => b.count - a.count).slice(0, 5).map((b, i) => `${i+1}. ${b.name}: ${b.count} ariza`).join("\n") || "- Ariza yok"}`;

      accessibleData = "Tum sube verileri, personel performanslari, denetim kayitlari, ariza takibi, egitim ilerlemeleri, musteri geri bildirimleri";

    } else if (role === "trainer") {
      const [usersData, quizData, branchesData] = await Promise.all([
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(quizzes),
        db.select().from(branches),
      ]);

      let trainingData: any[] = [];
      try {
        trainingData = await db.select().from(trainingCompletions);
      } catch (e) { console.log("Trainer training context error:", e); }

      const branchTrainingStats = branchesData.map(branch => {
        const branchUsers = usersData.filter(u => u.branchId === branch.id);
        const branchTrainings = trainingData.filter(t => branchUsers.some(u => u.id === t.userId));
        const rate = branchUsers.length > 0 ? ((branchTrainings.length / branchUsers.length) * 100).toFixed(0) : "0";
        return { name: branch.name, users: branchUsers.length, completions: branchTrainings.length, rate };
      }).sort((a, b) => b.completions - a.completions);

      const passedQuizzes = trainingData.filter((t: any) => t.passed === true || t.score >= 70 || t.status === "completed");
      const failedQuizzes = trainingData.filter((t: any) => t.passed === false || (t.score !== null && t.score !== undefined && t.score < 70));
      const passRate = (passedQuizzes.length + failedQuizzes.length) > 0
        ? ((passedQuizzes.length / (passedQuizzes.length + failedQuizzes.length)) * 100).toFixed(0)
        : "-";

      const usersWithTraining = new Set(trainingData.map(t => t.userId));
      const usersWithoutTraining = usersData.filter(u => !usersWithTraining.has(u.id));
      const incompleteTrainingUsers = usersWithoutTraining.slice(0, 10).map(u => {
        const br = u.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `- ${redactName(u.firstName, u.lastName)} (${br?.name || "HQ"}) - ${u.role}`;
      });

      const moduleCounts: Record<string, number> = {};
      for (const t of trainingData) {
        const mod = (t as any).moduleId || (t as any).trainingModuleId || (t as any).moduleName || "bilinmiyor";
        moduleCounts[String(mod)] = (moduleCounts[String(mod)] || 0) + 1;
      }
      const sortedModules = Object.entries(moduleCounts).sort(([, a], [, b]) => b - a);
      const topModules = sortedModules.slice(0, 5);
      const leastModules = sortedModules.slice(-3);

      roleDescription = "DOSPRESSO Egitmen - Egitim ve gelisim yonetimi";
      roleContext = `EGITIM DURUMU:
- Aktif Personel: ${usersData.length}
- Mevcut Quiz Sayisi: ${quizData.length}
- Toplam Egitim Tamamlama: ${trainingData.length}
- Egitim Almamis Personel: ${usersWithoutTraining.length}

QUIZ BASARI ORANLARI:
- Gecen: ${passedQuizzes.length} | Kalan: ${failedQuizzes.length} | Basari Orani: %${passRate}

SUBE BAZLI EGITIM TAMAMLAMA ORANLARI:
${branchTrainingStats.slice(0, 10).map((b, i) => `${i+1}. ${b.name}: %${b.rate} (${b.completions} tamamlama / ${b.users} kisi)`).join("\n")}

EGITIM ALMAMIS PERSONEL (Ilk 10):
${incompleteTrainingUsers.length > 0 ? incompleteTrainingUsers.join("\n") : "- Tum personel egitim almis"}

EN POPULER EGITIM MODULLERI:
${topModules.length > 0 ? topModules.map(([mod, cnt], i) => `${i+1}. Modul #${mod}: ${cnt} tamamlama`).join("\n") : "- Modul verisi yok"}

EN AZ TERCIH EDILEN MODULLER:
${leastModules.length > 0 ? leastModules.map(([mod, cnt], i) => `${i+1}. Modul #${mod}: ${cnt} tamamlama`).join("\n") : "- Modul verisi yok"}`;
      accessibleData = "Egitim modulleri, quiz yonetimi, personel egitim ilerlemeleri, sertifikalar, tamamlama oranlari";

    } else if (role === "teknik" || role === "ekipman_teknik") {
      const [equipmentData, faultsData, branchesData] = await Promise.all([
        db.select().from(equipment),
        db.select().from(equipmentFaults),
        db.select().from(branches),
      ]);

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
      const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");
      const resolvedLast30 = faultsData.filter((f: any) => {
        const resolved = f.status === "cozuldu" || f.status === "resolved" || f.status === "closed";
        return resolved && f.resolvedAt && new Date(f.resolvedAt) >= thirtyDaysAgo;
      });

      const faultsByBranch: Record<number, { name: string; count: number }> = {};
      for (const f of openFaults) {
        const bid = (f as any).branchId;
        if (bid) {
          if (!faultsByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            faultsByBranch[bid] = { name: br?.name || `Sube #${bid}`, count: 0 };
          }
          faultsByBranch[bid].count++;
        }
      }

      roleDescription = "Teknik Destek Uzmani";
      roleContext = `TEKNIK DURUM:
- Toplam Ekipman: ${equipmentData.length}
- Toplam Acik Ariza: ${openFaults.length} (Kritik/Yuksek: ${criticalFaults.length})
- Son 30 Gun Cozulen: ${resolvedLast30.length}

EN COK ARIZA OLAN SUBELER:
${Object.values(faultsByBranch).sort((a, b) => b.count - a.count).slice(0, 5).map((b, i) => `${i+1}. ${b.name}: ${b.count} ariza`).join("\n") || "- Yok"}`;
      accessibleData = "Ariza yonetimi, ekipman bakimi, SLA takibi, teknik dokumantasyon";

    } else if (role === "satinalma") {
      const [branchesData, ordersData, complaintsData] = await Promise.all([
        db.select().from(branches),
        db.select().from(purchaseOrders),
        db.select().from(productComplaints),
      ]);

      let inventoryData: any[] = [];
      let suppliersData: any[] = [];
      let goodsReceiptsData: any[] = [];
      let quotesData: any[] = [];
      try {
        [inventoryData, suppliersData, goodsReceiptsData, quotesData] = await Promise.all([
          db.select().from(inventory).where(eq(inventory.isActive, true)),
          db.select().from(suppliers),
          db.select().from(goodsReceipts),
          db.select().from(supplierQuotes),
        ]);
      } catch (e) { console.log("Satinalma extra context error:", e); }

      const pendingOrders = ordersData.filter((o: any) => o.status === "taslak" || o.status === "onay_bekliyor" || o.status === "pending" || o.status === "beklemede" || o.status === "draft");
      const pendingOrdersTotal = pendingOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount || 0), 0);

      const criticalStock = inventoryData.filter((item: any) => {
        const current = Number(item.currentStock || 0);
        const minimum = Number(item.minimumStock || 0);
        return minimum > 0 && current < minimum;
      }).sort((a: any, b: any) => {
        const ratioA = Number(a.currentStock || 0) / Math.max(Number(a.minimumStock || 1), 1);
        const ratioB = Number(b.currentStock || 0) / Math.max(Number(b.minimumStock || 1), 1);
        return ratioA - ratioB;
      }).slice(0, 10);

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const recentReceipts = goodsReceiptsData.filter((r: any) => r.receiptDate && new Date(r.receiptDate) >= sevenDaysAgo);

      const pendingQuotes = quotesData.filter((q: any) => q.status === "aktif" || q.status === "beklemede");
      const staleQuotes = quotesData.filter((q: any) => q.validUntil && new Date(q.validUntil) < new Date());

      const activeSuppliersData = suppliersData.filter((s: any) => s.status === "aktif");
      const topSuppliers = activeSuppliersData
        .sort((a: any, b: any) => Number(b.totalOrders || 0) - Number(a.totalOrders || 0))
        .slice(0, 5);

      roleDescription = "Satınalma Uzmanı";
      roleContext = `SATINALMA DURUMU:
- Toplam Sube: ${branchesData.length}
- Toplam Siparis: ${ordersData.length} (Bekleyen: ${pendingOrders.length})
- Bekleyen Siparis Toplam Tutar: ${pendingOrdersTotal.toLocaleString("tr-TR")} TL
- Ürün Şikayetleri: ${complaintsData.length}
- Aktif Tedarikci: ${activeSuppliersData.length}
- Son 7 Gun Mal Kabul: ${recentReceipts.length}

KRITIK STOK DURUMLARI (Minimum Altinda):
${criticalStock.length > 0 ? criticalStock.map((item: any, i: number) => `${i+1}. ${item.name} (${item.code}) | Mevcut: ${Number(item.currentStock).toLocaleString("tr-TR")} ${item.unit} | Min: ${Number(item.minimumStock).toLocaleString("tr-TR")} ${item.unit}`).join("\n") : "- Kritik stok yok"}

TEDARIKCI TEKLIFLERI:
- Aktif/Bekleyen Teklifler: ${pendingQuotes.length}
- Suresi Gecmis Teklifler: ${staleQuotes.length}

EN YOĞUN 5 TEDARIKCI:
${topSuppliers.length > 0 ? topSuppliers.map((s: any, i: number) => `${i+1}. ${s.name} | Siparis: ${s.totalOrders || 0} | Toplam: ${Number(s.totalOrderValue || 0).toLocaleString("tr-TR")} TL | Performans: ${Number(s.performanceScore || 0).toFixed(1)}/5`).join("\n") : "- Tedarikci verisi yok"}`;
      accessibleData = "Stok yonetimi, tedarikci bilgileri, siparis takibi, mal kabul, tedarikci teklifleri";

    } else if (role === "kalite_kontrol") {
      const [complaintsData, branchesData, faultsData] = await Promise.all([
        db.select().from(productComplaints),
        db.select().from(branches),
        db.select().from(equipmentFaults),
      ]);

      let batchesData: any[] = [];
      try {
        batchesData = await db.select().from(productionBatches);
      } catch (e) { console.log("Kalite kontrol batches context error:", e); }

      const openComplaints = complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu" && c.status !== "closed");

      const severityBreakdown: Record<string, number> = {};
      for (const c of openComplaints) {
        const sev = (c as any).severity || (c as any).priority || "belirtilmemis";
        severityBreakdown[sev] = (severityBreakdown[sev] || 0) + 1;
      }

      const complaintsByBranch: Record<number, { name: string; count: number }> = {};
      for (const c of openComplaints) {
        const bid = (c as any).branchId;
        if (bid) {
          if (!complaintsByBranch[bid]) {
            const br = branchesData.find(b => b.id === bid);
            complaintsByBranch[bid] = { name: br?.name || `Sube #${bid}`, count: 0 };
          }
          complaintsByBranch[bid].count++;
        }
      }
      const topComplaintBranches = Object.values(complaintsByBranch).sort((a, b) => b.count - a.count).slice(0, 5);

      const recentBatches = batchesData.filter((b: any) => {
        const d = b.productionDate ? new Date(b.productionDate) : null;
        return d && d >= thirtyDaysAgo;
      });
      const qualityIssueBatches = recentBatches.filter((b: any) => b.status === "rejected" || (b.qualityScore !== null && Number(b.qualityScore) < 70));
      const pendingQCBatches = recentBatches.filter((b: any) => b.status === "quality_check");

      const pendingResolutions = openComplaints.filter((c: any) => c.status === "pending" || c.status === "beklemede" || c.status === "investigation" || c.status === "inceleniyor");

      roleDescription = "Kalite Kontrol Uzmani";
      roleContext = `KALITE KONTROL DURUMU:
- Toplam Ürün Şikayeti: ${complaintsData.length} (Açık: ${openComplaints.length})
- Sube Sayisi: ${branchesData.length}
- Cozum Bekleyen Sikayetler: ${pendingResolutions.length}

ACIK SIKAYETLER CIDDIYET DAGILIMI:
${Object.entries(severityBreakdown).length > 0 ? Object.entries(severityBreakdown).map(([sev, cnt]) => `- ${sev}: ${cnt}`).join("\n") : "- Acik sikayet yok"}

EN COK SIKAYET ALAN SUBELER:
${topComplaintBranches.length > 0 ? topComplaintBranches.map((b, i) => `${i+1}. ${b.name}: ${b.count} acik sikayet`).join("\n") : "- Sube bazli sikayet yok"}

ÜRETİM PARTİ KALİTE DURUMU (Son 30 Gun):
- Toplam Parti: ${recentBatches.length}
- Kalite Kontrol Bekleyen: ${pendingQCBatches.length}
- Kalite Sorunu Olan (Skor<70 veya Reddedilen): ${qualityIssueBatches.length}`;
      accessibleData = "Kalite denetimleri, ürün şikayetleri, standart uyumluluk, reçete yönetimi, üretim parti kalitesi";

    } else if (role === "muhasebe" || role === "muhasebe_ik") {
      const [branchesData, usersData, leavesData, allUsersData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(leaveRequests),
        db.select().from(users),
      ]);

      const pendingLeaves = leavesData.filter((l: any) => l.status === "pending" || l.status === "beklemede");
      const approvedLeaves = leavesData.filter((l: any) => {
        const isApproved = l.status === "approved" || l.status === "onaylandi";
        const startDate = l.startDate ? new Date(l.startDate) : null;
        const endDate = l.endDate ? new Date(l.endDate) : null;
        const now = new Date();
        return isApproved && startDate && endDate && startDate <= now && endDate >= now;
      });

      const branchUserCounts: Record<number, { name: string; total: number }> = {};
      for (const u of usersData) {
        if (u.branchId) {
          if (!branchUserCounts[u.branchId]) {
            const br = branchesData.find(b => b.id === u.branchId);
            branchUserCounts[u.branchId] = { name: br?.name || `Sube #${u.branchId}`, total: 0 };
          }
          branchUserCounts[u.branchId].total++;
        }
      }
      const hqCount = usersData.filter(u => !u.branchId).length;

      const pendingLeaveDetails = pendingLeaves.slice(0, 5).map((l: any) => {
        const u = allUsersData.find((us: any) => us.id === l.userId);
        const br = u?.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `- ${redactName(u?.firstName, u?.lastName)} (${u?.role || "?"}, ${br?.name || "HQ"}) | ${l.leaveType || l.type || "Izin"} | ${l.startDate ? new Date(l.startDate).toLocaleDateString("tr-TR") : "?"} - ${l.endDate ? new Date(l.endDate).toLocaleDateString("tr-TR") : "?"}`;
      });

      roleDescription = role === "muhasebe" ? "Muhasebe Uzmani" : "Muhasebe ve IK Uzmani";
      roleContext = `MUHASEBE / IK DURUMU:
- Sube Sayisi: ${branchesData.length}
- Aktif Personel: ${usersData.length} (Toplam Kayitli: ${allUsersData.length})
- Bekleyen Izin Talepleri: ${pendingLeaves.length}
- Su An Izindeki Personel: ${approvedLeaves.length}

SUBE BAZLI PERSONEL DAGILIMI:
${Object.values(branchUserCounts).sort((a, b) => b.total - a.total).map(b => `- ${b.name}: ${b.total} kisi`).join("\n")}
- Genel Merkez (HQ): ${hqCount} kisi

BEKLEYEN IZIN TALEPLERI (Son 5):
${pendingLeaveDetails.length > 0 ? pendingLeaveDetails.join("\n") : "- Bekleyen izin talebi yok"}`;
      accessibleData = "Finansal raporlar, maliyet analizi, bordro, personel kayitlari, izin yonetimi";

    } else if (role === "destek") {
      const [faultsData, complaintsData, branchesData] = await Promise.all([
        db.select().from(equipmentFaults),
        db.select().from(productComplaints),
        db.select().from(branches),
      ]);

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress");

      roleDescription = "Destek Uzmani";
      roleContext = `DESTEK DURUMU:
- Acik Arizalar: ${openFaults.length}
- Ürün Şikayetleri: ${complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu").length}
- Sube Sayisi: ${branchesData.length}`;
      accessibleData = "Destek talepleri, ariza bildirimleri, iletisim kayitlari";

    } else if (["fabrika", "fabrika_mudur", "fabrika_sorumlu", "fabrika_teknisyen", "fabrika_personel"].includes(role)) {
      const [equipmentData, faultsData] = await Promise.all([
        db.select().from(equipment),
        db.select().from(equipmentFaults),
      ]);

      let batchesData: any[] = [];
      try {
        batchesData = await db.select().from(productionBatches);
      } catch (e) { console.log("Fabrika batches context error:", e); }

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress");
      const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");

      const activeBatches = batchesData.filter((b: any) => b.status === "in_progress" || b.status === "planned" || b.status === "quality_check");
      const batchStatusCounts: Record<string, number> = {};
      for (const b of batchesData) {
        batchStatusCounts[(b as any).status] = (batchStatusCounts[(b as any).status] || 0) + 1;
      }

      const maintenanceNeeded = equipmentData.filter((e: any) => {
        if (e.nextMaintenanceDate) {
          return new Date(e.nextMaintenanceDate) <= new Date();
        }
        return e.status === "bakim_gerekli" || e.status === "maintenance_needed";
      });

      const resolvedFaults = faultsData.filter((f: any) => {
        const resolved = f.status === "cozuldu" || f.status === "resolved" || f.status === "closed";
        return resolved && f.resolvedAt && new Date(f.resolvedAt) >= thirtyDaysAgo;
      });
      const avgResolutionTime = resolvedFaults.length > 0
        ? (resolvedFaults.reduce((sum: number, f: any) => {
            const created = new Date(f.createdAt || f.reportedAt);
            const resolved = new Date(f.resolvedAt);
            return sum + (resolved.getTime() - created.getTime()) / (1000 * 60 * 60);
          }, 0) / resolvedFaults.length).toFixed(1)
        : "-";

      const recentBatches = batchesData.filter((b: any) => {
        const d = b.productionDate ? new Date(b.productionDate) : null;
        return d && d >= thirtyDaysAgo;
      });
      const completedBatches = recentBatches.filter((b: any) => b.status === "completed" || b.status === "approved");
      const totalProduced = completedBatches.reduce((sum: number, b: any) => sum + Number(b.quantity || 0), 0);

      roleDescription = role === "fabrika_mudur" ? "Fabrika Müdürü" : role === "fabrika_teknisyen" ? "Fabrika Teknisyeni" : "Fabrika Sorumlusu";
      roleContext = `FABRIKA DURUMU:
- Toplam Ekipman: ${equipmentData.length}
- Acik Arizalar: ${openFaults.length} (Kritik/Yuksek: ${criticalFaults.length})
- Toplam Üretim Partileri: ${batchesData.length}
- Aktif Partiler (Devam Eden/Planlanan/KK Bekleyen): ${activeBatches.length}

AKTİF ÜRETİM PARTİLERİ DURUM:
${Object.entries(batchStatusCounts).map(([status, cnt]) => `- ${status}: ${cnt}`).join("\n")}

BAKIM BEKLEYEN EKIPMANLAR:
${maintenanceNeeded.length > 0 ? maintenanceNeeded.slice(0, 5).map((e: any, i: number) => `${i+1}. ${e.name} (${e.code || e.serialNumber || "-"})`).join("\n") : "- Bakim bekleyen ekipman yok"}

ARIZA COZUM SURESI (Son 30 Gun):
- Cozulen Ariza: ${resolvedFaults.length}
- Ortalama Cozum Suresi: ${avgResolutionTime} saat

ÜRETİM ÇIKTISI (Son 30 Gun):
- Tamamlanan Parti: ${completedBatches.length}
- Toplam Üretim: ${totalProduced.toLocaleString("tr-TR")} adet`;
      accessibleData = "Üretim planlama, kalite kontrol, stok yönetimi, ekipman durumu, arıza takibi";

    } else if ((role === "supervisor" || role === "supervisor_buddy" || role === "manager") && branchId) {
      const [branchData, usersData, tasksData, faultsData, leavesData, perfData] = await Promise.all([
        db.select().from(branches).where(eq(branches.id, branchId)),
        db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.isActive, true))),
        db.select().from(tasks).where(eq(tasks.branchId, branchId)),
        db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)),
        db.select().from(leaveRequests),
        db.select().from(employeePerformanceScores),
      ]);

      let checklistData: any[] = [];
      let shiftsData: any[] = [];
      let equipmentData: any[] = [];
      let feedbackData: any[] = [];
      try {
        [checklistData, shiftsData, equipmentData, feedbackData] = await Promise.all([
          db.select().from(checklistCompletions),
          db.select().from(shifts),
          db.select().from(equipment).where(eq(equipment.branchId, branchId)),
          db.select().from(customerFeedback),
        ]);
      } catch (e) { console.log("Supervisor extra context error:", e); }

      const branchName = branchData[0]?.name || "Bilinmiyor";
      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
      const criticalFaults = openFaults.filter((f: any) => f.priority === "kritik" || f.priority === "yuksek" || f.priority === "critical" || f.priority === "high");
      const pendingTasks = tasksData.filter((t: any) => t.status === "pending" || t.status === "beklemede");
      const branchLeaves = leavesData.filter((l: any) => usersData.some(u => u.id === l.userId));
      const pendingLeaves = branchLeaves.filter((l: any) => l.status === "pending" || l.status === "beklemede");

      const branchPerf = perfData.filter(p => usersData.some(u => u.id === p.userId));
      const perfDetails = branchPerf
        .filter(p => p.weeklyTotalScore !== null)
        .sort((a, b) => Number(a.weeklyTotalScore) - Number(b.weeklyTotalScore))
        .map(p => {
          const u = usersData.find(us => us.id === p.userId);
          return `${redactName(u?.firstName, u?.lastName, showFullNames)} (${u?.role}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
        });

      const todayStr = today;
      const todayChecklists = checklistData.filter((c: any) => {
        const cDate = c.completedAt || c.createdAt;
        return cDate && new Date(cDate).toISOString().slice(0, 10) === todayStr;
      });
      const branchChecklists = todayChecklists.filter((c: any) => {
        const cUser = usersData.find(u => u.id === (c as any).userId || u.id === (c as any).completedById);
        return cUser !== undefined;
      });

      const todayShifts = shiftsData.filter((s: any) => {
        const sDate = s.shiftDate || s.date;
        return sDate && new Date(sDate).toISOString().slice(0, 10) === todayStr && s.branchId === branchId;
      });
      const showFullNames = role === "supervisor" || role === "supervisor_buddy" || role === "manager" || role === "mudur";
      const todayShiftDetails = todayShifts.slice(0, 10).map((s: any) => {
        const u = usersData.find(us => us.id === s.assignedToId);
        return `- ${redactName(u?.firstName, u?.lastName, showFullNames)} (${u?.role || "?"}): ${s.startTime || "?"} - ${s.endTime || "?"}`;
      });

      const branchEquipmentHealth = equipmentData.map((e: any) => {
        const eqFaults = openFaults.filter((f: any) => f.equipmentId === e.id);
        const needsMaint = e.nextMaintenanceDate && new Date(e.nextMaintenanceDate) <= new Date();
        const status = eqFaults.length > 0 ? "ARIZALI" : needsMaint ? "BAKIM GEREKLI" : (e.status === "aktif" || e.status === "active" ? "NORMAL" : (e.status || "?"));
        return { name: e.name, status, faults: eqFaults.length };
      });
      const problemEquipment = branchEquipmentHealth.filter(e => e.status !== "NORMAL");

      const branchFeedback = feedbackData.filter((fb: any) => fb.branchId === branchId);
      const recentFeedback = branchFeedback.filter((fb: any) => {
        const d = fb.createdAt ? new Date(fb.createdAt) : null;
        return d && d >= thirtyDaysAgo;
      });
      const avgFeedbackRating = recentFeedback.length > 0
        ? (recentFeedback.reduce((sum: number, fb: any) => sum + (fb.rating || 0), 0) / recentFeedback.length).toFixed(1)
        : "-";

      roleDescription = `${branchName} ${role === "manager" ? "Müdürü" : "Supervisoru"}`;
      roleContext = `SUBE DURUMU (${branchName}):
- Aktif Personel: ${usersData.length}
- Bekleyen Gorevler: ${pendingTasks.length}
- Acik Arizalar: ${openFaults.length} (Kritik/Yuksek: ${criticalFaults.length})
- Bekleyen Izin Talepleri: ${pendingLeaves.length}

BUGUNUN CHECKLIST DURUMU:
- Tamamlanan Checklist: ${branchChecklists.length}

BUGUNUN VARDIYA PROGRAMI:
${todayShiftDetails.length > 0 ? todayShiftDetails.join("\n") : "- Bugun icin vardiya planlanmamis veya veri yok"}

EKIPMAN DURUMU:
- Toplam Ekipman: ${equipmentData.length}
${problemEquipment.length > 0 ? `- Sorunlu Ekipman:\n${problemEquipment.map(e => `  * ${e.name}: ${e.status} (${e.faults} acik ariza)`).join("\n")}` : "- Tum ekipmanlar normal"}

MÜŞTERİ GERİ BİLDİRİMİ (Son 30 Gun):
- Değerlendirme Sayısı: ${recentFeedback.length}
- Ortalama Puan: ${avgFeedbackRating}/5

PERSONEL PERFORMANSLARI:
${perfDetails.length > 0 ? perfDetails.join("\n") : "- Performans verisi henuz yok"}

PERSONEL LISTESI:
${usersData.map(u => `- ${redactName(u.firstName, u.lastName, showFullNames)} (${u.role})`).join("\n")}`;
      accessibleData = "Sube personeli, gorevler, checklistler, arizalar, vardiyalar, izin talepleri, ekipman durumu, musteri geri bildirimleri";

    } else if ((role === "barista" || role === "bar_buddy" || role === "stajyer") && branchId) {
      const [branchData, tasksData] = await Promise.all([
        db.select().from(branches).where(eq(branches.id, branchId)),
        db.select().from(tasks).where(and(eq(tasks.branchId, branchId), eq(tasks.assignedToId, userId))),
      ]);

      const branchName = branchData[0]?.name || "Bilinmiyor";
      const myPending = tasksData.filter((t: any) => t.status === "pending" || t.status === "beklemede");

      roleDescription = `${branchName} ${role === "barista" ? "Barista" : role === "bar_buddy" ? "Bar Buddy" : "Stajyer"}`;
      roleContext = `GOREV DURUMU:
- Bekleyen Gorevleriniz: ${myPending.length}
- Toplam Atadiginiz Gorev: ${tasksData.length}`;
      accessibleData = role === "stajyer"
        ? "SADECE kendi egitim modulleri ve gunluk checklist"
        : "Kendi gorevleri, gunluk checklist, egitim modulleri, izin talepleri";

    } else if (role === "ik") {
      const [usersData, leavesData, branchesData] = await Promise.all([
        db.select().from(users),
        db.select().from(leaveRequests),
        db.select().from(branches),
      ]);

      const activeUsers = usersData.filter(u => u.isActive);
      const pendingLeaves = leavesData.filter((l: any) => l.status === "pending" || l.status === "beklemede");

      roleDescription = "Insan Kaynaklari Uzmani";
      roleContext = `IK DURUMU:
- Aktif Personel: ${activeUsers.length} (Toplam: ${usersData.length})
- Bekleyen Izin Talepleri: ${pendingLeaves.length}
- Sube Sayisi: ${branchesData.length}`;
      accessibleData = "Personel bilgileri, izin talepleri, vardiya planlama, performans kayitlari";

    } else if (role === "operasyon") {
      const [branchesData, faultsData, tasksData] = await Promise.all([
        db.select().from(branches),
        db.select().from(equipmentFaults),
        db.select().from(tasks),
      ]);

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress");
      const pendingTasks = tasksData.filter((t: any) => t.status === "pending" || t.status === "beklemede");

      roleDescription = "Operasyon Uzmani";
      roleContext = `OPERASYON DURUMU:
- Sube Sayisi: ${branchesData.length}
- Acik Arizalar: ${openFaults.length}
- Bekleyen Gorevler: ${pendingTasks.length}`;
      accessibleData = "Sube operasyonlari, gorev yonetimi, checklistler, ekipman durumu";

    } else if (role === "pazarlama" || role === "marketing") {
      const [feedbackData, branchesData] = await Promise.all([
        db.select().from(customerFeedback),
        db.select().from(branches),
      ]);

      const avgRating = feedbackData.length > 0
        ? (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1)
        : "Veri yok";

      roleDescription = "Pazarlama Uzmani";
      roleContext = `PAZARLAMA DURUMU:
- Sube Sayisi: ${branchesData.length}
- Müşteri Geri Bildirimi: ${feedbackData.length}
- Ortalama Puan: ${avgRating}/5`;
      accessibleData = "Kampanyalar, müşteri geri bildirimleri, marka iletişimi";

    } else {
      roleDescription = `DOSPRESSO Çalışanı (${role})`;
      roleContext = "Genel bilgiler";
      accessibleData = "Sinirli erisim - sadece genel bilgiler";
    }
  } catch (e) {
    console.log("AI context gathering error:", e);
    roleDescription = "DOSPRESSO Çalışanı";
    roleContext = "Context yuklenemedi";
    accessibleData = "Sinirli erisim";
  }

  let recipeContext = "";
  try {
    const activeRecipes = await db.select({
      id: recipes.id,
      nameTr: recipes.nameTr,
      description: recipes.description,
      marketingText: recipes.marketingText,
      salesTips: recipes.salesTips,
      upsellingNotes: recipes.upsellingNotes,
    }).from(recipes).where(eq(recipes.isActive, true)).limit(50);

    if (activeRecipes.length > 0) {
      const recipeLines = activeRecipes.map(r => {
        const parts = [`- ${r.nameTr}: ${r.description || 'Açıklama yok'}`];
        if (r.marketingText) parts.push(`Pazarlama: ${r.marketingText}`);
        if (r.upsellingNotes) parts.push(`Upselling: ${r.upsellingNotes}`);
        if (r.salesTips) parts.push(`Satış dili: ${r.salesTips}`);
        return parts.join('. ');
      });
      recipeContext = `\nREÇETE BİLGİLERİ (Bu bilgileri ürünler hakkında soru sorulduğunda kullan):\n${recipeLines.join('\n')}`;
    }
  } catch (recipeErr) {
    console.error("Recipe context error:", recipeErr);
  }

  const navLinks = buildNavLinksPrompt(role);

  const firstName = user.firstName || "Kullanici";

  const systemPrompt = `Sen Mr. Dobody'sin - DOSPRESSO kahve zinciri franchise yonetim sisteminin ozel AI asistani. Gercek veritabani verileriyle calisiyorsun.

KISISEL ILETISIM KURALLARI (COK ONEMLI):
- Kullanicinin adi: ${firstName}. Her yanita "${firstName}" diye ismiyle hitap ederek basla.
- Samimi, sicak ve destekleyici bir tonla konus. Sanki iyi bir arkadas tavsiye veriyor gibi ol.
- Ornekler: "${firstName}, su an 3 acik arizan var, hemen bakalim!", "${firstName}, harika bir soru sordun!", "${firstName}, sana su oneride bulunayim..."
- Asla resmi veya robotik olma. Kisa, etkili ve samimi cevaplar ver.
- Kendini tanitirken: "Ben Mr. Dobody, senin ozel asistaninim!" de.

KULLANICI BILGISI:
- Ad: ${user.firstName || "Kullanici"}
- Rol: ${roleDescription}
- Erisebilecegi Veriler: ${accessibleData}

${roleContext}

NAVIGASYON LINKLERI (kullaniciya yonlendirme yaparken bu linkleri kullan):
${navLinks}
${recipeContext}

YANITLAMA KURALLARI:
1. Turkce ve samimi tonda cevap ver. Her zaman kullaniciyi ismiyle hitap et.
2. Verilen gercek verilere dayanarak SOMUT cevaplar ver. Genel laflar yerine sayi, isim, sube adi gibi spesifik bilgiler sun.
3. Kullaniciya ilgili sayfaya yonlendirme yapmak icin MUTLAKA markdown link formatini kullan: [Link Metni](/sayfa-yolu)
   Ornek: "${firstName}, detaylar icin [Ariza Yonetimi](/ariza) sayfasina gidebilirsin."
   Ornek: "${firstName}, bu subeyi incelemek icin [Kadikoy Sube](/sube/3) sayfasina bak."
4. Eger tablo formatinda veri sunuyorsan, markdown tablo kullan:
   | Sube | Ariza | Skor |
   |------|-------|------|
   | X    | 5     | 80   |
5. Madde isaretleri ve numarali listeler kullanarak yapilandirilmis cevaplar ver.
6. SADECE kullanicinin erisebilecegi veriler hakkinda bilgi ver. Yetkisi disindaki veriler hakkinda "${firstName}, bu bilgiye erisim yetkin bulunmuyor" de.
7. max_tokens siniri var, bu yuzden gereksiz uzatma. Onemli bilgileri on plana al.
8. Kullaniciya aksiyon onerileri sun ve hangi sayfaya gitmesi gerektigini linkle goster.
9. Müşteri bir ürün hakkında soru sorduğunda, reçete bilgilerinden yararlanarak detaylı bilgi ver ve upselling önerilerinde bulun.

KISITLAMALAR:
- ASLA baska personelin telefon, e-posta, TC kimlik, adres gibi kisisel bilgilerini PAYLASMAYACAKSIN.
- Satin alma fiyatlari, tedarikci sozlesme detaylari ve finansal veriler sadece yetkili rollere (ceo, cgo, admin, satinalma, muhasebe) verilebilir.
- Fabrika uretim batch detaylari, recete maliyet bilgileri sube personeline VERILMEZ.
- Kullanicinin yetkisi disindaki veriler hakkinda "${firstName}, bu bilgiye erisim yetkin bulunmuyor" de.
${role === "stajyer" ? "- Stajyer: SADECE egitim ve checklist bilgisi ver. Personel/sube/finans bilgisi VERME." : ""}
${role === "barista" || role === "bar_buddy" ? "- Barista/Bar Buddy: Sadece kendi gorevleri, egitim ve izin haklari. Diger personel bilgisi verme." : ""}
${["yatirimci_hq", "yatirimci_branch"].includes(role) ? "- Yatirimci: Sadece performans raporlari. Operasyonel detay ve personel bilgisi VERME." : ""}`;

  return { systemPrompt, roleDescription };
}
