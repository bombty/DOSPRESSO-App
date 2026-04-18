import { sql } from "drizzle-orm";
import { 
  pgTable, 
  text, 
  varchar, 
  timestamp,
  date,
  time,
  jsonb,
  index,
  serial,
  boolean,
  integer,
  numeric,
  real,
  customType,
  uniqueIndex,
  unique,
  check,
  pgEnum
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Custom type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return JSON.stringify(value);
  },
  fromDriver(value: string): number[] {
    return JSON.parse(value);
  },
});

// Session storage table (required for Replit Auth)

import { branches, users } from './schema-02';
import { shiftAttendance } from './schema-03';
import { permissions } from './schema-04';

// ========================================
// ROLE TEMPLATES - Rol Şablonları
// ========================================

export const roleTemplates = pgTable("role_templates", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  displayName: varchar("display_name", { length: 100 }).notNull(),
  description: text("description"),
  
  domain: varchar("domain", { length: 30 }).notNull(), // hq, factory, branch
  baseRole: varchar("base_role", { length: 50 }).notNull(), // admin, supervisor, barista, etc.
  
  permissions: jsonb("permissions").notNull().default({}), // { moduleKey: ['view', 'edit'] }
  
  isDefault: boolean("is_default").default(false),
  isSystem: boolean("is_system").notNull().default(false),
  isDeletable: boolean("is_deletable").notNull().default(true),
  isActive: boolean("is_active").default(true),
  
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("role_templates_domain_idx").on(table.domain),
  index("role_templates_base_role_idx").on(table.baseRole),
]);

export const insertRoleTemplateSchema = createInsertSchema(roleTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRoleTemplate = z.infer<typeof insertRoleTemplateSchema>;
export type RoleTemplate = typeof roleTemplates.$inferSelect;

// ========================================
// FACTORY PRODUCTION - Fabrika Üretim Modülü
// ========================================

// Ürün Kategorileri
export const ProductionCategory = {
  DONUT: 'donut',
  CINNABOOM: 'cinnaboom',
  QUESADILLA: 'quesadilla',
  MAMABON: 'mamabon',
  COOKIE: 'cookie',
  CAKE: 'cake',
  CHEESECAKE: 'cheesecake',
  BROWNIE: 'brownie',
  KRUVASAN: 'kruvasan',
  SIRUP: 'sirup',
  SOS: 'sos',
  DIGER: 'diger',
} as const;

export type ProductionCategoryType = typeof ProductionCategory[keyof typeof ProductionCategory];

// Fabrika Ürünleri
export const factoryProducts = pgTable("factory_products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 50 }).notNull().unique(),
  category: varchar("category", { length: 50 }).notNull(),
  subCategory: varchar("sub_category", { length: 100 }),
  unit: varchar("unit", { length: 20 }).notNull(), // kg, lt, adet
  unitPrice: integer("unit_price").default(0), // Kuruş cinsinden
  minStock: integer("min_stock").default(0),
  currentStock: integer("current_stock").default(0),
  maxStockLevel: integer("max_stock_level").default(0),
  description: text("description"),
  isActive: boolean("is_active").default(true),
  
  // Maliyet hesaplama sütunları
  packageQuantity: integer("package_quantity").default(1),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).default("0"),
  suggestedPrice: numeric("suggested_price", { precision: 12, scale: 2 }).default("0"),
  currentSellingPrice: numeric("current_selling_price", { precision: 12, scale: 2 }).default("0"),
  profitMargin: numeric("profit_margin", { precision: 5, scale: 2 }).default("1.01"),
  isTemporarilyStopped: boolean("is_temporarily_stopped").default(false),
  isNewProduct: boolean("is_new_product").default(false),
  
  requiresFoodEngineerApproval: boolean("requires_food_engineer_approval").default(false),
  allergens: text("allergens").array(),
  
  productType: varchar("product_type", { length: 20 }).default("mamul"),
  parentProductId: integer("parent_product_id").references(() => factoryProducts.id, { onDelete: "set null" }),
  conversionRatio: numeric("conversion_ratio", { precision: 10, scale: 4 }).default("1"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_products_category_idx").on(table.category),
  index("factory_products_sku_idx").on(table.sku),
]);

