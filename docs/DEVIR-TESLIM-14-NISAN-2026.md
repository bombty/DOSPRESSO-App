# DOSPRESSO Devir Teslim — 14 Nisan 2026 (MEGA OTURUM)
## Son Commit: 0b406c42 | Sistem: 468 tablo, 1720 endpoint, 31 rol, 24 QG

---

## TAMAMLANAN İŞLER (25+ commit)

### Altyapı
- Motor birleştirme (unified payroll) — PDKS + Excel + SGK/Vergi
- sql.raw refactoring (23→10)
- moduleFlags seed fix
- Sidebar rol çakışmaları + highlight fix
- İK Building2 crash fix

### Rol Sistemi (30→31 rol)
- 3 fabrika rolü ROLE_MAPPING (sef, recete_gm, uretim_sefi)
- gida_muhendisi yetki temizliği (branch→factory only)
- RGM/Şef dashboard modülleri (0 modül→5 modül fix)
- **Depocu rolü (fabrika_depo)** — 8 dosya tam tanımlama

### Reçete Sistemi
- Versiyonlama altyapısı (schema + FK)
- **Otomatik PATCH→snapshot** (ingredients + steps + cost)
- rawMaterialId FK (recipe→inventory bağlantısı)
- **14/14 reçete eşleştirme** (fuzzy matching + manuel fix)

### Inventory & Fiyat
- Fiyat yapısı (6 kolon + 1 tablo: inventory_price_history)
- **926 malzeme** (115 mevcut + 805 Excel + 6 yeni hammadde)
- **1501 fiyat kaydı** (2025+2026 aylık alım geçmişi)
- Excel import API (3 endpoint)
- Birim dönüşümü (KG→g, LT→ml)

### MRP-Light (YENİ)
- **4 tablo:** daily_material_plans, plan_items, leftovers, pick_logs
- **9 endpoint:** plan oluşturma, çekme, teslim alma, artan kayıt, doğrulama
- Cinnabon×2 batch test: 14 kalem otomatik hesaplandı ✅
- Artan malzeme→ertesi gün eşleştirme algoritması

### Dokümanlar
- MRP-Light tasarım dokümanı (373 satır)
- Quality gate 21→24 madde
- Skill dosyaları güncel

---

## VERİ DURUMU
| Metrik | Değer |
|--------|:-----:|
| Tablo (schema) | 468 |
| Tablo (DB) | 435 |
| Endpoint | 1720 |
| Rol (kod) | 31 |
| QG madde | 24 |
| Inventory | 926 |
| Fiyat kaydı | 1501 |
| Reçete eşleştirme | 14/14 |
| MRP plan test | Cinnabon×2=14 kalem ✅ |

---

## YENİ OTURUMDA YAPILACAK
| # | İş | Öncelik |
|---|-----|:------:|
| 1 | MRP maliyet hesaplama düzeltmesi (birim dönüşüm) | 🔴 |
| 2 | Satınalma aylık fiyat hatırlatma (Dobody) | 🟡 |
| 3 | Dashboard widgetları (gıda müh. + RGM + depocu) | 🟡 |
| 4 | MRP UI sayfaları (plan görünümü, çekme listesi) | 🟡 |
| 5 | Control Centrum v4 (15 rol dashboard) | 🟢 |
| 6 | dashboard-data sql.raw (39 çağrıcı) | 🟢 |
