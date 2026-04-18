# Gıda Mühendisi
**Rol Kodu**: `gida_muhendisi`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: HACCP, reçete güvenliği, hammadde spesifikasyonu, laboratuvar testleri, mevzuat uyumu.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 49 |
| Yazma yetkisi olan modül | 15 |
| Onay yetkisi olan modül | 5 |
| Atanan dashboard widget | 6 |
| Erişilebilen toplam route (tahmini) | 146 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `qc_stats`
4. `factory_production`
5. `branch_status`
6. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 3
- Personel: 0
- Fabrika: 2
- Finans: 0
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
| `achievements` | Görüntüle | /akademi-achievements |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `announcements` | Görüntüle, Oluştur | /announcements, /duyurular, /duyuru/:id |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_inspection` | Görüntüle | /coach-sube-denetim, /denetimler |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Oluştur, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `complaints` | Görüntüle, Oluştur, Düzenle | /crm, /crm-mega |
| `cost_management` | Görüntüle | /mali-yonetim, /maliyet-analizi |
| `customer_satisfaction` | Görüntüle, Düzenle | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle | /ariza, /ariza/:id, /ariza-yeni |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_compliance` | Görüntüle, Oluştur, Düzenle | /fabrika, /sube-uyum-merkezi |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `factory_food_safety` | Görüntüle, Oluştur, Düzenle, Onayla | /gida-guvenligi-dashboard |
| `factory_kiosk` | Görüntüle | /fabrika/kiosk |
| `factory_production` | Görüntüle, Oluştur, Düzenle | /fabrika, /fabrika-uretim-modu, /mrp-daily-plan |
| `factory_quality` | Görüntüle, Oluştur, Düzenle, Onayla | /kalite-kontrol-dashboard, /gida-guvenligi-dashboard |
| `factory_shipments` | Görüntüle | /fabrika |
| `factory_stations` | Görüntüle | /admin/fabrika-istasyonlar |
| `faults` | Görüntüle | /ariza, /ariza/:id |
| `food_safety` | Görüntüle, Oluştur, Düzenle, Onayla | /gida-guvenligi-dashboard |
| `goods_receipt` | Görüntüle | /satinalma-mega |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle, Oluştur, Düzenle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `product_complaints` | Görüntüle, Oluştur, Düzenle, Onayla | /crm |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle | /projeler, /proje/:id, /yeni-sube-projeler |
| `quality_audit` | Görüntüle, Oluştur, Düzenle, Onayla | /kalite-denetimi, /coach-sube-denetim, /denetimler, /denetim-yurutme |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `suppliers` | Görüntüle | /satinalma-centrum |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `tasks` | Görüntüle, Oluştur, Düzenle | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle | /akademi-team-competitions |
| `training` | Görüntüle, Oluştur, Düzenle | /akademi, /akademi-mega, /training-assign |

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
### Tipik Günlük Akış
1. **Login** → `/` ana sayfa → role-based dashboard.
2. **Bekleyen görevler** → `todays_tasks` veya rol-spesifik widget.
3. **Modül erişimi** → yetkili modüllerde günlük operasyon.
4. **Bildirim & onay** → bildirim merkezi (`/notifications`).
5. **Raporlama** (yetki varsa) → `/raporlar` veya rol-spesifik dashboard.
6. **Vardiya kapanış** → `vardiya-checkin` veya `/vardiyalarim`.

> **Not**: HACCP, reçete güvenliği, hammadde spesifikasyonu, laboratuvar testleri, mevzuat uyumu.

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
| `product_complaints` | Onay/Reddetme | POST /api/product-complaints/:id/resolve |
| `quality_audit` | Onay/Reddetme | POST /api/quality-audits/:id/approve |
| `factory_quality` | Onay/Reddetme | POST /api/factory-quality/:id/approve |
| `factory_food_safety` | Onay/Reddetme | POST /api/factory-food-safety/:id/approve |
| `food_safety` | Onay/Reddetme | POST /api/food-safety/:id/approve |

---

## 8. Bildirim Tetikleyicileri
- **Görev atandı** (kişiye özel).
- **Eğitim modülü atandı/tamamlandı**.
- **Vardiya değişikliği**.

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
