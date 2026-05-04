# 📋 DOSPRESSO — PENDING.md

**Son güncelleme:** 4 May 2026 Pazartesi 20:35 (Claude)
**Format:** TASK-XXX (iş) / DECISION-XXX (Aslan kararı)
**Kural:** Her biten sonra üst tablodaki ilgili satırı **DELETE**, TODAY.md "BİTENLER" bölümüne ekle.
**Bağlam:** Pilot 12 May 09:00 — **8 gün uzakta**.

---

## 🚨 ASLAN'A BEKLEYEN (yeni oturum açar açmaz)

**Replit Shell'de yapılacak (3 dk):**
```bash
# 1) LLM fix push
git push origin main

# 2) 2 branch merge (Onboarding + Recipe Finder)
git fetch origin
git merge --no-ff origin/claude/onboarding-akademi-v2-2026-05-04 -m "Merge: Onboarding (TASK-ONBOARDING-001)"
git merge --no-ff origin/claude/dobody-recipe-finder-v2-2026-05-04 -m "Merge: Recipe Finder skill (TASK-DOBODY-001)"
git push origin main
git push origin --delete claude/onboarding-akademi-v2-2026-05-04
git push origin --delete claude/dobody-recipe-finder-v2-2026-05-04
git pull origin main
```

**Sonra Replit Agent'a smoke test:**
- /branch-recipes/admin/onboarding → Default Seed butonu çalışıyor mu
- /onboarding (kullanıcı görünümü) → timeline render
- POST /api/agent/run-now → recipe_finder skill çağrılıyor mu (insights üretiyor mu)

---

## 📌 P1 — POST-PILOT (12 May sonrası)

### TASK-INSIGHTS-STUB-FIX
**Süre:** 10 dk
**Konu:** `trainer-egitim-merkezi.tsx` `/api/agent/insights` stub kullanıyor — gerçek `/api/agent/actions` ile değiştirilmeli
**Etki:** Trainer akademi sayfası şu an boş insight gösteriyor, hata değil ama eksik
**Dosya:** `client/src/pages/trainer-egitim-merkezi.tsx`

### TASK-DEMO-APPROVAL-UI
**Süre:** 1-2 saat
**Konu:** Süpervizör onboarding adımlarında demo (uygulama) onayı veriyor
**Şu an:** Sadece API tarafta `demoCompleted` flag, UI yok
**Yapılacak:**
- Süpervizör paneline "Demo Onayı Bekleyenler" widget
- Her trainee × recipe için "Gözlemledim, onaylıyorum" buton + not alanı
- POST /api/branch-recipes/learning-progress/:userId/:recipeId/approve-demo

### TASK-DRAG-DROP-RECIPE
**Süre:** 1-2 saat
**Konu:** Reçete editöründe malzeme/adım sıralaması drag-drop ile (şu an yukarı/aşağı oklar)
**Kütüphane:** dnd-kit
**Etki:** UX iyileşmesi, mobile'da bile çalışır

### TASK-AROMA-SEED-COMPATIBILITY
**Süre:** Aslan + HQ Coach ekibi (kod değil, data entry)
**Konu:** 32 aroma DB'de var, 8 template reçete var, ama compatibility tablosu eksik
**Yapılacak:**
- HQ Coach `/branch-recipes/admin/recipe/:id` editöründen "Aromalar" tab'ında her template için 4-8 aroma kombinasyonu ekleyip kaydetsin
- Örn: Meyveli Mojito × {Mango, Şeftali, Pinkberry, Blueberry, Lime} primary_fruit slot

---

## 📌 P2 — POST-PILOT (uzun)

### TASK-BRANCH-OPENING-COWORK
**Süre:** 3-5 gün
**Konu:** Yeni şube açılış projesi (id=4 izmir) için cowork tooling
**3 Seçenek (Aslan henüz seçmedi):**
- A) Vendor Portal MVP — magic-link ile dış kullanıcı erişimi
- B) Cowork yorum-dosya-aktivite — proje kart sayfasına Slack benzeri yorumlar
- C) Gantt timeline — 7 fazlı görsel takvim

**Mevcut altyapı:**
- NEW_SHOP_PHASE_TEMPLATE (7 faz)
- projectPhases / projectBudgetLines / projectVendors / projectRisks tabloları
- magic-link external user portal kodu var ama kullanılmıyor

### TASK-VARDIYA-V2
**Süre:** 3-5 gün
**Konu:** Vardiya planlama redesign (Aslan'ın memory'sinde "vardiya redesign" notu var)
**Detay belirsiz** — Aslan ile tartışılacak

---

## 🚫 İPTAL / BEKLET (1-2 ay sonra dönülür)

- AI auto-suggest reçete adımları (1-2 ay sonra)
- Versiyon geçmişi reçete editör (low-priority)
- Diff görünümü reçete editör

---

## 🔧 BİLİNEN KÜÇÜK ITEMLAR (gerekirse 5-15 dk)

- Phantom roller (`fabrika_pisman`, `fabrika_kalite`, `fabrika_sorumlu`, `fabrika_personel`, `fabrika`) — sıfır user, kaldırılabilir
- Procurement modülü dormant (sıfır branch order, sıfır goods receipt) — pilot sonrası activate
- ~2887 raw `console.log` — Sentry/Pino entegrasyonu (sprint H, post-pilot)

---

## 📝 KARAR BEKLEYEN (DECISION)

### DECISION-COWORK-OPTION
Yeni şube açılış için A/B/C hangisi? (yukarıda detay var)

### DECISION-PILOT-RAMPUP
12 May pilot başlasın mı yoksa 1 hafta daha hazırlık mı?
- Kod: HAZIR ✅
- Aroma seed: %30 (32 aroma var, compat eksik)
- Onboarding step content review: HQ Coach ekibinden bekleniyor
- Pilot şube eğitimi: zamanlanmadı
