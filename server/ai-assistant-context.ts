import { db } from "./db";
import { 
  branches, users, equipmentFaults, equipment, tasks, customerFeedback,
  leaveRequests, quizzes, checklistCompletions, productComplaints,
  employeePerformanceScores, branchAuditScores, shifts, recipes,
  trainingCompletions, auditInstances, productionBatches, purchaseOrders,
  dashboardAlerts, notifications
} from "@shared/schema";
import { eq, desc, sql, and, or, count, avg, gte, lte } from "drizzle-orm";

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
  attendance: { label: "Yoklama", path: "/yoklama" },
  knowledge_base: { label: "Bilgi Bankasi", path: "/bilgi-bankasi" },
  factory: { label: "Fabrika", path: "/fabrika" },
  procurement: { label: "Satinalma", path: "/satinalma" },
  quality: { label: "Kalite Kontrol", path: "/kalite-kontrol-dashboard" },
  crm: { label: "CRM", path: "/crm" },
  analytics: { label: "Analitik", path: "/analitik" },
  notifications: { label: "Bildirimler", path: "/bildirimler" },
  admin: { label: "Admin Paneli", path: "/admin" },
  performance: { label: "Performansim", path: "/performansim" },
  branch_health: { label: "Sube Saglik Skoru", path: "/sube-saglik-skoru" },
  employee_of_month: { label: "Ayin Calisani", path: "/ayin-calisani" },
  support: { label: "Destek", path: "/destek" },
  complaints: { label: "Sikayetler", path: "/sikayetler" },
  cash_reports: { label: "Kasa Raporlari", path: "/kasa-raporlari" },
  accounting: { label: "Muhasebe", path: "/muhasebe" },
};

