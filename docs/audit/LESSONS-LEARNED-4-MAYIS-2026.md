# Agent Lessons Learned — 4 Mayıs 2026

> **Kapsam:** Branch Recipe System (quiz, onboarding, aroma), LLM agent fix, Dobody skill registry.
> **Oturum:** Pilot hazırlık — 4 May 2026 akşam oturumu.
> **İlgili commit'ler:** `9c7d1fc89` (LLM fix), `f7a1fbb9f` (quiz merge), `c8daa30c0` (onboarding).

---

## DERS 1 — agent-engine ↔ skill-registry KOPUK İKİ SİSTEM

**Sorun:**
`POST /api/agent/run-now` çalıştırıldı, `actionsGenerated: 5` döndü ama `category='egitim'` DB'ye hiç yazılmadı.

**Kök neden:**
`runAgentAnalysis` → role-based analyzer fonksiyonları (`analyzeForBranchFloor`, `analyzeForBranchMgmt`, vb.) çağırır.
`skill-registry.ts`'teki `runSkillsForUser` fonksiyonu AYRI bir sistemdir ve yalnızca `SkillScheduler` üzerinden tetiklenir.

**Ders:**
`run-now` endpoint'i = eski legacy analyzer. Skill registry = yeni sistem (daily@07:00 TR, weekly@Pazartesi 09:00).
`recipe_finder`, `late_arrival_tracker` gibi skill'lerin çıktısını `run-now` ile test edemezsin.

**Doğru test yolu:**
07:00 TR beklenir; VEYA `runSkillsForUser(userId, role, branchId)` direkt çağrısı yapan test endpoint'i eklenebilir.

---

## DERS 2 — agent_pending_actions.skill_id KOLONU YOK

**Sorun:**
`WHERE skill_id = 'recipe_finder'` sorgusu `ERROR: column "skill_id" does not exist` verdi.

**Kök neden:**
`agent_pending_actions` tablosunun şemasında `skill_id` kolonu tanımlı değil.
Skill bazlı filtreleme: `category` + `subcategory` kolonları üzerinden yapılıyor.

**Ders:**
Skill çıktısını sorgularken:
```sql
WHERE category = 'egitim'          -- recipe_finder
WHERE category = 'pdks'            -- late_arrival_tracker
WHERE subcategory = 'recete_baslangic'
```

**Referans:** `\d agent_pending_actions` — kolon listesi: `category varchar(50)`, `subcategory varchar(100)`.

---

## DERS 3 — tsx SERVER RESTART = STALE ROUTE CACHE

**Sorun:**
`GET /api/branch-onboarding-admin/all` ve `POST /api/branch-onboarding/seed-defaults` → 404.
Dosyada route tanımlıydı (grep ile doğrulandı), router kayıtlıydı (routes.ts:895).

