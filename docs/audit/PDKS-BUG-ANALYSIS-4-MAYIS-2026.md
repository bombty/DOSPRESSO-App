# 🔬 PDKS Bug Analizi & Eren ile Kiosk Testi Checklist

> **Tarih:** 4 Mayıs 2026
> **Hedef:** Yarın (5 May) Eren ile 1 saatlik canlı kiosk testi
> **Bağlam:** `docs/audit/FABRIKA-DEEP-SCAN-4-MAYIS-2026.md` KRİTİK BULGU 1+2+3
> **Önbilgi:** Son 30 gün **9/10 vardiyada `work_minutes=0`**, **8/10 vardiyada `phase='hazirlik'`**, **9/10 vardiyada `station_id=NULL`** → PDKS sistemi gerçek üretim akışını yansıtmıyor.

---

## 🎯 TEST AMACI

Üç soruya kanıtlanabilir cevap:

1. **Hangi UI adımında `phase` değişmiyor?** (`hazirlik → uretim → temizlik → tamamlandi` zinciri kırılıyor mu?)
2. **`work_minutes` neden hep 0?** (Backend hesaplıyor mu, yoksa frontend göndermiyor mu?)
3. **`station_id` neden NULL?** (Select Station ekranı çalışıyor mu, ama veriyi yazmıyor mu?)

**ÖNEMLİ:** Test öncesi **2 açık vardıya kapatılmış olmalı** (`migrations/2026-05-04-close-orphan-shifts.sql` execute edilmiş olmalı). Aksi halde new shift açılmaz veya state kirlenir.

---

## 📋 5 ADIMLI TEST CHECKLİST

### ADIM 1 — Cihaz Girişi + Personel Seçimi (5 dk)

