# Satın Alma Uzmanı
**Rol Kodu**: `satinalma`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Tedarikçi yönetimi, fiyat teklif toplama, satın alma siparişi onay, mal kabul, fabrika & şube ihtiyaç karşılama.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 47 |
| Yazma yetkisi olan modül | 23 |
| Onay yetkisi olan modül | 3 |
| Atanan dashboard widget | 6 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `pending_orders`
4. `pending_shipments`
5. `branch_status`
6. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 3
- Personel: 0
- Fabrika: 1
- Finans: 1
- Eğitim: 0
- Müşteri: 0
- Ekipman: 0
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
| `cost_management` | Görüntüle, Oluştur, Düzenle, Sil | /mali-yonetim, /maliyet-analizi |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Oluştur, Düzenle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Düzenle, Onayla | /ariza, /ariza/:id, /ariza-yeni |
| `faults` | Görüntüle, Düzenle, Onayla | /ariza, /ariza/:id |
| `goods_receipt` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-mega |
| `inventory` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle, Oluştur, Düzenle | /akademi-learning-paths |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle | /projeler, /proje/:id, /yeni-sube-projeler |
| `purchase_orders` | Görüntüle, Oluştur, Düzenle, Sil, Onayla | /satinalma-mega |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle, Oluştur, Düzenle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle, Oluştur, Düzenle, Sil | /satinalma-centrum |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle | /gorevler, /tasks, /task-atama, /task-takip |
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

> **Not**: Tedarikçi yönetimi, fiyat teklif toplama, satın alma siparişi onay, mal kabul, fabrika & şube ihtiyaç karşılama.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
**Bu rol görev doğrulayabilir**: ❌ Hayır  
**Bu role atanan tipik görevler**:
- Departman özel görevleri
- Şube destek talepleri
- Periyodik raporlama

---

## 7. Onay Zinciri (Approval Chain)
| Modül | Onay Aksiyonu | Tetikleyici Endpoint |
|-------|---------------|----------------------|
| `equipment_faults` | Onay/Reddetme | POST /api/equipment-faults/:id/approve |
| `faults` | Onay/Reddetme | POST /api/faults/:id/approve |
| `purchase_orders` | Onay/Reddetme | POST /api/purchase-orders/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Kritik arıza** → severity=critical/high tetikler.
- **Satın alma siparişi onay bekliyor** → ₺ eşik üstü.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.
2. **[ORTA]** Arıza onay yetkisi var ama `equipment_faults` widget atanmamış.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
