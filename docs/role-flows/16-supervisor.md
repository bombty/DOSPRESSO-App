# Şube Supervisor
**Rol Kodu**: `supervisor`  
**Kategori**: BRANCH  
**Aktif Kullanıcı Sayısı**: 38  
**Görev**: Vardiya supervizyonu, çekirdek ekip yönetimi, kalite gözlem, eğitim takibi.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 44 |
| Yazma yetkisi olan modül | 21 |
| Onay yetkisi olan modül | 6 |
| Atanan dashboard widget | 11 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `branch_status`
2. `staff_count`
3. `leave_requests`
4. `todays_tasks`
5. `customer_feedback`
6. `equipment_faults`
7. `sla_tracker`
8. `quick_actions`
9. `training_progress`
10. `branch_score_detail`
11. `pdks_attendance`

**Kategori dağılımı**:
- Operasyon: 4
- Personel: 3
- Fabrika: 0
- Finans: 0
- Eğitim: 1
- Müşteri: 1
- Ekipman: 1
- AI: 0

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `achievements` | Görüntüle | /akademi-achievements |
| `adaptive_engine` | Görüntüle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
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
| `employees` | Görüntüle, Oluştur, Düzenle, Onayla | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id, /ariza-yeni |
| `faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id |
| `hr` | Görüntüle, Oluştur, Düzenle, Sil | /ik, /hr-reports, /personel-onboarding |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Oluştur, Onayla | /leave-requests |
| `lost_found` | Görüntüle, Oluştur, Düzenle | /kayip-esya |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Oluştur, Onayla | /overtime-requests |
| `performance` | Görüntüle | /performance, /my-performance |
| `product_complaints` | Görüntüle, Oluştur | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `schedules` | Görüntüle, Oluştur, Düzenle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle, Oluştur, Düzenle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `support` | Görüntüle, Oluştur | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
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
- `progress_overview`: Görüntüle
- `learning_paths`: Görüntüle
- `adaptive_engine`: Görüntüle
- `social_groups`: Görüntüle
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

> **Not**: Vardiya supervizyonu, çekirdek ekip yönetimi, kalite gözlem, eğitim takibi.

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
✅ Bu rol için kritik gap tespit edilmedi.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 38 aktif kullanıcı pilotta yer alacak.


- Pilot şubelerde `setup_complete=false` ise `BranchOnboardingWizard` otomatik açılır.

---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
