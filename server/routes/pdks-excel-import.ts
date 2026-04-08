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
import { eq, and, sql, desc } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import multer from "multer";
import * as XLSX from "xlsx";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const IMPORT_ROLES = ["admin", "muhasebe", "muhasebe_ik"];

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
router.post("/api/pdks-import/upload", isAuthenticated, upload.single("file"), async (req: any, res: Response) => {
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
router.post("/api/pdks-import/:id/calculate-daily", isAuthenticated, async (req: any, res: Response) => {
  try {
    if (!IMPORT_ROLES.includes(req.user.role)) return res.status(403).json({ error: "Yetkisiz" });

    const importId = Number(req.params.id);
    const importRec = await db.select().from(pdksExcelImports).where(eq(pdksExcelImports.id, importId)).limit(1);
    if (!importRec[0]) return res.status(404).json({ error: "Import bulunamadı" });

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

export default router;
