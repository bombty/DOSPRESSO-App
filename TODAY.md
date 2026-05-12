# DOSPRESSO — TODAY (Pilot 18 May Pzt 15:00)
**13 May 2026 — Sprint 47 Foundation BAŞLANGIÇ**

## ⏰ Pilot ertelendi: 14 May → 18 May (Pazartesi)

## Bu Gece (13 May 01:30 → 03:00)

### ✅ TAMAMLANAN (Sprint 47.1 Foundation)

1. **DB Schema** (`shared/schema/schema-30-onboarding-ai.ts`)
   - `onboarding_conversations` — Mr. Dobody chat
   - `onboarding_messages` — her mesaj (user/ai)
   - `onboarding_templates` — rol bazlı prompt + steps
   - `daily_briefs` — günlük AI brief
   - `ai_alerts` — sistem otomatik uyarı (besin değeri eksik vb.)

2. **Migration SQL** (`migrations/sprint-47-48-onboarding-ai.sql`)
   - 5 tablo CREATE
   - İlk satinalma template (placeholder)

3. **Excel Parser** (185 hammadde + 2 tedarikçi)
   - `scripts/raw-materials-seed.json` (185 ürün)
   - `scripts/seed-raw-materials.ts` (upsert seed script)
   - 10 kategori: aroma_verici, tatlandirici, yag, maya_enzim, vb.
   - Tahmin: Kalealtı, Turyağ + diğerleri manuel girilecek

4. **Onboarding API** (`server/routes/onboarding.ts`)
   - GET  /api/onboarding/status
   - POST /api/onboarding/start
   - POST /api/onboarding/message (ChatGPT API entegrasyonu)
   - POST /api/onboarding/skip
   - POST /api/onboarding/reset/:userId (ADMIN)
   - generateAIResponse() — gpt-4o-mini ile

5. **Route Registration** — server/routes.ts'e eklendi

## Yarın (14 May Çarşamba)

### Sprint 47.2 — UI + Sistem Prompt'lar (10 rol)
- Conversational onboarding modal (mobile + desktop)
- TypeWriter efekti, quick replies
- 10 rol × 7 adım = 70 dialogue point
  - satinalma (yarı yapıldı)
  - gida_muhendisi (Sema)
  - cgo, coach, trainer, ceo
  - fabrika_mudur, mudur, supervisor, barista

### Sprint 47.3 — Re-onboarding Admin UI
- Admin paneli: kullanıcı listesi
- "Onboarding'i Sıfırla" butonu
- Confirmation modal

### Sprint 48 — Daily AI Brief
- Cron job (her gün 09:00)
- Rol bazlı data aggregation
- ChatGPT API ile özet
- Dashboard widget

## Cuma 16 May
- Sprint 49 — AI Uyarı Sistemi
- Sprint 50 — Tedarikçi kartı yardımcısı

## Cumartesi 17 May
- FULL SYSTEM TEST (4 şube)
- Bug fix
- Mahmut + Sema bilgilendirme

## Pazar 18 May 15:00
🎉 **AI-NATIVE PİLOT BAŞLAR**

## Test Senaryoları (post-merge)

### Sprint 47 Test:
```sql
-- Replit'te migration çalıştır
\i migrations/sprint-47-48-onboarding-ai.sql

-- Seed çalıştır
-- (Bu otomatik DB'ye 185 ürün + 2 tedarikçi yükler)
npx tsx scripts/seed-raw-materials.ts

-- Doğrulama
SELECT COUNT(*) FROM raw_materials;     -- 185
SELECT COUNT(*) FROM suppliers;         -- 2+
SELECT COUNT(*) FROM onboarding_templates; -- 1 (satinalma)
```

## Notlar

- **Mahmut bordro:** Yarın aramaya gerek yok (pilot 18 May'a alındı)
- **Sema WhatsApp:** Cuma günü gönderirsin
- **ChatGPT API:** Mevcut altyapı kullanılıyor (AI_INTEGRATIONS_OPENAI_API_KEY)
- **Maliyet tahmini:** gpt-4o-mini onboarding × 50 kullanıcı ≈ $5-10 total
- **Daily brief:** 50 kullanıcı × 30 gün × gpt-4o-mini ≈ $15/ay