export const insertFactoryProductSchema = createInsertSchema(factoryProducts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryProduct = z.infer<typeof insertFactoryProductSchema>;
export type FactoryProduct = typeof factoryProducts.$inferSelect;

// Fabrika Ürünleri Fiyat Geçmişi
// basePrice / suggestedPrice değişikliklerinin denetim ve trend analizi için saklandığı tablo.
export const factoryProductPriceHistory = pgTable("factory_product_price_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),

  oldBasePrice: numeric("old_base_price", { precision: 12, scale: 2 }),
  newBasePrice: numeric("new_base_price", { precision: 12, scale: 2 }),
  oldSuggestedPrice: numeric("old_suggested_price", { precision: 12, scale: 2 }),
  newSuggestedPrice: numeric("new_suggested_price", { precision: 12, scale: 2 }),
  changePercent: numeric("change_percent", { precision: 8, scale: 2 }),

  // Kaynak: "recipe_recalc" | "manual" | "import" | "script" | "cost_calc" vb.
  source: varchar("source", { length: 30 }).notNull(),
  sourceReferenceId: integer("source_reference_id"),
  notes: text("notes"),

  changedById: varchar("changed_by_id").references(() => users.id, { onDelete: "set null" }),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (table) => [
  index("fpph_product_idx").on(table.productId),
  index("fpph_source_idx").on(table.source),
  index("fpph_date_idx").on(table.changedAt),
  index("fpph_product_date_idx").on(table.productId, table.changedAt),
]);

export const insertFactoryProductPriceHistorySchema = createInsertSchema(factoryProductPriceHistory).omit({
  id: true,
  changedAt: true,
});

export type InsertFactoryProductPriceHistory = z.infer<typeof insertFactoryProductPriceHistorySchema>;
export type FactoryProductPriceHistory = typeof factoryProductPriceHistory.$inferSelect;

// Üretim Partileri
export const productionBatches = pgTable("production_batches", {
  id: serial("id").primaryKey(),
  batchNumber: varchar("batch_number", { length: 50 }).notNull().unique(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  
  quantity: integer("quantity").notNull(),
  unit: varchar("unit", { length: 20 }).notNull(),
  
  productionDate: date("production_date").notNull(),
  expiryDate: date("expiry_date"),
  
  status: varchar("status", { length: 30 }).notNull().default("planned"), // planned, in_progress, completed, quality_check, approved, rejected
  qualityScore: integer("quality_score"), // 0-100
  qualityNotes: text("quality_notes"),
  
  producedById: varchar("produced_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("production_batches_product_idx").on(table.productId),
  index("production_batches_status_idx").on(table.status),
  index("production_batches_date_idx").on(table.productionDate),
]);

export const insertProductionBatchSchema = createInsertSchema(productionBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertProductionBatch = z.infer<typeof insertProductionBatchSchema>;
export type ProductionBatch = typeof productionBatches.$inferSelect;

// Şube Sipariş Talepleri
export const branchOrders = pgTable("branch_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  status: varchar("status", { length: 30 }).notNull().default("pending"),
  priority: varchar("priority", { length: 20 }).default("normal"),
  
  requestedById: varchar("requested_by_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  processedById: varchar("processed_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedById: varchar("approved_by_id").references(() => users.id, { onDelete: "set null" }),
  approvedAt: timestamp("approved_at"),
  shipmentId: integer("shipment_id"),
  
  requestedDeliveryDate: date("requested_delivery_date"),
  actualDeliveryDate: date("actual_delivery_date"),
  
  totalAmount: integer("total_amount").default(0),
  notes: text("notes"),
  rejectionReason: text("rejection_reason"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("branch_orders_branch_idx").on(table.branchId),
  index("branch_orders_status_idx").on(table.status),
  index("branch_orders_date_idx").on(table.createdAt),
]);

export const insertBranchOrderSchema = createInsertSchema(branchOrders).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchOrder = z.infer<typeof insertBranchOrderSchema>;
export type BranchOrder = typeof branchOrders.$inferSelect;

// Sipariş Kalemleri
export const branchOrderItems = pgTable("branch_order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => branchOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  
  quantity: integer("quantity").notNull(),
  approvedQuantity: integer("approved_quantity"),
  unit: varchar("unit", { length: 20 }).default("adet"),
  unitPrice: integer("unit_price").notNull(),
  totalPrice: integer("total_price").notNull(),
  
  deliveredQuantity: integer("delivered_quantity").default(0),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  
  notes: text("notes"),
}, (table) => [
  index("branch_order_items_order_idx").on(table.orderId),
  index("branch_order_items_product_idx").on(table.productId),
]);

export const insertBranchOrderItemSchema = createInsertSchema(branchOrderItems).omit({
  id: true,
});

export type InsertBranchOrderItem = z.infer<typeof insertBranchOrderItemSchema>;
export type BranchOrderItem = typeof branchOrderItems.$inferSelect;

// Fabrika Stok
export const factoryInventory = pgTable("factory_inventory", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  batchId: integer("batch_id").references(() => productionBatches.id, { onDelete: "set null" }),
  
  quantity: integer("quantity").notNull().default(0),
  reservedQuantity: integer("reserved_quantity").default(0), // Siparişler için ayrılan
  
  lastUpdatedById: varchar("last_updated_by_id").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_inventory_product_idx").on(table.productId),
  unique("factory_inventory_product_batch_unique").on(table.productId, table.batchId),
]);

export const insertFactoryInventorySchema = createInsertSchema(factoryInventory).omit({
  id: true,
  updatedAt: true,
});

export type InsertFactoryInventory = z.infer<typeof insertFactoryInventorySchema>;
export type FactoryInventory = typeof factoryInventory.$inferSelect;

// ========================================
// FABRIKA KIOSK SISTEMI
// ========================================

// Fabrika Üretim İstasyonları
export const factoryStations = pgTable("factory_stations", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // Donut Hamur Hattı, Konsantre Dolum, Cheesecake, Mamabon, Wrapitos, Cookies, Donut Süsleme, Donut Paketleme, Cinnaboom
  code: varchar("code", { length: 20 }).notNull().unique(), // DONUT_HAMUR, KONSANTRE, CHEESECAKE, etc.
  description: text("description"),
  category: varchar("category", { length: 50 }), // hamur, dolum, susleme, paketleme
  productTypeId: integer("product_type_id").references(() => factoryProducts.id, { onDelete: "set null" }), // Hangi ürünü üretir
  targetHourlyOutput: integer("target_hourly_output").default(0), // Saatlik hedef üretim
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFactoryStationSchema = createInsertSchema(factoryStations).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryStation = z.infer<typeof insertFactoryStationSchema>;
export type FactoryStation = typeof factoryStations.$inferSelect;

// Fabrika Personeli PIN Kodları (kiosk girişi için)
export const factoryStaffPins = pgTable("factory_staff_pins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hashedPin: varchar("hashed_pin", { length: 255 }).notNull(), // Bcrypt hash
  pinFailedAttempts: integer("pin_failed_attempts").default(0),
  pinLockedUntil: timestamp("pin_locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("factory_staff_pins_user_unique").on(table.userId),
]);

export const insertFactoryStaffPinSchema = createInsertSchema(factoryStaffPins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryStaffPin = z.infer<typeof insertFactoryStaffPinSchema>;
export type FactoryStaffPin = typeof factoryStaffPins.$inferSelect;

// Fabrika Vardiya Oturumları (kiosk giriş/çıkış)
export const factoryShiftSessions = pgTable("factory_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "restrict" }),
  
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  // Üretim özeti
  totalProduced: integer("total_produced").default(0),
  totalWaste: integer("total_waste").default(0),
  
  // Çalışma süresi (dakika)
  workMinutes: integer("work_minutes").default(0),
  
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, completed, abandoned
  
  phase: varchar("phase", { length: 20 }).default("hazirlik"), // hazirlik, uretim, temizlik, tamamlandi
  prepStartedAt: timestamp("prep_started_at"),
  prodStartedAt: timestamp("prod_started_at"),
  cleanStartedAt: timestamp("clean_started_at"),
  prodEndedAt: timestamp("prod_ended_at"),
  prepDurationMinutes: integer("prep_duration_minutes"),
  prodDurationMinutes: integer("prod_duration_minutes"),
  cleanDurationMinutes: integer("clean_duration_minutes"),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_shift_sessions_user_idx").on(table.userId),
  index("factory_shift_sessions_station_idx").on(table.stationId),
  index("factory_shift_sessions_date_idx").on(table.checkInTime),
]);

export const insertFactoryShiftSessionSchema = createInsertSchema(factoryShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryShiftSession = z.infer<typeof insertFactoryShiftSessionSchema>;
export type FactoryShiftSession = typeof factoryShiftSessions.$inferSelect;

// Fabrika Üretim Kayıtları (her istasyon değişiminde veya vardiya sonunda)
export const factoryProductionRuns = pgTable("factory_production_runs", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "restrict" }),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  
  // Üretim detayları
  quantityProduced: integer("quantity_produced").default(0).notNull(),
  quantityWaste: integer("quantity_waste").default(0).notNull(), // Zaiyat/Fire
  wasteReason: text("waste_reason"), // Zaiyat nedeni
  
  // Kalite kontrol
  qualityScore: integer("quality_score"), // 0-100
  qualityNotes: text("quality_notes"),
  
  status: varchar("status", { length: 20 }).default("in_progress").notNull(), // in_progress, completed
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_production_runs_session_idx").on(table.sessionId),
  index("factory_production_runs_user_idx").on(table.userId),
  index("factory_production_runs_station_idx").on(table.stationId),
  index("factory_production_runs_date_idx").on(table.startTime),
]);

export const insertFactoryProductionRunSchema = createInsertSchema(factoryProductionRuns).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryProductionRun = z.infer<typeof insertFactoryProductionRunSchema>;
export type FactoryProductionRun = typeof factoryProductionRuns.$inferSelect;

// Fabrika Günlük Üretim Hedefleri
export const factoryDailyTargets = pgTable("factory_daily_targets", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  targetDate: date("target_date").notNull(),
  targetQuantity: integer("target_quantity").notNull(),
  actualQuantity: integer("actual_quantity").default(0),
  wasteQuantity: integer("waste_quantity").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("factory_daily_targets_station_date_unique").on(table.stationId, table.targetDate),
]);

export const insertFactoryDailyTargetSchema = createInsertSchema(factoryDailyTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryDailyTarget = z.infer<typeof insertFactoryDailyTargetSchema>;
export type FactoryDailyTarget = typeof factoryDailyTargets.$inferSelect;

// ========================================
// FABRIKA GELIŞMIŞ TABLOLAR
// ========================================

// Fire/Zayiat Sebepleri
export const factoryWasteReasons = pgTable("factory_waste_reasons", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 20 }).notNull().unique(),
  name: text("name").notNull(),
  category: varchar("category", { length: 50 }), // makine, malzeme, insan, ortam
  description: text("description"),
  severityScore: integer("severity_score").default(1), // 1-5 ciddiyet puanı
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFactoryWasteReasonSchema = createInsertSchema(factoryWasteReasons).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryWasteReason = z.infer<typeof insertFactoryWasteReasonSchema>;
export type FactoryWasteReason = typeof factoryWasteReasons.$inferSelect;

// Fabrika İstasyon Benchmark'ları
export const factoryStationBenchmarks = pgTable("factory_station_benchmarks", {
  id: serial("id").primaryKey(),
  stationName: varchar("station_name", { length: 200 }).notNull(),
  stationKey: varchar("station_key", { length: 100 }).notNull().unique(),
  minWorkers: integer("min_workers").notNull().default(1),
  maxWorkers: integer("max_workers").notNull().default(4),
  benchmarkWorkers: integer("benchmark_workers").notNull(),
  outputPerHour: integer("output_per_hour").notNull(),
  outputUnit: varchar("output_unit", { length: 50 }).notNull().default("adet"),
  prepTimeMinutes: integer("prep_time_minutes").notNull().default(15),
  cleanTimeMinutes: integer("clean_time_minutes").notNull().default(15),
  wasteTolerancePercent: numeric("waste_tolerance_percent", { precision: 5, scale: 2 }).notNull().default("5.00"),
  warningThresholdPercent: numeric("warning_threshold_percent", { precision: 5, scale: 2 }).notNull().default("70.00"),
  starThresholdPercent: numeric("star_threshold_percent", { precision: 5, scale: 2 }).notNull().default("120.00"),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type FactoryStationBenchmark = typeof factoryStationBenchmarks.$inferSelect;
export type InsertFactoryStationBenchmark = typeof factoryStationBenchmarks.$inferInsert;

// Vardiya Olay Kaydı (her aksiyon loglanır)
export const factorySessionEvents = pgTable("factory_session_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").references(() => factoryStations.id),
  
  eventType: varchar("event_type", { length: 30 }).notNull(), // start, pause, resume, assist, special_break, complete_task, station_change, logout, auto_logout
  
  // Mola/ara detayları
  breakReason: varchar("break_reason", { length: 30 }), // mola, yardim, ozel_ihtiyac, gorev_bitis
  breakDurationMinutes: integer("break_duration_minutes"),
  
  // Üretim verileri (görev sonlandırmada)
  producedQuantity: numeric("produced_quantity", { precision: 10, scale: 2 }),
  producedUnit: varchar("produced_unit", { length: 20 }), // adet, kg, litre
  wasteQuantity: numeric("waste_quantity", { precision: 10, scale: 2 }),
  wasteUnit: varchar("waste_unit", { length: 20 }),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_session_events_session_idx").on(table.sessionId),
  index("factory_session_events_user_idx").on(table.userId),
  index("factory_session_events_type_idx").on(table.eventType),
  index("factory_session_events_date_idx").on(table.createdAt),
]);

export const insertFactorySessionEventSchema = createInsertSchema(factorySessionEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertFactorySessionEvent = z.infer<typeof insertFactorySessionEventSchema>;
export type FactorySessionEvent = typeof factorySessionEvents.$inferSelect;

// Mola Kayıtları (detaylı izleme)
export const factoryBreakLogs = pgTable("factory_break_logs", {
  id: serial("id").primaryKey(),
  sessionEventId: integer("session_event_id").references(() => factorySessionEvents.id),
  userId: text("user_id").notNull().references(() => users.id),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  
  breakReason: varchar("break_reason", { length: 30 }).notNull(), // mola, yardim, ozel_ihtiyac, gorev_bitis
  targetStationId: integer("target_station_id").references(() => factoryStations.id), // yardım için gidilen istasyon
  
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"),
  durationMinutes: integer("duration_minutes"),
  
  autoFlagged: boolean("auto_flagged").default(false), // çok uzun/sık mola uyarısı
  notes: text("notes"),
}, (table) => [
  index("factory_break_logs_user_idx").on(table.userId),
  index("factory_break_logs_session_idx").on(table.sessionId),
  index("factory_break_logs_reason_idx").on(table.breakReason),
  index("factory_break_logs_date_idx").on(table.startedAt),
]);

export const insertFactoryBreakLogSchema = createInsertSchema(factoryBreakLogs).omit({
  id: true,
});

export type InsertFactoryBreakLog = z.infer<typeof insertFactoryBreakLogSchema>;
export type FactoryBreakLog = typeof factoryBreakLogs.$inferSelect;

// İstasyon Hedefleri (günlük/haftalık/aylık)
export const factoryStationTargets = pgTable("factory_station_targets", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  
  periodType: varchar("period_type", { length: 20 }).notNull(), // daily, weekly, monthly
  targetQuantity: numeric("target_quantity", { precision: 10, scale: 2 }).notNull(),
  targetUnit: varchar("target_unit", { length: 20 }).notNull(), // adet, kg, litre
  
  effectiveFrom: date("effective_from").notNull(),
  effectiveTo: date("effective_to"),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_station_targets_station_idx").on(table.stationId),
  index("factory_station_targets_period_idx").on(table.periodType),
]);

export const insertFactoryStationTargetSchema = createInsertSchema(factoryStationTargets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryStationTarget = z.infer<typeof insertFactoryStationTargetSchema>;
export type FactoryStationTarget = typeof factoryStationTargets.$inferSelect;

// Personel Performans Skorları
export const factoryWorkerScores = pgTable("factory_worker_scores", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  periodDate: date("period_date").notNull(), // günlük skor
  periodType: varchar("period_type", { length: 20 }).default("daily"), // daily, weekly, monthly
  
  // Skor bileşenleri
  productionScore: numeric("production_score", { precision: 5, scale: 2 }), // üretim puanı
  wasteScore: numeric("waste_score", { precision: 5, scale: 2 }), // fire puanı (düşük = iyi)
  qualityScore: numeric("quality_score", { precision: 5, scale: 2 }), // kalite puanı
  attendanceScore: numeric("attendance_score", { precision: 5, scale: 2 }), // devam puanı
  breakScore: numeric("break_score", { precision: 5, scale: 2 }), // mola davranış puanı
  
  totalScore: numeric("total_score", { precision: 5, scale: 2 }), // toplam puan
  
  // İstatistikler
  totalProduced: numeric("total_produced", { precision: 10, scale: 2 }),
  totalWaste: numeric("total_waste", { precision: 10, scale: 2 }),
  totalBreakMinutes: integer("total_break_minutes"),
  specialBreakCount: integer("special_break_count").default(0), // özel ihtiyaç sayısı
  
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("factory_worker_scores_user_idx").on(table.userId),
  index("factory_worker_scores_date_idx").on(table.periodDate),
  unique("factory_worker_scores_user_date_unique").on(table.userId, table.periodDate, table.periodType),
]);

export const insertFactoryWorkerScoreSchema = createInsertSchema(factoryWorkerScores).omit({
  id: true,
  generatedAt: true,
});

export type InsertFactoryWorkerScore = z.infer<typeof insertFactoryWorkerScoreSchema>;
export type FactoryWorkerScore = typeof factoryWorkerScores.$inferSelect;

// Üretim Çıktıları (her görev sonlandırmada)
export const factoryProductionOutputs = pgTable("factory_production_outputs", {
  id: serial("id").primaryKey(),
  sessionEventId: integer("session_event_id").references(() => factorySessionEvents.id),
  sessionId: integer("session_id").notNull().references(() => factoryShiftSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  // Ürün bilgisi
  productId: integer("product_id").references(() => factoryProducts.id),
  productName: text("product_name"),
  
  // Üretim
  producedQuantity: numeric("produced_quantity", { precision: 10, scale: 2 }).notNull(),
  producedUnit: varchar("produced_unit", { length: 20 }).notNull(),
  
  // Fire/Zayiat
  wasteQuantity: numeric("waste_quantity", { precision: 10, scale: 2 }).default("0"),
  wasteUnit: varchar("waste_unit", { length: 20 }),
  wasteReasonId: integer("waste_reason_id").references(() => factoryWasteReasons.id),
  wasteNotes: text("waste_notes"),
  wasteDoughKg: numeric("waste_dough_kg", { precision: 8, scale: 2 }),
  wasteProductCount: integer("waste_product_count"),
  
  // Süre
  durationMinutes: integer("duration_minutes"),
  
  // Fotoğraf doğrulama
  photoUrl: text("photo_url"), // Üretim kanıtı fotoğrafı
  photoVerified: boolean("photo_verified").default(false), // Fotoğraf kontrol edildi mi
  
  // Kalite kontrol durumu
  qualityStatus: varchar("quality_status", { length: 20 }).default("pending"), // pending, pending_engineer, approved, rejected
  qualityCheckedBy: text("quality_checked_by").references(() => users.id),
  qualityCheckedAt: timestamp("quality_checked_at"),
  qualityNotes: text("quality_notes"), // Kalite kontrol notları
  
  // Reçete bağlantısı — hangi reçete versiyonuyla üretildi
  productRecipeId: integer("product_recipe_id"), // product_recipes.id referansı
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_production_outputs_session_idx").on(table.sessionId),
  index("factory_production_outputs_user_idx").on(table.userId),
  index("factory_production_outputs_station_idx").on(table.stationId),
  index("factory_production_outputs_quality_idx").on(table.qualityStatus),
  index("factory_production_outputs_date_idx").on(table.createdAt),
]);

export const insertFactoryProductionOutputSchema = createInsertSchema(factoryProductionOutputs).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryProductionOutput = z.infer<typeof insertFactoryProductionOutputSchema>;
export type FactoryProductionOutput = typeof factoryProductionOutputs.$inferSelect;

// ========================================
// FABRIKA KALİTE KONTROL TABLOLARI
// ========================================

// Kalite Kontrol Kriterleri (her istasyon/ürün için)
export const factoryQualitySpecs = pgTable("factory_quality_specs", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => factoryProducts.id),
  
  name: text("name").notNull(), // Kriter adı
  description: text("description"),
  
  // Ölçüm türü
  measurementType: varchar("measurement_type", { length: 30 }).notNull(), // numeric, boolean, text
  unit: varchar("unit", { length: 20 }), // °C, kg, adet, cm vs.
  
  // Tolerans aralıkları (numeric için)
  minValue: numeric("min_value", { precision: 10, scale: 2 }),
  maxValue: numeric("max_value", { precision: 10, scale: 2 }),
  targetValue: numeric("target_value", { precision: 10, scale: 2 }),
  
  // Ayarlar
  isRequired: boolean("is_required").default(true),
  requirePhoto: boolean("require_photo").default(false),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_quality_specs_station_idx").on(table.stationId),
  index("factory_quality_specs_product_idx").on(table.productId),
]);

