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
| F02 | YETKİ | `server/routes/hq-summary.ts` `isHQRole` filtresi `yatirimci_hq` için bazı endpoint'lerde eksik olabilir | Yatırımcı 403 |
| F03 | OPS | `/api/agent/escalations/:id/resolve` sadece Admin/CEO/CGO; Coach kendi domain'inde resolve edemiyor | Eskalasyon darboğazı |
| F04 | HESAP-MANTIK | CEO `financialData` `/api/branch-financial-summary` veri yoksa "Girilmemiş: X şube" gösteriyor ama toplam KPI eksik şubeleri çıkarmadan yayınlıyor | CEO yanıltıcı bordro/ciro toplamı görüyor |

### A2. Şube — Müdür / Supervisor / Barista / Buddy / Stajyer

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F05 | YETKİ | `operations.ts` L2065/L2092 PUT/DELETE sadece `isHQRole` → şube müdürü kendi şubesinin denetim şablonunu düzenleyemiyor | Müdür operasyonel regression |
| F06 | YETKİ-SIZINTI | `sube/siparis-stok.tsx` API'sı role değil `branchId` varlığına dayanıyor → Barista doğrudan API çağırırsa sipariş geçebilir | Yetki bypass riski (orta) |
| F07 | HESAP-MANTIK | `operations.ts` L2455 `sectionWeight` default = 20; şablonda ağırlık yoksa puanlama dengesizleşir | Yanlış denetim skoru |
| F08 | UX | Bar Buddy / Supervisor Buddy "Eğitim/Vardiyam" gizli; dokümantasyon yok | Kullanıcı şikayet beklentisi |
| F09 | OPS | CAPA otomatiği var (kritik fail → CAPA), ama CAPA yaşam döngüsü (kapanış SLA, gecikme alarmı) ayrıca incelenmeli | İzleme açığı |

### A3. PDKS / Vardiya / Bordro Köprüsü

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F10 | KRİTİK-VERİ | `pdks-daily-summary-sync.ts` L94 `notes='PILOT_PRE_DAY1_TEST_2026_04_29'` etiketli kayıtları HARİÇ tutuyor → 42 eksik kayıt buradan gelmiş olabilir | Pilot test verisi sessizce kayboluyor |
| F11 | KRİTİK-TZ | Sync `Europe/Istanbul` cast yapıyor; `workDate` string vs UTC timestamp tutarsızlığında kayıt eksilir | Gece-yarısı vardiyaları kaybolur |
| F12 | KRİTİK-FK | `shift_attendance` `shift_id` zorunlu; kiosk swipe varken planlanmış shift yoksa `pdks_daily_summary`'ye toplanmaz | Plansız mesai bordroya yansımaz |
| F13 | YETKİ | `pdks.ts` L13 `canManagePdks` direkt rol string check; granüler `hasPermission` bypass ediliyor | Tutarsız RBAC |
| F14 | HESAP-MANTIK | `pdks-engine.ts` `classifyDay` 30dk altı mesaiyi 0'a yuvarlar | İşçi mesai kaybı (yıl sonu birikimi) |
| F15 | HESAP-MANTIK | Geç gelme eşiği global hardcoded (LATE_THRESHOLD=15) ama `branch_kiosk_settings.lateToleranceMinutes` var → hangi öncelikli? | Çelişen iki kaynak |

### A4. Akademi v3

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F16 | YETKİ | `module-content-routes.ts` `isAdminRole` sadece admin+ceo; Coach/Trainer module-content yazamaz (Task #299 ile örtüşür) | İçerik üretim darboğazı |
| F17 | KIRIK-API | `akademi-hq/ModullerTab.tsx` `/api/training/modules` çağırıyor; ana academy route'larda yok, `training-program-routes.ts` veya `mega-module-routes.ts`'te aranmalı | 404/silent fail |
| F18 | EKSİK-IMPL | `CareerTab` "Pratik" ve "Onay" gate'leri statik/placeholder; supervisor onay ekranı entegre değil | Kariyer kademe geçişi yarım |
| F19 | UX-AI | `Mr. Dobody` `CareerTab` önerileri kural-bazlı; "Acil Eğitim" uyarısı sadece HomeTab'da | AI kapsamı dar |

### A5. Fabrika Reçete / Alerjen / Kalite

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F20 | HESAP-MANTIK | `factory-recipe-cost-service.ts` `lineCost` birim eşleşmezse `null` döner, hata fırlatmaz → maliyet sessizce eksik raporlanır | Fiyatlandırma hatası |
| F21 | VERİ-INT | `factoryRecipes.category` (string) vs `factoryProducts.category` (enum) — sync yok | Reçete-ürün eşleşme bozulur |
| F22 | EKSİK-IMPL | `factory-f2.ts` L131-132 stok seviyesi `SQL 0` stub (kolon eksikti) → gerçek envanter göstermez | Yanlış üretim planlama |
| F23 | UX-AKIS | Reçete onayları silo: gramaj, besin, maliyet ayrı; "Production Ready" tek sign-off yok | Hatalı sürüm prodüksiyona girebilir |
| F24 | UYUMLULUK | Reçete versiyon değişti → eski etiket "revize gerekli" otomasyonu YOK (regex hit yok) | Etiket-içerik uyuşmazlığı, gıda mevzuat riski |
| F25 | DRAFT-LBL | Onaysız reçete → `isDraft:true` etiket basılabiliyor (iyi); ama Lot tekrar engeli yetkili override'a açık (Task #199) | Lot tekrar olası |

### A6. Finansal — Bordro / Satınalma / Cari / CEO Finans

| # | Sınıf | Bulgu | Etki |
|---|---|---|---|
| F26 | HESAP-MANTIK | `payroll-calculation-service.ts` AGI = `minWageTaxable * 0.15` basit formül → mevzuat asgari ücret kadar gelir vergisi muafiyeti farklı | Net maaş hatası |
| F27 | VERİ-SESSİZ | `getPositionSalary` null dönerse hesaplama sessizce duruyor | Bordro üretilmez, alarm yok |
| F28 | KRİTİK-RACE | `satinalma-routes.ts` L164-207 stok güncelleme atomic değil (read-modify-write); eşzamanlı POS+manuel sayım override yapar | Stok yanlış |
| F29 | HARDCODE | KDV %18 default (`satinalma-routes.ts` L540); %1/%10 gıda kalemleri yanlış işlenir | KDV beyanname hatası |
| F30 | HARDCODE | Fabrika saatlik ücreti 205 TL hardcoded; `factory_cost_settings`'den okunmalı | Maliyet sapması |
| F31 | DÖVİZ | Maliyet hesabında döviz kuru handling yok; tüm TRY varsayımı | İthal hammadde yanlış maliyet |
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
- **F34** → MUHASEBE rolü için dashboard alias veya yeni route.

### B4. Veritabanı Drift
- 13 eksik tablo + 83 index + 47 FK kapatıldı (Task #255).
- **42 kolon tipi/nullability drift hâlâ açık (kapsam dışı bırakılmış).**
- **F35** → Plan mode + isolated agent ile kalan 42 drift kapatılmalı.

### B5. NFC PIN Seed Durumu
- Tablolar mevcut (`branch_staff_pins`, `factory_staff_pins`, `hq_staff_pins`).
- **F36** → Pilot Day-1 öncesi 372 kullanıcının PIN seed kapsama oranı SQL ile kontrol edilmeli (read-only, plan mode).

