# ⏳ PENDING — Bekleyen İşler

> **Sahibi belli, deadline'lı, alıştırma listesi.** Yeni oturum: bu dosyayı okuyup öncelik sırasına git.

---

## 🚨 BU GECE/SABAH (Pilot Bloker)

### P-1: Devir Teslim PR Aç + Mergele 🔴 ASLAN
**Süre:** 3 dk  
**Sahibi:** Aslan  
**Deadline:** ASAP (yeni Claude session öncesi)

**Adımlar:**
1. https://github.com/bombty/DOSPRESSO-App/pull/new/claude/devir-teslim-2026-05-05-temiz
2. Title: `docs+skills: Devir teslim 5 May 2026 + V2 finalize`
3. "Create pull request" → "Squash and merge" → "Confirm"

**Not:** Hotfix #21 ZATEN MERGELENDİ (bu ayrı bir PR'dı, tamamlandı).

---

### P-2: Replit Sync + Workflow Restart 🔴 REPLIT
**Süre:** 2 dk  
**Sahibi:** Replit  
**Deadline:** P-1 mergelendikten hemen sonra  
**Bağımlılık:** P-1

**Adımlar:**
1. `git checkout main && git pull origin main`
2. Workflow restart
3. Screenshot doğrulama (esbuild OK, login sayfası render)
4. `grep -c '^<<<<<<<\|^=======$\|^>>>>>>>'` — hepsi 0 olmalı

---

### P-3: Sprint 8 EXECUTE Migration 🔴 REPLIT
**Süre:** ~45 dk  
**Sahibi:** Replit isolated task agent  
**Deadline:** P-2'den sonra  
**Bağımlılık:** P-1, P-2 + Aslan Plan mode  
**Plan dosyası:** `.local/tasks/sprint-8-execute.md`

**Adımlar:**
1. Aslan: Mode'u Plan'a çevir
2. Replit: Project Task aç (proposeProjectTasks)
3. Aslan: Onayla
4. Isolated agent:
   - `pg_dump` backup → `migrations/backups/pre-sprint-8-EXECUTE-2026-05-05-XXXX.sql`
   - Migration 1: `2026-05-05-sprint-8-data-cleanup-personnel-sync.sql` (5 ADIM, 329 satır)
     - 18 fake şube → is_active=false
     - 119 fake personel → is_active=false (HQ + pilot şubeler korunur)
     - 35 gerçek personel UPSERT (Fabrika 10, Ofis 5, Işıklar 11, Lara 9)
     - 5 default skor kriteri seed
   - Migration 2: `2026-05-05-payroll-parameters-2026-seed.sql` (130 satır, 2026 vergi/SGK)
   - Smoke test (5 endpoint)
   - Sayfa test (6 sayfa, Playwright)
   - PR aç
5. Aslan: PR mergele
6. Aslan: Mode'u Build'e geri çevir

**Acceptance:**
- 4 aktif şube ✅
- 35-46 personel ✅
- 5 skor kriteri (totalMaxPoints=90)
- payroll_parameters 1 aktif kayıt (year=2026)
- Bordro hesabı: SGK + vergi + net ≠ 0
- 6 sayfa render OK

---

## 🟡 BU HAFTA (Pilot Hazırlık)

### P-4: Mahmut Payroll Parameters Doğrulama 🟡 MAHMUT
**Süre:** 30 dk  
**Sahibi:** Mahmut (muhasebe sorumlusu)  
**Deadline:** Pilot 12 May ÖNCESİ

**Yapılacak:**
- Resmi Gazete asgari ücret 2026 yayını → 33.030 TL brüt / 28.075,50 TL net
- SGK 2026 prim oranları → %14 işçi / %20.5 işveren / %1 işsizlik işçi / %2 işsizlik işveren
- GİB 2026 vergi dilimleri → 5 dilim
- Yemek/ulaşım muafiyetleri → 300 TL / 158 TL günlük

**Eğer farklı:**
```sql
UPDATE payroll_parameters 
SET 
  minimum_wage_gross = <kuruş>,
  minimum_wage_net = <kuruş>,
  ...
WHERE year = 2026 AND is_active = true;
```

---

### P-5: Pilot 4 Lokasyon Final Hazırlık 🟡 ASLAN + COACH
**Süre:** 2 saat  
**Sahibi:** Aslan + Coach  
**Deadline:** Pilot 12 May Pazartesi 09:00