export const insertFactoryQualitySpecSchema = createInsertSchema(factoryQualitySpecs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryQualitySpec = z.infer<typeof insertFactoryQualitySpecSchema>;
export type FactoryQualitySpec = typeof factoryQualitySpecs.$inferSelect;

// Kalite Kontrol Sorumlusu Atamaları
export const factoryQualityAssignments = pgTable("factory_quality_assignments", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id),
  
  // Yetki kapsamı
  assignedStations: integer("assigned_stations").array(), // null = tüm istasyonlar
  
  assignedBy: text("assigned_by").notNull().references(() => users.id),
  assignedAt: timestamp("assigned_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").default(true),
  
  notes: text("notes"),
}, (table) => [
  index("factory_quality_assignments_user_idx").on(table.userId),
  unique("factory_quality_assignments_user_unique").on(table.userId),
]);

export const insertFactoryQualityAssignmentSchema = createInsertSchema(factoryQualityAssignments).omit({
  id: true,
  assignedAt: true,
});

export type InsertFactoryQualityAssignment = z.infer<typeof insertFactoryQualityAssignmentSchema>;
export type FactoryQualityAssignment = typeof factoryQualityAssignments.$inferSelect;

// Kalite Kontrol Kayıtları
export const factoryQualityChecks = pgTable("factory_quality_checks", {
  id: serial("id").primaryKey(),
  productionOutputId: integer("production_output_id").notNull().references(() => factoryProductionOutputs.id),
  
  inspectorId: text("inspector_id").notNull().references(() => users.id),
  producerId: text("producer_id").notNull().references(() => users.id),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  decision: varchar("decision", { length: 20 }).notNull(), // approved, rejected, pending_engineer, hold
  decisionReason: text("decision_reason"),
  notes: text("notes"),
  
  visualInspection: varchar("visual_inspection", { length: 20 }),
  tasteTest: varchar("taste_test", { length: 20 }),
  textureCheck: varchar("texture_check", { length: 20 }),
  weightCheck: varchar("weight_check", { length: 20 }),
  temperatureCheck: varchar("temperature_check", { length: 20 }),
  packagingIntegrity: varchar("packaging_integrity", { length: 20 }),
  
  allergenCheck: boolean("allergen_check").default(false),
  haccpCompliance: boolean("haccp_compliance").default(true),
  
  inspectorNotes: text("inspector_notes"),
  correctiveAction: text("corrective_action"),
  holdReason: text("hold_reason"),
  
  foodEngineerApproval: boolean("food_engineer_approval").default(false),
  foodEngineerId: varchar("food_engineer_id", { length: 255 }),
  foodEngineerApprovedAt: timestamp("food_engineer_approved_at"),
  
  checkedAt: timestamp("checked_at").defaultNow(),
}, (table) => [
  index("factory_quality_checks_output_idx").on(table.productionOutputId),
  index("factory_quality_checks_inspector_idx").on(table.inspectorId),
  index("factory_quality_checks_producer_idx").on(table.producerId),
  index("factory_quality_checks_date_idx").on(table.checkedAt),
]);

