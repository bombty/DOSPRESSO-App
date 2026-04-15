# DOSPRESSO Devir Teslim — 14-15 Nisan 2026 (MEGA OTURUM)
## Son Commit: 55a7d293 | Sistem: 468 tablo, 1723 endpoint, 314 sayfa, 31 rol, 27 QG

---

## TAMAMLANAN İŞLER (50+ commit)

### Altyapı & Temizlik
- Motor birleştirme (unified payroll) — PDKS + Excel + SGK/Vergi
- sql.raw refactoring (23→10 baseline, dashboard 39 çağrıcı ayrı sprint)
- /control-legacy → /control redirect, ölü import temizliği
- **KRİTİK: /fabrika/:tab? catch-all route sırası düzeltmesi** (Reçete/Keyblend/MRP çalışmıyordu)

### Rol Sistemi (30→31 rol) + Sidebar Audit
- Depocu rolü (fabrika_depo) — 8 dosya tam tanımlama
- Sidebar audit: 19 atanmamış item → 10 rolde 21 eksik düzeltildi
- fabrika_personel + fabrika_sorumlu ROLE_MAPPING eksikliği (KRİTİK fix)
- Rol tutarlılık: 30/31 rol 5 dosyada tutarlı
- Keyblend sidebar (RGM)

### Reçete Sistemi (13→27 reçete)
- Versiyonlama + otomatik PATCH→snapshot
- **13 ürün reçetesi seed:** Ciabatta, 5×Cheesecake, 2×Brownie, 2×Cookie, Blueberry Crown, 2×Cinebom
- **Donut reçetesi + Keyblend DON-KB-001** (12 bileşen, Atşye Hanım formülü)
- 3 yeni kategori: brownie, cheesecake, ekmek
- 14/14 + 24/24 malzeme eşleştirme (toplam 206 linked, 0 unlinked)
- Maliyet tab'ı + malzeme düzenleme dialog (Replit)

### Inventory & Fiyat
- 926→940 malzeme (+14 yeni hammadde)
- 1501 fiyat kaydı
- **Fiyat dönüşüm fix:** 229 malzeme conversionFactor güncellendi (paket→KG)
- Stale price API (2 endpoint)
- **Satınalma stok yönetimi:** Birim fiyat kolonu (₺/KG) eklendi

### MRP-Light (TAM SİSTEM)
- 4 tablo + 9 endpoint + UI sayfası + Centrum widgetları
- **Kiosk MRP paneli:** Malzeme durumu, teslim alma, artan tartım
- **Stok Merkezi:** 4 tab sayfası (Replit — Task #91)
- Fabrika üretim stok takip sistemi tasarım dokümanı

### Fabrika Centrum
- MRP widget + reçete versiyon + stale fiyat + rol bazlı widgetlar
- Gıda müh artan doğrulama, depocu çekme özeti

### Dobody
- Aylık fiyat hatırlatma scheduler (ayın 1'i, satınalma bildirimi)

---

## VERİ DURUMU
| Metrik | Başlangıç | Şimdi |
|--------|:---------:|:-----:|
| Tablo | 463 | 468 |
| Endpoint | 1708 | 1723 |
| Sayfa | 313 | 314 |
| Rol | 30 | 31 |
| QG madde | 21 | 27 |
| Reçete | ~13 | 27 |
| Keyblend | 1 | 2 |
| Inventory | 115 | 940 |
| Fiyat kaydı | 0 | 1501 |

---

## YENİ OTURUMDA YAPILACAK
| # | İş | Öncelik |
|---|-----|:------:|
| 1 | sql.raw dashboard refactoring (39+39 çağrıcı) | 🟡 |
| 2 | Satınalma sipariş listesi (şube bazlı, güncel fiyatlı) | 🟡 |
| 3 | Kiosk batch→stok otomatik düşme | 🟡 |
| 4 | Fire hesaplama (çekilen - kullanılan - artan) | 🟡 |
| 5 | Control Centrum v4 (15 rol dashboard) | 🟢 |
| 6 | Dobody düşük stok bildirimi (scheduler) | 🟢 |
