# Şube Müdürü
**Rol Kodu**: `mudur`  
**Kategori**: BRANCH  
**Aktif Kullanıcı Sayısı**: 37  
**Görev**: Şube günlük operasyon, ekip yönetimi, mali sorumluluk, KPI takip, izin/mesai onay.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 49 |
| Yazma yetkisi olan modül | 25 |
| Onay yetkisi olan modül | 6 |
| Atanan dashboard widget | 10 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `branch_status`
2. `staff_count`
3. `leave_requests`
4. `todays_tasks`
5. `customer_feedback`
6. `equipment_faults`
7. `financial_overview`
8. `sla_tracker`
9. `quick_actions`
10. `pdks_attendance`

**Kategori dağılımı**:
- Operasyon: 4
- Personel: 3
- Fabrika: 0
- Finans: 1
- Eğitim: 0
- Müşteri: 1
- Ekipman: 1
- AI: 0

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `accounting` | Görüntüle | /muhasebe, /muhasebe-centrum, /mali-yonetim |
| `achievements` | Görüntüle | /akademi-achievements |
| `adaptive_engine` | Görüntüle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle, Oluştur | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inspection` | Görüntüle | /coach-sube-denetim, /denetimler |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle, Düzenle | /vardiyalar, /canli-takip |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle, Onayla | /checklists, /yonetim/checklistler, /checklist-takip |
| `complaints` | Görüntüle, Oluştur, Düzenle | /crm, /crm-mega |
| `crm_feedback` | Görüntüle | /branch-feedback, /misafir-geri-bildirim |
| `customer_satisfaction` | Görüntüle, Oluştur, Düzenle | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Düzenle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id, /ariza-yeni |
| `faults` | Görüntüle, Oluştur, Düzenle, Sil | /ariza, /ariza/:id |
| `hr` | Görüntüle, Oluştur, Düzenle, Sil | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Oluştur, Düzenle, Onayla | /leave-requests |
| `lost_found` | Görüntüle, Oluştur, Düzenle, Sil | /kayip-esya |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Oluştur, Düzenle, Onayla | /overtime-requests |
| `performance` | Görüntüle, Düzenle | /performance, /my-performance |
| `product_complaints` | Görüntüle, Oluştur, Düzenle | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `schedules` | Görüntüle, Oluştur, Düzenle, Sil | /vardiyalar, /vardiya-planlama |
| `settings` | Görüntüle, Düzenle | /yonetim/ayarlar |
| `shifts` | Görüntüle, Oluştur, Düzenle, Sil | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `support` | Görüntüle, Oluştur | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle | /akademi-team-competitions |
| `training` | Görüntüle, Onayla | /akademi, /akademi-mega, /training-assign |

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
- `branch_analytics`: Görüntüle
- `learning_paths`: Görüntüle
- `adaptive_engine`: Görüntüle
- `social_groups`: Görüntüle
- `academy_ai`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Vardiya Öncesi (07:00–08:00)
1. **Login** → `/` (BranchManagerHome) → şube açılış checklist.
2. **PDKS yoklama** → `pdks_attendance` widget → bugünkü vardiya kim geldi/gelmedi.
3. **Stok kontrol** → `/sube/siparis-stok` → kritik altı malzemeler.

### Vardiya İçi (08:00–14:00 + 14:00–22:00)
4. **Açık görevler** → `todays_tasks` widget → günlük checklist.
5. **Müşteri şikâyeti** → `customer_feedback` widget → derhal aksiyon.
6. **Ekipman arıza** → `equipment_faults` widget → teknik servis tetikle.
7. **İzin/mesai onay** → `leave_requests` widget → personel başvuruları.
8. **Coach denetim** → coach geldiğinde denetim formu doldur.

### Mali & Kapanış (18:00–22:00)
9. **Kasa raporu** → `/cash-reports` → günlük gelir kayıt.
10. **Mali özet** → `financial_overview` widget → bugünkü ciro & gider.
11. **Şube skoru** → `branch_score_detail` (gap: supervisor'da var, mudur'da yok!).
12. **Kapanış checklist** → temizlik, alarm, kasa devir.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
**Bu rol görev doğrulayabilir**: ✅ Evet  
**Bu role atanan tipik görevler**:
- Şube checklist (açılış, kapanış, periyodik temizlik)
- Müşteri şikâyet aksiyonu
- Eğitim modülü tamamlama

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `tasks` | Onay/Reddetme | POST /api/tasks/:id/verify |
| `checklists` | Onay/Reddetme | _(endpoint eşleşmesi belirsiz)_ |
| `employees` | Onay/Reddetme | POST /api/employees/:id/approve-onboarding |
| `training` | Onay/Reddetme | POST /api/training/:id/approve |
| `leave_requests` | Onay/Reddetme | POST /api/leave-requests/:id/approve |
| `overtime_requests` | Onay/Reddetme | POST /api/overtime-requests/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni izin başvurusu** → personel başvurduğunda anında push + bildirim merkezi.
- **Yeni mesai başvurusu** → benzer şekilde.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Vardiya başlama hatırlatması** → 30 dk önce kişiye özel.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 37 aktif kullanıcı pilotta yer alacak.


- Pilot şubelerde `setup_complete=false` ise `BranchOnboardingWizard` otomatik açılır.

---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
