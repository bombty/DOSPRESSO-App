/**
 * CGO Şube Veri Toplama API
 *
 * 5 ENDPOINT:
 * 1. GET    /api/cgo/branch-data/template/:branchId  → Excel indir
 * 2. POST   /api/cgo/branch-data/upload/:branchId    → Excel yükle + parse
 * 3. GET    /api/cgo/branch-data/status              → 25 şube durum tablosu
 * 4. GET    /api/branch/my/data-status               → Şube müdürü kendi şubesi
 * 5. GET    /api/cgo/branch-data/history/:branchId   → Upload geçmişi
 *
 * ROLES:
 * - cgo, ceo, admin, owner: tüm endpoint'ler
 * - branch_manager, mudur: sadece kendi şubesi
 *
 * Aslan 10 May 2026 talebi.
 */

import { Router, type Request, type Response } from "express";
import { db } from "../db";
import {
  branches,
  users,
  equipment,
  branchDataUploads,
  branchDataCollectionStatus,
  BRANCH_DATA_STATUS,
  UPLOAD_STATUS,
  EQUIPMENT_TYPES,
  EQUIPMENT_METADATA,
} from "@shared/schema";
import { eq, sql, desc, and } from "drizzle-orm";
import { isAuthenticated } from "../localAuth";
import multer from "multer";
import { spawn } from "child_process";
import { readFileSync, unlinkSync, mkdirSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { createHash } from "crypto";

const router = Router();

// ═══════════════════════════════════════════════════════════════════
// Multer config — file upload (Excel only, max 10MB)
// ═══════════════════════════════════════════════════════════════════

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimes = [
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
      "application/vnd.ms-excel", // .xls
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir"));
    }
  },
});

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Role check
// ═══════════════════════════════════════════════════════════════════

const CGO_ROLES = ["cgo", "ceo", "admin", "owner"];
const BRANCH_MANAGER_ROLES = ["branch_manager", "mudur", "owner"];

function isCgoOrAdmin(role: string): boolean {
  return CGO_ROLES.includes(role);
}

function isBranchManager(role: string): boolean {
  return BRANCH_MANAGER_ROLES.includes(role);
}

