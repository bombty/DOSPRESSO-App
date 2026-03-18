# DOSPRESSO — KAPSAMLI SİSTEM RAPORU

**Tarih:** 18 Mart 2026  
**Amaç:** Yeni AI asistanın projeyi tam olarak anlaması için hazırlanmış teknik ve operasyonel referans belgesi  
**Not:** Bu belgedeki sayısal veriler (satır sayıları, endpoint sayıları, tablo sayıları vb.) 18 Mart 2026 tarihinde doğrulanmıştır. Aktif geliştirme devam ettiğinden bu rakamlar zamanla değişebilir — güncel sayılar için ilgili dosyaları kontrol edin.

---

## 1. PROJE GENEL BAKIŞ

### 1.1 DOSPRESSO Nedir?
DOSPRESSO, bir kahve ve donut franchise zinciri için geliştirilmiş **kurumsal franchise yönetim platformu**dur. Şu anda **22 aktif şube** ve **1 üretim fabrikası** ile operasyonel olarak kullanılmaktadır.

Platform, merkez ofis (HQ), şube yöneticileri, baristalar ve fabrika personelini tek bir dijital ekosistemde birleştiren bir "işletim sistemi" olarak tasarlanmıştır.

### 1.2 Temel Hedefler
- Franchise operasyonlarını dijitalleştirmek ve standartlaştırmak
- Kalite kontrolü, görev yönetimi ve eğitimi merkezileştirmek
- AI destekli operasyonel içgörüler sağlamak (Mr. Dobody AI Asistan)
- Tüm şubelerde marka standartlarını korumak

---

## 2. TEKNİK MİMARİ

### 2.1 Tech Stack
| Katman | Teknoloji |
|--------|-----------|
| **Frontend** | React 18 + Vite, TypeScript |
| **UI Kütüphanesi** | Shadcn/UI (Radix UI primitives) |
| **CSS** | Tailwind CSS |
| **Animasyon** | Framer Motion |
| **Routing** | Wouter |
| **State/Data** | TanStack Query v5 (React Query) |
| **Backend** | Node.js + Express |
| **ORM** | Drizzle ORM 0.39 |
| **Veritabanı** | PostgreSQL (Neon serverless) + pgvector |
| **Auth** | Passport.js (local strategy + kiosk strategies) |
| **Session** | connect-pg-simple (PostgreSQL session store) |
| **AI** | OpenAI GPT-4o, GPT-4o-mini, Vision, Embeddings |
| **Dosya Depolama** | Replit Object Storage (AWS S3) |
| **i18n** | i18next (TR, EN, DE, AR) |
| **İkonlar** | Lucide React |

### 2.2 Proje Yapısı
```
/client                    → Frontend React uygulaması
  /src/components          → UI bileşenleri (148+ bileşen)
    /ui                    → Shadcn UI primitifleri (Button, Card, Dialog, vb.)
    /widgets               → Dashboard widget'ları
  /src/pages               → 267 sayfa dosyası (modüle göre organize)
    /admin                 → Yönetim paneli sayfaları
    /fabrika               → Fabrika modülü sayfaları
    /sube                  → Şube modülü sayfaları
    /crm                   → CRM sayfaları
    /iletisim-merkezi      → İletişim merkezi sayfaları
    /satinalma             → Satınalma sayfaları
    /akademi-v3            → Akademi V3 sayfaları
    /hq                    → HQ sayfaları
    /yonetim               → Yönetim sayfaları
  /src/contexts            → Auth, Theme, DobodyFlow, App-wide state
  /src/hooks               → Custom React hooks (useAuth, useModuleFlags, vb.)
  /src/lib                 → Utility fonksiyonları, queryClient, role-routes
/server                    → Backend Express uygulaması
  /routes                  → 47 route dosyası (modüler API)
  /services                → İş mantığı servisleri (business-hours, ticket-routing, module-flags)
  /agent                   → AI agent skills ve logic
    /skills                → 16 agent skill + 2 utility
  /lib                     → Business logic (pdks-engine, payroll-engine)
  db.ts                    → Veritabanı bağlantısı (Neon PostgreSQL)
  routes.ts                → Ana route kaydı (1307 satır)
  localAuth.ts             → Passport.js auth konfigürasyonu (525 satır)
  permission-service.ts    → İzin yönetimi (308 satır)
  menu-service.ts          → Dinamik menü oluşturma (870 satır)
  scheduler-manager.ts     → Agent scheduler (hourly/daily/weekly)
  seed-sla-rules.ts        → SLA kural seed'leri
  seed-module-flags.ts     → Modül flag seed'leri (31 flag)
/shared
  schema.ts                → 15,558 satır — TÜM veritabanı şeması ve tip tanımları
/scripts                   → Migrasyon ve yardımcı scriptler
/seeds                     → Seed data scriptleri
/.agents/skills            → AI agent custom skill dosyaları (5 skill)
```

### 2.3 Veritabanı
- **375 tablo** tanımlı (`shared/schema.ts` içinde Drizzle ORM ile)
- **15,558 satır** schema dosyası
- Soft delete pattern (`deletedAt` alanı) yaygın kullanımda
- Data lock mekanizması (onaylanmış kayıtların düzenlenmesini engeller)
- User ID'leri string (UUID), diğer tüm tablolar serial integer

