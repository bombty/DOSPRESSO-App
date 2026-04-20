# Pilot End-to-End Akış Test Listesi

**Tarih:** 21 Nisan 2026
**Test Tarihi:** 26 Nisan 2026 Cumartesi 14:00 - 18:00
**Sorumlu:** Replit Agent (koordinasyon) + IT Danışman (kod) + Coach (operasyon)
**Kapsam:** Vardiya planlama → Kiosk → Bordro → Skor zincirinin uçtan uca smoke test

---

## Hedef

Pilot 28 Nis 09:00 go-live öncesi tüm zincirin **gerçek veri ile** çalıştığının doğrulanması. Her test adımı PASS = pilot hazır.

---

## Ön Hazırlık (26 Nis 09:00 - 14:00)

- [ ] Pazartesi adminhq parola hazır (1Password)
- [ ] Pilot 4 lokasyon DB izolasyon script (`00-db-isolation.sql`) çalışmaya hazır
- [ ] IT Danışman tüm görevler tamamladı (`IT-DANISMAN-GOREV-PAKETI.md`)
- [ ] Aslan tüm 8 kararı onayladı (`bordro-skor-donmus-kararlar.md`)
- [ ] Şube tabletleri hazır (`sube-tablet-hazirlik.md`)
- [ ] Coach 4 lokasyon × 1 hafta vardiya planı taslağı hazır

---

## Test 1 — Vardiya Planlama (Coach)

**Sorumlu:** Coach (yavuz)
**Süre:** 30 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 1.1 | Coach login → `/vardiya-planlama` | Sayfa açılır, şube seçici görünür |
| 1.2 | Şube 5 (Işıklar) seç → 28 Nis - 4 May haftası | Boş tablo görünür |
| 1.3 | 28 Nis Salı için 2 vardiya ekle (08-16 mudur, 16-24 supervisor) | Vardiya satırları görünür |
| 1.4 | "Kaydet" → DB kontrolu (`SELECT * FROM shifts WHERE branch_id=5 AND shift_date='2026-04-28'`) | 2 satır mevcut |
| 1.5 | Şube 8, 23, 24 için aynı işlem (bulk-create UI) | Her lokasyon için planlar mevcut |
| 1.6 | Toplam DB sayım: `SELECT COUNT(*) FROM shifts WHERE branch_id IN (5,8,23,24) AND shift_date BETWEEN '2026-04-28' AND '2026-05-04'` | ≥80 satır (~5 vardiya × 4 lokasyon × 7 gün × 0.6 doluluğa göre) |

**KABUL:** 6/6 PASS = ✅

---

## Test 2 — Kiosk Login + Vardiya Başlatma (Şube)

**Sorumlu:** Şube müdürü + 1 test barista
**Lokasyon:** Işıklar (branchId=5)
**Süre:** 20 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 2.1 | Tablette tarayıcı → DOSPRESSO ana sayfa | Yükleme <5 sn |
| 2.2 | Şube kiosk ekran (`/sube/kiosk`) → personel listesi | Test barista görünür |
| 2.3 | Test barista PIN gir | Login başarılı, dashboard açılır |
| 2.4 | "Vardiya Başlat" tıkla | GPS izin pop-up (zaten verili olmalı) |
| 2.5 | GPS lokasyon doğrulama | "Konum doğrulandı" mesajı |
| 2.6 | DB kontrol: `SELECT * FROM branch_shift_sessions WHERE branch_id=5 ORDER BY started_at DESC LIMIT 1` | 1 satır, status='active' |
| 2.7 | 5 dk bekle → "Mola Başlat" | Mola kaydı |
| 2.8 | 3 dk sonra "Mola Bitir" | `branch_break_logs` 1 kayıt, süre ~3 dk |
| 2.9 | "Vardiya Bitir" | shift-end başarılı |
| 2.10 | DB kontrol: `SELECT * FROM shift_attendance WHERE user_id=...` | 1 satır, planlı vs gerçek karşılaştırma |

**KABUL:** 10/10 PASS = ✅

---

## Test 3 — GPS Bypass (Manuel Onay)

**Sorumlu:** Şube müdürü + supervisor
**Süre:** 10 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 3.1 | Test tabletten GPS izni geçici kapa | Konum hatası |
| 3.2 | Vardiya başlat → "Supervisor PIN ile devam" modal | Modal açılır |
| 3.3 | Supervisor PIN gir | Manuel onay başarılı |
| 3.4 | DB kontrol: audit log | "MANUAL_GPS_BYPASS" eventi var |
| 3.5 | GPS izni geri aç | Normal akış |

**KABUL:** 5/5 PASS = ✅

---

## Test 4 — Bordro Hesaplama (Mahmut)

