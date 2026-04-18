# Sprint D — Satınalma + Bordro Kod Analizi

**Tarih:** 18 Nisan 2026 (Cumartesi öğleden sonra)
**Hazırlayan:** Claude (IT Danışman)
**Durum:** Kod analizi tamam, Replit DB doğrulaması beklemede

---

## 🎯 Amaç

Sprint D için önceki plan: "Satınalma modülü + Bordro hesaplama job"
Şimdi **gerçek durumu** kod tarafından inceleyelim, doğru kapsamı çıkaralım.

---

## 📦 BÖLÜM 1 — SATINALMA (Purchase/Procurement)

### Tablolar (12 tane)

| Tablo | Dosya | Amaç |
|-------|-------|-----|
| `suppliers` | schema-09.ts | Tedarikçi ana kaydı |
| `product_suppliers` | schema-09.ts | Ürün ↔ tedarikçi N:N ilişki |
| `purchase_orders` | schema-09.ts | Satınalma siparişi (ana) |
| `purchase_order_items` | schema-09.ts | Sipariş kalemleri |
| `purchase_order_payments` | schema-11.ts | Ödeme takibi |
| `supplier_performance_scores` | schema-11.ts | Tedarikçi skoru |
| `supplier_quotes` | schema-11.ts | Teklif (fiyat listesi) |
| `supplier_issues` | schema-11.ts | Tedarikçi sorunları |
| `supplier_certifications` | schema-11.ts | Sertifikalar (gıda güv.) |
| `branch_orders` | schema-08.ts | Şubenin fabrika/HQ'ya sipariş |
| `branch_order_items` | schema-08.ts | Şube sipariş kalemleri |
| `project_vendors` | schema-06.ts | Franchise proje tedarikçi (dormant) |

