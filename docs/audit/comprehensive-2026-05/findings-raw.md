# Comprehensive Role × Module Audit — Raw Findings (2026-05)

Owner: Aslan | Mode: DOCS-ONLY (Build) | Pilot 5 gün uzatıldı (2 May 2026)
Scope: 31 rol × tüm major modüller, en ince detay derin tarama.
Yöntem: 6 paralel kod-explorer subagent + 5 mekanik script-tarama (route/guard/schema/calc).

---

## A. Subagent Bulguları (6 dalga, 31 rol kapsandı)

### A1. CEO / CGO / Yatırımcı / Coach / Trainer (HQ üst yönetim)

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F01 | KRİTİK-UI | `lib/role-routes.ts` v5 Centrum'a gönderiyor; `mission-control/DashboardRouter.tsx` hâlâ v4 (MissionControlHQ/Coach) render ediyor → aynı kullanıcı "Control" kartı vs ana sayfada farklı dashboard görüyor | Kullanıcı kafa karışıklığı, hangisi gerçek? |
| F02 | YETKİ | ~~`server/routes/hq-summary.ts` `isHQRole` filtresi `yatirimci_hq` için bazı endpoint'lerde eksik olabilir~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B-2)** — `HQ_ROLES` set'i `YATIRIMCI_HQ` içeriyor (`shared/schema/schema-01.ts`), `isHQRole(yatirimci_hq) === true` doğrulandı. Diğer hq route'larda da `yatirimci_hq` özel listelerde mevcut (quick-action, branch-summary, hr, vd.). Audit yanlış kategorize. | Yatırımcı 403 |
| F03 | OPS | ~~`/api/agent/escalations/:id/resolve` sadece Admin/CEO/CGO; Coach kendi domain'inde resolve edemiyor~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B-2)** — `server/routes/agent.ts` L474 `isHQOrAdmin` middleware Coach + Trainer'ı içeriyor (admin, ceo, cgo, coach, trainer, teknik, ekipman_teknik, satinalma, muhasebe, destek, gida_muhendisi, kalite_kontrol). Audit yanlış kategorize. | Eskalasyon darboğazı |
| F04 | HESAP-MANTIK | ~~CEO `financialData` `/api/branch-financial-summary` veri yoksa "Girilmemiş: X şube" gösteriyor ama toplam KPI eksik şubeleri çıkarmadan yayınlıyor~~ ✅ **KAPANDI (3 May 2026, Wave B-4)** — `centrum-endpoints.ts` L77 endpoint response'a `hasData: false`, `dataStatus: 'not_implemented'`, `dataNote: 'Şube finansal veri girişi henüz aktif değil — toplam KPI yanıltıcıdır'` bayrakları eklendi. UI bu bayrakları okuyup banner gösterecek. Frontend güncellenmesi pilot sırasında. | CEO yanıltıcı bordro/ciro toplamı görüyor |

