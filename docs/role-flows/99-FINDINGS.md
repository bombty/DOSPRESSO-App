# 99 — Bulgular (FINDINGS)
**Üretim Tarihi**: 2026-04-18  
**Kapsam**: 31 rol × 80+ modül × 250 route taraması — manuel + algoritmik gap detection.  
**Toplam Bulgu**: 42 (5 kritik + 12 yüksek + 15 orta + 10 düşük)

**Format**: Her bulgu **File:Line** referansı, **Tekrar Üretim Adımları (Repro)** ve **Önerilen Düzeltme (Fix)** içerir.

---

## KRİTİK (5)

### F01 — Module Flags Disabled Audit _(Pilot Hazırlık)_

**Konum**: `shared/schema/schema-08.ts:moduleFlags + DB seed`

**Açıklama**: 13 modül `module_flags.is_enabled=false` global: delegasyon, dobody.flow, iletisim_merkezi, fabrika.hammadde, fabrika.kalite, fabrika.kavurma, fabrika.sayim, fabrika.sevkiyat, fabrika.siparis, fabrika.stok, stok, dobody.chat, checklist (branch).

**Tekrar Üretim Adımları**:
1) `SELECT key, scope, is_enabled FROM module_flags WHERE is_enabled=false;` 2) Pilot kullanıcı login → menü kaybolan modül. 3) /fabrika/stok-merkezi gidip 404/access-denied gör.

**Önerilen Düzeltme**:
Pilot öncesi her flag'in legacy mi gerçek devre dışı mı doğrula. Gerekenleri `UPDATE module_flags SET is_enabled=true WHERE key IN (...)` ile aç. Naming çakışmalarını migration ile temizle.

---

### F02 — Fabrika Naming Çakışması _(Schema Drift)_

**Konum**: `shared/schema/schema-08.ts + DB module_flags`

**Açıklama**: `fabrika.stok` (disabled) vs `fabrika.production` (enabled), `fabrika.sayim` (disabled) vs `fabrika.haccp` (enabled). İki naming şeması paralel.

**Tekrar Üretim Adımları**:
1) DB sorgu: aynı işlevsellik için 2 flag mevcut. 2) Frontend ModuleGuard hangi key'i kontrol ediyor inconsistent.

**Önerilen Düzeltme**:
Single source of truth: enum tanımı şared/schema/schema-08.ts'e ekle. Eski naming için redirect/deprecation. DB seed scripti güncelle.

---

### F03 — adminhq Parola Tutarsızlığı _(Security)_

**Konum**: `replit.md:7 + .agents/skills/dospresso-architecture (kiosk auth)`

**Açıklama**: Pilot başlangıç parolası replit.md ve IT task notları arasında tutarsız. Plaintext credential potansiyel sızıntı.

**Tekrar Üretim Adımları**:
1) `cat replit.md | grep parola` 2) IT task notlarıyla karşılaştır.

**Önerilen Düzeltme**:
Tek standart belirle, IT special channel ile dağıt, mustChangePassword=true zorunlu, ilk login'de rotate. replit.md'den somut değerleri kaldır.

---

### F04 — Tek Onaylayıcı Riski _(SPOF)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS + users tablosu`

**Açıklama**: `recete_gm` reçete onayında tek başına onaylayıcı (1 user), `kalite_kontrol` ve `gida_muhendisi` SADECE 1'er kullanıcı. Tatil/hastalık → satın alma & üretim kilit.

**Tekrar Üretim Adımları**:
1) `SELECT role, COUNT(*) FROM users WHERE deleted_at IS NULL GROUP BY role;` → 4 kritik rolde count=1.

**Önerilen Düzeltme**:
`delegasyon` modülünü aktive et. Yedek onaylayıcı atama UI ekle (rol bazlı backup approver). Onay bekleyen kuyrukları admin'e fallback eskalasyon.

---

### F05 — Yatirimci_HQ Dashboard Kısır _(Dashboard)_

**Konum**: `dashboard_role_widgets DB tablosu (role=yatirimci_hq)`

**Açıklama**: yatirimci_hq rolüne sadece 1 widget atanmış (`pdks_branch_detail`). 31 modül erişimi var ama dashboard'da finansal/operasyonel widget yok.

**Tekrar Üretim Adımları**:
1) `SELECT widget_key FROM dashboard_role_widgets WHERE role='yatirimci_hq';` → 1 satır. 2) Yatırımcı login → dashboard boş.

