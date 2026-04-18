# F02 — Fabrika Modül Naming Çakışması: Kod İnceleme Raporu

**Hazırlayan**: Replit Agent  
**Tarih**: 19 Nisan 2026 (Cumartesi gece)  
**Toplantı**: Pazartesi 28 Nis 14:00 — Aslan + Claude + IT + Agent  
**Kaynak**: DB tablo `module_flags` + grep tarama `client/src/` + `server/routes/`

---

## 1. Yönetici Özeti (TL;DR)

🚨 **EN BÜYÜK BULGU**: Fabrika sayfalarının HİÇBİRİNDE `useModuleFlag` check'i **YOK**. Module flag'lerin **runtime impact'i SIFIR** — sadece admin paneli görünümünü etkiliyor.

**Sonuç**: F02 "naming çakışması" bir **schema teknik borcu**, operasyonel bug DEĞİL. Pilot başlangıç kararı kolay: Türkçe legacy'leri silmek güvenli.

---

## 2. DB Durumu (Canlı Tarama)

15 fabrika.* flag'i var:

### ✅ Aktif İngilizce Set (8 modül)
```
fabrika                    module     ✅
fabrika.factory-kiosk      submodule  ✅
fabrika.haccp              submodule  ✅
fabrika.production         submodule  ✅
fabrika.quality            submodule  ✅
fabrika.roasting           submodule  ✅
fabrika.shipment           submodule  ✅
fabrika.vardiya            submodule  ✅
```

### 🔴 Pasif Türkçe Legacy (7 modül)
```
fabrika.kalite             submodule  🔴 ↔ fabrika.quality
fabrika.kavurma            submodule  🔴 ↔ fabrika.roasting
fabrika.sevkiyat           submodule  🔴 ↔ fabrika.shipment
fabrika.hammadde           submodule  🔴 (eş yok)
fabrika.siparis            submodule  🔴 (eş yok)
fabrika.sayim              submodule  🔴 (eş yok)
fabrika.stok               submodule  🔴 (production ≠ stok!)
```

---

## 3. Kod Tarama Detayı (4 Belirsiz Modül)

### 3.1 fabrika.hammadde — DEAD KOD
- `client/src/`: **0 referans** (`module-flags.tsx` admin listesi hariç)
- `server/routes/`: **0 referans**
- Sayfa varlığı: `pages/fabrika/` altında "hammadde" sayfası **YOK**
- **Kanıt**: Sidebar'da link yok, route yok, endpoint yok

**Karar Önerisi**: Aslan'ın "AKTİF olmalı (pilot hammadde takibi)" tavsiyesi → hammadde takip için **YENİ SAYFA + ROUTE + ENDPOINT** gerekir. Sadece flag açmak yetmez.

→ **Pilot için**: KAPALI BIRAK. Sprint D'de sayfa+endpoint + flag birlikte canlandır.

---

### 3.2 fabrika.siparis — KISMEN DEAD KOD
- `client/src/`: **0 referans** (admin paneli hariç)
- `server/routes/`: **0 referans**
- Sayfa varlığı: `pages/fabrika/siparis-hazirlama.tsx` **VAR** ama kod içinde flag check yok
- **İlişki**: PERMISSIONS map'inde `branch_orders` (yeni İngilizce) zaten var, `fabrika_mudur.branch_orders = ['view','create','edit','delete']` (line 1910)

**Karar Önerisi**: `siparis-hazirlama.tsx` sayfası `branch_orders` permission'a bağlı çalışıyor zaten. `fabrika.siparis` flag'i gereksiz.

→ **Pilot için**: KAPALI BIRAK. Sprint D'de **SİL** (Türkçe legacy + İngilizce karşılığı = `branch_orders` permission).

---

### 3.3 fabrika.sayim — KISMEN AKTIF KOD
- `client/src/`: **0 referans** (admin paneli hariç)
- `server/routes/`: **0 referans**
- Sayfa varlığı: `pages/fabrika/stok-sayim.tsx` **VAR** ama isim eşleşmiyor (`stok-sayim` ≠ `sayim`)
- Sidebar link: `MissionControlFabrika.tsx:273` → `/fabrika/stok-sayim`

**Karar Önerisi**: `stok-sayim.tsx` zaten çalışıyor ve `FabrikaOnly` ile korunuyor. Flag gereksiz.

→ **Pilot için**: KAPALI BIRAK. Sprint D'de **SİL** (kullanılmayan flag).

---

### 3.4 fabrika.stok — AKTİF KULLANIMDA (kritik!)
- `client/src/App.tsx:236`: `const FabrikaStokMerkezi = lazyWithRetry(...)`
- `client/src/App.tsx:529`: `<Route path="/fabrika/stok-merkezi">`
- `client/src/components/mission-control/MissionControlFabrika.tsx:273`: `<Link href="/fabrika/stok-sayim">`
- **3 gerçek kullanım** + Task #91 (790 satır, 4 tab Stok Merkezi sayfası)

