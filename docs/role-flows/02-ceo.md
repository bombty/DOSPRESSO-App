# CEO
**Rol Kodu**: `ceo`  
**Kategori**: EXECUTIVE  
**Aktif Kullanıcı Sayısı**: 3  
**Görev**: Stratejik karar, marka vizyon, mali genel görünüm, üst düzey KPI takip ve onay.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 75 |
| Yazma yetkisi olan modül | 6 |
| Onay yetkisi olan modül | 1 |
| Atanan dashboard widget | 15 |
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
8. `crm_summary`
9. `qc_stats`
10. `financial_overview`
11. `customer_feedback`
12. `equipment_faults`
13. `pdks_overview`
14. `training_progress`
15. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 5
- Personel: 2
- Fabrika: 2
- Finans: 1
- Eğitim: 1
- Müşteri: 2
- Ekipman: 1
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
| `announcements` | Görüntüle, Oluştur | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inspection` | Görüntüle | /coach-sube-denetim, /denetimler |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle | /vardiyalar, /canli-takip |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `bulk_data` | Görüntüle | /admin/toplu-veri-yonetimi |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `complaints` | Görüntüle | /crm, /crm-mega |
| `cost_management` | Görüntüle | /mali-yonetim, /maliyet-analizi |
| `crm_analytics` | Görüntüle | /crm |
| `crm_campaigns` | Görüntüle | /kampanya-yonetimi |
| `crm_complaints` | Görüntüle | /crm |
| `crm_dashboard` | Görüntüle | /crm, /crm-mega |
| `crm_feedback` | Görüntüle | /branch-feedback, /misafir-geri-bildirim |
| `crm_settings` | Görüntüle | /guest-form-settings |
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
| `food_safety` | Görüntüle | /gida-guvenligi-dashboard |
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
| `performance` | Görüntüle | /performance, /my-performance |
| `product_complaints` | Görüntüle | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle | /projeler, /proje/:id, /yeni-sube-projeler |
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
| `tasks` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
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
### Sabah (08:00–10:00)
1. **AI brifing** → kritik şube/fabrika alarmları.
2. **CEO Command Center** → `/ceo-command-center` → 22 lokasyon health snapshot.
3. **Mali özet** → bugünkü ciro, geçen ay karşılaştırma.

### Öğleden Önce (10:00–13:00)
4. **Strategic decision sessions** (toplantı, platform dışı).
5. **Yatırımcı raporlamaları** → `/franchise-ozet`, `/franchise-yatirimcilar`.
6. **Kalite skorları** → `qc_stats` widget → fabrika kalite trendi.

### Öğleden Sonra (14:00–18:00)
7. **Marka operasyonu** → kampanya onayları (CGO ile koordinasyon).
8. **Şube ziyaret planları** (sahaya iniş).
9. **Müşteri geri bildirim trendi** → `customer_feedback` widget → markaya etki.
10. **Eğitim & yetenek havuzu** → `training_progress` widget.

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

---

## 8. Bildirim Tetikleyicileri
- **Yeni şikâyet** → çevrimiçi formda (kanıt: QR feedback) yeni kayıt.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Stratejik KPI sapması** (ay sonu hedefin %20+ altı).
- **Kritik müşteri şikâyeti** (sosyal medya viral riski).

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
✅ Bu rol için kritik gap tespit edilmedi.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 3 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
