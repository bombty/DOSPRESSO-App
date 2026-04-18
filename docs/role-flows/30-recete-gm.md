# Reçete GM (Reçete Geliştirme)
**Rol Kodu**: `recete_gm`  
**Kategori**: FACTORY  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Reçete oluşturma, maliyet analizi, ürün geliştirme, KEYBLEND yönetimi.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 47 |
| Yazma yetkisi olan modül | 16 |
| Onay yetkisi olan modül | 1 |
| Atanan dashboard widget | 0 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
_(Widget atanmamış — ${role} rolü için `dashboard_role_widgets` tablosunda kayıt yok!)_

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
| `academy` | Görüntüle | /akademi, /akademi-mega, /akademi-v3 |
| `achievements` | Görüntüle | /akademi-achievements |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle, Oluştur | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `cost_management` | Görüntüle | /mali-yonetim, /maliyet-analizi |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle, Düzenle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle, Düzenle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle, Düzenle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle, Oluştur, Düzenle | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle, Düzenle | /fabrika/kiosk |
| `factory_production` | Görüntüle, Oluştur, Düzenle | /fabrika, /fabrika-uretim-modu, /mrp-daily-plan |
| `factory_quality` | Görüntüle, Oluştur, Düzenle | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle | /fabrika |
| `factory_stations` | Görüntüle, Oluştur, Düzenle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle, Oluştur, Düzenle | /ariza, /ariza/:id |
| `food_safety` | Görüntüle | /gida-guvenligi-dashboard |
| `goods_receipt` | Görüntüle | /satinalma-mega |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle, Oluştur, Düzenle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `purchase_orders` | Görüntüle | /satinalma-mega |
| `quality_audit` | Görüntüle | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `satinalma` | Görüntüle | /satinalma-mega, /satinalma-centrum |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
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

> **Not**: Reçete oluşturma, maliyet analizi, ürün geliştirme, KEYBLEND yönetimi.

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

---

## 8. Bildirim Tetikleyicileri
- **Görev tamamlandı, doğrulama bekliyor** → kullanıcı evidence yükledi.
- **Üretim hedef sapması** → batch <%80 hedef.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[ORTA]** Onay yetkisi var (1 modül: tasks) ama dashboard'da `todays_tasks` veya `quick_actions` widget'ı yok → onay kuyruğu görünmüyor.
2. **[DÜŞÜK]** Fabrika yetkisi var ama `factory_production` widget atanmamış.
3. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
