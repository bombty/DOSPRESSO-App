# Üretim Şefi (Fabrika)
**Rol Kodu**: `uretim_sefi`  
**Kategori**: FACTORY  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Günlük üretim planı yürütme, vardiya yönetimi, hat verimliliği, atık (fire) takibi.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 49 |
| Yazma yetkisi olan modül | 17 |
| Onay yetkisi olan modül | 0 |
| Atanan dashboard widget | 7 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `factory_production`
2. `equipment_faults`
3. `equipment_maintenance`
4. `qc_stats`
5. `todays_tasks`
6. `staff_count`
7. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 2
- Personel: 1
- Fabrika: 2
- Finans: 0
- Eğitim: 0
- Müşteri: 0
- Ekipman: 2
- AI: 0

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `achievements` | Görüntüle | /akademi-achievements |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle, Düzenle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_inventory` | Görüntüle | /sube/siparis-stok |
| `branch_orders` | Görüntüle | /sube/siparis-stok, /satinalma-mega |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Düzenle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle, Düzenle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle, Oluştur, Düzenle | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle, Düzenle | /fabrika/kiosk |
| `factory_production` | Görüntüle, Oluştur, Düzenle | /fabrika, /fabrika-uretim-modu, /mrp-daily-plan |
| `factory_quality` | Görüntüle, Oluştur, Düzenle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle, Oluştur, Düzenle | /fabrika |
| `factory_stations` | Görüntüle, Oluştur, Düzenle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id |
| `goods_receipt` | Görüntüle | /satinalma-mega |
| `hr` | Görüntüle | /ik, /hr-reports, /personel-onboarding |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `leave_requests` | Görüntüle | /leave-requests |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `overtime_requests` | Görüntüle | /overtime-requests |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `purchase_orders` | Görüntüle | /satinalma-mega |
| `quality_audit` | Görüntüle | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle, Düzenle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle, Düzenle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle | /satinalma-centrum |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle | /gorevler, /tasks, /task-atama, /task-takip |
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
- `progress_overview`: Görüntüle
- `learning_paths`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Tipik Günlük Akış
1. **Login** → `/` ana sayfa → role-based dashboard.
2. **Bekleyen görevler** → `todays_tasks` veya rol-spesifik widget.
3. **Modül erişimi** → yetkili modüllerde günlük operasyon.
4. **Bildirim & onay** → bildirim merkezi (`/notifications`).
5. **Raporlama** (yetki varsa) → `/raporlar` veya rol-spesifik dashboard.
6. **Vardiya kapanış** → `vardiya-checkin` veya `/vardiyalarim`.

> **Not**: Günlük üretim planı yürütme, vardiya yönetimi, hat verimliliği, atık (fire) takibi.

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ✅ Evet  
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
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
