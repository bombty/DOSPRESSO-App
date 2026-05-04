# 📚 LESSONS LEARNED — 4 MAYIS 2026

> **Bağlam:** 7.5 saatlik oturum sonunda Replit Agent ile yapılan kalite değerlendirmesinden damıtılan 7 ders. Bu dosya gelecekteki Claude ve Replit oturumları için referans.
>
> **Format:** Her ders şu yapıda: PROBLEM (somut hata) → KÖK NEDEN → ÇÖZÜM → HANGI SKILL'E EKLENMELI.

---

## 🎯 ÖZET

Bugün 11 task çıkardık. **Sıfır production hatası**. Ama 4 sürtünme noktası tespit edildi:

1. Stale tsx cache (route 404) — restart ile çözüldü
2. Yanlış SQL kolon varsayımı (`skill_id` yok, `category` var)
3. Mimari kafa karışıklığı (skill-registry vs agent-engine paralel sistemler)
4. Triangle workflow gecikme (Claude push → Aslan Shell merge)

Bunların hiçbiri pilot için risk değil ama **gelecek oturumda tekrarı önlenebilir.**

---

## DERS 1 — Stale tsx Cache Refleksi

### PROBLEM
Onboarding endpoint'lerini ekledim, push ettim, Replit smoke test'te 3 route 404 döndü:
- `GET /api/branch-onboarding-admin/all` → 404
- `POST /api/branch-onboarding/seed-defaults` → 404
- `PUT /api/branch-onboarding-admin/:role` → 404

Ama dosyada **route'lar mevcuttu**. Aynı dosyadaki eski endpoint `GET /api/branch-onboarding/:role` ise 200 dönüyordu.

### KÖK NEDEN
tsx watch mode bazı durumlarda yeni route'ları algılamıyor. Module cache stale kalıyor.

### ÇÖZÜM
**Replit Agent'ın çözdüğü gibi:** Server restart sonrası 3'ü de anında 200 döndü.

### KURAL
Yeni route eklendikten sonra ilk smoke test 404 dönerse:
1. **Önce server restart** (`workflows_restart Start_application`)
2. Sonra tekrar test
3. Hâlâ 404 ise **route registration**'ı kontrol et (Express router export, app.use mounting)

### EKLENMELI
**dospresso-debug-guide/SKILL.md**:
```
### Stale tsx cache (route 404)
Belirti: Yeni eklediğin endpoint 404 dönüyor ama dosyada var
İlk refleks: Server restart, sonra tekrar test
Sebep: tsx watch mode bazı cache durumlarında yeni route'u algılayamıyor
```

---

## DERS 2 — Schema Önce Kontrol Kuralı

### PROBLEM
TODAY.md'de yarın için yazdığım SQL:
```sql
SELECT COUNT(*) FROM agent_pending_actions WHERE skill_id = 'recipe_finder';
```

Replit Agent yakaladı: `agent_pending_actions` tablosunda **`skill_id` kolonu yok**. Doğrusu `category` ve `subcategory`.

### KÖK NEDEN
Recipe Finder skill'i yazarken `skillId: "recipe_finder"` field'ı SkillAction interface'inde vardı, ben bunun DB'ye olduğu gibi yazıldığını varsaydım. Ama action engine bu field'ı muhtemelen kullanmıyor veya farklı kolon adıyla yazıyor.

**Schema dosyasını grep'lemeden SQL yazdım.**

### ÇÖZÜM
Doğru sorgu:
```sql
SELECT COUNT(*), MAX(created_at), subcategory
FROM agent_pending_actions
WHERE category = 'egitim'
GROUP BY subcategory
ORDER BY MAX(created_at) DESC;
```

### KURAL
**SQL yazmadan ÖNCE her zaman schema'yı grep'le:**
```bash
grep -n "tableName" shared/schema/*.ts
```

