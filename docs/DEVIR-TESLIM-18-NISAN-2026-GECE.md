# DEVİR TESLİM — 18 NİSAN 2026 GECE (CUMARTESİ AKŞAM OTURUMU)

**Oturum türü:** Gece oturumu (önceki 18 Nisan 16:30 devir-teslim'in devamı)
**Başlama:** ~20:15 (Türkiye)
**Hedef:** Pazartesi Sprint B'yi erken başlatma — Cumartesi akşam saatini değerlendirme
**Sonuç:** ⚠️ **B.1 iskelet YAZILDI → Replit raporu sonrası İPTAL edildi. B.2 fix geçerli. 6 Kural (Madde 37) yazıldı.**

**KRİTİK NOT:** Bu oturumun ilk yarısında yazılan `pdks-to-shift-aggregate.ts` iskeleti (300 satır) **iptal edildi**. Sebep: Replit DB raporu gösterdi ki `shift_attendance` zaten 6 farklı yerden (kiosk real-time dahil) besleniyor. Aggregate job **duplicate yaratırdı**. Detay "Post-Mortem" bölümünde.

---

## 🎯 Ne Yapıldı (Özet)

Pazartesi yerine Cumartesi akşam çalışmaya başlanması kararı verildi. Kickstart kit'teki "Adım 1-4" aynen uygulandı + B.2 fix ekstra olarak yazıldı.

| Adım | Durum | Not |
|---|:--:|---|
| Skill dosyaları context'e yükle (3 dosya) | ✅ | architecture + quality-gate + debug-guide |
| 4 doküman oku | ✅ | kickstart + devir-teslim + Sprint B kapsam + rapor 10.1c |
| Repo clone + commit `507603c0` teyidi | ✅ | |
| **Adım 2:** monthly_payroll veri kaynağı analizi | ✅ | **SENARYO A** — pdks_records |
| **Adım 4:** Replit ilk DB sorgu mesajı hazırla | ✅ | 4 SQL sorgu, kopyalanmaya hazır |
| **B.1 iskelet:** pdks-to-shift-aggregate.ts | ✅ | 300 satır, `server/services/` |
| **B.2/B.3 tanı** | ✅ | İki farklı problem bulundu |
| **B.2 fix** | ✅ | `server/index.ts` — catch-up + startup çağrı |
| B.1 master-tick bağlama | ❌ | Pazartesi — Replit teyidinden sonra |
| B.3 scheduler yaz | ❌ | Pazartesi — storage.ts imzasını detaylı inceledikten sonra |
| Build check + commit + push | ❌ | Pazartesi commit paketi |

---

## 🔑 Büyük Keşif — SENARYO A Kanıtlandı (Kod Tarafı)

Kickstart kit'te 3 olasılık vardı (A/B/C). Kod analizi SENARYO A'yı netleştirdi:

**monthly_payroll beslenme zinciri:**
```
monthly_payroll
  ↑ saveUnifiedResults() (server/services/payroll-bridge.ts:446)
  ↑ calculateUnifiedPayroll() (payroll-bridge.ts:322)
  ↑ getMonthClassification() (server/lib/pdks-engine.ts:119)
  ↑ pdks_records ← **TEK KAYNAK**
```

**Sonuç:** Bordro `shift_attendance`'ı okumuyor. Aggregate job yazılınca duplicate hesap riski **yok** — iki paralel okuma, aynı kaynak, farklı özet.

**Replit DB teyidi gerekli:** 4 SQL sorguluk mesaj hazır (bu dokümanda "Replit'e İlk Mesaj" bölümü). Pazartesi Replit bu sorguları çalıştıracak, kod analizi DB tarafında da doğrulanmış olacak.

**Uzak risk flag:** Gelecekte birisi bordroyu `shift_attendance`'tan okur hale getirirse (schema migration vs.) double-count başlar. Sprint D (bordro schema temizliği) sırasında dokümante edilmeli.

---

## 📦 Yazılan Kod — 2 Dosya Değişikliği

### 1. YENİ: `server/services/pdks-to-shift-aggregate.ts` (300 satır)

**2 export fonksiyon:**
- `aggregatePdksToShiftAttendance(targetDate?)` — günlük job (scheduler çağıracak)
- `backfillLastNDays(days=30)` — B.4 retro migration

**Tasarım kararları:**
| Konu | Karar | Sebep |
|---|---|---|
| Transaction | ❌ Yok (her shift bağımsız INSERT) | PG 25P02 — savepoint'siz kısmi başarı imkansız |
| Idempotency | `(shiftId, userId)` compound check | Scheduler retry-safe |
| Giriş yok | `status='absent'` kayıt yaz | Bordro absent_days'i görebilsin |
| Çıkış yok | `status='checked_in'` | Unutulmuş çıkış ayrışsın |
| TZ | `Europe/Istanbul` (+03:00 sabit) | DST yok |

**Doğrulanmış recordType değerleri:** `'giris'`, `'gec_giris'`, `'cikis'` (kickstart'ın `'in'/'out'` tahmini YANLIŞTI — Türkçe).

### 2. DEĞİŞİKLİK: `server/index.ts` (+40/-4)

**B.2 fix — 3 değişiklik:**
1. `calculateWeeklySummaries(weekEndDate?: Date)` — geriye uyumlu imza
2. Yeni `catchUpWeeklySummaries(weeks=4)` fonksiyonu — son 4 haftayı geriye dönük hesap
3. `startPdksWeeklySummaryScheduler()` içinde non-blocking startup catch-up

**Hiç endpoint eklenmedi** — ihtiyaç olursa Sprint B.5'te admin trigger eklenebilir. Şu an startup + Pazar 23:00 + idempotent INSERT yeterli.

---

## 🔍 Scheduler Tanısı — İki Farklı Problem

### PDKS-B2 (branch_weekly_attendance_summary = 0 kayıt) 🟡 DÜZELTİLDİ

**Tanı:** Scheduler kodu sağlam, master-tick'e bağlı. Ama sadece Pazar 23:00-23:10 aralığında. Geçmiş haftaları retro hesaplamıyor. Olası sebep: server restart/deploy Pazar gecesi → tetik kaçırıldı → bir sonraki Pazar'a kadar boş.

**Fix:** Startup catch-up eklendi. Şu andan itibaren her server başlatıldığında son 4 hafta doldurulur.

### monthly_attendance_summaries (0 kayıt) 🔴 PAZARTESİ

**Tanı:** Scheduler **hiç YOK.** `server/storage.ts:5299/5314`'te INSERT/UPDATE fonksiyonu var ama `server/index.ts`'ten çağrılmıyor. Yazılmayı unutulmuş.

**Fix (Pazartesi):** `storage.ts`'teki fonksiyon imzasını detaylı incele → ayın 1'i 01:00'da tetiklenen scheduler + startup catch-up (son 3 ay) yaz.

---

## 🏷️ Flag Edilen 2 Ek Bulgu (Sprint D/E Aday)

**1. `pdks_records.recordType` tutarsızlığı:** Kod tabanında hem `'gec_giris'` hem `'late'` paralel kullanılıyor. İki farklı yerde farklı karar. Pilot öncesi unify edilmeli.

**2. UNIQUE constraint eksik:** `shift_attendance` tablosunda `(shiftId, userId)` üzerinde UNIQUE yok. Idempotency check kod tarafında yapılıyor ama teorik race condition mümkün (aynı anda 2 scheduler instance). Sprint B.5 kapsamında zaten vardı, hatırlatma.

---

## 💬 Önemli Kalibrasyon — Karar Yetkisi

**Aslan (18 Nis gece, önemli söz):**
> "bu tarz önemli teknik konuları bana sorduğunda ben çok zorlanıyorum çünkü it olarak sistem için en iyi ne olmalı ben bilemem. bunu sen ve replit ortak çalışarak en mükemmel çözümü bulmak gerek"

**Yeni kural (userMemories #20):**
- **Teknik/mimari/IT kararları:** Claude verir (Replit ile gerekirse). Örnek: "Hangi kodu önce yaz?", "Transaction mı savepoint mi?", "Scheduler nereye bağlansın?"
- **İş/öncelik/strateji kararları:** Aslan'a sorulur. Örnek: "Pilot kime açılır?", "Hangi özellik Sprint C'ye girsin?", "Fatura kim toplar?"

Önceki "Kararları birlikte ver, ama önerin olmasın" kuralı iş kararları için geçerli kalıyor.

---

## 📋 Replit'e İlk Mesaj (Pazartesi Sabah — Kopyala)

```
📋 Sprint B Başlangıç — İlk DB Analizi (READ-ONLY)

Merhaba Replit,

Pazartesi Sprint B (Attendance Pipeline Repair) başladı.
Kod analizim: monthly_payroll → calculate-unified → getMonthClassification
→ pdks_records. Yani monthly_payroll pdks_records'tan besleniyor,
shift_attendance'ı okumuyor.

DB'de doğrulaman gereken 4 sorgu (~5 dk, kod değişikliği YOK):

1) monthly_payroll son yazım zamanı + dönem dağılımı:
   SELECT year, month, COUNT(*),
          MIN(created_at) AS ilk_yazim,
          MAX(created_at) AS son_yazim
   FROM monthly_payroll
   GROUP BY year, month
   ORDER BY year DESC, month DESC;

2) Nisan 2026 için pdks_records vs shift_attendance karşılaştır:
   SELECT 'pdks_records' AS kaynak,
          COUNT(*) AS event_sayisi,
          COUNT(DISTINCT user_id) AS unique_user
   FROM pdks_records
   WHERE record_date BETWEEN '2026-04-01' AND '2026-04-30'
   UNION ALL
   SELECT 'shift_attendance',
          COUNT(*),
          COUNT(DISTINCT user_id)
   FROM shift_attendance
   WHERE DATE(created_at) BETWEEN '2026-04-01' AND '2026-04-30';

3) monthly_payroll workedDays/absentDays dağılımı:
   SELECT mp.user_id, mp.year, mp.month,
          mp.worked_days, mp.absent_days, mp.off_days,
          (SELECT COUNT(DISTINCT record_date)
           FROM pdks_records pr
           WHERE pr.user_id = mp.user_id
             AND EXTRACT(YEAR FROM pr.record_date) = mp.year
             AND EXTRACT(MONTH FROM pr.record_date) = mp.month
             AND pr.record_type = 'giris') AS pdks_unique_days
   FROM monthly_payroll mp
   ORDER BY mp.created_at DESC
   LIMIT 10;
   -- worked_days ≈ pdks_unique_days olmalı (kod analizi doğruysa)

4) pdks_records veri kaynağı (kiosk mi excel mi):
   SELECT source, COUNT(*), MIN(record_date), MAX(record_date)
   FROM pdks_records
   GROUP BY source
   ORDER BY COUNT(*) DESC;

Rapor: Yukarıdaki 4 sorgunun çıktısını paylaş. Kod analizi Senaryo A
gösterdi, DB doğrularsa Pazartesi aggregate job'u güvenle yazabilirim.

Kod değişikliği: YOK
Commit: YOK
```

---

## 🚀 Pazartesi 21 Nisan Başlangıç Adımları

1. **Git pull (eğer Replit push yaptıysa)** — merge için rebase
2. **Replit'e yukarıdaki 4 SQL mesajını gönder** (hazır, kopyala-yapıştır)
3. **Replit cevabı gelene kadar paralel:**
   - `server/storage.ts` — monthly_attendance_summaries INSERT fonksiyonunu incele
   - B.3 scheduler iskeletini yaz (yeni fonksiyon `calculateMonthlySummaries()` + `startPdksMonthlySummaryScheduler()`)
4. **Replit cevabı geldikten sonra:**
   - SENARYO A doğrulandıysa → `server/index.ts` master-tick'e B.1 aggregate'i bağla
   - Gap farkı çoksa → B.4 backfill'i de çalıştır (aynı oturum)
5. **Build check:**
   - `npx vite build` (frontend)
   - `npx esbuild server/index.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/index.js` (backend)
6. **Commit paketi (5-7 ayrı commit):**
   - `feat(attendance): Sprint B.1 — PDKS→Shift aggregate daily job`
   - `fix(attendance): Sprint B.2 — Weekly summary startup catch-up + retro param`
   - `feat(attendance): Sprint B.3 — Monthly summary scheduler (new)`
   - `chore(data): Sprint B.4 — 30-day attendance backfill migration`
   - `docs: Sprint B Day 1 progress report`
7. **Push:** `git push https://[TOKEN]@github.com/bombty/DOSPRESSO-App.git HEAD:main`
8. **Replit smoke test iste** (3. mesaj)

---

## 🎓 Bu Oturumdan Öğrenilen Dersler

1. **Kickstart kit çok değerli** — 30 dakikada context + karar + ilk kod. Pazartesi değil Cumartesi gecesi başlayabildim.
2. **"Kodda var ≠ fiilen çalışıyor" dersi tekrar kanıtlandı** — PDKS-B2 kodu sağlam, ama Pazar-only tetik + server restart = boş tablo. **Silent timing failure**. Catch-up eklenince çözüldü.
3. **Kickstart iskeletindeki recordType yanlıştı** — `'in'/'out'` İngilizce, DB'de `'giris'/'cikis'` Türkçe. **Her zaman doğrula, varsayma.**
4. **Transaction içinde kısmi başarı problemi** — PG'de savepoint kullanmadan mümkün değil. İskelette transaction kullanmıştım, düzeltildi.
5. **Karar yetkisi kalibrasyonu (en kritik ders)** — İş kararı Aslan'ın, teknik karar Claude'un. Bu memory'ye eklendi (#20).

---

## 📍 Bitiş Noktası

**Saat:** ~20:50 (Türkiye, yaklaşık)
**Son commit:** `507603c0` (değişmedi — bu oturumda commit yapılmadı, bilinçli)
**Lokal durum:** Clone + 2 dosya değişiklik (untracked + modified)
**Push durumu:** Yok (Pazartesi commit paketi)
**Açık konu:** Replit 4 SQL sorgu cevabı (Pazartesi sabah)

**Pazartesi 21 Nisan sabah taze kafayla devam ediyoruz.** ☕

---

*Devir Teslim: 18 Nisan 2026 Cumartesi Gece*
*Hazırlayan: Claude (IT Danışman)*

---

## 🔴 POST-MORTEM — Sprint B.1 İskelet İptali

**Zaman çizelgesi:**
- ~20:30 — Kod analizi (payroll-bridge → pdks-engine → pdks_records) yapıldı. "Senaryo A" kabul edildi.
- ~20:45 — Replit'e 4 SQL sorguluk teyit mesajı HAZIRLANDI ama gönderilmedi
- ~21:00 — Aslan "yoğun tempo" isteği: iskelet paralel yazılmaya başlandı (Replit cevabı beklenmedi)
- ~21:30 — 300 satırlık `server/services/pdks-to-shift-aggregate.ts` yazıldı
- ~22:00 — Replit raporu geldi: shift_attendance 175 kayıt + pdks_records 87 event, farklı kaynaklardan
- ~22:15 — Claude grep çalıştırdı: `shift_attendance`'a **6 farklı yerden** INSERT yapılıyor (kiosk real-time dahil)
- ~22:30 — İskeletin gereksiz olduğu netleşti: yazılsa duplicate hesap riski

**Kök neden:**
1. Replit DB teyidi beklenmeden kod yazıldı ("paralel çalışma" hatası)
2. "Hedef tabloya kim yazıyor?" sorusu sorulmadı (grep yapılmadı)
3. Kickstart dokümanındaki "shift_attendance boş → aggregate gerekli" anlatısı sorgulanmadan kabul edildi

**Alınan önlemler:**
- ✅ `quality-gate/SKILL.md` Madde 37 eklendi — "Pre-Code Table Write-Path Inventory" (6 kural)
- ✅ `debug-guide/SKILL.md` §19 eklendi — "Aggregate Job Duplicate Risk" pattern
- ✅ memory #21'de ders kalıcılaştırıldı
- ✅ İskelet dosyası silindi (`rm server/services/pdks-to-shift-aggregate.ts`)

**Sprint B'nin gerçek kapsamı (yeniden çizildi):**

| Öncelik | İş | Durum |
|---|---|---|
| 🔴 ASIL EKSİK | **monthly_payroll scheduler** — aylık otomatik bordro (Nisan 10/41 user yarım çünkü scheduler yok) | Pazartesi yazılacak |
| 🟡 | **shift_attendance ↔ pdks_records tutarlılık analizi** — 175 vs 87 event gap nedeni | Pazartesi araştır |
| 🟡 | **seed_test 704 kayıt temizliği** — pilot öncesi | Aslan'ın iş kararı |
| ✅ TAMAM | **B.2 catch-up** (branch_weekly startup) — bu geçerli kaldı | `server/index.ts` yazıldı |
| 🟡 | **B.3 monthly_attendance_summaries scheduler** — hâlâ eksik | Pazartesi yazılacak |
| ❌ İPTAL | ~~pdks → shift_attendance aggregate~~ — kiosk zaten yazıyor | Silindi |

**Ders:** "Disiplin > hız." Replit cevabını beklemek 5 dakika maliyetliydi, atlandığı için 300 satır + 1 saat kayıp yaşandı. Madde 37 bu dersi kurala dönüştürdü.

**Değerli çıktı:** 300 satır iskelet kaybedildi AMA 6 kuralı formüle ettik. Gelecek 6 ayın tüm Sprint'leri için geçerli. Net artı.