**Sonuç:** Satınalma **iki ayrı akış**:
1. **HQ → Harici Tedarikçi:** `purchase_orders`, `suppliers`, `goods_receipts`
2. **Şube → HQ/Fabrika:** `branch_orders` (franchise şubeleri HQ'ya sipariş verir)

### Route Dosyaları (3 dosya)

| Dosya | Endpoint | Satır | Amaç |
|-------|:--:|:--:|-----|
| `server/satinalma-routes.ts` | **50** | 2,284 | Ana satınalma modülü (inventory, suppliers, PO, goods receipts) |
| `server/routes/branch-orders.ts` | 5 | 356 | Şubeden HQ'ya sipariş |
| `server/routes/supplier-performance-routes.ts` | 6 | 188 | Tedarikçi performans skoru |

**TOPLAM:** 61 satınalma endpoint, 2,828 satır kod

### Frontend Sayfaları (9 sayfa)

`client/src/pages/satinalma/` altında:
- `satinalma-dashboard.tsx` — Ana dashboard
- `siparis-yonetimi.tsx` — Sipariş yönetimi
- `tedarikci-yonetimi.tsx` — Tedarikçi yönetimi
- `mal-kabul.tsx` — Goods receipt (mal kabul)
- `sayim-yonetimi.tsx` — Envanter sayımı
- `stok-yonetimi.tsx` — Stok durumu
- `urun-karti.tsx` — Ürün kartı
- `cari-takip.tsx` — Cari hesap takibi
- `trend-analizi.tsx` — Trend analizi

**9 sayfa çok iyi UI kapsamı demek.**

### Satınalma Register Durumu

```typescript
// server/routes.ts
import { registerSatinalmaRoutes } from "./satinalma-routes";  // satır 7
// ...
registerSatinalmaRoutes(app, isAuthenticated);  // satır 1217  ← app.use pattern değil, function call
```

Not: 50 endpoint `app.get/post` pattern'iyle tanımlı, `router` değil.

### Frontend Endpoint Kullanım Haritası

Frontend 17 farklı `/api/` pattern çağırıyor:
```
/api/branches, /api/cari, /api/factory-workers, 
/api/goods-receipt-items, /api/goods-receipts, 
/api/inventory, /api/inventory-count-entries,
/api/inventory-count-reports, /api/inventory-counts,
/api/product-suppliers, /api/purchase-order-payments,
/api/purchase-orders, /api/satinalma, /api/supplier-issues,
/api/supplier-performance-scores, /api/supplier-quotes,
/api/suppliers
```

### 🎯 Satınalma Mevcut Durum Tahmini

**İyi:** Kod çok geniş, 50+ endpoint, 9 UI sayfa, iki ayrı akış doğru modellenmiş  
**Kötü:** Sprint A raporumda "tüm modül kırık" demiştim — ama Sprint A1 kırık link temizliğinde satınalma kırık linkleri vardı, düzeltildi. Şimdi sağlamlık durumu DB doğrulamasıyla test edilmeli.

### Satınalma için Replit'e Sorular

```sql
-- 1. Kullanım oranı
SELECT 'suppliers' as tbl, COUNT(*) FROM suppliers
UNION ALL SELECT 'purchase_orders', COUNT(*) FROM purchase_orders
UNION ALL SELECT 'purchase_order_items', COUNT(*) FROM purchase_order_items
UNION ALL SELECT 'goods_receipts', COUNT(*) FROM goods_receipts
UNION ALL SELECT 'goods_receipt_items', COUNT(*) FROM goods_receipt_items
UNION ALL SELECT 'branch_orders', COUNT(*) FROM branch_orders
UNION ALL SELECT 'branch_order_items', COUNT(*) FROM branch_order_items
UNION ALL SELECT 'product_suppliers', COUNT(*) FROM product_suppliers
UNION ALL SELECT 'supplier_performance_scores', COUNT(*) FROM supplier_performance_scores
UNION ALL SELECT 'supplier_quotes', COUNT(*) FROM supplier_quotes
UNION ALL SELECT 'supplier_issues', COUNT(*) FROM supplier_issues
UNION ALL SELECT 'supplier_certifications', COUNT(*) FROM supplier_certifications
UNION ALL SELECT 'purchase_order_payments', COUNT(*) FROM purchase_order_payments;

-- 2. Son 30 günde aktif mi?
SELECT DATE_TRUNC('day', created_at) as day, COUNT(*) 
FROM purchase_orders 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY day ORDER BY day DESC;

-- 3. Status dağılımı (kaç PO hangi aşamada?)
SELECT status, COUNT(*) FROM purchase_orders GROUP BY status;
```

---

## 💰 BÖLÜM 2 — BORDRO (Payroll)

### 🔴 KRİTİK: 3 PARALEL BORDRO TABLOSU!

```
schema-07.ts:
  - monthly_payrolls       (eski bordro — base_salary, workedDays)
  - payroll_records        (kuruş bazlı bordro)

schema-12.ts:
  - monthly_payroll        (yeni bordro — positionCode, workedDays)

schema-07.ts (yardımcı):
  - salary_deduction_types   (kesinti tipleri)
  - salary_deductions         (uygulanan kesintiler)
  - payroll_parameters        (parametreler: min. maaş vs)

schema-09.ts (rapor):
  - branch_monthly_payroll_summary

schema-11.ts:
  - salary_scales             (maaş skalası — pozisyon bazlı)

schema-12.ts (config):
  - payroll_deduction_config  (kesinti konfigürasyonu)
```

### Bu Gerçek Konsolidasyon Sorunu!

**3 tablo birbirine benzer alanlara sahip:**

```
monthly_payrolls:   userId + branchId + month + year + baseSalary + workedDays
monthly_payroll:    userId + branchId + month + year + positionCode + workedDays
payroll_records:    userId + branchId + periodYear + periodMonth + kuruş
```

**Hangisi doğru?** Hiçbiri silinemez çünkü:
- İsim farklı (monthly_payrolls vs monthly_payroll) = Drizzle'da iki tablo
- Aynı anda INSERT yapılıyor mu? Bilinmiyor
- Frontend hangisini çağırıyor? Test edilmeli

### Route Dosyaları (2 dosya, 15 endpoint)

**`server/routes/payroll.ts` (583 satır, 10 endpoint):**
```
POST /api/pdks-payroll/calculate       — Hesapla
GET  /api/pdks-payroll/summary          — Özet
GET  /api/pdks-payroll/my               — Kendi bordron
GET  /api/pdks-payroll/positions        — Pozisyonlar
GET  /api/pdks-payroll/branches         — Şubeler
GET  /api/pdks-payroll/:userId          — Kullanıcı bordrosu
PATCH /api/pdks-payroll/:id/approve     — Onayla
POST /api/payroll/calculate-detailed    — Detaylı hesap
GET  /api/payroll/export/pdf/:y/:m      — PDF export
POST /api/payroll/calculate-unified     — Birleşik hesap
```

**`server/routes/payroll-config.ts` (268 satır, 5 endpoint):**
```
GET   /api/payroll/deduction-config                 — Kesinti config listesi
GET   /api/payroll/deduction-config/effective       — Aktif config
POST  /api/payroll/deduction-config                 — Yeni config
PATCH /api/payroll/deduction-config/:id             — Config güncelle
DELETE /api/payroll/deduction-config/:id            — Config sil
```

### 3 Farklı Calculation Endpoint!

Dikkat çekici: **3 tane "hesapla" endpoint'i var:**
1. `/api/pdks-payroll/calculate` — PDKS bazlı
2. `/api/payroll/calculate-detailed` — Detaylı
3. `/api/payroll/calculate-unified` — Birleşik

Bu **"motor birleştirme" iddiasının kanıtı**. Önceki Devir Teslim dokümanında (14 Nis 2026) "Motor birleştirme (unified payroll)" işi tamamlandı yazıyordu. Ama 3 endpoint hala yan yana duruyor. **Hangisi kullanılıyor?**

### Frontend Sayfaları (3 sayfa)

- `bordrom.tsx` — Kullanıcının kendi bordrosu
- `maas.tsx` — Maaş yönetimi (HR)
- `sube-bordro-ozet.tsx` — Şube bordro özeti

### 🔴 Replit Raporu (Sprint B): `payroll_records = 0`

Bu kritik! **3 tablolu sistem ama hiçbirinde kayıt yok** — demek ki:
- Calculator endpoint'leri **test edilmemiş**
- Bordro dönemleri hiç açılmamış
- PDKS aggregate bozuk (Sprint B'nin işi) → bordro neye göre hesaplayacak?

### Bordro Dependency Chain

```
Pilot'ta bordro çalışması için gerekenler:

1. Sprint B: PDKS → shift_attendance aggregate   ← BOZUK, Sprint B'de düzelecek
                  ↓
2. Sprint D: shift_attendance → monthly_payroll  ← CALCULATOR ENDPOINT'LERİ
                  ↓
3. Sprint D: monthly_payroll → PDF/report        ← EXPORT ENDPOINT MEVCUT
                  ↓
4. Pilot: Muhasebe bordroyu görür + onaylar
```

**Sprint D Sprint B'ye BAĞIMLI** — Sprint B bitmeden Sprint D test edilemez.

---

## 🎯 Sprint D — Gerçek Kapsam (Revize)

### Önceki Plan:
> "Satınalma modülü + Bordro hesaplama job"

### Revize Plan:

**Sprint D.1: Bordro Tablo Konsolidasyon (1 gün)** 🔴 KRİTİK
- `monthly_payrolls` (eski) vs `monthly_payroll` (yeni) hangisi?
- `payroll_records` (kuruş bazlı) gerçekten ayrı amaç mı yoksa dublikat mı?
- Karar: **tek tablo + legacy deprecated**
- Eski tablolar için "archive" + "yeni tablo kullan" yönlendirmesi

**Sprint D.2: Calculator Endpoint Birleştirme (1 gün)**
- 3 endpoint → 1 tane (`/api/payroll/calculate-unified` zaten "unified")
- Eski 2'yi deprecated yap (stub ile `_deprecated: true` response)
- Frontend'de hangi çağrılıyor → ona yönlendir

**Sprint D.3: Bordro End-to-End Test (1 gün)**
- 1 test kullanıcısı seç (örnek: bir Lara baristası)
- Sprint B tamamen bitmişse: shift_attendance verisi var
- Calculator çalıştır → monthly_payroll kayıt oluştur
- PDF export test et
- 1 başarılı bordro = tüm akış çalışıyor demek

**Sprint D.4: Satınalma Smoke Test (0.5 gün)**
- Satınalma kodu çalışıyor mu sadece kontrol
- Frontend'de bir PO oluştur → goods receipt → tamamla
- Eğer kırık bir şey varsa Sprint A'da yakalanmamış → düzelt

### Süre Tahmini: 3-4 gün (Hafta 4, Pazartesi-Perşembe)

---

## 📋 Acceptance Kriterleri

| # | Kriter | Hedef |
|:-:|--------|-------|
| 1 | Bordro tablo net | 1 tablo kullanımda, 2 deprecated |
| 2 | Calculator tek endpoint | `/api/payroll/calculate-unified` resmi |
| 3 | Bir test kullanıcı bordrosu | `monthly_payroll` tablosunda 1 kayıt |
| 4 | PDF export başarılı | Örnek bordro PDF'i açılıyor |
| 5 | Satınalma smoke test | 1 PO + 1 goods receipt akışı sorunsuz |

---

## 🚧 Bağımlılıklar

- **Sprint B → D:** Bordro, PDKS aggregate'e bağımlı. B bitmeden D test edilemez.
- **Sprint C → D:** Bağımsız, paralel gidebilir.

---

## 📦 Son Söz

Sprint D **iki farklı modül** içeriyor:

1. **Satınalma:** Kod sağlam gibi görünüyor (50 endpoint, 9 UI sayfa), sadece smoke test lazım
2. **Bordro:** 🔴 **GERÇEK KONSOLİDASYON SORUNU** — 3 tablo, 3 calculator endpoint

"Motor birleştirme tamamlandı" iddiasının gerçekten olup olmadığı DB kontrolüyle netleşecek. Sprint D esas işi **bordro temizlik**.
