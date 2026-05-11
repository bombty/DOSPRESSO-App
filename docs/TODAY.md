# 📅 TODAY — 11 Mayıs 2026 Pazartesi

> **30 saniye okuma** — şu anki sistem durumu

**Son güncelleme:** 11 May 2026
**Pilot:** **13 May 2026 Çarşamba 15:00** (~35 saat kaldı)
**Pilot Hazırlık:** %99.999

---

## 🎯 ŞU AN AKTİF BEKLİYOR

| Görev | Sahibi | Süre | Engel |
|---|---|---|---|
| **Sprint 14a kiosk test** (HQ + Fabrika 45+15) | Aslan | 30 dk | Yok, test edilebilir |
| **Mahmut bordro 5 BRÜT** | Aslan | 30 dk | Mahmut'a telefon |
| **HQ PIN: eren + hqkiosk** | Aslan | 5 dk | Manuel SQL veya UI |
| **Sema: 36 hammadde + 4 reçete** | Sema | 2 saat | Aslan ona görev iletmeli |
| **Pilot Day-1 dry-run** (P-11, 4 lokasyon × 30 dk) | Aslan + 4 lok başkanı | 4 saat | 12 May 14-18 |

---

## 📊 BUGÜN YAPILANLAR (11 May)

### Tamamlanmış PR'lar

- **PR #72** — Hotfix: Mola kümülatif (45+15) + PIN reset mail
  - 8 commit, 9 dosya, +821/-121 satır
  - Şube kiosk'ta `breakMinutes` kümülatif tracking
  - YENİ: `server/routes/pin-reset.ts` (230 satır, 8 deneme limit + mail)
  - Replit Agent'ın eklediği: `migrations/2026-05-11-long-shift-auto-close.sql` (tek seferlik 12h+ vardiya temizliği)

- **PR #73** — Sprint 14a: Mola sayaç fabrika + HQ kiosk genişletme
  - 8 dosya, +656/-25 satır
  - YENİ tablo: `hq_break_logs` (branch_break_logs benzeri)
  - YENİ kolon: `factory_shift_sessions.break_minutes`
  - YENİ: `server/routes/hq-kiosk-break.ts` (POST break-start + break-end)
  - HQ + Fabrika kioskta BreakCountdown + BreakReturnSummary entegrasyonu
  - Migration: `2026-05-11-hq-factory-break-tracking.sql` çalıştırıldı (7 kayıt backfilled)

### DB Migrations Çalıştırıldı (Replit Agent)

- ✅ `2026-05-11-long-shift-auto-close.sql` (0/0/0 — DB zaten temizdi)
- ✅ `2026-05-11-hq-factory-break-tracking.sql` (hq_break_logs VAR, factory.break_minutes VAR, 7 backfilled)

### Yeni Kararlar (DECIDED.md)

- **D-55:** Long-shift auto-close pilot kapsamından çıkarıldı, Sprint 14+ ertelendi (Aslan kararı 11 May)
- **D-56:** Sprint 14a — Mola sayaç tüm 3 kiosk türünde, kümülatif 45+15 mantığı

---

## 🚦 YARIN (12 May Salı)

### Aslan
- ☎️ Mahmut bordro doğrulama (P-1) — eğer 11 May'da yapılmadıysa
- 🔐 HQ PIN dağıtım (eren + hqkiosk)
- 👤 Sema'ya hammadde + reçete görev mesajı (yapılmadıysa)
- 🧪 Sprint 14a kiosk test (HQ + Fabrika 45+15 senaryosu)
- 🎯 14:00-18:00 Pilot Day-1 dry-run (4 lokasyon)

### Replit Agent
- PAYROLL_DRY_RUN=false (Mahmut bordro hazırsa)
- Smoke test + audit yeniden
- Vardiya planları doğrula

---

## 📅 PILOT YOL HARİTASI

```
11 May Pzt ───── ŞİMDİ (Sprint 14a tamam, doc update tamam)
12 May Salı ─── Dry run + final test + demo + Sema'nın işi
13 May Çar 09-14 ── Smoke + audit + final backup + HQ PIN dağıt
13 May Çar 15:00 ── 🎉 PILOT BAŞLAR (4 lokasyon)
```

---

## ⚠️ DİKKAT

- Pilot tarihi **2 kez değişti**: 5 May → 12 May → 13 May 15:00 (final, D-45)
- Lokasyonlar: Işıklar #5, Lara #8, HQ #23, Fabrika #24
- 4 ürünle başlanacak: Donut Base, Cinnaboom Classic, Cinnaboom Brownie, Cheesecake Base
- **Long-shift auto-close** pilot kapsamı DIŞINDA — manuel müdahale + saatlik `cleanupStaleShiftSessions` ile devam (D-55)

---

## 🟢 DB Verileri Güvende (Aslan sorusu — 11 May)

Replit publish DB'yi sıfırlamaz. DB **Neon serverless PostgreSQL** üzerinde (Replit dışında). `DATABASE_URL` env variable ile bağlanılıyor. Pilot Day-1'de Işıklar girilir → kayıtlar Neon'da kalır → ertesi gün publish → kayıtlar duruyor → Lara açılır → üstüne eklenir. Veri yavaş yavaş birikir, hiçbir publish'te sıfırlanmaz.

İSTİSNA: Migration `DROP TABLE/COLUMN` yaparsa kayıp olur — D-08 Plan Mode + `pg_dump` backup zorunlu.

---

> Detay: `docs/PENDING.md` + `docs/DECIDED.md` + `docs/DEVIR-TESLIM-11-MAYIS-2026-GECE.md`