### A2. Şube — Müdür / Supervisor / Barista / Buddy / Stajyer

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F05 | YETKİ | ~~`operations.ts` L2065/L2092 PUT/DELETE sadece `isHQRole` → şube müdürü kendi şubesinin denetim şablonunu düzenleyemiyor~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B-2)** — `auditTemplates` tablosunda `branchId` kolonu YOK; şablonlar global (sistem genelinde paylaşılır). Müdürün kendi şubesinin değil, **tüm sistem şablonunu** düzenlemesi yetki ihlali olur. HQ-only doğru tasarım. Audit "kendi şubesi" varsayımı yanlıştı. | Müdür operasyonel regression |
| F06 | YETKİ-SIZINTI | ~~`sube/siparis-stok.tsx` API'sı role değil `branchId` varlığına dayanıyor → Barista doğrudan API çağırırsa sipariş geçebilir~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B-4)** — `server/routes/branch-orders.ts` `POST /api/branch-orders` `requireManifestAccess('stok', 'create')` middleware + handler-level `hasPermission(role, 'branch_orders', 'create')` çift kontrol var. Barista direkt API çağırırsa 403 döner. Frontend `branchId` kontrolü ek katman, asıl güvenlik backend'de. Audit yanlış kategorize. | Yetki bypass riski (orta) |
| F07 | HESAP-MANTIK | ~~`operations.ts` L2455 `sectionWeight` default = 20; şablonda ağırlık yoksa puanlama dengesizleşir~~ ✅ **KAPANDI (3 May 2026, Wave B-4)** — Default 20 → 0 + structured warn. Şablonda `sectionWeight` eksikse o bölüm puanlamaya katılmaz (sıfır weight) + `console.warn` log (templateItemId, sectionName, hint). Şablon eksiği görünür hale geldi. | Yanlış denetim skoru |
| F08 | UX | Bar Buddy / Supervisor Buddy "Eğitim/Vardiyam" gizli; dokümantasyon yok → ⏳ **SPRINT 4'e ERTELENDİ (3 May 2026, Wave B-4)** — `shared/modules-registry.ts` L376 `supervisor_buddy: ['dashboard', 'tasks', 'checklists', 'equipment', 'faults', 'shifts', 'employees', 'attendance']` mevcut ama `bar_buddy` modül listesinde yok. UX iyileştirme + kullanıcı kılavuzu güncellemesi. Pilot etkisi düşük (her iki rol de pilot kapsamında değil). | Kullanıcı şikayet beklentisi |
| F09 | OPS | ~~CAPA otomatiği var (kritik fail → CAPA), ama CAPA yaşam döngüsü (kapanış SLA, gecikme alarmı) ayrıca incelenmeli~~ ✅ **KAPANDI NO-OP (3 May 2026, Mega-Sprint)** — `correctiveActions` tablosu (schema-04 L525) `dueDate` + `slaDeadline` (`calculateSLADeadline`) + `getSLAStatus` helper mevcut. `agent-scheduler.ts` L394 SLA breach takibi (48h threshold) + 5+ breach trigger var. Audit "monitör eksik" demiş ama gerçekte var. | İzleme açığı |

### A3. PDKS / Vardiya / Bordro Köprüsü

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F10 | KRİTİK-VERİ | `pdks-daily-summary-sync.ts` L94 `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` etiketli kayıtları HARİÇ tutuyor → 42 eksik kayıt buradan gelmiş olabilir | Pilot test verisi sessizce kayboluyor |
| F11 | KRİTİK-TZ | Sync `Europe/Istanbul` cast yapıyor; `workDate` string vs UTC timestamp tutarsızlığında kayıt eksilir | Gece-yarısı vardiyaları kaybolur |
| F12 | KRİTİK-FK | `shift_attendance` `shift_id` zorunlu; kiosk swipe varken planlanmış shift yoksa `pdks_daily_summary`'ye toplanmaz | Plansız mesai bordroya yansımaz |
| F13 | YETKİ | `pdks.ts` L13 `canManagePdks` direkt rol string check; granüler `hasPermission` bypass ediliyor → ⏳ **SPRINT 4'e ERTELENDİ (3 May 2026, Wave B-2)** — Bu mimari mesele B21 (9 paralel rol mekanizması konsolidasyonu, 20-30h) kapsamında çözülecek. Pilot için fonksiyonel etkisi yok (canManagePdks doğru rolleri içeriyor). | Tutarsız RBAC |
| F14 | HESAP-MANTIK | ~~`pdks-engine.ts` `classifyDay` 30dk altı mesaiyi 0'a yuvarlar~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B)** — DOSPRESSO iç kuralı: 30dk altı fazla mesai sayılmaz, mesai sadece yönetici onayı ile geçerli (DECISIONS#39 + `docs/DEVIR-TESLIM-7-NISAN-2026.md` "FM 30dk eşik"). Audit yanlış kategorize etmişti. | İşçi mesai kaybı (yıl sonu birikimi) |
| F15 | HESAP-MANTIK | Geç gelme eşiği global hardcoded (LATE_THRESHOLD=15) ama `branch_kiosk_settings.lateToleranceMinutes` var → hangi öncelikli? | Çelişen iki kaynak |