function buildNavLinksPrompt(role: string): string {
  const hqLinks = ["dashboard", "branches", "faults", "equipment", "tasks", "checklists", "personnel", "training", "academy", "reports", "inspections", "notifications", "branch_health", "employee_of_month"];
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
        return `${u?.firstName || ""} ${u?.lastName || ""} (${br?.name || "HQ"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
      });

      const topPerfUsers = perfData
        .filter(p => p.weeklyTotalScore !== null && Number(p.weeklyTotalScore) > 0)
        .sort((a, b) => Number(b.weeklyTotalScore) - Number(a.weeklyTotalScore))
        .slice(0, 5);

      const topPerfDetails = topPerfUsers.map(p => {
        const u = usersData.find(us => us.id === p.userId);
        const br = u?.branchId ? branchesData.find(b => b.id === u.branchId) : null;
        return `${u?.firstName || ""} ${u?.lastName || ""} (${br?.name || "HQ"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
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
- Acik Urun Sikayetleri: ${openComplaints.length}
- Musteri Degerlendirme Ortalamasi: ${avgFeedback}/5 (${feedbackData.length} degerlendirme)

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
      const [branchesData, usersData, faultsData, perfData, inspectionsData, complaintsData, feedbackData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users),
        db.select().from(equipmentFaults),
        db.select().from(employeePerformanceScores),
        db.select().from(auditInstances),
        db.select().from(productComplaints),
        db.select().from(customerFeedback),
      ]);

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
        return `${u?.firstName || ""} ${u?.lastName || ""} (${br?.name || "?"}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
      });

      roleDescription = "DOSPRESSO Coach - Sube denetimi ve personel gelistirme";
      roleContext = `COACH DASHBOARD:
- Toplam Sube: ${branchesData.length}
- Aktif Personel: ${activeUsers.length}
- Toplam Acik Ariza: ${openFaults.length}
- Toplam Denetim: ${inspectionsData.length}
- Acik Urun Sikayeti: ${complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu").length}

SUBE PERFORMANS OZETI:
${branchStats.slice(0, 10).map((b, i) => `${i+1}. ${b.name} | Personel: ${b.personnel} | Acik Ariza: ${b.openFaults} | Ort. Skor: ${b.avgScore}`).join("\n")}

PERFORMANSI DUSUK PERSONEL:
${lowPerfDetails.length > 0 ? lowPerfDetails.map((d, i) => `${i+1}. ${d}`).join("\n") : "- Veri yok"}

EN COK ARIZA OLAN SUBELER:
${Object.values(faultsByBranch).sort((a, b) => b.count - a.count).slice(0, 5).map((b, i) => `${i+1}. ${b.name}: ${b.count} ariza`).join("\n") || "- Ariza yok"}`;

      accessibleData = "Tum sube verileri, personel performanslari, denetim kayitlari, ariza takibi, mentorluk notlari";

    } else if (role === "trainer") {
      const [usersData, quizData, trainingData, branchesData] = await Promise.all([
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(quizzes),
        db.select().from(trainingCompletions),
        db.select().from(branches),
      ]);

      const branchTrainingStats = branchesData.map(branch => {
        const branchUsers = usersData.filter(u => u.branchId === branch.id);
        const branchTrainings = trainingData.filter(t => branchUsers.some(u => u.id === t.userId));
        return { name: branch.name, users: branchUsers.length, completions: branchTrainings.length };
      }).sort((a, b) => b.completions - a.completions);

      roleDescription = "DOSPRESSO Egitmen - Egitim ve gelisim yonetimi";
      roleContext = `EGITIM DURUMU:
- Aktif Personel: ${usersData.length}
- Mevcut Quiz Sayisi: ${quizData.length}
- Toplam Egitim Tamamlama: ${trainingData.length}

SUBE BAZLI EGITIM PERFORMANSI:
${branchTrainingStats.slice(0, 8).map((b, i) => `${i+1}. ${b.name}: ${b.users} kisi, ${b.completions} tamamlama`).join("\n")}`;
      accessibleData = "Egitim modulleri, quiz yonetimi, personel egitim ilerlemeleri, sertifikalar";

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

      const pendingOrders = ordersData.filter((o: any) => o.status === "pending" || o.status === "beklemede" || o.status === "draft");

      roleDescription = "Satinalma Uzmani";
      roleContext = `SATINALMA DURUMU:
- Toplam Sube: ${branchesData.length}
- Toplam Siparis: ${ordersData.length} (Bekleyen: ${pendingOrders.length})
- Urun Sikayetleri: ${complaintsData.length}`;
      accessibleData = "Stok yonetimi, tedarikci bilgileri, siparis takibi, mal kabul";

    } else if (role === "kalite_kontrol") {
      const [complaintsData, branchesData, faultsData] = await Promise.all([
        db.select().from(productComplaints),
        db.select().from(branches),
        db.select().from(equipmentFaults),
      ]);

      const openComplaints = complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu" && c.status !== "closed");

      roleDescription = "Kalite Kontrol Uzmani";
      roleContext = `KALITE KONTROL DURUMU:
- Toplam Urun Sikayeti: ${complaintsData.length} (Acik: ${openComplaints.length})
- Sube Sayisi: ${branchesData.length}`;
      accessibleData = "Kalite denetimleri, urun sikayetleri, standart uyumluluk, recete yonetimi";

    } else if (role === "muhasebe" || role === "muhasebe_ik") {
      const [branchesData, usersData, leavesData] = await Promise.all([
        db.select().from(branches),
        db.select().from(users).where(eq(users.isActive, true)),
        db.select().from(leaveRequests),
      ]);

      const pendingLeaves = leavesData.filter((l: any) => l.status === "pending" || l.status === "beklemede");

      roleDescription = role === "muhasebe" ? "Muhasebe Uzmani" : "Muhasebe ve IK Uzmani";
      roleContext = `MUHASEBE DURUMU:
- Sube Sayisi: ${branchesData.length}
- Aktif Personel: ${usersData.length}
- Bekleyen Izin Talepleri: ${pendingLeaves.length}`;
      accessibleData = "Finansal raporlar, maliyet analizi, bordro, personel kayitlari";

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
- Urun Sikayetleri: ${complaintsData.filter((c: any) => c.status !== "resolved" && c.status !== "cozuldu").length}
- Sube Sayisi: ${branchesData.length}`;
      accessibleData = "Destek talepleri, ariza bildirimleri, iletisim kayitlari";

    } else if (["fabrika", "fabrika_mudur", "fabrika_sorumlu", "fabrika_teknisyen", "fabrika_personel"].includes(role)) {
      const [equipmentData, faultsData, batchesData] = await Promise.all([
        db.select().from(equipment),
        db.select().from(equipmentFaults),
        db.select().from(productionBatches),
      ]);

      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress");

      roleDescription = role === "fabrika_mudur" ? "Fabrika Muduru" : role === "fabrika_teknisyen" ? "Fabrika Teknisyeni" : "Fabrika Sorumlusu";
      roleContext = `FABRIKA DURUMU:
- Toplam Ekipman: ${equipmentData.length}
- Acik Arizalar: ${openFaults.length}
- Uretim Partileri: ${batchesData.length}`;
      accessibleData = "Uretim planlama, kalite kontrol, stok yonetimi, ekipman durumu";

    } else if ((role === "supervisor" || role === "supervisor_buddy" || role === "manager") && branchId) {
      const [branchData, usersData, tasksData, faultsData, leavesData, perfData, checklistData] = await Promise.all([
        db.select().from(branches).where(eq(branches.id, branchId)),
        db.select().from(users).where(and(eq(users.branchId, branchId), eq(users.isActive, true))),
        db.select().from(tasks).where(eq(tasks.branchId, branchId)),
        db.select().from(equipmentFaults).where(eq(equipmentFaults.branchId, branchId)),
        db.select().from(leaveRequests),
        db.select().from(employeePerformanceScores),
        db.select().from(checklistCompletions),
      ]);

      const branchName = branchData[0]?.name || "Bilinmiyor";
      const openFaults = faultsData.filter((f: any) => f.status === "acik" || f.status === "open" || f.status === "in_progress" || f.status === "atandi");
      const pendingTasks = tasksData.filter((t: any) => t.status === "pending" || t.status === "beklemede");
      const branchLeaves = leavesData.filter((l: any) => usersData.some(u => u.id === l.userId));
      const pendingLeaves = branchLeaves.filter((l: any) => l.status === "pending" || l.status === "beklemede");

      const branchPerf = perfData.filter(p => usersData.some(u => u.id === p.userId));
      const perfDetails = branchPerf
        .filter(p => p.weeklyTotalScore !== null)
        .sort((a, b) => Number(a.weeklyTotalScore) - Number(b.weeklyTotalScore))
        .map(p => {
          const u = usersData.find(us => us.id === p.userId);
          return `${u?.firstName || ""} ${u?.lastName || ""} (${u?.role}) - Skor: ${Number(p.weeklyTotalScore).toFixed(0)}`;
        });

      roleDescription = `${branchName} ${role === "manager" ? "Muduru" : "Supervisoru"}`;
      roleContext = `SUBE DURUMU (${branchName}):
- Aktif Personel: ${usersData.length}
- Bekleyen Gorevler: ${pendingTasks.length}
- Acik Arizalar: ${openFaults.length}
- Bekleyen Izin Talepleri: ${pendingLeaves.length}

PERSONEL PERFORMANSLARI:
${perfDetails.length > 0 ? perfDetails.join("\n") : "- Performans verisi henuz yok"}

PERSONEL LISTESI:
${usersData.map(u => `- ${u.firstName} ${u.lastName} (${u.role})`).join("\n")}`;
      accessibleData = "Sube personeli, gorevler, checklistler, arizalar, vardiyalar, izin talepleri";

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
- Musteri Geri Bildirimi: ${feedbackData.length}
- Ortalama Puan: ${avgRating}/5`;
      accessibleData = "Kampanyalar, musteri geri bildirimleri, marka iletisimi";

    } else {
      roleDescription = `DOSPRESSO Calisani (${role})`;
      roleContext = "Genel bilgiler";
      accessibleData = "Sinirli erisim - sadece genel bilgiler";
    }
  } catch (e) {
    console.log("AI context gathering error:", e);
    roleDescription = "DOSPRESSO Calisani";
    roleContext = "Context yuklenemedi";
    accessibleData = "Sinirli erisim";
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
- Ad: ${user.firstName || ""} ${user.lastName || ""}
- Rol: ${roleDescription}
- Erisebilecegi Veriler: ${accessibleData}

${roleContext}

NAVIGASYON LINKLERI (kullaniciya yonlendirme yaparken bu linkleri kullan):
${navLinks}

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

KISITLAMALAR:
${role === "stajyer" ? "- Stajyer: SADECE egitim ve checklist bilgisi ver. Personel/sube/finans bilgisi VERME." : ""}
${role === "barista" || role === "bar_buddy" ? "- Barista/Bar Buddy: Sadece kendi gorevleri, egitim ve izin haklari. Diger personel bilgisi verme." : ""}
${["yatirimci_hq", "yatirimci_branch"].includes(role) ? "- Yatirimci: Sadece performans raporlari. Operasyonel detay ve personel bilgisi VERME." : ""}`;

  return { systemPrompt, roleDescription };
}
