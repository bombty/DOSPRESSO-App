# DOSPRESSO Gıda Mühendisi & Üretim Kontrol Sistemi — Read-Only Analiz Raporu

**Tarih:** 27 Nisan 2026
**Mod:** Sadece envanter + plan. Kod, DB, migration değişikliği YAPILMADI.
**Kapsam:** Hammadde master / reçete / besin değeri / alerjen / katkı maddesi / etiket / ara depo / tartım / proses kontrol + personel özlük import.

**Referans ekler (kullanıcı tarafından sağlanan):**
- `attached_assets/Pasted-Yeni-kapsam-G-da-m-hendisi-re-ete-hammadde-besin-de-eri_1777297416988.txt` — iş kuralı brief
- `attached_assets/UR-FH-FR-01_HAFİF_FIRINCILIK_PROSES_KONTROL_FORMU_1777297446761.pdf`
- `attached_assets/TF-02_TARTIM_KONTROL_FORMU_1777297446761.pdf`
- `attached_assets/ÜSF_01-ÜRETİME_SEVK_VE_ARA_DEPO_FORMU_1777297446761.pages` (binary, içerik brief'ten alındı)
- `attached_assets/PERSONEL_özlük_app_1777297446761.xlsx` — sayfalar: `Export Summary`, `ÇİZERGE` (28 satır, dikey tablo), `OFİS` (32 satır, yatay), `İMALATHANE ` (11 satır, yatay), `IŞIKLAR` (135 satır, yatay)

---

## 1) Mevcut sistemde NE VAR

### 1.A Hammadde / stok / tedarikçi (var, ama master code modeli zayıf)

| Tablo | Yer | İçerik |
|---|---|---|
| `inventory` | `shared/schema/schema-09.ts:907` | `itemCode`, `sku`, `barcode`, `unit`, `shelfLifeDays`, `minStockLevel`, kategori |
| `inventoryMovements` | `schema-09.ts:1006` | `batchNumber`, `expiryDate`, hareket tipi (`giris/cikis/transfer/uretim_giris/uretim_cikis/fire/iade`) |
| `inventoryPriceHistory` | `schema-09.ts:970` | Fiyat geçmişi |
| `suppliers` + `productSuppliers` | `schema-09.ts:1054, 1116` | Tedarikçi master + ürün-tedarikçi eşleşmesi |
| Mal kabul tablosu | `schema-09.ts:1263` | `supplierInvoiceNumber`, `deliveryNoteNumber` |
| `materialPickLogs` | `schema-23-mrp-light.ts:141` | `lotNumber`, `expiryDate` (kod yorumu: **"FEFO — en yakın SKT önce çekilir"**) |
| `productionLots` | `schema-12.ts:498` | `lotNumber` UNIQUE — üretim lot izlenebilirliği |
| `inventoryCounts` ailesi | `schema-11.ts:192/217/237/334` | Sayım planı + atama + entry + rapor |

**Gerçek durum:** Stok/lot/tedarikçi altyapısı **var**, fakat kullanıcının istediği **`internal_code` ↔ `supplier_product_code` ↔ `lot_code`** üçlü ayrımı tek kolonda (`itemCode`) toplanmış. `barcode` farklı bir konsept (ürün barkodu, tedarikçi kodu değil). FIFO/FEFO mantığı sadece kod yorumunda; DB-level constraint yok.

### 1.B Reçete + besin + alerjen (orta seviye var, food engineer onay statüsü eksik)

| Tablo / Sayfa | Yer | İçerik |
|---|---|---|
| `factoryRecipes` | `schema-22-factory-recipes.ts:82` | Reçete master, JSONB `nutrition_facts`, JSONB `allergens` |
| `factoryRecipeVersions` | `schema-22:373` | **Reçete versiyonlaması mevcut** |
| `factoryIngredientNutrition` | `schema-22:436` | Hammadde bazında besin değeri |
| `factoryIngredientNutritionHistory` | `schema-22:475` | Besin değeri tarihçesi (audit) |
| `factoryRecipeLabelPrintLogs` | `schema-22:618` | **Etiket basım denetim izi var** (taslak/onay statü makinesi YOK; sadece print log) |
| `client/src/pages/kalite/besin-onay.tsx` | — | **Gıda mühendisi besin onay sayfası ZATEN VAR**: `energyKcal`, `fatG`, `saturatedFatG`, `transFatG`, `carbohydrateG`, history, undo. Pending row → onay akışı çalışıyor. |
| `server/routes/factory-recipes.ts` | 2311 satır | Reçete CRUD + versiyon yönetimi |
| `server/routes/factory-allergens.ts` | 1281 satır | Alerjen master + reçete eşleme |
| `server/routes/factory-recipe-nutrition.ts` | 1249 satır | Besin değeri pipeline + onay |

**Gerçek durum:** Besin değeri **manuel onay akışı kuruluyor**. Eksik olan: kaynak önceliği bayrağı (`nutrition_source`), muafiyet bayrağı (`nutrition_required=false`), TürKomp entegrasyonu, EK-14 muafiyet kategorisi.

### 1.C Lot izleme & üretim (var)

- `client/src/pages/fabrika/lot-izleme.tsx` — lot statüleri (`uretildi/kalite_bekliyor/onaylandi/sevk_edildi/iptal/expired`)
- `client/src/pages/fabrika/gida-guvenligi.tsx` — gıda güvenliği sayfası
- `client/src/pages/fabrika/kalite-kontrol.tsx` + `client/src/pages/kalite-kontrol-dashboard.tsx`
- `client/src/pages/fabrika-stok-merkezi.tsx`, `client/src/pages/depo-centrum.tsx`
- `server/routes/factory-f2.ts` (266 satır) — üretim dashboard + vardiya entegrasyonu

### 1.D Personel özlük import altyapısı (çok güçlü, çok-sheet eksik)

`server/routes/hr-import-export.ts` (1514 satır) — **10 endpoint, batch + audit + rollback dahil hazır:**

```
POST   /api/hr/employees/export
POST   /api/hr/employees/import/dry-run
POST   /api/hr/employees/import/apply         (manifest: ik:create)
POST   /api/hr/employees/import/:batchId/rollback
GET    /api/hr/employees/import/batches
GET    /api/hr/employees/import/batches/:batchId
GET    /api/hr/employees/import/batches/:batchId/error-report
POST   /api/hr/employees/import/validate
POST   /api/hr/employees/import/preview
GET    /api/hr/employees/import/template
```

`users` (schema-02) tablosunda zaten var: `netSalary`, `tckn`, `hireDate`, `birthDate`, `mealAllowance`, `bonusBase`. `leaveRequests` (schema-03): izin bakiyesi.

**Eksik:** Mevcut import **tek sayfa Excel** üzerinden `IMPORT_FIELD_MAP` ile çalışır. PERSONEL özlük xlsx'in 4 sayfalı yapısı (ÇİZERGE dikey + OFİS/İMALATHANE/IŞIKLAR yatay format) için sayfa-bazlı parser yok.

**ÇİZERGE sütunları (28 satır, master tablo):**
```
SIRA NO | AD SOYAD | DEPARTMAN | Temel MAAŞ | PRİM | KASA TAZMİNATI | YAKIT elden | HAKEDİŞ |
DOĞUM TARİHİ | YAŞ (YIL) | İŞE GİRİŞ TARİHİ | KIDEM (YIL) | 2025 KALAN YILLIK İZNİ |
2026 HAK EDİLEN YILLIK İZİN | TOPLAM YILLIK İZİN HAKKI | OCAK..ARALIK İZNİ |
2026 KULLANILAN TOPLAM YILLIK İZİN | DEVİR YILLIK İZNİ MİKTARI
```

**OFİS / İMALATHANE / IŞIKLAR** — yatay format (her kişi 3 sütun): GİRİŞ tarihi, HAK EDİŞ tarihi, izin notu. Bu üç sayfa ÇİZERGE'den daha az yapılandırılmış.

---

## 2) EKSİK olan tablolar / kolonlar

### Kritik (P0) — yoksa yasal/operasyonel risk

1. **`raw_material_master` veya `inventory` ALTER:**
   - `internal_code` (sistem master, **immutable**, UNIQUE)
   - `nutrition_required` (boolean — EK-14 muafiyet)
   - `nutrition_source` enum (`supplier_spec / food_engineer_manual / turkomp / exempt`)
   - `food_engineer_approved_by`, `food_engineer_approved_at`

2. **`raw_material_supplier_codes`** (yeni) — tek hammadde, çoklu tedarikçi kodu.

3. **`raw_material_lots`** (yeni) — `lot_code`, `supplier_invoice_id`, `received_qty`, `expiry_date`, `received_at`, `current_qty`, `location`. (`inventoryMovements` hareket tutuyor; lot **state** tutmuyor.)

4. **`label_drafts`** (yeni) — `recipe_id`, `recipe_version_id`, `status` (`taslak / gida_muh_onayinda / onayli / revize_gerekli`), `approved_by`, `approved_at`, `pdf_url`, `legal_warnings_json`. (`factoryRecipeLabelPrintLogs` sadece basım kaydı tutar, **onay statü makinesi yok**.)

5. **`recipe_ingredient_usage`** (yeni) veya mevcut `factory_recipe_ingredients`'e ek:
   - `usage_purpose` (un işlem maddesi / antioksidan / aroma verici …)
   - `functional_class` (TGK GKM EK-I'e göre, **string enum**)
   - `e_number` (E300 gibi)
   - `legal_reference` (EK-I madde no)
   - `approved_by`, `approved_at`

   *Aynı E300 reçeteden reçeteye farklı sınıfta olabilmesi için **reçete-hammadde** seviyesinde, hammadde master'ında DEĞİL.*

### P1 — operasyonel kontrol formları

6. **`production_issue_documents` (ÜSF-01)** — `date`, `delivered_by`, `description`, durum.
7. **`production_issue_items`** — `document_id`, `raw_material_id`, `lot_id`, `qty_out`, `target_section`, `intermediate_remaining_qty`, `notes`.
8. **`intermediate_storage_labels`** — `lot_id`, `product_name`, `opened_at`, `qty_or_count`, `printed_by`, `qr_code`, `discarded_at`, `discard_reason`.
9. **`weighing_control_records` (TF-02)** — `date`, `product_id`, `raw_weight`, `fried_weight`, `filled_weight`, `coated_weight`, `final_weight`, `prepared_by_quality`, `approved_by_gm`.
10. **`process_control_cards` (UR-FH-FR-01)** — kart başlığı: `date`, `controlled_by`.
11. **`process_control_card_items`** — ürün satırı (un eleme, yumurta süzme, hammadde görsel, tartım, mayalama, pişirme/kızartma sıcaklık+süre, polar madde, merkez sıcaklık, süsleme görsel, soğutma, ani soğutma, ürün görsel, ambalaj görsel, alerjen).
12. **`process_control_periodic_checks`** — günde 3 zaman dilimi (`baslangic / ogle_sonra / bitis`): ekipman, toz, metal toz, açık cıvata, kirli yağlı bez, makine yağı, alerjen bulaşma — her bir checkbox + ✓/✗ + not.
13. **`nonconformity_disposals`** — uygunsuz/SKT dolan ürün imha kaydı.

### P2 — uzun vadeli

14. **`turkomp_nutrition_cache`** — TürKomp veri çekme + cache.
15. **`recipe_label_translations`** — çok dilli etiket (eğer ihracat planı varsa).

---

## 3) Genişletilecek frontend sayfaları

| Sayfa | Mevcut | Eklenmeli |
|---|---|---|
| `kalite/besin-onay.tsx` | Besin onay tablosu | Onay öncesi **kaynak rozeti** (Tedarikçi/GM/TürKomp/Muaf), EK-14 muafiyet butonu |
| `kalite-alerjen.tsx` | Alerjen listesi | Hammadde→reçete alerjen yayılma (cross-contamination), reçete versiyonu uyarısı |
| `fabrika-recete-detay.tsx` + `fabrika-recete-duzenle.tsx` | Reçete CRUD | **Recipe-ingredient-usage** seviyesinde fonksiyonel sınıf seçimi (TGK GKM EK-I dropdown), E-numarası, legal reference |
| `fabrika-receteler.tsx` | Reçete listesi | "Etiket onayı bekliyor" filtresi |
| **YENİ:** `kalite/etiket-onay.tsx` | yok | Reçete versiyonu → otomatik etiket taslağı → GM onay statü makinesi |
| `fabrika-stok-merkezi.tsx` + `depo-centrum.tsx` | Stok takip | **internal_code / supplier_code / lot_code** ayrı kolonlar, FEFO sıralı liste |
| **YENİ:** `fabrika/uretime-sevk.tsx` (ÜSF-01) | yok | Form + ara depo etiket yazdırma |
| **YENİ:** `fabrika/tartim-kontrol.tsx` (TF-02) | yok | Batch tartım kayıt + GM onay |
| **YENİ:** `fabrika/proses-kontrol.tsx` (UR-FH-FR-01) | yok | Üretim kontrol kartı + günlük 3 zaman dilimi periodic check |
| **YENİ:** `ik/ozluk-import.tsx` | yok | Çok-sheet (ÇİZERGE/OFİS/İMALATHANE/IŞIKLAR) seçim, sheet→branch eşleme, dry-run, fark, onay |
| `lot-izleme.tsx` | Lot statü tablosu | Lot → ÜSF-01 → Tartım → Proses Kontrol kartı zinciri (drill-down) |
| `maas.tsx` + `personel-detay.tsx` | Maaş/personel | Excel'den gelen `temel_maas + prim + kasa_tazminati + yakit_elden = hakedis` decomposition (ÇİZERGE şeması) |

---

## 4) Minimum migration planı (fiili çalışma)

> Aşağıdakilerin hiçbiri ŞİMDİ yazılmadı — sadece sıra ve kapsam.

| # | Adı | Açıklama |
|---|---|---|
| **M-01** | `inventory_master_codes_alter` | `inventory` ALTER → `internal_code`, `nutrition_required`, `nutrition_source`, `food_engineer_approved_*`. UNIQUE(`internal_code`). Mevcut `itemCode` korunur, yeni `internal_code` deprecation pathway. |
| **M-02** | `raw_material_supplier_codes_create` | YENİ `raw_material_supplier_codes` (FK→inventory, FK→suppliers, `supplier_product_code`, UNIQUE(supplier_id, supplier_product_code)). |
| **M-03** | `raw_material_lots_create` | YENİ `raw_material_lots` (FK→inventory, FK→suppliers, `lot_code`, `supplier_invoice_no`, `received_qty`, `current_qty`, `expiry_date`, `received_at`, `location`, soft delete). |
| **M-04** | `factory_recipe_ingredient_usage_create` | YENİ `factory_recipe_ingredient_usage` (FK→factory_recipe_ingredients, `usage_purpose`, `functional_class`, `e_number`, `legal_reference`, `approved_by`, `approved_at`). |
| **M-05** | `label_drafts_create` | YENİ `label_drafts` + `label_draft_revisions` (FK→factory_recipes, FK→factory_recipe_versions, `status` enum, `pdf_url`, `legal_warnings_json`). |
| **M-06** | `production_issue_create` | YENİ `production_issue_documents` + `_items` + `intermediate_storage_labels` (ÜSF-01). |
| **M-07** | `weighing_control_create` | YENİ `weighing_control_records` (TF-02). |
| **M-08** | `process_control_create` | YENİ `process_control_cards` + `_items` + `_periodic_checks` (UR-FH-FR-01). |
| **M-09** | `nonconformity_disposals_create` | Uygunsuz / SKT dolan ürün imha kaydı. |
| **M-10** | `users_payroll_extra_alter` | `users` ALTER → eksik özlük alanları (`kasa_tazminati`, `yakit_elden`, `aylik_izin_kullanim` JSON). |

> Her migration **sıraya göre ayrı dosya** olarak `migrations/00NN_<isim>.sql` ve `npx drizzle-kit generate` ile üretilmeli (replit.md'deki migration süreciyle uyumlu).

---

## 5) Ayrı tasklara bölünme önerisi

| Task # | Başlık | Kapsam | Süre tahmini |
|---|---|---|---|
| **T-A** | Hammadde Master Reform | M-01 + M-02 + M-03; `fabrika-stok-merkezi` + `depo-centrum` UI; FEFO sıralama servisi | 5-7 gün |
| **T-B** | Recipe-Ingredient Usage + TGK GKM EK-I | M-04; `fabrika-recete-duzenle` UI dropdown; functional_class enum | 3-4 gün |
| **T-C** | Etiket Onay Statü Makinesi | M-05; `kalite/etiket-onay.tsx`; `besin-onay.tsx`'e kaynak rozeti | 4-5 gün |
| **T-D** | Üretime Sevk + Ara Depo (ÜSF-01) | M-06; `fabrika/uretime-sevk.tsx`; etiket QR yazdırma | 5-6 gün |
| **T-E** | Tartım Kontrol (TF-02) | M-07; `fabrika/tartim-kontrol.tsx`; GM onay rotası | 2-3 gün |
| **T-F** | Hafif Fırıncılık Proses Kontrol (UR-FH-FR-01) | M-08; `fabrika/proses-kontrol.tsx`; günlük 3 periyot UI | 5-6 gün |
| **T-G** | Personel Özlük Multi-Sheet Import | Mevcut `hr-import-export.ts` üzerine çok-sheet wrapper; `ik/ozluk-import.tsx`; sheet→branch eşleme; **kiosk hariç** (zaten `f6bb4110b`'de çözüldü) | 4-5 gün |
| **T-H** | Besin Değeri Kaynak Önceliği + EK-14 Muafiyet | `factoryIngredientNutrition`'a kaynak/muafiyet alanı; `besin-onay.tsx` rozet UI | 3-4 gün |
| **T-I** | TürKomp Entegrasyonu | M-14 cache; otomatik fetch; manuel override izi | 5-7 gün (P2) |
| **T-J** | Uygunsuzluk / İmha Kayıt | M-09; lot drill-down imha modal; bağlı bildirim | 3-4 gün |

**Bağımlılıklar:**

- **T-B → T-A** (functional_class hammaddeye bağlı).
- **T-C → T-B + T-H** (etiket = recipe_usage + nutrition_source).
- **T-D → T-A** (lot_code zorunlu).
- **T-J → T-A + T-D**.
- **T-G** bağımsız (paralel başlatılabilir).
- **T-E, T-F** bağımsız (ürün/lot referansı opsiyonel olabilir).
- **T-I → T-H** (kaynak alanı önce gelmeli).

---

## 6) P0 / P1 / P2 sıralama

### P0 (1-3 hafta — yasal/regülasyon zorunlu)

1. **T-A** Hammadde master reform — internal_code/supplier_code/lot ayrımı yoksa izlenebilirlik denetiminde patlar.
2. **T-G** Personel özlük import — kullanıcı maaş/izin kontrolü için bekliyor; çok-sheet eksiği büyük blok.
3. **T-H** Besin kaynak önceliği — `besin-onay.tsx` zaten var, sadece kaynak rozetiyle yanlış besin değeri riski iner.

### P1 (3-6 hafta — operasyonel kontrol)

4. **T-B** Recipe-ingredient functional_class — TGK GKM uyumu için reçete üzerinden zorunlu.
5. **T-C** Etiket onay statü makinesi — `factoryRecipeLabelPrintLogs` üzerine kuruluyor, hızlı kazanç.
6. **T-D** ÜSF-01 (üretime sevk + ara depo) — fiziksel formdan dijitale geçiş.
7. **T-E** TF-02 (tartım kontrol) — hızlı, küçük, GM onay zinciri test eder.
8. **T-F** UR-FH-FR-01 (proses kontrol) — büyük form, batch süreciyle bağlanır.

### P2 (6+ hafta — uzun vadeli)

9. **T-J** Uygunsuzluk/imha kaydı.
10. **T-I** TürKomp entegrasyonu.

---

## 7) Riskler

### 7.A KVKK (Kişisel Verilerin Korunması)

- **Personel özlük Excel'i** maaş, prim, doğum tarihi, TC kimlik içeriyor. **Risk:** Yetkisiz erişim, log'da plaintext, geri alınamaz import.
- **Önlem:** `hr-import-export.ts`'in mevcut `requireManifestAccess("ik", "create")` zorunluluğu sürdürülmeli; çok-sheet importta da aynı manifest. `audit_logs` (schema-20-audit-v2) zorunlu. Excel dosyası geçici buffer'da kalmalı, disk'e yazılmamalı. Maaş kolonlarına ek "view: payroll_admin" guard.

### 7.B Etiket mevzuatı (Türk Gıda Kodeksi Etiketleme Yönetmeliği)

- **Risk:** Etiketin hatalı basılması ürün toplama (recall) sebebi. Reçete versiyonu değişip etiket eskide kalırsa **yasal sorumluluk firma üzerinde**.
- **Önlem:** `label_drafts.recipe_version_id` ZORUNLU FK. Reçete versiyonu değişimi → tüm aktif etiketler otomatik `revize_gerekli` statüsüne. GM onayı olmadan PDF basımı engellenir (route-level guard).

### 7.C Yanlış besin değeri

- **Risk:** Kaynak belirsizliği → yanlış kalori/karbonhidrat → tüketici şikayet + Tarım Bakanlığı denetim cezası.
- **Önlem:** `nutrition_source` enum **NOT NULL**. `food_engineer_approved_by` olmadan etiket geçemez. `factoryIngredientNutritionHistory` zaten var — her değişim audit'e düşmeli (T-H).

### 7.D Yanlış FIFO/FEFO

- **Risk:** SKT geçmiş hammadde üretime gider → ürün geri çağırma + müşteri zehirlenmesi.
- **Önlem:** `material_pick_logs` yorumu zaten "FEFO — en yakın SKT önce çekilir" diyor; **lakin DB-level constraint yok**. T-A içinde:
  1. `raw_material_lots.expiry_date` indexli `(item_id, expiry_date ASC, received_at ASC)`.
  2. Stok çekme servisi sadece bu sıraya göre lot önerir.
  3. **Manuel override** sadece `food_engineer` rolü + nedeni yazılı.

### 7.E Audit eksikliği

- **Mevcut:** `schema-20-audit-v2.ts` audit altyapısı var.
- **Risk:** Yeni tabloların (label_drafts, weighing, process_control, intermediate_storage_labels) audit'e bağlanmaması.
- **Önlem:** Her yeni tabloda `created_by`, `created_at`, `updated_by`, `updated_at` + `audit_logs`'a trigger/middleware. **Soft delete** (`deleted_at`) zorunlu — replit.md'deki "Soft Deletion" pattern'ı.

### 7.F Pilot riski

- Pilot şubeler (Erdem/Andre/Basri) zaten Komuta Merkezi 2.0'a alındı. Yeni reçete/etiket modülleri **fabrika rolünden başlamalı** (Eren), şubelerde sadece etiket görüntüleme. Üretim kontrol formları yalnızca fabrika `kalite` ve `gida_muh` rollerine açık olmalı.

### 7.G Excel import schema-drift

- Personel özlük Excel'inde `OFİS`, `İMALATHANE`, `IŞIKLAR` sayfaları **yatay format** (kişi başına 3 sütun), `ÇİZERGE` **dikey format** (klasik tablo).
- **Risk:** Tek bir parser ile çözülmez; sayfa-bazlı şema haritası gerekir.
- **Önlem:** T-G'de sayfa-format-detection (otomatik header tanıma + manuel düzeltme UI'ı). Header eşleme tablosu `IMPORT_FIELD_MAP_BY_SHEET` benzeri yapı.

---

## 8) Sonraki adım

Bu rapor analiz çıktısıdır. Hiçbir kod, schema, migration değiştirilmedi.

**Önerilen yol:**
1. Bu raporu commit'le (yapıldı).
2. Plan mode'a geç ve **T-A, T-G, T-H** için 3 ayrı project task aç (P0 sırası).
3. T-A merge sonrası **T-B → T-C → T-D** zinciri.
4. **T-E, T-F** paralel başlatılabilir.
5. **T-J** ve **T-I** P2 — sona bırakılır.

---

*Üreten: Replit Agent — read-only analiz, 27 Nisan 2026*
*Kaynak: shared/schema/schema-09.ts, schema-22-factory-recipes.ts, schema-23-mrp-light.ts, server/routes/hr-import-export.ts, server/routes/factory-recipes.ts, server/routes/factory-recipe-nutrition.ts, server/routes/factory-allergens.ts, client/src/pages/kalite/besin-onay.tsx, client/src/pages/fabrika/lot-izleme.tsx*
