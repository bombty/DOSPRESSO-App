# Şube Kiosk
**Rol Kodu**: `sube_kiosk`  
**Kategori**: BRANCH  
**Aktif Kullanıcı Sayısı**: 18  
**Görev**: Vardiya başlat/bitir, mola, PIN-based public kiosk girişi (paylaşımlı cihaz).

---

## 1. Özet İstatistikler
| Metrik | Değer |
|--------|-------|
| Toplam erişilebilen modül | 26 |
| Yazma yetkisi olan modül | 4 |
| Onay yetkisi olan modül | 0 |
| Atanan dashboard widget | 0 |
| Erişilebilen toplam route (tahmini) | 146 |

---

## 2. Dashboard (Komuta Merkezi) Widget'ları
_(Widget atanmamış — `sube-kiosk` rolü için `dashboard_role_widgets` tablosunda kayıt yok!)_

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
| `announcements` | Görüntüle | /announcements, /duyurular, /duyuru/:id |
| `attendance` | Görüntüle | /attendance, /pdks, /vardiyalarim |
| `badges` | Görüntüle | /akademi-badges, /badge-collection |
| `branch_inventory` | Görüntüle | /sube/siparis-stok |
| `branch_shift_tracking` | Görüntüle | /vardiyalar, /canli-takip |
| `certificates` | Görüntüle | /akademi-certificates |
| `checklists` | Görüntüle, Düzenle | /checklists, /yonetim/checklistler, /checklist-takip |
| `dashboard` | Görüntüle | /, /dashboard, /komuta-merkezi |
| `equipment` | Görüntüle | /ekipman, /ekipman/:id, /ekipman-katalog, /ekipman-mega |
| `equipment_faults` | Görüntüle, Oluştur | /ariza, /ariza/:id, /ariza-yeni |
| `faults` | Görüntüle, Oluştur | /ariza, /ariza/:id |
| `inventory` | Görüntüle | /sube/siparis-stok, /fabrika/stok-merkezi |
| `knowledge_base` | Görüntüle | /knowledge-base, /kullanim-kilavuzu |
| `leaderboard` | Görüntüle | /akademi-leaderboard |
| `learning_paths` | Görüntüle | /akademi-learning-paths |
| `notifications` | Görüntüle | /notifications |
| `progress_overview` | Görüntüle | /akademi-progress-overview |
| `schedules` | Görüntüle | /vardiyalar, /vardiya-planlama |
| `shifts` | Görüntüle | /vardiyalar, /vardiya-planlama, /vardiya-checkin, /personel-musaitlik |
| `social_groups` | Görüntüle | /akademi-social-groups |
| `streak_tracker` | Görüntüle | /akademi-streak-tracker |
| `tasks` | Görüntüle, Düzenle | /gorevler, /tasks, /task-atama, /task-takip |
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
- `social_groups`: Görüntüle

---

## 5. Tipik Günlük İş Akışı
### Tipik Günlük Akış
1. **Login** → `/` ana sayfa → role-based dashboard.
2. **Bekleyen görevler** → `todays_tasks` veya rol-spesifik widget.
3. **Modül erişimi** → yetkili modüllerde günlük operasyon.
4. **Bildirim & onay** → bildirim merkezi (`/notifications`).
5. **Raporlama** (yetki varsa) → `/raporlar` veya rol-spesifik dashboard.
6. **Vardiya kapanış** → `vardiya-checkin` veya `/vardiyalarim`.

> **Not**: Vardiya başlat/bitir, mola, PIN-based public kiosk girişi (paylaşımlı cihaz).

---

## 6. Görev Atama & Yönetimi
**Bu rol görev atayabilir**: ❌ Hayır  
**Bu rol görev doğrulayabilir**: ❌ Hayır  
**Bu role atanan tipik görevler**:
- Şube checklist (açılış, kapanış, periyodik temizlik)
- Müşteri şikâyet aksiyonu
- Eğitim modülü tamamlama

---

## 7. Onay Zinciri (Approval Chain)
Bu rol **hiçbir modülde onay (approve) yetkisine sahip değil**. Kendi başvurularını üst rollere iletir:
- İzin başvurusu → `mudur` → `muhasebe_ik`
- Mesai başvurusu → `supervisor`/`mudur` → `muhasebe_ik`
- Eğitim sertifikası → `trainer` → `coach`

---

## 8. Bildirim Tetikleyicileri
- **Vardiya başlama hatırlatması** → 30 dk önce kişiye özel.

---

## 9. Tespit Edilen Boşluklar (GAP Analysis)
1. **[DÜŞÜK]** Akademi yetkisi var ama `training_progress` widget atanmamış → öğrenci ilerlemesi görünmüyor.

---

## 10. Kiosk & Public Erişim
✅ Bu rol PIN-based kiosk login kullanır (`/sube/kiosk`). Web/password login YOKTUR.



---

## 11. Pilot İçin Kritik Notlar (28 Nisan 2026)
✅ 18 aktif kullanıcı pilotta yer alacak.

- 4 pilot şubede (HQ + Fabrika + Işıklar + Lara) kiosk PIN dağıtımı yapılmalı.


---

_Bu doküman `2026-04-18` tarihinde Task #112 kapsamında otomatik üretildi._
_Veri kaynakları: `shared/schema/schema-02.ts` (PERMISSIONS), `dashboard_role_widgets` tablosu, `module_flags` tablosu, `client/src/App.tsx` (250 route), `users` tablosu (aktif sayım)._
