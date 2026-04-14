# DOSPRESSO Devir Teslim — 14 Nisan 2026
## Son Commit: 01540cd0 | Sistem: 463 tablo (schema), 430 (DB), 1708 endpoint, 313 sayfa, 30 rol

---

## 1. OTURUM ÖZETİ

Bu oturumda 9 commit, ~20 dosya değişti.
Devir teslim listesindeki tüm işler + Replit raporundan gelen ek sorunlar + gıda mühendisi rol analizi tamamlandı.

---

## 2. TAMAMLANAN İŞLER

### 2.1 Motor Birleştirme (Unified Payroll Engine) ✅
- `monthly_payroll` tablosuna +15 kolon (SGK, vergi, AGI, dataSource, calculationMode, cumulativeTaxBase)
- `payroll-bridge.ts` tamamen yeniden yazıldı:
  - Excel adapter (pdks_daily_summary → PdksMonthSummary)
  - kiosk/excel dual source
  - saveUnifiedResults() — DB'ye kayıt
  - Kümülatif vergi matrahı önceki aylardan doğru okuyor
- Her iki endpoint (`/calculate` + `/calculate-unified`) artık unified motoru kullanıyor
- Transaction + DB kayıt
- Replit test: 20 personel (2 şube) hesaplandı ✅

### 2.2 Sidebar Rol Çakışmaları ✅
- `ModuleMenuItem`'a `allowedRoles?: string[]` eklendi
- `RouteModuleSidebar.tsx`: useAuth + allowedRoles filtreleme + boş menü gizleme
- 3 sorunlu öğe düzeltildi:
  - `/duyurular`: 15 HQ rolü (HQOnly guard ile uyumlu)
  - `/canli-takip`: 11 executive rolü (ExecutiveOnly guard ile uyumlu)
  - `/receteler`: AKADEMI_MENU'den kaldırıldı, path mapping FABRIKA_MENU'ye taşındı
- 30 rol × 2 sayfa matris doğrulaması: 0 çakışma

### 2.3 Sidebar Active Highlight ✅
- `getActiveMenuItemForPath`: window.location.search ile query param desteği
- `/akademi?tab=egitimler`, `?tab=webinar`, `?tab=kariyer` artık doğru highlight
- 3 aşamalı eşleştirme: full URL exact → clean path exact → starts-with

### 2.4 sql.raw Refactoring ✅
- `production-planning-routes.ts`: 18 → 0 (tam yeniden yazım, sql tagged template)
- `inventory-count-routes.ts`: 1 → 0 (sql.join IN clause)
- `operations.ts`: 1 → 0 (make_interval parametrize)
- Toplam: 23 → 10 (13 eliminasyon)
- Kalan 10: dashboard-data (3), unified-dashboard (3), seed (3), system-health (1)

### 2.5 moduleFlags Seed Fix ✅
- `DROP INDEX IF EXISTS` → `ALTER TABLE DROP CONSTRAINT IF EXISTS` + `DROP INDEX IF EXISTS`
- Her boot'ta çıkan "cannot drop index" hatası tamamen düzeldi
- Replit doğrulama: [SEED] Module flags: 79/79 flags upserted ✅

### 2.6 product_recipes Migrasyon ✅
- 12 kayıt product_recipes → factory_recipes kopyalandı (Replit DB)
- factory_recipes: 1 eski + 12 yeni = 13 toplam
- product_recipes tablosu korundu (silinmedi)

### 2.7 Skill Dosyaları Güncelleme ✅
- `dospresso-architecture`: 463 tablo, 1708 endpoint, 30 rol, unified payroll engine, 3 yeni fabrika rolü, reçete sistemi, ROLE_MAPPING dokümantasyonu
- `dospresso-quality-gate`: +3 yeni madde (19: sql.raw baseline, 20: sidebar↔route, 21: payroll unified) → 21 madde

### 2.8 Fabrika Rol Fix ✅
- `protected-route.tsx`: sef, recete_gm, uretim_sefi → fabrika grubu (FabrikaOnly erişim)
- `menu-service.ts`: gida_muhendisi sidebar'ına factory-recipes eklendi (read-only)
- Bu fix olmadan 3 fabrika rolü hiçbir FabrikaOnly sayfaya erişemiyordu

