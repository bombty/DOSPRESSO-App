// ═══════════════════════════════════════════════════════════════════
// schema-25-score-parameters.ts (Sprint 8 - 5 May 2026)
// 
// SKOR PARAMETRELERİ — Personel performans hesaplamasının
// admin tarafından düzenlenebilir kriter ve ağırlıkları.
// 
// Aslan'ın talebi (5 May 2026 20:00):
//   "skor kriterleri neler net belirlenmeli. icabında admin tarafından
//   güncellenebilir olmalı kriterler ve verilen ağırlıklar."
// 
// Mevcut hardcoded ağırlıklar (my-performance.tsx'te):
//   - Devam: 20 puan
//   - Checklist: 20 puan
//   - Görevler: 15 puan
//   - Müşteri: 15 puan
//   - Yönetici: 20 puan
//   - Toplam: 90 puan
// 
// Bu schema ile bu değerler DB'ye taşınır, /admin/skor-parametreleri
// sayfasından ayarlanır. Versiyon kayıtlı tutulur (audit trail).
// ═══════════════════════════════════════════════════════════════════

import { pgTable, serial, varchar, integer, numeric, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";

// ═══════════════════════════════════════════════════════════════════
// 1. SCORE_PARAMETERS — Skor kriterleri
// ═══════════════════════════════════════════════════════════════════
// Her kriter ayrı satır. is_active=true olan satırlar skoru hesaplar.
// Yeni versiyonlarda eski kriterler is_active=false yapılır (audit).
// ═══════════════════════════════════════════════════════════════════

export const scoreParameters = pgTable("score_parameters", {
  id: serial("id").primaryKey(),
  
  // Kategori
  category: varchar("category", { length: 50 }).notNull(), // 'devam', 'checklist', 'gorev', 'musteri', 'yonetici'
  
  // Görüntüleme adı
  displayName: varchar("display_name", { length: 100 }).notNull(), // "Devam ve Mesai"
  description: text("description"), // "Aylık ortalama PDKS uyumu"
  
  // Ağırlık (toplam puana etkisi)
  maxPoints: integer("max_points").notNull(), // 20, 15 vb.
  weight: numeric("weight", { precision: 5, scale: 2 }).default("1.0"), // 1.0 = normal, 2.0 = iki kat
  
  // Hesaplama formülü
  formula: text("formula"), // human-readable: "PDKS uyum oranı × 20"
  formulaCode: varchar("formula_code", { length: 50 }), // 'pdks_compliance', 'task_completion', vb.
  
  // Min/max sınır
  minThreshold: integer("min_threshold").default(0),
  maxThreshold: integer("max_threshold").default(100),
  
  // Versiyon
  version: integer("version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  effectiveFrom: timestamp("effective_from").defaultNow(),
  effectiveTo: timestamp("effective_to"),
  
  // Sıralama (UI'da)
  sortOrder: integer("sort_order").default(0),
  
  // Hangi rollere uygulanır (null = hepsine)
  applicableRoles: text("applicable_roles"), // CSV: "barista,bar_buddy,supervisor"
  
  // Audit
  createdById: varchar("created_by_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertScoreParameterSchema = createInsertSchema(scoreParameters).omit({
  id: true, createdAt: true, updatedAt: true, version: true,
});
export type InsertScoreParameter = z.infer<typeof insertScoreParameterSchema>;
export type ScoreParameter = typeof scoreParameters.$inferSelect;

// ═══════════════════════════════════════════════════════════════════
// 2. SCORE_PARAMETER_HISTORY — Değişiklik geçmişi (audit)
// ═══════════════════════════════════════════════════════════════════

export const scoreParameterHistory = pgTable("score_parameter_history", {
  id: serial("id").primaryKey(),
  parameterId: integer("parameter_id").references(() => scoreParameters.id, { onDelete: "cascade" }),
  
  changeType: varchar("change_type", { length: 20 }), // 'create', 'update', 'deactivate'
  oldValues: text("old_values"), // JSON
  newValues: text("new_values"), // JSON
  reason: text("reason"),
  
  changedById: varchar("changed_by_id").references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow(),
});

export type ScoreParameterHistory = typeof scoreParameterHistory.$inferSelect;
