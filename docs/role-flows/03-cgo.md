# CGO (Operasyon GM)
**Rol Kodu**: `cgo`  
**Kategori**: EXECUTIVE  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Operasyonel mükemmellik, şube performans, sahaya iniş, tedarik zinciri orkestrasyonu.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 74 |
| Yazma yetkisi olan modül | 15 |
| Onay yetkisi olan modül | 5 |
| Atanan dashboard widget | 11 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `branch_status`
4. `sla_tracker`
5. `open_tickets`
6. `staff_count`
7. `factory_production`
8. `customer_feedback`
9. `training_progress`
10. `quick_actions`
11. `pdks_overview`

**Kategori dağılımı**:
- Operasyon: 5
- Personel: 2
- Fabrika: 1
- Finans: 0
- Eğitim: 1
- Müşteri: 1
- Ekipman: 0
- AI: 1

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `academy_supervisor` | Görüntüle | /academy-supervisor |
| `accounting` | Görüntüle | /muhasebe, /muhasebe-centrum, /mali-yonetim |
| `achievements` | Görüntüle | /akademi-achievements |
| `adaptive_engine` | Görüntüle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle, Oluştur, Düzenle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inspection` | Görüntüle | /coach-sube-denetim, /denetimler |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle | /vardiyalar, /canli-takip |
| `branches` | Görüntüle, Düzenle | /subeler, /sube/:id |
| `bulk_data` | Görüntüle | /admin/toplu-veri-yonetimi |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `complaints` | Görüntüle | /crm, /crm-mega |
| `cost_management` | Görüntüle | /mali-yonetim, /maliyet-analizi |
| `crm_analytics` | Görüntüle | /crm |
| `crm_campaigns` | Görüntüle, Oluştur, Düzenle, Onayla | /kampanya-yonetimi |
| `crm_complaints` | Görüntüle, Oluştur, Düzenle, Onayla | /crm |
| `crm_dashboard` | Görüntüle, Oluştur, Düzenle, Onayla | /crm, /crm-mega |
| `crm_feedback` | Görüntüle, Oluştur, Düzenle, Onayla | /branch-feedback, /misafir-geri-bildirim |
| `crm_settings` | Görüntüle, Düzenle | /guest-form-settings |
| `customer_satisfaction` | Görüntüle | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle | /fabrika/kiosk |
| `factory_quality` | Görüntüle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle | /fabrika |
| `factory_stations` | Görüntüle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle | /ariza, /ariza/:id |
| `goods_receipt` | Görüntüle | /satinalma-mega |
| `hr` | Görüntüle | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle | /leave-requests |
| `lost_found` | Görüntüle | /kayip-esya |
| `lost_found_hq` | Görüntüle | /kayip-esya-hq |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle | /overtime-requests |
| `performance` | Görüntüle, Düzenle | /performance, /my-performance |
| `product_complaints` | Görüntüle | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle, Oluştur, Düzenle | /projeler, /proje/:id, /yeni-sube-projeler |
| `purchase_orders` | Görüntüle | /satinalma-mega |
| `quality_audit` | Görüntüle | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle | /satinalma-centrum |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle | /akademi-team-competitions |
| `training` | Görüntüle | /akademi, /akademi-mega, /training-assign |
| `users` | Görüntüle | /yonetim/kullanicilar, /personel/:id |

---

## 4. Akademi Erişimi
- `academy`: Görüntüle
- `badges`: Görüntüle
- `certificates`: Görüntüle
- `leaderboard`: Görüntüle
- `achievements`: Görüntüle
- `team_competitions`: Görüntüle
- `academy_analytics`: Görüntüle
- `progress_overview`: Görüntüle
- `cohort_analytics`: Görüntüle
- `branch_analytics`: Görüntüle
- `learning_paths`: Görüntüle
- `adaptive_engine`: Görüntüle
- `social_groups`: Görüntüle
- `academy_supervisor`: Görüntüle
- `academy_ai`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Sabah (07:30–09:30)
1. **Operasyon brifing** → `/cgo-command-center` → 20 şube + fabrika açılış kontrolü.
2. **Vardiya açılış** → `shift_compliance` (coach widget benzeri yok — gap).
3. **Kritik arıza/SLA** → `sla_tracker`, `open_tickets`.

### Öğle (10:00–13:00)
4. **Şube performans toplantısı** → coach'larla iletişim.
5. **Tedarik zinciri** → satın alma süreçleri, fabrika sevkiyat planı.
6. **Acil eskalasyon** → kalite şikâyeti, ekipman hattı durması.

### Öğleden Sonra (14:00–18:00)
7. **Operasyon raporları** → `/raporlar-hub`.
8. **Ekip değerlendirme** → `/admin/yonetici-degerlendirme`.
9. **Pilot lokasyon koordinasyonu** (28 Nis öncesi 4 lokasyon).
10. **Akşam kapanış kontrolü** → 19:00–21:00 vardiya kapanış.

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
| `crm_dashboard` | Onay/Reddetme | POST /api/crm/complaints/:id/resolve |
| `crm_feedback` | Onay/Reddetme | POST /api/crm/feedback/:id/resolve |
| `crm_complaints` | Onay/Reddetme | POST /api/crm/complaints/:id/escalate |
| `crm_campaigns` | Onay/Reddetme | POST /api/crm/campaigns/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni şikâyet** → çevrimiçi formda (kanıt: QR feedback) yeni kayıt.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Stratejik KPI sapması** (ay sonu hedefin %20+ altı).
- **Kritik müşteri şikâyeti** (sosyal medya viral riski).

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[ORTA]** Muhasebe yetkisi var ama `financial_overview` widget atanmamış.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