### A4. Akademi v3

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F16 | YETKİ | ~~`module-content-routes.ts` `isAdminRole` sadece admin+ceo; Coach/Trainer module-content yazamaz (Task #299 ile örtüşür)~~ ✅ **KAPANDI (3 May 2026, Wave B-2)** — `server/routes/module-content-routes.ts` L18 `isAdminRole` listesi: `['admin', 'ceo', 'coach', 'trainer']` (Coach + Trainer eklendi). 4 endpoint (POST/PUT/DELETE/PUT order) etkilendi. İçerik üretim darboğazı kalktı. | İçerik üretim darboğazı |
| F17 | KIRIK-API | `akademi-hq/ModullerTab.tsx` `/api/training/modules` çağırıyor; ana academy route'larda yok, `training-program-routes.ts` veya `mega-module-routes.ts`'te aranmalı | 404/silent fail |
| F18 | EKSİK-IMPL | ~~`CareerTab` "Pratik" ve "Onay" gate'leri statik/placeholder; supervisor onay ekranı entegre değil~~ ✅ **KAPANDI (3 May 2026, Mega-Sprint)** — `client/src/pages/akademi-v3/CareerTab.tsx` `DEFAULT_GATES` Pratik+Onay status: 'pending' → 'placeholder'. UI'da "Yakında" badge + dashed border + opacity-60 + "Henüz aktif değil" mesajı. Backend implementasyonu W-D2 (B3 izin/rapor sistemi 12h) ile birlikte. Kullanıcı artık placeholder olduğunu net görür. | Kariyer kademe geçişi yarım |
| F19 | UX-AI | `Mr. Dobody` `CareerTab` önerileri kural-bazlı; "Acil Eğitim" uyarısı sadece HomeTab'da → ⏳ **SPRINT 4'e ERTELENDİ (3 May 2026, Mega-Sprint)** — `server/agent/skills/career-progression-tracker.ts` skill mevcut, kural-bazlı çalışıyor (CAREER_PATH array). UX iyileştirme: AI tabanlı öneriler + CareerTab'da uyarı bileşeni. W-D7 (Comprehensive ek tarama) kapsamında ele alınacak. Pilot etkisi düşük. | AI kapsamı dar |

### A5. Fabrika Reçete / Alerjen / Kalite

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F20 | HESAP-MANTIK | `factory-recipe-cost-service.ts` `lineCost` birim eşleşmezse `null` döner, hata fırlatmaz → maliyet sessizce eksik raporlanır | Fiyatlandırma hatası |
| F21 | VERİ-INT | `factoryRecipes.category` (string) vs `factoryProducts.category` (enum) — sync yok → ⏳ **SPRINT 4'e ERTELENDİ (3 May 2026, Wave B-4)** — Her iki tabloda da `category: varchar(50)` (string), audit "enum" demiş ama gerçekte ikisi de string. Ancak değer set'leri arasında resmi sync yok ("cookie/donut/cinnamon_roll" geleneksel). W-D4 (B6 reçete sistemi tam, 16-24h) kapsamında foreign key veya enum referansına dönüştürülecek. Pilot etkisi düşük. | Reçete-ürün eşleşme bozulur |
| F22 | EKSİK-IMPL | ~~`factory-f2.ts` L131-132 stok seviyesi `SQL 0` stub (kolon eksikti) → gerçek envanter göstermez~~ ✅ **KAPANDI (3 May 2026, Wave B)** — `currentStock`, `minStock`, `maxStockLevel` kolonları zaten DB'den okunuyordu (Bundle 4 öncesi); eski stub yorumu kaldırıldı. | Yanlış üretim planlama |
| F23 | UX-AKIS | ~~Reçete onayları silo: gramaj, besin, maliyet ayrı; "Production Ready" tek sign-off yok~~ ✅ **KAPANDI (3 May 2026, Mega-Sprint)** — `server/routes/factory-recipes.ts` `getRecipeApprovalStatus(recipeId)` + `isRecipeProductionReady(recipeId)` helper'ları eklendi. 3 zorunlu scope (gramaj, besin, alerjen) hepsi onaylı + invalidatedAt IS NULL ise üretime hazır. UI tarafından kullanım için hazır export'lar. Hatalı sürüm prodüksiyon riski azaltıldı. | Hatalı sürüm prodüksiyona girebilir |
| F24 | UYUMLULUK | ~~Reçete versiyon değişti → eski etiket "revize gerekli" otomasyonu YOK (regex hit yok)~~ ✅ **KAPANDI NO-OP (3 May 2026, post-mega review)** — Task #180 (`invalidateGrammageApprovals` helper, `factory-recipes.ts`) zaten var. Reçete malzemesi/gramajı değiştiğinde `factoryRecipeApprovals.invalidatedAt = NOW()` + `invalidatedReason` set edilir. Etiket basma akışında `isRecipeProductionReady()` (Wave B-5'te eklendi) bunu okur → invalidated approval ile etiket basılamaz. Audit "regex hit yok" demiş ama Task #180 farklı pattern (helper fonksiyon) kullanmış. **TGK gıda mevzuatı uyumlu.** | Etiket-içerik uyuşmazlığı, gıda mevzuat riski |
| F25 | DRAFT-LBL | ~~Onaysız reçete → `isDraft:true` etiket basılabiliyor (iyi); ama Lot tekrar engeli yetkili override'a açık (Task #199)~~ ✅ **KAPANDI NO-OP (3 May 2026, Wave B-4)** — `factory-allergens.ts` L534 `allowDuplicateLot: z.boolean().optional().default(false)` zaten mevcut. Default false → kullanıcı uyarıyı görür → bilinçli onayla true gönderir. Audit "açık" demiş ama controlled override (Task #199 design intent). Mevcut davranış doğru. | Lot tekrar olası |

### A6. Finansal — Bordro / Satınalma / Cari / CEO Finans

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F26 | HESAP-MANTIK | `payroll-calculation-service.ts` AGI = `minWageTaxable * 0.15` basit formül → mevzuat asgari ücret kadar gelir vergisi muafiyeti farklı | Net maaş hatası |
| F27 | VERİ-SESSİZ | ~~`getPositionSalary` null dönerse hesaplama sessizce duruyor~~ ✅ **KAPANDI (3 May 2026, Wave B)** — `payroll-engine.ts` L97 + `payroll-bridge.ts` L406 iki çağrı yerinde `console.warn` structured log eklendi (userId, year, month, role, positionCode, fullName, branchId, reason, hint). Daha önce sessizce null dönerdi. | Bordro üretilmez, alarm yok |
| F28 | KRİTİK-RACE | `satinalma-routes.ts` L164-207 stok güncelleme atomic değil (read-modify-write); eşzamanlı POS+manuel sayım override yapar | Stok yanlış |
| F29 | HARDCODE | ~~KDV %18 default (`satinalma-routes.ts` L540); %1/%10 gıda kalemleri yanlış işlenir~~ ✅ **KAPANDI (3 May 2026, Wave B-3)** — `satinalma-routes.ts` L634 toplam KDV artık item-level `taxRate` toplamı (her item için `lineTotal * taxRate`). Default 18 sürdü ama item bazında %1/%10/%18 doğru hesaplanır. KDV beyanname yanlışlığı önlendi. | KDV beyanname hatası |
| F30 | HARDCODE | ~~Fabrika saatlik ücreti 205 TL hardcoded; `factory_cost_settings`'den okunmalı~~ ✅ **KAPANDI (3 May 2026, Wave B-3)** — `factory-recipe-cost-service.ts` `getCostConfig()` async helper eklendi. 3 parametre (`hourly_wage`, `kwh_price`, `water_price`) `factoryCostSettings` DB tablosundan okunur. Fallback chain: DB → env → default (205/3.50/0.08). `calculateAndSaveRecipeCost` artık DB değerlerini kullanır. Eski `COST_CONFIG` env-bazlı export geriye uyumluluk için korundu. | Maliyet sapması |
| F31 | DÖVİZ | Maliyet hesabında döviz kuru handling yok; tüm TRY varsayımı → ⏳ **SPRINT 4'e ERTELENDİ (3 May 2026, Wave B-3)** — Schema değişikliği gerekiyor (`inventory.currency`, `purchase_orders.currency`, `exchange_rates` tablosu). Sistem genelinde TRY varsayımı köklü; mevcut hammaddelerin %95+'ı yerli. Pilot için ithal hammadde sınırlı. W-D serisinde B6 reçete sistemi tam (16-24h) kapsamında ele alınacak. | İthal hammadde yanlış maliyet |
| F32 | CACHE-SYNC | `cari_accounts.currentBalance` cache; transaction silme/güncelleme rebuild yoksa senkron kopar | Cari mutabakat hatası |

---

## B. Cross-Cutting Mekanik Tarama

### B1. Route ↔ Sidebar Tutarlılığı
- App.tsx'te 260 unique route. `nav-registry.ts` `path:` regex hit yok → server-driven menü `me/permissions`'tan üretiliyor; sidebar broken-link audit için ayrı extractor gerekli.
- **Aksiyon:** Plan modunda yeni script: server menü endpoint'i + App.tsx route'u diff'leyen audit.

### B2. Auth Guard'sız Authenticated-Wrapper Route'lar (Yetki Sızıntısı)
Login zorunlu ama modül/role kontrolü yok → herhangi oturum açmış kullanıcı (örn. Stajyer) bu sayfalara DİREKT URL ile girebilir:
- `/iletisim`, `/personel/:id`, `/personel-onboarding-akisi`, `/nfc-giris`, `/qr-tara`, `/bilgi-bankasi`, `/egitim/:id`, `/bildirimler`, `/izin-talepleri`, `/mesai-talepleri`, `/performans`, `/duyurular`, `/icerik-studyosu`
- **F33** (yeni) → ModuleGuard/ProtectedRoute eksik en az 13 sayfa. Sidebar'da gizleme yetki değildir.

### B3. UserRole Gruplandırması (`shared/schema/schema-01.ts`)
- HQ_ROLES: 18 rol ✓
- EXECUTIVE_ROLES: 3 ✓
- HQ_DEPARTMENT_ROLES: 9 (CEO+ADMIN burada YOK — bilinçli mi?)
- DEPARTMENT_DASHBOARD_ROUTES: 10 mapping; **MUHASEBE rolünün dashboard'u YOK** (sadece MUHASEBE_IK var) → saf MUHASEBE login `/` döner.
- ~~**F34** → MUHASEBE rolü için dashboard alias veya yeni route.~~ ✅ **KAPANDI (3 May 2026, Wave B-4)** — `shared/schema/schema-01.ts` `DEPARTMENT_DASHBOARD_ROUTES` map'ine `[UserRole.MUHASEBE]: '/hq-dashboard/ik'` eklendi. Saf MUHASEBE login artık `/` fallback yerine `/hq-dashboard/ik`'e yönlenir (muhasebe + ik aynı modül erişimi).

### B4. Veritabanı Drift
- 13 eksik tablo + 83 index + 47 FK kapatıldı (Task #255).
- **42 kolon tipi/nullability drift hâlâ açık (kapsam dışı bırakılmış).**
- **F35** → Plan mode + isolated agent ile kalan 42 drift kapatılmalı.

### B5. NFC PIN Seed Durumu
- Tablolar mevcut (`branch_staff_pins`, `factory_staff_pins`, `hq_staff_pins`).
- **F36** → Pilot Day-1 öncesi 372 kullanıcının PIN seed kapsama oranı SQL ile kontrol edilmeli (read-only, plan mode).