#### Temel Tablo Grupları:
| Grup | Tablolar |
|------|----------|
| **Çekirdek** | `users`, `branches`, `sessions` |
| **Operasyon** | `checklists`, `checklist_tasks`, `tasks`, `task_assignees`, `checklist_completions`, `checklist_assignments` |
| **Ekipman** | `equipment`, `equipment_faults`, `equipment_maintenance_logs`, `equipment_service_requests`, `equipment_catalog`, `fault_service_tracking` |
| **İK/Vardiya** | `shifts`, `shift_attendance`, `leave_requests`, `overtime_requests`, `employee_warnings`, `employee_salaries`, `monthly_payrolls` |
| **Destek** | `hq_support_tickets`, `hq_support_messages`, `announcements`, `notifications` |
| **İletişim Merkezi** | `support_tickets`, `support_ticket_comments`, `ticket_attachments`, `hq_tasks`, `broadcast_receipts` |
| **Satınalma** | `inventory`, `suppliers`, `purchase_orders`, `goods_receipts`, `inventory_counts`, `inventory_movements` |
| **Fabrika** | `factory_stations`, `factory_staff_pins`, `factory_shift_sessions`, `factory_production_runs`, `factory_products`, `factory_production_batches`, `factory_batch_verifications`, `factory_quality_specs` |
| **Akademi** | Kurslar, dersler, quizler, webinarlar, sertifikalar, badge'ler, learning paths, streak tracker |
| **CRM** | Müşteri geri bildirimi, şikayetler, kampanyalar, franchise yatırımcılar |
| **Kalite** | Denetim şablonları, denetim sonuçları, gıda güvenliği, branch health scores |
| **Kiosk** | `branch_staff_pins`, `branch_shift_sessions`, `branch_kiosk_settings`, `factory_kiosk_config` |
| **Veri Koruma** | `data_lock_rules`, `data_change_requests`, `record_revisions`, `data_change_log` |
| **Modül Yönetimi** | `module_flags`, `module_delegations`, `module_departments`, `module_department_topics` |
| **SLA** | `sla_rules`, `sla_business_hours` |

### 2.4 API Yapısı
Toplam **~1326 endpoint**. Modüler yapıda, her fonksiyonel alan kendi route dosyasına sahip:

| Route Dosyası | Prefix / Kapsam |
|---------------|-----------------|
| `admin.ts` | `/api/admin/*` — Kullanıcı, Rol, İzin, Menü yönetimi |
| `branches.ts` | `/api/branches/*` — Şube yönetimi, Kiosk ayarları |
| `equipment.ts` | `/api/equipment/*` — Ekipman, katalog, bilgi bankası |
| `tasks.ts` | `/api/tasks/*`, `/api/checklists/*` — Görev yönetimi |
| `shifts.ts` | `/api/shifts/*` — Vardiya, devam takibi |
| `hr.ts` | `/api/hr/*` — İzin, belgeler, disiplin |
| `academy-v3.ts` | `/api/v3/academy/*` — Kurslar, Quizler, Webinarlar |
| `factory.ts` | `/api/factory/*` — Üretim, istasyonlar (5702 satır!) |
| `operations.ts` | `/api/operations/*` — Performans, denetim |
| `crm-routes.ts` | `/api/crm/*` — Dashboard, şikayetler, SLA |
| `crm-iletisim.ts` | `/api/iletisim/*` — İletişim Merkezi tickets, HQ tasks, broadcasts |
| `financial-routes.ts` | `/api/financial/*` — Mali yönetim |
| `hq-dashboard-routes.ts` | `/api/hq/*` — HQ komuta merkezi |
| `satinalma-routes.ts` | `/api/satinalma/*` — Satınalma, stok |
| `inspection-routes.ts` | `/api/inspections/*` — Denetimler |
| `ai-ops-copilot.ts` | `/api/ai-ops-copilot/*` — AI operasyonel içgörüler |
| `agent.ts` | `/api/agent/*` — Otonom agent kontrolü |
| `push.ts` | `/api/push/*` — Web Push bildirimleri |
| `delegation-routes.ts` | `/api/delegations/*` — Modül delegasyonu |
| `module-flags.ts` | `/api/module-flags/*` — Modül feature flag'leri |
| `franchise-investors.ts` | `/api/franchise-investors/*` — Yatırımcı yönetimi |
| `pdks.ts` | `/api/pdks/*` — PDKS kayıtları |
| `payroll.ts` | `/api/pdks-payroll/*` — Maaş hesaplama |
| `branch-inventory.ts` | `/api/branch-inventory/*` — Şube stok |
| `branch-orders.ts` | `/api/branch-orders/*` — Şube siparişleri |
| `change-requests.ts` | `/api/change-requests/*` — Kilitli veri değişiklik talepleri |
| `data-management.ts` | `/api/data-management/*` — Veri yönetimi |
| `waste.ts` | `/api/waste/*` — Fire yönetimi |
| `dobody-flow.ts` | `/api/dobody-flow/*` — Dobody Flow Mode |
| `dobody-avatars.ts` | `/api/dobody-avatars/*` — Dobody avatar sistemi |
| `dobody-task-manager.ts` | `/api/dobody-tasks/*` — Dobody görev yönetimi |

#### API Yanıt Formatı Varyasyonları
**ÖNEMLİ:** Tüm API'ler dizi döndürmez. Bilinen nesne-sarmalı yanıtlar:
- `/api/faults` → `{data: [...]}`
- `/api/agent/actions` → `{actions: [...]}`
- `/api/admin/dobody-tasks` → `{tasks: [...]}`
- Diğer endpoint'lerin çoğu → doğrudan dizi `[...]`

Frontend'de normalleştirme: `Array.isArray(data) ? data : (data?.data || data?.actions || data?.tasks || data?.items || [])`

---

## 3. ROL VE YETKİ SİSTEMİ

### 3.1 Tanımlı Roller (27 Rol)

#### Sistem/Üst Yönetim
| Rol | Kod | Açıklama |
|-----|-----|----------|
| Admin | `admin` | Tam sistem erişimi |
| CEO | `ceo` | Tam okuma + AI Command Center |
| CGO | `cgo` | Chief Growth Officer — Tüm departman özeti |

#### HQ Departman Rolleri
| Rol | Kod | Kişi | Sorumluluk |
|-----|-----|------|------------|
| Muhasebe & İK | `muhasebe_ik` | Mahmut | Muhasebe ve insan kaynakları |
| Satınalma | `satinalma` | Samet | Satın alma ve tedarik zinciri |
| Coach | `coach` | Yavuz | Şube performans ve personel gelişimi |
| Marketing | `marketing` | Diana | Pazarlama ve grafik tasarım |
| Trainer | `trainer` | Ece | Eğitim ve reçete sorumlusu |
| Kalite Kontrol | `kalite_kontrol` | Ümran | Fabrika kalite ve geri bildirim |
| Gıda Mühendisi | `gida_muhendisi` | Sema | Gıda güvenliği ve kalite |
| Fabrika Müdür | `fabrika_mudur` | Eren | Fabrika üretim ve stok |

