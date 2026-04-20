# IT Danışman Görev Paketi — Pilot Sertleştirme (C Paketi)

**Hazırlayan:** Replit Agent (PM rolü)
**Tarih:** 21 Nisan 2026
**Deadline:** 26 Nisan 2026 Cumartesi 12:00 (smoke test öncesi)
**Hedef:** DOSPRESSO pilot 28 Nis 2026 Salı go-live için end-to-end zincirin (vardiya → kiosk → bordro → skor) sertleştirilmesi

---

## 0. Kritik Bağlam (ÖNCE OKU)

- **Pilot:** 28 Nis 2026 Salı 09:00, **4 lokasyon**: Işıklar (branchId=5), Lara (branchId=8), HQ (branchId=23), Fabrika (branchId=24)
- **Kullanıcı sayısı:** 270 toplam, pilot ilk hafta ~50-60 aktif
- **4 sayısal başarı eşiği:** login >%95, task >10/lokasyon, error <%5, smoke ≥7/8
- **Mevcut durum:** Cheat-sheet seti (27 rol), Mr. Dobody routing matrisi, vardiya API smoke (201/200 OK) tamamlandı
- **Üçgen iş akışı:** Replit Agent (build/test) → Claude (push/architect) → Aslan (karar) → SİZ (bu görevler)

### Tespit Edilen 11 Risk (referans için)

1. 🔴 Kiosk GPS kontrolü (50m geoRadius) Day-1 blocker
2. 🔴 Coach vardiya planı eksik = bordro yanlış (480 dk varsayım)
3. 🔴 Bordro dataSource belirsizliği (kiosk vs excel)
4. 🟠 Skor sıfırlama Day-1 demotivasyon (0/100)
5. 🟠 Real-time skor write performans yükü (270 user)
6. 🟠 Mola 90 dk aşım bildirim spam'i
7. 🟠 shift_attendance otomatik hesap GPS-bağımlı
8. 🟡 PDKS Excel + Kiosk çakışma çözümü
9. 🟡 monthly_snapshots geçmiş veri kafa karışıklığı
10. 🟡 SGK bordro test mi gerçek mi (DRY_RUN gerek)
11. 🟡 Fabrika vs Şube skor formül farkı (rotasyon yasak ile çözüldü ✅)

---

## GÖREV 1 — Bordro DRY_RUN Flag Sistemi

**Risk #10 çözümü.** Pilot ilk ay sonu (Mayıs 31) Mahmut bordroyu çalıştırırsa **gerçek SGK bildirimi tetiklenmemeli**.

### Mevcut Kod
- `server/services/payroll-calculation-service.ts`
- `server/services/payroll-bridge.ts`
- `server/routes/payroll.ts` (endpoint: `/api/payroll/calculate-unified`)

### İş
1. `payroll-bridge.ts` ve `payroll-calculation-service.ts` içine `dryRun: boolean` parametresi ekle
2. `dryRun=true` ise:
   - `monthly_payroll` tablosuna **SADECE** `is_dry_run=true` flag ile yazılsın
   - SGK external bildirim (varsa) → skip + log
   - Email/SMS bordro bilgisi gönderme → skip
   - Audit log'a "DRY_RUN" markörü
3. Endpoint: `POST /api/payroll/calculate-unified` body'sine `dryRun` field ekle (opsiyonel, default `false`)
4. `monthly_payroll` schema'ya `is_dry_run boolean default false` kolonu ekle (raw psql, drizzle-kit timeout):
   ```sql
   ALTER TABLE monthly_payroll ADD COLUMN IF NOT EXISTS is_dry_run boolean DEFAULT false;
   CREATE INDEX IF NOT EXISTS idx_monthly_payroll_dry_run ON monthly_payroll(is_dry_run) WHERE is_dry_run = true;
   ```
