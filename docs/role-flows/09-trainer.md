# Trainer (Akademi Eğitmeni)
**Rol Kodu**: `trainer`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 2  
**Görev**: Eğitim modül oluşturma, sınav hazırlama, çırak/stajyer takip, sertifika ve rozet onayı.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 33 |
| Yazma yetkisi olan modül | 15 |
| Onay yetkisi olan modül | 0 |
| Atanan dashboard widget | 5 |
| Erişilebilen toplam route (tahmini) | 147 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `ai_briefing`
2. `todays_tasks`
3. `branch_status`
4. `training_progress`
5. `quick_actions`

**Kategori dağılımı**:
- Operasyon: 3
- Personel: 0
- Fabrika: 0
- Finans: 0
- Eğitim: 1
- Müşteri: 0
- Ekipman: 0
- AI: 1

---

## 3. Modül Erişim Matrisi (PERMISSIONS)
| Modül | Yetkiler | Erişilebilen Rotalar |
|-------|----------|----------------------|
| `academy` | Görüntüle, Oluştur, Düzenle, Sil | /akademi, /akademi-mega, /akademi-v3 |
| `academy_admin` | Görüntüle, Oluştur, Düzenle | /yonetim/akademi, /akademi-hq |
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `academy_analytics` | Görüntüle | /akademi-analytics, /akademi-advanced-analytics |
| `academy_supervisor` | Görüntüle | /academy-supervisor |
| `achievements` | Görüntüle, Oluştur, Düzenle | /akademi-achievements |
| `adaptive_engine` | Görüntüle, Düzenle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `ajanda` | Görüntüle, Oluştur, Düzenle, Sil | /ajanda |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
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
| `knowledge_base` | Görüntüle, Oluştur, Düzenle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle, Oluştur, Düzenle | /akademi-learning-paths |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `social_groups` | Görüntüle, Oluştur, Düzenle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `tasks` | Görüntüle | /gorevler, /tasks, /task-atama, /task-takip |
| `team_competitions` | Görüntüle, Oluştur, Düzenle | /akademi-team-competitions |
| `training` | Görüntüle, Oluştur, Düzenle, Sil | /akademi, /akademi-mega, /training-assign |

---

## 4. Akademi Erişimi
- `academy`: Görüntüle, Oluştur, Düzenle, Sil
- `academy_admin`: Görüntüle, Oluştur, Düzenle
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

> **Not**: Eğitim modül oluşturma, sınav hazırlama, çırak/stajyer takip, sertifika ve rozet onayı.

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
Bu rol **hiçbir modülde onay (approve) yetkisine sahip değil**. Kendi başvurularını üst rollere iletir:
- İzin başvurusu → `mudur` → `muhasebe_ik`
- Mesai başvurusu → `supervisor`/`mudur` → `muhasebe_ik`
- Eğitim sertifikası → `trainer` → `coach`

---

## 8. Bildirim Tetikleyicileri
- **Görev atandı** (kişiye özel).
- **Eğitim modülü atandı/tamamlandı**.
- **Vardiya değişikliği**.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
✅ Bu rol için kritik gap tespit edilmedi.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 2 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
