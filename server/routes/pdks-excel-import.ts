/**
 * PDKS Excel İçe Aktarma API
 * Upload → Parse → Eşleştirme → Günlük Özet
 * Yetki: admin, muhasebe, muhasebe_ik
 */

import { Router, Response } from "express";
import { db } from "../db";
import {
  pdksExcelImports, pdksExcelRecords, pdksDailySummary,
  pdksMonthlyStats, pdksEmployeeMappings, users, branches,
} from "@shared/schema";
import { eq, and, sql, desc, ne } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import multer from "multer";
import * as XLSX from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const IMPORT_ROLES = ["admin", "muhasebe", "muhasebe_ik"];

// ═══ S-Flag (23 Nis 2026): Pilot Süresince PDKS Excel Import Devre Dışı ═══
//
// Pilot (28 Nis - 4 May 2026) boyunca kiosk-only dataSource.
// Excel import edilirse çift kayıt riski var (kiosk ile çakışma).
//
// Env: PDKS_EXCEL_IMPORT_ENABLED
//   'false' veya boş (default) → Upload + calculate endpoint'leri bloke
//   'true'                    → Normal çalışma (pilot sonrası)
//
// Sadece WRITE endpoint'ler bloke: upload, calculate-daily, calculate-monthly
// READ endpoint'ler (list, mappings) her zaman açık (geçmiş veri görüntüleme)
const isExcelImportEnabled = (): boolean => {
  return (process.env.PDKS_EXCEL_IMPORT_ENABLED || "false").trim().toLowerCase() === "true";
};

const pdksWriteGuard = (req: any, res: Response, next: any) => {
  if (!isExcelImportEnabled()) {
    console.warn(
      `[S-Flag] PDKS Excel write engellendi: ${req.method} ${req.path} user=${req.user?.id || "anonim"}`
    );
    return res.status(503).json({
      error: "PDKS Excel import pilot süresince devre dışı",
      message: "Pilot dönemi bittikten sonra PDKS_EXCEL_IMPORT_ENABLED=true ile açılabilir",
      pilotPeriod: "28 Nis - 4 May 2026",
    });
  }
  next();
};
// ═══════════════════════════════════════

// ═══════════════════════════════════════
// EŞLEŞTIRME TABLOSU
// ═══════════════════════════════════════

// GET /api/pdks-import/mappings — Mevcut eşleştirmeler
router.get("/api/pdks-import/mappings", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    const branchId = req.query.branchId ? Number(req.query.branchId) : null;

    const mappings = await db.select({
      id: pdksEmployeeMappings.id,
      pdksCode: pdksEmployeeMappings.pdksCode,
      pdksName: pdksEmployeeMappings.pdksName,
      userId: pdksEmployeeMappings.userId,
      branchId: pdksEmployeeMappings.branchId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
    })
    .from(pdksEmployeeMappings)
    .leftJoin(users, eq(pdksEmployeeMappings.userId, users.id))
    .where(branchId ? eq(pdksEmployeeMappings.branchId, branchId) : undefined)
    .orderBy(pdksEmployeeMappings.pdksName);

    res.json(mappings);
  } catch (error) {
    console.error("PDKS mappings error:", error);
    res.status(500).json({ error: "Eşleştirmeler yüklenemedi" });
  }
});

// POST /api/pdks-import/mappings — Manuel eşleştirme
router.post("/api/pdks-import/mappings", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { branchId, pdksCode, pdksName, userId } = req.body;
    const [created] = await db.insert(pdksEmployeeMappings).values({
      branchId: Number(branchId),
      pdksCode,
      pdksName,
      userId,
      createdBy: req.user.id,
    }).onConflictDoNothing().returning();

    res.json(created || { message: "Zaten mevcut" });
  } catch (error) {
    console.error("PDKS mapping create error:", error);
    res.status(500).json({ error: "Eşleştirme oluşturulamadı" });
  }
});

// ═══════════════════════════════════════
// EXCEL UPLOAD + PARSE
// ═══════════════════════════════════════

