# ⏳ PENDING — Bekleyen İşler

> **Sahibi belli, deadline'lı, alıştırma listesi.** Yeni oturum: bu dosyayı okuyup öncelik sırasına git.

**Son güncelleme:** 6 May 2026, 01:00

---

## 🔥 ŞU AN AKTIF (İK Redesign Sprint Sonu)

### P-1: Replit Build Re-run 🔄 REPLIT
**Süre:** ~3 dk
**Sahibi:** Replit (Build mode)
**Deadline:** ŞIMDI (Aslan'ın "build başlat" mesajı sonrası)
**Bağımlılık:** -

**Durum:** `f6eba09be` (orphan `});` fix) push edildi. Replit `npm run build && npx tsc --noEmit` çalıştırıyor.

**Beklenen:** vite ✅ + esbuild ✅ + tsc 0 hata + marker temiz + workflow restart OK.

---

### P-2: PR Aç 🔴 ASLAN
**Süre:** 3 dk
**Sahibi:** Aslan
**Deadline:** P-1 OK gelirse hemen
**Bağımlılık:** P-1 build OK

**Adımlar:**
1. https://github.com/bombty/DOSPRESSO-App/compare/main...claude/ik-redesign-2026-05-06
2. Title: `feat(ik): İK Redesign — 4 fazlı sprint (9 commit, 14 dosya)`
3. Description: `docs/PR-DESCRIPTION-IK-REDESIGN.md` kopyala-yapıştır
4. "Create pull request" → reviewer kendin

---

### P-3: Tarayıcı Smoke Test 🔴 ASLAN
**Süre:** ~10 dk
**Sahibi:** Aslan
**Deadline:** P-2 sonrası
**Bağımlılık:** P-2 PR açıldı

**4 sayfa kontrol:**
1. `/ik-merkezi` — kişisel + yönetici + HQ rol farkları
2. `/ik/izin-talep` — form submission + balance check
3. `/ik/onay-kuyrugu` — izin + mesai liste, approve/reject
4. `/ik/takim-takvimi` — branch scope (HQ tümü, mudur kendi şubesi)

**OK ise:** Squash and merge.

---

### P-4: İK Redesign Migration EXECUTE 🔴 REPLIT
**Süre:** ~5 dk
**Sahibi:** Replit isolated agent (Plan mode + pg_dump backup)
**Deadline:** P-3 mergelendikten sonra
**Bağımlılık:** P-3 mergelendi

**Komut:**
```sql
psql $DATABASE_URL -f migrations/2026-05-06-position-salaries-lara-seed.sql
```

**Idempotent** (ON CONFLICT DO NOTHING), Replit DB raporuna göre 19 pozisyon zaten var, ama Lara'nın 5 pozisyonu kontrol edilir.

**Doğrulama:**
```sql
SELECT position_code, position_name, total_salary/100.0 as TL 
FROM position_salaries 
WHERE effective_from='2026-01-01' AND position_code IN ('intern','bar_buddy','barista','supervisor_buddy','supervisor');
```
Beklenen: 5 satır.

---

## 🔴 SONRAKI ÖNCELİK (Sprint 8 EXECUTE Tamamlama)

### P-5: Sprint 8 EXECUTE — score_parameters DDL Eksikliği 🔴 REPLIT
**Süre:** ~30 dk
**Sahibi:** Replit (önce DDL hazırla, sonra Plan mode EXECUTE)
**Deadline:** P-4 sonrası
**Bağımlılık:** İK redesign mergelendikten sonra

**Sorun:** Replit DB raporu (5 May 21:30) tespit etti:
- `score_parameters` tablosu DB'de YOK (CREATE TABLE eksik)
- Sprint 8 migration sadece `INSERT INTO score_parameters` yapıyor → fail eder
- Drizzle-kit push çalıştırılmamış (replit.md "drizzle-kit push timeout, manuel migration kullan" diyor)

**Çözüm:**
1. `shared/schema/schema-25-score-parameters.ts`'den DDL üret
2. Yeni migration: `migrations/2026-05-06-sprint-8a-score-parameters-ddl.sql`
3. CREATE TABLE çalıştır
4. Sonra Sprint 8 INSERT'leri çalışır

**İçerik (Replit yazacak):**
```sql
CREATE TABLE IF NOT EXISTS score_parameters (
  id serial PRIMARY KEY,
  category varchar(50) NOT NULL,
  display_name varchar(200) NOT NULL,
  max_points integer NOT NULL,
  weight integer NOT NULL DEFAULT 100,
  formula text,
  formula_code varchar(50),
  sort_order integer DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  version integer NOT NULL DEFAULT 1,
  created_at timestamp DEFAULT NOW()
);
```

---

### P-6: Sprint 8 Personnel UPSERT 🔴 REPLIT
**Süre:** ~45 dk
**Sahibi:** Replit isolated agent
**Deadline:** P-5 sonrası
**Bağımlılık:** P-5 score_parameters DDL OK

**Migration:** `migrations/2026-05-05-sprint-8-data-cleanup-personnel-sync.sql`
- 18 fake şube pasifleştir (16 → 4 aktif)
- 35 gerçek personel UPSERT (PERSONEL özlük + Lara Excel'den)
- ~130 fake user pasifleştir

---

## 🟡 PİLOT TARİHİ BELİRLEME (Aslan kararı)

Aslan: "pilot tarihi ben belirleyeceğim" (D-20 pause). Belirlendiğinde:
- TODAY.md'de duyur
- PENDING.md'de Day-1 checklist aktive et (`docs/PILOT-DAY1-CHECKLIST.md`)
- 33 pilot user listesi tamamla (`docs/PILOT-USER-LIST-2026-05.md` taslak halinde)
- Mahmut + Yavuz + Eren imza

---

## 🟢 SONRA İNCELE / TEMİZLE

### P-7: Stash@{0} İncele 🟢 ASLAN+CLAUDE
**Süre:** 5 dk
**Deadline:** İK redesign mergedikten sonra

Aslan'ın main'de yaptığı conflict fix WIP stash'te. Replit:
```
git stash show stash@{0} --stat
git stash show stash@{0} -p | head -50
```
Karar: `apply` mı `drop` mu (büyük ihtimalle PR #21 ile zaten halledildi, drop güvenli).

---

### P-8: Hotfix Branch Cleanup 🟢 ASLAN
**Süre:** 2 dk
**Deadline:** İsteğe bağlı

`hotfix/resolve-merge-conflicts-2026-05-05` branch'i artık kullanılmıyor (PR #21 mergelendi). Sil:
```
git branch -D hotfix/resolve-merge-conflicts-2026-05-05
git push origin :hotfix/resolve-merge-conflicts-2026-05-05
```

---

### P-9: GitHub Branch Protection (Pilot Öncesi) 🟢 ASLAN
**Süre:** ~5 dk
**Deadline:** Pilot tarihi belirlendiğinde

D-06 + D-38: Tüm değişiklikler hotfix branch + PR mecburi. Şu an protocol var, GitHub UI'da teknik enforcement yok. Settings → Branches → main:
- Require pull request before merging
- Require status checks to pass
- Require linear history

---

## 📊 KPIs (Pilot Tarihinde Hedef)

| KPI | Şu An | Hedef |
|---|---|---|
| Pilot 4 lokasyon hazır | ✅ Kararlı | ✅ |
| 35 gerçek personel UPSERT | ❌ (Sprint 8 bekliyor) | ✅ |
| score_parameters seed | ❌ (DDL eksik) | ✅ 5 default |
| İK redesign mergelendi | ❌ (PR bekliyor) | ✅ |
| Mahmut bordro doğrulama | ❌ (Mayıs ay sonu) | ✅ %95+ uyum |
| Pilot user listesi tam | ❌ (TASLAK) | ✅ telefon/email dolu |
| Day-1 checklist aktive | ❌ | ✅ |

---

## 📋 Tamamlandı (Bugün — Kayıt İçin)

- ✅ PR #25 (payroll 2026 resmi kaynaklar) mergelendi
- ✅ İK redesign master plan
- ✅ position_salaries Lara seed migration
- ✅ hr.ts:2187 orphan fix
- ✅ DECIDED.md D-39, D-40, D-41 + D-20 pause notu
- ✅ TODAY.md + PENDING.md güncel
- ✅ PR description hazır
- 🔄 4 skill dosyası güncel (paralel iş)

---

**Son güncelleme:** 6 May 2026, 01:00
**Bir sonraki güncelleme:** Replit build sonucu sonrası (PR aç ya da fix)
