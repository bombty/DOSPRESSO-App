// ═══════════════════════════════════════════════════════════════════
// Sprint 51 (Aslan 13 May 2026) — Schema Refactor
// ═══════════════════════════════════════════════════════════════════
// raw_materials kategori + stok kolonları (Drizzle tarafı)
// b2b_customers yeni tablo
//
// NOT: raw_materials kolonları zaten schema-10.ts'de, sadece migration SQL
// ile yeni kolonlar eklendi. Burada SADECE yeni tabloyu (b2b_customers)
// ve sabit kategori listelerini tutuyoruz.
// ═══════════════════════════════════════════════════════════════════

import {
  pgTable,
  varchar,
  text,
  integer,
  serial,
  timestamp,
  numeric,
  date,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users } from "./schema-02";

// ═══════════════════════════════════════════════════════════════════
// SABİT KATEGORI LİSTELERİ
// ═══════════════════════════════════════════════════════════════════

// raw_materials.main_category — 4 ana kategori
export const RAW_MATERIAL_CATEGORIES = [
  "hammadde",         // un, şeker, yağ, aroma (üretim için)
  "al_sat",           // toptan alıp doğrudan satılan
  "uretim_malzeme",   // ambalaj, etiket, kutu
  "fabrika_kullanim", // temizlik, ofis, sarf
] as const;
export type RawMaterialCategory = (typeof RAW_MATERIAL_CATEGORIES)[number];

export const RAW_MATERIAL_CATEGORY_LABELS: Record<RawMaterialCategory, string> = {
  hammadde: "Hammadde (Üretim)",
  al_sat: "Al-Sat (Toptan Doğrudan)",
  uretim_malzeme: "Üretim Malzeme",
  fabrika_kullanim: "Fabrika Kullanım",
};

// factory_products.category — 8 kategori
export const FACTORY_PRODUCT_CATEGORIES = [
  "donut",
  "kek_pasta",
  "surup",
  "tatli",
  "tuzlu",
  "kahve",
  "toz_karisim",
  "diger",
] as const;
export type FactoryProductCategory = (typeof FACTORY_PRODUCT_CATEGORIES)[number];

export const FACTORY_PRODUCT_CATEGORY_LABELS: Record<FactoryProductCategory, string> = {
  donut: "Donut",
  kek_pasta: "Kek & Pasta",
  surup: "Şurup",
  tatli: "Tatlı",
  tuzlu: "Tuzlu",
  kahve: "Kahve",
  toz_karisim: "Toz Karışım",
  diger: "Diğer",
};

// ═══════════════════════════════════════════════════════════════════
// B2B CUSTOMERS — Toptan müşteri (franchise dışı)
// ═══════════════════════════════════════════════════════════════════
export const b2bCustomers = pgTable("b2b_customers", {
  id: serial("id").primaryKey(),

  // Temel bilgi
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  companyType: varchar("company_type", { length: 50 }), // restoran, otel, cafe, market

  // Vergi bilgisi (Compliance için ŞART)
  taxNumber: varchar("tax_number", { length: 11 }),
  taxOffice: varchar("tax_office", { length: 100 }),

  // İletişim
  contactPerson: varchar("contact_person", { length: 255 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  mobilePhone: varchar("mobile_phone", { length: 20 }),

  // Adres
  address: text("address"),
  city: varchar("city", { length: 100 }),
  district: varchar("district", { length: 100 }),
  postalCode: varchar("postal_code", { length: 10 }),

  // Ticari
  creditLimit: numeric("credit_limit", { precision: 12, scale: 2 }).default("0"),
  paymentTermDays: integer("payment_term_days").default(30),
  discountRate: numeric("discount_rate", { precision: 5, scale: 2 }).default("0"),
  currency: varchar("currency", { length: 3 }).default("TRY"),

  // Durum
  status: varchar("status", { length: 20 }).default("aktif"), // aktif, pasif, blokeli
  customerSince: date("customer_since"),
  notes: text("notes"),

  // Audit
  createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("idx_b2b_customers_status").on(table.status),
  index("idx_b2b_customers_city").on(table.city),
  index("idx_b2b_customers_code").on(table.code),
]);

export const insertB2bCustomerSchema = createInsertSchema(b2bCustomers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertB2bCustomer = z.infer<typeof insertB2bCustomerSchema>;
export type B2bCustomer = typeof b2bCustomers.$inferSelect;

export const B2B_COMPANY_TYPES = [
  "restoran",
  "otel",
  "cafe",
  "market",
  "ofis",
  "catering",
  "diger",
] as const;
export type B2bCompanyType = (typeof B2B_COMPANY_TYPES)[number];

export const B2B_COMPANY_TYPE_LABELS: Record<B2bCompanyType, string> = {
  restoran: "Restoran",
  otel: "Otel",
  cafe: "Cafe",
  market: "Market",
  ofis: "Ofis",
  catering: "Catering",
  diger: "Diğer",
};
