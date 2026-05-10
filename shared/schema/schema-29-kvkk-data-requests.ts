/**
 * Schema 29 — KVKK m.11 Veri Sahibi Talep Sistemi
 *
 * AMAÇ:
 * KVKK m.11 gereği veri sahibinin (çalışan) haklarını talep etmesi:
 *   a. İşlenip işlenmediği bilgisi
 *   b. İşleniyorsa bilgi talep etme
 *   c. İşlenme amacını öğrenme
 *   d. Düzeltme talebi
 *   e. Silme/yok edilme talebi
 *   f. 3. kişilere bildirilmesini isteme
 *   g. Otomatik analize itiraz
 *   h. Zarara uğradı ise tazminat talep
 *
 * Sistem 30 gün içinde yanıt vermek zorunda (KVKK m.13).
 *
 * Aslan 10 May 2026 — KVKK eksikleri kapatma.
 */

import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { users } from "./schema-02";

export const KVKK_REQUEST_TYPES = {
  INFO: "info", // a, b, c — bilgi
  CORRECTION: "correction", // d — düzeltme
  DELETION: "deletion", // e — silme/yok etme
  NOTIFICATION: "notification", // f — 3. kişilere bildirim
  OBJECTION: "objection", // g — otomatik analize itiraz
  COMPENSATION: "compensation", // h — tazminat
} as const;

export type KvkkRequestType =
  (typeof KVKK_REQUEST_TYPES)[keyof typeof KVKK_REQUEST_TYPES];

export const KVKK_REQUEST_STATUS = {
  RECEIVED: "received", // Yeni gelen
  IN_REVIEW: "in_review", // İncelemede (DPO/IK)
  ADDITIONAL_INFO: "additional_info", // Ek bilgi istendi
  APPROVED: "approved", // Talep kabul edildi (işlem yapılıyor)
  COMPLETED: "completed", // İşlem tamamlandı
  REJECTED: "rejected", // Reddedildi (yasal sebep)
  PARTIAL: "partial", // Kısmen yerine getirildi
} as const;

export type KvkkRequestStatus =
  (typeof KVKK_REQUEST_STATUS)[keyof typeof KVKK_REQUEST_STATUS];

// ═══════════════════════════════════════════════════════════════════
// kvkk_data_subject_requests — KVKK m.11 talepleri
// ═══════════════════════════════════════════════════════════════════

export const kvkkDataSubjectRequests = pgTable(
  "kvkk_data_subject_requests",
  {
    id: serial("id").primaryKey(),

    // Talep eden kişi
    requesterUserId: varchar("requester_user_id", { length: 50 }).references(
      () => users.id
    ),
    // Çalışan olabilir, dışarıdan üçüncü kişi de (eski çalışan, müşteri)
    requesterName: varchar("requester_name", { length: 200 }).notNull(),
    requesterEmail: varchar("requester_email", { length: 255 }),
    requesterPhone: varchar("requester_phone", { length: 50 }),
    requesterTcNo: varchar("requester_tc_no", { length: 11 }),
    // TC ile kimlik doğrulama yasal gerek

    // Talep türü ve içerik
    requestType: varchar("request_type", { length: 30 }).notNull(),
    requestDescription: text("request_description").notNull(),
    // Detaylı açıklama (örn: 'shift_attendance tablomda 2025-12-01 kaydı yanlış, düzeltilsin')

    // Hangi veri türü hakkında
    dataCategory: varchar("data_category", { length: 100 }),
    // 'payroll', 'pdks', 'kvkk_approval', 'warnings', 'kişisel_bilgi', vs.

    // Durum
    status: varchar("status", { length: 30 })
      .notNull()
      .default("received"),

    // Yasal yanıt süresi (KVKK m.13: 30 gün)
    receivedAt: timestamp("received_at").notNull().defaultNow(),
    deadline: timestamp("deadline").notNull(),
    // Otomatik hesap: receivedAt + 30 gün

    // İnceleme
    assignedToUserId: varchar("assigned_to_user_id", {
      length: 50,
    }).references(() => users.id),
    // DPO / IK / muhasebe_ik

    reviewStartedAt: timestamp("review_started_at"),
    reviewNotes: text("review_notes"),

    // Yanıt
    respondedAt: timestamp("responded_at"),
    responseText: text("response_text"),
    responseMethod: varchar("response_method", { length: 30 }),
    // 'email', 'kvkk_app_message', 'physical_letter'

    // Kabul/Red gerekçesi
    decisionReason: text("decision_reason"),
    // 'KVKK m.28 istisna', 'iş süreci tamamlandı', vs.

    // İşlem detayı (silme yapıldı, ne silindi)
    actionsTaken: text("actions_taken"),

    // Audit
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => ({
    requesterIdx: index("kvkk_requests_requester_idx").on(table.requesterUserId),
    statusIdx: index("kvkk_requests_status_idx").on(table.status),
    deadlineIdx: index("kvkk_requests_deadline_idx").on(table.deadline),
    typeIdx: index("kvkk_requests_type_idx").on(table.requestType),
  })
);

export const insertKvkkDataSubjectRequestSchema = createInsertSchema(
  kvkkDataSubjectRequests
).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type KvkkDataSubjectRequest = typeof kvkkDataSubjectRequests.$inferSelect;
export type InsertKvkkDataSubjectRequest =
  typeof kvkkDataSubjectRequests.$inferInsert;
