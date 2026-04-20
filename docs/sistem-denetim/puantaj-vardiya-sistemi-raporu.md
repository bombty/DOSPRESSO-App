# DOSPRESSO — Şube Puantaj & Vardiya Sistemi Denetim Raporu

**Tarih:** 20 Nis 2026 · **Talep:** Aslan + Claude · **Kapsam:** Şubeler için vardiya planlama + giriş/çıkış + PDKS + bordro · **Yöntem:** Salt okuma

---

## BÖLÜM 1 — Vardiya Sistemi Mimarisi (3 Katmanlı)

DOSPRESSO'da puantaj 3 ayrı session tablosunda tutuluyor (kapsam ayrımı):

| Tablo | Kapsam | Toplam Kayıt | Son 30 Gün |
|-------|--------|--------------|------------|
| `branch_shift_sessions` | Şubeler (kiosk) | **174** | **51** |
| `factory_shift_sessions` | Fabrika (kiosk) | **90** | – |
| `hq_shift_sessions` | HQ ofis | **1** | – |
| `shifts` | **Planlanmış** vardiyalar (tüm kapsamlar) | **13,021** | 223 |
| `shift_attendance` | Plan ↔ giriş eşleşme | – | 52 check_in |

> **KEŞIF:** 3 ayrı session tablosu = 3 ayrı UI/endpoint. Şube/Fabrika/HQ için kiosk akışları farklı. Bu **doğru tasarım** (Fabrika'nın istasyon/ürün/lot ihtiyacı şubeden farklı). Fakat şube `branch_shift_sessions` 174 toplam kayıt = **çok düşük** (5 ay × 20 şube ortalama → günde ~1 kayıt).

---

## BÖLÜM 2 — Planlanmış Vardiyalar (`shifts`)

### Aylık Trend
| Ay | Vardiya Sayısı |
|----|----------------|
| 2025-11 | 2,015 |
| 2025-12 | 3,926 |
| 2026-01 | 3,898 |
| 2026-02 | 2,573 |
| 2026-03 | **511** |
| 2026-04 | **98** |

**Son 7 gün: 0 yeni vardiya planlanmış.**

### Pilot 4 Lokasyon (son 30 gün)
| Branch | Vardiya |
|--------|---------|
| Işıklar (5) | 89 |
| Antalya Lara (8) | 67 |
| Fabrika (24) | 66 |
| HQ (23) | 0 |
| Test Branch 1 | 1 (kalıntı) |

### Şablonlar (`shift_templates`)
**Toplam: 1 aktif şablon.** 20 aktif şube → tek bir global şablonla çalışıyor.

> **KEŞIF KRİTİK:** Mart-Nisan'da vardiya planlama **çökmüş** (Aralık 3,926 → Mart 511 → Nisan 98 → son 7 gün 0). Pilot başlangıcına 8 gün kala 4 lokasyonda da yeni vardiya yok. Pilot için Pazar 27 Nis akşamına kadar 28 Nis-4 May haftalık planı **manuel** girilmeli.
> **KEŞIF:** Şablon eksikliği (1 toplam) → her vardiya manuel oluşturuluyor. 20 şube × 7 gün × 2 vardiya = haftada 280 kayıt manuel girmek vakit kaybı.
> **ÖNERİ:** Pilot öncesi 4 pilot lokasyon için "açılış vardiyası" + "kapanış vardiyası" şablonları (haftanın günleri ile) oluşturulmalı. Otomatik vardiya üretimi pilot sonrası.

---

## BÖLÜM 3 — Giriş/Çıkış (Kiosk Check-in)

### `branch_shift_sessions` (kiosk session)
- Toplam 174, son 30 gün **51**, son 7 gün **bilinmiyor (muhtemelen düşük)**.
- `late_minutes`, `early_leave_minutes`, `overtime_minutes` kolonları var → otomatik gecikme/erken çıkış hesabı **destekleniyor**.
- `is_location_verified`, `location_distance` → GPS doğrulama **destekleniyor**.
- `shift_attendance_id` ile planlanmış vardiyaya bağlanıyor.

### `shift_attendance` (son 30 gün)
| status | count |
|--------|-------|
| checked_out | 48 |
| checked_in | 3 |
| present | 1 |
| **TOPLAM** | **52** |

`check_in_photo_url` 30 günlük 52 kayıtta **0 doluluk** → AI dress code analizi devre dışı veya foto adımı atlanıyor.

### Pilot 4 Lokasyon — Son Giriş Tarihi
| Şube | Son Giriş | Toplam |
|------|-----------|--------|
| **Işıklar** | 3 Nis 2026 | 8 |
| Antalya Lara | 30 Mart 2026 | 85 |
| Fabrika | 30 Mart 2026 | 79 |
| HQ | – | 0 |

> **KEŞIF KRİTİK:** Son 17 gün (3 Nis sonrası) hiçbir pilot lokasyonda kiosk girişi yok. Bu = canlı kullanım yok = pilot öncesi **kiosk smoke testi yapılmamış**.
> **KEŞIF:** Foto check-in özelliği var ama kullanılmıyor (52/52 boş). AI dress code skoru kolonu da boş.
> **ÖNERİ:** Pilot öncesi 24-27 Nis arası 4 lokasyonda en az 3'er günlük kiosk smoke testi (her gün 1 sabah + 1 akşam giriş/çıkış). Foto akışı opsiyonel — pilot süresince devre dışı bırakılabilir.

---

## BÖLÜM 4 — PDKS Kayıtları (`pdks_records`)

| Toplam | Farklı User | İlk Tarih | Son Tarih |
|--------|-------------|-----------|-----------|
| **1,285** | 26 | 2 Ock 2026 | **17 Nis 2026** |

Kolon yapısı: `record_type` (giriş/çıkış), `source` (default `kiosk`), `device_info`, `created_by`. **3 ay süren tutarlı PDKS akışı var** ama yalnızca 26 farklı kullanıcıdan.

> **KEŞIF:** PDKS Excel import sistemi (`pdks_excel_imports`, `pdks_excel_records`) var ama bu rakamlar muhtemelen kiosk + manuel karışık. 26 farklı user / 159 aktif → %16 PDKS coverage. Diğer kullanıcıların puantajı manuel veya hiç tutulmuyor.
> **KEŞIF:** Son giriş 17 Nis (3 gün önce) → PDKS sistemi **canlı çalışıyor** (kiosk session'lardan farklı). Muhtemelen Excel import yolu üzerinden besleniyor.
> **ÖNERİ:** Pilot başlamadan PDKS-Excel-Import işleminin pilot 4 lokasyon için Mart sonu — Nisan başı haftalarını kapsadığı doğrulanmalı. Pilot süresince kiosk PDKS otomatik beslemeli (Excel import durdurulabilir veya paralel kullanılabilir).

---

## BÖLÜM 5 — İzin & Düzeltme & Takas

| Tablo | Kayıt | Durum |
|-------|-------|-------|
| `leave_requests` | **35** | Hepsi `approved` ✓ |
| `leave_records` | 0 | Boş, kullanılmıyor |
| `employee_leaves` | 0 | Boş |
| `shift_corrections` | 0 | Düzeltme talebi yok |
| `shift_swap_requests` | 1 | Tek kayıt |
| `shift_trade_requests` | 0 | Boş |
| `attendance_penalties` | 1 | Tek ceza kaydı |

> **KEŞIF:** İzin sistemi **kullanılıyor** (35 onaylı talep). Diğer modüller (düzeltme, takas, ceza) **ölü** veya minimum kullanım.
> **ÖNERİ:** Pilot süresince 4 lokasyonda en az 1 izin talebi + 1 vardiya takas talebi test edilmeli (akış kontrolü).

---

## BÖLÜM 6 — Bordro & Aylık Özet

| Tablo | Kayıt | Açıklama |
|-------|-------|----------|
| `monthly_payroll` | **871** | Asıl bordro tablosu (year+month bazlı) |
| `monthly_payrolls` | 0 | Yedek/eski (kullanılmıyor) |
| `payroll_records` | 0 | Boş |
| `branch_monthly_payroll_summary` | – (kontrol edilmedi) | Şube bazlı agregasyon |
| `branch_weekly_attendance_summary` | – (var, default 100% compliance) | Haftalık özet |

`monthly_payroll` kolonları zengin: `worked_days`, `off_days`, `absent_days`, `unpaid_leave_days`, `sick_leave_days`, `overtime_minutes`, `total_salary`, `base_salary`, `bonus`, `daily_rate`, `absence_deduction`, `bonus_deduction`, `overtime_pay`, `net_pay`, `status` (draft/approved/paid).

> **KEŞIF:** Bordro tablosunda 871 kayıt var → yaklaşık 5 ay × 159 user ≈ tam coverage. Bordro sistemi **çalışıyor**.
> **KEŞIF:** İki paralel tablo (`monthly_payroll` aktif, `monthly_payrolls` boş) — şema temizliği gerekli.
> **ÖNERİ:** Pilot sonrası `monthly_payrolls` (boş, çoğul) drop edilmeli. Pilot 28 Nis-4 May haftası bordro hesabı pilot sonrası gerçek veriden üretilebilir.

---

## BÖLÜM 7 — Olay Kayıtları (`branch_shift_events`)

| event_type | Son 7 Gün |
|------------|-----------|
| (hiç) | **0 olay** |

Tablo şeması: `event_type` (check_in, check_out, break_start, break_end, vs.), `event_time`, `notes`. Session-level event log için tasarlanmış.

> **KEŞIF:** Son 7 günde sıfır olay → kiosk kullanılmıyor → event log da boş. Tablo doğru kurulmuş, içerik akışı kullanım başlayınca otomatik dolacak.

---

## ÖZET TABLO — Sistemin Sağlık Durumu

| Modül | Sağlık | Not |
|-------|--------|-----|
| Vardiya Planlama (`shifts`) | ⚠️ DURGUN | Mart'tan beri planlama çöküyor, son 7 gün 0 yeni vardiya |
| Vardiya Şablonu | ❌ YETERSİZ | 20 şube için 1 şablon |
| Kiosk Check-in (`branch_shift_sessions`) | ❌ ÖLÜ | Son 17 gün 0 giriş, foto/AI devre dışı |
| PDKS (`pdks_records`) | ✅ CANLI | 17 Nis'te bile kayıt var, 1,285 toplam |
| Excel Import | ✅ HAZIR | 5 tablolu sistem mevcut |
| İzin (`leave_requests`) | ✅ KULLANILIYOR | 35 onaylı |
| Vardiya Takası | ⚠️ ZAYIF | 1 swap, 0 trade |
| Düzeltme | ❌ ÖLÜ | 0 kayıt |
| Bordro (`monthly_payroll`) | ✅ ÇALIŞIYOR | 871 kayıt |
| Haftalık Compliance Özet | ⚠️ DEFAULT | Tablo var, default %100 (gerçek hesap çalışmamış olabilir) |
| Olay Logu | ⚠️ BOŞ | Son 7 gün 0 (kullanım yok ki dolsun) |

---

## TASARIM İÇİN 5 ÖNCELİK (Pilot ÖNCESİ — 27 Nis Pazar'a kadar)

1. **🔥 4 pilot lokasyon için 28 Nis-4 May haftalık vardiya planı** — Manuel girilmeli (mevcut planlama Mart sonunda durmuş). 4 lokasyon × 7 gün × 2 vardiya ≈ 56 vardiya. Müdürler 1 saatte halleder.
2. **🔥 Vardiya şablonu seed (4 lokasyon)** — En az "açılış" + "kapanış" şablonları oluşturulmalı. Pilot sonrası genişletilir.
3. **🔥 Kiosk smoke testi (24-27 Nis)** — 4 lokasyonda her gün 1 sabah + 1 akşam check-in/check-out (4 user × 4 gün × 2 = 32 kayıt). Şu an 0.
4. **⚡ Foto/AI dress code akışı kapatılmalı** — Pilot süresince fotoğraflı giriş zorunlu olmamalı (52/52 doluluk = 0). Performans + UX için pilot süresince devre dışı.
5. **⚡ İzin + takas akış testi** — Pilot 1. haftada 1 izin + 1 takas talebi test edilmeli (35 izin + 1 swap mevcut, akış zaten çalışıyor).

## TASARIM İÇİN 3 ÖNCELİK (Pilot SONRASI)

6. **Otomatik vardiya üretimi** — Şablonlardan haftalık plan otomatik basılmalı (cron job).
7. **Haftalık compliance hesap cron** — `branch_weekly_attendance_summary.weekly_compliance_score` gerçek veriden hesaplanmalı (şu an default 100).
8. **`monthly_payrolls` (çoğul) tablosu drop** — Şema temizliği.

---

**Veriler:** Canlı DB (20 Nis 2026 ~20:50). Salt okuma, hiçbir değişiklik yapılmadı.
**İlişkili rapor:** `docs/sistem-denetim/subeler-personeller-gorevler-raporu.md` (Bölüm 5'te kiosk attendance verisi de var).