// POST /api/pdks-import/upload — Excel yükle ve parse et
router.post("/api/pdks-import/upload", isAuthenticated, pdksWriteGuard, upload.single("file"), async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    if (!req.file) return res.status(400).json({ error: "Dosya gerekli" });

    const { branchId, month, year, importType } = req.body;
    if (!branchId || !month || !year) {
      return res.status(400).json({ error: "branchId, month, year gerekli" });
    }

    // Excel parse
    const workbook = XLSX.read(req.file.buffer, { type: "buffer", cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });

    // Başlık satırını bul
    let headerRow = -1;
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      if (row && row.some((cell: any) => String(cell).toUpperCase().includes("KOD") || String(cell).toUpperCase().includes("İSİM"))) {
        headerRow = i;
        break;
      }
    }
    if (headerRow === -1) return res.status(400).json({ error: "Excel formatı tanınamadı — KOD/İSİM sütunları bulunamadı" });

    const headers = rows[headerRow].map((h: any) => String(h).trim().toUpperCase());
    const codeIdx = headers.findIndex((h: string) => h.includes("KOD"));
    const nameIdx = headers.findIndex((h: string) => h.includes("İSİM") || h.includes("ISIM"));
    const dateIdx = headers.findIndex((h: string) => h.includes("TARİH") || h.includes("TARIH"));

    if (codeIdx === -1 || nameIdx === -1 || dateIdx === -1) {
      return res.status(400).json({ error: "KOD, İSİM veya TARİH sütunu bulunamadı" });
    }

    // Import kaydı oluştur
    const [importRecord] = await db.insert(pdksExcelImports).values({
      branchId: Number(branchId),
      month: Number(month),
      year: Number(year),
      fileName: req.file.originalname || "pdks.xlsx",
      importType: importType || "historical",
      importedBy: req.user.id,
      status: "processing",
    }).returning();

    // Mevcut eşleştirmeler
    const existingMappings = await db.select().from(pdksEmployeeMappings)
      .where(eq(pdksEmployeeMappings.branchId, Number(branchId)));
    const mappingByCode = new Map(existingMappings.map(m => [m.pdksCode, m.userId]));

    // Şube personeli (fuzzy match için)
    const branchUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users).where(eq(users.branchId, Number(branchId)));

    // Parse records
    const records: any[] = [];
    const unmatchedNames = new Set<string>();
    let matched = 0;

    for (let i = headerRow + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || !row[dateIdx]) continue;

      const code = String(row[codeIdx] || "").trim();
      const name = String(row[nameIdx] || "").trim();
      const dateStr = row[dateIdx];

      // Tarih parse
      let swipeTime: Date | null = null;
      if (dateStr instanceof Date) {
        swipeTime = dateStr;
      } else {
        const parsed = new Date(String(dateStr));
        if (!isNaN(parsed.getTime())) swipeTime = parsed;
      }
      if (!swipeTime) continue;

      // Eşleştirme: 1) Kod bazlı mapping, 2) İsim fuzzy match
      let matchedUserId: string | null = null;
      let matchMethod: string | null = null;

      if (code && mappingByCode.has(code)) {
        matchedUserId = mappingByCode.get(code)!;
        matchMethod = "code";
      } else {
        // Fuzzy: isim içeren kullanıcı bul
        const lowerName = name.toLowerCase();
        const found = branchUsers.find(u => {
          const fullName = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
          return fullName.includes(lowerName) || lowerName.includes((u.firstName || "").toLowerCase());
        });
        if (found) {
          matchedUserId = found.id;
          matchMethod = "name";
          // Otomatik mapping kaydet
          if (code) {
            await db.insert(pdksEmployeeMappings).values({
              branchId: Number(branchId), pdksCode: code, pdksName: name,
              userId: found.id, createdBy: req.user.id,
            }).onConflictDoNothing();
            mappingByCode.set(code, found.id);
          }
        }
      }

      if (matchedUserId) matched++;
      else unmatchedNames.add(name);

      records.push({
        importId: importRecord.id,
        sourceRowNo: i + 1,
        sourceCode: code,
        sourceName: name,
        swipeTime,
        matchedUserId,
        matchMethod,
      });
    }

    // Batch insert
    if (records.length > 0) {
      for (let i = 0; i < records.length; i += 100) {
        await db.insert(pdksExcelRecords).values(records.slice(i, i + 100));
      }
    }

    // Import kaydını güncelle
    await db.update(pdksExcelImports).set({
      status: "completed",
      totalRecords: records.length,
      matchedRecords: matched,
      unmatchedRecords: records.length - matched,
      warnings: unmatchedNames.size > 0 ? Array.from(unmatchedNames).map(n => ({ type: "unmatched", name: n })) : [],
    }).where(eq(pdksExcelImports.id, importRecord.id));

    res.json({
      importId: importRecord.id,
      totalRecords: records.length,
      matchedRecords: matched,
      unmatchedRecords: records.length - matched,
      unmatchedNames: Array.from(unmatchedNames),
    });
  } catch (error) {
    console.error("PDKS Excel upload error:", error);
    res.status(500).json({ error: "Excel işleme başarısız" });
  }
});