#### Eski HQ Rolleri (Geriye Uyumluluk)
`muhasebe`, `teknik`, `destek`, `fabrika`, `yatirimci_hq`

#### Şube Rolleri (Hiyerarşik — düşükten yükseğe)
| Rol | Kod | Açıklama |
|-----|-----|----------|
| Stajyer | `stajyer` | En alt seviye |
| Bar Buddy | `bar_buddy` | Barista yardımcısı |
| Barista | `barista` | Temel operasyonel personel |
| Supervisor Buddy | `supervisor_buddy` | Supervisor yardımcısı |
| Supervisor | `supervisor` | Vardiya sorumlusu |
| Müdür | `mudur` | Şube müdürü |
| Yatırımcı (Şube) | `yatirimci_branch` | Salt okunur erişim |
| Şube Kiosk | `sube_kiosk` | Kiosk cihaz hesabı |

#### Fabrika Rolleri
`fabrika_operator`, `fabrika_sorumlu`, `fabrika_personel`

#### Rol Gruplamaları (shared/schema.ts)
- `HQ_ROLES` — admin + ceo + cgo + tüm HQ departman + eski roller
- `EXECUTIVE_ROLES` — admin + ceo + cgo
- `HQ_DEPARTMENT_ROLES` — cgo + tüm HQ departman rolleri (her biri kendi dashboard'una sahip)
- `BRANCH_ROLES` — stajyer'den yatirimci_branch'e + sube_kiosk
- `FACTORY_FLOOR_ROLES` — fabrika_operator, fabrika_sorumlu, fabrika_personel

#### Departman Dashboard Yönlendirmeleri
```typescript
DEPARTMENT_DASHBOARD_ROUTES = {
  ceo: '/ceo-command-center',
  cgo: '/cgo-command-center',
  muhasebe_ik: '/hq-dashboard/ik',
  satinalma: '/hq-dashboard/satinalma',
  coach: '/hq-dashboard/coach',
  marketing: '/hq-dashboard/marketing',
  trainer: '/hq-dashboard/trainer',
  kalite_kontrol: '/hq-dashboard/kalite',
  gida_muhendisi: '/gida-guvenligi-dashboard',
  fabrika_mudur: '/hq-dashboard/fabrika',
}
```

### 3.2 Kimlik Doğrulama Mekanizmaları

1. **Standart Login:** Kullanıcı adı/şifre (bcrypt hash, 10 başarısız deneme → 15 dk kilitleme)
   - Session regeneration on login
   - `connect.sid` cookie, 8 saat TTL (bir vardiya)
   - Session store: PostgreSQL (`connect-pg-simple`)

2. **Şube Kiosk Auth:** `branches` tablosundaki kiosk kullanıcı/şifre ile giriş
   - Şifre bcrypt hash ile saklanır — plaintext reddedilir
   - Türkçe karakter normalleştirmesi ile eşleştirme

3. **Fabrika Kiosk Auth:** UUID token tabanlı, PIN ile erişim (`x-kiosk-token` header)
   - In-memory session Map, 8 saat TTL
   - PIN'ler bcrypt hash ile saklanır
   - `pinLockedUntil` ile kilitleme mekanizması
   - `migrateKioskPasswords()` sunucu başlangıcında çalışarak plaintext şifreleri otomatik hash'ler

4. **Eşzamanlı Oturum Limiti:** Kullanıcı başına maksimum 2 aktif oturum
   - En eski oturum otomatik sonlandırılır
   - Audit log kaydı tutulur

### 3.3 Yetkilendirme

#### İzin Sistemi
- **Permission Matrix:** `shared/schema.ts` satır 434+ — Her rol için modül ve aksiyon bazlı izin tanımları
- **88 PermissionModule** tanımlı: dashboard, tasks, checklists, equipment, faults, hr, training, factory_*, academy_*, satinalma, crm_*, food_safety, branch_inspection, cost_management, vb.
- **5 Aksiyon tipi:** `view`, `create`, `edit`, `delete`, `approve`

#### 3 Kapsam Seviyesi (Scope)
| Kapsam | Açıklama | Kullanım |
|--------|----------|----------|
| `SELF` | Sadece kendi verisi | userId === currentUser.id |
| `BRANCH` | Şube verileri | branchId === currentUser.branchId |
| `GLOBAL` | Tüm organizasyon | HQ/Admin rolleri |

#### Auth Middleware Sıralaması
1. `isAuthenticated` — Kullanıcı giriş yapmış mı? (web session)
2. `isKioskAuthenticated` — Kiosk token veya yetkili web session (kiosk endpoint'leri)
3. Rol kontrolü — `isAdmin`, `isHQOrAdmin`, `isSupervisorPlus`
4. İzin kontrolü — `canAccess('module', 'view')`
5. Branch scope — Veriyi kullanıcının branchId'sine göre filtrele

#### Frontend Koruma Bileşenleri
```typescript
AdminOnly       → allowedRoles: ["admin"]
HQOnly          → allowedGroups: ["admin", "hq"]
FabrikaOnly     → allowedGroups: ["admin", "hq", "fabrika"]
ExecutiveOnly   → allowedRoles: ["admin", "ceo", "cgo", "coach", "trainer", ...]
CEOOnly         → allowedRoles: ["ceo", "cgo"] (strictRoles)
```

#### PATH → Permission Module Eşleştirmesi
`shared/schema.ts` içinde `PATH_TO_PERMISSION_MAP` kaydı, URL path'lerini izin modüllerine eşleştirir. Bu eşleştirme sidebar menü filtrelemesinde ve route korumasında kullanılır.

---

## 4. ANA MODÜLLER VE FONKSİYONLAR

### 4.1 Operasyon & Görev Yönetimi
- Dijital checklist'ler (açılış/kapanış, temizlik, vb.)
- Otomatik tekrarlanan görevler
- Gerçek zamanlı görev takibi
- Görev atama ve tamamlama akışı
- Kayıp Eşya yönetimi (şube ve HQ ayrı)
- QR kod tabanlı ekipman erişimi

### 4.2 Akademi V3 (LMS)
- Kurslar, modüller, dersler
- Quiz sistemi (çoktan seçmeli, doğru/yanlış)
- Webinar takvimi ve kayıt sistemi
- Sertifika ve badge sistemi
- Gamification (streak, liderlik tablosu, günlük görevler)
- Kariyer yolları (Learning Paths)
- AI destekli quiz ve flashcard oluşturma
- Onboarding programları (çalışan onboarding ile birleşik)
- Adaptif öğrenme motoru
- Sosyal gruplar

### 4.3 Şube Yönetimi
- Şube sağlık skoru (Branch Health Score) — composite score
- KPI Strip ve Alert Pills ile anlık izleme
- Checklist yürütme
- Stok ve sipariş yönetimi (şube bazlı)
- Şube karşılaştırma analitiği
- Canlı takip (çalışan konum)

### 4.4 Fabrika & Kiosk
- Üretim planlama ve takip
- Kavurma (roasting) modülü
- Kalite kontrol (2 aşamalı QC)
- PIN tabanlı Kiosk modu (fabrika ve şube)
- Vardiya uyum takibi
- Sevkiyat ve LOT yönetimi (FIFO)
- İstasyon performans benchmarking
- Hammadde yönetimi
- Sayım ve stok takibi

### 4.5 CRM & İletişim Merkezi
- Müşteri şikayet yönetimi
- Ticket sistemi (SLA takipli — iş saati bazında)
- Çalışan bazlı performans skoru
- Kampanya yönetimi
- Misafir memnuniyet anketleri (public link ile)
- İletişim Merkezi: Destek ticketları, HQ görevleri, broadcast'ler
- SLA kuralları: 6 departman × 4 öncelik = 24 kural
- İş saatleri: Yapılandırılabilir çalışma saatleri (varsayılan 08:00-18:00 Pzt-Cum)

### 4.6 İK & PDKS
- Vardiya planlama
- Check-in/check-out takibi (PDKS)
- İzin ve mesai talepleri
- Bordro yönetimi (günlük = aylık/30, devamsızlık kesintisi, mesai ×1.5)
- Performans değerlendirme
- Onboarding süreçleri (şablonlar + adımlar)
- İşe alım modülü (pozisyonlar, başvurular, mülakatlar)
- İşten çıkış modülü
- Disiplin raporları

### 4.7 Satınalma
- Tedarikçi yönetimi
- Sipariş oluşturma ve onay akışı
- Stok takibi
- Mal kabul işlemleri
- Envanter sayımı ve atama

### 4.8 Mali Yönetim
- Gelir/gider takibi
- Fire raporları (waste management)
- CEO finansal özeti
- Maliyet analizi
- Muhasebe raporlama

### 4.9 Ekipman Yönetimi
- Ekipman kataloğu ve envanter
- Arıza bildirimi ve takibi (fotoğraf + AI analiz)
- Bakım planlaması
- Servis talepleri ve takibi
- Kalibrasyon yönetimi
- Bilgi bankası (RAG tabanlı)
- QR kod ile ekipman erişimi

### 4.10 Kalite & Denetim
- Denetim şablonları oluşturma
- Sahada denetim yürütme
- Gıda güvenliği kontrolleri
- Otomatik puanlama
- Şube sağlık skoru
- Düzeltici faaliyet (CAPA) takibi
- Coach şube denetimi

### 4.11 AI Sistemi (Mr. Dobody)
- AI operasyonel copilot (RAG destekli)
- Next Best Action (NBA) önerileri
- AI politika yönetimi (admin)
- Otomatik denetim puanlama
- Akıllı ticket yönlendirme
- Flow Mode (günlük görev rehberliği)
- Avatar sistemi
- 16 Agent Skill:
  - ai-enrichment, burnout-predictor, contract-tracker, cost-analyzer
  - customer-watcher, daily-coach, food-safety, performance-coach
  - production-director, security-monitor, stock-assistant, stock-predictor
  - supplier-tracker, team-tracker, training-optimizer, waste-analyzer
- Scheduling: Hourly/Daily/Weekly tick'ler
- Routing: Skill → aksiyon → doğru alıcıya bildirim

### 4.12 Modül Feature Flag Sistemi
- 31 modül flag'i (20 ana modül + 8 fabrika alt-modül + 3 dobody alt-modül)
- 3 davranış tipi: `always_on`, `fully_hidden`, `ui_hidden_data_continues`
- 4 seviyeli öncelik: branch+role > branch > global+role > global
- Parent-child hiyerarşisi (parent kapalıysa children da kapalı)
- Rol bazlı override desteği

### 4.13 Delegasyon Sistemi
- Modül seviyesinde rol delegasyonu (kalıcı veya geçici)
- Sadece admin ve ceo oluşturabilir
- Departman ve konu kategorileri

---

## 5. FRONTEND MİMARİSİ

### 5.1 Sayfa Organizasyonu
- **267 sayfa dosyası** — modüle göre klasörlerde organize
- "Mega-Page" pattern: URL parametreleri ile tab değişimi (örn: `operasyon-mega.tsx`, `akademi-mega.tsx`, `crm-mega.tsx`, `satinalma-mega.tsx`)
- Public sayfalar: `/login`, `/register`, `/forgot-password`, `/misafir-geri-bildirim/:token`
- Kiosk sayfaları: `/sube/kiosk`, `/fabrika/kiosk`, `/hq/kiosk`
- Lazy loading: Tüm sayfalar `lazy()` ile yüklenir

### 5.2 Layout Yapısı
- **Desktop:** Collapsible NavRail (sidebar) + AppHeader
- **Mobil:** Bottom Navigation (`BottomNav`)
- **Kiosk:** Standalone dashboard (sidebar/header yok)
- **Global Search:** `Ctrl+K` command palette
- **Breadcrumb Navigation:** Dinamik yol takibi
- **DobodyMiniBar:** Flow Mode üretkenlik arayüzü
- **GlobalAIAssistant:** Her yerden erişilebilir AI yardımcı
- **PushPermissionBanner:** Web Push izin istemi
- **OfflineBanner:** Çevrimdışı durum göstergesi

### 5.3 Tasarım Sistemi
- **Marka Renkleri:**
  - `--dospresso-navy`: `220 60% 18%` (Koyu mavi — sidebar)
  - `--dospresso-red`: `0 84% 52%` (Vurgu kırmızı — primary)
  - `--dospresso-blue`: `217 91% 60%` (İkincil mavi — accent)
- **Light/Dark mode** desteği (`.dark` CSS class, ThemeProvider)
- **Glassmorphism** efektleri (`--glass-bg`, `--glass-blur`)
- **Gradient'ler:** `.gradient-navy`, `.gradient-blue`, `.gradient-navy-blue`, `.gradient-red`
- **Tipografi:** CSS değişkenleri ile font scaling (`--font-scale`: small/medium/large)
- **Spacing:** Tutarlı padding/gap sistemi (`--spacing: 0.25rem`)
- **Border radius:** Küçük tutulur (`rounded-md` = 6px)
- **Elevation sistemi:** `hover-elevate`, `active-elevate-2`, `toggle-elevate` utility class'ları
- **Scrollbar:** `.scrollbar-modern` custom styling

### 5.4 Önemli Bileşenler
- `NavRail`: Collapsible sidebar navigasyonu (Shadcn Sidebar primitives kullanır)
- `AppHeader`: Üst navigasyon çubuğu
- `BottomNav`: Mobil alt navigasyon
- `ProtectedRoute`: Rol bazlı sayfa koruma
- `GlobalAIAssistant`: Her yerden erişilebilir AI yardımcı
- `QRScannerModal`: QR kod tarama
- `DobodyMiniBar`: Flow Mode üretkenlik arayüzü
- `GlobalSearch`: Ctrl+K command palette
- `InboxDialog`: Bildirim paneli
- `BreadcrumbNavigation`: Dinamik breadcrumb
- `LockedRecordDialog`: Kilitli kayıt uyarısı
- `ErrorBoundary`: Hata yakalama sınırı
- Rol bazlı dashboard'lar: `AdminDashboard`, `SubeDashboard`, `EmployeeDashboard`, `MerkezDashboard`, `CEOCommandCenter`, `CGOCommandCenter`, `HQDashboard`

---

## 6. KODLAMA KURALLARI VE KONVANSİYONLAR

### 6.1 Genel Kurallar
1. **TypeScript zorunlu** — Tüm dosyalar TypeScript
2. **Schema-first yaklaşım** — Yeni özellikler için önce `shared/schema.ts`'de model tanımla
3. **Drizzle-zod** — Insert schema'lar `createInsertSchema` ile oluşturulur, `.omit` ile auto-generated alanlar hariç tutulur
4. **API Validation** — Tüm request body'ler Zod ile validate edilir
5. **TanStack Query v5** — Sadece object form: `useQuery({ queryKey: ['key'] })`
6. **Default queryFn** — Query'ler kendi `queryFn` tanımlamaz, default fetcher kullanılır
7. **Cache invalidation** — Mutation sonrası `queryClient.invalidateQueries` zorunlu
8. **Hierarchical query keys** — `['/api/recipes', id]` formatında (template literal DEĞİL)
9. **apiRequest** — Mutation'lar `apiRequest` kullanır (POST/PATCH/DELETE)

### 6.2 UI Kuralları
1. **Shadcn bileşenlerini kullan** — Card, Button, Badge, Dialog, vb. için mevcut bileşenleri kullan
2. **Sidebar için Shadcn Sidebar** — `@/components/ui/sidebar` kullan, kendi sidebar'ını yazma
3. **hover-elevate / active-elevate-2** — Hover/active etkileşimleri için bu utility class'ları kullan
4. **Button/Badge'lere hover state ekleme** — Zaten built-in, ekstra hover class ekleme
5. **size="icon"** — İkon butonlarda h-/w- class ekleme
6. **data-testid** — Tüm etkileşimli ve veri gösteren elemanlara ekle: `{action}-{target}` veya `{type}-{content}-{id}`
7. **Rounded border kuralı** — Rounded elemanlara tek taraflı border ekleme (kötü görünür)
8. **Card nesting yasak** — Card içinde Card olmamalı
9. **text-primary kullanma** — Hero dışında metin için text-primary class kullanma
10. **Emoji kullanma** — Hiçbir yerde emoji yok, yerine Lucide ikonları kullan

### 6.3 CSS Değişken Formatı
```css
--my-var: 23 10% 23%;   /* H S% L% — hsl() SARMADAN */
```
Tailwind config'de referans:
```js
foreground: "hsl(var(--destructive-foreground) / <alpha-value>)"
```

### 6.4 Dosya ve Yapı Kuralları
- Mevcut yapıyı koru, gereksiz dosya oluşturma
- **ASLA değiştirme:** `server/vite.ts`, `vite.config.ts`, `package.json`, `drizzle.config.ts`
- **Import:** `@` prefix'li path'ler kullan (`@/components/ui/button`)
- **Frontend env:** `import.meta.env.VITE_*`
- **Backend env:** `process.env.*`
- Dosya sayısını minimize et, benzer bileşenleri tek dosyada birleştir

### 6.5 Veritabanı Kuralları
- **Soft Delete:** `deletedAt` alanı — kayıtları fiziksel olarak silme (istisnalar: sessions, tokens, cache)
  ```typescript
  await db.update(table).set({ isActive: false, deletedAt: new Date(), deletedBy: userId });
  ```
- **Data Lock:** Onaylanmış kayıtlar düzenlenemez (HTTP 423)
  - Kilitli tablolar: purchase_orders (7d), factory_production_outputs (3d), monthly_payroll (immediate), factory_quality_checks (onay), factory_shipments (teslimat), customer_feedback (immediate)
  - Değişiklik için `data_change_requests` akışı kullanılır
- **Transaction kullanımı:** Kritik yazma işlemleri transaction içinde
  - Zorunlu: factory_shipments, monthly_payroll, branch_inventory, data_change_requests, factory_production_outputs
- **Array kolonlar:** `.array()` metod olarak çağrılır: `text().array()` (wrapper fonksiyon DEĞİL)
- **Timestamps:** Her zaman timezone ile
- **Naming:** Tablo isimleri snake_case, kolon isimleri camelCase (Drizzle'da)

### 6.6 Auth Middleware Pattern
```typescript
router.get("/api/resource", isAuthenticated, async (req, res) => {
  const user = req.user as Express.User;  // veya req.user!
  const branchId = isHQRole(user.role as UserRoleType) ? req.query.branchId : user.branchId;
  // ...
});
```

### 6.7 Kiosk Endpoint Pattern
```typescript
router.post('/api/factory/kiosk/endpoint', isKioskAuthenticated, async (req, res) => {
  // isAuthenticated DEĞİL, isKioskAuthenticated kullanılır
});
```

### 6.8 Türkçe UI Kuralları
- Tüm kullanıcı arayüzü Türkçe
- Türkçe karakterler doğru kullanılmalı: ş, ç, ğ, ü, ö, ı, İ, Ş, Ç, Ğ, Ö, Ü
- ASCII yakınlaştırma kullanma ("Sube" yerine "Şube", "Musteri" yerine "Müşteri")
- İngilizce teknik terimler olduğu gibi bırakılabilir
- Hata mesajları da Türkçe: `{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }`

### 6.9 Dark Mode Kuralları
- Her yeni bileşen dark mode uyumlu olmalı
- Hardcoded renkler (`bg-white`, `text-black`) kullanılmamalı — kullanılırsa `dark:` varyantı ekle
- Semantic Shadcn token'ları tercih et: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`

---

## 7. MEVCUT DURUM VE TAMAMLANMIŞ İŞLER

### 7.1 Tamamlanmış Modüller
| Modül | Durum | Anahtar Dosyalar |
|-------|-------|-----------------|
| Operations (Dashboard, Tasks, Checklists, Equipment, Lost & Found) | Tamamlandı | routes/tasks.ts, routes/equipment.ts |
| HR & Shifts (Staff, Shifts, Attendance, Payroll) | Tamamlandı | routes/hr.ts, routes/shifts.ts, routes/pdks.ts |
| Factory (Dashboard, Kiosk, QC, Stations, Compliance, Shipments) | Tamamlandı | routes/factory.ts (5702 satır) |
| Academy V3 (Gamification, Badges, Leaderboard, Learning Paths, AI) | Tamamlandı | routes/academy-v3.ts |
| Audit & Analytics (Quality, Branch Inspection, Health Score, Food Safety) | Tamamlandı | routes/operations.ts, inspection-routes.ts |
| Finance & Procurement (Accounting, Satınalma, Inventory) | Tamamlandı | satinalma-routes.ts, financial-routes.ts |
| CRM (Dashboard, Feedback, Complaints, Campaigns, Analytics) | Tamamlandı | crm-routes.ts, routes/crm-iletisim.ts |
| İletişim Merkezi (Tickets, HQ Tasks, Broadcasts, SLA) | Tamamlandı | routes/crm-iletisim.ts |
| Kiosk System (Factory + Branch PIN auth, device passwords) | Tamamlandı | localAuth.ts, routes/factory.ts |
| Agent System (16 skills, scheduler, routing) | Tamamlandı | server/agent/ |
| Delegation System (module-level role delegation) | Tamamlandı | routes/delegation-routes.ts |
| Module Feature Flags (31 flags, 4-level priority) | Tamamlandı | routes/module-flags.ts |
| Franchise/Investor Management | Tamamlandı | routes/franchise-investors.ts |
| Webinar System | Tamamlandı | routes/academy-v3.ts |

### 7.2 Sprint Geçmişi (Sprint 27–34)
Toplam **34 görev** işlenmiş. Son tamamlanan işler:
- **CRM Sistemi:** Backend unified ticket, frontend, rol ayrımı, SLA iş saati hesaplama, tipografi iyileştirme, ticket çözme onay diyalogu, çalışan performans skoru
- **Akademi V3:** Ana sayfa yeniden tasarım, webinar takvimi, onboarding birleştirme, kalite gate düzeltmeleri
- **Kiosk Güvenlik:** Admin erişim sınırlama, PIN rol kontrolü, şifre hash düzeltmesi, oturum güvenliği (6 ayrı görevde iteratif çözüm)
- **Fabrika:** Schema + seed data, kiosk bugfix, dashboard hata düzeltmeleri
- **Altyapı:** Server scheduler optimizasyonu, responsive layout düzeltmesi, kod denetimi düzeltmeleri, login/şifre sıfırlama

### 7.3 Bilinen Sorunlar / Dikkat Edilmesi Gerekenler
1. **Radix UI versiyon çakışması:** `dispatcher.useState` crash'i — paket versiyonları kesinlikle sabitlenmeli (caret `^` kullanılmamalı), `package.json` overrides zorunlu
2. **Branch scoping:** HQ'dan şube verilerine erişirken `branchId` filtresi dikkatle uygulanmalı. HQ rollerinde branchId NULL olabilir.
3. **TanStack Query cache:** Mutation sonrası cache invalidation unutulursa eski veri gösterilir
4. **FK constraint hataları:** İlişkili tablolarda cascade veya null set dikkatli yönetilmeli
5. **Eşzamanlı oturum:** Kullanıcı başına 2 oturum limiti var
6. **Kiosk sessions in-memory:** Sunucu yeniden başlatılırsa kiosk oturumları kaybolur
7. **API yanıt formatı:** Tüm endpoint'ler dizi döndürmez — frontend'de normalleştirme gerekli
8. **Service Worker cache:** Frontend değişikliklerinde SW version bump gerekli

---

## 8. AI AGENT SİSTEMİ

### 8.1 Custom Skills (`.agents/skills/`)
| Skill | Amaç |
|-------|------|
| **dospresso-architecture** | Platform mimarisi referans belgesi (375 tablo, ~1326 endpoint, 27 rol) |
| **dospresso-debug-guide** | Yaygın hata ve çözüm prosedürleri (13 hata kategorisi) |
| **dospresso-quality-gate** | 15 maddelik kalite kontrol checklist'i (her kod değişikliği sonrası) |
| **dospresso-radix-safety** | Radix UI paket güvenliği (versiyon pinleme, override zorunluluğu) |
| **dospresso-sprint-planner** | Sprint planlama ve görev yazım kuralları |

### 8.2 Kalite Gate Kontrolleri (15 Madde)
1. Auth middleware her endpoint'te var mı?
2. Türkçe karakter doğru mu? (ASCII yakınlaştırma yok)
3. API çağrıları null-safe mi? (`.toFixed`, `.map`, `.filter` korumalı)
4. Drizzle ORM transaction kullanımı doğru mu?
5. Data lock uygulanmış mı?
6. Soft delete kullanılıyor mu? (Hard delete yok)
7. Dark mode uyumlu mu?
8. Rol erişimi doğru mu? (Menu + Permission + Route)
9. Endpoint'ler DB tabloları ile uyumlu mu?
10. TypeScript pattern'ler doğru mu? (`req.user` cast, hook sırası)
11. Kiosk endpoint'ler `isKioskAuthenticated` kullanıyor mu?
12. bcrypt ile şifre/PIN saklanıyor mu? (plaintext yok)
13. SLA kuralları tutarlı mı? (24 kural = 6 departman × 4 öncelik)
14. CRM endpoint'leri auth middleware'e sahip mi?
15. Kiosk rolleri doğru path'e yönleniyor mu?

### 8.3 Debug Rehberi Kategorileri
| # | Semptom | Çözüm Bölümü |
|---|---------|--------------|
| 1 | 401 Unauthorized | Auth middleware kontrolü |
| 2 | 403 Forbidden | Rol/Permission kontrolü |
| 3 | Stale UI data | TanStack Cache invalidation |
| 4 | Empty list | Branch scope filtresi |
| 5 | FK constraint error | İlişkili tablo kontrolleri |
| 6 | dispatcher.useState crash | Radix UI nested packages |
| 7 | HTTP 423 Locked | Data lock kuralları |
| 8 | SLA/schedule off | Timezone (Europe/Istanbul) |
| 9 | TypeScript req.user error | Cast pattern |
| 10 | Kiosk login fails | Kiosk auth checklist |
| 11 | SLA deadline wrong | Business hours config |
| 12 | Delegated module hidden | Delegation aktiflik kontrolü |
| 13 | Module flag issues | 4-level lookup + behavior type |

### 8.4 Yaygın Crash Pattern'leri
| Pattern | Kök Neden | Çözüm |
|---------|-----------|-------|
| `toFixed is not a function` | API string/null döndürür | `Number(value ?? 0).toFixed(1)` |
| `filtered.filter is not a function` | API `{data:[...]}` döndürür | `Array.isArray(data) ? data : (data?.data \|\| [])` |
| `Cannot read properties of undefined` | Optional chaining eksik | `data?.stats?.rating` |
| PostgreSQL COUNT string concat | `COUNT()` string döndürür | `Number()` ile sar |

---

## 9. ÇALIŞMA AKIŞI

### 9.1 Geliştirme
- `npm run dev` komutu ile çalışır (Express backend + Vite frontend aynı port'ta)
- Workflow adı: "Start application"
- Değişikliklerden sonra workflow otomatik yeniden başlar
- Vite proxy ayarlarını DEĞİŞTİRME — zaten yapılandırılmış

### 9.2 Entegrasyonlar
Kurulu entegrasyonlar:
- **OpenAI** — AI fonksiyonları (GPT-4o, Vision, Embeddings)
- **PostgreSQL Database** — Ana veritabanı (Neon serverless)
- **Object Storage** — Dosya depolama (AWS S3)
- **Log in with Replit** — Auth (kullanılmıyor, Passport.js local strategy aktif)

### 9.3 Paket Yönetimi
- Radix UI paketleri için EXACT versiyon pinleme zorunlu (caret `^` ASLA)
- `package.json` overrides bölümü kritik — silmeyin:
  ```json
  "overrides": {
    "@radix-ui/react-use-controllable-state": "1.1.1",
    "@radix-ui/react-primitive": "2.0.3",
    "@radix-ui/react-presence": "1.1.3",
    "@radix-ui/react-compose-refs": "1.1.2",
    "@radix-ui/react-context": "1.1.2",
    "@radix-ui/react-id": "1.1.1",
    "@radix-ui/react-use-callback-ref": "1.1.1",
    "@radix-ui/react-use-layout-effect": "1.1.1"
  }
  ```
- Yeni paket eklemeden önce `dospresso-radix-safety` skill'i kontrol edilmeli
- Her npm install sonrası nested package kontrolü:
  ```bash
  find node_modules/@radix-ui -mindepth 2 -name "node_modules" -type d 2>/dev/null
  ```

### 9.4 Sunucu Başlangıç Sırası
1. Express app oluştur
2. Session + Passport auth kur
3. `migrateKioskPasswords()` — plaintext kiosk şifrelerini hash'le
4. `seedSlaRules()` — SLA kurallarını seed'le
5. `seedModuleFlags()` — Modül flag'lerini seed'le
6. `initFactoryKioskMigrations()` — Fabrika kiosk migration'ları
7. `initOnboardingMigrations()` — Onboarding migration'ları
8. Route'ları kaydet
9. Scheduler'ı başlat

---

## 10. KRİTİK DOSYALAR REFERANSİ

| Dosya | İçerik | Satır |
|-------|--------|-------|
| `shared/schema.ts` | Tüm DB şeması, roller, izinler, tipler | 15,558 |
| `server/routes.ts` | Ana route kaydı — tüm modüllerin import noktası | 1,307 |
| `server/localAuth.ts` | Auth stratejileri, login/logout, kiosk auth, oturum güvenliği | 525 |
| `server/permission-service.ts` | Dinamik izin çözümlemesi ve kapsam yönetimi | 308 |
| `server/menu-service.ts` | Rol bazlı dinamik menü oluşturma (MENU_BLUEPRINT) | 870 |
| `server/routes/factory.ts` | Fabrika tüm endpoint'leri (üretim, kiosk, QC, sevkiyat) | 5,702 |
| `server/services/business-hours.ts` | SLA iş saati hesaplama | - |
| `server/services/ticket-routing-engine.ts` | Ticket yönlendirme ve SLA breach kontrolü | - |
| `server/services/module-flag-service.ts` | Modül feature flag servisi | - |
| `server/scheduler-manager.ts` | Agent scheduler (hourly/daily/weekly) | - |
| `server/seed-sla-rules.ts` | SLA kural seed'leri (24 kural) | - |
| `server/seed-module-flags.ts` | Modül flag seed'leri (31 flag) | - |
| `client/src/App.tsx` | Frontend routing, layout, provider yapısı | 641 |
| `client/src/index.css` | CSS değişkenleri, tema, utility class'lar | 627 |
| `client/src/contexts/theme-context.tsx` | Dark/Light mode yönetimi | - |
| `client/src/components/protected-route.tsx` | Frontend rol koruma | - |
| `client/src/components/nav-rail.tsx` | Sidebar navigasyonu | - |
| `client/src/hooks/useAuth.ts` | Auth hook | - |
| `client/src/hooks/use-module-flags.ts` | Module flag hook | - |
| `client/src/lib/queryClient.ts` | TanStack Query client ve apiRequest | - |
| `client/src/lib/role-routes.ts` | Rol bazlı home path tanımları | - |
| `tailwind.config.ts` | Tailwind tema genişletmeleri | 107 |

---

## 11. KRİTİK İŞ MANTIĞI ZİNCİRLERİ

### Fabrika → Şube Stok:
```
Üretim → QC (2 aşamalı) → LOT → Sevkiyat → Şube Envanter
```
- Tüm durum değişiklikleri transaction + FOR UPDATE kullanır
- FIFO LOT ataması son kullanma tarihine göre

### Vardiya → PDKS → Bordro:
```
Vardiya planlama → Kiosk check-in/out → PDKS kayıtları → Bordro hesaplama
```
- Günlük = aylık/30, devamsız günler kesilir, mesai ×1.5

### Composite Score:
```
Checklist + Training + Attendance + Feedback + Tasks → Branch Health Score
```

### Ticket → SLA → Escalation:
```
Ticket oluştur → SLA deadline hesapla (iş saati bazlı) → Breach kontrolü → Escalation
```

---

## 12. YENİ AI ASISTANIN BİLMESİ GEREKEN ÖNCELİKLİ KONULAR

1. **Schema-first:** Her yeni özellikte önce `shared/schema.ts`'de tablo ve tipleri tanımla
2. **Mevcut yapıyı koru:** 375 tablo, 267 sayfa, 1326+ endpoint — mevcut pattern'leri takip et
3. **Rol bazlı düşün:** Her endpoint ve sayfa için hangi rollerin erişebileceğini belirle
4. **Türkçe UI:** Kullanıcı arayüzü Türkçe, Türkçe karakterlere dikkat
5. **Radix dikkat:** Paket güncellemelerinde `dospresso-radix-safety` skill'ini oku
6. **Kalite gate:** Her değişiklik sonrası 15 maddelik kontrol listesini uygula
7. **Soft delete + Data lock:** Silme işlemlerinde `deletedAt`, onaylanmış kayıtlar kilitli
8. **Cache yönetimi:** TanStack Query mutation sonrası invalidation zorunlu
9. **Dark mode:** Her yeni bileşen dark mode uyumlu olmalı
10. **Test ID:** Tüm etkileşimli elemanlara `data-testid` ekle
11. **Transaction:** Kritik yazma işlemlerinde `db.transaction()` kullan
12. **API yanıt normalleştirme:** Array olmayan yanıtları kontrol et
13. **Branch scope:** HQ rolleri (branchId=NULL) ve branch rolleri için filtreleme farklı
14. **Kiosk endpoint'ler:** `isKioskAuthenticated` kullan, `isAuthenticated` DEĞİL
15. **Module flags:** Yeni modüller eklenirken flag seed'i de ekle
16. **Skills'leri oku:** İşe başlamadan önce `.agents/skills/` altındaki 5 skill dosyasını oku

---

## 13. HIZLI REFERANS — EN SIK KULLANILAN PATTERN'LER

### Yeni Tablo Ekleme
```typescript
// 1. shared/schema.ts'e tablo ekle
export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").default(true),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// 2. Insert schema
export const insertMyTableSchema = createInsertSchema(myTable).omit({ id: true, createdAt: true });
export type InsertMyTable = z.infer<typeof insertMyTableSchema>;
export type MyTable = typeof myTable.$inferSelect;
```

### Yeni API Endpoint
```typescript
// server/routes/my-route.ts
import { Router } from "express";
import { isAuthenticated } from "../localAuth";
import { db } from "../db";
import { myTable, insertMyTableSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/api/my-resource", isAuthenticated, async (req, res) => {
  try {
    const user = req.user as Express.User;
    const data = await db.select().from(myTable).where(eq(myTable.isActive, true));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Veriler yüklenirken bir hata oluştu." });
  }
});

export default router;
```

### Yeni Frontend Sayfa
```typescript
// 1. client/src/pages/my-page.tsx oluştur
// 2. client/src/App.tsx'e lazy import + route ekle
const MyPage = lazy(() => import("@/pages/my-page"));
// <Route path="/my-page" component={MyPage} />
// 3. server/menu-service.ts'e menü item ekle (gerekiyorsa)
```

### TanStack Query Kullanımı
```typescript
// Okuma
const { data, isLoading } = useQuery<MyType[]>({
  queryKey: ['/api/my-resource'],
});

// Yazma
const mutation = useMutation({
  mutationFn: async (values: InsertMyType) => {
    await apiRequest('POST', '/api/my-resource', values);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['/api/my-resource'] });
    toast({ title: "Başarılı", description: "Kayıt oluşturuldu." });
  },
});
```
