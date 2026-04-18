# Sistem Yöneticisi (AdminHQ)
**Rol Kodu**: `admin`  
**Kategori**: EXECUTIVE  
**Aktif Kullanıcı Sayısı**: 5  
**Görev**: Platform yapılandırma, kullanıcı/rol/şube yönetimi, modül flag kontrolü, sistem sağlığı.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 79 |
| Yazma yetkisi olan modül | 61 |
| Onay yetkisi olan modül | 24 |
| Atanan dashboard widget | 19 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `branch_status`
4. `sla_tracker`
5. `open_tickets`
6. `staff_count`
7. `leave_requests`
8. `ik_summary`
9. `factory_production`
10. `qc_stats`
11. `financial_overview`
12. `pdks_overview`
13. `pending_orders`
14. `equipment_faults`
15. `equipment_maintenance`
16. `training_progress`
17. `customer_feedback`
18. `crm_summary`
19. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 5
- Personel: 4
- Fabrika: 2
- Finans: 2
- Eğitim: 1
- Müşteri: 2
- Ekipman: 2
- AI: 1

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle, Oluştur, Düzenle, Sil | /akademi, /akademi-mega, /akademi-v3 |
| `academy_admin` | Görüntüle, Oluştur, Düzenle, Sil | /yonetim/akademi, /akademi-hq |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `academy_supervisor` | Görüntüle | /academy-supervisor |
| `accounting` | Görüntüle, Oluştur, Düzenle, Sil | /muhasebe, /muhasebe-centrum, /mali-yonetim |
| `achievements` | Görüntüle, Oluştur, Düzenle | /akademi-achievements |
| `adaptive_engine` | Görüntüle, Düzenle | /akademi-adaptive-engine |
| `admin_settings` | Görüntüle | /yonetim/ayarlar, /admin-mega, /admin/* |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle, Oluştur, Düzenle, Sil | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle, Oluştur, Düzenle, Sil | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inspection` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /coach-sube-denetim, /denetimler |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle, Düzenle | /vardiyalar, /canli-takip |
| `branches` | Görüntüle, Oluştur, Düzenle, Sil | /subeler, /sube/:id |
| `bulk_data` | Görüntüle, Düzenle | /admin/toplu-veri-yonetimi |
| `certificates` | Görüntüle, Oluştur, Düzenle, Sil | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle, Sil | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `complaints` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /crm, /crm-mega |
| `cost_management` | Görüntüle, Oluştur, Düzenle, Sil | /mali-yonetim, /maliyet-analizi |
| `crm_analytics` | Görüntüle | /crm |
| `crm_campaigns` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /kampanya-yonetimi |
| `crm_complaints` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /crm |
| `crm_dashboard` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /crm, /crm-mega |
| `crm_feedback` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /branch-feedback, /misafir-geri-bildirim |
| `crm_settings` | Görüntüle, Düzenle | /guest-form-settings |
| `customer_satisfaction` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Oluştur, Düzenle, Sil | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle, Düzenle, Onayla | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle, Oluştur, Düzenle, Onayla | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle | /fabrika/kiosk |
| `factory_production` | Görüntüle, Oluştur, Düzenle, Sil | /fabrika, /fabrika-uretim-modu, /mrp-daily-plan |
| `factory_quality` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle, Oluştur, Düzenle, Sil | /fabrika |
| `factory_stations` | Görüntüle, Oluştur, Düzenle, Sil | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /ariza, /ariza/:id |
| `food_safety` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /gida-guvenligi-dashboard |
| `goods_receipt` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-mega |
| `hr` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle, Oluştur, Düzenle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Oluştur, Düzenle, Onayla | /leave-requests |
| `lost_found` | Görüntüle, Oluştur, Düzenle, Sil | /kayip-esya |
| `lost_found_hq` | Görüntüle, Oluştur, Düzenle, Sil | /kayip-esya-hq |
| `messages` | Görüntüle, Oluştur, Sil | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Oluştur, Düzenle, Onayla | /overtime-requests |
| `performance` | Görüntüle | /performance, /my-performance |
| `product_complaints` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /projeler, /proje/:id, /yeni-sube-projeler |
| `purchase_orders` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /satinalma-mega |
| `quality_audit` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle, Oluştur, Düzenle, Sil | /vardiyalar, /vardiya-planlama |
| `settings` | Görüntüle, Düzenle | /yonetim/ayarlar |
| `shifts` | Görüntüle, Oluştur, Düzenle, Sil | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle, Oluştur, Düzenle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-centrum |
| `support` | Görüntüle, Oluştur, Düzenle, Sil | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle, Oluştur, Düzenle | /akademi-team-competitions |
| `training` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /akademi, /akademi-mega, /training-assign |
| `users` | Görüntüle, Oluştur, Düzenle, Sil | /yonetim/kullanicilar, /personel/:id |

---

## 4. Akademi Erişimi
- `academy`: Görüntüle, Oluştur, Düzenle, Sil
- `academy_admin`: Görüntüle, Oluştur, Düzenle, Sil
- `badges`: Görüntüle, Oluştur, Düzenle, Sil
- `certificates`: Görüntüle, Oluştur, Düzenle, Sil
- `leaderboard`: Görüntüle
- `achievements`: Görüntüle, Oluştur, Düzenle
- `team_competitions`: Görüntüle, Oluştur, Düzenle
- `academy_analytics`: Görüntüle
- `progress_overview`: Görüntüle
- `cohort_analytics`: Görüntüle
- `branch_analytics`: Görüntüle
- `learning_paths`: Görüntüle, Oluştur, Düzenle
- `adaptive_engine`: Görüntüle, Düzenle
- `social_groups`: Görüntüle, Oluştur, Düzenle
- `academy_supervisor`: Görüntüle
- `academy_ai`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Sabah (08:30–10:00)
1. **Login** → `/` (HomeScreen) → AI brifing widget özet (kritik uyarılar).
2. **Sistem sağlık** → `/yonetim/ayarlar` → modül flag durumu, son audit log.
3. **Bekleyen onaylar** → `todays_tasks` widget → bordro/satın alma onayları.
4. **Kullanıcı yönetimi** → yeni personel onaylama, rol atama (`/yonetim/kullanicilar`).

### Öğleden Önce (10:00–12:00)
5. **Şube setup status** → `/admin/branch-setup-status` → henüz onboard olmamış şubeler.
6. **Audit log inceleme** → `/admin/aktivite-loglari` → son 24 saat anomaliler.
7. **Banner/Duyuru** → `/admin/duyurular` → günlük platform geneli mesaj.

### Öğleden Sonra (13:00–17:00)
8. **Mali genel görünüm** → `financial_overview` widget → ay sonu yaklaşımı (28. gün).
9. **Fabrika & şube karşılaştırma** → `branch_status` widget → kırmızı KPI'ler.
10. **Mr. Dobody flow** → `/agent-merkezi` → otomatik gap detection sonuçları.

### Akşam (17:00–19:00)
11. **Yedekleme tetikle** → `/admin/yedekleme` → günlük backup kontrolü.
12. **Email & SMTP test** → `/admin/email-ayarlari`.
13. **Pilot launch readiness** (28 Nis öncesi) → `/pilot-baslat` → reset & ilk kullanıcı şifre rotasyonu.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
**Bu rol görev doğrulayabilir**: ✅ Evet  
**Bu role atanan tipik görevler**:
- Stratejik karar gerektiren onaylar
- Aylık review meeting katılımı
- Pilot/launch koordinasyonu

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `tasks` | Onay/Reddetme | POST /api/tasks/:id/verify |
| `equipment_faults` | Onay/Reddetme | POST /api/equipment-faults/:id/approve |
| `faults` | Onay/Reddetme | POST /api/faults/:id/approve |
| `knowledge_base` | Onay/Reddetme | POST /api/knowledge-base/:id/publish |
| `employees` | Onay/Reddetme | POST /api/employees/:id/approve-onboarding |
| `hr` | Onay/Reddetme | POST /api/hr/disciplinary/:id/approve |
| `training` | Onay/Reddetme | POST /api/training/:id/approve |
| `complaints` | Onay/Reddetme | POST /api/complaints/:id/resolve |
| `leave_requests` | Onay/Reddetme | POST /api/leave-requests/:id/approve |
| `overtime_requests` | Onay/Reddetme | POST /api/overtime-requests/:id/approve |
| `customer_satisfaction` | Onay/Reddetme | POST /api/customer-satisfaction/:id/respond |
| `projects` | Onay/Reddetme | POST /api/projects/:id/approve |
| `quality_audit` | Onay/Reddetme | POST /api/quality-audits/:id/approve |
| `factory_quality` | Onay/Reddetme | POST /api/factory-quality/:id/approve |
| `factory_compliance` | Onay/Reddetme | POST /api/factory-compliance/:id/approve |
| `factory_food_safety` | Onay/Reddetme | POST /api/factory-food-safety/:id/approve |
| `purchase_orders` | Onay/Reddetme | POST /api/purchase-orders/:id/approve |
| `branch_inspection` | Onay/Reddetme | POST /api/branch-inspections/:id/approve |
| `product_complaints` | Onay/Reddetme | POST /api/product-complaints/:id/resolve |
| `food_safety` | Onay/Reddetme | POST /api/food-safety/:id/approve |
| `crm_dashboard` | Onay/Reddetme | POST /api/crm/complaints/:id/resolve |
| `crm_feedback` | Onay/Reddetme | POST /api/crm/feedback/:id/resolve |
| `crm_complaints` | Onay/Reddetme | POST /api/crm/complaints/:id/escalate |
| `crm_campaigns` | Onay/Reddetme | POST /api/crm/campaigns/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni izin başvurusu** → personel başvurduğunda anında push + bildirim merkezi.
- **Yeni mesai başvurusu** → benzer şekilde.
- **Kritik arıza** → severity=critical/high tetikler.
- **Satın alma siparişi onay bekliyor** → ₺ eşik üstü.
- **Yeni şikâyet** → çevrimiçi formda (kanıt: QR feedback) yeni kayıt.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Audit log anomali** (örn. 10+ failed login).
- **Disk/DB usage > %80**.
- **Yeni kullanıcı onaylama bekliyor**.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[KRİTİK]** Global `module_flags.is_enabled=false` modüller: delegasyon, dobody.flow, iletisim_merkezi, fabrika.hammadde, fabrika.kalite, fabrika.kavurma, fabrika.sayim, fabrika.sevkiyat, fabrika.siparis, fabrika.stok, stok, dobody.chat, checklist (branch scope) → Pilot öncesi audit gerekli.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 5 aktif kullanıcı pilotta yer alacak.
- 🔑 Pilot başlangıç: adminhq parolası `0000` (Pzt 09:00 rotate edilecek).
- 🔄 `/pilot-baslat` sayfası ile sistem reset (notifikasyon, audit log, score temizliği).



---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