**Önerilen Düzeltme**:
Migration: financial_overview, branch_status, customer_feedback, qc_stats widget'larını yatirimci_hq için ekle (read-only).

---

## YÜKSEK (12)

### F06 — Kullanıcısız Roller _(Schema)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS vs users DB`

**Açıklama**: PERMISSIONS'da 31 rol var ama users tablosunda fabrika_sorumlu, fabrika_personel, fabrika, muhasebe rollerinde 0 aktif kullanıcı.

**Tekrar Üretim Adımları**:
1) PERMISSIONS Object.keys() vs `SELECT DISTINCT role FROM users WHERE deleted_at IS NULL`.

**Önerilen Düzeltme**:
Schema cleanup: kullanılmayan rolleri PERMISSIONS'tan sil VEYA gelecek tahsis için açıkça @deprecated comment ekle.

---

### F07 — Mudur vs Supervisor Widget Tersine _(Hierarchy)_

**Konum**: `dashboard_role_widgets DB`

**Açıklama**: supervisor rolünde `branch_score_detail` widget var, mudur rolünde YOK. Supervisor müdüründen detaylı skor görüyor.

**Tekrar Üretim Adımları**:
1) Supervisor login → dashboard'da branch_score_detail kart. 2) Mudur login → kart yok.

**Önerilen Düzeltme**:
Migration: branch_score_detail widget'ını mudur için de ekle (display_order=8).

---

### F08 — Coach Onay Kuyruğu Eksik _(Dashboard)_

**Konum**: `dashboard_role_widgets DB (role=coach)`

**Açıklama**: coach 11 modülde onay yetkisi var ama dashboard widget set'inde sadece pdks_absence/shift_compliance/sla_tickets var. Onay bekleyen iş kuyruğu görünmüyor.

**Tekrar Üretim Adımları**:
1) Coach login → onay bekleyen eğitim/denetim listesi yok. 2) Manuel /coach-sube-denetim ziyaret gerekli.

**Önerilen Düzeltme**:
Yeni widget: pending_approvals (rol-aware). Coach için varsayılan ata.

---

### F09 — Trainer Akademi Widget Eksik _(Dashboard)_

**Konum**: `dashboard_role_widgets DB (role=trainer)`

**Açıklama**: trainer rolüne academy_admin (edit) yetkisi var ama dashboard'da training_progress dışında akademi widget'ı yok.

**Tekrar Üretim Adımları**:
1) Trainer login → sınav onay bekleyen liste, sertifika talep yok.

**Önerilen Düzeltme**:
Yeni widget: pending_certifications, pending_quiz_grades, student_progress. Trainer için ata.

---

### F10 — Fabrika Müdür Mali Widget vs Yetki _(Permission Mismatch)_

**Konum**: `shared/schema/schema-02.ts (fabrika_mudur.accounting) + dashboard_role_widgets`

**Açıklama**: fabrika_mudur rolüne financial_overview widget atanmış ama PERMISSIONS'da accounting yetkisi sadece view. Widget endpoint çağrısında 403 muhtemel.

**Tekrar Üretim Adımları**:
1) Fabrika müdür login → financial_overview widget yüklenirken /api/financial-summary çağrısı.

**Önerilen Düzeltme**:
PERMISSIONS'da fabrika_mudur.accounting=[view] doğrula veya widget'ı kaldır. Endpoint yetki kontrolünü logla.

---

### F11 — Sube Kiosk Audit Trail Zayıf _(Audit)_

**Konum**: `shared/schema/schema-15.ts (audit_logs) + kiosk routes`

**Açıklama**: sube_kiosk PIN-based ortak cihaz, hangi personel hangi görevi tamamladı izlenmiyor. Audit log'da sadece kiosk_id var.

**Tekrar Üretim Adımları**:
1) Şube kiosk'tan görev complete et → audit_logs.user_id=null veya generic kiosk user.

**Önerilen Düzeltme**:
Görev tamamlama UI'da kişi seçimi zorunlu. Audit log'a operator_name capture ekle.

---

### F12 — Recete_GM Maliyet Widget Eksik _(Dashboard)_

**Konum**: `dashboard_role_widgets DB (role=recete_gm)`

**Açıklama**: recete_gm rolünde cost_management ve purchase_orders yetkileri var ama dashboard'da maliyet senaryo widget'ı yok.