export const insertFactoryQualityCheckSchema = createInsertSchema(factoryQualityChecks).omit({
  id: true,
  checkedAt: true,
});

export type InsertFactoryQualityCheck = z.infer<typeof insertFactoryQualityCheckSchema>;
export type FactoryQualityCheck = typeof factoryQualityChecks.$inferSelect;

// Kalite Ölçümleri (her kriter için)
export const factoryQualityMeasurements = pgTable("factory_quality_measurements", {
  id: serial("id").primaryKey(),
  qualityCheckId: integer("quality_check_id").notNull().references(() => factoryQualityChecks.id, { onDelete: "cascade" }),
  specId: integer("spec_id").notNull().references(() => factoryQualitySpecs.id),
  
  // Ölçüm değeri
  numericValue: numeric("numeric_value", { precision: 10, scale: 2 }),
  booleanValue: boolean("boolean_value"),
  textValue: text("text_value"),
  
  // Sonuç
  passed: boolean("passed").notNull(),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_quality_measurements_check_idx").on(table.qualityCheckId),
  index("factory_quality_measurements_spec_idx").on(table.specId),
]);

export const insertFactoryQualityMeasurementSchema = createInsertSchema(factoryQualityMeasurements).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryQualityMeasurement = z.infer<typeof insertFactoryQualityMeasurementSchema>;
export type FactoryQualityMeasurement = typeof factoryQualityMeasurements.$inferSelect;