// ═══════════════════════════════════════
// IMPORT LİSTESİ
// ═══════════════════════════════════════

router.get("/api/pdks-import/list", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const imports = await db.select({
      import: pdksExcelImports,
      branchName: branches.name,
    })
    .from(pdksExcelImports)
    .leftJoin(branches, eq(pdksExcelImports.branchId, branches.id))
    // Hide internal kiosk_sync imports (shift_attendance-derived) from UI
    .where(ne(pdksExcelImports.importType, 'kiosk_sync'))
    .orderBy(desc(pdksExcelImports.createdAt))
    .limit(50);

    res.json(imports.map(i => ({ ...i.import, branchName: i.branchName })));
  } catch (error) {
    console.error("PDKS import list error:", error);
    res.status(500).json({ error: "Import listesi yüklenemedi" });
  }
});

// GET /api/pdks-import/:id/records — Import kayıtları
router.get("/api/pdks-import/:id/records", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const records = await db.select().from(pdksExcelRecords)
      .where(eq(pdksExcelRecords.importId, importId))
      .orderBy(pdksExcelRecords.swipeTime)
      .limit(2000);

    res.json(records);
  } catch (error) {
    console.error("PDKS records error:", error);
    res.status(500).json({ error: "Kayıtlar yüklenemedi" });
  }
});

// POST /api/pdks-import/:id/calculate-daily — Günlük özet hesapla
router.post("/api/pdks-import/:id/calculate-daily", isAuthenticated, pdksWriteGuard, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const importRec = await db.select().from(pdksExcelImports).where(eq(pdksExcelImports.id, importId)).limit(1);
    if (!importRec[0]) return res.status(404).json({ error: "Import bulunamadı" });
    if (importRec[0].isFinalized) return res.status(400).json({ error: "Bu import finalize edilmiş, değiştirilemez" });

    const isHistorical = importRec[0].importType === "historical";

    // Eşleşmiş kayıtları al
    const records = await db.select().from(pdksExcelRecords)
      .where(and(
        eq(pdksExcelRecords.importId, importId),
        sql`${pdksExcelRecords.matchedUserId} IS NOT NULL`
      ))
      .orderBy(pdksExcelRecords.swipeTime);

    // Kullanıcı+gün bazında grupla
    const byUserDay = new Map<string, Date[]>();
    for (const r of records) {
      const userId = r.matchedUserId!;
      const day = new Date(r.swipeTime).toISOString().slice(0, 10);
      const key = `${userId}|${day}`;
      if (!byUserDay.has(key)) byUserDay.set(key, []);
      byUserDay.get(key)!.push(new Date(r.swipeTime));
    }

    let created = 0;
    for (const [key, swipes] of byUserDay) {
      const [userId, dayStr] = key.split("|");
      swipes.sort((a, b) => a.getTime() - b.getTime());

      const firstSwipe = swipes[0];
      const lastSwipe = swipes[swipes.length - 1];
      const grossMinutes = Math.round((lastSwipe.getTime() - firstSwipe.getTime()) / 60000);

      // Mola tahmini: 2.+3. okutma arası (varsa)
      let breakMinutes = 0;
      if (swipes.length >= 4) {
        breakMinutes = Math.round((swipes[2].getTime() - swipes[1].getTime()) / 60000);
        if (breakMinutes > 120) breakMinutes = 60; // makul sınır
      }

      const netMinutes = Math.max(0, grossMinutes - breakMinutes);
      const overtimeMinutes = netMinutes > 480 ? netMinutes - 480 : 0; // 8 saat üzeri

      await db.insert(pdksDailySummary).values({
        importId,
        userId,
        branchId: importRec[0].branchId,
        workDate: new Date(dayStr),
        firstSwipe,
        lastSwipe,
        totalSwipes: swipes.length,
        grossMinutes,
        breakMinutes,
        netMinutes,
        overtimeMinutes: overtimeMinutes >= 30 ? overtimeMinutes : 0, // 30dk eşik
        isHistorical,
        warnings: swipes.length === 1 ? [{ type: "single_swipe", message: "Sadece giriş — çıkış eksik" }] : [],
      }).onConflictDoNothing();
      created++;
    }

    res.json({ created, totalDays: byUserDay.size });
  } catch (error) {
    console.error("PDKS daily calculation error:", error);
    res.status(500).json({ error: "Günlük hesaplama başarısız" });
  }
});