**Tekrar Üretim Adımları**:
1) Recete_gm login → reçete maliyet karşılaştırma için manuel /maliyet-analizi ziyaret gerekli.

**Önerilen Düzeltme**:
Yeni widget: recipe_cost_scenarios (Sade ₺7.13 / Kaplamalı ₺9.62 / Klasik ₺12.65 / Gourmet ₺14.65 senaryoları).

---

### F13 — İK Onay Bottleneck _(Workflow)_

**Konum**: `server/routes/leave-routes.ts + overtime-requests-routes.ts`

**Açıklama**: muhasebe_ik leave_requests/overtime_requests onayında manuel. Auto-approval threshold (örn. 1 günden az izin) yok.

**Tekrar Üretim Adımları**:
1) Pilot ile günde 50+ başvuru gelirse manuel kuyruk büyür.

**Önerilen Düzeltme**:
Auto-approval kuralları ekle (örn. <= 1 gün, <= 2 saat mesai). Threshold üstü manuel.

---

### F14 — Marketing CRM Bildirim _(Dashboard)_

**Konum**: `shared/schema/schema-13.ts (notifications) + crm endpoints`

**Açıklama**: marketing rolünde crm_complaints/customer_feedback view yetkisi var ama yeni şikâyet bildirimi tetiklenmiyor (sadece destek alıyor).

**Tekrar Üretim Adımları**:
1) Yeni şikâyet oluştur → marketing user notification kontrolü → yok.

**Önerilen Düzeltme**:
notification trigger'a marketing rolünü ekle (severity=high+ için).

---

### F15 — Branch Onboarding Wizard Bypass _(Pilot)_

**Konum**: `client/src/components/branch-onboarding-wizard.tsx + branches.setup_complete`

**Açıklama**: Pilot 4 lokasyonun 3'ü setup_complete=false → her giriş wizard tetikler. Pzt 09:00 hızlıca bypass gerekli.

**Tekrar Üretim Adımları**:
1) Pilot şube müdür login → wizard zorla açılır → operasyon engellenir.

**Önerilen Düzeltme**:
Mudur dashboard'unda "Skip wizard" admin onaylı buton VEYA migration: pilot 4 lokasyonu setup_complete=true işaretle.

---

### F16 — Aşırı Geniş Yetki _(Stajyer)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.stajyer`

**Açıklama**: stajyer rolünde 31 modül erişim yetkisi var (5 yazma yetkisi dahil): tasks.create, messages.create, vs.

**Tekrar Üretim Adımları**:
1) PERMISSIONS.stajyer Object.keys() count → 31. Yazma yetkisi: ~5.

**Önerilen Düzeltme**:
PERMISSIONS'dan stajyer.tasks.create, messages.create kaldır. Eğitim odaklı sıkı kapsama (academy + view-only).

---

### F17 — PDKS Widget Karmaşası _(Workflow)_

**Konum**: `dashboard_widgets DB + 5 PDKS widget`

**Açıklama**: 5 farklı PDKS widget: pdks_overview, pdks_attendance, pdks_absence, pdks_branch_detail, pdks_payroll. Her biri farklı endpoint, role tutarsız.

**Tekrar Üretim Adımları**:
1) `SELECT widget_key FROM dashboard_widgets WHERE category='personel' AND widget_key LIKE 'pdks_%';` → 5 satır.

**Önerilen Düzeltme**:
Tek unified widget: pdks_unified — backend role-aware projection (mudur=attendance, ik=payroll, supervisor=absence).

---

## ORTA (15)

### F18 — Bar_buddy ve Barista Aynı Widget _(Hierarchy)_

**Konum**: `dashboard_role_widgets DB`

**Açıklama**: bar_buddy ve barista aynı 3 widget'a sahip (todays_tasks, training_progress, quick_actions). Bar_buddy yardımcı rolü için ek widget yok.

**Tekrar Üretim Adımları**:
1) İki rolde widget set'i karşılaştır → identical.

**Önerilen Düzeltme**:
Bar_buddy için ek widget: team_view (kim aktif), basic_kpi.

---

### F19 — Sube Kiosk Vardiya Panosu Eksik _(Workflow)_

**Konum**: `client/src/pages/sube-kiosk.tsx + /vardiya/aktif`

**Açıklama**: sube_kiosk PIN ile vardiya başlat/bitir/mola yapar ama mudur ana sayfasına real-time entegrasyon zayıf.