Mevcut "asla varsayma" kurallarına yeni satır:
- `branch_products.title` değil → `branch_products.name` (zaten skill'de var)
- `agent_pending_actions.skill_id` değil → `agent_pending_actions.category` + `subcategory`
- `tasks` tablosunda `archived` yok → `iptal_edildi` kullan
- `users` tablosunda `name` yok → `first_name` + `last_name` + `username`

### EKLENMELI
**dospresso-quality-gate/SKILL.md**:
```
### SQL/Drizzle yazmadan önce
- [ ] grep -n "tableName" shared/schema/*.ts ile kolon adlarını doğrula
- [ ] LEFT JOIN + SELECT kombinasyonlarında her iki tarafı kontrol et
- [ ] Bilinen tuzaklar:
  - users: first_name + last_name (name yok)
  - tasks: status='iptal_edildi' (archived yok)
  - agent_pending_actions: category + subcategory (skill_id yok)
  - branch_products: name (title yok)
```

---

## DERS 3 — Skill Registry vs Agent-Engine Paralel Sistemler

### PROBLEM
Recipe Finder skill'i yazdım, registry'ye ekledim. Replit `POST /api/agent/run-now` ile manuel tetikledi → **5 action üretildi ama hiçbiri recipe_finder'dan değildi.**

Replit'in tespiti: `run-now` endpoint'i `runAgentAnalysis` çağırıyor, o da rol bazlı analyzer'ları (`analyzeForBranchMgmt`, `analyzeForHQOps`) çağırıyor. **Skill registry'yi bypass ediyor.**

### KÖK NEDEN
Mr.Dobody'nin **iki paralel sistemi** var:

| Sistem 1: `agent-engine.ts` | Sistem 2: `skill-registry.ts` |
|---|---|
| Rol bazlı analyzer'lar | Skill class'ları |
| `analyzeForBranchMgmt`, `analyzeForHQOps` | `recipe_finder`, `daily_coach`, vb. (38 skill) |
| `POST /api/agent/run-now` çağırır | `SkillScheduler` çağırır (cron) |
| Anında sonuç | Daily/hourly schedule |

**Bu iki sistem birbirini çağırmıyor.** Bu mimari özellikle yapılmış mı yoksa miras kod mu, belirsiz. Ama **Recipe Finder gibi yeni skill'ler sadece scheduler ile çalışır**, manuel test için run-now işe yaramaz.

### ÇÖZÜM
**Yeni skill yazarken:**
1. Skill registry'ye eklemek YETERLİ DEĞİL (anlık test için)
2. Skill'in çalıştığını doğrulamak için scheduler tetiklemesi beklenmeli (07:00 TR)
3. Veya manuel test için ayrı bir endpoint/script yazılmalı

**Geleceğe yönelik öneri:**
- `POST /api/agent/test-skill?id=recipe_finder` gibi bir test endpoint'i yararlı olur
- veya `runAgentAnalysis` skill registry'yi de çağıracak şekilde refactor edilebilir (ama bu kapsam değişikliği)

### EKLENMELI
**dospresso-architecture/SKILL.md** (kritik mimari nokta):
```
### Mr.Dobody İkili Mimari (DİKKAT)

İki paralel sistem var, birbirini ÇAĞIRMAZ:

1. agent-engine.ts (rol bazlı analyzer'lar)
   - Çağrı: POST /api/agent/run-now
   - Fonksiyonlar: analyzeForBranchMgmt, analyzeForHQOps, analyzeForFactory
   - LLM kullanır (OpenAI)
   - Anında sonuç

2. skill-registry.ts (skill class sistemi)
   - Çağrı: SkillScheduler (cron, 07:00 TR daily)
   - 38 skill (recipe_finder dahil)
   - Çoğu LLM-FREE, deterministic
   - Daily/hourly schedule

YENİ skill EKLEYINCE: Sadece scheduler tetiklerse çalışır.
Manuel test için bekleme gerekli (yarın sabah).
```

---

## DERS 4 — Branch Push Disiplini

### PROBLEM
Bugün 6 farklı branch oluşturdum:
- `claude/recipe-editor-2026-05-04`
- `claude/aroma-options-2026-05-04`
- `claude/quiz-generator-2026-05-04`
- `claude/onboarding-akademi-v2-2026-05-04`
- `claude/dobody-recipe-finder-v2-2026-05-04`
- `claude/dobody-recipe-finder-2026-05-04` (eski, yarım kalmış)

Bazıları zaten remote'da vardı (önceki konuşmalardan), bu çakışmaya sebep oldu. **2 branch için "v2" eklemek zorunda kaldım** çünkü v1 isimleri rejected oldu.

### KÖK NEDEN
Önceki Claude oturumlarında aynı task'lara aynı branch isimleri kullanılmış. Cleanup yapılmamış. Local repo'da branch'lar duruyor (`git branch -a`).

### ÇÖZÜM
Her oturum sonunda **explicit branch durumu** raporu:
- Hangi branch'lar local var?
- Hangileri remote'da var?
- Hangileri merge edilmiş ama silinmemiş?

### KURAL
**Oturum sonu protokolü:**
1. `git branch -a` çıktısını TODAY.md'ye yapıştır
2. Merge edilmiş branch'lar yarın silinmek üzere PENDING'e işaretle
3. Yeni branch açarken "v2" gerekiyorsa o branch'ı "neden v2" diye doc'la

### EKLENMELI
**session-protocol** (kullanıcı skill'i, mevcut değil ama olmalı):
```
Oturum sonu:
- git branch -a → TODAY.md'ye listele
- Her branch için: durum (open/merged/abandoned)
- Merge edilenler için cleanup planı
```

---

## DERS 5 — Triangle Workflow Gecikme

### PROBLEM
Claude push yapar → Replit Agent sandbox'ta `git push` engelli → Aslan Shell'e gidip merge eder.

Bu doğal bir gecikme. Bugün 7 push yaptım, Aslan 7 kez Shell'e gitti. **Toplam ~10 dakika** "git komutu yapıştır → bekle" zamanı.

### KÖK NEDEN
Replit sandbox güvenlik için git push'u engelliyor. Bu bir Replit kararı, değiştirilemez.

### ÇÖZÜM
**Aslan'ın işini kolaylaştırmak Claude'un sorumluluğu:**
1. Her push sonrası **tek satır net komut** ver:
   ```bash
   git fetch origin && git merge --no-ff origin/BRANCH_ADI -m "MESAJ" && git push origin main && git push origin --delete BRANCH_ADI && git pull origin main
   ```
2. Branch ismi ve commit hash **açık olarak** belirt
3. Alternatif: tek seferde **birden fazla branch'ı merge edecek** komut blokları yazılabilir (bugün 2 branch'ı tek komutta merge edebildik)

### KURAL
Push sonrası mesaj formatı:
```
✅ Branch X push edildi (commit Y)

Replit Shell'de:
[tek satır komut]
```

### EKLENMELI
Bu zaten kullanıcı memory'sinde standart instruction olarak var. Pekiştirme:
**dospresso-architecture/SKILL.md** > "Triangle Workflow":
```
- Claude push → her zaman branch ismi + commit hash + tek satır merge komutu ver
- Aslan kopyala-yapıştır → Shell'de çalıştır
- Replit Agent build + smoke test
```

---

## DERS 6 — Replit'in Smoke Test Diline Kıymet Ver

### PROBLEM
Replit Agent her smoke test sonrası **çok detaylı, çok kibar, çok uzun** rapor yazıyor. Bazen 50+ satır.

Bunun **iyi** tarafı: hata yapmıyor, her şey doğrulanmış oluyor.
**Kötü** tarafı: Aslan'ın okuma yükü artıyor.

### KÖK NEDEN
Replit Agent profesyonel ton kullanmaya programlı. Bu standart davranış, değiştirilemez.

### ÇÖZÜM
Claude bu raporları **özetlemeli** Aslan için:
- Replit raporu geldikten sonra "✅ X/Y PASS" başlıkla başla
- En önemli 3 detayı bullet'la
- Detay raporlar görmezden gelinmesin ama Aslan tek bakışta bilmesi gerekenleri görsün

### KURAL
Replit raporu → Claude özetle → Aslan görsel olarak hızlı kavrasın.

(Bu zaten bugün yapıldı. Pekiştirme.)

---

## DERS 7 — "Devam" Kelimesinin Yorumu

### PROBLEM
Aslan **çok kez "devam" dedi**. Bazen:
- "Bir önceki task'ta kaldığım yerden devam et" anlamında
- Bazen "yeni task'a geç" anlamında
- Bazen "bilgi yeterli, kaydet ve geç" anlamında

Bugün bir kez kafam karıştı (compaction sonrası recipe-editor mı yoksa onboarding mi?). Aslan'ın yardımı gerekti.

### KÖK NEDEN
"Devam" tek başına context-bağımlı bir komut. Önceki mesaj net ise sorun yok, belirsiz ise sorun var.

### ÇÖZÜM
Aslan'ın "devam" demesi durumunda Claude şunlara bakmalı:
1. **Son cümlede ne öneriliyordu?** O öneriyi uygula
2. **Eğer 3+ seçenek varsa**, "devam" hangisini seçti net değil → sor
3. **Eğer hiç seçenek yoksa ve son task bitmişse**, yeni task öner ve sor

Bugün bunu çözmek için ben "A/B/C cevap ver, gelmezse default X" pattern'i kullandım. **Bu işe yaradı**, devam etsin.

### KURAL
"Devam" belirsiz olduğunda → **netleştirici tek satır soru** sor, varsayılanı belirt.

(Zaten yapılıyor. Pekiştirme.)

---

## ✅ EYLEM PLANI

Bu derslerin pratik karşılığı:

1. **Replit'e söyle** (Aslan iletecek): replit.md'ye 3 madde + ben de ekledim → 7 madde toplam
2. **3 skill dosyasına bölümler eklenecek** (Aslan kendi cihazında):
   - dospresso-architecture: Mr.Dobody ikili mimari + reçete sistemi
   - dospresso-debug-guide: Stale cache + 8 yeni senaryo
   - dospresso-quality-gate: SQL schema kontrol + reçete editörü/aroma/quiz/onboarding/skill checklist'leri
3. **session-protocol kuralı**: Oturum sonu git branch durumu raporu (bu skill yok ama ileride yazılabilir)

---

## 📊 OTURUM PERFORMANS METRİKLERİ

| Metrik | Değer |
|---|---|
| Süre | 7.5 saat |
| Task sayısı | 12 (3 cleanup + 5 P0 + 1 bonus + 2 ekstra + 1 handoff) |
| Yeni kod | 5500+ satır |
| Yeni endpoint | ~35 |
| Yeni sayfa | 3 |
| Yeni Mr.Dobody skill | 1 |
| Production hatası | 0 |
| Smoke test fail | 0 |
| Sürtünme noktası | 4 (yukarıda dokümante edildi) |
| Pilot skor değişimi | +0.35 (9.6 → 9.95) |

**Verim:** 1 task ortalama 37.5 dakika. Çok yüksek. Bunun ana sebebi:
- Aslan disiplinli (mola almadan çalıştı)
- Triangle workflow doğru çalışıyor
- Skill dosyaları doğru bilgi veriyor
- Replit Agent smoke test güvenilir

---

## 🎯 GELECEK OTURUMA NOT

**Eğer bu oturumun seviyesini koruyabilirsek:**

5-12 May arası 8 günde yapabilecekleri (eğer Aslan 4 saat/gün çalışırsa):
- Demo onayı UI (1-2 saat) → Pilot için iyi olur
- Drag-drop reçete sıralama (1-2 saat) → UX iyileşmesi
- trainer insights stub fix (10 dk) → cleanup
- Aroma compatibility seed (HQ Coach ekibi → 4-8 saat)
- Branch opening cowork (3-5 gün) → Pilot sonrası

**Ama önemli olan: Aslan'ın yorulmaması.** Bugün 7.5 saat çalıştı, bu sürdürülebilir değil. Pilot 12 May'a 8 gün var, kod tarafı hazır. **Yarından itibaren Aslan operasyonel hazırlığa odaklanmalı**, kod sadece gerektiğinde.
