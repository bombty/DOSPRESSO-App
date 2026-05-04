# 📚 SKILL DOSYALARI GÜNCELLEME — 4 MAY 2026 AKŞAM

> **Not:** `/mnt/skills/user/` Claude için read-only. Bu dosya Aslan'ın
> kendi cihazında bu güncellemeleri yapması içindir.
>
> **Yapılacak:** Aşağıdaki 3 skill dosyasının altına yeni bölümler ekle.

---

## 1. dospresso-architecture/SKILL.md — ALT BÖLÜM EKLE

```markdown
## ŞUBE REÇETE SİSTEMİ (4 May 2026 — Aslan onayı)

### Tablolar (schema-24-branch-recipes.ts)
- `branch_products` — Ürün listesi (Cappuccino, Latte vb.)
- `branch_recipes` — Boy bazlı reçete (massivo / long_diva / tek_boy)
- `branch_recipe_ingredients` — Malzemeler (sıralı, isVariableAroma flag)
- `branch_recipe_steps` — Hazırlama adımları (sıralı, isCritical flag)
- `branch_recipe_quizzes` — Soru havuzu (auto-generated + manuel)
- `branch_aroma_options` — 32 aroma (Mango, Şeftali, Vanilya...)
- `branch_recipe_aroma_compatibility` — Şablon × aroma uyumluluğu
- `branch_onboarding_steps` — Rol bazlı eğitim adımları
- `branch_recipe_learning_progress` — Kullanıcı ilerleme takibi

### Endpoint Listesi
- `GET /api/branch-products` (filtrelenebilir)
- `GET /api/branch-recipes/:id` (detay + malzeme + adım)
- `PUT /api/branch-recipes/:id/ingredients` (replace-all, HQ_EDIT)
- `PUT /api/branch-recipes/:id/steps` (replace-all, HQ_EDIT)
- `GET /api/aroma-options` (kategori bazlı)
- `GET /api/branch-recipes/:id/aroma-options` (slot bazlı)
- `PUT /api/branch-recipes/:id/aroma-compatibility` (replace-all)
- `POST /api/branch-recipes/:id/quizzes/generate` (auto + dryRun)
- `POST /api/branch-recipes/quizzes/bulk-generate` (toplu)
- `GET /api/branch-onboarding/:role` (basit)
- `GET /api/branch-onboarding-admin/all` (admin gruplandırılmış)
- `PUT /api/branch-onboarding-admin/:role` (replace-all)
- `GET /api/branch-onboarding/me/progress` (kullanıcı kendi)
- `POST /api/branch-onboarding/seed-defaults` (idempotent)

### Sayfalar
- `/branch-recipes` — Listeleme (tüm roller)
- `/branch-recipes/:id` — Detail (boy seçimi + aroma + malzeme + adım)
- `/branch-recipes/admin` — HQ ürün yönetimi
- `/branch-recipes/admin/recipe/:recipeId` — Reçete editörü (3 tab)
- `/branch-recipes/admin/onboarding` — Onboarding admin panel
- `/onboarding` ve `/akademi/onboarding` — Personel kendi yolu

### HQ_EDIT_ROLES
`['admin', 'ceo', 'cgo', 'coach', 'trainer']`

### Pattern: Replace-All Transactions
PUT endpoint'leri eski veriyi siler ve yenisini ekler (transaction).
Order field'lar (stepOrder) kaydet sırasında otomatik 1..N reindex edilir.

### Mr.Dobody Skill: recipe_finder
- targetRoles: coach, trainer, supervisor, mudur, admin, ceo, cgo
- Schedule: daily (07:00 TR)
- 4 insight tipi: trainees_no_recipe_view, low_quiz_score, demo_approval_pending, near_master
- Tablolar: users + branch_recipe_learning_progress + branch_onboarding_steps
```

---

## 2. dospresso-debug-guide/SKILL.md — ALT BÖLÜM EKLE