**Tekrar Üretim Adımları**:
1) Kiosk'tan vardiya başlat → mudur dashboard'da gözükmesi 5+ dk.

**Önerilen Düzeltme**:
Real-time vardiya panosu widget (WebSocket veya 30s poll).

---

### F20 — Fabrika Operator Görev Atayamaz _(Workflow)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.fabrika_operator.tasks`

**Açıklama**: fabrika_operator tasks.create yetkisi yok. Hat lideri istasyondan görev atayamaz.

**Tekrar Üretim Adımları**:
1) Operatör login → görev atama sayfası 403.

**Önerilen Düzeltme**:
PERMISSIONS'a fabrika_operator.tasks=[view, create] ekle (kendi vardiyasındaki ekibe).

---

### F21 — Equipment Maintenance Teknik Yetki _(Permission Mismatch)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.teknik`

**Açıklama**: teknik rolünde equipment_maintenance view yetkisi yok PERMISSIONS'da (sadece widget). Sayfa 403 alabilir.

**Tekrar Üretim Adımları**:
1) Teknik login → /ekipman-bakim ziyaret → 403.

**Önerilen Düzeltme**:
PERMISSIONS'a teknik.equipment_maintenance=[view, create, edit] ekle.

---

### F22 — CRM İki Sayfa Çakışması _(Routing)_

**Konum**: `client/src/App.tsx (/crm vs /crm-mega)`

**Açıklama**: /crm ve /crm-mega aynı işlevde mi yoksa ayrı mı net değil. Marketing & destek ikisini de açıyor.

**Tekrar Üretim Adımları**:
1) `grep "/crm" client/src/App.tsx` → 2 path. 2) Her ikisinde manuel iç gez.

**Önerilen Düzeltme**:
Kanonik URL belirle (/crm), diğerini redirect. Sidebar tek link.

---

### F23 — Lost & Found HQ Sync _(Routing)_

**Konum**: `client/src/pages/kayip-esya.tsx + kayip-esya-hq.tsx`

**Açıklama**: /kayip-esya (şube) ve /kayip-esya-hq (HQ) ayrı sayfalar. HQ'da merkezi takip ile şube'de yerel kayıt sync'i belirsiz.

**Tekrar Üretim Adımları**:
1) Şubede kayıt → HQ sayfasında görünüyor mu test.

**Önerilen Düzeltme**:
Tek tablo, scope filtresi (branch_id), notification HQ'ya tetiklensin.

---

### F24 — Sef Reçete Yetkisi _(Permission)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.sef`

**Açıklama**: sef rolü recipes modülünde sadece view. Mutfakta reçete adaptasyonu yapamayacak.

**Tekrar Üretim Adımları**:
1) Sef login → reçete edit 403.

**Önerilen Düzeltme**:
PERMISSIONS'a sef.recipes=[view, edit] ekle (sadece kendi mutfak scope'unda).

---

### F25 — Iletisim_merkezi Redirect Banner _(Routing)_

**Konum**: `client/src/App.tsx (IletisimMerkeziRedirect)`

**Açıklama**: iletisim_merkezi modül flag disabled, App.tsx'te redirect → /crm. Ama eski URL'e gidenlere bilgilendirme yok.

**Tekrar Üretim Adımları**:
1) Eski URL ezbere → redirect ama uyarı yok.

**Önerilen Düzeltme**:
Toast bildirim: "Bu sayfa /crm'e taşındı, bookmark güncelleyin".

---

### F26 — Gida_muhendisi & Kalite_kontrol Üst Üste _(Dashboard)_

**Konum**: `dashboard_role_widgets DB`

**Açıklama**: İki rolün dashboard widget set'i %100 aynı (6 widget). Sorumluluklar PERMISSIONS'da farklı ama dashboard ayrımı yok.

**Tekrar Üretim Adımları**:
1) İki rolde widget set karşılaştır → identical.

**Önerilen Düzeltme**:
Gida_muhendisi için food_safety_alerts widget. Kalite_kontrol için capa_pending widget.

---

### F27 — Mr. Dobody Widget Eksik _(Dashboard)_

**Konum**: `dashboard_widgets DB`

**Açıklama**: 19 widget var ama dobody/agent kategorisinde widget yok. Mr. Dobody Mini Bar global ama dashboard widget değil.

**Tekrar Üretim Adımları**:
1) `SELECT * FROM dashboard_widgets WHERE category='ai';` → 1 (ai_briefing).

