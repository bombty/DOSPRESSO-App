# PİLOT DAY-1 İNCIDENT LOG (TEMPLATE)

Day-1 sırasında oluşan tüm hata, gözlem ve sorun raporlarının standart formatta toplandığı tek dosya.

Pilot Day-1 tarihi: **___________________** (doldurulacak)  
Owner: Aslan  
Agent: Replit Agent  
Son güncelleme: 2 Mayıs 2026 (template)

---

## 📋 KULLANIM KILAVUZU

1. Her incident **anında** bu dosyaya kaydedilir (telefon/notebook ile mobil edit OK).
2. Severity P0 → WhatsApp grubuna **anında** bildiril, agent çağrılır.
3. Severity P1 → Saat içinde agent'a iletilir.
4. Severity P2 → Gün sonunda toplu değerlendirme.
5. Her incident'a **unique ID** verilir (D1-001, D1-002, ...).
6. Çözüldüğünde "Çözüm" + "Çözüm Zamanı" alanları doldurulur.

---

## 🚨 SEVERITY TANIMLARI

| Severity | Tanım | Örnek | Eskalasyon Süresi |
|---|---|---|---|
| **P0 — Kritik** | Tüm sistem veya birim down, veri kaybı riski | DB down, tüm kiosklar login alamıyor, production crash | < 15 dk |
| **P1 — Yüksek** | Kritik fonksiyonalite çalışmıyor, ama workaround var | 1 birim kiosk down (manuel PDKS ile devam), kritik widget render olmuyor | < 1 saat |
| **P2 — Orta** | Önemli ama Day-1 akışını engellemiyor | UI bug, yanlış metin, render gecikmesi, kozmetik hata | < 24 saat |
| **P3 — Düşük** | Gözlem, iyileştirme önerisi | "X butonu daha büyük olsa", "Y rapor sayfa numarası eksik" | Post-pilot |

---

## 🔥 ESKALASYON ZİNCİRİ

```
Pilot Kullanıcı (sorunu fark eder)
        ↓
WhatsApp Grubu (kayıt + bildirim)
        ↓
P0/P1 → Owner (Aslan) anında çağrılır
        ↓
Owner → Replit Agent ile birlikte triaj
        ↓
P0 → Acil fix veya rollback (DB-WRITE protokolü)
P1 → Workaround + planlı fix (akşam veya Day-2)
P2/P3 → Incident log + Day-2+ backlog
```

**Acil iletişim:**
- Aslan: ___________________
- Agent: Replit panel üzerinden anında erişim
- Yedek: ___________________

---

## 📊 DAY-1 ÖZET METRİK TABLOSU

(Gün sonunda doldurulur)