// ═══════════════════════════════════════
// SPRINT PDKS-2: AYLIK İSTATİSTİK + UYUMLULUK SKORU
// ═══════════════════════════════════════

// POST /api/pdks-import/:id/calculate-monthly — Aylık özet hesapla
router.post("/api/pdks-import/:id/calculate-monthly", isAuthenticated, pdksWriteGuard, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const importRec = await db.select().from(pdksExcelImports).where(eq(pdksExcelImports.id, importId)).limit(1);
    if (!importRec[0]) return res.status(404).json({ error: "Import bulunamadı" });
    if (importRec[0].isFinalized) return res.status(400).json({ error: "Bu import finalize edilmiş, değiştirilemez" });

    const { branchId, month, year, importType } = importRec[0];
    const isHistorical = importType === "historical";

    // Günlük özetler
    const dailies = await db.select().from(pdksDailySummary)
      .where(eq(pdksDailySummary.importId, importId));

    // Kullanıcı bazında grupla
    const byUser = new Map<string, typeof dailies>();
    for (const d of dailies) {
      if (!byUser.has(d.userId)) byUser.set(d.userId, []);
      byUser.get(d.userId)!.push(d);
    }

    let created = 0;
    for (const [userId, days] of byUser) {
      const workDays = days.filter(d => !d.isOffDay && !d.isHoliday);
      const offDays = days.filter(d => d.isOffDay);
      const totalMinutes = workDays.reduce((sum, d) => sum + (d.netMinutes || 0), 0);
      const avgDaily = workDays.length > 0 ? Math.round(totalMinutes / workDays.length) : 0;
      const totalOT = workDays.reduce((sum, d) => sum + (d.overtimeMinutes || 0), 0);

      // Geç kalma: giriş 09:15'ten sonra (9*60+15=555dk)
      const lateCount = workDays.filter(d => {
        if (!d.firstSwipe) return false;
        const swipeDate = new Date(d.firstSwipe);
        const minutesFromMidnight = swipeDate.getHours() * 60 + swipeDate.getMinutes();
        return minutesFromMidnight > 555; // 09:15
      }).length;

      // Erken çıkma: çıkış 17:00'den önce (1020dk)
      const earlyLeaveCount = workDays.filter(d => {
        if (!d.lastSwipe) return false;
        const swipeDate = new Date(d.lastSwipe);
        const minutesFromMidnight = swipeDate.getHours() * 60 + swipeDate.getMinutes();
        return minutesFromMidnight < 1020; // 17:00
      }).length;

      // Uyumluluk skoru (0-100)
      const totalDaysInMonth = new Date(year, month, 0).getDate();
      const expectedWorkDays = totalDaysInMonth - offDays.length;
      const onTimeRate = workDays.length > 0 ? Math.max(0, 100 - (lateCount / workDays.length * 100)) : 0;
      const fullShiftRate = workDays.length > 0 ? Math.min(100, (workDays.filter(d => (d.netMinutes || 0) >= 450).length / workDays.length * 100)) : 0;
      const attendanceRate = expectedWorkDays > 0 ? Math.min(100, (workDays.length / expectedWorkDays * 100)) : 0;
      const complianceScore = Math.round(
        onTimeRate * 0.30 + fullShiftRate * 0.30 + attendanceRate * 0.20 + (100 - Math.min(100, earlyLeaveCount * 10)) * 0.20
      );

      await db.insert(pdksMonthlyStats).values({
        userId,
        branchId,
        month,
        year,
        totalWorkDays: workDays.length,
        totalOffDays: offDays.length,
        totalAbsentDays: Math.max(0, expectedWorkDays - workDays.length),
        avgDailyMinutes: avgDaily,
        totalOvertimeMinutes: totalOT,
        totalLateCount: lateCount,
        totalEarlyLeaveCount: earlyLeaveCount,
        complianceScore,
        isHistorical,
        sourceImportId: importId,
      }).onConflictDoNothing();
      created++;
    }

    res.json({ created, message: `${created} personel aylık istatistiği hesaplandı` });
  } catch (error) {
    console.error("PDKS monthly calculation error:", error);
    res.status(500).json({ error: "Aylık hesaplama başarısız" });
  }
});