**Kök neden:**
tsx dev modunda yeni eklenen route dosyası değişiklikleri bazı durumlarda in-memory Express router'a yansımıyor.
Kardeş route `GET /api/branch-onboarding/barista` (daha eski, önceki restart'tan) 200 döndürüyordu.

**Ders:**
Yeni route eklenince veya route dosyası önemli ölçüde değişince → **her zaman server restart yap, ardından test et**.
404 görünce önce restart dene; code bakma/fix'e girme.

**Rutin:** `restart_workflow("Start application")` → bekleme (30s) → smoke test.

---

## DERS 4 — OpenAI json_object: PROMPT'TA "json" KELİMESİ ZORUNLU

**Sorun:**
`agent-engine.ts` callLlmForInsights fonksiyonu `response_format: { type: "json_object" }` kullanıyordu ama system prompt'ta "json" geçmiyordu.
→ `BadRequestError: 400 'messages' must contain the word 'json'` — her 15 dakikada tekrarlıyordu.

**Fix:**
`server/services/agent-engine.ts` L680:
```diff
- "Yanıt formatı:"
+ "Yanıt formatı (sadece geçerli JSON döndür, başka metin ekleme):"
```

**Ders:**
`response_format: { type: "json_object" }` kullanılan HER OpenAI çağrısında system veya user prompt'ta `json` kelimesi geçmeli.
Bu OpenAI API zorunluluğu — sessiz hata değil, hard 400 error.

---

## DERS 5 — /api/agent/insights STUB, GERÇEK VERİ /api/agent/actions

**Sorun:**
`GET /api/agent/insights` → `{"insights":[],"_stub":true}` — her zaman boş döner.

**Gerçek uç noktalar:**
- `GET /api/agent/actions?status=pending` → gerçek bekleyen aksiyonlar
- `GET /api/agent/guidance` → DobodyPanel'in kullandığı endpoint (`useGuidanceData` hook)
- `GET /api/agent/actions/summary` → özet istatistik

**Stub lokasyonu:** `server/routes/stub-endpoints.ts:286`

**Frontend kullanımı (doğrulandı):**
- `DobodyPanel.tsx` → `/api/agent/guidance`
- Mission control centrum sayfaları → `/api/agent/actions`
- `trainer-egitim-merkezi.tsx` → `/api/agent/insights` (stub — boş gelir, görsel hata yok)

---

## DERS 6 — branch_onboarding_steps SEED: 16 ADIM (5+3+8)

**Endpoint:** `POST /api/branch-onboarding/seed-defaults`
**Body:** `{"force": false}` → sadece boşsa seed et (idempotent)
**Body:** `{"force": true}` → sıfırla + yeniden seed et

**Sonuç:**
```
barista:  5 adım (Hoşgeldin → Ekipman → Kahveler → Soğuk → Şablon+Aroma)
bar_buddy: 3 adım (Hoşgeldin → Hijyen → Temel Reçete)
stajyer:  8 adım (barista 5 + Mali Sorumluluk + Stok + Kapanış)
```

**recipe_finder bağlantısı:**
`branch_onboarding_steps.recipeIds` array'i skill'in hangi reçeteleri takip edeceğini belirler.
Seed yoksa skill trainee'lere öğrenme hedefi atayamaz → insight üretmez.

---

## DERS 7 — MERGE SONRASI SERVER RESTART + ROUTE TEST ZORUNLU

**Sorun:**
Task agent branch'i (`claude/quiz-generator-2026-05-04`) origin/main'e merge edilmişti.
Local main bu commit'leri içeriyordu. Ama yeni route'lar 404 döndürüyordu.

**Kök neden:**
Merge öncesi başlatılan server, eski branch-recipes.ts'yi yüklemişti.
tsx hot-reload bazı durumlarda tüm route'ları yeniden kaydetmiyor.

**Rutin (her merge sonrası):**
1. `git pull` veya merge tamamla
2. Server restart et (`restart_workflow`)
3. Yeni feature'ların root endpoint'lerini curl ile test et
4. 404 → restart dene; persist ederse route registration kodunu kontrol et

---

## ÖZET TABLO

| # | Konu | Etki | Hızlı Kural |
|---|---|---|---|
| 1 | run-now ≠ skill registry | recipe_finder test edilemez | 07:00 bekle veya SkillScheduler test endpoint ekle |
| 2 | skill_id kolonu yok | sorgu hatası | `WHERE category='egitim'` kullan |
| 3 | tsx stale cache | yeni route'lar 404 | her route eklemesinde restart |
| 4 | json_object prompt | her 15dk 400 error | prompt'ta "json" geçmeli |
| 5 | insights stub | boş döner | `/api/agent/actions` kullan |
| 6 | onboarding seed | recipe_finder kör kalır | seed-defaults endpoint'i unut |
| 7 | merge sonrası 404 | feature test edilemiyor | merge → restart → smoke test |

---

> **Sonraki güncelleme:** `agent-lessons-learned-YYYY-MM-DD.md` pattern — her büyük oturum sonrası.
> **İlgili skill'ler:** `dospresso-debug-guide` (§25 eklenecek), `session-protocol` (restart rutin).