**Önerilen Düzeltme**:
Yeni widget: dobody_gap_detection (admin/coach/cgo için).

---

### F28 — SLA Tracker İkili Widget _(Dashboard)_

**Konum**: `dashboard_widgets DB`

**Açıklama**: sla_tracker ve sla_tickets farklı widget mı yoksa duplicate mı? Coach'ta ikincisi, mudur/supervisor/destek'te birincisi.

**Tekrar Üretim Adımları**:
1) `SELECT widget_key FROM dashboard_widgets WHERE widget_key LIKE 'sla%';` → 2.

**Önerilen Düzeltme**:
Duplicate analizi, birleştir VEYA isim açıklama netleştir (sla_tracker=open, sla_tickets=resolved).

---

### F29 — Yatirimci_branch Eğitim Erişim _(Permission)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.yatirimci_branch`

**Açıklama**: yatirimci_branch rolünde training_progress widget var ama academy view yetkisi → öğrenci listesi PII risk.

**Tekrar Üretim Adımları**:
1) Yatırımcı login → training_progress widget detay → kişi adları görünüyor mu.

**Önerilen Düzeltme**:
PII filtrele: aggregate counts only (ad gösterme).

---

### F30 — Banner & Duyuru Çakışması _(Routing)_

**Konum**: `client/src/App.tsx (/admin/bannerlar vs /admin/duyurular)`

**Açıklama**: /admin/bannerlar ve /admin/duyurular ayrı sayfalar. AnnouncementHeaderBanner globalde, priority/visibility kuralı net değil.

**Tekrar Üretim Adımları**:
1) İki sayfada eş zamanlı duyuru oluştur → header'da hangisi gösterilir test.

**Önerilen Düzeltme**:
Tek "Komünikasyon Merkezi" altında birleştir, priority alanı zorunlu.

---

### F31 — HQ Kiosk Rolü Eksik _(Schema)_

**Konum**: `client/src/App.tsx (/hq/kiosk) + PERMISSIONS`

**Açıklama**: /hq/kiosk route App.tsx'te public path, ama hq_kiosk rolü PERMISSIONS'da yok. Hangi rol kullanıyor belirsiz.

**Tekrar Üretim Adımları**:
1) `grep hq_kiosk shared/schema/` → yok.

**Önerilen Düzeltme**:
PERMISSIONS'a hq_kiosk rolü ekle veya route'u kaldır.

---

### F32 — 215 Page vs 250 Route Tutarsızlığı _(Routing)_

**Konum**: `client/src/App.tsx + client/src/pages/`

**Açıklama**: 215 .tsx dosya, 250 route → 35 fazla route bazı sayfaları multiple path ile gösteriyor.

**Tekrar Üretim Adımları**:
1) `ls client/src/pages | wc -l` → 215. 2) `grep -c "Route path" client/src/App.tsx` → 250.

**Önerilen Düzeltme**:
Audit: kanonik URL belirle, alternatif path'ler için redirect.

---

## DÜŞÜK (10)

### F33 — Fabrika Legacy Rolü Cleanup _(Schema)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.fabrika`

**Açıklama**: `fabrika` rolü PERMISSIONS'da var ama 0 user. App.tsx'te FabrikaOnly group dahil.

**Tekrar Üretim Adımları**:
1) `SELECT COUNT(*) FROM users WHERE role='fabrika';` → 0.

**Önerilen Düzeltme**:
PERMISSIONS'tan kaldır veya @deprecated tagle.

---

### F34 — Ajanda Genel Erişim _(Permission)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS (ajanda module)`

**Açıklama**: ajanda modül flag global enabled, sadece admin PERMISSIONS'da CRUD. Diğer rollerde view yetkisi yok → menüde görünmemeli.

**Tekrar Üretim Adımları**:
1) Non-admin login → sidebar'da Ajanda gözüküyor mu kontrol.

**Önerilen Düzeltme**:
Sidebar build'de PERMISSIONS view kontrolü zorunlu, modül flag yetersiz.

---

### F35 — Push Permission Banner Belirsizlik _(Notification)_

**Konum**: `client/src/components/push-permission-banner.tsx`

**Açıklama**: PushPermissionBanner global ama hangi rollerde push notification fiilen gönderiliyor net değil.

**Tekrar Üretim Adımları**:
1) Push enable et → hangi event push tetikler dokümante değil.

**Önerilen Düzeltme**:
Push notification policy dokümanı: rol × event matrisi.