**Önemli**: `fabrika.stok` ≠ `fabrika.production`. Production = üretim batch'leri, stok = malzeme envanteri. Aslan'ın "production daha anlamlı" varsayımı **yanlış**.

**Karar Önerisi**: `fabrika.stok` modülü **AKTİF** olmalı.

→ **Pilot için**: AÇ (`is_enabled=true`). Sayfalar zaten flag check yapmıyor, ama admin paneli'nde "açık" göstermek tutarlı olur.

**ALTERNATIF**: Sayfaları yeni İngilizce isme migrate (`fabrika.inventory`) — daha temiz ama 4 saat ek iş, pilot SONRASI Sprint D'de.

---

## 4. KRİTİK YAPISAL BULGU (F02-bağlı, ama daha büyük)

### 4.1 Module Flag'lerin Runtime Etkisizliği

**Tespit**: Tüm `pages/fabrika/*.tsx` ve `pages/fabrika-*.tsx` dosyalarında `useModuleFlag('fabrika.xxx')` çağrısı **TARANDI = 0 SONUÇ**.

**Sonuç**: `fabrika.kalite=false` olsa bile:
- ✅ `/fabrika/kalite-kontrol` route AÇILIR (FabrikaOnly izin verirse)
- ✅ Endpoint çağrıları 200 döner (auth varsa)
- ❌ Sadece `/admin/module-flags` panelinde "Kapalı" görünür

**Risk**: Admin "modülü kapadım" sanıyor ama kullanıcılar hâlâ erişebiliyor. **Silent fail / yanlış güvenlik hissi**.

### 4.2 Kapsamı Geniş — Tüm Modüller İçin Geçerli mi?

Spot kontrol gerek (Pazartesi öğleden önce):
```bash
grep -r "useModuleFlag\|moduleFlag" client/src/pages/ | wc -l
```

Eğer toplam 0 → tüm `module_flags` sistemi sadece UI'da listeleme görevinde, gerçek koruma role bazlı.

### 4.3 Önerilen Aksiyon (Sprint I — Pilot Sonrası)

**Seçenek A** — Module Flags'i KALDIR (4 saat):
- `module_flags` tablosu + admin panel sil
- Sadece role-based PERMISSIONS bırak

**Seçenek B** — Module Flags'i CANLANDIRIR (8 saat):
- Her ana sayfada `useModuleFlag` ekle
- Disabled flag → 404 ya da "Modül kapalı" mesaj
- Sidebar'da disabled modüller saklan

**Tavsiyem**: Seçenek B. Çünkü pilot sonrası Hafta 2-3'te yeni modüller (Sprint D) eklenecek, granular kapatma kapasitesi değerli.

---

## 5. Pazartesi Toplantısı için Karar Tablosu

| Modül | Tavsiye | Sebep | Risk | Süre |
|---|---|---|---|---|
| fabrika.kalite | 🗑️ SOFT-DELETE | İngilizce eşi `fabrika.quality` aktif | YOK | SQL 1 sn |
| fabrika.kavurma | 🗑️ SOFT-DELETE | İngilizce eşi `fabrika.roasting` aktif | YOK | SQL 1 sn |
| fabrika.sevkiyat | 🗑️ SOFT-DELETE | İngilizce eşi `fabrika.shipment` aktif | YOK | SQL 1 sn |
| fabrika.hammadde | ⏸️ KAPALI BIRAK | Sayfa+endpoint yok, sadece flag boşa duruyor | YOK | — |
| fabrika.siparis | ⏸️ KAPALI BIRAK | `branch_orders` permission yerini almış | YOK | — |
| fabrika.sayim | ⏸️ KAPALI BIRAK | Sayfa farklı isim altında çalışıyor | YOK | — |
| **fabrika.stok** | 🟢 **AÇ** | Task #91 + 3 gerçek kod referansı | YOK | SQL 1 sn |

**Toplam etki**: 3 silme + 1 açma = **4 satır SQL**, 1 saniye uygulama, 0 kullanıcı etkisi.

---

## 6. Pazartesi 14:00 Toplantı Akışı (15 dk)

1. **2 dk**: Bu rapor özet okuma (Aslan + Claude)
2. **5 dk**: 4 belirsiz modül için Aslan onayı (yukarıdaki tablo)
3. **3 dk**: Module flag runtime etkisizliği bulgusu — Sprint I'e ekleme kararı
4. **5 dk**: SQL uygula (`scripts/pilot/02-f02-fabrika-naming.sql`) + doğrulama

**Karar netleşince ben SQL'i uygularım, smoke test yaparım, log paylaşırım.**

---

## 7. Eklenmiş Linkler

- F01+F02 SQL: `scripts/pilot/01-f01-module-flags-toggle.sql`
- F02 ayrı SQL: `scripts/pilot/02-f02-fabrika-naming.sql` (Aslan kararı sonrası uncomment)
- F01 rollback: `scripts/pilot/01-f01-rollback.sql`
- Pazartesi sprint plan: `docs/pilot/pzt-28-nis-sprint-plan.md`
