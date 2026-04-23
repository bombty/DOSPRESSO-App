# DOSPRESSO Devir-Teslim Raporu — 23 Nisan 2026

**Pilot GO-LIVE:** 28 Nisan 2026 Pazartesi 09:00 (5 gün kaldı)
**Pilot Hazırlık Skoru:** 90/100
**Son Commit:** `dbc9a85` (15-alerjen sema drift fix)

---

## 🎯 Yönetici Özeti

DOSPRESSO Franchise Yönetim Sistemi pilot hazırlığı büyük ölçüde tamamlandı.
- **Kod tarafı:** %100 hazır (4 pilot sprint bitti)
- **DB migration:** %85 tamam (5/6 migration uygulandı)
- **Operasyonel:** %80 (GPS + vardiya planı eksik)

**5 gün içinde tamamlanması gereken 7 iş var.** Hiçbiri teknik zorluk içermiyor; hepsi Aslan + ekipten bilgi + aksiyon bekliyor.

---

## ✅ Tamamlanan (Bu Hafta)

### Kod Sprint'leri (4/4)

| Sprint | Commit | İçerik | DB |
|---|---|---|---|
| **S-Bordro** | `7184d9a` | `is_dry_run` flag + dataSource env kilidi | ✅ `10-bordro-dry-run-migration.sql` |
| **S-UX** | `e064f72` | Day-1 banner + mola eşiği 90→120 env override | ✅ (runtime env) |
| **S-GPS** | `cfea91b` | Supervisor PIN ile manuel GPS fallback | ✅ `13-gps-fallback-migration.sql` |
| **S-Flag** | `124e5bf` | PDKS Excel import pilot disable | ✅ (runtime env) |

### Cheat-Sheet Kapsamı (26 aktif)

- **13 Şube/Fabrika rolü:** admin, mudur, supervisor, kurye, fabrika-iscisi, barista, bar-buddy, sef, stajyer, supervisor-buddy, uretim-sefi, fabrika-depo, recete-gm
- **11 HQ rolü:** ceo, cgo, muhasebe, satinalma, kalite-kontrol, marketing, teknik, trainer, coach, destek, yatirimci-hq
- **2 Yeni (23 Nis):** fabrika-mudur (Eren), gida-muhendisi (Sema)

**Not:** Tüm cheat-sheet'lerde telefon placeholder'ı kaldırıldı, Cowork + WhatsApp yönlendirmesi eklendi. Mr. Dobody chat yanılgısı düzeltildi.

### DB Migration Başarısı (5/6)

| # | Script | Durum |
|---|---|---|
| 10 | `bordro-dry-run-migration.sql` | ✅ `is_dry_run` kolonu eklendi |
| 11 | `raw-materials-upsert.sql` | ✅ 185 hammadde DB'de (Bombtea 2026 fiyat) |
| 12 | `kritik-blocker-duzeltme.sql` | ✅ 4 şube manager_name düzeltildi |
| 13 | `gps-fallback-migration.sql` | ✅ `gps_fallback_used` kolonları |
| 14 | `replit-v2-blocker-fix.sql` | ✅ Işıklar checklist modülü açıldı |
| 15 | `alerjen-temel-seed.sql` | ⏳ 3. deneme (sema drift fix) |

### Env Değişkenleri (Replit Shared Env)

| Değişken | Değer | Amaç |
|---|---|---|
| `PAYROLL_LOCKED_DATASOURCE` | `kiosk` | Mahmut excel seçse bile kiosk kullanılır |
| `PAYROLL_DRY_RUN` | `true` | SGK external bildirim yapılmaz |
| `PILOT_BREAK_MINUTES_OVERRIDE` | `120` | Mola 90→120 yumuşatma |
| `PDKS_EXCEL_IMPORT_ENABLED` | `false` | Excel upload bloke |

### Server Durumu

- ✅ Restart temiz, 38 scheduler aktif, 0 hata
- ✅ Build temiz (esbuild 1031ms)
- ✅ TS type check temiz

---