### 2.9 Reçete Versiyonlama Altyapısı ✅
- `factory_production_logs`: +recipeVersionId, +recipeVersionNumber (üretim→versiyon bağlantısı)
- `factory_recipe_versions`: +costSnapshot (maliyet snapshot'ı per versiyon)
- `start-production` endpoint: aktif reçete versiyonunu otomatik yakalar
- Otomatik versiyon oluşturma (PATCH → snapshot) Sprint 2'de planlanıyor

### 2.10 Gıda Mühendisi Yetki Temizliği ✅
- gida_muhendisi: branch_orders→[], branch_inventory→[], branch_inspection→[view]
- Sema sadece fabrikada, şube işlemleri Coach/Trainer'a ait

### 2.11 Gıda Mühendisi Analiz & MRP-Light Tasarımı ✅
- 373 satırlık planlama dokümanı: `docs/GIDA-MUHENDISI-ANALIZ-VE-MRP-TASARIMI.md`
- 11 eksik gıda mühendisi işlevi tespit edildi
- 7 aksiyon→etki senaryosu (QC ret, HACCP fail, allerjen güncelleme, hammadde ret, reçete değişikliği, artan malzeme, malzeme çekme)
- 4 yeni tablo tasarımı (daily_material_plans, plan_items, leftovers, pick_logs)
- 5 fazlı uygulama planı (F0-F5)

---

## 3. REPLİT TEST DURUMU

| Commit | Test | Sonuç |
|--------|------|:-----:|
| d3ff92bd (Motor birleştirme) | DB migration + API + 20 personel | ✅ |
| 64c2c950 (Sidebar rol fix) | Build + rol filtreleme | ✅ |
| bbf0cc21 (Sidebar highlight) | Build + mantıksal simülasyon | ✅ |
| fdbc1c57 (sql.raw + seed fix) | Build + seed log + API test | ✅ |
| c7611876 (Fabrika rol fix) | ROLE_MAPPING + sidebar | ✅ |
| 3438ed8e (Reçete versiyonlama) | DB migration + API + login | ✅ |

---

## 4. BİLİNEN SORUNLAR

1. **Reçete→Inventory bağlantısı KOPUK**: 14 ingredient'ın tamamında raw_material_id=NULL. MRP-Light için önkoşul
2. **Inventory verisi eksik**: DB'de 115 malzeme, Excel'de 408. Kategori isimleri farklı
3. **Depocu rolü YOK**: Sistemde tanımlı değil, oluşturulması gerekiyor
4. **Birim dönüşümü**: Excel KG/ADET, reçeteler gram kullanıyor
5. **İki fiyat katmanı**: Piyasa fiyatı (güncel) vs gerçek stok maliyeti (alım fiyatı) — ikisi farklı
6. **factory_recipe_versions boş**: Henüz hiç versiyon oluşturulmamış (beklenen — Sprint 2'de otomatik)
7. **sql.raw kalan 10**: dashboard-data (3+3), seed (3), system-health (1)
8. **6 orphan sayfa dosyası**: erişilemiyor, ölü kod

---

## 5. YENİ OTURUMDA YAPILACAK

| # | İş | Süre | Öncelik |
|---|-----|------|:-------:|
| 1 | Inventory fiyat yapısı (piyasa + stok maliyeti) | 2-3 saat | 🔴 |
| 2 | Excel import → inventory + fiyat geçmişi (408 malzeme) | 3-4 saat | 🔴 |
| 3 | Reçete → inventory bağlantısı (raw_material_id) | 2 saat | 🔴 |
| 4 | Otomatik reçete versiyonlama (PATCH → snapshot) | 2-3 saat | 🟡 |
| 5 | Satınalma aylık fiyat hatırlatma (Dobody) | 1 saat | 🟡 |
| 6 | Depocu rolü oluşturma | 1 saat | 🟡 |
| 7 | Malzeme çekme (MRP-Light) — 4 tablo + API | 4-6 saat | 🟡 |
| 8 | Dashboard widgetları (gıda müh. + RGM) | 3-4 saat | 🟢 |
| 9 | Control Centrum v4 (15 rol dashboard) | 8+ saat | 🟢 |

---

## 6. KURALLAR (her oturum başında oku)

1. İLK İŞ: Bu dosyayı oku + git pull
2. 4+ skill dosyası oku: architecture, quality-gate, debug-guide, sprint-planner, radix-safety, control-centrum
3. Çift yetki: module-manifest.ts + schema-02.ts birlikte güncelle
4. Token ASLA dosya içine yazılmaz
5. QG#19: sql.raw baseline 10 — yeni sql.raw ekleme
6. QG#20: Sidebar ↔ Route koruma uyumu kontrol
7. QG#21: Payroll unified kolonları doğrula
8. Replit talinatı: SADECE DB+build+test (~30 satır)
9. Claude: kod doğrulama, skill, sayısal kontrol, denetim, doküman

---

## 7. GÜNCEL SAYILAR

| Metrik | Değer |
|--------|:-----:|
| Tablo (schema) | 463 |
| Tablo (DB) | 430 |
| Endpoint | 1708 |
| Sayfa | 313 |
| Rol | 30 |
| Route dosyası | 111 |
| Schema dosyası | 22 |
| Skill dosyası | 6 (güncel) |
| sql.raw kalan | 10 |
| QG madde | 21 |