```markdown
## REÇETE SİSTEMİ DEBUG (4 May 2026)

### Reçete editörü "kaydedilmedi" badge'i kaybolmuyor
- `isDirty` state useState yönetiminde
- Save mutation onSuccess'te `setIsDirty(false)` çağrılmalı
- Cache invalidation: `queryClient.invalidateQueries({ queryKey: ['/api/branch-recipes', recipeId] })`

### Aroma seçimi reçetede görünmüyor
- `recipe.isTemplate=true` mi kontrol et
- `branch_recipe_aroma_compatibility` tablosunda kayıt var mı: `SELECT * WHERE recipe_id=X`
- HQ admin reçete editörü "Aromalar" tab'ından eklemeli

### Quiz "Üret" butonu disabled
- Sadece reçetede malzeme/adım varsa çalışır
- Editör'de yapılan değişiklik kaydedilmemişse (isDirty=true) disabled
- Önce "Tümünü Kaydet", sonra "Quiz Üret"

### Onboarding "Default Seed" sonrası 16 adım yok
- Endpoint: `POST /api/branch-onboarding/seed-defaults` çağrılmalı
- Body: `{ "force": false }` — mevcut varsa atlar
- DB kontrol: `SELECT COUNT(*) FROM branch_onboarding_steps`

### Personel /onboarding boş gösteriyor
- `user.role` TRAINEE_ROLES'te mi (barista, bar_buddy, stajyer, supervisor_buddy)
- `branch_onboarding_steps WHERE target_role = user.role` var mı kontrol et
- Yoksa Coach ekibi seed yapmalı veya admin paneline ekleme

### Recipe Finder skill log gözükmüyor
- `[SkillScheduler] Gunluk skill'ler N dakika sonra calisacak (07:00 TR)` log'da var mı
- 07:00 öncesi log boş — NORMAL
- Manuel tetikle: `POST /api/agent/run-now` → ama bu RUN-NOW skill registry'yi bypass ediyor!
- Skill registry doğru çağrı: `getSkillsForRole(role)` → her skill'in `analyze()` ve `generateActions()`

### Stale tsx cache (route 404)
**Belirti:** Yeni eklediğin endpoint 404 dönüyor ama dosyada var
**Çözüm:** Server restart (`workflows_restart Start_application`)
**Sebep:** tsx watch mode bazı cache durumlarında yeni route'u algılayamıyor
```

---

## 3. dospresso-quality-gate/SKILL.md — ALT BÖLÜM EKLE

```markdown
## REÇETE SİSTEMİ QUALITY GATE (4 May 2026)

### Reçete editörü değişiklikten önce
- [ ] HQ_EDIT_ROLES kontrolü her endpoint'te var mı
- [ ] `canEdit(req.user.role)` çağrısı yapılıyor mu
- [ ] Replace-all transaction içinde mi
- [ ] stepOrder otomatik reindex 1..N
- [ ] Validation: title boş kontrol, sayısal alanlar pozitif

### Aroma sistemi değişikliklerinden önce
- [ ] Template olmayan reçeteye compatibility eklenmiyor (400 dönmeli)
- [ ] Aynı aromaId + slotName unique constraint kontrolü (DB level)
- [ ] Slot bazlı UI grid mobile-first (3 col → 5 col)
- [ ] Override pump miktarı hem Massivo hem Long Diva için ayrı

### Quiz üretici değişikliklerinden önce
- [ ] AI değil — template-based, deterministic
- [ ] Distractor üretimi: ±25/50/100% numeric
- [ ] Min 4 seçenek (multiple_choice) garantisi
- [ ] dryRun flag çalışmalı (preview)
- [ ] replace flag sadece auto-generated quizleri silmeli (manuel olanlar korunur)
- [ ] HQ_EDIT_ROLES yetkisi

### Onboarding sistem değişikliklerinden önce
- [ ] stepNumber unique per role (DB level)
- [ ] PUT replace-all transaction
- [ ] /me/progress doğru locked/in_progress/completed hesaplaması
- [ ] Önkoşul (prerequisiteStepIds) takibi
- [ ] Default seed idempotent (force flag olmadan tekrar çalıştırılırsa atlamalı)

### Recipe Finder skill değişikliklerinden önce
- [ ] AgentSkill interface'e uygun (id, name, targetRoles, schedule, autonomyLevel)
- [ ] `analyze()` async, error try-catch içinde
- [ ] `generateActions()` insight tipi → action tipi mapping
- [ ] `actionType` standart: suggest_task / alert / report / escalate
- [ ] `severity` standart: low / med / high / critical
- [ ] `targetRoleScope` virgülle ayrılmış string
- [ ] skill-registry.ts L94'e `await import()` eklenmeli

### Performans
- [ ] List endpoint'lerde limit (max 200 user, max 15 detail)
- [ ] DB query'lerde gereksiz JOIN yok
- [ ] React'te useMemo gereken yerlerde kullanılıyor
- [ ] TanStack Query staleTime makul (300000 = 5dk default)
```

---

## ÖZET

3 skill dosyasına 4 May'da eklenen:
- ✅ Şube reçete sistemi (tablolar, endpoint'ler, sayfalar, pattern'ler)
- ✅ Reçete debug guide (8 yeni senaryo)
- ✅ Quality gate (5 yeni alan: editör, aroma, quiz, onboarding, skill)

Aslan: Bu içerikleri kendi cihazından ilgili `SKILL.md` dosyalarının altına ekle.