**Sorumlu:** Mahmut (muhasebe_ik)
**Süre:** 30 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 4.1 | Mahmut login → `/muhasebe-centrum` | MC Muhasebe açılır |
| 4.2 | Sidebar → "Bordro" → "Bordro Hesapla" | Form açılır |
| 4.3 | Ay seç: Nisan 2026, dataSource: KILITLI "kiosk" | Excel seçilemez |
| 4.4 | DRY_RUN checkbox: KILITLI ON (pilot) | Değiştirilemez |
| 4.5 | "Hesapla" tıkla | Progress + sonuç |
| 4.6 | DB kontrol: `SELECT * FROM monthly_payroll WHERE period='2026-04' AND is_dry_run=true` | Satırlar mevcut |
| 4.7 | Bir personel için detay aç → overtime + base salary | Vardiya saatleri ile uyumlu |
| 4.8 | Ek mesai hesabı: planlı 8 saat, gerçek 9 saat → 1 saat × saatlik × 1.5 | Doğru |
| 4.9 | SGK external bildirim log → "DRY_RUN: skipped" | Log mevcut |
| 4.10 | Bordro raporu PDF/Excel indir | İndirme başarılı |

**KABUL:** 10/10 PASS = ✅

---

## Test 5 — Skor Hesaplama (Real-Time)

**Sorumlu:** Test barista + supervisor
**Süre:** 20 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 5.1 | Test barista login → 1 checklist tamamla | Checklist kaydı |
| 5.2 | DB kontrol: `SELECT * FROM employee_performance_scores WHERE user_id=... AND date=CURRENT_DATE` | Skor güncellendi |
| 5.3 | Kiosk barista ekranı → "Bugünkü Skorum" widget | Banner görünür ("Pilot ilk hafta...") |
| 5.4 | Skor değeri görünür ama uyarı bilgisi var | ✅ |
| 5.5 | Supervisor → mission control → personel verim widget | Test barista listede |
| 5.6 | 1 task ata → tamamla → puanla | task_score güncellendi |
| 5.7 | Final composite score: %50 görev + %40 checklist + %10 zamanlama | Doğru hesap |

**KABUL:** 7/7 PASS = ✅

---

## Test 6 — Mr. Dobody Eskalasyon

**Sorumlu:** Test barista + Mr. Dobody intent
**Süre:** 15 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 6.1 | Test barista → Mr. Dobody chat aç | Chat açılır |
| 6.2 | "Espresso makinesi çalışmıyor" yaz | AI yanıt + teknik routing |
| 6.3 | DB kontrol: `agent_actions` tablosunda yeni satır, target_role='teknik' | ✅ |
| 6.4 | Murat.demir (teknik) hesabına bildirim | Bildirim görünür |
| 6.5 | Stok kritik durumu testi: "Süt bitiyor" yaz | mudur + satinalma routing |
| 6.6 | DB kontrol: 2 hedef rol için bildirim | ✅ |
| 6.7 | Müşteri sağlık şikayeti testi: "Müşteri kahveden hastalandı" | kalite_kontrol + recete_gm + acil flag |

**KABUL:** 7/7 PASS = ✅

---

## Test 7 — Yük Testi (270 User Simültane)

**Sorumlu:** IT Danışman
**Süre:** 30 dk

`scripts/pilot/yuk-testi-270-user.ts` çalıştır.

| # | Metrik | Hedef | Sonuç |
|---|--------|-------|-------|
| 7.1 | Login latency ortalama | <500 ms | __ ms |
| 7.2 | Login latency max | <2000 ms | __ ms |
| 7.3 | Shift-start success rate | >%95 | __ % |
| 7.4 | Skor UPDATE çakışma | 0 deadlock | __ |
| 7.5 | DB connection pool max | <%80 doluluk | __ % |
| 7.6 | Error rate | <%2 | __ % |

**KABUL:** 6/6 hedef PASS = ✅

---

## Test 8 — Pilot Mode Toggle

**Sorumlu:** adminhq
**Süre:** 5 dk

| # | Adım | Beklenen Sonuç |
|---|------|----------------|
| 8.1 | adminhq → `/admin/pilot-config` | Sayfa açılır |
| 8.2 | Tüm config keys görünür ve editable | ✅ |
| 8.3 | `pilot_mode=false` toggle test (sonra geri al) | Skor banner kaybolur, mola eşiği 90'a düşer |
| 8.4 | Geri `pilot_mode=true` | Tüm pilot davranışları geri gelir |

**KABUL:** 4/4 PASS = ✅

---

## Final Kabul

| Test | Skor | Durum |
|------|------|-------|
| 1. Vardiya Planlama | __/6 | |
| 2. Kiosk Akış | __/10 | |
| 3. GPS Bypass | __/5 | |
| 4. Bordro DRY_RUN | __/10 | |
| 5. Skor Real-Time | __/7 | |
| 6. Mr. Dobody | __/7 | |
| 7. Yük Testi | __/6 | |
| 8. Pilot Toggle | __/4 | |
| **TOPLAM** | **__/55** | |

### Eşik
- **≥50/55 (~%91):** ✅ Pilot HAZIR — Pazartesi 09:00 go-live
- **45-49/55:** ⚠️ Aslan brifing — kritik bug fix Pazar mesai
- **<45/55:** 🔴 Pilot 1 hafta ertele — 5 May go-live

---

**Sahip:** Replit Agent (test koordinasyon) → IT Danışman (test yürütme) → Aslan (final go/no-go)
**Versiyon:** v1.0 / 21 Nis 2026
