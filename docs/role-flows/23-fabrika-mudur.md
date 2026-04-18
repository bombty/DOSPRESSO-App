# Fabrika Müdürü
**Rol Kodu**: `fabrika_mudur`  
**Kategori**: FACTORY  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Fabrika operasyon yönetimi, üretim planlama, kalite, sevkiyat, personel, mali sorumluluk.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 55 |
| Yazma yetkisi olan modül | 25 |
| Onay yetkisi olan modül | 3 |
| Atanan dashboard widget | 10 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `factory_production`
2. `equipment_faults`
3. `equipment_maintenance`
4. `qc_stats`
5. `staff_count`
6. `pending_shipments`
7. `todays_tasks`
8. `financial_overview`
9. `ai_briefing`
10. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 2
- Personel: 1
- Fabrika: 3
- Finans: 1
- Eğitim: 0
- Müşteri: 0
- Ekipman: 2
- AI: 1

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `achievements` | Görüntüle | /akademi-achievements |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `complaints` | Görüntüle | /crm, /crm-mega |
| `cost_management` | Görüntüle, Oluştur, Düzenle | /mali-yonetim, /maliyet-analizi |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle, Düzenle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Düzenle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle, Düzenle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle, Düzenle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle, Oluştur, Düzenle | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle, Düzenle | /fabrika/kiosk |
| `factory_production` | Görüntüle, Oluştur, Düzenle | /fabrika, /fabrika-uretim-modu, /mrp-daily-plan |
| `factory_quality` | Görüntüle, Oluştur, Düzenle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle, Oluştur, Düzenle | /fabrika |
| `factory_stations` | Görüntüle, Oluştur, Düzenle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id |
| `goods_receipt` | Görüntüle, Oluştur, Düzenle | /satinalma-mega |
| `hr` | Görüntüle | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle, Düzenle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle, Onayla | /leave-requests |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle, Onayla | /overtime-requests |
| `performance` | Görüntüle, Düzenle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `purchase_orders` | Görüntüle | /satinalma-mega |
| `quality_audit` | Görüntüle | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle, Düzenle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle, Düzenle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle | /satinalma-centrum |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle, Onayla | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle | /akademi-team-competitions |
| `training` | Görüntüle | /akademi, /akademi-mega, /training-assign |

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
- `learning_paths`: Görüntüle
- `social_groups`: Görüntüle
- `academy_ai`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Sabah (06:30–08:30)
1. **Fabrika kiosk** → `/fabrika/kiosk` → vardiya açılış (06:30).
2. **Üretim planı** → `/mrp-daily-plan` → bugünkü hedef batch'ler.
3. **Hammadde stok** → `/fabrika/stok-merkezi` → kritik malzemeler (donut hammadde 29 adet).

### Üretim (08:30–17:00)
4. **Üretim takibi** → `factory_production` widget → batch progress.
5. **Kalite check** → `qc_stats` widget → fire oranı (%5 üzeri alarm).
6. **Ekipman bakım** → `equipment_maintenance` widget → planlı bakım.
7. **Personel takibi** → `staff_count` widget → fabrika çalışanı durumu.

### Sevkiyat (17:00–19:00)
8. **Sevkiyat hazırlık** → `pending_shipments` widget → şube siparişleri.
9. **Mali özet** → `financial_overview` → fabrika maliyet & verim.
10. **CAPA & şikâyet** → şube kalite şikâyeti varsa CAPA aç.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
**Bu rol görev doğrulayabilir**: ✅ Evet  
**Bu role atanan tipik görevler**:
- Üretim batch tamamlama
- Kalite kontrol
- Sevkiyat hazırlık
- Atık (fire) raporlama

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `tasks` | Onay/Reddetme | POST /api/tasks/:id/verify |
| `leave_requests` | Onay/Reddetme | POST /api/leave-requests/:id/approve |
| `overtime_requests` | Onay/Reddetme | POST /api/overtime-requests/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Yeni izin başvurusu** → personel başvurduğunda anında push + bildirim merkezi.
- **Yeni mesai başvurusu** → benzer şekilde.
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Üretim hedef sapması** → batch <%80 hedef.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[YÜKSEK]** İzin onay yetkisi var ama `leave_requests` widget atanmamış → onay bekleyen izinler dashboard'da görünmüyor.
2. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
