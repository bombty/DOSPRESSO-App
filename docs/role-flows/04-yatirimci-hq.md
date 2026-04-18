# Yatırımcı HQ (Hissedar/Bord)
**Rol Kodu**: `yatirimci_hq`  
**Kategori**: HQ_DEPARTMENT  
**Aktif Kullanıcı Sayısı**: 1  
**Görev**: Mali görünürlük, marka portföyü performans, makro KPI takip — read-only.

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 31 |
| Yazma yetkisi olan modül | 3 |
| Onay yetkisi olan modül | 0 |
| Atanan dashboard widget | 1 |
| Erişilebilen toplam route (tahmini) | 146 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
1. `pdks_branch_detail`

**Kategori dağılımı**:
- Operasyon: 0
- Personel: 1
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
| `academy_ai` | Görüntüle | /akademi-ai-assistant, /akademi-ai-panel |
| `achievements` | Görüntüle | /akademi-achievements |
| `adaptive_engine` | Görüntüle | /akademi-adaptive-engine |
| `ai_assistant` | Görüntüle | /akademi-ai-assistant, /agent-merkezi |
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_inventory` | Görüntüle, Oluştur, Düzenle | /sube/siparis-stok |
| `branch_orders` | Görüntüle, Oluştur, Düzenle, Sil | /sube/siparis-stok, /satinalma-mega |
| `branches` | Görüntüle | /subeler, /sube/:id |
| `certificates` | Görüntüle | /akademi-certificates |
| `customer_satisfaction` | Görüntüle | /crm, /branch-feedback |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `employees` | Görüntüle | /personel/:id, /personel-detay/:id |
| `factory_analytics` | Görüntüle | /hq-fabrika-analitik |
| `factory_dashboard` | Görüntüle | /fabrika, /fabrika/dashboard, /fabrika-centrum |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `lost_found_hq` | Görüntüle | /kayip-esya-hq |
| `messages` | Görüntüle, Oluştur | /mesajlar |
| `notifications` | Görüntüle | /notifications |
| `performance` | Görüntüle | /performance, /my-performance |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `projects` | Görüntüle | /projeler, /proje/:id, /yeni-sube-projeler |
| `reports` | Görüntüle | /raporlar, /raporlar-hub, /advanced-reports, /raporlar-mega |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `support` | Görüntüle | /destek, /destek-centrum, /hq-support |
| `team_competitions` | Görüntüle | /akademi-team-competitions |

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

> **Not**: Mali görünürlük, marka portföyü performans, makro KPI takip — read-only.

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
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.
2. **[YÜKSEK]** Sadece 1 widget atanmış (`pdks_branch_detail`) ama 31 modül erişimi var → dashboard çok kısır, finansal&operasyonel widget eklenmeli.

---

## 10. Kiosk & Public Erişim


Standart username/password login. Kiosk erişimi yok.

---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 1 aktif kullanıcı pilotta yer alacak.




---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
