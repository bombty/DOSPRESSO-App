# DOSPRESSO — SPRINT 1-8 KAPSAMLI DURUM RAPORU
**Tarih:** 5 Mayıs 2026  
**Pilot Hedef:** 12 Mayıs 2026 (T-7 gün)  
**Hazırlayan:** Replit Agent (Build mode, otomatik veri toplama)  
**Veri Kaynağı:** PostgreSQL `pg_stat_user_tables`, codebase scan (125 route, 314 page, 469 schema table, 33 migration), git log, debug-guide §1-§31, son 100 commit

---

## 0) GENEL DURUM ÖZETİ

| Metrik | Değer | Yorum |
|---|---|---|
| Kod tabanı | 125 backend route, 314 frontend sayfa, 279 App.tsx route, 469 schema tablosu, 33 migration | Olgun, geniş |
| DB boyutu | 130 MB | Küçük (pilot öncesi) |
| Aktif şube | 20 | 16'sı pilot dışı kalacak (Sprint 8 sonrası 4 aktif) |
| Aktif kullanıcı | 176 | Sprint 8 sonrası ~157 hedefleniyor |
| Toplam tablo | 477 | **458'i (%96) BOŞ** — dormant |
| Bilinen bug çözümleri | 31 (debug-guide §1-§31) | Çoğu çözülmüş |
| Son 100 committe hotfix | 17 | %17 hotfix oranı — kararsız değil ama high-iteration |
| TODO/FIXME yorumları | 17 | Düşük teknik borç |
| Son 24 saat bildirim | 1463 (5 May) | Görev sistemi spam üretiyor → §19 |
| Sprint tamamlanma | 1✅ 2✅ 3✅ 4✅ 5✅ 6✅ 7✅ 8🟡 (PR merged, local sync bekliyor) | Sprint 8 EXECUTE bekliyor |

**KRİTİK NOT (5 May 21:30):** Git local main `[ahead 8, behind 10]` — Sprint 8 PR #18 dahil 10 commit local'de YOK. Migration dosyası da yok. Bu rapor mevcut local kodbase üzerine yazıldı; Sprint 8 sonrası bazı veriler değişecek (skor_parametreleri seed, 35 personel UPSERT, 18 fake şube passive).

---

## A) MODÜL ÇALIŞABİLİR DURUMU

