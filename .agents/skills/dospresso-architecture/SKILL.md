---
name: dospresso-architecture
description: Complete architecture reference for DOSPRESSO franchise management platform. Covers tech stack, database schema, API patterns, 31-role system, module connections, CI colors, app layout, agent system, kiosk auth, and coding conventions. Use when adding new features, routes, components, or tables.
---

# DOSPRESSO Architecture Map

## Platform Metrics (2 Mayıs 2026 — Sprint 2 başı, çok perspektifli audit sonrası)
- **Database tablosu (kodda):** **455 pgTable** tanımı (Apr-26 drift kapatıldı; 13 yeni tablo + 4 UNIQUE + 83 index + 47 FK eklendi, Task #255)
- **Database tablosu (DB'de gerçek):** ~457 (drift = 0, baseline `migrations/0000_baseline.sql`)
- **Backend endpoint:** **1,768** (118 route dosyası × ortalama 15 endpoint)
- **Backend route dosyası:** **118**
- **Frontend sayfa:** **326** (208 kök seviye + 12 klasörde 118 sayfa: admin/37, fabrika/17, yonetim/11, iletisim-merkezi/11, akademi-hq/10, satinalma/9, crm/8, akademi-v3/5, sube/5, hq/2, kalite/1)
- **Frontend route (App.tsx):** **266**
- **Aktif kullanıcı:** ~159 (372 toplam — Replit DB doğrulaması)
- **Rol sayısı:** **31** (sistem 1 + executive 2 + HQ departman 8 + HQ legacy 5 + branch hierarchy 7 + factory floor 5 + factory recipe 2 + kiosk 1). `ROLE_MODULE_DEFAULTS` tablosunda 16 rol eksik (Sprint 2 B14 ile tamamlanacak).
- **Şube:** 22 (20 aktif + HQ + Fabrika)
- **Schema dosyası:** **23** (`shared/schema/schema-01.ts` → `schema-23.ts`)
- **App.tsx satır:** 944
- **nav-registry.ts satır:** 871
- **Mr. Dobody skill:** 17
- **Scheduler job:** 30+
- **Doküman:** 80+ markdown (docs/)
- **Pilot Day-1 hazırlık:** Sprint 1 tamamlandı (~3,100 satır docs, 11 commit), Sprint 2 başladı (Task #272+#273 MERGED)

### Aktif Modül Gerçek Durumu (Replit DB 3 tur doğrulama)

| Modül | Kod Durumu | DB Fiili Kullanım |
|-------|:--:|:--|
| Kiosk (PDKS) | %95 kod | pdks_records=1,282 aktif, shift_attendance aggregate BOZUK |
| Bordro | %70 kod | **monthly_payroll=51 kayıt AKTİF** (motor çalışıyor) — eski tablolar (monthly_payrolls=0, payroll_records=0) dead |
| Satınalma | %60 kod | **DORMANT**: 1 taslak PO, 0 goods_receipt, 0 branch_orders |
| Akademi | %80 kod | training_modules=51 aktif, user_training_progress=27, quizzes=27 |
| Gate Sistemi | %85 kod | **DORMANT**: 5 gate tanımlı, 0 attempt, 0 exam_request |
| CRM | %40 kod | customer_feedback=461 + support_tickets=66 (dashboard yok) |
| Audit v1 | %90 kod | 10 template + 203 item (İÇERİK) + 6 instance |
| Audit v2 | %30 kod | 1 template + 7 soru (AKTİVİTE, içerik yok — migration lazım) |
| Franchise Projects | %100 kod | 0 kayıt (pilot sonrası aktif) |

**Kritik ders:** Kod durumu ≠ fiili kullanım. Raporlarda her zaman Replit DB kontrolü yap.

## Dormant Module Policy (18 Nisan 2026)

**"Dormant modül" = Kodda + DB'de tam tanımlı ama fiilen kullanılmayan, ilerde aktif edilecek modül.**

DOSPRESSO'nun bazı modülleri bu statüde:
- **Franchise Proje Yönetimi** (20 tablo, 0 kayıt) — İlerde yeni şube açılışlarında aktif
- **Gate Sınav Sistemi** (18 tablo, 0 attempt) — Pilot sonrası hibrit terfi modeli
- **Factory Shipments** (kod hazır, 2 kayıt) — Şu an dış sistem, ilerde opsiyonel
- **Onboarding Akışı** (2 kayıt, 14 günlük Stajyer) — Pilot'ta aktif olacak

**Dormant modül kuralları:**
1. ❌ **Silme** — asla silmeyin, ileride kullanılabilir
2. ✅ **Koruma** — schema + endpoint + UI hazır tutulur
3. ✅ **Test** — pilot öncesi temel smoke test yapılır
4. ⚠️ **Raporlama** — "%X hazır" demek yerine "Hazır, aktivasyon bekliyor" denir
5. ⚠️ **Sürüm notları** — dormant modüller sürümde açıkça belirtilir

**"Kodda var" ≠ "Kullanılıyor":** Rapor yazarken **fiili kullanım verisi** kontrol edilmeli:
```sql
-- Örnek: Gerçek kullanım kontrolü
SELECT COUNT(*) FROM franchise_projects;  -- 0 = dormant
SELECT COUNT(*) FROM gate_attempts;        -- 0 = dormant
SELECT COUNT(*) FROM factory_shipments;    -- 2 = dormant (dış sistem)
```

Referans: `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` Bölüm 1.3 (Kapsam Sınırı) ve Bölüm 4.1 (Kör Noktalar)

## Tech Stack
- Frontend: React 18 + TypeScript + Vite (SPA, NOT Next.js)
- UI: Shadcn/ui + Tailwind CSS + CVA
- State: TanStack Query v5
- Backend: Node.js + Express.js + TypeScript
- Database: PostgreSQL (Neon serverless) + pgvector
- ORM: Drizzle ORM 0.39
- Auth: Passport.js (Local strategy) + Session-based
- AI: OpenAI (GPT-4o, GPT-4o-mini, Vision, Embeddings)
- Storage: AWS S3 (Replit Object Storage)
- i18n: i18next (TR, EN, AR, DE)

## CI Colors
DOSPRESSO uses a Navy Blue + Light Blue Gradient + Red Accent corporate palette.
- Primary (buttons, active states): Red `0 84% 52%` (light) / `0 84% 55%` (dark)
- Sidebar primary matches the main primary red
- All color vars defined in `client/src/index.css` using HSL space-separated format

## Project Structure
```
client/src/
├── pages/          # 313 page components
├── components/     # 148 components (custom + Shadcn UI)
├── contexts/       # DobodyFlow, Theme, Auth
├── hooks/          # Custom React hooks
├── lib/            # Utilities, role-routes.ts
└── App.tsx         # Root with providers + 155 lazy route definitions

server/
├── routes/         # 111 route files, ~1800+ endpoints
├── agent/          # Mr. Dobody agent system
│   ├── skills/     # 29 agent skills + 2 utilities
│   └── routing.ts  # Smart notification routing
├── services/       # agent-scheduler, data-lock, change-tracking, business-hours, payroll-bridge
├── lib/            # Business logic (pdks-engine, payroll-engine)
├── menu-service.ts # Sidebar blueprint + RBAC menu config
├── seed-sla-rules.ts # SLA defaults seeded on startup
└── shared/schema/  # 468 tables across 23 modular schema files (barrel: shared/schema.ts)
```

## Role System (30 Roles)

### System:
admin

### Executive:
ceo, cgo

### HQ Department Roles:
muhasebe_ik, satinalma, coach, marketing, trainer, kalite_kontrol, gida_muhendisi, fabrika_mudur

### Legacy HQ Roles:
muhasebe, teknik, destek, fabrika, yatirimci_hq

### Branch Roles (lowest → highest):
stajyer, bar_buddy, barista, supervisor_buddy, supervisor, mudur, yatirimci_branch

### Factory Floor Roles:
fabrika_operator, fabrika_sorumlu, fabrika_personel, sef, recete_gm, uretim_sefi

### Kiosk Roles:
sube_kiosk — auto-created kiosk account per branch, used for PDKS check-in/out at branch kiosks

### Role Groupings (shared/schema.ts):
- `HQ_ROLES` — admin + ceo + cgo + all HQ department + legacy roles
- `EXECUTIVE_ROLES` — admin + ceo + cgo
- `BRANCH_ROLES` — stajyer through yatirimci_branch
- `FACTORY_FLOOR_ROLES` — fabrika_operator, fabrika_sorumlu, fabrika_personel
- `DEPARTMENT_DASHBOARD_ROUTES` — maps roles to dedicated dashboard paths

## App Layout
- SidebarProvider wraps the app (Shadcn sidebar primitives)
- Sidebar menu items defined in `server/menu-service.ts` → `SIDEBAR_ALLOWED_ITEMS`
- Max 6 items per role (except admin)
- Roles with ≤6 items get flat sidebar (no groups/accordions)
- Admin gets grouped sidebar
- Routes are lazy-loaded in `client/src/App.tsx`
- Role-specific home paths defined in `client/src/lib/role-routes.ts`

## API Conventions

### Route Pattern:
```typescript
router.get("/api/resource", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as AuthUser;
    const branchId = user.role === 'admin' ? req.query.branchId : user.branchId;
    const data = await db.select().from(table).where(eq(table.branchId, branchId));
    res.json(data);
  } catch (err: unknown) {
    console.error("[Module] error:", err instanceof Error ? err.message : err);
    res.status(500).json({ error: "Veriler yüklenirken bir hata oluştu." });
  }
});
```

### Auth Middleware Order:
1. `isAuthenticated` — is user logged in? (web session)
2. `isKioskAuthenticated` — kiosk token or authorized web session (for kiosk endpoints)
3. Role check — `isAdmin`, `isHQOrAdmin`, `isSupervisorPlus`
4. Permission check — `canAccess('module', 'view')`
5. Branch scope — filter data by user's branchId

### Kiosk Auth Pattern:
Kiosk endpoints use `isKioskAuthenticated` instead of `isAuthenticated`.
```typescript
router.post('/api/factory/kiosk/start-shift', isKioskAuthenticated, async (req, res) => { ... });
```
- `isKioskAuthenticated` middleware (`server/localAuth.ts`): async, checks `x-kiosk-token` header first, then falls back to web session for authorized roles
- `createKioskSession(userId)` → async, returns UUID token stored in `kiosk_sessions` PostgreSQL table with 8hr TTL + 30s in-memory cache layer
- All session functions are async: `createKioskSession`, `validateKioskSession`, `updateKioskStation`, `deleteKioskSession`
- Sessions persist across server restarts; expired sessions cleaned on startup + hourly
- `GET /api/factory/kiosk/active-sessions` — HQ-only endpoint to view active kiosk auth sessions
- PIN verification uses `bcrypt.compare()` — PINs stored as bcrypt hashes
- `pinLockedUntil` field on user record for lockout after failed attempts
- Device passwords stored in `factory_kiosk_config` (configKey='device_password') and `branch_kiosk_settings` (kioskPassword column) — both bcrypt-hashed
- `migrateKioskPasswords()` runs on server startup (`server/index.ts:156`) to auto-hash any plaintext passwords

### TypeScript req.user Pattern:
```typescript
import { AuthUser } from "../types/auth";
const user = req.user as AuthUser;
const branchId = user.branchId;
```
NEVER use `(req.user as any)` — always use `AuthUser` type from `server/types/auth.ts`.

### Error Responses (always Turkish, never stack traces):
```json
{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }
```

## Agent System (Mr. Dobody)

### 29 Agent Skills:
ai-enrichment, burnout-predictor, contract-tracker, cost-analyzer, customer-watcher, daily-coach, food-safety, performance-coach, production-director, qc-tracker, security-monitor, stock-assistant, stock-predictor, supplier-tracker, team-tracker, training-optimizer, waste-analyzer, payroll-reminder, career-progression-tracker, equipment-lifecycle-tracker, supply-chain-monitor, daily-briefing, smart-reminder, auto-todo-from-ticket, plus additional skills added in recent sprints

### training-optimizer (Enhanced):
Weekly skill targeting trainer/coach/ceo/cgo/admin. 11 insight types:
1. overall_completion_rate — assignment completion % (30d)
2. low_completion_modules — modules with <40% completion
3. high_completion_modules — modules with >90% completion
4. hardest_quiz_questions — quizzes with >50% fail rate
5. quiz_score_trends — 30d vs 60d average score comparison
6. branch_training_comparison — inactive branches, low/top performers
7. personal_training_recommendations — overdue assignments, failed-not-retried
8. onboarding_status — incomplete onboarding >7 days
9. usage_report — weekly branch usage rates
10. certification_pipeline — pending exams, recent certificates
11. quiz_gap_detection — modules without quizzes, few questions
Data sources: trainingAssignments, trainingCompletions, userTrainingProgress, userQuizAttempts, quizResults, quizQuestions, moduleQuizzes, userCareerProgress, examRequests, employeeOnboardingProgress, issuedCertificates, branches, users
Test endpoint: GET /api/agent/test-skill/training_optimizer (admin only)

### Utilities:
skill-registry.ts (loads/runs skills by schedule), skill-notifications.ts (queued delivery)

### Scheduling:
- `agent-scheduler.ts` runs hourly/daily/weekly ticks
- Hourly: escalation + skills + routing (skips quiet hours)
- Daily: runs at 07:00 TR time
- Weekly: scheduled skills

### Routing:
Agent skill generates action → `routing.ts` finds correct recipient by category →
primary_role gets notification + task → escalation after N days → CGO sees summary

## Critical Business Logic Chains

### Factory → Branch Stock:
Production → QC (2-stage) → LOT → Shipment → Branch Inventory
- ALL status changes use transactions + FOR UPDATE
- FIFO LOT assignment by expiry date

### Shift → PDKS → Payroll (Unified Engine — 18 Nis 2026 doğrulandı):
Shift planning → Kiosk check-in/out → pdks_records (raw) → Payroll calculation
- Motor 1 (pdks-engine.ts:119 getMonthClassification): pdks_records → gün sınıflandırma → PdksMonthSummary
- Motor 2 (payroll-calculation-service): SGK/vergi/AGI hesaplama
- Bridge (payroll-bridge.ts:322 calculateUnifiedPayroll): Motor1 + Motor2 birleşik, Excel adapter, kiosk/excel dual source
- **monthly_payroll (schema-12) AKTİF: 51 kayıt, 2026-03 + 2026-04, 51 kullanıcı**
- API: POST /api/payroll/calculate-unified (branchId, year, month, dataSource, importId)
- PDF: `GET /api/payroll/export/pdf/:year/:month` (pdf-lib, `server/utils/pdf-generator.ts`)
- **pdks_records.recordType Türkçe enum:** 'giris' | 'gec_giris' | 'cikis'
  (Not: 'late' de bazı yerlerde paralel — tutarsızlık, Sprint D/E aday)
- **DEAD schema:** monthly_payrolls (schema-07, 0 kayıt) + payroll_records (0 kayıt) — Sprint D'de arşivlenecek
- **shift_attendance** PARALLEL aggregate (Sprint B.1 scheduler), bordro KULLANMAZ — duplicate risk YOK

### Recipe System (Factory):
- 9 tables in schema-22: factory_recipes, ingredients, steps, keyblends, keyblend_ingredients, production_logs, recipe_versions, category_access, ingredient_nutrition
- 4-tier permission: admin > recete_gm > sef > view-only (gida_muhendisi, operators)
- Keyblend secret: only admin + recete_gm see contents. Others see name + total percentage only
- Auto-versioning: PATCH /api/factory/recipes/:id → snapshot (ingredients + steps + cost) BEFORE update
  - RGM/Admin edit → auto-approved. Sef edit → pending (needs RGM approval)
  - skipVersion: true for minor changes (name/description only)
- Production logs: recipeVersionId + recipeVersionNumber captured at start-production
- QC link: production_logs.qualityScore + qcNotes
- 14 EU/TR allergens auto-detected from ingredients
- rawMaterialId FK: factory_recipe_ingredients → inventory (for MRP-Light)

### Inventory Price Structure:
- Dual price: lastPurchasePrice (gerçek alım) + marketPrice (güncel piyasa, ürün fiyatlama)
- inventory_price_history: fiyat geçmişi (purchase/market), kaynak (excel_import/manual/purchase_order)
- materialType: HM/YM/MM/TM/TK (Excel import mapping)
- Unit conversion: purchaseUnit (KG/ADET) ↔ recipeUnit (g/ml) via conversionFactor
- Excel Import API: POST /api/inventory/import-excel (preview + import modes, 408 material parse)
- Price update API: PATCH /api/inventory/:id/market-price (satınalma monthly update)

### Protected Route Group Mapping (client/src/components/protected-route.tsx):
- `admin` → ['admin']
- `ceo`, `cgo` → ['admin', 'hq']
- `muhasebe`, `muhasebe_ik`, `teknik`, `destek`, `coach`, `satinalma`, `marketing`, `trainer`, `kalite_kontrol`, `gida_muhendisi` → ['hq']
- `fabrika`, `fabrika_mudur` → ['fabrika', 'hq']
- `fabrika_operator`, `sef`, `recete_gm`, `uretim_sefi` → ['fabrika']
- `supervisor`, `supervisor_buddy`, `barista`, `bar_buddy`, `stajyer`, `mudur`, `yatirimci_branch` → ['sube']
- Guards: HQOnly=['admin','hq'], FabrikaOnly=['admin','hq','fabrika'], ExecutiveOnly=explicit role list

### MRP-Light (Malzeme Çekme Sistemi — schema-23):
- 4 tables: daily_material_plans, daily_material_plan_items, production_area_leftovers, material_pick_logs
- Flow: Üretim planı → malzeme ihtiyaç hesapla → artan kontrol → net çekme → depocu hazırla → operatör teslim → gün sonu artan
- daily_material_plans: tarih bazlı unique, status (draft→confirmed→in_progress→completed)
- plan_items: inventory×recipe, requiredQuantity - leftoverQuantity = netPickQuantity
- leftovers: condition (good/marginal/unusable), storageTemp, usableForRecipes (auto-calculated)
- pick_logs: audit trail, fromLocation (depo_ana/soguk/kuru), lotNumber, FEFO
- 11 endpoints: generate-plan, get, confirm, pick, verify, leftovers CRUD, pick-logs, deduct-stock, calculate-waste

### Maliyet Analizi Sistemi (Cost Analysis — cost-analysis-routes.ts):
- 5 endpoints: GET /recipes (özet), GET /recipe/:id (detay), GET /profit-summary (kategori), GET /settings, GET /donut-scenarios (3 senaryo)
- Hesaplama: hammadde + elektrik (57.82 KWh × ₺6) + personel (2 kişi × 2 saat × ₺76.25) + topping + dolgu + ambalaj
- SALES_PRICES map hardcoded (şubelere satış fiyatları — DON-001:39.60, CHE-001-004:76, CIN:54.35, BRW:49.50, vb.)
- TOPPING_DEFAULTS map: reçete koduna göre topping/dolgu gramaj+fiyat
- PACKAGING map: kategori bazlı ambalaj maliyeti
- Sayfa: /fabrika/maliyet-analizi (6 rol: admin, muhasebe, satinalma, recete_gm, gida_muhendisi, fabrika_mudur + uretim_sefi)
- DON-001 Donut reçetesi: 29 ayrıştırılmış bileşen (katkı maddeleri ayrı — CMC, DATEM, SSL, L-sistein, aromalar)
- Donut maliyet (DB'den hesaplanır, 17.04.2026): Sade ₺7.13 → Kaplamalı ₺9.62 → Klasik ₺12.65 → Gourmet ₺14.65 (630 adet/batch × ₺39.60 → ₺2.21M/ay kâr potansiyeli)
- Donut seed: `server/seed-donut-recipe-v2.ts` (29 malzeme, 28 inventory bağlı, 1 "Su" bağlanamaz)
- Fabrika Stok Merkezi: `/fabrika/stok-merkezi` (790 satır, FabrikaOnly guard) — 4 tab: Günlük Çekme / Artan Malzeme / Stok Durumu / Hareketler. Sidebar "Stok Merkezi" (Warehouse icon)
- Kritik fiyat düzeltme notları: keyblend ₺215/KG (9210/KG DEĞİL), maya ₺77/KG (1869/KG DEĞİL — paket/12), konfiseri ₺249/KG ort, dolgu ₺260/KG ort

### Fatura Bazlı Fiyat Senkronizasyonu (18 Nisan 2026):
- **Veri kaynağı**: `server/data/invoice-prices.json` (177 malzeme: 143 muhasebe + 7 alias + 27 tahmini)
- **Script**: `server/scripts/update-prices-from-invoices.ts` — envanter `lastPurchasePrice` + `inventoryPriceHistory` günceller
- **Komut**: `npx tsx server/scripts/update-prices-from-invoices.ts`
- **89 malzeme ₺/KG kesin** (paket ağırlığı isimde bilinen), **54 malzeme paket belirsiz** (sonra netleştir)
- **Task #105 alias eşleşmeleri (gerçek fatura)**: HM-NEW-002→H-1008, HM-NEW-005→H-1091, HM-NEW-010→H-1050, HM-NEW-018→H-1067, HM-010→H-1005, KN-001→H-1019, T-0098→H-1106 (`source: invoice_alias`)
- **Task #105 tahmini kalemler (27 adet)**: HM-NEW-001/003/004/006/007/008/009/011-017/019, HM-001/002/004/005/006/007/008, KRUV-001, CHEE-003, T-0261, M-1104, SIR-007 — `source: estimate`, envanter `description` alanına `[TAHMINI - 18 Nis 2026 - muhasebeden bekleniyor]` etiketi yazılı. ⚠️ **Aslan ile pilot sonrası muhasebe görüşmesi → gerçek fatura ile değiştirilecek**.
- **Kritik fatura fiyatları** (02/2026-04/2026 son alımlar):
  - H-1001 Şeker: ₺37.81/KG | H-1006 Maya: ₺77.08/KG | H-1008 Gluten: ₺7.88/KG
  - H-1012 Turyağ: ₺77.50/KG | H-1014 Turyağ Fritöz: ₺93.33/LT (KIZARTMA)
  - H-1049 Beyaz Konfiseri: ₺236.54/KG | H-1050 Sütlü: ₺220/KG | H-1051 Bitter: ₺290/KG (KAPLAMA)
  - H-1175-1178 Donut Sos (FO Zelandya 6KG kova): ₺300/KG (DOLGU — 4 çeşit aynı fiyat)
  - H-1081 Labne kova 2.75 KG: ₺195.51/KG | H-1088 Tereyağ 1 KG: ₺549.91/KG
- **Fatura dosyasında OLMAYAN** (envanter/web fiyatı kullanılıyor):
  - Un 25 KG, Tuz, Ayçiçek Yağ, Soya Unu, Dekstroz
  - CMC, DATEM, Vitamin C, E471 (web tahmin)
  - Alba Bitkisel Yağ (paket ağırlığı bilinmiyor)
- **Donut klasik maliyet (18 Nisan nihai)**: ₺17.02/adet (%57 marj, ₺39.60 satış)
  - Breakdown: Hammadde ₺2.92 + Kızartma ₺1.87 + Kaplama ₺3.73 + Dolgu ₺4.50 + Elektrik ₺0.53 + Personel ₺1.97 + Ambalaj ₺1.50
  - Batch: 58.17 KG ham → 660 temiz ürün (65-70g), %23 fire, 3 saat üretim
  - Personel: ₺216.35/saat (₺45K/ay SGK dahil ÷ 26 gün ÷ 8 saat)

### Key Role Notes:

### 🗺️ Pilot Hazırlık Yol Haritası (18 Nisan 2026 eklendi — AKTİF):
**⚠️ FEATURE FREEZE — 8 hafta yeni özellik YOK, sadece konsolidasyon + bug fix**

Referans: `docs/PILOT-HAZIRLIK-8-HAFTA-YOL-HARITASI.md`

**8 Sprint Planı (18 Nisan 2026 → 18 Haziran 2026):**
- **Sprint A (Hafta 1) ✅ TAMAMLANDI (18 Nis):** Stop the Bleeding
- **Sprint B (Hafta 2):** Veri konsolidasyon — 2 puantaj→1, 3 izin→1, 2 onboarding→1
- **Sprint C (Hafta 3):** Akademi v1/v2/v3→v3, Audit v1/v2→v2, CRM tablolarını düzgün oluştur
- **Sprint D (Hafta 4):** Satınalma modülü + Bordro hesaplama job + Gate sınav akışı aktif
- **Sprint E (Hafta 5):** Dashboard tamamlama (2 rol eksik), Rol konsolidasyon 27→18
- **Sprint F (Hafta 6):** Test dosyası yazım (Vitest kurulu) + Playwright 10 E2E + CI/CD
- **Sprint G (Hafta 7):** Performans (n+1, cache, materialized view, bundle split)
- **Sprint H (Hafta 8):** Observability (Pino + Sentry + slow query log + 404 tracking)

**Sprint A Sonuçları (6/6 ✅ — 18 Nisan 2026):**
| # | Sprint | Hedef | Gerçek | Commit |
|---|--------|-------|--------|--------|
| A1 | Kırık sidebar link | 26→0 | 26→0 | `b83b5cdd`, `ef0b5ec5` |
| A2 | Recipe↔Product | 14/27 | **27/27** (hedef üstü) | `9b152384`, `b628b275` |
| A3 | Equipment enum TR→EN | 6 varyant → 3 | 4/4 acceptance | `2822c8e9` |
| A4 | Seed security | prod-safe | 19 endpoint korumalı | `ad035b89` |
| A5 | Stub endpoint cleanup | 52 analiz | 14 silindi, 38 kullanılıyor | `18896c81`, `137ba7b2` |
| A6 | Notification spam fix | <5K okunmamış | **3,895** (19,643'ten, %80 iyileşme) | `c8618e1a` |

**Sprint A Bonus Bug Fix:**
- `server/storage.ts:7239` — `shifts.userId` → `shifts.assignedToId` (column adı yanlıştı, career score job her 10 dk'da fail oluyordu)
- `migrations/sprint-a1-fix-broken-links.sql` v1→v2 — `label`/`updated_at` kolon adı hatası (gerçek `title_tr`, `updated_at` yok)

**İş bölümü:**
- Aslan: Öncelik + sprint onay + pilot kararı
- Claude (IT): Mimari + schema + sprint planlama + code review
- Replit Agent: Build + hotfix + audit + script execution + **bağımsız DB doğrulama**

**Haftalık sync:** Pazartesi plan, Çarşamba mid-check, Cuma Replit audit + sprint kapanış

---

- `fabrika_depo` (Depocu): Malzeme çekme, stok sayım, mal kabul, FEFO, sevkiyat hazırlama. Fabrika group.
- `gida_muhendisi` (Sema): Factory-only, QC approve, food safety. NO branch_orders/inventory. Has factory-recipes sidebar (read-only)
- `recete_gm` (RGM): Full recipe control + Keyblend + production planning + cost analysis. Fabrika group
- `sef`: Recipe edit (category-restricted), production mode. Fabrika group

### ROLE CONSISTENCY RULES (CRITICAL — check after every new role):
When adding a new role, ALL 8 files must be updated:
1. `shared/schema/schema-01.ts` — UserRole enum + FACTORY_ROLES/HQ_ROLES set
2. `shared/schema/schema-02.ts` — PERMISSIONS map (every permission module)
3. `client/src/components/protected-route.tsx` — ROLE_MAPPING (group assignment)
4. `server/menu-service.ts` — MENU_BLUEPRINT + SIDEBAR_ALLOWED_ITEMS
5. `client/src/components/home-screen/role-module-config.ts` — ROLE_MODULES (HomeScreen cards)
6. `client/src/components/mission-control/DashboardRouter.tsx` — role routing
7. `shared/module-manifest.ts` — module access per role
8. `client/src/lib/role-routes.ts` — ROLE_HOME_ROUTES + ROLE_CONTROL_PATH

Validation: 30/31 roles must be consistent (sube_kiosk intentionally excluded from ROLE_MAPPING).
Sidebar audit doc: docs/SIDEBAR-AUDIT-14-NISAN-2026.md

### Inventory & Price Data:
- 926 materials (115 original + 805 Excel + 6 new raw materials)
- 1501 price history records (2025+2026 monthly purchase prices)
- 14/14 recipe→inventory links (raw_material_id)
- İnvert şeker = M-1104 Creamice Base (dual: branch frappe + factory invert)
- Stale price API: GET /api/inventory/stale-prices, GET /api/inventory/price-summary

## Module Connections (Key Dependencies)
- Composite Score depends on: checklist, training, attendance, feedback, tasks
- Payroll depends on: PDKS, position_salaries, scheduled_offs
- Mr. Dobody Flow depends on: all modules (generates role-specific tasks)
- Factory shipment depends on: inventory, LOT, quality checks
- Badge unlock depends on: training completions, quiz results
- Academy V3 depends on: training, badges, leaderboard, learning paths, AI assistant
- CRM depends on: customer feedback, complaints, campaigns
- Branch inspection depends on: quality audit, health score

## Completed Modules
Operations: Dashboard, Tasks, Checklists, Equipment/Faults, Lost & Found, Branch Orders/Stock
HR & Shifts: Staff Management, Shifts, Attendance (PDKS), Payroll
Factory: Dashboard, Kiosk, Quality Control, Stations, Performance, Compliance, Shipments, Food Safety
Training & Academy: Academy V3 (gamification, badges, leaderboard, learning paths, AI assistant), Knowledge Base
Audit & Analytics: Quality Control, Branch Inspection, Health Score, Food Safety Dashboard
Finance & Procurement: Accounting, Procurement (Satınalma), Inventory, Suppliers, Purchase Orders, Goods Receipt
CRM: Dashboard, Feedback, Complaints, Campaigns, Analytics, Settings
İletişim Merkezi: Support Tickets (SLA-tracked), HQ Tasks, Broadcasts, Dashboard — `server/routes/crm-iletisim.ts`
Delegation System: Module-level role delegation (permanent/temporary) — `server/routes/delegation-routes.ts`
SLA Business Hours: Configurable work hours, business-hour-aware SLA deadlines — `server/services/business-hours.ts`
Kiosk System: Factory + Branch PIN auth, device passwords, shift tracking — `server/routes/factory.ts` kiosk endpoints
Franchise/Investor: Investor profiles, contract tracking, branch performance — `server/routes/franchise-investors.ts`
Webinar: Webinar management and registration system
Communication: HQ Support, Notifications, AI Assistant, Agent Center
System: Admin Panel, Content Studio, Projects, Security/Backups

### İK Module Enhancement:
- İK Dashboard KPIs: `GET /api/hr/ik-dashboard` (document stats, disciplinary stats)
- Document CRUD: `GET/POST /api/hr/employees/:userId/documents`, `PATCH .../verify`, `DELETE`
- Disciplinary CRUD: `GET/POST /api/hr/disciplinary`, `PATCH .../status`, `POST .../respond`
- Auto-lot creation: `createAutoLot()` in factory.ts (3 production insert points)
- QC Stats: `GET /api/factory/qc/stats` (today/week quality checks and lots)
- QC Tracker skill: `server/agent/skills/qc-tracker.ts` (daily, targets gida_muhendisi/kalite_kontrol/fabrika_mudur)
- AuthUser type: `server/types/auth.ts` (centralized type for req.user)

## New Tables (Recent Sprints)
- `support_tickets` — İletişim Merkezi tickets with SLA tracking
- `support_ticket_comments` — Ticket comments (internal/external)
- `ticket_attachments` — File attachments on tickets
- `hq_tasks` — HQ internal task assignment system
- `broadcast_receipts` — Announcement delivery confirmations
- `sla_rules` — Department × priority SLA hour limits (seeded by `server/seed-sla-rules.ts`)
- `sla_business_hours` — Single-row config for work hours and timezone
- `factory_kiosk_config` — Factory kiosk device settings (device_password, etc.)
- `branch_kiosk_settings` — Branch kiosk passwords and config
- `kiosk_sessions` — PostgreSQL-backed kiosk auth sessions (token, user_id, station_id, expires_at)
- `module_delegations` — Module-level role delegation records
- `module_departments` — Department definitions for delegation
- `module_department_topics` — Topic categories within departments
- `franchise_investors` — Investor profiles with contract data
- `franchise_investor_branches` — Investor ↔ branch associations
- `franchise_investor_notes` — Meeting notes for investors
- `factory_station_benchmarks` — Station performance benchmarks
- `webinars` — Webinar definitions
- `webinar_registrations` — Webinar attendance records

## New Route Files (Recent Sprints)
- `server/routes/crm-iletisim.ts` — İletişim Merkezi (tickets, HQ tasks, broadcasts, dashboard, SLA)
- `server/routes/delegation-routes.ts` — Module delegation CRUD
- `server/routes/module-content-routes.ts` — Module content and topic management
- `server/routes/franchise-investors.ts` — Franchise investor management
- `server/routes/franchise-summary.ts` — Franchise performance summaries
- `server/routes/academy-v3.ts` — Academy V3 with webinars
- `server/routes/change-requests.ts` — Data change request workflow for locked records
- `server/routes/dobody-task-manager.ts` — Mr. Dobody task management
- `server/routes/dobody-avatars.ts` — Dynamic avatar system for Mr. Dobody
- `server/routes/dobody-flow.ts` — Guided workflow mode for daily tasks
- `server/routes/coach-summary.ts` — Coach role dashboard summaries
- `server/routes/hq-summary.ts` — HQ executive dashboard summaries

## Database Naming Conventions
- Table names: snake_case (factory_products, branch_inventory)
- Column names: camelCase in Drizzle schema (branchId, createdAt)
- Timestamps: always with timezone
- Soft delete: isActive boolean + deletedAt timestamp
- IDs: serial integer (not UUID, except users table which uses string IDs)

## Data Protection Tables
- `data_lock_rules` — time-based lock rules per table
- `data_change_requests` — change request workflow (pending → approved/rejected)
- `record_revisions` — immutable revision history for all changes
- `data_change_log` — field-level change tracking

## API Response Format Variations
IMPORTANT: Not all APIs return arrays. Known object-wrapped responses:
- `/api/faults` → `{data: [...]}`
- `/api/agent/actions` → `{actions: [...]}`
- `/api/admin/dobody-tasks` → `{tasks: [...]}`
- Most other endpoints → direct array `[...]`

Frontend MUST normalize: `Array.isArray(data) ? data : (data?.data || data?.actions || data?.tasks || data?.items || [])`

## Module Feature Flag System
Table: `module_flags` in `shared/schema.ts` — global + branch-level + role-level module toggles with behavior types.

### Table Columns
- `moduleKey` (varchar 100) — unique module identifier
- `scope` (varchar 20) — "global" or "branch"
- `branchId` (integer, nullable) — NULL for global, branch ID for overrides
- `isEnabled` (boolean) — toggle state
- `flagLevel` (varchar 20) — "module" | "submodule" | "widget" | "function"
- `flagBehavior` (varchar 30) — "fully_hidden" | "ui_hidden_data_continues" | "always_on"
- `parentKey` (varchar 100, nullable) — parent moduleKey for sub-modules
- `targetRole` (varchar 50, nullable) — NULL = all roles, "barista" = only that role

### 4-Level Lookup Priority (most specific wins)
1. **Level 1**: branch + role override (branchId=X, targetRole="barista")
2. **Level 2**: branch override (branchId=X, targetRole=NULL)
3. **Level 3**: global + role override (scope="global", targetRole="barista")
4. **Level 4**: global default (scope="global", targetRole=NULL)

### Behavior Types
1. **always_on** — always returns true regardless of isEnabled. Used for core modules (admin, dashboard, fabrika, satinalma, bordro, dobody).
2. **fully_hidden** — standard toggle. When disabled, module is completely hidden from UI and API returns 403.
3. **ui_hidden_data_continues** — when context="data", always returns true (data collection continues even if UI is hidden). Used for pdks, vardiya, fabrika.vardiya.

### Parent-Child Hierarchy
Sub-modules have a `parentKey` pointing to their parent module. If parent is disabled, all children are disabled too (exception: always_on parents are never disabled).

### Factory Sub-Modules (8)
fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.vardiya, fabrika.kalite, fabrika.kavurma, fabrika.stok

### Dobody Sub-Modules (3)
dobody.chat (DobodyMiniBar), dobody.flow (DobodyFlowMode), dobody.bildirim (notification delivery)

### Module Keys (34 total)
- **always_on** (6): admin, dashboard, bordro, dobody, fabrika, satinalma
- **ui_hidden_data_continues** (3): pdks, vardiya, fabrika.vardiya
- **fully_hidden** (22): checklist, gorevler, akademi, crm, stok, ekipman, denetim, iletisim_merkezi, raporlar, finans, delegasyon, franchise, fabrika.sevkiyat, fabrika.sayim, fabrika.hammadde, fabrika.siparis, fabrika.kalite, fabrika.kavurma, fabrika.stok, dobody.chat, dobody.bildirim, dobody.flow

### Key Files
- **Schema**: `shared/schema.ts` — `moduleFlags` table definition
- **Service**: `server/services/module-flag-service.ts` — `isModuleEnabled(key, branchId?, context?, userRole?)`, `requireModuleEnabled()`, `getModuleFlagBehavior()`, `PATH_TO_MODULE_KEY_MAP`
- **Routes**: `server/routes/module-flags.ts` — CRUD (admin only) + `/api/module-flags/check?moduleKey=X&context=ui`
- **Seed**: `server/seed-module-flags.ts` — 34 flags (23 modules + 8 fabrika sub-modules + 3 dobody sub-modules), ALTER TABLE migration on startup
- **Menu**: `server/menu-service.ts` — `buildMenuForUser()` filters sidebar items with context="ui" and user role
- **Hook**: `client/src/hooks/use-module-flags.ts` — `useModuleEnabled(moduleKey, context?)`
- **Dobody integration**: `client/src/components/dobody-mini-bar.tsx` (dobody.chat), `client/src/components/dobody-flow-mode.tsx` (dobody.flow)
- **Admin UI**: `client/src/pages/admin/module-flags.tsx` — tab "modul-bayraklari" in admin-mega.tsx, 5 category cards, branch override management, role-based overrides accordion
- **Page Protection**: `client/src/components/module-guard.tsx` — wraps route pages, shows lock screen when disabled. Applied in `App.tsx` for all toggleable modules
- **Bulk Flags**: `GET /api/module-flags/my-flags` — single endpoint returns all effective flags for current user (branchId + role), used by `useMyModuleFlags()` hook
- **Score Integration**: `server/services/branch-health-scoring.ts` — `isComponentEnabled()` checks module flags before including components in health score. Uses context="data" so pdks/vardiya always included. Components: inspections(0.19), complaints(0.19), equipment(0.16), training(0.12), opsHygiene(0.11), customerSatisfaction(0.11), branchTasks(0.12). `branchTasks` maps to `sube_gorevleri` module key
- **Agent Filtering**: `server/agent/skills/skill-notifications.ts` — `SKILL_TO_MODULE_MAP` maps skill IDs to module keys. Notifications skipped for disabled modules

### Graceful Degradation
When a module is disabled:
- Route pages show ModuleGuard lock screen ("Bu modül şu anda aktif değildir")
- Sidebar menu items filtered via `buildMenuForUser()` (context="ui")
- Branch health scores recalculate proportionally without disabled components
- Agent notifications for that module are suppressed (throttled)
- Data collection continues for `ui_hidden_data_continues` modules (pdks, vardiya)

## Mobile UI Components
- CompactKPIStrip (`client/src/components/compact-kpi-strip.tsx`) — horizontal scroll strip on mobile, grid on desktop. Used in 19+ pages.
- MobileFilterCollapse (`client/src/components/mobile-filter-collapse.tsx`) — auto-collapse filters on mobile, expand on desktop. Used in 7+ pages.
- Pattern: mobile (<md) gets compact view, desktop (md+) stays unchanged.

## Branch Recurring Tasks
- Tables: `branch_recurring_tasks` (templates), `branch_task_instances` (daily), `branch_task_categories` (4), `branch_recurring_task_overrides`
- Scheduler: generates daily instances at startup + 08:00 TR, marks overdue
- UI: 3-tab Görevler page (Bana Atanan / Şube Görevleri / Tekrarlayan Yönetimi)
- Dashboard: TodaysTasksWidget (combined ad-hoc + recurring)
- Kiosk: KioskBranchTasks section
- Score: branchTasks component in health scoring (weight 0.12)
- Module flag: `sube_gorevleri`

## Certificate System
- Tables: `issued_certificates`, `certificate_settings`
- Templates: 5 role transition + module completion
- Renderer: `client/src/components/certificate-renderer.tsx`
- Features: Dancing Script handwriting font, DOSPRESSO logo watermark, vintage seal, dual signatures
- HQ: SertifikaTab in akademi-hq (create/preview/print)
- API: `/api/certificates` (CRUD), `/api/certificate-settings` (signer config)

## Permission Modules
88 permission module keys defined in `shared/schema.ts` as `PermissionModule` type.
Key groups: dashboard, tasks, checklists, equipment, faults, hr, training, factory_*, academy_*, satinalma, crm_*, food_safety, branch_inspection, cost_management.
Full permission matrix in `PERMISSIONS` record maps each role to allowed actions per module.

## KAPSAM SINIRI — DORMANT MODÜLLER (KRİTİK!)

**DOSPRESSO'nun kapsamı:** Üretim → QC → LOT → Depo Hazırlık (sevk için hazır noktası)

**DOSPRESSO DIŞINDA:** Sevkiyat (lojistik) + Şube teslim alımı — başka sistemde yapılıyor

### Dormant Modüller (Kod Var, Şu An Kullanılmıyor — SİLİNMEMELİ)

1. **Sevkiyat Modülü** (Aslan onayı 18 Nis 2026):
   - Tablolar: `factory_shipments`, `factory_shipment_items`, `branch_stock_receipts`
   - Sayfa: `/fabrika-sevkiyat`, `/depo-sevkiyat`, `/sube-teslim-alim`
   - Durum: `factory_shipments` = 2 kayıt (fiilen kullanılmıyor)
   - **Önemli:** Aslan "ilerde burdan planlıyorum bir ihtimal. Olmayabilir." dedi
   - **Karar:** Kod dormant tutulacak, ölü kod temizliğinde SİLİNMEMELİ
   - **Gelecek:** Sprint K-L'de (Hafta 11+) aktif edilme ihtimali

2. **Franchise Proje Yönetimi** (Aslan onayı 18 Nis 2026):
   - 20 tablo: `franchise_projects`, `project_phases`, `project_budget_lines`,
     `project_milestones`, `project_risks`, `project_vendors`, vb.
   - Durum: 0 kayıt (henüz kullanılmıyor)
   - **Karar:** Sprint I (Hafta 9+) canlıya alınacak
   - **Tetikleyici:** Yeni franchise şube açılışı

3. **Gate Sınav Sistemi** (Aslan onayı 18 Nis 2026):
   - 18 tablo: `gate_attempts`, `exam_requests`, `career_gates`, `user_career_progress`
   - Durum: 0 gate_attempts, 0 exam_requests
   - **Karar:** Pilot'ta aktif edilecek — Hibrit model:
     `Terfi = (Skor >= Eşik) ∩ (Gate Geçti) ∩ (Yönetici Önerisi)`
   - Sprint C/D'de UI test + akış aktifleştirme

4. **Employee Onboarding** (Aslan onayı 18 Nis 2026):
   - Tablo: `employee_onboarding` = 2 kayıt
   - 14 günlük Stajyer programı kodda tanımlı
   - **Karar:** Pilot sonrası aktif olacak, şu an beklemede

### KURAL: Dormant Modül Silme Yasağı

Sprint E (rol konsolidasyon / ölü kod temizliği) veya başka bir sprint'te
"kullanılmayan modül sil" dürtüsü geldiğinde BU LİSTEYİ KONTROL ET:

- ✅ Dormant modüller = gelecekte kullanılacak, SİLİNMEZ
- ❌ Gerçek ölü modül = dokümante edilmemiş, karar alınmamış → sil

Referans doküman: `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` Bölüm 1.3 + 6.3
