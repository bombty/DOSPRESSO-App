# Pilot 28 Nis 2026 — Dokümantasyon Merkezi

## Kriz Notu (Aslan Kararı 19 Nis)

> **Kriz anında IT rollback yetkisine sahiptir. Diğer tüm kararlar Aslan'a bağlıdır. Pazartesi 28 Nis pilot kesin başlıyor — erteleme yok.**

---

## Pilot Lokasyonları (4)

| ID | Şube | Branch_ID |
|---|---|---|
| 1 | Merkez Ofis (HQ) | 23 |
| 2 | Fabrika | 24 |
| 3 | Işıklar | 5 |
| 4 | Antalya Lara | 8 |

---

## Hazırlık Dosyaları

### Süreç & Karar
- [`success-criteria.md`](./success-criteria.md) — 4 sayısal eşik + karar kuralı
- [`pzt-28-nis-sprint-plan.md`](./pzt-28-nis-sprint-plan.md) — Saat bazlı Day-1 plan
- [`destek-hatti-prosedur.md`](./destek-hatti-prosedur.md) — Şube WhatsApp destek
- [`internet-kesintisi-prosedur.md`](./internet-kesintisi-prosedur.md) — Offline fallback

### Teknik Hazırlık
- [`f02-kod-inceleme-raporu.md`](./f02-kod-inceleme-raporu.md) — Module flag analizi (KRİTİK)
- [`f03-password-rotation-runbook.md`](./f03-password-rotation-runbook.md) — adminhq rotation
- [`f04-backup-users.patch`](./f04-backup-users.patch) — SPOF backup roles
- [`o06-eren-financial-access.patch`](./o06-eren-financial-access.patch) — fabrika_mudur mali yetki
- [`github-push-runbook.md`](./github-push-runbook.md) — GITHUB_TOKEN setup
- [`db-izolasyon-raporu.md`](./db-izolasyon-raporu.md) — Pilot DB strateji
- [`yuk-testi-raporu.md`](./yuk-testi-raporu.md) — 5 user eşzamanlı test
- [`mobil-test-raporu.md`](./mobil-test-raporu.md) — Telefon + tablet bulgular
- [`sprint-1-f02-fix-plan.md`](./sprint-1-f02-fix-plan.md) — Module flags runtime fix (Sprint I)

### Eğitim
- [`cheat-sheets/`](./cheat-sheets/) — 5 ana rol için 1 sayfa kullanım kılavuzu

### Operasyonel
- [`day-1-report.md`](./day-1-report.md) — 28 Nis 18:00 raporu (Pazartesi yazılır)

### Agent Koordinasyon
- [`../AGENT-OWNERSHIP.md`](../AGENT-OWNERSHIP.md) — Replit agent + Claude path sahipliği

---

## Pilot Süresi

| Tarih | Aktivite |
|---|---|
| 27 Nis Paz 23:00 | DB backup (`/tmp/pilot-backup-2026-04-27.sql`) |
| 28 Nis Pzt 08:00 | Day-1 Sprint başlangıç |
| 28 Nis Pzt 18:00 | Day-1 raporu + 4 eşik değerlendirme |
| 29 Nis - 4 May | Günlük operasyon (smoke test her gün) |
| 5 May Pzt 18:00 | Day-7 final karar (rollout / uzatma / iptal) |
