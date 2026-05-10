/**
 * Schema 27 — Şube Veri Toplama Sistemi
 *
 * AMAÇ: CGO'nun 25 şubeden personel + ekipman bilgilerini Excel ile
 * toplayabilmesi için upload geçmişi + durum takibi.
 *
 * AKIŞ:
 * 1. CGO sayfasında 25 şube listelenir
 * 2. CGO her şube için "Excel Template İndir" → boş Excel
 * 3. Şube müdürüne gönder (WhatsApp/email)
 * 4. Şube müdürü doldurur (personel + ekipman)
 * 5. Şube müdürü kendi yükler VEYA CGO'ya gönderir, CGO yükler
 * 6. Sistem Excel'i parse eder → users + equipment tablolarına yazar
 * 7. Geçmiş bu tabloda saklanır
 *
 * Aslan 10 May 2026 talebi.
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  timestamp,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { branches, users } from "./schema-02";

// ═══════════════════════════════════════════════════════════════════
// branch_data_uploads — Excel yükleme kayıtları
// ═══════════════════════════════════════════════════════════════════

export const branchDataUploads = pgTable(
  "branch_data_uploads",
  {
    id: serial("id").primaryKey(),

    // Şube bağlantısı
    branchId: integer("branch_id")
      .notNull()
      .references(() => branches.id, { onDelete: "cascade" }),

    // Yükleyen kullanıcı (CGO veya şube müdürü)
    uploadedById: varchar("uploaded_by_id", { length: 50 })
      .notNull()
      .references(() => users.id),

    uploadedByRole: varchar("uploaded_by_role", { length: 50 }).notNull(),
    // "cgo", "branch_manager", "owner" (Partner)

    // Dosya bilgileri
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSizeBytes: integer("file_size_bytes"),
    fileHash: varchar("file_hash", { length: 64 }),
    // SHA256 — duplicate upload detection için

    // Parse sonuçları
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    // "pending", "parsing", "validating", "success", "partial", "failed"

    parsedPersonnelCount: integer("parsed_personnel_count").default(0),
    parsedEquipmentCount: integer("parsed_equipment_count").default(0),

    insertedPersonnelCount: integer("inserted_personnel_count").default(0),
    updatedPersonnelCount: integer("updated_personnel_count").default(0),
    skippedPersonnelCount: integer("skipped_personnel_count").default(0),

    insertedEquipmentCount: integer("inserted_equipment_count").default(0),
    updatedEquipmentCount: integer("updated_equipment_count").default(0),
    skippedEquipmentCount: integer("skipped_equipment_count").default(0),

    // Validation sonuçları (JSONB)
    validationWarnings: jsonb("validation_warnings"),
    /* Format:
       {
         personnel: [
           { row: 5, field: "tc_no", error: "11 hane olmalı" },
           { row: 8, field: "iban", error: "TR ile başlamalı" },
         ],
         equipment: [
           { row: 3, field: "model_no", error: "Eksik" },
         ]
       }
    */

    parseErrors: jsonb("parse_errors"),
    // Critical errors (parse failed, file corrupted, etc.)

    // Süreç bilgileri
    processingTimeMs: integer("processing_time_ms"),
    completedAt: timestamp("completed_at"),

    // Notlar
    notes: text("notes"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    branchIdx: index("branch_data_uploads_branch_idx").on(table.branchId),
    statusIdx: index("branch_data_uploads_status_idx").on(table.status),
    createdAtIdx: index("branch_data_uploads_created_idx").on(table.createdAt),
  })
);

// ═══════════════════════════════════════════════════════════════════
// branch_data_collection_status — Her şubenin son durumu
// ═══════════════════════════════════════════════════════════════════
//
// Bu tablo `branch_data_uploads`'ın bir özeti — her şube için sadece
// 1 kayıt vardır. CGO sayfasında hızlı listeleme için kullanılır.
// branch_data_uploads'tan trigger veya manuel update edilir.

export const branchDataCollectionStatus = pgTable(
  "branch_data_collection_status",
  {
    branchId: integer("branch_id")
      .primaryKey()
      .references(() => branches.id, { onDelete: "cascade" }),

    // Genel durum
    status: varchar("status", { length: 20 }).notNull().default("not_started"),
    // "not_started" — Hiç template indirilmedi
    // "template_downloaded" — Template indirildi ama yüklenmedi
    // "in_progress" — Şube müdürü dolduruyor (heuristic)
    // "uploaded_pending_review" — Yüklendi, CGO inceliyor
    // "completed" — Tamamlandı, veriler aktif
    // "outdated" — Eski (tekrar güncellenmesi gerekiyor)

    // Veri sayıları
    totalPersonnel: integer("total_personnel").default(0),
    totalEquipment: integer("total_equipment").default(0),

    completionPercentage: integer("completion_percentage").default(0),
    // 0-100 — eksik bilgi varsa daha düşük

    // Son aktivite
    lastTemplateDownloadAt: timestamp("last_template_download_at"),
    lastUploadAt: timestamp("last_upload_at"),
    lastUploadId: integer("last_upload_id").references(
      () => branchDataUploads.id
    ),

    // Sonraki güncelleme tarihi (otomatik hatırlatma için)
    nextReviewDate: timestamp("next_review_date"),

    // CGO notları
    cgoNotes: text("cgo_notes"),

    // Branch manager notları (eksik bilgiler vs)
    managerNotes: text("manager_notes"),

    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("branch_data_status_status_idx").on(table.status),
  })
);

// ═══════════════════════════════════════════════════════════════════
// Insert schemas (Zod)
// ═══════════════════════════════════════════════════════════════════

export const insertBranchDataUploadSchema = createInsertSchema(
  branchDataUploads
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertBranchDataCollectionStatusSchema = createInsertSchema(
  branchDataCollectionStatus
).omit({
  updatedAt: true,
});

// ═══════════════════════════════════════════════════════════════════
// TypeScript types
// ═══════════════════════════════════════════════════════════════════

export type BranchDataUpload = typeof branchDataUploads.$inferSelect;
export type InsertBranchDataUpload = typeof branchDataUploads.$inferInsert;

export type BranchDataCollectionStatus =
  typeof branchDataCollectionStatus.$inferSelect;
export type InsertBranchDataCollectionStatus =
  typeof branchDataCollectionStatus.$inferInsert;

// Status enum için yardımcı tip
export const BRANCH_DATA_STATUS = {
  NOT_STARTED: "not_started",
  TEMPLATE_DOWNLOADED: "template_downloaded",
  IN_PROGRESS: "in_progress",
  UPLOADED_PENDING_REVIEW: "uploaded_pending_review",
  COMPLETED: "completed",
  OUTDATED: "outdated",
} as const;

export type BranchDataStatus =
  (typeof BRANCH_DATA_STATUS)[keyof typeof BRANCH_DATA_STATUS];

// Upload status enum
export const UPLOAD_STATUS = {
  PENDING: "pending",
  PARSING: "parsing",
  VALIDATING: "validating",
  SUCCESS: "success",
  PARTIAL: "partial",
  FAILED: "failed",
} as const;

export type UploadStatus = (typeof UPLOAD_STATUS)[keyof typeof UPLOAD_STATUS];
