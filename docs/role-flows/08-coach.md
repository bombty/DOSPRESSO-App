# Coach (Saha Koçu)
**Rol Kodu**: `coach`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 2  
**Görev**: Şube denetim, koçluk seans, gelişim planı, kalite uyum, KPI gözlem, supervisor onboarding.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 62 |
| Yazma yetkisi olan modül | 30 |
| Onay yetkisi olan modül | 11 |
| Atanan dashboard widget | 12 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `branch_status`
4. `training_progress`
5. `quick_actions`
6. `equipment_status`
7. `customer_feedback`
8. `checklist_status`
9. `open_tickets`
10. `pdks_absence`
11. `shift_compliance`
12. `sla_tickets`

**Kategori dağılımı**:
- Operasyon: 5
- Personel: 1
- Fabrika: 0
- Finans: 0
- Eğitim: 1
- Müşteri: 1
- Ekipman: 1
- AI: 1

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle, Oluştur, Düzenle | /akademi, /akademi-mega, /akademi-v3 |
| `academy_admin` | Görüntüle, Düzenle | /yonetim/akademi, /akademi-hq |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `academy_supervisor` | Görüntüle | /academy-supervisor |
| `achievements` | Görüntüle, Oluştur, Düzenle | /akademi-achievements |
| `adaptive_engine` | Görüntüle, Düzenle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle, Oluştur, Düzenle, Sil | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle, Oluştur, Düzenle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inspection` | Görüntüle, Oluştur, Düzenle, Onayla | /coach-sube-denetim, /denetimler |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle, Düzenle | /vardiyalar, /canli-takip |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `bulk_data` | Görüntüle, Düzenle | /admin/toplu-veri-yonetimi |
| `certificates` | Görüntüle, Oluştur, Düzenle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `complaints` | Görüntüle, Düzenle | /crm, /crm-mega |
| `crm_complaints` | Görüntüle | /crm |
| `crm_dashboard` | Görüntüle | /crm, /crm-mega |
| `crm_feedback` | Görüntüle | /branch-feedback, /misafir-geri-bildirim |
| `customer_satisfaction` | Görüntüle, Oluştur, Düzenle, Onayla | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle | /gida-guvenligi-dashboard |
| `factory_quality` | Görüntüle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle | /fabrika |
| `faults` | Görüntüle | /ariza, /ariza/:id |
| `hr` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /ik, /hr-reports, /personel-onboarding |
| `knowledge_base` | Görüntüle, Oluştur, Düzenle, Onayla | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle, Oluştur, Düzenle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Onayla | /leave-requests |
| `lost_found` | Görüntüle, Oluştur, Düzenle | /kayip-esya |
| `lost_found_hq` | Görüntüle | /kayip-esya-hq |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Onayla | /overtime-requests |
| `performance` | Görüntüle | /performance, /my-performance |
| `product_complaints` | Görüntüle | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle, Oluştur, Düzenle, Onayla | /projeler, /proje/:id, /yeni-sube-projeler |
| `quality_audit` | Görüntüle, Oluştur, Düzenle, Onayla | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle, Oluştur, Düzenle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle, Oluştur, Düzenle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `support` | Görüntüle, Oluştur, Düzenle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle, Oluştur, Düzenle | /akademi-team-competitions |
| `training` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /akademi, /akademi-mega, /training-assign |

---

## 4. Akademi Erişimi
- `academy`: Görüntüle, Oluştur, Düzenle
- `academy_admin`: Görüntüle, Düzenle
- `badges`: Görüntüle, Oluştur, Düzenle
- `certificates`: Görüntüle, Oluştur, Düzenle
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
### Tipik Günlük Akış
1. **Login** → `/` ana sayfa → role-based dashboard.
2. **Bekleyen görevler** → `todays_tasks` veya rol-spesifik widget.
3. **Modül erişimi** → yetkili modüllerde günlük operasyon.
4. **Bildirim & onay** → bildirim merkezi (`/notifications`).
5. **Raporlama** (yetki varsa) → `/raporlar` veya rol-spesifik dashboard.
6. **Vardiya kapanış** → `vardiya-checkin` veya `/vardiyalarim`.

> **Not**: Şube denetim, koçluk seans, gelişim planı, kalite uyum, KPI gözlem, supervisor onboarding.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
**Bu rol görev doğrulayabilir**: ✅ Evet  
**Bu role atanan tipik görevler**:
- Departman özel görevleri
- Şube destek talepleri
- Periyodik raporlama

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `tasks` | Onay/Reddetme | POST /api/tasks/:id/verify |
| `knowledge_base` | Onay/Reddetme | POST /api/knowledge-base/:id/publish |
| `employees` | Onay/Reddetme | POST /api/employees/:id/approve-onboarding |
| `hr` | Onay/Reddetme | POST /api/hr/disciplinary/:id/approve |
| `training` | Onay/Reddetme | POST /api/training/:id/approve |
| `leave_requests` | Onay/Reddetme | POST /api/leave-requests/:id/approve |
| `overtime_requests` | Onay/Reddetme | POST /api/overtime-requests/:id/approve |
| `customer_satisfaction` | Onay/Reddetme | POST /api/customer-satisfaction/:id/respond |
| `branch_inspection` | Onay/Reddetme | POST /api/branch-inspections/:id/approve |
| `projects` | Onay/Reddetme | POST /api/projects/:id/approve |
| `quality_audit` | Onay/Reddetme | POST /api/quality-audits/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni izin başvurusu** → personel başvurduğunda anında push + bildirim merkezi.
- **Yeni mesai başvurusu** → benzer şekilde.
- **Yeni şikâyet** → çevrimiçi formda (kanıt: QR feedback) yeni kayıt.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[YÜKSEK]** İzin onay yetkisi var ama `leave_requests` widget atanmamış → onay bekleyen izinler dashboard'da görünmüyor.
2. **[DÜŞÜK]** Fabrika yetkisi var ama `factory_production` widget atanmamış.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 2 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