## 🔴 Bekleyen 7 Kritik İş (5 Gün)

### 1. GPS Koordinatları (Aslan — 15 dk) 🔴 DAY-1 BLOCKER

**Neden kritik:** Tablet GPS kontrolü için 4 pilot lokasyon koordinatları DB'de NULL.
**Fallback var:** S-GPS sprint'i ile supervisor PIN ile manuel override yapılabilir.

**Aslan'ın yapması:**
Google Maps'te 4 lokasyonu aç, koordinat kopyala:

```
- Işıklar (branch_id=5):    https://www.google.com/maps/place/Dospresso+Işıklar
- Lara (branch_id=8):       https://www.google.com/maps/place/Dospresso+Lara
- HQ (branch_id=23):        Aslan'ın bildiği adres
- Fabrika (branch_id=24):   Aslan'ın bildiği adres
```

Koordinatı (örnek: `36.8969, 30.7133`) bana ver, SQL UPDATE yaparım.

### 2. Vardiya Planı (Coach/Yavuz — 1 saat) 🔴 DAY-1 BLOCKER

**Deadline:** 27 Nis Pazar 18:00
**Kapsam:** 4 lokasyon × 7 gün × ortalama 5-12 vardiya = ~150-200 satır
**Kod destekliyor:** Mudur kendi şubesi, Coach tüm şubeler için yetkili

**Aslan'ın yapması:** Yavuz'a mesaj at, pilot haftası planını oluştursun.

### 3. Alerjen Verileri (Sema — 4 saat) 🟠 YASAL RİSK

**Deadline:** 26 Nis Cumartesi
**Kapsam:** 15-alerjen scripti çalıştırınca 111 template oluşur
**Sema'nın yapması:** Her malzeme için `allergens` array'ini doldur

Örnek:
```sql
UPDATE factory_ingredient_nutrition
SET allergens = ARRAY['gluten','süt']
WHERE ingredient_name = 'Un';
```

**Pratik:** Sema'nın direkt SQL yerine admin panelinden yapabilmesi için UI gerek.

### 4. SGK 2026 Parametreleri (Mahmut — 1 saat) 🟠 YASAL

**Şüpheli:** `payroll_parameters.year=2026` - `minimum_wage_gross = 33,030 TL` girilmiş ama notes'ta "güncellenmeli" yazıyor.

**Mahmut'un yapması:** 2026 resmi SGK tablolarıyla karşılaştır + gerekirse UPDATE.

### 5. 8 Pilot Kararını İmzala (Aslan — 10 dk)

**Dosya:** `docs/pilot/bordro-skor-donmus-kararlar.md`

Kararlar:
- DataSource: kiosk ✅
- DRY_RUN aktif ✅
- Skor reset ✅
- Day-1 banner ✅
- Rotasyon yasağı (pilot süresince)
- Mola eşiği 90→120 ✅
- Yeni rol/personel ekleme yasağı
- GPS Fallback prosedürü ✅

### 6. Token Yenileme (Aslan — 5 dk) 🟠 GÜVENLİK

**Neden:** GitHub token birkaç hafta önce kompromize olduğu söylendi.
**Aksiyon:** GitHub Settings → Personal Access Tokens → Revoke + yeni oluştur → Claude'a ver.

### 7. Fabrika 4 PIN (adminhq — 10 dk)

**Eksik PIN'ler (Replit raporu):**
- Sema (recete_gm)
- Ümit Usta (sef)
- Test Depocu (fabrika_depo)
- Lara'da `lara` user (sube_kiosk)

**Aksiyon:** adminhq → Fabrika kiosk PIN setup sayfası → 4 PIN tanımla.

---

## 📅 Son 5 Gün Programı