**Eren'in yapacağı:**
1. `/fabrika/kiosk` aç
2. Device password gir (admin'den al)
3. `select-user` ekranında **Eren'in kartı görünüyor mu?**
4. Karta tıkla → PIN ekranına geç
5. PIN gir → `worker-home` ekranına geç

**Beklenen DB Yazımı:**
- Henüz yok (sadece auth)

**Doğrulama Sorgusu (Aslan):**
```sql
SELECT COUNT(*) FROM factory_shift_sessions
WHERE user_id = '<eren-user-id>'
  AND check_in_time > NOW() - INTERVAL '5 minutes';
-- Beklenen: 0 (henüz vardiya başlamadı)
```

**Yaygın Bug Sinyalleri:**
- ❌ Eren kartta gözükmüyor → `factory_staff_pins` tablosunda `is_active=true` mı? Role doğru mu?
- ❌ PIN kabul edilmiyor → bcrypt karşılaştırması düzgün mü? `factory-kiosk-token` localStorage'a kaydediliyor mu?
- ❌ `worker-home` yerine `select-user`'a dönüyor → token expired veya `useAuth` state çakışıyor

---

### ADIM 2 — İstasyon Seçimi + Vardiya Başlat (10 dk)

**Eren'in yapacağı:**
1. `worker-home` ekranında "İstasyon Seç" butonuna bas
2. `select-station` listesinden **Espresso İstasyonu** (id=5) seç
3. Vardiya başladıktan sonra `working` ekranına geçmeli
4. **Ekranda ne yazıyor not et:** "Hazırlık aşaması" mı, "Üretim aşaması" mı?

**Beklenen DB Yazımı:**
```sql
INSERT INTO factory_shift_sessions (user_id, station_id, check_in_time, status, phase)
VALUES ('<eren-id>', 5, NOW(), 'active', 'hazirlik');
```

**Doğrulama Sorgusu:**
```sql
SELECT id, station_id, status, phase, check_in_time
FROM factory_shift_sessions
WHERE user_id = '<eren-user-id>'
ORDER BY check_in_time DESC LIMIT 1;
-- KRİTİK: station_id NULL DEĞİL olmalı (5 olmalı)
-- KRİTİK: status='active', phase='hazirlik'
```

**🔥 Yaygın Bug — station_id NULL kalıyorsa:**
- Frontend `kiosk.tsx:478` → `POST /api/factory/kiosk/assign-station`
- Endpoint payload `{ stationId }` gönderiyor mu? (Ekranda devtools Network tab'ı aç)
- Backend `factory.ts` içindeki handler `req.body.stationId` mı `req.body.station_id` mi bekliyor? **Mismatch ihtimali yüksek.**

**Yaygın Bug — phase 'hazirlik' kilitleniyor:**
- "Üretime başla" butonu var mı, yoksa otomatik geçiş mi bekleniyor?
- `phase: 'uretim'` UPDATE query'si nerede tetikleniyor?

---

### ADIM 3 — Reçete Seç + Üretim Modu (20 dk)

**Eren'in yapacağı:**
1. `working` ekranında "Üretim Başlat" / "Log Production" butonuna bas
2. **Hangi sayfa açılıyor?** (kiosk içinde modal mı, `/fabrika/receteler/:id/uretim` sayfasına yönlendiriyor mu?)
3. Bir reçete seç (örn: Türk Kahvesi reçetesi, id=?)
4. Reçeteyi başlat → step-by-step ilerleme yap (timer'ları çalıştır)
5. Çıktı miktarı gir (örn: 50 adet)
6. "Üretim Tamamla" bas

**Beklenen DB Yazımı (3 ayrı tablo):**
```sql
-- 1) factory_production_logs (üretim log)
INSERT INTO factory_production_logs (recipe_id, user_id, session_id, ...)
-- 2) factory_production_outputs (çıktı miktarı)
INSERT INTO factory_production_outputs (session_id, quantity, ...)
-- 3) factory_shift_sessions (phase güncellemesi)
UPDATE factory_shift_sessions SET phase='uretim', prod_started_at=NOW() WHERE id=...
```

**Doğrulama Sorgusu:**
```sql
-- A) Log düştü mü?
SELECT id, recipe_id, session_id, output_quantity, created_at
FROM factory_production_logs
WHERE session_id = <eren-session-id>
ORDER BY created_at DESC LIMIT 5;
-- Beklenen: en az 1 satır

-- B) Output düştü mü?
SELECT id, quantity, created_at
FROM factory_production_outputs
WHERE session_id = <eren-session-id>;
-- Beklenen: en az 1 satır

-- C) phase 'uretim'e geçti mi?
SELECT phase, prod_started_at, prep_duration_minutes
FROM factory_shift_sessions
WHERE id = <eren-session-id>;
-- KRİTİK: phase='uretim' OLMALI, prep_duration_minutes hesaplanmış olmalı
```

**🔥 Kritik Mimari Soru:**
- Kiosk içinde reçete oynatılıyorsa → kayıt **hangi sistemden** düşüyor?
- Eğer `/fabrika/receteler/:id/uretim` (uretim-modu sayfası) açılıyorsa → bu **factory-recipes.ts route'u** (start-production endpoint), **kiosk session'ı bilmiyor**
- Yani **production_logs.session_id NULL kalabilir** → puantaj kopuk

**Test:** Üretim sırasında DevTools Network tab'da `start-production` çağrısının payload'ında `sessionId` var mı kontrol et.

---

### ADIM 4 — Mola Al / Dön (5 dk)

**Eren'in yapacağı:**
1. `working` ekranında "Mola" butonu bas
2. Mola sebebi seç (`mola` veya `ozel_ihtiyac`)
3. **5 dakika bekle** (timer çalışıyor mu?)
4. "Molayı Bitir" bas → `working` ekranına dön

**Beklenen DB Yazımı:**
```sql
-- Mola başlangıcı
INSERT INTO factory_break_logs (session_id, user_id, break_reason, started_at)
-- Mola bitişi
UPDATE factory_break_logs SET ended_at=NOW(), duration_minutes=5 WHERE id=...
```

**Doğrulama Sorgusu:**
```sql
SELECT id, break_reason, started_at, ended_at, duration_minutes, auto_flagged
FROM factory_break_logs
WHERE session_id = <eren-session-id>
ORDER BY started_at DESC;
-- Beklenen: 1 satır, duration_minutes ≈ 5
-- auto_flagged=true ise → "uzun mola" eşiği aşılmış demek
```

**Yaygın Bug:**
- `duration_minutes` NULL kalıyor → frontend "molayı bitir" PATCH gönderiyor mu?
- `auto_flagged` her zaman `false` → flag mantığı yazılmamış olabilir

---

### ADIM 5 — Vardiya Bitir + Özet Ekran (10 dk)

**Eren'in yapacağı:**
1. `working` ekranında "Vardiyayı Bitir" bas
2. `end-shift-summary` ekranında **şu bilgileri kontrol et:**
   - Toplam çalışma süresi (work_minutes)
   - Toplam üretim adedi (total_produced)
   - Toplam fire (total_waste)
   - Mola süresi
3. "Onayla ve Çıkış" bas → `select-user` ekranına dön

**Beklenen DB Yazımı:**
```sql
UPDATE factory_shift_sessions
SET
  status = 'completed',
  check_out_time = NOW(),
  phase = 'tamamlandi',
  work_minutes = <hesaplanmış>,
  total_produced = <toplam>,
  total_waste = <toplam>,
  prod_duration_minutes = <hesaplanmış>,
  clean_duration_minutes = <hesaplanmış>
WHERE id = <eren-session-id>;
```

**Doğrulama Sorgusu (TEST'İN KRİTİK SONUCU):**
```sql
SELECT
  id, status, phase,
  check_in_time, check_out_time,
  work_minutes,
  total_produced, total_waste,
  prep_duration_minutes,
  prod_duration_minutes,
  clean_duration_minutes,
  EXTRACT(EPOCH FROM (check_out_time - check_in_time))/60 AS gercek_sure_dk
FROM factory_shift_sessions
WHERE id = <eren-session-id>;
```

**🔥 BAŞARI KRİTERLERİ:**
| Alan | Beklenen | Gerçek (test sonrası doldur) |
|---|---|---|
| `status` | `completed` | |
| `phase` | `tamamlandi` | |
| `work_minutes` | gercek_sure_dk ≈ değeri | |
| `total_produced` | Adım 3'te girilen | |
| `prep_duration_minutes` | Adım 1-2 arası süre | |
| `prod_duration_minutes` | Adım 3 süresi | |
| `clean_duration_minutes` | (eğer temizlik fazı yapıldıysa) | |

**🔥 EĞER `work_minutes = 0` ÇIKARSA:**
- Bu mevcut bug'ın kaynağı → backend `end-shift` handler'ı süre hesabı yapmıyor
- Çözüm: `server/routes/factory.ts:1682` etrafında `work_minutes = ROUND(EXTRACT(EPOCH FROM (NOW() - check_in_time))/60)` ekle

**🔥 EĞER `phase = 'hazirlik'` KALIRSA:**
- Phase transition'ları frontend'de kullanıcı tetiklemesine bağlı, ama UI'da buton yok
- Çözüm: Auto-transition (üretim log'u yazıldığında `phase='uretim'`)

---

## 📊 TEST SONRASI YAPILACAKLAR

### Hemen (Test Bitince)
- [ ] Tüm 5 sorguyu sırasıyla çalıştır, sonuçları doldur
- [ ] `network.har` dosyası export et (DevTools → Network → Save All as HAR)
- [ ] Konsol log'larını kaydet (browser DevTools → Console)
- [ ] Bug listesini önceliklendir (work_minutes vs station_id vs phase)

### Test Sonrası 24 Saat
- [ ] Bulunan her bug için issue/task aç
- [ ] Quick fix'leri (5-10 dk) uygula
- [ ] Karmaşık fix'leri (mimari) post-pilot'a ertele
- [ ] PDKS-BUG-ANALYSIS dökümanını "TEST SONUÇLARI" bölümüyle güncelle

### Pilot Day-1'e Kadar (12 May)
- [ ] Tüm P0 bug'lar fix'lenmiş olmalı
- [ ] En az 3 başarılı end-to-end vardıya açma/kapatma yapılmış olmalı (work_minutes > 0, phase='tamamlandi', station_id≠NULL)
- [ ] Eren bağımsız olarak vardıya açıp kapatabilir konuma gelmeli

---

## 🛠️ TEST ÖNCESİ HAZIRLIK CHECKLIST

**Aslan'ın test öncesi yapacakları:**
- [ ] 2 açık vardıya kapatılmış olmalı (`migrations/2026-05-04-close-orphan-shifts.sql` execute)
- [ ] Eren'in `factory_staff_pins` kaydı `is_active=true`
- [ ] Eren'in PIN'i bilinen değer (test için)
- [ ] Espresso İstasyonu (id=5) `factory_stations` tablosunda `is_active=true`
- [ ] Test reçetesi seçimi (kısa süreli, 5-10 dk'lık bir reçete olsun)
- [ ] DevTools açık, Network ve Console tab'ları görünür
- [ ] psql shell hazır (sorguları hızlı çalıştırmak için)

**Eren'in test öncesi yapacakları:**
- [ ] Kahve içmiş olsun (sabah testi için)
- [ ] Notepad açık olsun (UI'da gördüğü adımları yazsın)
- [ ] Acele etmesin — her butona basmadan önce 2 saniye dursun

---

## 📞 TEST SIRASINDA BAĞLANTI

- **Aslan:** psql + DevTools'ta canlı doğrulama yapacak
- **Eren:** Kiosk'u kullanacak, gözlemleri sesli aktaracak
- **Süre:** 1 saat (5 adım × ortalama 12 dakika)
- **Backup plan:** Bug çıkarsa adım atlama yok — bug'ı belgele, sonraki adıma geç

---

## ✍️ TEST SONUÇLARI BÖLÜMÜ (Yarın doldurulacak)

### Adım 1 Sonucu:
- [ ] PASS / [ ] FAIL — Notlar:

### Adım 2 Sonucu:
- [ ] PASS / [ ] FAIL — Notlar:
- station_id değeri:

### Adım 3 Sonucu:
- [ ] PASS / [ ] FAIL — Notlar:
- production_logs.session_id NULL mu?:

### Adım 4 Sonucu:
- [ ] PASS / [ ] FAIL — Notlar:
- duration_minutes değeri:

### Adım 5 Sonucu:
- [ ] PASS / [ ] FAIL — Notlar:
- work_minutes değeri:
- phase final değer:

### Genel Karar:
- Pilot Day-1 hazırlığı: GO / NO-GO
- Acil fix listesi:
- Post-pilot iyileştirme listesi:

---

## 📚 İLGİLİ DOSYALAR

- `client/src/pages/fabrika/kiosk.tsx` (2897 satır — kiosk UI)
- `server/routes/factory.ts:1682` — `/api/factory/kiosk/end-shift` handler
- `server/routes/factory-recipes.ts:2019` — `/api/factory/recipes/:id/start-production`
- `migrations/2026-05-04-close-orphan-shifts.sql` — test öncesi orphan kapatma
- `docs/audit/FABRIKA-DEEP-SCAN-4-MAYIS-2026.md` — bug detaylı analizi
- `docs/audit/FABRIKA-AUDIT-4-MAYIS-2026.md` — Claude'un mimari raporu
