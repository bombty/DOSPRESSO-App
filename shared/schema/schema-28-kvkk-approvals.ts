/**
 * Schema 28 — KVKK Per-User Onay Sistemi
 *
 * AMAÇ:
 * Mevcut KVKK aydınlatma localStorage tabanlı (cihaza özel).
 * Aslan 10 May 2026: "Her personelin kendi sayfasında olması gerekmiyor mu?"
 *
 * Bu schema kullanıcı bazlı KVKK onayı tutar:
 * - PIN ile giriş yapan kullanıcı ilk kullanımda onaylar
 * - DB'de kayıt altına alınır (audit trail)
 * - Yeni KVKK versiyonu çıkınca tüm kullanıcılar yeniden onaylar
 * - Yasal denetimde "kim ne zaman onayladı" belli olur
 *
 * Aslan 10 May 2026 talebi.
 */

import {
  pgTable,
  serial,
  varchar,
  timestamp,
  text,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { users } from "./schema-02";

// ═══════════════════════════════════════════════════════════════════
// kvkk_policy_versions — Yayınlanan KVKK metinleri
// ═══════════════════════════════════════════════════════════════════
//
// Her yeni KVKK versiyonu yayınlandığında bu tabloda kayıt olur.
// Eski versiyonlar `is_active=false` yapılır, yeni versiyon `is_active=true`.
// Tüm kullanıcıların yeniden onaylaması gerekir.

export const kvkkPolicyVersions = pgTable(
  "kvkk_policy_versions",
  {
    id: serial("id").primaryKey(),
    version: varchar("version", { length: 20 }).notNull().unique(),
    // "1.0", "1.1", "2.0"

    // Metin (Markdown)
    contentMarkdown: text("content_markdown").notNull(),
    title: varchar("title", { length: 255 }).notNull(),

    // Yasal referanslar
    legalBasis: text("legal_basis"),
    // "6698 sayılı KVKK + Aydınlatma Yükümlülüğü Tebliği"

    publishedAt: timestamp("published_at").notNull(),
    effectiveFrom: timestamp("effective_from").notNull(),

    // Durum
    isActive: boolean("is_active").default(false).notNull(),
    // Sadece 1 versiyon active olabilir (uygulama düzeyinde kontrol)

    createdBy: varchar("created_by", { length: 50 }).references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    activeIdx: index("kvkk_policy_active_idx").on(table.isActive),
    versionIdx: index("kvkk_policy_version_idx").on(table.version),
  })
);

// ═══════════════════════════════════════════════════════════════════
// user_kvkk_approvals — Kullanıcı KVKK onayları
// ═══════════════════════════════════════════════════════════════════

export const userKvkkApprovals = pgTable(
  "user_kvkk_approvals",
  {
    id: serial("id").primaryKey(),

    userId: varchar("user_id", { length: 50 })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    policyVersionId: serial("policy_version_id").notNull(),
    // FK constraint runtime'da check edilecek

    policyVersion: varchar("policy_version", { length: 20 }).notNull(),
    // Snapshot — version değişse bile burada hangi versiyonu onayladığı kalır

    // Onay bilgileri
    approvedAt: timestamp("approved_at").notNull().defaultNow(),

    // Audit trail
    ipAddress: varchar("ip_address", { length: 45 }),
    // IPv4 veya IPv6
    userAgent: text("user_agent"),

    approvalMethod: varchar("approval_method", { length: 30 }).notNull(),
    // "kiosk_pin", "mobile_app", "web_dashboard"

    // Hangi cihazdan / şubeden
    branchId: varchar("branch_id", { length: 20 }),
    deviceFingerprint: varchar("device_fingerprint", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index("user_kvkk_approvals_user_idx").on(table.userId),
    versionIdx: index("user_kvkk_approvals_version_idx").on(
      table.policyVersion
    ),
    approvedAtIdx: index("user_kvkk_approvals_approved_idx").on(
      table.approvedAt
    ),
  })
);

// ═══════════════════════════════════════════════════════════════════
// Insert schemas
// ═══════════════════════════════════════════════════════════════════

export const insertKvkkPolicyVersionSchema = createInsertSchema(
  kvkkPolicyVersions
).omit({
  id: true,
  createdAt: true,
});

export const insertUserKvkkApprovalSchema = createInsertSchema(
  userKvkkApprovals
).omit({
  id: true,
  createdAt: true,
});

// ═══════════════════════════════════════════════════════════════════
// TypeScript types
// ═══════════════════════════════════════════════════════════════════

export type KvkkPolicyVersion = typeof kvkkPolicyVersions.$inferSelect;
export type InsertKvkkPolicyVersion = typeof kvkkPolicyVersions.$inferInsert;

export type UserKvkkApproval = typeof userKvkkApprovals.$inferSelect;
export type InsertUserKvkkApproval = typeof userKvkkApprovals.$inferInsert;

export const KVKK_APPROVAL_METHODS = {
  KIOSK_PIN: "kiosk_pin",
  MOBILE_APP: "mobile_app",
  WEB_DASHBOARD: "web_dashboard",
} as const;

export type KvkkApprovalMethod =
  (typeof KVKK_APPROVAL_METHODS)[keyof typeof KVKK_APPROVAL_METHODS];
