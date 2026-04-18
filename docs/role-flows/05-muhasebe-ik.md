# Muhasebe & İK Sorumlusu
**Rol Kodu**: `muhasebe_ik`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 2  
**Görev**: Bordro hesaplama, izin/mesai onayı, personel özlük, finansal kayıt, PDKS bordro sürümü.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 59 |
| Yazma yetkisi olan modül | 12 |
| Onay yetkisi olan modül | 2 |
| Atanan dashboard widget | 8 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `ik_summary`
4. `staff_count`
5. `leave_requests`
6. `financial_overview`
7. `quick_actions`
8. `pdks_payroll`

**Kategori dağılımı**:
- Operasyon: 2
- Personel: 4
- Fabrika: 0
- Finans: 1
- Eğitim: 0
- Müşteri: 0
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
| `accounting` | Görüntüle, Oluştur, Düzenle, Sil | /muhasebe, /muhasebe-centrum, /mali-yonetim |
| `achievements` | Görüntüle | /akademi-achievements |
| `adaptive_engine` | Görüntüle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branch_shift_tracking` | Görüntüle | /vardiyalar, /canli-takip |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `bulk_data` | Görüntüle, Düzenle | /admin/toplu-veri-yonetimi |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `complaints` | Görüntüle | /crm, /crm-mega |
| `cost_management` | Görüntüle, Oluştur, Düzenle | /mali-yonetim, /maliyet-analizi |
| `customer_satisfaction` | Görüntüle | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle, Oluştur, Düzenle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `faults` | Görüntüle | /ariza, /ariza/:id |
| `goods_receipt` | Görüntüle | /satinalma-mega |
| `hr` | Görüntüle, Oluştur, Düzenle | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Düzenle, Onayla | /leave-requests |
| `lost_found` | Görüntüle | /kayip-esya |
| `lost_found_hq` | Görüntüle | /kayip-esya-hq |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Düzenle, Onayla | /overtime-requests |
| `performance` | Görüntüle | /performance, /my-performance |
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
| `tasks` | Görüntüle | /gorevler, /tasks, /task-atama, /task-takip |
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
### Tipik Günlük Akış
1. **Login** → `/` ana sayfa → role-based dashboard.
2. **Bekleyen görevler** → `todays_tasks` veya rol-spesifik widget.
3. **Modül erişimi** → yetkili modüllerde günlük operasyon.
4. **Bildirim & onay** → bildirim merkezi (`/notifications`).
5. **Raporlama** (yetki varsa) → `/raporlar` veya rol-spesifik dashboard.
6. **Vardiya kapanış** → `vardiya-checkin` veya `/vardiyalarim`.

> **Not**: Bordro hesaplama, izin/mesai onayı, personel özlük, finansal kayıt, PDKS bordro sürümü.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ❌ Hayır  
**Bu rol görev doğrulayabilir**: ❌ Hayır  
**Bu role atanan tipik görevler**:
- Departman özel görevleri
- Şube destek talepleri
- Periyodik raporlama

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `leave_requests` | Onay/Reddetme | POST /api/leave-requests/:id/approve |
| `overtime_requests` | Onay/Reddetme | POST /api/overtime-requests/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni izin başvurusu** → personel başvurduğunda anında push + bildirim merkezi.
- **Yeni mesai başvurusu** → benzer şekilde.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 2 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