// Kalite Kontrol Fotoğrafları
export const factoryQualityMedia = pgTable("factory_quality_media", {
  id: serial("id").primaryKey(),
  qualityCheckId: integer("quality_check_id").notNull().references(() => factoryQualityChecks.id, { onDelete: "cascade" }),
  
  mediaType: varchar("media_type", { length: 20 }).notNull(), // photo, video
  mediaUrl: text("media_url").notNull(),
  
  caption: text("caption"),
  uploadedBy: text("uploaded_by").references(() => users.id),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
}, (table) => [
  index("factory_quality_media_check_idx").on(table.qualityCheckId),
]);

export const insertFactoryQualityMediaSchema = createInsertSchema(factoryQualityMedia).omit({
  id: true,
  uploadedAt: true,
});

export type InsertFactoryQualityMedia = z.infer<typeof insertFactoryQualityMediaSchema>;
export type FactoryQualityMedia = typeof factoryQualityMedia.$inferSelect;

// AI Fabrika Raporları
export const factoryAiReports = pgTable("factory_ai_reports", {
  id: serial("id").primaryKey(),
  
  reportType: varchar("report_type", { length: 30 }).notNull(), // rotation, waste_pattern, device_errors, performance, custom
  reportScope: varchar("report_scope", { length: 20 }).notNull(), // hq, manager, worker
  
  // Filtreler
  targetUserId: text("target_user_id").references(() => users.id), // belirli personel için
  targetStationId: integer("target_station_id").references(() => factoryStations.id),
  periodStart: date("period_start"),
  periodEnd: date("period_end"),
  
  // Rapor içeriği
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  recommendations: text("recommendations").array(),
  details: jsonb("details"), // Detaylı veriler
  
  generatedBy: text("generated_by").references(() => users.id),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (table) => [
  index("factory_ai_reports_type_idx").on(table.reportType),
  index("factory_ai_reports_user_idx").on(table.targetUserId),
  index("factory_ai_reports_date_idx").on(table.generatedAt),
]);

export const insertFactoryAiReportSchema = createInsertSchema(factoryAiReports).omit({
  id: true,
  generatedAt: true,
});

export type InsertFactoryAiReport = z.infer<typeof insertFactoryAiReportSchema>;
export type FactoryAiReport = typeof factoryAiReports.$inferSelect;

// ========================================
// ÜRETİM PLANLAMA VE TAKVİM
// ========================================

// Üretim Planları (Günlük/Haftalık)
export const factoryProductionPlans = pgTable("factory_production_plans", {
  id: serial("id").primaryKey(),
  
  planDate: date("plan_date").notNull(), // Hangi gün için plan
  productId: integer("product_id").notNull().references(() => factoryProducts.id, { onDelete: "cascade" }),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  
  targetQuantity: integer("target_quantity").notNull(), // Hedef üretim miktarı
  unit: varchar("unit", { length: 20 }).default("adet"),
  priority: varchar("priority", { length: 20 }).default("normal"), // low, normal, high, urgent
  
  // Gerçekleşen
  actualQuantity: integer("actual_quantity").default(0),
  status: varchar("status", { length: 20 }).default("planned"), // planned, in_progress, completed, cancelled
  
  notes: text("notes"),
  createdBy: text("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_production_plans_date_idx").on(table.planDate),
  index("factory_production_plans_product_idx").on(table.productId),
  index("factory_production_plans_status_idx").on(table.status),
]);

export const insertFactoryProductionPlanSchema = createInsertSchema(factoryProductionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryProductionPlan = z.infer<typeof insertFactoryProductionPlanSchema>;
export type FactoryProductionPlan = typeof factoryProductionPlans.$inferSelect;

// ========================================
// TAKIM ÇALIŞMASI (Aynı istasyonda birden fazla kişi)
// ========================================

// Takım/Ekip Tanımları
export const factoryTeams = pgTable("factory_teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  stationId: integer("station_id").references(() => factoryStations.id, { onDelete: "set null" }),
  leaderId: text("leader_id").references(() => users.id, { onDelete: "set null" }), // Ekip lideri
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_teams_station_idx").on(table.stationId),
]);

export const insertFactoryTeamSchema = createInsertSchema(factoryTeams).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryTeam = z.infer<typeof insertFactoryTeamSchema>;
export type FactoryTeam = typeof factoryTeams.$inferSelect;

// Takım Üyeleri
export const factoryTeamMembers = pgTable("factory_team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => factoryTeams.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  role: varchar("role", { length: 30 }).default("member"), // leader, member
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
  isActive: boolean("is_active").default(true),
}, (table) => [
  index("factory_team_members_team_idx").on(table.teamId),
  index("factory_team_members_user_idx").on(table.userId),
  unique("factory_team_members_team_user_unique").on(table.teamId, table.userId),
]);