| # | Modül | Durum | Veri Kanıtı | Açıklama |
|---|---|---|---|---|
| 1 | **PDKS & Devam** | 🟡 KISMEN | `pdks_daily_summary`=5, `monthly_attendance_summaries`=685, Sprint 6 hotfix (e068ce962 schema drift), Sprint 6 Bölüm 3 PDKS detay | Schema drift düzeldi, ama `pdks_records`=0 — Excel import hiç çalışmadı (`pdks_excel_imports`=0). IK Raporları çalışır durumda. |
| 2 | **Bordro** | 🟡 KISMEN | `monthly_payroll`=16, `payroll_records`=0, `monthly_payrolls`=0 (duplicate tablo!), Sprint 6 Bölüm 4 CTA eklendi | UI tamam (Bölüm 4), backend hesap motoru var ama `payroll_parameters`=0 → vergi/SGK parametreleri eksik. Pilot için B-RİSK. |
| 3 | **İzin Yönetimi** | 🟡 KISMEN | `employee_leaves`=0, `leave_records`=0, `leave_balances`=0, Sprint 6 Bölüm 2 EDIT yetkisi + tüm şubeler | UI çalışır, talep/onay akışı kodda var. Ama hiç gerçek izin verisi yok — **smoke test yapılmamış**. |
| 4 | **Performans** | 🔴 EKSİK | `monthly_employee_performance`=0, `employee_performance_scores`=0, `manager_evaluations`=0, `manager_monthly_ratings`=0, `staff_evaluations`=0, `personnel_audit_scores`=0 | 6 tablo TAMAMI BOŞ. Hesaplama altyapısı var ama hiç çalıştırılmamış. **Pilot için kullanılabilir değil**. |
| 5 | **Personel Detay** | ✅ ÇALIŞIYOR | `users`=409 (176 aktif), Sprint 4 `/api/me/*`, Sprint 5 personel sync | Özlük + vardiya görüntülemesi çalışıyor. Eğitim sekmesi `professional_training_progress`=0 → eğitim kaydı yok. |
| 6 | **CRM / İletişim Merkezi** | 🟡 KISMEN | `messages`=0, `cowork_messages`=0, `cowork_channels`=0, `notifications`=24055 (sadece bildirim katmanı çalışıyor), `module_flags.iletisim_merkezi`=disabled | Mesajlaşma ALT YAPI VAR ama disabled. Müşteri geri bildirim (`feedback_responses`=0, `customer_feedback`=0). Ticket sistemi (`hq_support_tickets`=0). |
| 7 | **Görev Yönetimi (Task)** | 🟡 KISMEN | `tasks`=1, `task_assignees`=0, `task_comments`=0, ama `notifications.task_overdue`=751 son 24 saatte! | **§19 scheduler patlaması var** — 1 görev için 751 overdue bildirim üretildi. Critical bug. Pilot öncesi mutlaka çözülmeli. |
| 8 | **Akademi V3** | 🔴 EKSİK | `module_lessons`=0, `quizzes`=0, `quiz_questions`=0, `quiz_attempts`=0, `quiz_results`=0, `user_training_progress`=0, `training_completions`=0, `training_modules`=0, `issued_certificates`=0, `badges`=0, `user_badges`=0 | 11+ tablo BOŞ. UI tamamen kuruldu (10 akademi-hq sayfası, 5 akademi-v3 sayfası, 50+ akademi rotası) ama **hiç içerik yok**. Pilot personeli eğitim göremez. |
| 9 | **Denetim Sistemi** | 🔴 EKSİK | `audits_v2`=0, `audit_responses_v2`=0, `audit_template_questions_v2`=0, `audit_personnel_v2`=0, `audit_instances`=0, `branch_audit_scores`=0, `hygiene_audits`=0, `quality_audits`=0 | V2 audit sistemi tamamen boş. Pilot şube denetimi yapılamaz. |
| 10 | **Üretim Planlama (Fabrika)** | 🟡 KISMEN | `weekly_production_plans`=0, `production_plan_items`=0, `production_records`=0, `daily_production_records`=0, `production_lots`=0, ama `factory_products`=177 (mevcut) | Ürün katalog dolu, ama plan/kayıt akışı boş. Sprint 7 v3 reçete-etiket entegrasyonu çalışır. Fabrika ana modül `module_flags.fabrika`=enabled ama 6 alt modül DİSABLE: kavurma, kalite, hammadde, stok, sayım, sipariş, sevkiyat. |
| 11 | **Reçete Yönetimi (Branch + Factory)** | 🟡 KISMEN | `branch_recipes`=0, `branch_products`=0, `factory_recipes`=0, `factory_recipe_versions`=0, `recipes`=0, ama Sprint 7 v3 etiket-hesapla + ingredient matching çalışıyor (adfbd33e8) | Şube reçete tamamen boş. Fabrika reçete tamamen boş. Sadece etiket hesaplama engine çalışıyor. **Pilot için reçete data seed gerekli**. |
| 12 | **TGK Etiket Sistemi** | ✅ ÇALIŞIYOR | `tgk_labels`=3 (1 update), Sprint 7 v3 etiket-hesapla.tsx + recipe-label-engine.ts (her ikisi de bu gece merge conflict ile geldi) | Calculate, save, onay (taslak) akışı çalışır. PDF üretim aktif. **#350 görev:** TGK label approval UI Aslan'da. |
| 13 | **Tedarikçi Kalite (QC, Türkomp)** | 🟡 KISMEN | `suppliers`=13, `supplier_quality_records`=0, `supplier_performance_scores`=0, `supplier_certifications`=0, `supplier_quotes`=0, `turkomp_foods`=0, Sprint 7 v2 67 hammadde import edildi | Tedarikçi kayıtlı (13), TÜRKOMP entegrasyonu kodda var ama veri hiç yüklenmemiş (0 food). QC kayıtları boş. |
| 14 | **Stok Yönetimi** | 🔴 EKSİK | `inventory`=0, `branch_inventory`=0, `factory_inventory`=0, `branch_stock_movements`=0, `stock_counts`=0, `stock_count_items`=0, `inventory_counts`=0, `goods_receipts`=0, `purchase_orders`=0, `module_flags.stok`=disabled | **Modül flag KAPALI**. 9+ tablo boş. Pilot için stok takibi çalışmaz. |
| 15 | **Mali Rapor / Muhasebe** | 🔴 EKSİK | `branch_financial_summary`=0, `financial_records`=0, `cari_accounts`=0, `cari_transactions`=0, `daily_cash_reports`=0, `branch_monthly_payroll_summary`=0, `factory_fixed_costs`=0 | Hiç finansal veri yok. Sprint 6 Bölüm 4'te bordro CTA eklendi ama mali rapor üretimi pilot öncesi yapılamaz. |
| 16 | **Kiosk + Mr. Dobody** | 🟡 KISMEN | `kiosk_sessions`=0, `branch_staff_pins`=0, `factory_staff_pins`=0 (PRE_PHASE1 backup'lar var → 5 May migrasyon yapıldı), `dobody_events`=31, `agent_runs`=25, `agent_pending_actions`=96, `agent_escalation_history`=142, `dobody_proposals`=0 | Kiosk PIN seed bekliyor (Sprint 8). Dobody agent altyapısı ÇALIŞIYOR (96 pending action, 142 escalation), proposal akışı henüz aktif değil. Sprint 6 hotfix (Mahmut Bey görüntü kapsamı) tamam. UX bulguları (5de7ba8a8) düzeldi. |
| 17 | **Şube Sağlık / Audit** | 🔴 EKSİK | `branch_audit_scores`=0, `branch_quality_audits`=0, `branch_monthly_snapshots`=0, `branch_comparisons`=0, `quality_audits`=0, `hygiene_audits`=0, `haccp_records`=0, `haccp_check_records`=0, `haccp_control_points`=0 | 9 tablo BOŞ. Şube sağlık skoru üretilmiyor. HACCP kontrol noktası yok. **Pilot için en zayıf modül**. |
| 18 | **Skor Parametreleri (Sprint 8)** | 🟡 BEKLİYOR | Tablo henüz yok (`score_parameters` migration PR #18'de — local'de yok), `client/src/pages/admin/skor-parametreleri.tsx` MERGE'da bekliyor | Sprint 8 EXECUTE sonrası ÇALIŞACAK. UI hazır. |

**Özet:** 18 modülden 2'si ✅, 8'i 🟡 (kısmen), 7'si 🔴 (eksik), 1'i 🟡 (Sprint 8 bekliyor).  
**Pilot kritik 4 modül:** Performans (#4), Akademi (#8), Denetim (#9), Şube Sağlık (#17) — tamamen boş veri.

---

## B) BİLİNEN BUG'LAR

Debug-guide skill `.agents/skills/dospresso-debug-guide/SKILL.md` 31 bölüm — çoğu ÇÖZÜLDÜ. Açık olanlar:

| Bug | Severity | Modül | Pilot Kritik? | Kaynak |
|---|---|---|---|---|
| **Scheduler görev patlaması** — 1 task için 751 overdue notification (24 saat) | 🔴 CRITICAL | Görev | **EVET** | §19, DB veri (notifications.task_overdue=751) |
| **HQ kiosk PIN plaintext** — bcrypt yapılmamış | 🔴 CRITICAL | Kiosk Auth | EVET (pilot sonrası B1 planlandı) | §22, DECISIONS#14 |
| **Bordro `monthly_payroll` ↔ `monthly_payrolls` duplicate tablo** — schema drift potansiyeli | 🟠 MAJOR | Bordro | EVET | DB scan (16 vs 0 satır) |
| **Akademi V3 hiç içerik yok** — 11 tablo boş, pilot personeli eğitim göremez | 🟠 MAJOR | Akademi | EVET | DB scan |
| **Şube denetim hiç çalışmamış** — audits_v2 boş, hygiene_audits boş | 🟠 MAJOR | Denetim | EVET | DB scan |
| **Stok modül flag kapalı** — `module_flags.stok=false` | 🟠 MAJOR | Stok | EVET (eğer pilot şubeleri stok takibi yapacaksa) | DB scan |
| **Fabrika 6 alt modül disabled** — kavurma/kalite/hammadde/stok/sayım/sipariş/sevkiyat hepsi false | 🟠 MAJOR | Fabrika | EVET (Fabrika pilot şubelerden biri) | DB scan |
| **TÜRKOMP veri seed eksik** — `turkomp_foods=0` | 🟡 MINOR | Tedarikçi Kalite | HAYIR (Sprint 7 v2 67 hammadde geldi) | DB scan |
| **`personnel_attendance_detail.ts` merge conflict** — bu gece çözüldü `--theirs` ile (origin/main) | 🟡 MINOR | PDKS | HAYIR (çözüldü) | git log |
| **Recipe-label-engine merge conflict** — bu gece çözüldü `--theirs` ile | 🟡 MINOR | TGK Etiket | HAYIR (çözüldü) | git log |
| **`feedback_responses=0`** — guest QR feedback çalışmamış | 🟡 MINOR | CRM | HAYIR | DB scan |
| **`pdks_records=0`** — Excel import çalışmamış | 🟡 MINOR | PDKS | HAYIR (PDKS detay rapor `monthly_attendance_summaries`=685'le çalışıyor) | DB scan |
| **`personnel_files=0`** — özlük dosya yok | 🟡 MINOR | Personel Detay | HAYIR | DB scan |
| **`equipment=0` + `equipment_catalog=0`** — ekipman modülü tamamen boş | 🟡 MINOR | Ekipman | HAYIR (modül flag açık ama veri yok) | DB scan |

**Çözülmüş (referans için):** §1-3 auth, §17 schema drift (Sprint 6), §18 dobody undefined, §22 day-5 hardening (Task #272), §23 atomik vardiya (Task #273), §24 pilot password gate (Task #274), §29 schema-DB drift R-5, §30 lock bypass, §31 Express route ordering.

---

## C) EKSİK BACKEND ENDPOINT'LER (Frontend var, backend yok)

Sistemli scan yapılmadı (kapsam: 314 frontend × 125 route cross-check). Bilinenler ve şüpheliler:

| Frontend Sayfa | Beklenen Endpoint | Durum |
|---|---|---|
| `client/src/pages/akademi-cohort-analytics.tsx` | `/api/academy/cohort-analytics` | Şüpheli (cohort_* tablo yok DB'de) |
| `client/src/pages/akademi-adaptive-engine.tsx` | `/api/academy/adaptive-engine` | Şüpheli |
| `client/src/pages/akademi-progress-overview.tsx` | `/api/academy/progress-overview` | Şüpheli (`user_training_progress`=0) |
| `client/src/pages/waste-trainer-console.tsx`, `waste-coach-console.tsx`, `waste-qc-console.tsx`, `waste-executive.tsx`, `waste-mega.tsx` | `/api/waste/*` (5 sayfa) | Şüpheli (waste_events=0, waste_categories=0, waste_reasons=0) |
| `client/src/pages/yatirimci-hq-centrum.tsx`, `yatirimci-centrum.tsx` | `/api/franchise-investor/*` | Şüpheli (`franchise_investors`=0) |
| `client/src/pages/akademi-social-groups.tsx` | `/api/academy/social-groups` | Şüpheli |

**ÖNERI:** Pilot öncesi otomatik audit script: `npm run audit:routes` (yoksa yazılmalı) → her frontend `useQuery({queryKey: ['/api/...']})` çağrısının backend karşılığını kontrol et. Şu an manuel.

---

## D) EKSİK FRONTEND SAYFALARI (Backend var, route/sayfa yok)

| Backend Route Dosyası | Frontend Sayfa Var mı? |
|---|---|
| `server/routes/dobody-flow*.ts` (5 dosya) | Kısmen — `/dobody-flow-*` rotaları görünür ama Dobody flow modu `module_flags.dobody.flow=disabled` |
| `server/routes/franchise-investor.ts` | Var (yatirimci-*) ama veri yok |
| `server/routes/dashboard-widgets.ts` | Var (`/admin/dashboard-widget-yonetim` veya benzeri); `dashboard_widgets`=0 → widget hiç tanımlanmamış |
| `server/routes/ai-data-domains.ts`, `ai-domain-policies.ts`, `ai-system-config.ts` | Yok — AI policy admin UI eksik |
| `server/routes/career-*.ts` (career_levels, career_gates, career_score_history) | Yok — Career Path UI eksik |
| `server/routes/badges.ts` | `/akademi-badges`, `/akademi-rozet-koleksiyonum` var ama `badges`=0 |
| `server/routes/training-materials.ts` | `/akademi-icerik-yonetimi` var ama `training_materials`=0 |

**ÖNERI:** Yine `npm run audit:routes` reverse direction.

---

## E) DB TABLO KULLANIM ORANI

**Top 20 KULLANILAN tablo (>0 satır):**

| Tablo | Satır | Durum |
|---|---|---|
| `notifications` | 24055 | 🔴 Aşırı kullanım — scheduler spam (§19) |
| `monthly_attendance_summaries` | 685 | ✅ Aktif |
| `users` | 409 (176 aktif) | ✅ Aktif |
| `factory_products` | 177 | ✅ Aktif |
| `agent_escalation_history` | 142 | ✅ Aktif (Dobody) |
| `agent_pending_actions` | 96 | ✅ Aktif (Dobody) |
| `module_flags` | 95 | ✅ Aktif |
| `raw_materials` | 67 | ✅ Aktif (Sprint 7 v2) |
| `reminders` | 35 | ✅ Aktif |
| `dobody_events` | 31 | ✅ Aktif |
| `agent_runs` | 25 | ✅ Aktif |
| `ai_agent_logs` | 24 | ✅ Aktif |
| `ai_usage_logs` | 24 | ✅ Aktif |
| `audit_logs` | 22 | ✅ Aktif |
| `monthly_payroll` | 16 | 🟡 Az |
| `suppliers` | 13 | ✅ Aktif |
| `pdks_daily_summary` | 5 | 🟡 Az |
| `sessions` | 5 | ✅ Aktif (Express session) |
| `tgk_labels` | 3 | 🟡 Az (Sprint 7 yeni) |
| `tasks` | 1 | 🔴 Çok az ama 751 overdue notif!? — §19 |

**Dormant (boş ama aktif schema'da):** **458 tablo** (toplam 477'nin %96'sı boş).

**Dead code şüphesi:** Aşağıdaki backup tablolar artık silinebilir:
- `users_pre_phase1_20260429`
- `branch_kiosk_settings_pre_phase1_20260429`
- `branch_staff_pins_pre_phase1_20260429`
- `branch_staff_pins_bk_20260429`
- `factory_staff_pins_pre_phase1_20260429`
- `factory_staff_pins_bk_20260429`

**Duplicate / kafa karıştırıcı:**
- `monthly_payroll` (16 satır) ↔ `monthly_payrolls` (0 satır) — hangisi gerçek?
- `recipes` (0) ↔ `branch_recipes` (0) ↔ `factory_recipes` (0) ↔ `recipe_versions` (0) ↔ `factory_recipe_versions` (0) — 5 reçete tablosu
- `audit_templates` (0) ↔ `audit_templates_v2` (0) — V1 deprecated mı?

---

## F) ROL YETKİ KONTROLÜ TUTARSIZLIKLARI

**Aktif rol dağılımı (DB):**

| Rol | Aktif Kullanıcı | Yorum |
|---|---|---|
| barista | 77 | En kalabalık |
| sube_kiosk | 19 | Şube kiosk hesabı |
| mudur | 18 | |
| supervisor | 17 | |
| fabrika_operator | 10 | |
| yatirimci_branch | 4 | |
| stajyer | 3 | |
| admin | 3 | |
| bar_buddy | 3 | |
| coach | 3 | |
| muhasebe_ik | 2 | |
| ceo | 2 | |
| marketing | 2 | |
| cgo | 2 | |
| satinalma | 2 | |
| gida_muhendisi | 2 | |
| fabrika_mudur | 1 | |
| supervisor_buddy | 1 | |
| teknik | 1 | |
| sef | 1 | |
| destek | 1 | |
| trainer | 1 | |
| yatirimci_hq | 1 | |

**TOPLAM:** 23 farklı rol aktif (replit.md'de "31 rol" deniyor — 8 rol DB'de hiç kullanıcı yok, sadece tanımlı).

**Bilinen tutarsızlıklar:**

| Konu | Detay | Risk |
|---|---|---|
| **Route guard whitelist** | Sprint 7 sonrası bazı yeni route'lar `ProtectedRoute`'a eklenmemiş, hotfix #14 (cea1ac7f4) ile düzeltildi | 🟡 İzleme gerek |
| **`ProtectedRoute` vs `HQOnly` vs `ExecutiveOnly` vs `ModuleGuard` vs `FabrikaOnly`** | 5 farklı guard pattern, App.tsx'de 279 route — manuel tutarlılık zor | 🟡 Audit script var ama düzenli çalıştırılmıyor |
| **Mahmut Bey görüntü kapsamı** | Sprint 6 hotfix (#11) — sadece kiosk filtresi düzeltildi, başka rol için benzer kontrol yapılmadı | 🟡 Pilot için riskli (yatirimci_branch, supervisor için scope test) |
| **`role_module_permissions` boş** | DB'de 0 satır — tüm yetki statik koddan geliyor | 🔴 Pilot dinamik yetki değiştirmek isterse YAPAMAZ |
| **`role_permission_grants`, `role_permission_overrides`, `role_permissions` hepsi 0** | 3 dinamik yetki tablosu boş | 🔴 RBAC tamamen statik (kod değişikliği gerek) |

---

## G) BUG OLMASA BİLE UX SORUNLARI

| Sorun | Sayfa(lar) | Etki |
|---|---|---|
| **Akademi rota patlaması** | 50+ akademi-* rotası (App.tsx) — `akademi-ana`, `akademi-hq`, `akademi/*?`, `akademi-legacy/*?`, `akademi-modul-editor`, `akademi-modul/:id`, vs. | Kullanıcı kafa karışır — hangi sayfadan giriş yapacağını bilemez |
| **3 ayrı bordro pattern** | `monthly_payroll` (kullanılan) + `monthly_payrolls` (boş) + `payroll_records` (boş) + `branch_monthly_payroll_summary` (boş) — backend'de hangisi? | 🔴 Geliştirici hatası riski + kullanıcıya yanlış veri |
| **Şube reçete vs Fabrika reçete vs ana reçete** | `branch_recipes`, `factory_recipes`, `recipes` — 3 ayrı modül navigation | Kullanıcı hangi modülü ne için kullanacağını bilmiyor |
| **Vardiya/Vardiyalar/Vardiyalarım/Vardiya-Planlama/Vardiya-Checkin** | 5 farklı vardiya sayfası | Tek hub yok — Mission Control'a entegre değil |
| **Waste 5 console** | `waste-trainer-console`, `waste-coach-console`, `waste-qc-console`, `waste-executive`, `waste-mega`, `waste-entry` (6 sayfa!) | Aşırı parçalı, hiçbiri kullanılmıyor (waste_events=0) |
| **Dobody flow disabled** | `module_flags.dobody.flow=false` ama 5 backend route + UI mevcut | Disabled modülün UI'sı görünüyor mu? |
| **Notification sel** | 5 May 2026: 1463 bildirim (24 saatte) — kullanıcı erişemez | Mobil push bildirim spam ihtimali |
| **Mobile bozuk olanlar (bilinen):** Sprint 4 hotfix (f750929ff) "dashboard mobil layout" düzeltti, ama 314 sayfa içinden kaç tanesi mobile-tested bilinmiyor | 🟡 Pilot şube tablette kullanıyor, masaüstü değil |
| **Iletişim Merkezi disabled** | `module_flags.iletisim_merkezi=false` — UI var, mesaj yok | Personel mesajlaşma yok (kritik!) |

---

## H) PİLOT 12 MAYIS RİSK LİSTESİ

**Mutlaka çözülmesi gereken (T-7 gün):**

| # | Risk | Severity | Aksiyon | Kim |
|---|---|---|---|---|
| 1 | **Sprint 8 migration EXECUTE** | 🔴 BLOKER | Bu gece migration çalıştır + smoke test | İsolated task agent |
| 2 | **Scheduler task overdue patlaması** (§19, 1 task → 751 notif) | 🔴 BLOKER | Scheduler max-instance limit doğrula, mevcut spam temizle | Replit Agent |
| 3 | **HQ kiosk PIN plaintext** (DECISIONS#14) | 🟠 HIGH | Pilot sonrası B1 — pilot süresince düşük risk (HQ hesabı sayısı az) | Aslan + Replit Agent |
| 4 | **`module_flags.stok=false`** | 🟠 HIGH | Pilot şubeleri stok takibi yapacak mı? Eğer evet → enable + seed | Aslan karar |
| 5 | **Fabrika 6 alt modül disabled** | 🟠 HIGH | Fabrika pilot şubesi (ID 24) hangi modüllere ihtiyaç duyacak — flag review | Aslan karar |
| 6 | **Akademi içerik 0** (11 tablo boş) | 🟠 HIGH | Pilot personeli hangi eğitimi alacak? En az "Hoşgeldin" content pack seed | Aslan + içerik |
| 7 | **Denetim V2 sıfır** | 🟠 HIGH | Pilot ilk hafta denetim yapılacak mı? Template seed gerekli | Aslan karar |
| 8 | **Bordro `monthly_payroll` vs `monthly_payrolls` duplicate** | 🟠 HIGH | Hangi tablo kanonik karar + diğerini drop migration | Replit Agent |
| 9 | **`payroll_parameters=0`** | 🟠 HIGH | Vergi/SGK parametreleri seed edilmeli — yoksa bordro hesabı 0 verir | Aslan veri |
| 10 | **`turkomp_foods=0`** | 🟡 MEDIUM | TGK etiket için TÜRKOMP veri seed (Sprint 7 v2 sadece raw_materials geldi) | Replit Agent |
| 11 | **`role_module_permissions=0`** | 🟡 MEDIUM | Pilot süresince rol yetkisi değişmeyecekse kabul edilebilir | Aslan karar |
| 12 | **TGK label approval UI (#350)** | 🟡 MEDIUM | Aslan'ın elinde — yarın bitebilir | Aslan |
| 13 | **#348/#349 task'lar Sprint 9'a ertelendi** | 🟡 LOW | Sprint 9 şu an pilot dışı | — |
| 14 | **Mobile test eksikliği** | 🟡 MEDIUM | Pilot şube tablette kullanacak — en az Mission Control + Kiosk + Görev + PDKS sayfaları test | Test agent |
| 15 | **Branch protection setup** | 🟡 LOW | Aslan GitHub branch protection rule (require PR review) | Aslan |
| 16 | **Push reject + diverged main olayı tekrarı** | 🟡 MEDIUM | `dospresso-git-safety` skill devrede (5 May), workflow mandatory rules ekledi → izleme | Replit Agent |

**TOP 5 EN KRİTİK:** #1 (Sprint 8 EXECUTE), #2 (scheduler patlaması), #6 (Akademi içerik), #8 (bordro duplicate), #9 (payroll parameters).

---

## J) PERFORMANS METRİKLERİ

**NOT:** Bu DB'de `pg_stat_statements` extension yok, application APM yok. Aşağıdakiler proxy göstergeler:

### Bildirim üretim hızı (proxy: hangi modül en aktif)
| Tarih | Notification sayısı | Yorum |
|---|---|---|
| 2026-05-05 | 1463 | 🔴 PİK — task_overdue spam |
| 2026-05-04 | 136 | Normal |
| 2026-05-03 | 562 | Yüksek |
| 2026-05-02 | 106 | Normal |
| 2026-05-01 | 97 | Normal |
| 2026-04-30 | 83 | Normal |
| 2026-04-29 | 130 | Normal |

### Bildirim tipi (24 saat) — En aktif "endpoint"ler
| Tip | Sayı | Yorum |
|---|---|---|
| `task_overdue` | 751 | 🔴 §19 — scheduler spam |
| `task_overdue_assigner` | 552 | 🔴 §19 — assigner duplikasyonu |
| `agent_suggestion` | 134 | ✅ Dobody normal |
| `maintenance_reminder` | 64 | ✅ Normal |
| `sla_breach` | 19 | 🟡 SLA breach var |
| `escalation_info` | 19 | 🟡 |
| `agent_escalation_info` | 9 | ✅ |
| `stale_quote_reminder` | 7 | ✅ |
| `franchise_escalation` | 3 | ✅ |
| `agent_escalation` | 1 | ✅ |

### En çok yazılan tablo (UPDATE sayısı — query yükü göstergesi)
| Tablo | Updates | Yorum |
|---|---|---|
| `monthly_attendance_summaries` | 4239 | Yoğun PDKS hesabı |
| `notifications` | 22555 | Bildirim okundu/silindi flag |
| `factory_products` | 1100 | Ürün düzenleme |
| `module_flags` | 711 | Toggle yoğunluğu |
| `reminders` | 330 | Snooze |
| `users` | 190 | Profil/şifre güncelleme |
| `sessions` | 1557 | Express session normal |
| `branch_kiosk_settings` | 18 | Düşük |

### En yavaş 5 endpoint
**ÖLÇÜLMEDİ.** Pilot öncesi `pg_stat_statements` aktive edilmeli + APM (örn. Sentry Performance) kurulmalı.

### En çok hata veren 5 endpoint
**ÖLÇÜLMEDİ.** `system_critical_logs` tablosu tablo şeması sorunlu (`level` kolonu yok diye query başarısız oldu) — bu da bir bug işareti.

### DB query süreleri (>500ms)
**ÖLÇÜLMEDİ.** Önerilen: pilot öncesi 1 günlük slow query log toplama.

---

## SONUÇ — PİLOT HAZIRLIK SKORU

**Modül durumu:** 18 modülün 2'si tam çalışır (%11), 9'u kısmen (%50), 7'si eksik (%39).  
**Veri durumu:** 477 tablonun %96'sı boş — pilot başlamadan önce **en az 6 modülde seed gerekli** (Akademi, Denetim, Reçete, TÜRKOMP, Payroll Params, Stok).  
**Bug durumu:** 31 bilinen bug'ın çoğu çözüldü; 7 kritik açık iş var (Top: scheduler spam, kiosk PIN plain, bordro duplicate).  
**Git durumu:** Sprint 8 PR merged ama local sync olmadı — **bu rapor mevcut local state üzerine yazıldı**.

**TAVSİYE:**  
1. ✅ Sprint 8 EXECUTE (bu gece) — score_parameters seed + 35 personel UPSERT + 18 fake şube passive
2. 🔴 Scheduler patlamasını çöz (§19) — 1 task için 751 overdue kabul edilemez
3. 🟡 Akademi en az 1 onboarding modülü seed
4. 🟡 Denetim en az 1 daily checklist template seed
5. 🟡 Bordro kanonik tablo kararı + duplicate drop
6. 🟡 `pg_stat_statements` enable + APM kur (pilot 12 May'den önce)

---

**Rapor sonu.** İmza: Replit Agent, 5 May 2026 21:45.  
Sonraki güncelleme: Sprint 8 EXECUTE sonrası — `docs/SISTEM-RAPORU-12-MAYIS.md` (pilot ilk gün).