| Gün | Aslan | Ekip | Claude/Replit |
|---|---|---|---|
| **23 Nis Perş (BUGÜN)** | GPS koordinat + 8 karar imza | Yavuz'a vardiya brief | Replit: 15-alerjen çalıştır |
| **24 Nis Cuma** | Sema brief (alerjen) | Sema: alerjen başla | Claude: bekle |
| **25 Nis Ctesi** | Mahmut brief (SGK) | Mahmut: SGK audit | - |
| **26 Nis Paz** | Smoke test koordinasyon | Sema: alerjen tamam | Claude + Replit: smoke test |
| **27 Nis Pzt** | Final hazırlık | Yavuz: vardiya plan tamam (18:00) | Pazar 22:30: DB izolasyon + skor reset |
| **28 Nis 09:00** | 🚀 GO-LIVE | 4 lokasyon aktif | On-call destek |

---

## 🛠️ Sistem Durumu

### Son Commit'ler

```
dbc9a85 fix(pilot): 15-alerjen DB sema drift uyumu
aca0dde fix(pilot): 14 + 15 SQL - gercek sema uyumu
124e5bf feat(pilot): S-Flag Sprint 4 + Replit v2 raporu blocker fix
cfea91b feat(pilot): S-GPS Sprint 3 - GPS fallback manuel override
a45aacf fix(pilot): Fabrika izin bildirimleri + email/GPS placeholder
24a69e0 feat(pilot): Eksik cheat-sheet + raw materials + kritik blocker düzeltme
e064f72 feat(pilot): S-UX Sprint 2 - Day-1 banner + mola eşiği override
7184d9a feat(pilot): S-Bordro Sprint 1 - DRY_RUN + dataSource kilidi
7dd4076 fix(pilot): 24 cheat-sheet - Mr. Dobody chat yanılgısını düzelt
```

### GitHub Repo

- **Repo:** `bombty/DOSPRESSO-App`
- **Branch:** `main`
- **Origin senkron:** ✅
- **Token durumu:** ⚠️ Aktif token kompromize - yenilenmesi gerekiyor

### Pilot Lokasyon Hazırlık Matrisi

| Lokasyon | ID | Setup | Kiosk Parola | GPS | Vardiya | PIN |
|---|---|---|---|---|---|---|
| Işıklar | 5 | ✅ | ✅ | 🔴 | 🔴 | ✅ 10/10 |
| Lara | 8 | ✅ | ✅ | 🔴 | 🔴 | ⚠️ 5/6 |
| HQ | 23 | ✅ | ✅ | 🔴 | 🔴 | - |
| Fabrika | 24 | ✅ | ✅ | 🔴 | 🔴 | ⚠️ 5/9 |

---

## 🔵 Pilot Sonrası (29 Nis+) — Sprint I Backlog

1. **Career backfill** — 151 user'a level ata (SQL hazır)
2. **Launch-reset script** — Pazar 22:30 için dokümantasyon + otomasyon
3. **Task #119** — Sistem haritası + 31 rol akış raporu
4. **Test şubelerini sil** — Test Branch 1, Örnek şube
5. **"Antalya Mallof" → "Mall of Antalya"** düzeltme
6. **250 FK onDelete eksik** — tech debt temizlik
7. **Mr. Dobody emergency routing kategorisi** ekle
8. **AI API key env'e taşı** (güvenlik)
9. **110 hiç giriş yapmamış kullanıcı** onboarding
10. **Factory recipe versioning** çalışıyor mu debug

---

## 📞 İletişim

- **Aslan** (owner) → Tüm kararlar, koordinasyon
- **Claude** (arch + kod) → Sprint'ler, migration'lar, cheat-sheet'ler
- **Replit Agent** (DB + ops) → SQL çalıştırma, server restart, smoke test
- **Yavuz** (coach) → Vardiya planı
- **Sema** (gida_muhendisi) → Alerjen + HACCP
- **Mahmut** (muhasebe_ik) → SGK + bordro
- **Samet** (satinalma) → Stok + tedarikçi

WhatsApp Pilot Grubu: "DOSPRESSO Pilot — [Lokasyon]" (her pilot lok için 1)

---

**Belge:** `docs/DEVIR-TESLIM-23-NISAN-2026.md`
**Sürüm:** v1.0
**Sonraki güncelleme:** 24 Nis akşam (GPS + vardiya planı girişinden sonra)