5. Frontend (Mahmut'un kullandığı bordro sayfası) — checkbox: "DRY_RUN modu (pilot için zorunlu, gerçek SGK bildirimi yapmaz)"

### Kabul Kriterleri
- [ ] DRY_RUN modda monthly_payroll satır oluşur, `is_dry_run=true`
- [ ] Gerçek SGK external call yok (kod inceleme + log)
- [ ] Frontend checkbox default ON pilot süresince
- [ ] Audit log "DRY_RUN" markörü mevcut
- [ ] DRY_RUN bordro silinebilir (`DELETE /api/payroll/dry-run/:id` opsiyonel)

---

## GÖREV 2 — branches.geoRadius DB Doğrulama + Düzeltme

**Risk #1 çözümü.** Kiosk shift-start GPS 50m kontrolü. Pilot 4 lokasyon koordinatları yanlışsa Day-1 blocker.

### İş
1. SQL ile mevcut durumu kontrol et:
   ```sql
   SELECT id, name, latitude, longitude, geo_radius
   FROM branches
   WHERE id IN (5, 8, 23, 24);
   ```
2. Eksik koordinat varsa Aslan'dan gerçek değerleri al (Google Maps üzerinden) ve UPDATE
3. `geo_radius` varsayılan 50m yeterli mi kontrol et (şube giriş kapısı + tablet konumu mesafesi)
4. **Önerilen:** Pilot süresince `geo_radius=100` (genişletilmiş, false negative azalt)
5. Test: 4 lokasyon × kiosk login simülasyonu (curl + sahte koordinat)

### Kabul Kriterleri
- [ ] 4 pilot lokasyon × `latitude`, `longitude`, `geo_radius` dolu ve doğru
- [ ] Kiosk shift-start mock GPS ile başarı (within 100m) ve başarısızlık (200m+) testi PASS
- [ ] Doküman: `docs/pilot/sube-koordinat-kontrol.md` (yeni dosya, koordinatlar + harita link)

---

## GÖREV 3 — GPS Fallback (Manuel Onay)

**Risk #7 çözümü.** GPS izni yoksa veya tablet konumu yanlışsa **alternatif** akış.

### İş
1. `kiosk/shift-start` endpoint'inde GPS başarısızsa → "supervisor onayı bekleniyor" status
2. Yeni endpoint: `POST /api/branches/:id/kiosk/shift-start-manual-approve` (supervisor PIN ile)
3. Audit log: GPS bypass nedeni (kullanıcı PIN + supervisor PIN + zaman)
4. Frontend: shift-start GPS başarısız → "Supervisor PIN'i ile devam et" modal

### Kabul Kriterleri
- [ ] GPS başarısız + supervisor PIN ile shift başlatma akışı çalışır
- [ ] Audit log "MANUAL_GPS_BYPASS" eventi yazılır
- [ ] Pilot süresince max %5 manuel bypass uyarısı (alarm: % aşılırsa Mr. Dobody bildirim)

---

## GÖREV 4 — Day-1 Skor Banner (Demotivasyon Önleme)

**Risk #4 çözümü.** Pilot ilk hafta tüm baristalar 0/100 görmeyecek.

### Mevcut Kod
- `client/src/pages/sube/kiosk.tsx`
- "Bugünkü Skorum" widget alanı

### İş
1. Sistem config flag: `pilot_score_display_mode` ('hidden' | 'banner' | 'normal')
2. Pilot ilk hafta (28 Nis - 4 May) → 'banner' modu:
   - Skor görünür ama küçük + üstte uyarı: "📊 Pilot ilk hafta — skorlar toplama dönemi, gerçek değerlendirme 5 May'dan sonra"
3. 5 May 00:00 → otomatik 'normal' moduna geçiş (cron veya admin manuel)
4. Admin paneli: `/admin/pilot-config` (yeni sayfa, config toggle)

### Kabul Kriterleri
- [ ] Kiosk barista ekranında banner görünür ('banner' modunda)
- [ ] Banner kapatılabilir değil (ısrarlı, 1 hafta)
- [ ] 5 May sonrası normal skor görünümü
- [ ] Admin override butonu (test için)

---

## GÖREV 5 — Mola Eşiği Pilot Config

**Risk #6 çözümü.** Pilot ilk gün öğle yemeği uzun sürerse 10+ supervisor bildirimi spam.

### İş
1. `branch_break_logs` mola aşım eşiği şu an 90 dk (hard-coded?)
2. Sistem config: `break_alert_threshold_minutes` (default 90, pilot 120)
3. `notification-frequency-config` tablosuna ekle veya `system_config` tablosu
4. Admin paneli: pilot süresince 120 dk, sonrası 90 dk

### Kabul Kriterleri
- [ ] Pilot süresince 120 dk eşik aktif
- [ ] Eşik DB'den okunur (hard-coded değil)
- [ ] Admin değiştirebilir runtime'da

---

## GÖREV 6 — PDKS Excel Devre Dışı Flag

**Risk #3 + #8 çözümü.** Pilot süresince **sadece kiosk** otorite. Excel import erroneously kullanılmasın.

### İş
1. `system_config` tablosuna ekle: `pdks_excel_import_enabled` (boolean, default true, pilot için false)
2. `pdks-excel-import.ts` route'larında flag kontrolü → false ise 403 + "Pilot süresince devre dışı"
3. Frontend: `/pdks-excel-import` sayfasına banner: "⚠️ Pilot süresince Excel import devre dışı, kiosk verisi otorite"
4. Pilot bitiminde admin tek tıkla yeniden açar

### Kabul Kriterleri
- [ ] Excel import endpoint'i 403 döner pilot süresince
- [ ] Frontend banner görünür
- [ ] Admin toggle çalışır

---

## GÖREV 7 — Bordro DataSource Kilidi

**Risk #3 çözümü.** Mahmut yanlışlıkla excel seçemesin pilot süresince.

### İş
1. `/api/payroll/calculate-unified` body `dataSource: "kiosk" | "excel"`
2. Pilot süresince **server-side override**: Eğer `pilot_mode=true` (system_config) ise → `dataSource` zorla "kiosk" + log
3. Frontend: dataSource seçici disabled + "Pilot — kiosk zorunlu" tooltip

### Kabul Kriterleri
- [ ] Excel seçilse bile server "kiosk" işler
- [ ] Audit log "PILOT_DATASOURCE_OVERRIDE" eventi
- [ ] Frontend disabled + bilgi

---

## GÖREV 8 — Skor Real-Time Yük Testi (270 User)

**Risk #5 çözümü.** Real-time skor UPDATE çakışma performans testi.

### İş
1. Mevcut `scripts/pilot/yuk-testi-5-user.ts` baz alınarak `yuk-testi-270-user.ts` yaz
2. Senaryo: 270 simültane user → her biri 5 dk içinde 3 checklist tamamlama → skor UPDATE
3. Ölçüm: ortalama latency, max latency, error rate, DB connection pool durumu
4. Kabul: ortalama <500ms, max <2000ms, error <%2

### Kabul Kriterleri
- [ ] Yük testi script çalışır
- [ ] Sonuç raporu: `docs/pilot/yuk-testi-270-user-raporu.md`
- [ ] Eğer kabul kriterleri PASS → Aslan onay
- [ ] Eğer FAIL → Mr. Dobody real-time skor flag → batch (5 dk gecikme) öneri

---

## GÖREV 9 — Skor Reset Prosedürü Test (launch-reset.ts)

**Risk #4 + #9 çözümü.** Pilot Pazar 22:30 skor reset doğru çalışıyor mu?

### Mevcut Kod
- `server/scripts/launch-reset.ts`

### İş
1. Test DB üzerinde dry-run: launch-reset.ts çalıştır → hangi tablolar etkilendi?
2. **Kontrol et:**
   - `monthly_employee_performance` → silinmeli mi yoksa is_pilot=true ile işaretlenmeli mi?
   - `employee_performance_scores` → silinmeli
   - `monthly_snapshots` → KORUNMALI (geçmiş trend için)
   - `factory_worker_scores` → silinmeli
3. Doküman: `docs/pilot/skor-reset-prosedur.md` — hangi tablolar reset, hangi korunur

### Kabul Kriterleri
- [ ] launch-reset.ts script tamamen test edildi (dry DB)
- [ ] Reset sonrası `monthly_snapshots` korundu, diğer skor tabloları sıfırlandı
- [ ] Prosedür dokümanı yazıldı
- [ ] Pilot Pazar 22:30 çalıştırma komutu net (`scripts/pilot/00-db-isolation.sql` ile birlikte)

---

## GÖREV 10 — Pilot Mode System Config Tablosu

**Tüm görevler için altyapı.** Tek toggle ile pilot modu aç/kapa.

### İş
1. `system_config` tablosu yoksa oluştur:
   ```sql
   CREATE TABLE IF NOT EXISTS system_config (
     key varchar PRIMARY KEY,
     value jsonb,
     updated_at timestamp DEFAULT now(),
     updated_by varchar
   );
   ```
2. Pilot config keys:
   - `pilot_mode`: true (28 Nis - 4 May)
   - `pilot_score_display_mode`: 'banner'
   - `break_alert_threshold_minutes`: 120
   - `pdks_excel_import_enabled`: false
   - `payroll_force_dry_run`: true
3. Helper: `getSystemConfig(key)` ve `setSystemConfig(key, value, userId)`
4. Admin paneli: `/admin/pilot-config` — tüm key'ler edit edilebilir

### Kabul Kriterleri
- [ ] system_config tablosu mevcut
- [ ] Helper fonksiyonlar tüm görevlerde kullanılır
- [ ] Admin paneli çalışır
- [ ] 5 May 00:00 cron veya admin manuel "pilot_mode=false"

---

## GENEL KABUL KRİTERLERİ (Tüm Görevler)

### Kod Kalitesi
- [ ] TypeScript strict, no `any`
- [ ] LSP diagnostics 0 hata
- [ ] Mevcut DOSPRESSO patterns: TanStack Query, Drizzle ORM, soft-delete, audit log
- [ ] Türkçe UI (kullanıcıya görünen tüm metin)
- [ ] data-testid attributes interaktif elementlerde

### Test
- [ ] Her görev için minimum 1 manuel smoke test
- [ ] Yük testi (Görev 8) sonuç raporu
- [ ] DRY_RUN bordro test (gerçek SGK çağrısı yok doğrulama)
- [ ] GPS bypass + manuel onay end-to-end test

### Dokümantasyon
- [ ] Her görev için `docs/pilot/it-danisman/GOREV-X-rapor.md`
- [ ] Kod değişiklikleri için commit mesajı: "Pilot C Paketi: Görev X — [özet]"
- [ ] replit.md güncel (pilot config bölümü)

### Güvenlik
- [ ] DRY_RUN bypass yok (production'da SGK gerçek bildirim normal)
- [ ] GPS manuel bypass audit log
- [ ] Pilot config sadece admin değiştirebilir (role check)

---

## TESLİMAT

### Branch + Commit
- Branch: `pilot/c-paketi-it-danisman`
- Her görev ayrı commit (cherry-pick edilebilir)
- Final PR: ana branch'e merge için Aslan onayı

### Rapor
- Her görev sonu: `docs/pilot/it-danisman/GOREV-X-rapor.md`
- Final özet: `docs/pilot/IT-DANISMAN-FINAL-RAPOR.md` (tüm görevlerin özet, blocker varsa açıklama)

### Sunum (26 Nis 12:00)
Aslan + Replit Agent ile 30 dk demo + Q&A:
- 4 pilot lokasyon kiosk login + GPS bypass demo
- Mahmut DRY_RUN bordro hesaplama demo
- Pilot mode toggle demo
- Yük testi sonuçları sunumu

---

## SORU/CEVAP

**S:** Görev önceliği?
**C:** Kritiklik sırası: 1, 2, 7, 6, 4, 3, 9, 8, 5, 10. (1+2 olmadan diğerleri yapılamaz)

**S:** Mevcut PR/branch yapısı?
**C:** GitHub: `bombty/DOSPRESSO-App`, ana branch `main`, son commit `ee7364417`. Yeni branch'i main'den çek.

**S:** Test verisi?
**C:** Pilot DB izolasyonu Pazar 22:30. Şu an dev DB'de tüm 270 user mevcut, smoke test güvenli.

**S:** Mr. Dobody / agent sistemine dokunulacak mı?
**C:** HAYIR. Sadece config + payroll + kiosk akışları. Mr. Dobody zaten doğrulandı (mr-dobody-yonlendirme-matrisi.md).

**S:** Bekleyen kararlar?
**C:** Aslan onayı: `bordro-skor-donmus-kararlar.md` dokümanındaki 6 karar (DataSource, skor reset, SGK DRY_RUN, rotasyon yasağı, mola eşiği, yeni rol yasağı). Bu kararlar olmadan kod değişikliği başlanmamalı.

---

## İLETİŞİM

- **PM (Replit Agent):** Soru/eskalasyon → bu doküman üstüne yorum + Aslan'a brifing
- **Karar mercii:** Aslan (CEO) — kritik blocker varsa direkt
- **Acil destek:** WhatsApp Pilot Grubu

---

**Sahip:** Replit Agent (görev tasarım) → IT Danışman (yürütme) → Aslan (final onay)
**Versiyon:** v1.0 / 21 Nis 2026
