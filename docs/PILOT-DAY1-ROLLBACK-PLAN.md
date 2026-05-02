# DOSPRESSO — Pilot Day-1 Rollback / Disaster Recovery Plan

> **Amaç:** Pilot Day-1'de kritik bir hata olursa (P0/P1 incident) sistemi güvenli bir önceki duruma nasıl geri döndüreceğimiz.
> **Tetikleyici:** `docs/PILOT-DAY1-INCIDENT-LOG.md` severity matrisinde **P0** seviyesi (sistem kullanılamaz, veri kaybı riski) veya 2+ **P1** aynı anda.
> **Karar makamı:** Aslan (owner) + Eren (fabrika sorumlu) ortak imza, en az 2 kişi.

---

## 1. Rollback Tetikleyici Senaryolar

| # | Senaryo | Severity | Aksiyon |
|---|---|---|---|
| R1 | Tüm kullanıcılar login olamıyor | P0 | App rollback (workflow restart önce, başarısızsa kod rollback) |
| R2 | DB veri yazma çalışmıyor (5xx flood) | P0 | DB connection check, sonra app rollback, son çare DB restore |
| R3 | Kiosk PDKS kayıt atılmıyor (giriş/çıkış ölü) | P0 | Kiosk endpoint hot-fix veya app rollback |
| R4 | Yanlış maaş/PDKS kayıt birikti (bulk hata) | P1 | Veri restore (transaction-level), kod hot-fix |
| R5 | Schema migration patladı (kolon NULL hata) | P0 | Önceki migration'a geri dön, kod rollback |
| R6 | Mr. Dobody yanlış görev kütlesi açtı (>100 görev) | P1 | Scheduler durdur, görev bulk delete (DB-WRITE protokol) |
| R7 | Kullanıcı parolası sıfırlama bozuldu | P1 | Hot-fix veya admin manual reset |
| R8 | OpenAI fatura sürprizi (>$50/saat) | P1 | Mr. Dobody kapat (env), scheduler durdur |
| R9 | Email bildirimleri gönderilmiyor (SMTP down) | P2 | IONOS SMTP status check, fallback log |
| R10 | Object Storage / S3 erişim yok | P1 | Public URL fallback, dosya upload geçici dondur |

---

## 2. Rollback Sıralama (Hafiften Ağıra)

### Seviye 1 — Workflow Restart (~30 saniye, veri kaybı yok)
```bash
# Replit UI'dan veya:
# Workflow "Start application" → Restart
```
**Ne zaman:** Geçici hata, memory leak, scheduler stuck.
**Kim:** Owner veya Replit Agent (Build modunda).
**Veri etkisi:** YOK.

### Seviye 2 — Kod Rollback (Son 1-3 commit, ~5 dakika)
```bash
git --no-optional-locks log --oneline -10
# Hatalı commit'i tespit et (örn. abc1234)
# Kararı 2 imzayla onayla, sonra:
git revert abc1234 --no-edit
git push origin main
# Workflow auto-restart olur
```
**Ne zaman:** Yeni deploy sonrası bug, test'te kaçan regresyon.
**Kim:** Owner Replit Shell'den manuel (force push yasak).
**Veri etkisi:** YOK (kod geri, DB sabit).

### Seviye 3 — Replit Checkpoint Rollback (~2 dakika, kod + DB ayrı)
```
Replit UI → Checkpoint history → "Restore to this checkpoint"
```
**Ne zaman:** Birden fazla commit bozuk, hızlı geri dönüş gerek.
**Kim:** Owner Replit UI'dan.
**Veri etkisi:** Sadece kod + chat session geri döner. **DB AYRI**, etkilenmez.

### Seviye 4 — DB Snapshot Restore (Neon, ~10-30 dakika)
```
Neon Console → DB → Branches → "Restore from point-in-time"
# Hatalı commit'ten önceki bir noktaya
```
**Ne zaman:** Bulk veri bozulması, schema migration patladı.
**Kim:** Owner Neon UI'dan.
**Veri etkisi:** **GERİ DÖNÜLEMEZ** — restore noktasından sonraki tüm DB yazımı kaybolur.
**ZORUNLU:** Karar öncesi 2 imza + son 2 saat operasyon raporu (kim ne yapmış).

### Seviye 5 — Tam DR (pg_dump restore, ~1 saat)
**Ne zaman:** DB tamamen düştü ve Neon point-in-time çalışmıyor.
**Kim:** Owner + Replit Agent.
**Önkoşul:** Sprint 2 B16 (`pg_dump` cron + S3 yedek otomasyonu) **TAMAMLANMIŞ olmalı**.
**Şu an risk:** B16 yapılmadığı için bu seviye çalışmaz → **Pilot Day-1 öncesi B16 ZORUNLU.**

---

## 3. Karar Akışı (Decision Tree)

```
İncident kaydı (PILOT-DAY1-INCIDENT-LOG.md) → Severity belirle
  ├─ P3 (kozmetik) → Düzelt, rollback yok
  ├─ P2 (1 modül down) → Workflow restart dene → fail ise hot-fix
  ├─ P1 (1 lokasyon/role down)
  │    → 30 dk içinde hot-fix mümkün mü?
  │       ├─ Evet → hot-fix
  │       └─ Hayır → Seviye 2 (kod rollback) + 2 imza
  └─ P0 (sistem kullanılamaz)
       → Hemen Seviye 1 (workflow restart)
       → 2 dk içinde düzelmedi → Seviye 2 (kod rollback) + 2 imza
       → 5 dk içinde düzelmedi → Seviye 3 (checkpoint rollback)
       → DB veri kaybı varsa → Seviye 4 (Neon restore) + 2 imza + 2 saat raporu
       → Tam çöküşse → Seviye 5 (pg_dump restore, B16 sonrası)
```