// GET /api/pdks-import/monthly-stats — Aylık istatistikler
router.get("/api/pdks-import/monthly-stats", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const { branchId, month, year } = req.query;

    let query = db.select({
      stats: pdksMonthlyStats,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
    })
    .from(pdksMonthlyStats)
    .leftJoin(users, eq(pdksMonthlyStats.userId, users.id))
    .orderBy(desc(pdksMonthlyStats.complianceScore));

    const results = await query;

    let filtered = results;
    if (branchId) filtered = filtered.filter(r => r.stats.branchId === Number(branchId));
    if (month) filtered = filtered.filter(r => r.stats.month === Number(month));
    if (year) filtered = filtered.filter(r => r.stats.year === Number(year));

    res.json(filtered.map(r => ({ ...r.stats, userName: r.userName })));
  } catch (error) {
    console.error("PDKS monthly stats error:", error);
    res.status(500).json({ error: "Aylık istatistikler yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// SPRINT PDKS-3: PROFİL + TREND + ŞUBE RAPORU
// ═══════════════════════════════════════

// GET /api/pdks-import/user/:userId/profile — Personel PDKS profili (12 aylık trend)
router.get("/api/pdks-import/user/:userId/profile", isAuthenticated, async (req: any, res: Response) => {
  try {
    const viewRoles = [...IMPORT_ROLES, "ceo", "cgo", "coach", "fabrika_mudur"];
    if (!viewRoles.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const userId = req.params.userId;

    // Son 12 aylık istatistikler
    const stats = await db.select().from(pdksMonthlyStats)
      .where(eq(pdksMonthlyStats.userId, userId))
      .orderBy(desc(pdksMonthlyStats.year), desc(pdksMonthlyStats.month))
      .limit(12);

    // Kullanıcı bilgisi
    const [user] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      branchId: users.branchId,
    }).from(users).where(eq(users.id, userId));

    if (!user) return res.status(404).json({ error: "Kullanıcı bulunamadı" });

    // Trend hesapla
    const avgCompliance = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + (s.complianceScore || 0), 0) / stats.length)
      : 0;
    const avgDailyMinutes = stats.length > 0
      ? Math.round(stats.reduce((sum, s) => sum + (s.avgDailyMinutes || 0), 0) / stats.length)
      : 0;
    const totalLate = stats.reduce((sum, s) => sum + (s.totalLateCount || 0), 0);
    const totalOT = stats.reduce((sum, s) => sum + (s.totalOvertimeMinutes || 0), 0);

    // Trend yönü (son 3 ay vs önceki 3 ay)
    let trend: "up" | "down" | "stable" = "stable";
    if (stats.length >= 6) {
      const recent3 = stats.slice(0, 3).reduce((s, v) => s + (v.complianceScore || 0), 0) / 3;
      const prev3 = stats.slice(3, 6).reduce((s, v) => s + (v.complianceScore || 0), 0) / 3;
      if (recent3 > prev3 + 5) trend = "up";
      else if (recent3 < prev3 - 5) trend = "down";
    }

    res.json({
      user,
      summary: { avgCompliance, avgDailyMinutes, totalLate, totalOT, trend, monthCount: stats.length },
      monthlyData: stats.reverse(), // kronolojik sıra (eski→yeni)
    });
  } catch (error) {
    console.error("PDKS user profile error:", error);
    res.status(500).json({ error: "Profil yüklenemedi" });
  }
});

