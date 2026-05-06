/**
 * Tedarikçi Alerjen Kontrol Formu Schema
 *
 * Form Kodu: 0011.A.FR.GG.36/Rev.1/1.4.2025
 * Aslan'ın PDF formundan alındı (TGK 26.01.2017/29960 EK-1 uyumlu)
 *
 * 14 alerjen × 3 kolon (ürün içi / aynı hat / fabrika içi)
 * 15 önleyici faaliyet checklist
 * 3 doğrulama sorusu
 *
 * Eklenme: 7 May 2026
 */

import { pgTable, serial, varchar, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { suppliers } from "./schema-09";
import { rawMaterials } from "./schema-10";
import { users } from "./schema-02";

export const supplierAllergenForms = pgTable("supplier_allergen_forms", {
  id: serial("id").primaryKey(),
  
  // Form referansı
  formCode: varchar("form_code", { length: 50 }).default("0011.A.FR.GG.36/Rev.1"),
  formDate: timestamp("form_date").defaultNow(),
  
  // Tedarikçi & ürün
  supplierId: integer("supplier_id").references(() => suppliers.id, { onDelete: "set null" }),
  supplierName: varchar("supplier_name", { length: 255 }).notNull(),
  rawMaterialId: integer("raw_material_id").references(() => rawMaterials.id, { onDelete: "set null" }),
  productName: varchar("product_name", { length: 255 }).notNull(),
  
  // Fabrika bilgileri
  factoryName: varchar("factory_name", { length: 255 }),
  
  // Form dolduran
  filledBy: varchar("filled_by", { length: 255 }),
  filledByTitle: varchar("filled_by_title", { length: 100 }),
  contactPhone: varchar("contact_phone", { length: 30 }),
  signatureUrl: text("signature_url"),
  
  // 14 ALERJEN MATRISI — 3 KOLON
  // JSON yapısı:
  // {
  //   sut: { col1: 'evet'|'hayir', col2: 'evet'|'hayir', col3: 'evet'|'hayir' },
  //   yumurta: { ... },
  //   ...
  // }
  allergenMatrix: jsonb("allergen_matrix").$type<Record<string, {
    col1: 'evet' | 'hayir' | null;  // Ürün İçerisinde
    col2: 'evet' | 'hayir' | null;  // Aynı Üretim Hattında
    col3: 'evet' | 'hayir' | null;  // Fabrika İçerisinde
  }>>().default(sql`'{}'::jsonb`),
  
  // ÖNLEYİCİ FAALİYETLER (Soru 1: kolon 2/3'te EVET varsa)
  preventiveActionsRequired: boolean("preventive_actions_required").default(false),
  // 15 alt madde checklist
  preventiveActions: jsonb("preventive_actions").$type<{
    "1.1": boolean | null;  // Alerjenler kilitli olarak ayrı depolanmaktadır
    "1.2": boolean | null;  // Depolama ve üretim sırasında açıkça tanımlanmıştır
    "1.3": boolean | null;  // Alerjen içermeyen ürün öncesi temizlik
    "1.4": boolean | null;  // El aletleri ayrı, renk kodlu
    "1.5": boolean | null;  // Ayrı hat yoksa periyot sonunda üretim
    "1.6": boolean | null;  // Yeniden işlemeler sadece aynı alerjenli ürünlerde
    "1.7": boolean | null;  // Kızartma yağı paylaşılmaz
    "1.8": boolean | null;  // Dökülmeler hemen temizlenir
    "1.9": boolean | null;  // Çalışan/temizlik renk kodlu
    "1.10": boolean | null; // Üründe alerjen etikette ayrı satırda
    "1.11": boolean | null; // Aynı hatta üretilen alerjen müşteriye bildirilir
    "1.12": boolean | null; // Tesiste bulunan alerjen müşteriye bildirilir
    "1.13": boolean | null; // Tedarikçilerden bilgi talep edilir
    "1.14": boolean | null; // Yemekhaneden üretime yiyecek girmez (eğitim)
    "1.15": boolean | null; // Yemekhane yoksa evden gelen yiyecek eğitimi
  }>().default(sql`'{}'::jsonb`),
  
  // SORU 2: Etiket alerjen bilgisi var mı?
  labelIncludesAllergens: boolean("label_includes_allergens"),
  labelExampleUrl: text("label_example_url"),
  
  // SORU 3: Spesifikasyon alerjen bilgisi var mı?
  specIncludesAllergens: boolean("spec_includes_allergens"),
  specExampleUrl: text("spec_example_url"),
  
  // Onay & durum
  status: varchar("status", { length: 20 }).default("draft"), // "draft", "submitted", "approved", "rejected"
  submittedAt: timestamp("submitted_at"),
  approvedAt: timestamp("approved_at"),
  approvedBy: varchar("approved_by").references(() => users.id, { onDelete: "set null" }),
  rejectionReason: text("rejection_reason"),
  
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// 14 TGK Alerjeni — sabit liste (formdaki sıra)
export const TGK_ALLERGENS_14 = [
  { key: "sut", label: "Süt ve Süt Ürünleri", excluded: "Distile alkollü içkilerde distilat olarak kullanılan peynir altı suyu, laktitol, şarap ve elma şarabında inceltici madde olarak kullanılan süt (kazein) ürünleri" },
  { key: "yumurta", label: "Yumurta ve Yumurta Ürünleri", excluded: "Şarapta kullanılan yumurtadan üretilen lizozim, şarap ve elma şarabında inceltici madde olarak kullanılan yumurtadan üretilen albumin" },
  { key: "balik", label: "Balık ve Balık Ürünleri", excluded: "Vitamin ve aroma taşıyıcısı olarak kullanılan balık jelatini, bira/şarap/elma şarabında inceltici" },
  { key: "kabuklu_deniz", label: "Kabuklu Deniz Ürünleri", excluded: null },
  { key: "yer_fistigi", label: "Fıstık (Yer Fıstığı) ve Fıstık Ürünleri", excluded: "Distile alkollü içkilerde distilat ve aroma maddesi olarak kullanılan sert kabuklu meyveler (badem, ceviz)" },
  { key: "sert_kabuklu", label: "Kabuklu Ağaç Kuruyemişleri", excluded: null },
  { key: "soya", label: "Soya ve Soya Ürünleri", excluded: "Rafine soya fasulyesi yağı, soya tokoferolleri (E306), soya fitosterol esterleri, soya bitkisel stanol esteri" },
  { key: "kereviz", label: "Kereviz ve Kereviz Ürünleri", excluded: "Kereviz yaprağı, kereviz tohumu yağı, kereviz tohumu oleoresini" },
  { key: "susam", label: "Susam ve Susam Ürünleri", excluded: null },
  { key: "bugday", label: "Buğday ve Buğday Ürünleri (Gluten)", excluded: "Dekstroz dahil buğday bazlı glukoz şurupları, buğday bazlı maltodekstrinler, arpa bazlı glukoz şurupları, distile alkollü içkilerin distilatında kullanılan tahıl çeşitleri" },
  { key: "hardal", label: "Hardal ve Ürünleri", excluded: "Hardal yağı, hardal tohumu yağı, hardal tohumu oleoresini" },
  { key: "sulfit", label: "Sülfit Grubu Ürünler (E220-E228)", excluded: null },
  { key: "lupin", label: "Lupin (Acı Bakla) ve Ürünleri", excluded: null },
  { key: "yumusakca", label: "Yumuşakçalar ve Ürünleri", excluded: null },
] as const;

// 15 Önleyici Faaliyet — sabit liste
export const PREVENTIVE_ACTIONS_15 = [
  { key: "1.1", label: "Alerjenler kilitli olarak ayrı depolanmaktadır" },
  { key: "1.2", label: "Depolama ve üretim sırasında alerjen içeren malzemeler açıkça tanımlanmıştır" },
  { key: "1.3", label: "Alerjen içermeyen ürün üretimi öncesinde tüm ekipmanlar kimyasal ile temizlenmekte (alerjen kitleri ile doğrulanır)" },
  { key: "1.4", label: "Alerjen üretiminde kullanılan el aletleri ayrı ve renk kodlu" },
  { key: "1.5", label: "Alerjen ürünler periyodun sonunda üretilmektedir (ayrı hat yoksa)" },
  { key: "1.6", label: "Alerjen içeren yeniden işlemeler sadece aynı alerjenli ürünlerde kullanılmaktadır" },
  { key: "1.7", label: "Alerjen gıdaların kızartma yağı, alerjen içermeyen gıdalarda kullanılmamaktadır" },
  { key: "1.8", label: "Çapraz bulaşma için dökülmeler hemen temizlenmektedir" },
  { key: "1.9", label: "Alerjen üretiminde görevli çalışanlar ve temizlik malzemeleri renk kodlu" },
  { key: "1.10", label: "Üründe bulunan alerjen etikette içindekilerden ayrı satırda belirtilmektedir" },
  { key: "1.11", label: "Aynı hatta üretilen diğer ürünlerdeki alerjenler etiketle bildirilmektedir" },
  { key: "1.12", label: "Tesiste bulunan alerjenler etiketle müşteriye bildirilmektedir" },
  { key: "1.13", label: "Tedarikçilerden alerjen bilgisi ve önlemler talep edilmektedir" },
  { key: "1.14", label: "Yemekhaneden üretim alanlarına yiyecek götürülmemesi için eğitim verilmektedir" },
  { key: "1.15", label: "Yemekhane yoksa evden gelen yiyecek için alerjen eğitimi verilmektedir" },
] as const;
