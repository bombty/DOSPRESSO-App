# fabrika
**Rol Kodu**: `fabrika`  
**Kategori**: FACTORY  
**Aktif Kullanıcı Sayısı**: ?  
**Görev**: _belirsiz_

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 47 |
| Yazma yetkisi olan modül | 15 |
| Onay yetkisi olan modül | 0 |
| Atanan dashboard widget | 0 |
| Erişilebilen toplam route (tahmini) | 146 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
_(Widget atanmamış — `fabrika-legacy` rolü için `dashboard_role_widgets` tablosunda kayıt yok!)_

**Kategori dağılımı**:
- Operasyon: 0
- Personel: 0
- Fabrika: 0
- Finans: 0
- Eğitim: 0
- Müşteri: 0
- Ekipman: 0
- AI: 0

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
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle, Oluştur, Düzenle | /akademi-badges, /badge-collection |
| `branch_analytics` | Görüntüle | /akademi-branch-analytics |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `certificates` | Görüntüle, Oluştur, Düzenle | /akademi-certificates |
| `checklists` | Görüntüle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cohort_analytics` | Görüntüle | /akademi-cohort-analytics |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle, Oluştur, Düzenle | /fabrika/kiosk |
| `factory_quality` | Görüntüle, Oluştur, Düzenle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle | /fabrika |
| `factory_stations` | Görüntüle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle | /ariza, /ariza/:id |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle, Oluştur, Düzenle | /akademi-learning-paths |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle, Oluştur, Düzenle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `support` | Görüntüle, Oluştur | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle, Oluştur, Düzenle | /akademi-team-competitions |
| `training` | Görüntüle | /akademi, /akademi-mega, /training-assign |

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

> **Not**: 

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ❌ Hayır  
**Bu rol görev doğrulayabilir**: ❌ Hayır  
**Bu role atanan tipik görevler**:
- Üretim batch tamamlama
- Kalite kontrol
- Sevkiyat hazırlık
- Atık (fire) raporlama

---

## 7. Onay Zinciri (Approval Chain)
Bu rol **hiçbir modülde onay (approve) yetkisine sahip değil**. Kendi başvurularını üst rollere iletir:
- İzin başvurusu → `mudur` → `muhasebe_ik`
- Mesai başvurusu → `supervisor`/`mudur` → `muhasebe_ik`
- Eğitim sertifikası → `trainer` → `coach`

---

## 8. Bildirim Tetikleyicileri
- **Üretim hedef sapması** → batch <%80 hedef.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[DÜŞÜK]** Fabrika yetkisi var ama `factory_production` widget atanmamış.
2. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
⚠️ Kullanıcı sayısı bilinmiyor (sayım gerekli).




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