| Metrik | Değer |
|---|---|
| **Toplam incident** | __ |
| **P0 sayısı** | __ |
| **P1 sayısı** | __ |
| **P2 sayısı** | __ |
| **P3 sayısı** | __ |
| **Çözüldü (Day-1 içinde)** | __ |
| **Çözülmedi (Day-2'ye taşındı)** | __ |
| **Toplam kiosk login (denemesi)** | __ |
| **Başarılı kiosk login** | __ |
| **Login başarı oranı** | __% |
| **Toplam PDKS kaydı** | __ |
| **Manuel PDKS (kiosk dışı, Excel)** | __ |
| **Sistem downtime (varsa)** | __ dk |
| **Day-2 GO/NO-GO** | __ |

---

## 📝 INCIDENT KAYITLARI

### Kayıt Formatı (Her incident için kopyalanır)

```markdown
### D1-XXX: [Kısa başlık]
- **Zaman:** YYYY-MM-DD HH:MM (Türkiye)
- **Birim:** [HQ / Şube-A / Şube-B / Şube-C / Fabrika]
- **Rol:** [supervisor / mudur / fabrika_mudur / sef / sema / ali / vb.]
- **Kullanıcı:** [isim veya kullanıcı adı]
- **Severity:** [P0 / P1 / P2 / P3]
- **Durum:** [Açık / Çözüldü / Day-2'ye Taşındı / Kapatıldı]

**Ne yapmaya çalışıyordu:**
[Kullanıcı eylem niyeti]

**Ne oldu (gözlemlenen):**
[Hata mesajı, ekran davranışı, beklenmeyen sonuç]

**Beklenen:**
[Doğru davranış ne olmalıydı]

**Etki:**
[Veri kaybı? İşlem yapılamadı? Workaround var mı?]

**Reproduction:**
1. [Adım 1]
2. [Adım 2]
3. [Adım 3]

**Workaround (varsa):**
[Geçici çözüm tarif]

**Root cause analiz (sonradan):**
[Çözüm anında veya sonra eklenir]

**Çözüm:**
[Ne yapıldı? Kod değişikliği / DB write / config / restart / yeniden train]

**Çözüm zamanı:** YYYY-MM-DD HH:MM

**İlgili commit / PR / migration:**
[Commit hash veya migration dosyası]

**Notlar:**
[Ek bilgi, screenshot referansı, log dosyası referansı]
```

---

## 🗂️ AÇIK INCIDENT'LAR

(Day-1 boyunca buraya eklenir)

<!-- Yeni incident'ları yukarıdaki formatla buraya ekle -->

---

## ✅ ÇÖZÜLEN INCIDENT'LAR

(Çözüldükçe buraya taşınır)

<!-- Çözülen incident'ları buraya taşı -->

---

## 📌 DAY-2'YE TAŞINAN INCIDENT'LAR

(Day-1 içinde çözülemeyenler)

<!-- Day-2 backlog -->

---

## 🔄 RUNBOOK SHORTCUT'LARI (P0 / P1 İçin)

### P0: Tüm kiosk login alamıyor
1. `psql "$DATABASE_URL" -c "SELECT 1;"` — DB ayakta mı?
2. Workflow `Start application` status — running mi?
3. `refresh_all_logs` — son 5 dk log'da hata var mı?
4. Çözüm yok ise: Workflow restart → 30 sn bekle → tekrar test
5. Hala çözülmüyor ise: Son commit revert + restart

### P0: DB bağlantısı kopuk
1. Replit panel → Database sekmesi → status check
2. `DATABASE_URL` env var mevcut mu?
3. Neon Database panelinden direkt bağlantı dene
4. Çözülmüyor ise: Replit support + owner bilgilendir, manuel PDKS (Excel) moduna geç

### P0: Workflow crash döngüsü
1. `refresh_all_logs` — crash sebebi
2. Son commit revert → restart
3. Hala crash ise: `git --no-optional-locks log --oneline -10` → daha eski commit'e revert (force YOK, normal git revert)
4. DB değişiklik gerekiyorsa DB-WRITE protokolü

### P1: Tek birim kiosk down
1. O birim için manuel PDKS Excel başlat
2. Diğer 3 birim devam
3. Akşam: o birimin kayıtları Excel import ile DB'ye eklenir
4. Sebep analizi → Day-2 fix

### P1: Belirli rol login olamıyor
1. Kullanıcı `users.is_active = true` mi?
2. Lockout var mı? (`pin_locked_until` veya `account_locked_until`)
3. Rol atama doğru mu? `users.role` kolonu
4. PIN reset (admin endpoint) → tekrar login dene
5. Çözülmüyor ise: workaround → admin override session başlat

### P1: Belirli widget render olmuyor
1. `dashboard_role_widgets` tablosunda atama var mı?
2. Browser console hata var mı? (kullanıcıdan screenshot iste)
3. Widget data API'si hata mı dönüyor? (`/api/me/dashboard-data` test)
4. Geçici workaround: kullanıcı widget'ı manuel collapse, diğer widget'larla devam
5. Day-2 fix backlog

### P2: Yanlış metin / typo / kozmetik
1. Kayıt: hangi sayfa, hangi metin, ne olmalı
2. Day-2+ batch fix
3. Day-1 akışı engellenmiyor → düşük öncelik

---

## 📞 İLETİŞİM KAYITLARI

(Day-1 boyunca yapılan kritik iletişim notları)

| Zaman | Kim → Kim | Konu | Aksiyon |
|---|---|---|---|
| | | | |
| | | | |

---

## 🎯 DAY-1 GÜN SONU DEĞERLENDİRME

(Day-1 kapanışı sonrası owner + agent birlikte doldurur)

### Olumlu Gözlemler
- 
- 

### Sorunlu Alanlar
- 
- 

### Day-2 Öncelik Listesi (Top 5)
1. 
2. 
3. 
4. 
5. 

### Sistem Sağlığı Özeti
- DB: 
- Workflow: 
- Kiosk: 
- Pilot kullanıcı memnuniyeti: 

### Day-2 Kararı
- [ ] 🟢 GO — Day-2 devam, scope sabit
- [ ] 🟡 GO (kısmi) — Day-2 devam, bazı modüller pause
- [ ] 🔴 PAUSE — 1 gün ara, fix gün, sonra devam
- [ ] ⏸ STOP — pilot durduruldu, root cause analizi

---

## 🔗 İLGİLİ DOSYALAR

- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO checklist
- `docs/SPRINT-LIVE.md` — Sprint 1 ilerleme
- `docs/DECISIONS.md` — Pilot kararları
- `docs/TEST-MATRIX.md` — Smoke test akışları
- `docs/runbooks/db-write-protocol.md` — Acil DB müdahale
- `docs/runbooks/git-security-cleanup.md` — Git acil müdahale
- `docs/runbooks/kiosk-pdks-test.md` — Kiosk test akışı
- `docs/plans/hq-kiosk-pin-security.md` — HQ PIN planı
- `docs/plans/shift-attendance-checkout-fix.md` — Check-out fix planı

---

> **Bu template Day-1'de canlı incident log olarak kullanılır. Tüm kayıtlar gerçek zamanlı eklenir, gün sonunda backup edilir (`docs/incidents/day1-YYYYMMDD-incident-log.md` olarak arşivlenir).**