// ═══════════════════════════════════════════════════════════════════
// 1. GET /template/:branchId — Excel template indir
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/cgo/branch-data/template/:branchId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ error: "Geçersiz şube ID" });
      }

      // Yetki kontrolü
      const isCGO = isCgoOrAdmin(userRole);
      const isOwnBranch = userBranchId === branchId;

      if (!isCGO && !isOwnBranch) {
        return res
          .status(403)
          .json({ error: "Sadece CGO veya kendi şubeniz için template indirebilirsiniz" });
      }

      // Şube bilgilerini al
      const [branch] = await db
        .select({ id: branches.id, name: branches.name })
        .from(branches)
        .where(eq(branches.id, branchId))
        .limit(1);

      if (!branch) {
        return res.status(404).json({ error: "Şube bulunamadı" });
      }

      // Geçici dosya yolu
      const tmpDir = join(tmpdir(), "dospresso-templates");
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
      }
      const safeName = branch.name.replace(/[^a-zA-ZğüşıöçĞÜŞİÖÇ0-9]/g, "_");
      const outputPath = join(
        tmpDir,
        `dospresso-sube-veri-${branchId}-${safeName}-${Date.now()}.xlsx`
      );

      // Python script çalıştır
      await new Promise<void>((resolve, reject) => {
        const pythonScript = "scripts/branch-data-template/generate-template.py";
        const proc = spawn("python3", [
          pythonScript,
          "--branch-id",
          String(branchId),
          "--branch-name",
          branch.name,
          "--output",
          outputPath,
        ]);

        let stderr = "";
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Excel generator hata: ${stderr}`));
          }
        });
      });

      // Status'u "template_downloaded" yap
      await db
        .insert(branchDataCollectionStatus)
        .values({
          branchId,
          status: BRANCH_DATA_STATUS.TEMPLATE_DOWNLOADED,
          lastTemplateDownloadAt: new Date(),
        })
        .onConflictDoUpdate({
          target: branchDataCollectionStatus.branchId,
          set: {
            status: BRANCH_DATA_STATUS.TEMPLATE_DOWNLOADED,
            lastTemplateDownloadAt: new Date(),
            updatedAt: new Date(),
          },
        });

      // Dosyayı response'a yolla
      const fileBuffer = readFileSync(outputPath);
      const fileName = `dospresso-sube-veri-${safeName}.xlsx`;

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(fileName)}"`
      );
      res.setHeader("Content-Length", fileBuffer.length);
      res.send(fileBuffer);

      // Geçici dosyayı sil (background)
      setTimeout(() => {
        try {
          unlinkSync(outputPath);
        } catch (e) {
          // ignore
        }
      }, 5000);
    } catch (error: any) {
      console.error("[branch-data/template]", error);
      res.status(500).json({
        error: "Template oluşturulamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 2. POST /upload/:branchId — Excel yükle + parse
// ═══════════════════════════════════════════════════════════════════

router.post(
  "/api/cgo/branch-data/upload/:branchId",
  isAuthenticated,
  upload.single("file"),
  async (req: Request, res: Response) => {
    const startTime = Date.now();
    try {
      const userId = (req.user as any)?.id;
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ error: "Geçersiz şube ID" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "Excel dosyası eklenmemiş" });
      }

      // Yetki kontrolü
      const isCGO = isCgoOrAdmin(userRole);
      const canUploadOwnBranch = isBranchManager(userRole) && userBranchId === branchId;

      if (!isCGO && !canUploadOwnBranch) {
        return res.status(403).json({
          error:
            "Sadece CGO veya kendi şubenizin müdürü olarak yükleyebilirsiniz",
        });
      }

      // File hash
      const fileHash = createHash("sha256")
        .update(req.file.buffer)
        .digest("hex");

      // Duplicate kontrol (son 1 saat içinde aynı hash varsa)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const existingUpload = await db
        .select()
        .from(branchDataUploads)
        .where(
          and(
            eq(branchDataUploads.branchId, branchId),
            eq(branchDataUploads.fileHash, fileHash),
            sql`${branchDataUploads.createdAt} > ${oneHourAgo}`
          )
        )
        .limit(1);

      if (existingUpload.length > 0) {
        return res.status(409).json({
          error: "Bu dosya zaten son 1 saat içinde yüklendi",
          existingUploadId: existingUpload[0].id,
        });
      }

      // Geçici dosya kaydet
      const tmpDir = join(tmpdir(), "dospresso-uploads");
      if (!existsSync(tmpDir)) {
        mkdirSync(tmpDir, { recursive: true });
      }
      const tmpPath = join(tmpDir, `upload-${branchId}-${Date.now()}.xlsx`);
      require("fs").writeFileSync(tmpPath, req.file.buffer);

      // Upload kaydını oluştur (status: parsing)
      const [uploadRecord] = await db
        .insert(branchDataUploads)
        .values({
          branchId,
          uploadedById: userId,
          uploadedByRole: userRole,
          fileName: req.file.originalname,
          fileSizeBytes: req.file.size,
          fileHash,
          status: UPLOAD_STATUS.PARSING,
        })
        .returning();

      // Python parse script çalıştır
      const parseResult = await new Promise<any>((resolve, reject) => {
        const proc = spawn("python3", [
          "scripts/branch-data-template/parse-template.py",
          "--branch-id",
          String(branchId),
          "--input",
          tmpPath,
        ]);

        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (data) => {
          stdout += data.toString();
        });
        proc.stderr.on("data", (data) => {
          stderr += data.toString();
        });

        proc.on("close", (code) => {
          if (code === 0) {
            try {
              resolve(JSON.parse(stdout));
            } catch (e) {
              reject(new Error(`Parse JSON hata: ${e}`));
            }
          } else {
            reject(new Error(`Parse hata: ${stderr || stdout}`));
          }
        });
      });

      // DB'ye yaz
      let insertedPersonnel = 0;
      let updatedPersonnel = 0;
      let insertedEquipment = 0;
      let updatedEquipment = 0;

      // Personel kayıtları
      if (parseResult.personnel && Array.isArray(parseResult.personnel)) {
        for (const p of parseResult.personnel) {
          // TC ile mevcut user'ı bul
          if (p.tcNo) {
            const existing = await db
              .select({ id: users.id })
              .from(users)
              .where(eq(users.tcNo, p.tcNo))
              .limit(1);

            if (existing.length > 0) {
              // UPDATE (mevcut user'ı güncelle)
              await db
                .update(users)
                .set({
                  firstName: p.firstName,
                  lastName: p.lastName,
                  branchId,
                  // Diğer alanlar (varsa)
                })
                .where(eq(users.id, existing[0].id));
              updatedPersonnel++;
            } else {
              // INSERT (yeni user)
              const newId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
              await db.insert(users).values({
                id: newId,
                username: `${p.firstName?.toLowerCase()}${p.lastName?.toLowerCase()}`.replace(/[^a-z0-9]/g, ""),
                firstName: p.firstName,
                lastName: p.lastName,
                tcNo: p.tcNo,
                branchId,
                role: mapLevelToRole(p.level || ""),
                isActive: true,
                accountStatus: "active",
              } as any);
              insertedPersonnel++;
            }
          }
        }
      }

      // Ekipman kayıtları
      if (parseResult.equipment && Array.isArray(parseResult.equipment)) {
        for (const eq of parseResult.equipment) {
          if (!eq.equipmentType || !eq.count || eq.count === 0) continue;

          // Aynı tip + branch'taki mevcut ekipmanı bul
          const existing = await db
            .select({ id: equipment.id })
            .from(equipment)
            .where(
              and(
                eq(equipment.branchId, branchId),
                eq(equipment.equipmentType, eq.equipmentType)
              )
            )
            .limit(1);

          const metadata = (EQUIPMENT_METADATA as any)[eq.equipmentType] || {};

          if (existing.length > 0) {
            await db
              .update(equipment)
              .set({
                modelNo: eq.modelNo || null,
                serialNumber: eq.serialNumber || null,
                purchaseDate: eq.purchaseDate || null,
                warrantyEndDate: eq.warrantyEndDate || null,
                lastMaintenanceDate: eq.lastMaintenanceDate || null,
                nextMaintenanceDate: eq.nextMaintenanceDate || null,
                maintenanceIntervalDays: metadata.maintenanceInterval || 90,
                notes: eq.notes || null,
                updatedAt: new Date(),
              } as any)
              .where(eq(equipment.id, existing[0].id));
            updatedEquipment++;
          } else {
            await db.insert(equipment).values({
              branchId,
              equipmentType: eq.equipmentType,
              modelNo: eq.modelNo || null,
              serialNumber: eq.serialNumber || null,
              purchaseDate: eq.purchaseDate || null,
              warrantyEndDate: eq.warrantyEndDate || null,
              lastMaintenanceDate: eq.lastMaintenanceDate || null,
              nextMaintenanceDate: eq.nextMaintenanceDate || null,
              maintenanceIntervalDays: metadata.maintenanceInterval || 90,
              maintenanceResponsible: metadata.maintenanceResponsible || "branch",
              faultProtocol: metadata.faultProtocol || "branch",
              notes: eq.notes || null,
              isActive: true,
            } as any);
            insertedEquipment++;
          }
        }
      }

      // Upload kaydını güncelle
      const completedAt = new Date();
      const processingTimeMs = Date.now() - startTime;

      await db
        .update(branchDataUploads)
        .set({
          status: UPLOAD_STATUS.SUCCESS,
          parsedPersonnelCount: parseResult.personnel?.length || 0,
          parsedEquipmentCount: parseResult.equipment?.length || 0,
          insertedPersonnelCount: insertedPersonnel,
          updatedPersonnelCount: updatedPersonnel,
          insertedEquipmentCount: insertedEquipment,
          updatedEquipmentCount: updatedEquipment,
          validationWarnings: parseResult.warnings || null,
          processingTimeMs,
          completedAt,
          updatedAt: completedAt,
        })
        .where(eq(branchDataUploads.id, uploadRecord.id));

      // Status tablosunu güncelle
      const totalPersonnel = insertedPersonnel + updatedPersonnel;
      const totalEquipment = insertedEquipment + updatedEquipment;
      const completionPct = Math.min(
        100,
        Math.round(((totalPersonnel + totalEquipment) / 25) * 100) // basit heuristic
      );

      await db
        .insert(branchDataCollectionStatus)
        .values({
          branchId,
          status: BRANCH_DATA_STATUS.COMPLETED,
          totalPersonnel,
          totalEquipment,
          completionPercentage: completionPct,
          lastUploadAt: completedAt,
          lastUploadId: uploadRecord.id,
        })
        .onConflictDoUpdate({
          target: branchDataCollectionStatus.branchId,
          set: {
            status: BRANCH_DATA_STATUS.COMPLETED,
            totalPersonnel,
            totalEquipment,
            completionPercentage: completionPct,
            lastUploadAt: completedAt,
            lastUploadId: uploadRecord.id,
            updatedAt: completedAt,
          },
        });

      // Geçici dosyayı sil
      try {
        unlinkSync(tmpPath);
      } catch (e) {
        // ignore
      }

      res.json({
        success: true,
        uploadId: uploadRecord.id,
        summary: {
          personnel: { inserted: insertedPersonnel, updated: updatedPersonnel },
          equipment: { inserted: insertedEquipment, updated: updatedEquipment },
          totalPersonnel,
          totalEquipment,
          warnings: parseResult.warnings || [],
        },
        processingTimeMs,
      });
    } catch (error: any) {
      console.error("[branch-data/upload]", error);
      res.status(500).json({
        error: "Yükleme başarısız",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 3. GET /status — 25 şube durum tablosu (CGO için)
// ═══════════════════════════════════════════════════════════════════

router.get("/api/cgo/branch-data/status", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const userRole = (req.user as any)?.role || "";

    if (!isCgoOrAdmin(userRole)) {
      return res
        .status(403)
        .json({ error: "Sadece CGO/CEO/admin erişebilir" });
    }

    const result = await db
      .select({
        branchId: branches.id,
        branchName: branches.name,
        city: branches.city,
        managerName: branches.managerName,
        ownershipType: branches.ownershipType,
        isActive: branches.isActive,
        // Status bilgileri (left join)
        status: branchDataCollectionStatus.status,
        totalPersonnel: branchDataCollectionStatus.totalPersonnel,
        totalEquipment: branchDataCollectionStatus.totalEquipment,
        completionPercentage:
          branchDataCollectionStatus.completionPercentage,
        lastTemplateDownloadAt:
          branchDataCollectionStatus.lastTemplateDownloadAt,
        lastUploadAt: branchDataCollectionStatus.lastUploadAt,
        cgoNotes: branchDataCollectionStatus.cgoNotes,
      })
      .from(branches)
      .leftJoin(
        branchDataCollectionStatus,
        eq(branchDataCollectionStatus.branchId, branches.id)
      )
      .where(eq(branches.isActive, true))
      .orderBy(branches.id);

    // Özet istatistikler
    const total = result.length;
    const completed = result.filter(
      (r) => r.status === BRANCH_DATA_STATUS.COMPLETED
    ).length;
    const inProgress = result.filter(
      (r) =>
        r.status === BRANCH_DATA_STATUS.IN_PROGRESS ||
        r.status === BRANCH_DATA_STATUS.UPLOADED_PENDING_REVIEW
    ).length;
    const notStarted = result.filter(
      (r) =>
        !r.status || r.status === BRANCH_DATA_STATUS.NOT_STARTED
    ).length;

    res.json({
      summary: {
        total,
        completed,
        inProgress,
        notStarted,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      },
      branches: result.map((r) => ({
        ...r,
        status: r.status || BRANCH_DATA_STATUS.NOT_STARTED,
      })),
    });
  } catch (error: any) {
    console.error("[branch-data/status]", error);
    res.status(500).json({
      error: "Durum tablosu alınamadı",
      message: error.message,
    });
  }
});

// ═══════════════════════════════════════════════════════════════════
// 4. GET /my/data-status — Şube müdürü kendi şubesi
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/branch/my/data-status",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userBranchId = (req.user as any)?.branchId;

      if (!userBranchId) {
        return res
          .status(400)
          .json({ error: "Kullanıcı şubeye bağlı değil" });
      }

      const [status] = await db
        .select()
        .from(branchDataCollectionStatus)
        .where(eq(branchDataCollectionStatus.branchId, userBranchId))
        .limit(1);

      const [branch] = await db
        .select({ name: branches.name, id: branches.id })
        .from(branches)
        .where(eq(branches.id, userBranchId))
        .limit(1);

      res.json({
        branch,
        status: status || {
          branchId: userBranchId,
          status: BRANCH_DATA_STATUS.NOT_STARTED,
          totalPersonnel: 0,
          totalEquipment: 0,
          completionPercentage: 0,
        },
      });
    } catch (error: any) {
      console.error("[branch-data/my/data-status]", error);
      res.status(500).json({
        error: "Durum alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// 5. GET /history/:branchId — Upload geçmişi
// ═══════════════════════════════════════════════════════════════════

router.get(
  "/api/cgo/branch-data/history/:branchId",
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const userRole = (req.user as any)?.role || "";
      const userBranchId = (req.user as any)?.branchId;
      const branchId = parseInt(req.params.branchId);

      if (isNaN(branchId)) {
        return res.status(400).json({ error: "Geçersiz şube ID" });
      }

      const isCGO = isCgoOrAdmin(userRole);
      const isOwnBranch = userBranchId === branchId;

      if (!isCGO && !isOwnBranch) {
        return res.status(403).json({ error: "Yetkisiz" });
      }

      const history = await db
        .select({
          id: branchDataUploads.id,
          uploadedByRole: branchDataUploads.uploadedByRole,
          fileName: branchDataUploads.fileName,
          fileSizeBytes: branchDataUploads.fileSizeBytes,
          status: branchDataUploads.status,
          parsedPersonnelCount: branchDataUploads.parsedPersonnelCount,
          parsedEquipmentCount: branchDataUploads.parsedEquipmentCount,
          insertedPersonnelCount: branchDataUploads.insertedPersonnelCount,
          updatedPersonnelCount: branchDataUploads.updatedPersonnelCount,
          insertedEquipmentCount: branchDataUploads.insertedEquipmentCount,
          updatedEquipmentCount: branchDataUploads.updatedEquipmentCount,
          processingTimeMs: branchDataUploads.processingTimeMs,
          createdAt: branchDataUploads.createdAt,
          completedAt: branchDataUploads.completedAt,
          uploadedByName: sql<string>`COALESCE(${users.firstName} || ' ' || ${users.lastName}, ${users.username})`,
        })
        .from(branchDataUploads)
        .leftJoin(users, eq(branchDataUploads.uploadedById, users.id))
        .where(eq(branchDataUploads.branchId, branchId))
        .orderBy(desc(branchDataUploads.createdAt))
        .limit(50);

      res.json({ history });
    } catch (error: any) {
      console.error("[branch-data/history]", error);
      res.status(500).json({
        error: "Geçmiş alınamadı",
        message: error.message,
      });
    }
  }
);

// ═══════════════════════════════════════════════════════════════════
// Yardımcı: Excel'deki Türkçe seviye → DB role
// ═══════════════════════════════════════════════════════════════════

function mapLevelToRole(level: string): string {
  const map: Record<string, string> = {
    Stajyer: "stajyer",
    "Bar Buddy": "bar_buddy",
    Barista: "barista",
    "Supervisor Buddy": "supervisor_buddy",
    Supervisor: "supervisor",
    Müdür: "mudur",
    Partner: "owner",
  };
  return map[level] || "barista"; // default
}

export default router;
