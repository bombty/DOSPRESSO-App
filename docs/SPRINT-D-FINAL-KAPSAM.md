# Sprint D — Bordro Schema Temizliği + Satınalma Aktivasyonu (FINAL KAPSAM)

**Tarih:** 18 Nisan 2026 (Cumartesi akşam — Replit 3. tur DB doğrulaması sonrası)
**Replit raporu:** Sprint D+E Birleşik DB Doğrulama Raporu
**Durum:** Kapsam NETLEŞTİ — Bordro konsolidasyon DEĞİL, Satınalma AKTİVASYON kritik

---

## 🔄 Önceki Plan vs Yeni Plan

### ❌ Önceki Hedef (BÜYÜK DÜZELTME)
> "Bordro 3 tablo konsolidasyonu — monthly_payrolls vs monthly_payroll vs payroll_records"

Bu **yanlış teşhisti**. Kod analizi doğruydu (3 tablo var) ama DB gerçeği farklı:

```
monthly_payroll (yeni):   51 kayıt ✅ AKTİF (2 ay, 51 user)
monthly_payrolls (eski):   0 kayıt ❌ dead schema
payroll_records (ayrı):    0 kayıt ❌ farklı amaçlı/boş
```

"Motor birleştirme tamamlandı" iddiası DOĞRUYMUŞ. Yeni motor 51 kayıt üretmiş. Sorun konsolidasyon değil, **eski schema temizliği**.

### ✅ Yeni Hedef (Replit 3. tur doğrulaması sonrası)
> "Bordro Eski Schema Temizliği + Satınalma Aktivasyonu (branch_orders + goods_receipts)"

**Sebep:** Bordro zaten çalışıyor, asıl pilot riski **Satınalma'da fiilen hiç akış olmaması.** Fabrika → Şube sevkiyatı `branch_orders` tablosundan geçer, şu an **0 kayıt.**

---

## 🔴 Kritik Bulgular

### 1. Bordro Aslında Çalışıyor (monthly_payroll = 51)

```
user_count:    51 farklı kullanıcı
period:        2026-03 + 2026-04 (2 ay)
endpoint:      /api/payroll/calculate-unified
```

Ne demek bu:
- ✅ Bordro motoru fiilen çalışıyor
- ✅ Unified calculator endpoint üretim için kullanılıyor
- ❌ Ama eski tablolar (`monthly_payrolls`, `payroll_records`) schema'da hala var — kafa karışıklığı
- ❌ UI bazı yerlerde eski tabloya referans ediyor olabilir

### 2. Satınalma FIILEN DORMANT (Pilot Riski!)

| Tablo | Kayıt | Durum |
|-------|:--:|:--|
| `suppliers` | 5 | ✅ Tanımlı |
| `purchase_orders` | 1 (taslak) | 🔴 Sipariş hiç yapılmamış |
| `goods_receipts` | 0 | 🔴 Mal kabul HİÇ yapılmamış |
| `branch_orders` | 0 | 🔴🔴 **Şube→fabrika sipariş HİÇ yapılmamış** |
| `branch_order_items` | 0 | 🔴 |
| `product_suppliers` | yok | ❌ Tablo bile yok (schema'da var, DB'de yok — drift) |
| `supplier_quotes` | 0 | ⚠️ |
| `supplier_performance_scores` | 0 | ⚠️ |