// GET /api/pdks-import/branch/:branchId/compliance — Şube uyumluluk raporu
router.get("/api/pdks-import/branch/:branchId/compliance", isAuthenticated, async (req: any, res: Response) => {
  try {
    const viewRoles = [...IMPORT_ROLES, "ceo", "cgo", "coach", "fabrika_mudur"];
    if (!viewRoles.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const branchId = Number(req.params.branchId);
    const month = req.query.month ? Number(req.query.month) : new Date().getMonth() + 1;
    const year = req.query.year ? Number(req.query.year) : new Date().getFullYear();

    const stats = await db.select({
      stats: pdksMonthlyStats,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
    })
    .from(pdksMonthlyStats)
    .leftJoin(users, eq(pdksMonthlyStats.userId, users.id))
    .where(and(
      eq(pdksMonthlyStats.branchId, branchId),
      eq(pdksMonthlyStats.month, month),
      eq(pdksMonthlyStats.year, year),
    ))
    .orderBy(desc(pdksMonthlyStats.complianceScore));

    const personnel = stats.map(s => ({ ...s.stats, userName: s.userName }));
    const avgScore = personnel.length > 0
      ? Math.round(personnel.reduce((sum, p) => sum + (p.complianceScore || 0), 0) / personnel.length)
      : 0;
    const lowPerformers = personnel.filter(p => (p.complianceScore || 0) < 60);
    const topPerformers = personnel.filter(p => (p.complianceScore || 0) >= 90);

    res.json({
      branchId, month, year,
      summary: {
        avgScore,
        personnelCount: personnel.length,
        topPerformers: topPerformers.length,
        lowPerformers: lowPerformers.length,
      },
      personnel,
    });
  } catch (error) {
    console.error("PDKS branch compliance error:", error);
    res.status(500).json({ error: "Şube raporu yüklenemedi" });
  }
});

// GET /api/pdks-import/alerts — Dobody entegrasyonu için düşük uyumluluk uyarıları
router.get("/api/pdks-import/alerts", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!["admin", "ceo", "cgo", "coach", "muhasebe_ik"].includes(req.user.role)) {
      return res.status(403).json({ error: "Yetkisiz" });
    }

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    // Bu ayki düşük uyumluluk (<60)
    const lowCompliance = await db.select({
      userId: pdksMonthlyStats.userId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
      branchId: pdksMonthlyStats.branchId,
      branchName: branches.name,
      complianceScore: pdksMonthlyStats.complianceScore,
      totalLateCount: pdksMonthlyStats.totalLateCount,
      totalAbsentDays: pdksMonthlyStats.totalAbsentDays,
    })
    .from(pdksMonthlyStats)
    .leftJoin(users, eq(pdksMonthlyStats.userId, users.id))
    .leftJoin(branches, eq(pdksMonthlyStats.branchId, branches.id))
    .where(and(
      eq(pdksMonthlyStats.month, currentMonth),
      eq(pdksMonthlyStats.year, currentYear),
      sql`${pdksMonthlyStats.complianceScore} < 60`,
    ))
    .orderBy(pdksMonthlyStats.complianceScore);

    // Kronik geç kalma (son 3 ayda toplam 10+ geç)
    const chronicLate = await db.select({
      userId: pdksMonthlyStats.userId,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, 'Bilinmiyor')`,
      totalLate: sql<number>`SUM(${pdksMonthlyStats.totalLateCount})`,
    })
    .from(pdksMonthlyStats)
    .leftJoin(users, eq(pdksMonthlyStats.userId, users.id))
    .where(sql`${pdksMonthlyStats.year} = ${currentYear} AND ${pdksMonthlyStats.month} >= ${Math.max(1, currentMonth - 2)}`)
    .groupBy(pdksMonthlyStats.userId, users.firstName, users.lastName)
    .having(sql`SUM(${pdksMonthlyStats.totalLateCount}) >= 10`);

    res.json({
      lowCompliance,
      chronicLate,
      alertCount: lowCompliance.length + chronicLate.length,
    });
  } catch (error) {
    console.error("PDKS alerts error:", error);
    res.status(500).json({ error: "Uyarılar yüklenemedi" });
  }
});

// ═══════════════════════════════════════
// SPRINT PDKS-4: BATCH IMPORT + EXPORT + FİNALİZE
// ═══════════════════════════════════════

// POST /api/pdks-import/batch-upload — Çoklu şube batch import
router.post("/api/pdks-import/batch-upload", isAuthenticated, upload.array("files", 10), async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });
    
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) return res.status(400).json({ error: "En az 1 dosya gerekli" });

    const { branchIds, month, year, importType } = req.body;
    // branchIds = "1,2,3" veya array
    const branchIdList = typeof branchIds === "string" 
      ? branchIds.split(",").map((s: string) => Number(s.trim()))
      : Array.isArray(branchIds) ? branchIds.map(Number) : [];

    if (branchIdList.length === 0) return res.status(400).json({ error: "branchIds gerekli" });
    if (!month || !year) return res.status(400).json({ error: "month ve year gerekli" });

    // Dosya/şube sayısı uyumsuzluğu uyarısı
    const warnings: string[] = [];
    if (files.length !== branchIdList.length && branchIdList.length > 1) {
      warnings.push(`Dosya sayısı (${files.length}) ile şube sayısı (${branchIdList.length}) eşleşmiyor`);
    }

    const results: any[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const branchId = branchIdList[i] || branchIdList[0]; // Eşleşme yoksa ilk şubeye ata

      // Excel parse (tek dosya mantığını tekrar kullan)
      const workbook = XLSX.read(file.buffer, { type: "buffer", cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, dateNF: "yyyy-mm-dd hh:mm:ss" });

      // Başlık satırını bul
      let headerRow = -1;
      for (let r = 0; r < Math.min(rows.length, 10); r++) {
        if (rows[r]?.some((cell: any) => String(cell).toUpperCase().includes("KOD") || String(cell).toUpperCase().includes("İSİM"))) {
          headerRow = r;
          break;
        }
      }
      if (headerRow === -1) {
        results.push({ branchId, fileName: file.originalname, error: "Format tanınamadı" });
        continue;
      }

      const headers = rows[headerRow].map((h: any) => String(h).trim().toUpperCase());
      const codeIdx = headers.findIndex((h: string) => h.includes("KOD"));
      const nameIdx = headers.findIndex((h: string) => h.includes("İSİM") || h.includes("ISIM"));
      const dateIdx = headers.findIndex((h: string) => h.includes("TARİH") || h.includes("TARIH"));

      if (codeIdx === -1 || nameIdx === -1 || dateIdx === -1) {
        results.push({ branchId, fileName: file.originalname, error: "KOD/İSİM/TARİH sütunu bulunamadı" });
        continue;
      }

      // Import kaydı
      const [importRecord] = await db.insert(pdksExcelImports).values({
        branchId, month: Number(month), year: Number(year),
        fileName: file.originalname || `batch-${i}.xlsx`,
        importType: importType || "historical",
        importedBy: req.user.id, status: "processing",
      }).returning();

      // Eşleştirmeler
      const existingMappings = await db.select().from(pdksEmployeeMappings)
        .where(eq(pdksEmployeeMappings.branchId, branchId));
      const mappingByCode = new Map(existingMappings.map(m => [m.pdksCode, m.userId]));

      const branchUsers = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.branchId, branchId));

      // Parse
      const records: any[] = [];
      let matched = 0;
      const unmatchedNames = new Set<string>();

      for (let r = headerRow + 1; r < rows.length; r++) {
        const row = rows[r];
        if (!row || !row[dateIdx]) continue;

        const code = String(row[codeIdx] || "").trim();
        const name = String(row[nameIdx] || "").trim();
        let swipeTime: Date | null = null;
        const dateStr = row[dateIdx];
        if (dateStr instanceof Date) swipeTime = dateStr;
        else { const p = new Date(String(dateStr)); if (!isNaN(p.getTime())) swipeTime = p; }
        if (!swipeTime) continue;

        let matchedUserId: string | null = null;
        let matchMethod: string | null = null;

        if (code && mappingByCode.has(code)) {
          matchedUserId = mappingByCode.get(code)!; matchMethod = "code";
        } else {
          const lowerName = name.toLowerCase();
          const found = branchUsers.find(u => {
            const full = `${u.firstName || ""} ${u.lastName || ""}`.toLowerCase();
            return full.includes(lowerName) || lowerName.includes((u.firstName || "").toLowerCase());
          });
          if (found) {
            matchedUserId = found.id; matchMethod = "name";
            if (code) {
              await db.insert(pdksEmployeeMappings).values({
                branchId, pdksCode: code, pdksName: name, userId: found.id, createdBy: req.user.id,
              }).onConflictDoNothing();
              mappingByCode.set(code, found.id);
            }
          }
        }

        if (matchedUserId) matched++; else unmatchedNames.add(name);
        records.push({ importId: importRecord.id, sourceRowNo: r + 1, sourceCode: code, sourceName: name, swipeTime, matchedUserId, matchMethod });
      }

      // Batch insert
      for (let b = 0; b < records.length; b += 100) {
        await db.insert(pdksExcelRecords).values(records.slice(b, b + 100));
      }

      await db.update(pdksExcelImports).set({
        status: "completed", totalRecords: records.length, matchedRecords: matched,
        unmatchedRecords: records.length - matched,
        warnings: unmatchedNames.size > 0 ? Array.from(unmatchedNames).map(n => ({ type: "unmatched", name: n })) : [],
      }).where(eq(pdksExcelImports.id, importRecord.id));

      results.push({
        branchId, fileName: file.originalname, importId: importRecord.id,
        totalRecords: records.length, matchedRecords: matched,
        unmatchedRecords: records.length - matched, status: "completed",
      });
    }

    res.json({ batchCount: results.length, warnings, results });
  } catch (error) {
    console.error("PDKS batch upload error:", error);
    res.status(500).json({ error: "Batch import başarısız" });
  }
});

// POST /api/pdks-import/:id/finalize — Import'u kilitle (geri alınamaz)
router.post("/api/pdks-import/:id/finalize", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const existing = await db.select().from(pdksExcelImports).where(eq(pdksExcelImports.id, importId)).limit(1);
    if (!existing[0]) return res.status(404).json({ error: "Import bulunamadı" });
    if (existing[0].isFinalized) return res.status(400).json({ error: "Bu import zaten finalize edilmiş" });

    const [updated] = await db.update(pdksExcelImports).set({
      isFinalized: true,
      finalizedAt: new Date(),
      finalizedBy: req.user.id,
    }).where(eq(pdksExcelImports.id, importId)).returning();

    res.json(updated);
  } catch (error) {
    console.error("PDKS finalize error:", error);
    res.status(500).json({ error: "Finalize başarısız" });
  }
});

// GET /api/pdks-import/:id/export — PDKS verisini Excel'e export
router.get("/api/pdks-import/:id/export", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const importRec = await db.select().from(pdksExcelImports).where(eq(pdksExcelImports.id, importId)).limit(1);
    if (!importRec[0]) return res.status(404).json({ error: "Import bulunamadı" });

    // Günlük özetler
    const dailies = await db.select({
      workDate: pdksDailySummary.workDate,
      userName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, '')`,
      firstSwipe: pdksDailySummary.firstSwipe,
      lastSwipe: pdksDailySummary.lastSwipe,
      totalSwipes: pdksDailySummary.totalSwipes,
      grossMinutes: pdksDailySummary.grossMinutes,
      breakMinutes: pdksDailySummary.breakMinutes,
      netMinutes: pdksDailySummary.netMinutes,
      overtimeMinutes: pdksDailySummary.overtimeMinutes,
      isOffDay: pdksDailySummary.isOffDay,
    })
    .from(pdksDailySummary)
    .leftJoin(users, eq(pdksDailySummary.userId, users.id))
    .where(eq(pdksDailySummary.importId, importId))
    .orderBy(pdksDailySummary.workDate);

    // Excel oluştur
    const wsData = [
      ["Tarih", "Personel", "Giriş", "Çıkış", "Okutma", "Brüt (dk)", "Mola (dk)", "Net (dk)", "FM (dk)", "Off"],
      ...dailies.map(d => [
        d.workDate ? new Date(d.workDate).toLocaleDateString("tr-TR") : "",
        d.userName,
        d.firstSwipe ? new Date(d.firstSwipe).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
        d.lastSwipe ? new Date(d.lastSwipe).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "",
        d.totalSwipes || 0,
        d.grossMinutes || 0,
        d.breakMinutes || 0,
        d.netMinutes || 0,
        d.overtimeMinutes || 0,
        d.isOffDay ? "Off" : "",
      ]),
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PDKS Özet");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=PDKS_${importRec[0].year}_${importRec[0].month}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error("PDKS export error:", error);
    res.status(500).json({ error: "Export başarısız" });
  }
});

export default router;