---

### F36 — Stajyer Yazma Detay _(Permission)_

**Konum**: `shared/schema/schema-02.ts:PERMISSIONS.stajyer`

**Açıklama**: F12 ile bağlı: stajyer'in yazma yetkili 5 modül listesi audit gerekli.

**Tekrar Üretim Adımları**:
1) `Object.entries(PERMISSIONS.stajyer).filter(([k,v]) => v.some(a=>['create','edit','delete'].includes(a)))`.

**Önerilen Düzeltme**:
Detaylı audit + kısıtlama.

---

### F37 — Akademi Adaptive Engine UI _(Workflow)_

**Konum**: `client/src/pages/akademi-adaptive-engine.tsx`

**Açıklama**: Adaptive engine backend var, UI sayfa var ama trainer/coach'a expose edilmiyor (sidebar'da yok).

**Tekrar Üretim Adımları**:
1) `grep "akademi-adaptive-engine" client/src/components/app-sidebar.tsx` → yok.

**Önerilen Düzeltme**:
Sidebar'a trainer/coach için ekle.

---

### F38 — Coach Onay Endpoint Eşleşmesi _(Permission)_

**Konum**: `server/routes/quality-audit-routes.ts`

**Açıklama**: F08 ile bağlı: coach 11 modül onay yetkisi ama endpoint'leri tek tek dokümante değil.

**Tekrar Üretim Adımları**:
1) `grep -r "approve" server/routes/ | head -20`.

**Önerilen Düzeltme**:
Endpoint katalog dokümanı (server/routes/README.md).

---

### F39 — Sube_kiosk Dashboard Yok _(Dashboard)_

**Konum**: `dashboard_role_widgets DB (role=sube_kiosk)`

**Açıklama**: sube_kiosk için widget atanmış ama bu rol kiosk-only, web dashboard kullanmıyor.

**Tekrar Üretim Adımları**:
1) `SELECT widget_key FROM dashboard_role_widgets WHERE role='sube_kiosk';` → boş veya gereksiz.

**Önerilen Düzeltme**:
Cleanup: sube_kiosk için widget kayıtlarını sil.

---

### F40 — Akademi Sayfa Çoğaltması _(Routing)_

**Konum**: `client/src/pages/ (akademi-* 30+ dosya)`

**Açıklama**: 30+ akademi-* sayfa dosyası var. Bazıları muhtemelen unused.

**Tekrar Üretim Adımları**:
1) `ls client/src/pages/ | grep -c akademi` → 30+.

**Önerilen Düzeltme**:
Audit: route'larda referans olmayanları sil.

---

### F41 — Trainer Sınav Otomatik Geçme _(Workflow)_

**Konum**: `server/routes/training-routes.ts`

**Açıklama**: Sınav puanı eşik üstü otomatik geçirilmiyor — trainer manuel onay.

**Tekrar Üretim Adımları**:
1) Sınav tamamla → status=pending_grade → trainer manuel.

**Önerilen Düzeltme**:
Auto-pass kuralı: score >= 70 → auto-approve, < 70 → trainer review.

---

### F42 — Bordro Hesaplama Audit _(Audit)_

**Konum**: `server/routes/payroll-calculation.ts`

**Açıklama**: Bordro hesaplama logları detaylı değil — kim hangi düzeltmeyi yaptı izlenmiyor.

**Tekrar Üretim Adımları**:
1) Bordro override → audit_logs sorgu → minimal detay.

**Önerilen Düzeltme**:
Audit log structured data: before/after diff zorunlu.

---

## Özet Tablo
| Severity | Adet | Hedef |
|----------|------|-------|
| KRİTİK | 5 | ≥5 ✅ |
| YÜKSEK | 12 | (ek hedef) |
| ORTA | 15 | ≥15 ✅ |
| DÜŞÜK | 10 | ≥10 ✅ |
| **TOPLAM** | **42** | |

## Pilot İçin Aksiyon Önceliği (28 Nisan 2026 öncesi)
1. **F01-F05 (KRİTİK)**: Pilot blokeri — Pzt 09:00 öncesi MUTLAKA çözülmeli.
2. **F06-F15 (YÜKSEK)**: Pilot ilk haftasında izlenmeli, hızlı patch hazır.
3. **F16-F30 (ORTA)**: Pilot sonrası 1. ay roadmap.
4. **F31-F40 (DÜŞÜK)**: Backlog — gelecek sprint.