---

## 4. Pre-Rollback Kontrol Listesi (Her Seviye İçin)

Aksiyondan **ÖNCE**:
- [ ] İncident `PILOT-DAY1-INCIDENT-LOG.md`'de kayıt edildi
- [ ] Severity 2 kişi tarafından doğrulandı (Aslan + Eren)
- [ ] Mevcut durumun screenshot/log'u alındı (`/tmp/logs/` arşivi)
- [ ] Rollback seviyesi 2 imzayla onaylandı
- [ ] Etkilenen kullanıcılara bilgi verildi (WhatsApp grup)
- [ ] Pilot kullanıcılar "duraklatın" uyarısı aldı

Aksiyondan **SONRA**:
- [ ] Rollback başarılı doğrulandı (smoke test: login + 1 endpoint)
- [ ] `PILOT-DAY1-INCIDENT-LOG.md`'ye sonuç + öğrenilen ders yazıldı
- [ ] Etkilenen kullanıcılara "tekrar başla" mesajı gitti
- [ ] DECISIONS.md'ye yeni karar eklendi (gerekirse)
- [ ] Sprint 2 backlog'a yeni iş eklendi (root cause fix)

---

## 5. Communication Plan (Pilot Kullanıcı Bilgilendirme)

### Şablonlar

**Duraklat:**
> "DOSPRESSO'da geçici teknik sorun tespit edildi (~5 dk). Lütfen kullanmaya ara verin, manuel kayıt tutun. Tekrar başlama bildirimi geldiğinde devam edin."

**Devam:**
> "Sorun giderildi. DOSPRESSO tekrar kullanıma açık. Manuel tuttuğunuz kayıtları sisteme girebilirsiniz."

**Veri kaybı:**
> "Saat HH:MM ile HH:MM arası girilen veriler kaybolmuş olabilir. Lütfen kontrol edin, eksikse tekrar girin. Özür dileriz."

**Kanal:** Pilot WhatsApp grubu (Aslan, Eren, Sema, Ümit, Mahmut + pilot kullanıcılar) — kurulum için bkz. `docs/PILOT-COMMUNICATION-PLAN.md`.

---

## 6. Post-Rollback Retro

Her rollback sonrası **24 saat içinde**:
1. **Root cause analizi** — Hangi commit/değişiklik tetikledi?
2. **Test boşluğu** — Bu hata neden test'te yakalanmadı?
3. **Rollback hız** — Kaç dakikada geri döndük? Hedef: P0 < 5 dk.
4. **Kullanıcı etkisi** — Kaç kişi etkilendi? Veri kaybı?
5. **Backlog ekleme** — Aynı sorunun tekrarlanmaması için Sprint 2'de iş ekle.

Çıktı: `docs/audit/rollback-retro-YYYY-MM-DD.md`.

---

## 7. Şu Anki Durum (2 May 2026)

| Seviye | Durum | Notlar |
|---|:--:|---|
| Seviye 1 (workflow restart) | ✅ HAZIR | Replit UI'dan veya Build modunda Agent restart |
| Seviye 2 (kod rollback) | ✅ HAZIR | Son 11 commit görünür, push manuel (force yasak) |
| Seviye 3 (checkpoint) | ✅ HAZIR | Replit checkpoint sistemi otomatik (her merge'de) |
| Seviye 4 (Neon point-in-time) | 🟡 KISMEN | Neon hesabı OK ama point-in-time test edilmedi |
| Seviye 5 (pg_dump restore) | ❌ EKSİK | **B16 (pg_dump cron + S3) henüz yapılmadı — Day-1 öncesi ZORUNLU** |

---

## 8. Eksik Hazırlıklar (Pilot Day-1 Öncesi Tamamlanmalı)

1. **Neon point-in-time restore test** — 1 test branch'te 1 saat öncesine restore çalıştır, tut/sürelerini ölç
2. **B16 implementasyon** — `pg_dump` günlük cron + Object Storage upload + restore playbook
3. **WhatsApp grup kurulumu** — Pilot communication kanalı (bkz. PILOT-COMMUNICATION-PLAN)
4. **Owner + Eren rollback drill** — Bu dökümanı 1 kez birlikte gözden geçir, "şu olursa ne yaparız" prova et
5. **Hızlı erişim kart** — Bu dökümanın bir özetini telefon ekran kilidi resmi yap (Owner + Eren)

---

## 9. İLİŞKİLİ DOKÜMANLAR

- `docs/PILOT-DAY1-CHECKLIST.md` — GO/NO-GO + saat-bazlı izleme
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — İncident kayıt + severity matrisi
- `docs/PILOT-COMMUNICATION-PLAN.md` — Kullanıcı bilgilendirme kanalı + şablonlar
- `docs/runbooks/db-write-protocol.md` — DB yazma acil prosedür
- `docs/runbooks/kiosk-pdks-test.md` — Kiosk smoke test
- `docs/audit/sprint-2-master-backlog.md` — B16 (pg_dump) detay
- `docs/DECISIONS.md` — Yeni karar maddeleri buraya eklenir

---

> **Bu doküman canlı değildir — sadece planlama referansıdır. Gerçek incident anında `PILOT-DAY1-INCIDENT-LOG.md` aktif olur, bu doküman karar akışı için açık tutulur.**