**Yapılacak:**
- Şube müdürleri brifingi (Mahmut Hibrit C strategy)
- 4 lokasyonda kiosk hesapları test
- 35 personelin ilk login bilgileri (admin oluşturmalı)
- Mr. Dobody onboarding flow test
- Pilot iletişim kanalı (WhatsApp grup veya Slack)

---

## 🟢 PİLOT SONRASI (Sprint 17+)

### P-6: Akademi 11 Boş Tablo Seed 🟢 ASLAN + COACH
**Süre:** 1 hafta (içerik hazırlama)  
**Sahibi:** Aslan + Coach  
**Bekleyen tablolar:**
- module_lessons (0)
- module_videos
- module_quizzes
- training_assignments
- 7 diğer

**Gereken:**
- Eğitim videoları (en az 5-10 başlangıç)
- Quiz soruları (her modül için)
- Onboarding doc'ları

---

### P-7: module_flags.stok Pilot Enable 🟢 ASLAN
**Süre:** 30 dk  
**Sahibi:** Aslan karar  
**Soru:** Pilot şubelerin stok takibi yapacak mı?  
**Eğer evet:**
- module_flags.stok=true (4 pilot şube için)
- 113+ malzeme seed (HAM kodları'ndan eşleştir)
- Sayım UI test

---

### P-8: monthly_payroll Deprecation 🟢 CLAUDE + MAHMUT
**Süre:** 3 hafta (15 Haz sonrası)  
**Sahibi:** Aslan karar + Claude implementation  
**Detay:** `docs/DECISIONS-MONTHLY-PAYROLL.md` (6 action item)

---

### P-9: GitHub Branch Protection 🟢 ASLAN
**Süre:** 5 dk  
**Sahibi:** Aslan  
**Deadline:** Hotfix mergelendikten sonra  
**Ne için:** Direct push yasaklansın, PR mecburi olsun  
**Etki:** Bu gece yaşanan "30 marker push" olayı tekrar olmasın

**GitHub UI:** Settings → Branches → main → Branch protection rules
- Require pull request before merging
- Require approvals (1)
- Dismiss stale reviews

---

### P-10: pg_stat_statements + APM 🟢 DEVOPS
**Süre:** 2 saat  
**Sahibi:** Aslan + DevOps  
**Pilot SONRASI:** Slow query ve error endpoint ölçümü için

---

## 🐛 BİLİNEN BUG'LAR (Pilot Sırasında İzlenecek)

### Açık Bug'lar (debug-guide §1-31)
1. §19 - Scheduler bildirim spam (✅ Sprint 16 düzeltildi, izlenecek)
2. §29 - Bordro toplu hesaplama (Sprint 8 sonrası test edilecek)
3. §30 - PDKS aggregation (Sprint B yapılmadı, manuel giriş alternatif)
4. §31 - Procurement modülü dormant (pilot SONRASI)

### Yeni Bulgular
- payroll_parameters seed sonrası bordro hesaplama test gerekir
- monthly_payroll vs monthly_payrolls duplicate (DECISIONS dosyası)

---

## 📋 ÖNCELİK SIRASINI ANLIK BAKIŞTAN OKU

```
🚨 ŞIMDIDI:
  P-1 (Aslan: devir teslim PR #22 mergele)
  P-2 (Replit: git pull origin main - hotfix #21 + Sprint 8-16 dahil)
  P-3 (Replit: Sprint 8 EXECUTE - 2 migration)
  P-4 (Aslan: token kontrol - revoke edildi mi?)

🟡 BU HAFTA:
  P-5 (Mahmut: payroll_parameters 2026 doğrulama)
  P-6 (Aslan: pilot lokasyon hazırlık)
  P-7 (Pilot dry-run 10 May)

🟢 PILOT SONRASI:
  P-8 (Akademi 11 boş tablo seed)
  P-9 (Stok modülü pilot enable kararı)
  P-10 (monthly_payroll deprecation)
  P-11 (Branch protection rule)
  P-12 (APM kurulum + pg_stat_statements)
```

---

**Son güncelleme:** 6 May 2026, 00:30 (Hotfix #21 mergelendi + Devir teslim PR #22 açık)  
**Sonraki güncelleme:** Sprint 8 EXECUTE bittikten sonra