**Pilot için kritik eksiklik:**
- **`branch_orders` = 0** → Fabrika'dan şubelere sevkiyat **DOSPRESSO üzerinden yapılmıyor**
- Şu an dış sistem kullanılıyor (Aslan'ın onayladığı)
- Ama **pilot öncesi şubelerin DOSPRESSO'dan sipariş vermesini** istersen, UI + akış aktif edilmeli
- **`goods_receipts` = 0** → Mal kabul akışı hiç test edilmemiş

---

## 🎯 Sprint D — Replit'in Önerdiği 5 Alt-Sprint

### D.1: Bordro Eski Schema Arşivi (0.5 gün) 🟡

**Amaç:** `monthly_payrolls` ve `payroll_records` tablolarını DROP veya `_archived` suffix

**Adımlar:**
1. Frontend'de referans kontrolü: bu tabloları kullanan UI var mı?
2. Backend endpoint kontrolü: bu tablolara yazan/okuyan route var mı?
3. Güvenli migration:
   ```sql
   -- Opsiyon A: Rename (geri dönülebilir)
   ALTER TABLE monthly_payrolls RENAME TO _archived_monthly_payrolls_20260418;
   ALTER TABLE payroll_records RENAME TO _archived_payroll_records_20260418;
   
   -- Opsiyon B: DROP (sert ama temiz)
   DROP TABLE monthly_payrolls;
   DROP TABLE payroll_records;
   ```
4. schema-07.ts'den tablo tanımlarını kaldır (ya da `@deprecated` yorum ekle)

**Acceptance:** `monthly_payroll` tek bordro tablosu, eski 2 tablo arşivlendi

### D.2: Bordro UI Sabitleme (1 gün) 🟡

**Amaç:** Bordro sayfaları kesinlikle `monthly_payroll`'a (yeni) referans versin

**Adımlar:**
1. `client/src/pages/bordrom.tsx` kontrol (kullanıcının kendi bordrosu)
2. `client/src/pages/maas.tsx` kontrol (HR yönetimi)
3. `client/src/pages/sube-bordro-ozet.tsx` kontrol
4. Eski tabloya referans varsa `monthly_payroll`'a çevir
5. Test: 1 kullanıcıyla 1 aylık bordro görüntülensin

**Acceptance:** 3 bordro sayfası `monthly_payroll` kullanıyor, 51 kayıt doğru görünüyor

### D.3: Payroll Config Seed (0.5 gün) 🟡

**Amaç:** `payroll_deduction_config` (0 kayıt) tablosunu parametrelerle doldur

**Adımlar:**
1. `salary_deduction_types` (8 tip) + `payroll_parameters` (2 parametre) birleştir
2. Standard config oluştur (SGK oranı, gelir vergisi, AGİ, yemek kesintisi vs)
3. Seed script: `server/scripts/seed-payroll-deduction-config.ts`
4. Ön test: 1 kullanıcıda kesinti hesaplaması düzgün mü

**Acceptance:** `payroll_deduction_config` dolu, bordro hesaplama kesintileri dahil çalışıyor

### D.4: Branch Orders Aktivasyonu (1.5 gün) 🔴 **PİLOT KRİTİK**

**Amaç:** Şubeler günlük olarak DOSPRESSO üzerinden fabrikaya sipariş versin

**Adımlar:**
1. Mevcut `branch_orders` + `branch-orders.ts` route'u incele (5 endpoint var)
2. Frontend'de şube sipariş sayfası var mı? (`satinalma/siparis-yonetimi.tsx`)
3. Eksiklikleri tamamla:
   - Şube supervisor → "Günlük sipariş oluştur" butonu
   - Ürün seç + miktar + teslim tarihi
   - Fabrika tarafında onay akışı
   - Mal gönderildi → şubede mal kabul (D.5 ile bağlı)
4. 1 test şubesi ile end-to-end akış

**Acceptance:** 1 test şubesi günlük sipariş verir, fabrika onaylar, mal sevk edilir, kayıt `branch_orders` tablosunda

### D.5: Goods Receipts Aktivasyonu (1 gün) 🔴 **PİLOT KRİTİK**

**Amaç:** Mal kabul akışı kapalı çemberi tamamlar

**Adımlar:**
1. `/api/goods-receipts` endpoint kontrol
2. `client/src/pages/satinalma/mal-kabul.tsx` çalışıyor mu?
3. Barkod okuma (şube tableti)
4. Manuel giriş (alternatif)
5. Farkla girişte (eksik/fazla) flag
6. Stok tablosuna otomatik aktarım

**Acceptance:** Şube mal geldiğinde kaydeder, stok otomatik güncellenir, fark varsa bildirim

---

## 📋 Sprint D Toplam

| Alt-Sprint | Süre | Kritiklik |
|:--:|:--:|:--:|
| D.1 Bordro Eski Schema Arşivi | 0.5g | 🟡 |
| D.2 Bordro UI Sabitleme | 1g | 🟡 |
| D.3 Payroll Config Seed | 0.5g | 🟡 |
| D.4 Branch Orders Aktivasyonu | 1.5g | 🔴 |
| D.5 Goods Receipts Aktivasyonu | 1g | 🔴 |
| **TOPLAM** | **4.5 gün** | - |

Paralel çalışmayla **3-4 güne düşebilir** (bordro ve satınalma farklı dosyalarda).

---

## 🚧 Bağımlılıklar

- **Sprint B → D (KRİTİK):** Sprint B attendance pipeline düzeltmesi olmadan bordro aggregate riskli
- **Sprint D ← B KONTROL:** monthly_payroll veri kaynağı (Replit uyarısı):
  - Acaba doğrudan pdks_records'tan besleniyor?
  - Yoksa başka bir job'dan?
  - Sprint B'de shift_attendance aggregate düzeldiğinde **duplicate hesap** riski var mı?
  - **İlk iş:** `grep -rn "monthly_payroll" server/scripts/ server/schedulers/` ile veri kaynağını bul

---

## 📦 Commit Stratejisi

Her alt-sprint ayrı commit:
```
feat(bordro): Sprint D.1 — Eski bordro tabloları arşivle (monthly_payrolls + payroll_records)
feat(bordro): Sprint D.2 — UI monthly_payroll'a sabitlendi (3 sayfa)
chore(bordro): Sprint D.3 — payroll_deduction_config seed (8 tip)
feat(satinalma): Sprint D.4 — Branch orders aktivasyonu (şube→fabrika sipariş)
feat(satinalma): Sprint D.5 — Goods receipts aktivasyonu (mal kabul)
```

---

## 💡 Son Söz

Sprint D **önceki plandan tamamen farklı.** Kod analizi + DB kontrolü birlikte kullanılmasa "3 tablo konsolide et" derdik, gereksiz iş yapardık. Gerçek sorun:

1. Bordro **çalışıyor**, sadece eski schema temizlenecek
2. Satınalma **fiilen dormant**, pilot için aktivasyon kritik

**Bu Sprint A öğrenisinin tekrarı:** Kodda var ≠ fiilen kullanılıyor.
