# 🤝 DOSPRESSO Claude Code Handoff (6 May 2026)

> **Hedef:** Bu dosyayı okuyan Claude Code, DOSPRESSO geliştirme sürecini sıfırdan devralabilir. Tek başına yeterli, alt dosyalar referans.
>
> **Senin için:** İlk işin bu dosyanın TAMAMINI okumak. Sonra `.agents/skills/*/SKILL.md` 4 dosyasını oku. Sonra `docs/DECIDED.md` (41 karar) ve `docs/PENDING.md` (öncelik). En son `docs/PR-DESCRIPTION-IK-REDESIGN.md` (acil iş).

---

## 🎯 TEK SAYFADA BAĞLAM

**Sen kimsin:** Claude Code, DOSPRESSO franchise yönetim platformunun yeni geliştirme partneri. Aslan'a çalışıyorsun.

**Şu an ne durumda:**
- **Active branch:** `claude/ik-redesign-2026-05-06` (12 commit, push'lı, HEAD: `2396d5158`)
- **Bekleyen:** Replit build re-run sonucu → PR aç → smoke test → mergele → migration EXECUTE
- **Pilot tarihi:** TBD (Aslan belirleyecek, eski 12 May ertelendi)

**İlk işin:** PR aç (`docs/PR-DESCRIPTION-IK-REDESIGN.md` kopyala-yapıştır). Sonra Aslan smoke test yapacak, sen mergele.

**Sonraki büyük iş:** Sprint 8 EXECUTE — `score_parameters` DDL eksikliği + 35 personnel UPSERT.

---

## 🏗️ DOSPRESSO NEDİR

**Ne:** Türk kahve + donut zinciri (Antalya merkezli) için tam stack ERP/LMS/CRM/PDKS platform. Aslan'ın kişisel projesi, kendi franchise'ını yönetiyor.

**Ölçek (6 May 2026):**
- 23 aktif şube (4 lokasyon pilot kapsamında: Işıklar #5, Lara #8, HQ #23, Fabrika #24)
- 478+ database tablosu, 25 schema modülü (Drizzle ORM)
- 1985+ API endpoint, 113 route dosyası
- 322 sayfa, 160+ React route
- 23 aktif rol + 8 phantom rol (31 toplam)
- 33 pilot kullanıcı (gerçek kişi adlarıyla)
- 478 = backend kayıtlı pgTable; sayı zamanla artıyor

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite (SPA, NOT Next.js), Shadcn/ui + Tailwind, TanStack Query v5
- **Backend:** Node.js + Express + TypeScript, Passport.js (Local + Session)
- **DB:** PostgreSQL (Neon serverless) + pgvector
- **ORM:** Drizzle ORM 0.39 (Drizzle-Kit migration)
- **AI:** OpenAI GPT-4o + Vision + Embeddings (Mr. Dobody agent)
- **Storage:** AWS S3 (Replit Object Storage)
- **Build:** Vite (frontend) + Esbuild (backend) **— ikisi de zorunlu**

**Repo:**
- GitHub: `bombty/DOSPRESSO-App` (Aslan'ın hesabı `bombty`)
- Default branch: `main`
- Active dev branch: `claude/ik-redesign-2026-05-06`
- Push format: `git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" BRANCH`
  > **Token:** Aslan sana **konuşmada** verecek (mesaj olarak). Asla dosyaya yazma. (D-05 token disiplini)

**Login:**
- Web: `admin / 133200`
- Replit URL: Aslan paylaşacak

**Pilot Lokasyonlar (4 şube):**
1. **Antalya Işıklar #5** — HQ-owned (Aslan'ın kendi)
2. **Antalya Lara #8** — Franchise (Andre = mudur, Berkan + diğer baristalar)
3. **Merkez HQ #23** — Mahmut'un yeri (muhasebe_ik)
4. **Fabrika #24** — Eren mudur, Sema gida_muhendisi

---

## 👥 TRIANGLE WORKFLOW (D-01 + 6 May netleşmiş)

### 🧑‍💼 Aslan = Owner
**Rol:** Karar, business, GitHub PR merge, UX, öncelik
**KRİTİK:** Aslan **IT uzmanı değildir**. Bu prensip her etkileşimi şekillendirir:
- Komutlar net, **kopyala-yapıştır** şeklinde verilmeli
- Çok seçenek = paraliz; net öneri ile karar kolaylaştır
- Teknik jargon az, business dili çok
- iPad mobile-first (telefonu da var ama iPad'de daha çok çalışıyor)
- Karar gereken sorular **explicit** sun, yorumda saklı kalmasın

### 🤖 Sen (Claude Code) = Mimari + Kod + GitHub
**Rol:** Replit'in yapamadığı her şey
- Plan dökümanı + sprint planlama
- Mimari kararlar + schema tasarımı
- Kod yazımı + GitHub branch + PR push
- Skill update + dokümantasyon
- 6 perspektif review tablosu (her major karar)
- Büyük migration yazımı (Replit küçük SQL'ler)

### 🔧 Replit Agent = DB + Build + Test
**Rol:** Sandbox-restricted işler
- **Plan mode + isolated agent:** DB write, schema, migration, env değişiklikleri (pg_dump backup zorunlu)
- **Build mode:** kod editi (limited), doc, test, build verification, smoke test
- **Sandbox kısıtı:** Git destructive komutlar (`stash`, `checkout`, `reset`, `pull --rebase`) yasak — Aslan Shell'den manuel yapar

**Replit URL:** Aslan sana paylaşacak (production deployment).

---

## 📍 ŞU ANKI DURUM (6 May 2026, 02:30)

### Active Branch: `claude/ik-redesign-2026-05-06`

**12 commit, push'lı, HEAD: `2396d5158`**

| # | Commit | Tip | İçerik |
|---|---|---|---|
| 1 | 35b80edd9 | docs | İK redesign master plan (4 faz) |
| 2 | d9c57051b | fix | position_salaries Lara matrisi seed |
| 3 | 3d0cc7a87 | feat | /ik-merkezi v2 — Mahmut-first dashboard |
| 4 | 0eb6508d9 | feat | payroll-engine dual-model + asgari ücret |
| 5 | 5cbc8b477 | feat | payroll-bridge dual-model sync |
| 6 | cac6cd34a | feat | bireysel bordro 3 endpoint |
| 7 | a74aaa12a | feat | Faz 3 — izin/mesai talep + bordrom PDF |
| 8 | 2bdcd5ba3 | feat | Faz 4 — takım takvimi + bordro onay + kuyruk |
| 9 | f6eba09be | fix | hr.ts:2187 orphan `});` (esbuild fix) |
| 10 | deb08a56b | docs+skills | 6 May session update (D-39/40/41) |
| 11 | 6e17418e9 | docs | PR description (Aslan reference) |
| 12 | 2396d5158 | skills | 4 skill kapsamlı refactor |

### Şu an bekleyen tek şey: Replit Build Re-run Sonucu

Aslan Replit'e şu prompt'u verdi (HEAD `f6eba09be` veya daha eski state'te):
> "branch güncellendi, HEAD: 2396d5158, 12 commit oldu, git pull + npm run build && npx tsc --noEmit çalıştır."

**Beklenen sonuç:**
- ✅ vite (zaten geçiyordu)
- ✅ esbuild (orphan `});` silindi commit #9'da)
- ✅ tsc 0 hata
- ✅ marker count = 0
- ✅ workflow restart OK

**Eğer build OK gelirse:** Aşağıda "🚦 İLK 3 GÖREV" akışına gir.

**Eğer build FAIL gelirse:** Aslan'a hata mesajını sor, debug-guide §37 (orphan), §38 (vite/esbuild farkı), §35 (DB write block) bölümlerine bak.

---

## 🚦 İLK 3 GÖREV (Sırasıyla — PR Akışı)

### 1️⃣ PR Aç
**Sahibi:** Aslan (sen ona prompt verirsin)
**Süre:** 3 dk
**Adımlar:**
1. URL: `https://github.com/bombty/DOSPRESSO-App/compare/main...claude/ik-redesign-2026-05-06`
2. Title: `feat(ik): İK Redesign — 4 fazlı sprint (12 commit, 21 dosya)`
3. Description: `docs/PR-DESCRIPTION-IK-REDESIGN.md` dosyasının TAMAMINI kopyala-yapıştır
4. Reviewers: yok (Aslan kendi mergleyecek)

**Aslan'a vereceğin prompt (kopyala-yapıştır):**
```
GitHub'da PR aç:
1. https://github.com/bombty/DOSPRESSO-App/compare/main...claude/ik-redesign-2026-05-06
2. Title kutusu: feat(ik): İK Redesign — 4 fazlı sprint (12 commit, 21 dosya)
3. Description kutusu: docs/PR-DESCRIPTION-IK-REDESIGN.md içeriğini yapıştır
4. "Create pull request" butonuna bas
5. PR numarasını söyle bana
```

### 2️⃣ Smoke Test (Aslan Yapar)

**Sahibi:** Aslan (Replit deployment'ta tarayıcıdan)
**Süre:** ~10 dk
**Test Edilecek 4 Sayfa:**
1. `/ik-merkezi` — kişisel + yönetici + HQ rol farkları
2. `/ik/izin-talep` — form submission + balance check
3. `/ik/onay-kuyrugu` — izin + mesai liste, approve/reject
4. `/ik/takim-takvimi` — branch scope (HQ tümü, mudur kendi şubesi)

**Aslan ne yapsın:** Her sayfayı aç, görsel kontrol et, hata yok mu doğrula. Hata varsa screenshot al sana göndersin.

### 3️⃣ Mergele + Migration EXECUTE

**Squash and Merge (Aslan yapar):** GitHub UI'dan tek tık.

**Sonra Migration EXECUTE (sen → Replit'e prompt):**
```
🤖 REPLIT'E GÖNDERİLECEK:

Plan mode + isolated agent + pg_dump backup ile şu migration'ı çalıştır:

migrations/2026-05-06-position-salaries-lara-seed.sql

Idempotent (ON CONFLICT DO NOTHING). Beklenen: 5 satır eklendi (Lara stajyer, bar_buddy, barista, supervisor_buddy, supervisor 2026-01-01 effective).

Doğrulama:
SELECT position_code, position_name, total_salary/100.0 as TL 
FROM position_salaries 
WHERE effective_from='2026-01-01' 
AND position_code IN ('intern','bar_buddy','barista','supervisor_buddy','supervisor');

Sonuç olarak 5 satır görmeliyim.
```

---

## 🔥 SONRAKI BÜYÜK İŞ: Sprint 8 EXECUTE

İK redesign mergedikten sonra:

### Sprint 8 — score_parameters DDL Eksikliği + Personnel UPSERT

**Sorun (Replit DB raporu, 5 May tespit etti):**
- `score_parameters` tablosu DB'de **YOK** (CREATE TABLE eksik, sadece INSERT migration var)
- Sprint 8 mevcut migration (`migrations/2026-05-05-sprint-8-data-cleanup-personnel-sync.sql`) çalıştırılırsa fail eder
- Drizzle-kit push timeout veriyor (replit.md belirtilen sorun), manuel migration kullanılıyor

**Senin yapacağın:**
1. `shared/schema/schema-25-score-parameters.ts` dosyasını oku (zaten var)
2. DDL'i çıkar
3. Yeni migration: `migrations/2026-05-06-sprint-8a-score-parameters-ddl.sql` yaz
4. CREATE TABLE IF NOT EXISTS + 5 default kategori seed
5. Aslan'a R3 akışıyla EXECUTE prompt ver Replit'e

**Sonra:** Sprint 8 personnel UPSERT migration'ı (35 gerçek personel + 18 fake şube pasifleştirme).

**Kaynak data:** `docs/PILOT-USER-LIST-2026-05.md` (taslak halinde, Aslan tamamlayacak — telefon/email kolonları boş).

---

## 🔑 41 KARAR (DECIDED.md) — En Kritik 12 Tanesi

> **Tam liste:** `docs/DECIDED.md` (41 karar, hepsi audit trail)

| # | Karar | Önem |
|---|---|---|
| **D-01** | Triangle Workflow (Aslan + Claude + Replit) | 🔴 Temel |
| **D-05** | Token disiplin: ASLA dosyaya yazma | 🔴 Güvenlik |
| **D-06** | Hotfix branch + PR mecburi (main'e direkt push yok) | 🔴 Güvenlik |
| **D-07** | 6-perspektif mental review (D-39 ile genişletildi) | 🟠 Kalite |
| **D-12** | Muhasebe scope = HQ + Fabrika + Işıklar (sadece) | 🟠 Business |
| **D-19** | monthly_payroll = kanonik aktif tablo (4 paralel tablo değil) | 🟠 Schema |
| **D-22** | branch_monthly_payroll_summary DEAD (kullanma) | 🟠 Schema |
| **D-26** | Plan mode = DB; Build mode = code/doc | 🟠 Workflow |
| **D-29** | 4 skill + 3 MD oturum sonu zorunlu update | 🟠 Workflow |
| **D-38** | Pre-commit marker + token check zorunlu | 🟠 Güvenlik |
| **D-39** | 6. perspektif End User (Persona-Specific) | 🟢 Yeni (6 May) |
| **D-40** | Lara Stajyer Excel sadakati + sistem fallback | 🟢 Yeni (6 May) |
| **D-41** | Hub-first sidebar (yeni İK sayfaları sidebar'a girmez) | 🟢 Yeni (6 May) |
| **D-20 NOTU** | Feature Freeze PAUSE (6 May, Aslan kararı) | 🟡 Pause |

---

## ⚠️ 39 BUG PATTERN (debug-guide) — En Sık 7 Tanesi

> **Tam liste:** `.agents/skills/dospresso-debug-guide/SKILL.md` (§1-§39)

| Bölüm | Pattern | Belirti | Çözüm |
|---|---|---|---|
| **§17** | Drizzle schema vs DB kolon uyuşmazlığı | "column X does not exist" | Schema'yı DB ile sync, drizzle-kit push |
| **§19** | TanStack stale cache | UI eski veri gösteriyor | invalidateQueries +refetch |
| **§24** | Auth chain 401/403 | "Yetki yok" | Middleware sıra: auth → role → permission → branch scope |
| **§32** | Conflict marker push | esbuild crash | Pre-commit `grep -rE '^<<<<<<<'` zorunlu |
| **§37** | Orphan `});` (5 May 2026) | esbuild "Expected finally" | Tek satır sil, `npm run build` doğrula |
| **§38** | Vite ✅ + Esbuild ❌ | dev OK, prod fail | İkisi de zorunlu, sadece dev test yetmez |
| **§39** | Compaction branch drift | "X yapılmamış" deyince zaten yapılmış | Oturum başı `git log --oneline origin/main..HEAD` |

---

## 🚨 34 QUALITY GATE (skills/dospresso-quality-gate) — Kritik 8 Tanesi

> **Tam liste:** `.agents/skills/dospresso-quality-gate/SKILL.md` (QG-1 → QG-34)

| QG | Kontrol | Süre |
|---|---|---|
| **QG-1** | Tüm endpoint'lerde auth middleware | 5 dk grep |
| **QG-2** | UI Türkçe (ASCII yaklaşıklık yok) | 2 dk grep |
| **QG-9** | Endpoint ↔ DB tablo tutarlılık | Replit DB sorgu |
| **QG-28** | Conflict marker = 0 (push öncesi) | 30 sn grep |
| **QG-31** | Token kontrol (push öncesi) | 30 sn grep |
| **QG-32** | Vite + Esbuild ikili build (yeni) | 1 dk |
| **QG-33** | tsc --noEmit ayrı kontrol (yeni) | 1 dk |
| **QG-34** | Branch state drift (oturum başı) | 30 sn |

**Push öncesi minimum:** QG-28 + QG-31 + QG-32 + QG-33.

---

## 👤 7 PERSONA — 6 Perspektif Review (D-39)

| Persona | Rol | Cihaz | Bağlam | Kritik Sorular |
|---|---|---|---|---|
| **Aslan** | CEO | Bilgisayar/iPad | Genel yönetim | Komut net mi? Karar gerek mi? |
| **Mahmut** | muhasebe_ik | Bilgisayar | Ay sonu | 30 dk eğitimle öğrenilir mi? |
| **Berkan** | barista (Lara) | Cep telefonu | Mola arası 5 dk | Form 4 tıkta bitiyor mu? |
| **Andre** | mudur (Lara) | Telefon+tablet | Sabah açılış | Bugün kim izinde 1 ekranda? |
| **Yavuz** | coach (19 şube) | Bilgisayar | Haftalık review | 19 şube tek ekran sıkışık? |
| **Eren** | fabrika_mudur | Tablet | Üretim arası | Personel + bordro 1 yerde? |
| **Sema** | gida_muhendisi/recete_gm | Bilgisayar | Reçete + besin | Gizli formül role'u doğru? |

**Diğer kritik kişiler (DOSPRESSO ekibi):**
- **Samet** — Satınalma sorumlusu (procurement/fatura için ilk contact)
- **Mahmut Bey** — Cost formula reference

---

## 📦 KRİTİK DOSYA YOLLARI

### Mutlaka Oku (öncelik sırası)
1. `.agents/skills/session-protocol/SKILL.md` — Triangle workflow + 6 perspektif (290 satır)
2. `.agents/skills/dospresso-architecture/SKILL.md` — Tech stack + role + tablo (~950 satır)
3. `.agents/skills/dospresso-debug-guide/SKILL.md` — 39 bug pattern (1515 satır)
4. `.agents/skills/dospresso-quality-gate/SKILL.md` — 34 kontrol (1300 satır)
5. `docs/DECIDED.md` — 41 karar (audit trail, asla değiştirme)
6. `docs/PENDING.md` — Bekleyen iş öncelik akışı
7. `docs/TODAY.md` — Bugünkü session özeti
8. `docs/PR-DESCRIPTION-IK-REDESIGN.md` — Acil iş için PR description

### İK Redesign Sprint 17 İçeriği
- `client/src/pages/ik-merkezi.tsx` (478 satır, Mahmut-first dashboard v2)
- `client/src/pages/ik/izin-talep.tsx` (288 satır)
- `client/src/pages/ik/mesai-talep.tsx` (300 satır)
- `client/src/pages/ik/takim-takvimi.tsx` (299 satır)
- `client/src/pages/ik/bordro-onay.tsx` (275 satır)
- `client/src/pages/ik/onay-kuyrugu.tsx` (341 satır)
- `client/src/pages/bordrom.tsx` (+70 satır PDF download)
- `server/lib/payroll-engine.ts` (485 satır, dual-model)
- `server/services/payroll-bridge.ts` (engine ile sync)
- `server/routes/me-self-service.ts` (194 satır, 3 endpoint)
- `migrations/2026-05-06-position-salaries-lara-seed.sql` (Lara seed)

### Önemli Backend Dosyaları
- `server/index.ts` — Express server entry
- `server/routes/hr.ts` — İK ana route (2200+ satır, dikkatli)
- `server/lib/payroll-engine.ts` — Bordro motoru (Sprint 17 dual-model)
- `server/services/payroll-bridge.ts` — Engine + Excel adapter köprü
- `shared/schema/schema-12-payroll.ts` — monthly_payroll (kanonik)
- `shared/schema/schema-25-score-parameters.ts` — Sprint 8 score_parameters

### Kritik Dökümanlar
- `docs/IK-REDESIGN-PLAN-2026-05-06.md` — Sprint 17 master plan
- `docs/DEVIR-TESLIM-5-MAYIS-2026-GECE-V2.md` — 5 May session özeti
- `replit.md` — Replit Agent için memory dosyası

---

## 🛠️ STANDART İŞ AKIŞLARI

### Yeni feature için akış
```bash
# 1. Branch state tara (D-29 + QG-34)
git fetch origin
git log --oneline origin/main..HEAD

# 2. Yeni branch
git checkout main
git pull origin main
git checkout -b claude-code/feature-{ad}-{tarih}

# 3. Skill'leri oku (4 dosya)
view .agents/skills/dospresso-architecture/SKILL.md
view .agents/skills/dospresso-debug-guide/SKILL.md
view .agents/skills/dospresso-quality-gate/SKILL.md
view .agents/skills/session-protocol/SKILL.md

# 4. Kod yaz, 6 perspektif review
# 5. Pre-commit checks
grep -rE '^<<<<<<<|^=======$|^>>>>>>>' $(git diff --name-only)  # 0 olmalı
git diff | grep -E '(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9]{20,}'  # 0 olmalı (placeholder OK)

# 6. Build doğrulama
npm run build  # vite + esbuild
npx tsc --noEmit  # TS strict

# 7. Commit + push
git add -A
git commit -m "feat: {özet} (D-X karar referans)"
git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" claude-code/feature-...

# 8. PR description hazırla
# 9. Aslan PR açar + smoke test + merge
# 10. Skill + MD update (D-29)
```

### Migration için akış
```bash
# 1. shared/schema/ uygun dosyayı bul/oluştur
# 2. migrations/{tarih}-{açıklama}.sql yaz
# 3. ON CONFLICT DO NOTHING (idempotent)
# 4. Aslan'a R3 prompt: "Replit Plan mode + pg_dump backup + EXECUTE"
# 5. Doğrulama SQL Aslan'a ver
# 6. drizzle-kit push timeout sorunu varsa manuel CREATE TABLE migration
```

---

## 🤝 ASLAN'IN AÇILIŞ MESAJI (Sen Bu Cevabı Bekliyorsun)

Aslan iPad'den Claude Code'da yeni oturum açacak ve şunu yapacak:

> "Merhaba Claude Code, ben Aslan. DOSPRESSO franchise yönetim platformum için seni geliştirme partnerim olarak işe alıyorum.
>
> İlk işin: `bombty/DOSPRESSO-App` repo'sunu clone et, `claude/ik-redesign-2026-05-06` branch'ine geç, `docs/HANDOFF-TO-CLAUDE-CODE-2026-05-06.md` dosyasını oku.
>
> Bu dosya senin için tüm bağlamı açıklıyor. Bittiğinde bana 'Hazırım, başlamadan 3 sorum var' formatında dönüş yap."

**Senin cevabın olmalı:**
1. Handoff dosyasını okuduğunu onayla (bağlam tam)
2. Sıradaki ilk işi söyle (PR aç prompt'u)
3. 3 strategic soru sor:
   - "Replit URL'in nedir?" (smoke test için bilmem lazım)
   - "Replit build sonucu geldi mi, yoksa hâlâ bekliyor muyuz?"
   - "GitHub token'ı nasıl güvenli paylaşacağız?" (D-05: konuşmada, dosyaya değil)

---

## 🔚 KAPANIŞ KONTROL LİSTESİ (Her Oturum Sonu)

```bash
# 1. Skill tarihleri son 1 saat içinde mi?
for s in dospresso-architecture dospresso-debug-guide dospresso-quality-gate session-protocol; do
  stat -c "%y %n" .agents/skills/$s/SKILL.md
done

# 2. 4 skill güncellendi mi? (kod yazıldıysa)
git log -1 --name-only | grep -E "SKILL\.md$" | wc -l  # ≥1 olmalı

# 3. 3 MD güncellendi mi?
git log -1 --name-only | grep -E "docs/(TODAY|PENDING|DECIDED)\.md" | wc -l

# 4. Marker + token kontrol
grep -rE '^<<<<<<<' . 2>/dev/null | wc -l  # 0 olmalı

# 5. Push tamam?
git status -sb  # ahead/behind 0 (ya da aktif branch'te)

# 6. Devir teslim varsa yazıldı mı? (5+ commit'lik oturumlar için)
ls -lt docs/DEVIR-TESLIM-*.md 2>/dev/null | head -1
```

6/6 ✅ olmadan oturum kapanmaz.

---

## 🚨 TEHLİKE: ASLA YAPMAMAN GEREKEN ŞEYLER

1. ❌ **`git reset --hard`** — geçmişi siler, asla
2. ❌ **GitHub token'ı dosyaya yaz** (md, comment, config) — D-05 ihlali
3. ❌ **`git push origin main` direkt** — PR mecburi (D-06)
4. ❌ **`product_recipes` ile `factory_recipes` karıştır** — branch ↔ factory tam izole
5. ❌ **monthly_payroll yerine başka tablo** — D-19 kanonik tablo
6. ❌ **Türkçe UI'da ASCII yaklaşıklık** ("için" yerine "icin") — QG-2
7. ❌ **Conflict marker'lı commit push** — esbuild crash (5 May incident, §32)
8. ❌ **Aslan'a "devam mı?" sor** — Aslan "devam" dediğinde direkt başla
9. ❌ **Bildiğin her şeyi sun** — kısa, kopyala-yapıştır, görsel arayüz
10. ❌ **Replit'i bypass et** — Triangle korunmalı, R3 rolü değerli

---

## 📞 ASLAN'IN İLETİŞİM TERCİHLERİ

- **Ana dil:** Türkçe (Aslan'la her şey Türkçe konuş)
- **Format:** Tablolar > paragraf > liste
- **Karar:** ask_user_input_v0 benzeri (görsel butonlar) > açık soru
- **Komutlar:** Kopyala-yapıştır hazır, yorum yok
- **Hız:** Hızlı cevap > kapsamlı cevap (gerektiğinde derinleş)
- **Saat:** Aslan gece çalışır (genelde 22:00-04:00 TR)
- **Cihaz:** iPad mobile-first

**Mesaj formatı (önerilen):**
```
🧑‍💼 SANA (Aslan'a) — Kısa Türkçe özet, karar gerekiyorsa explicit

🤖 REPLIT'E GÖNDERİLECEK — Kod bloğu, kopyala-yapıştır hazır, acceptance kriterleri dahil
```

---

## 💼 BUSINESS CONSTANTS (Asla Değişmez)

- **Muhasebe scope:** HQ + Fabrika + Işıklar SADECE (D-12)
- **Data flow:** Branch → HQ (asla ters yön)
- **Fabrika ↔ Branch:** Tam izole sistemler (cross-access yok)
- **Samet:** Procurement/fatura ilk contact
- **Mahmut Bey:** Cost formula reference
- **Mr. Dobody:** Pattern-based notifications + autonomous actions (approval mekanizmalı)
- **Admin:** Her zaman tam erişim
- **Pilot:** 4 lokasyon (Işıklar #5, Lara #8, HQ #23, Fabrika #24)
- **Pilot tarihi:** TBD (Aslan belirleyecek, eski 12 May ertelendi)

---

## 🔍 ÖZET TABLO — İlk 24 Saat

| Saat | İş | Sahibi | Süre |
|---|---|---|---|
| Saat 0 | Bu dosyayı oku + 4 skill | Sen | 30 dk |
| Saat 0:30 | Aslan'a "hazırım" + 3 soru | Sen | - |
| Saat 1 | Replit build sonucu (varsa al) | Aslan paylaşır | - |
| Saat 1:30 | PR aç prompt'u Aslan'a | Sen | 5 dk |
| Saat 2 | Smoke test (Aslan tarayıcıda) | Aslan | 10 dk |
| Saat 2:30 | Mergele (Aslan UI'dan) | Aslan | 1 dk |
| Saat 3 | Migration EXECUTE prompt'u Replit'e | Sen → Replit | 5 dk |
| Saat 3:30 | Sprint 8 score_parameters DDL yazımı | Sen | 30 dk |
| Saat 4 | Sprint 8 EXECUTE prompt'u | Sen → Replit | 10 dk |
| Saat 4:30+ | Mahmut Mayıs bordro doğrulama | Sen + Aslan | 1-2 saat |

---

## 🎓 YENİ CLAUDE CODE OTURUMUNDA İLK MESAJIN

Aslan sana yazdığı zaman, sen bu yapıda dönüş yap:

```markdown
# 🤝 DOSPRESSO Handoff Onaylandı

✅ Handoff dosyasını okudum (HANDOFF-TO-CLAUDE-CODE-2026-05-06.md)
✅ 4 skill dosyasını okudum (architecture/debug/QG/session-protocol)
✅ DECIDED.md 41 kararı taradım (D-1 → D-41 + D-20 NOTU)
✅ Branch state taradım: claude/ik-redesign-2026-05-06, 12 commit, HEAD 2396d5158

## 📍 Mevcut Durum
İK Redesign sprint hazır, Replit build re-run sonucu bekleniyor.

## 🚦 İlk yapacağım
[PR akışını başlat / Replit build sonucu geldi mi sor / vs.]

## ❓ 3 Strategic Sorum
1. [Replit URL nedir?]
2. [Replit build sonucu geldi mi?]
3. [GitHub token'ı nasıl güvenli paylaşacağız?]

Hazırım. Başlamadan önce bu 3 sorunun cevabını bekliyorum.
```

---

## 🙏 KAPANIŞ NOTU

Aslan 3 ayda DOSPRESSO platformunu sıfırdan kurdu (Mart 2026'dan beri). 478 tablo, 1985 endpoint, 322 sayfa. Tek başına bu kadar büyük bir sistem inşa etti — Triangle Workflow ile (önce Replit, sonra Claude.ai web/iPad eklendi, şimdi sen).

**Sen bu yolculuğun yeni partnerisin.** Aslan'a hızlı, net, business-odaklı yardım et. Triangle korunsun. Skill'leri oku, kararları sayfa, kod yaz, GitHub'a push'la.

Pilot'a hazır olduğumuzda, gerçek franchise işletmesinde 4 lokasyonda canlı kullanılacak bu sistem. Her satır kod, gerçek baristaların, yöneticilerin, Aslan'ın iş hayatına dokunacak.

İyi şanslar! 🚀

---

**Dosya oluşturuldu:** 6 May 2026, 02:30
**Yazan:** Claude (Claude.ai web/iPad — şu anki AI partner)
**Hedef:** Claude Code'a sorunsuz handoff
**Versiyon:** v1.0