export const insertFactoryTeamMemberSchema = createInsertSchema(factoryTeamMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertFactoryTeamMember = z.infer<typeof insertFactoryTeamMemberSchema>;
export type FactoryTeamMember = typeof factoryTeamMembers.$inferSelect;

// Takım Vardiya Oturumları (Birlikte çalışma kaydı)
export const factoryTeamSessions = pgTable("factory_team_sessions", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => factoryStations.id),
  
  startTime: timestamp("start_time").notNull().defaultNow(),
  endTime: timestamp("end_time"),
  
  // Toplam takım üretimi
  totalProduced: integer("total_produced").default(0),
  totalWaste: integer("total_waste").default(0),
  
  status: varchar("status", { length: 20 }).default("active"), // active, completed
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("factory_team_sessions_station_idx").on(table.stationId),
  index("factory_team_sessions_date_idx").on(table.startTime),
]);

export const insertFactoryTeamSessionSchema = createInsertSchema(factoryTeamSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertFactoryTeamSession = z.infer<typeof insertFactoryTeamSessionSchema>;
export type FactoryTeamSession = typeof factoryTeamSessions.$inferSelect;

// Takım Oturum Üyeleri (O anda hangi kişiler takımda)
export const factoryTeamSessionMembers = pgTable("factory_team_session_members", {
  id: serial("id").primaryKey(),
  teamSessionId: integer("team_session_id").notNull().references(() => factoryTeamSessions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  shiftSessionId: integer("shift_session_id").references(() => factoryShiftSessions.id, { onDelete: "set null" }),
  
  role: varchar("role", { length: 30 }).default("member"), // leader, member
  contributionPercent: integer("contribution_percent").default(100), // Katkı yüzdesi (eşit paylaşım için 100/kişi sayısı)
  
  joinedAt: timestamp("joined_at").defaultNow(),
  leftAt: timestamp("left_at"),
}, (table) => [
  index("factory_team_session_members_session_idx").on(table.teamSessionId),
  index("factory_team_session_members_user_idx").on(table.userId),
]);

export const insertFactoryTeamSessionMemberSchema = createInsertSchema(factoryTeamSessionMembers).omit({
  id: true,
  joinedAt: true,
});

export type InsertFactoryTeamSessionMember = z.infer<typeof insertFactoryTeamSessionMemberSchema>;
export type FactoryTeamSessionMember = typeof factoryTeamSessionMembers.$inferSelect;

// ========================================
// FABRİKA VARDİYA UYUMLULUK SİSTEMİ
// ========================================

// Fabrika Vardiya Uyumluluk - Fabrika oturumlarını ana vardiya sistemiyle bağlar
export const factoryShiftCompliance = pgTable("factory_shift_compliance", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  factorySessionId: integer("factory_session_id").references(() => factoryShiftSessions.id, { onDelete: "set null" }),
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  
  // Planlanan çalışma saatleri (fabrika için: 08:00 - 18:00)
  plannedStartTime: timestamp("planned_start_time").notNull(),
  plannedEndTime: timestamp("planned_end_time").notNull(),
  plannedBreakMinutes: integer("planned_break_minutes").default(60), // 1 saat mola
  
  // Gerçekleşen saatler
  actualStartTime: timestamp("actual_start_time"),
  actualEndTime: timestamp("actual_end_time"),
  actualBreakMinutes: integer("actual_break_minutes").default(0),
  
  // Uyumluluk metrikleri
  latenessMinutes: integer("lateness_minutes").default(0), // Geç kalma
  earlyLeaveMinutes: integer("early_leave_minutes").default(0), // Erken çıkış
  breakOverageMinutes: integer("break_overage_minutes").default(0), // Mola aşımı
  unauthorizedBreakMinutes: integer("unauthorized_break_minutes").default(0), // İzinsiz mola
  
  // Toplam çalışma
  totalWorkedMinutes: integer("total_worked_minutes").default(0),
  effectiveWorkedMinutes: integer("effective_worked_minutes").default(0), // Net çalışma (cezalar düşülmüş)
  overtimeMinutes: integer("overtime_minutes").default(0), // Mesai (yönetici onayı gerekli)
  missingMinutes: integer("missing_minutes").default(0), // Eksik saat
  
  // Uyumluluk durumu
  complianceScore: integer("compliance_score").default(100), // 0-100
  complianceStatus: varchar("compliance_status", { length: 30 }).default("compliant"), // compliant, late, early_leave, break_overage, absent, needs_review
  
  // Onay durumu (mesai için)
  overtimeApproved: boolean("overtime_approved").default(false),
  overtimeApprovedBy: text("overtime_approved_by").references(() => users.id),
  overtimeApprovedAt: timestamp("overtime_approved_at"),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  
  // AI öneri
  aiSuggestion: text("ai_suggestion"), // Telafi önerisi
  aiSuggestionGeneratedAt: timestamp("ai_suggestion_generated_at"),
  
  // Notlar
  notes: text("notes"),
  
  // Tarih
  workDate: date("work_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_shift_compliance_user_idx").on(table.userId),
  index("factory_shift_compliance_date_idx").on(table.workDate),
  index("factory_shift_compliance_session_idx").on(table.factorySessionId),
  index("factory_shift_compliance_status_idx").on(table.complianceStatus),
]);

export const insertFactoryShiftComplianceSchema = createInsertSchema(factoryShiftCompliance).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryShiftCompliance = z.infer<typeof insertFactoryShiftComplianceSchema>;
export type FactoryShiftCompliance = typeof factoryShiftCompliance.$inferSelect;

// Haftalık Çalışma Özeti (45 saat takibi)
export const factoryWeeklyAttendanceSummary = pgTable("factory_weekly_attendance_summary", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Hafta bilgisi
  weekStartDate: date("week_start_date").notNull(),
  weekEndDate: date("week_end_date").notNull(),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Çalışma saatleri
  plannedTotalMinutes: integer("planned_total_minutes").default(2700), // 45 saat = 2700 dk
  actualTotalMinutes: integer("actual_total_minutes").default(0),
  overtimeMinutes: integer("overtime_minutes").default(0),
  missingMinutes: integer("missing_minutes").default(0), // Eksik saat
  
  // Günlük dağılım
  workDaysCount: integer("work_days_count").default(0),
  absentDaysCount: integer("absent_days_count").default(0),
  lateDaysCount: integer("late_days_count").default(0),
  
  // Uyumluluk
  weeklyComplianceScore: integer("weekly_compliance_score").default(100),
  
  // Muhasebe bildirimi
  reportedToAccounting: boolean("reported_to_accounting").default(false),
  reportedToAccountingAt: timestamp("reported_to_accounting_at"),
  accountingNotes: text("accounting_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("factory_weekly_summary_user_idx").on(table.userId),
  index("factory_weekly_summary_week_idx").on(table.weekStartDate),
  unique("factory_weekly_summary_user_week_unique").on(table.userId, table.weekStartDate),
]);

export const insertFactoryWeeklyAttendanceSummarySchema = createInsertSchema(factoryWeeklyAttendanceSummary).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFactoryWeeklyAttendanceSummary = z.infer<typeof insertFactoryWeeklyAttendanceSummarySchema>;
export type FactoryWeeklyAttendanceSummary = typeof factoryWeeklyAttendanceSummary.$inferSelect;

// ========================================
// ŞUBE KIOSK SİSTEMİ
// ========================================

// Şube Personeli PIN Kodları (kiosk girişi için)
export const branchStaffPins = pgTable("branch_staff_pins", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  hashedPin: varchar("hashed_pin", { length: 255 }).notNull(), // Bcrypt hash - 4 haneli PIN
  pinFailedAttempts: integer("pin_failed_attempts").default(0),
  pinLockedUntil: timestamp("pin_locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  unique("branch_staff_pins_user_branch_unique").on(table.userId, table.branchId),
  index("branch_staff_pins_branch_idx").on(table.branchId),
]);

export const insertBranchStaffPinSchema = createInsertSchema(branchStaffPins).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBranchStaffPin = z.infer<typeof insertBranchStaffPinSchema>;
export type BranchStaffPin = typeof branchStaffPins.$inferSelect;

// Şube Vardiya Oturumları (kiosk giriş/çıkış)
export const branchShiftSessions = pgTable("branch_shift_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Vardiya zamanları
  checkInTime: timestamp("check_in_time").notNull().defaultNow(),
  checkOutTime: timestamp("check_out_time"),
  
  // Çalışma ve mola süreleri (dakika)
  workMinutes: integer("work_minutes").default(0),
  breakMinutes: integer("break_minutes").default(0), // Toplam mola süresi
  netWorkMinutes: integer("net_work_minutes").default(0), // workMinutes - breakMinutes
  
  // Durum
  status: varchar("status", { length: 20 }).default("active").notNull(), // active, on_break, completed, abandoned
  
  // shiftAttendance ile bağlantı
  shiftAttendanceId: integer("shift_attendance_id").references(() => shiftAttendance.id, { onDelete: "set null" }),
  
  notes: text("notes"),
  
  // Lokasyon dogrulama
  checkInLatitude: numeric("check_in_latitude", { precision: 10, scale: 7 }),
  checkInLongitude: numeric("check_in_longitude", { precision: 10, scale: 7 }),
  checkOutLatitude: numeric("check_out_latitude", { precision: 10, scale: 7 }),
  checkOutLongitude: numeric("check_out_longitude", { precision: 10, scale: 7 }),
  isLocationVerified: boolean("is_location_verified").default(false),
  locationDistance: integer("location_distance"), // metre cinsinden mesafe
  
  // Planlanan vardiya karsilastirmasi
  plannedShiftId: integer("planned_shift_id"),
  lateMinutes: integer("late_minutes").default(0), // gec kalma dakikasi
  earlyLeaveMinutes: integer("early_leave_minutes").default(0), // erken cikis dakikasi
  overtimeMinutes: integer("overtime_minutes").default(0), // fazla mesai dakikasi
  
  checkinMethod: varchar("checkin_method", { length: 10 }).default("pin").notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_shift_sessions_user_idx").on(table.userId),
  index("branch_shift_sessions_branch_idx").on(table.branchId),
  index("branch_shift_sessions_date_idx").on(table.checkInTime),
  index("branch_shift_sessions_status_idx").on(table.status),
]);

export const insertBranchShiftSessionSchema = createInsertSchema(branchShiftSessions).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchShiftSession = z.infer<typeof insertBranchShiftSessionSchema>;
export type BranchShiftSession = typeof branchShiftSessions.$inferSelect;

// Şube Vardiya Olayları (check-in, check-out, break-start, break-end)
export const branchShiftEvents = pgTable("branch_shift_events", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => branchShiftSessions.id, { onDelete: "cascade" }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  branchId: integer("branch_id").notNull().references(() => branches.id, { onDelete: "cascade" }),
  
  // Olay tipi
  eventType: varchar("event_type", { length: 30 }).notNull(), // check_in, check_out, break_start, break_end
  eventTime: timestamp("event_time").notNull().defaultNow(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("branch_shift_events_session_idx").on(table.sessionId),
  index("branch_shift_events_user_idx").on(table.userId),
  index("branch_shift_events_time_idx").on(table.eventTime),
  index("branch_shift_events_type_idx").on(table.eventType),
]);

export const insertBranchShiftEventSchema = createInsertSchema(branchShiftEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertBranchShiftEvent = z.infer<typeof insertBranchShiftEventSchema>;
export type BranchShiftEvent = typeof branchShiftEvents.$inferSelect;
