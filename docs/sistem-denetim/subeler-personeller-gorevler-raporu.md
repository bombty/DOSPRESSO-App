# DOSPRESSO — Şube + Personel + Görev Sistemi Denetim Raporu

**Tarih:** 20 Nis 2026 · **Talep:** Aslan + Claude · **Amaç:** Kiosk dashboard yeniden tasarımı öncesi sistem fotoğrafı · **Yöntem:** Salt okuma (DB + kod) · **Pilot:** 28 Nis 2026 (Işıklar 5, Lara 8, HQ 23, Fabrika 24)

---

## BÖLÜM 1 — Şubeler Envanteri

| id | Ad | Aktif | Aktif Kullanıcı | Pilot? |
|----|----|-------|-----------------|--------|
| 1 | Test Branch 1 | ✗ | 0 | – |
| 4 | Örnek şube | ✗ | 0 | – |
| **5** | **Işıklar** | ✓ | **11** | **★** |
| 6 | Antalya Mallof | ✓ | 8 | – |
| 7 | Antalya Markantalya | ✓ | 7 | – |
| **8** | **Antalya Lara** | ✓ | **6** | **★** |
| 9 | Antalya Beachpark | ✓ | 7 | – |
| 10–22 | (13 diğer şube) | ✓ | 7-8 / şube | – |
| **23** | **Merkez Ofis (HQ)** | ✓ | **0** | **★** |
| **24** | **Fabrika** | ✓ | **10** | **★** |

**Özet:** 22 toplam → **20 aktif + 2 pasif** (Test Branch 1, Örnek şube). Pilot 4 lokasyon: ✓ tüm aktif. **HQ'da branch_id=23 atanmış aktif kullanıcı YOK** (HQ rolleri branch_id=NULL ile çalışıyor — bkz. Bölüm 2).

> **KEŞIF:** "Antalya Mallof" yazımı muhtemelen "Mall of Antalya" olmalı. Pasif şubeler (id=1,4) dropdown'larda hala görünüyor olabilir.
> **ÖNERİ:** Pilot öncesi Test Branch 1 + Örnek şube için `is_active=false` zaten doğru, ama görev/duyuru hedeflerinden de excluded olduğu doğrulanmalı. İsim düzeltmesi opsiyonel.

---

## BÖLÜM 2 — Personel Dağılımı

**Genel:** 372 toplam kullanıcı → **159 aktif** · 0 onay bekleyen · **32 branch_id=NULL** (HQ/yönetim rolleri — admin, ceo, cgo, fabrika_mudur, gida_muhendisi, kalite_kontrol, satinalma, marketing, muhasebe, teknik, trainer, coach, destek, yatirimci_hq).

### Tipik Şube Şablonu (20 şubeden 18'inde aynı)
| Rol | Toplam | Aktif | Not |
|-----|--------|-------|-----|
| mudur | 2 | 1 | İkincisi yedek/pasif |
| supervisor | 2 | 1 | – |
| supervisor_buddy | 2 | 0 | **Hepsi pasif** |
| barista | 5-6 | 3-4 | Çekirdek operasyon |
| bar_buddy | 2 | 0-1 | **Çoğu pasif** |
| stajyer | 2 | 0 | **Hepsi pasif** |
| sube_kiosk | 1 | 1 | Kiosk login |

### Pilot 4 Lokasyon (aktif personel)
| Şube | mudur | sup | barista | sube_kiosk | bar_buddy | yatirimci_branch | TOPLAM |
|------|-------|-----|---------|------------|-----------|------------------|--------|
| Işıklar (5) | 1 | 1 | 6 | 1 | 1 | 1 | **11** |
| Lara (8) | 1 | 1 | 3 | 1 | – | – | **6** |
| HQ (23) | – | – | – | – | – | – | **0** (HQ rolleri branch_id=NULL) |
| Fabrika (24) | sef×1, uretim_sefi×1, fabrika_operator×3, fabrika_depo×1, recete_gm×1, supervisor×1, stajyer×2 | | | | | | **10** |

> **KEŞIF:** Lara'da sadece **3 aktif barista** var → kiosk shift planlaması için **kritik düşük**. Diğer pilot şubelerde sorun yok.
> **KEŞIF:** Tüm `bar_buddy`, `supervisor_buddy`, `stajyer` rolleri pasif (158 nonadmin = 159-1 admin pilot reset'inden geçti, ama account_status=approved olanların `is_active=true` olması ayrı kontrol). Pilot öncesi: lokasyon başına en az 4 aktif personel hedefi tutturulmuş.
> **ÖNERİ:** Lara'ya en az 1 ek aktif barista eklenmeli (yedek vardiya için), ya da pilot süresince Lara'da çift vardiya yerine tek vardiya planlanmalı.

---

## BÖLÜM 3 — Şube Görev Sistemi (Claim/Havuz)

### Kategoriler (4 adet, hepsi aktif)
`temizlik` · `bakim` · `stok` · `genel`

### Aktif Recurring Şablonlar — **YALNIZCA 3 ADET!**
| Frekans | Şablon | Kategori | Branch |
|---------|--------|----------|--------|
| daily | 1 | temizlik | global (NULL) |
| weekly | 1 | temizlik | global |
| monthly | 1 | bakim | global |

### Üretilen Instance'lar (son 30 gün)
| Toplam | Pending | **Tamamlanan** | Cancelled | Overdue |
|--------|---------|----------------|-----------|---------|
| 680 | 280 | **0** | 400 | – |

### Son 7 Gün (her şubede 8 instance)
| Toplam | Claim Edilen | Tamamlanan | **Havuzda Bekleyen** | Overdue |
|--------|--------------|------------|----------------------|---------|
| 160 | **0** | **0** | **160 (%100)** | 120 |

### Şube Dağılımı (her aktif şubede tam 34 instance/30gün — eşit)

> **KEŞIF KRİTİK:** Branch task claim sistemi **ÖLÜ** — son 30 günde 680 instance üretildi, **HİÇBİRİ claim edilmedi, hiçbiri tamamlanmadı**. Sadece 3 global şablon var (gerçek operasyon ihtiyacı 30+ olmalı). Scheduler çalışıyor (`server/services/branch-task-scheduler.ts` → `generateDailyTaskInstances()` startup'ta + master-tick-10min interval'inde), ama içerik boş.
> **ÖNERİ (Kiosk Redesign için):**
> 1. Pilot öncesi her pilot şube için 8-12 günlük şablon (açılış temizliği, kasa sayım, ekipman bakım, vardiya kapanış vb.) seed et.
> 2. Kiosk dashboard'da "Bugünkü Havuz" widget'ı = `GET /api/branch-tasks/kiosk/instances` (zaten kiosk auth'lu endpoint var). Tek dokunuş claim → tek dokunuş complete (foto opsiyonel).
> 3. 400 cancelled neden iptal edildi? Migration veya seed cleanup mı? Logları kontrol etmeye değer ama bloker değil.

---

## BÖLÜM 4 — Kişisel/Atanan Görevler

### `shift_tasks` (Vardiya görevleri)
**Toplam: 0 kayıt.** Tablo var ama **hiç kullanılmıyor**.

### `tasks` (Genel task tablosu)
1334 toplam kayıt — task management sisteminin asıl tablosu (ekip yönetimi, kişisel atama, comments/evidence/rating).

### `role_task_templates` (Rol bazlı şablonlar)
**26 farklı rolde, toplam 152 aktif şablon.** Kapsam zengin (admin/ceo/cgo'dan stajyer'e kadar tüm roller var). En yoğun: fabrika_mudur (23), supervisor (10), mudur (8), fabrika_sorumlu (8).

### `checklists` (Aktif: 13)
**Toplam completion (all-time): 5,098** ✓ aktif kullanım var.
**Son 7 gün: 0 completion.** Son 30 gün: sadece **Fabrika 27 + Lara 24** = 51 (yalnızca 2 şube).

> **KEŞIF:** 4 ayrı görev sistemi var ama **kopuk**:
> - `shift_tasks` (boş, ölü)
> - `branch_task_instances` (claim/havuz — ölü, Bölüm 3)
> - `tasks` (genel task mgmt — aktif 1334)
> - `checklists` + `checklist_completions` (zayıf — son 7 gün 0)
>
> Kiosk için ana akım `tasks` ile `branch_task_instances/kiosk` endpoint'leri. Diğer iki sistem zaten kiosk'ta görünmüyor.
> **ÖNERİ:** Kiosk redesign'da yalnızca **2 görev kaynağı** kullan: (a) `branch-tasks/kiosk/instances` (havuz claim), (b) günün checklist'i (`checklist-execution.tsx` zaten var, `/sube/checklist-execution`). `shift_tasks` tablosunu pilot sonrası kaldır.

---

## BÖLÜM 5 — Kiosk Kullanımı (Mevcut)

### Shift Attendance (Kiosk girişleri)
- **Tüm sistem (30 gün):** 52 check_in, 14 farklı user, **0 check_in_photo_url** (foto işleme yok).
- **Pilot şubeler son giriş tarihi:**
  - Işıklar: **3 Nis 2026** (8 toplam)
  - Lara: 30 Mart 2026 (85 toplam — eski test verisi)
  - Fabrika: 30 Mart 2026 (79 toplam)
  - HQ: hiç giriş yok
- `source` kolonu **YOK** → kiosk vs manual ayırt edilmiyor (ham kayıt).

### Zorunlu Quiz'li Duyurular
| Toplam Anonim | Published | Quiz Required | Mandatory |
|---------------|-----------|---------------|-----------|
| 18 | 18 | **1** | – |

**Tek aktif quiz'li duyuru:** id=101 *"Test Zorunlu Duyuru — Reçete Değişikliği"* — 3 soru, geçme notu 60. **Test verisi.**

> **KEŞIF:** Pilot öncesi son 17 gün hiç kiosk testi yok (Lara/Fab kayıtları 30 Mart, Işıklar 3 Nis). Quiz akışı tek bir test duyurusunda canlı.
> **ÖNERİ:** Pilot öncesi id=101 silin veya "Test" prefix'i temizleyin (18 duyuru içinde başka draft görünmüyor — temiz). Pilot 28 Nis öncesi 4 lokasyonda en az 3'er gün kiosk smoke testi yapılmalı.

---

## BÖLÜM 6 — Skor & İnisiyatif

### Skor Kolonu Envanteri (50+ kolon, dağınık)
Score/skor kolonları 30+ tabloda mevcut: `audits_v2`, `branch_quality_audits`, `audit_personnel_v2`, `branch_audit_scores`, `branch_monthly_snapshots.overall_health_score`, `career_score_history` (composite/manager/practical/training/attendance), `checklist_completions.score`, `checklist_ratings.final_score/raw_score`, `agent_action_outcomes.initial_score`, `announcement_quiz_results.score`.

### `branch_task_instances` SKOR YOK
Tabloda `score` yok. `/api/branch-tasks/score` endpoint (line 851) ve `/api/branch-tasks/score/user/:userId` (line 878) **dinamik hesap** — `claimed_by_user_id` + `completed_by_user_id` count'larından üretiliyor.

### Leaderboard
Hazır leaderboard tablosu **YOK**. Endpoint'ler kullanıcı bazında query atıyor; agregasyon `career_score_history` üzerinden yapılabilir (aylık snapshot).

> **KEŞIF:** "İnisiyatif" kavramı = `claim_count + complete_count`/kullanıcı. Persistent skor değil, real-time SQL count. Leaderboard için ayrı agregasyon yok.
> **ÖNERİ:** Kiosk dashboard'da "Bugünkü Yıldızlarım" pilotu: günlük claim+complete sayısı (kullanıcı bazlı, anlık SQL). `career_score_history` aylık skor için zaten var. Yeni tablo gerekmez.

---

## BÖLÜM 7 — Eksikler + Sorun Raporu

### 7.1 Şube Görevleri Sisteminde Sorun
- ✅ **Scheduler ÇALIŞIYOR**: `server/services/branch-task-scheduler.ts` → `generateDailyTaskInstances()` startup'ta tetikleniyor (`server/index.ts:407`), ardından `master-tick-10min` interval'inde (`index.ts:562`) tekrar çağrılıyor. **Üretim doğru.**
- ❌ **İçerik boş**: Sadece 3 global şablon (1 daily, 1 weekly, 1 monthly). Gerçek operasyonel görev seedi yok → sistem üretiyor ama ekip görmüyor.
- ⚠️ **Ölü endpoint:** `POST /api/tasks/bulk-assign` (line 908) `branch-tasks.ts` içinde ama `/api/tasks/...` namespace'inde — yanlış router'da olabilir. Kullanılıyor mu kontrol edilmeli.
- ✅ **UI ↔ DB tutarlı**: Endpoint listesi 22 route, hepsi aktif (yetki guard'lı). Kiosk endpoint'leri (`/api/branch-tasks/kiosk/instances|claim|complete`) `isKioskAuthenticated` ile koruma altında ✓.

### 7.2 Personel Dağılım Tutarsızlığı
- **Lara'da kritik düşük barista** (3 aktif). Diğer 19 şubede her rolden en az 1 aktif var.
- **HQ'da branch_id=23 atanmış kullanıcı yok** — rapor kasıtlı olabilir (HQ rolleri branch_id=NULL ile çalışıyor) ama dashboard'da HQ KPI'ları çekildiğinde join sorunu yaratabilir. Mission Control kontrol edilmeli.
- **`mudur` rolü 2 atanmış, 1 aktif** (her şubede). Yedek müdürün is_active=false olması normal.

### 7.3 Quiz'in Kiosk'tan Çıkarılması — Etki Haritası
**Kiosk'ta quiz akışı 5 yerde:** `client/src/pages/sube/kiosk.tsx`
| Satır | Kod | Açıklama |
|-------|-----|----------|
| 117-120 | `quizMode`, `quizQuestions`, `quizAnswers`, `quizResult` state | 4 state değişkeni |
| 1881-1890 | `acknowledgeMutation` → `current.quizRequired` kontrolü → `fetchQuizQuestions()` | Onay sonrası quiz tetikleyici |
| 530-535 | `pending-announcements` fetch + setStep('announcements') | Açılışta quiz'li duyuruları yükle |
| (devamı) | `fetchQuizQuestions`, `submitQuiz` fonksiyonları | Quiz UI render |

**Backend etki:** `/api/announcements/:id/acknowledge` zorunluluğu kalır; sadece kiosk istemci tarafında `quizRequired` dallanması bypass edilir. Backend dokunulmaz.

> **ÖNERİ (minimum patch):** `kiosk.tsx:1887` satırındaki `if (current?.quizRequired && !current?.quizPassed)` koşulunu `if (false)` ile değiştirip mevcut state'leri (`quizMode` vb.) kullanılmadığı için bırakmak. Pilot için 1 satır değişiklik. Kalıcı silme pilot sonrası.

### 7.4 Kiosk Yeniden Tasarımı için Hazır Veriler
| Kaynak | Endpoint | Durum |
|--------|----------|-------|
| Havuz görev | `GET /api/branch-tasks/kiosk/instances` | ✅ var, kiosk auth, MODULE_GUARD |
| Görev claim | `POST /api/branch-tasks/kiosk/:id/claim` | ✅ var |
| Görev tamam | `POST /api/branch-tasks/kiosk/:id/complete` | ✅ var |
| Skor (kullanıcı) | `GET /api/branch-tasks/score/user/:userId` | ✅ var (dinamik hesap) |
| Bugünkü checklist | `GET /api/branches/:branchId/kiosk/announcements` (kiosk-token header) | ✅ var (line 259/721 kiosk.tsx) |
| Telefon "benim günüm" | `client/src/pages/benim-gunum.tsx` | ✅ var (içeriği ayrıca incelenmeli) |

---

## TASARIM İÇİN 5 ÖNCELİK

1. **🔥 Pilot öncesi 8-12 görev şablonu seed** — `branch_recurring_tasks` aktif sadece 3, kiosk'ta gösterilecek hiçbir gerçek iş yok. Pilot 28 Nis'e kadar 4 pilot lokasyon için minimum şablon seti hazırlanmalı (açılış/kapanış/temizlik/sayım).
2. **🔥 Kiosk redesign'da quiz akışını gizle** — `kiosk.tsx:1887` tek satır patch. Pilot kullanıcı deneyimi için kritik (test quiz'i bypass).
3. **⚡ Lara için yedek barista** — 3 aktif çok düşük, çift vardiya riskli. HR ile konuş ya da pilot süresince Lara tek vardiya.
4. **⚡ Kiosk dashboard'da 2 ana widget** — (a) "Bugünkü Havuz" (claim listesi), (b) "Bugünkü Skorum" (`/score/user/:id` dinamik). 3. ekleme: bugünkü checklist tetikleyici (`/sube/checklist-execution` route'una yönlendirme).
5. **🔧 Pilot sonrası temizlik** — `shift_tasks` boş tablo kaldır, `Test Branch 1` + `Örnek şube` arşivle, "Antalya Mallof" yazımını düzelt, test announcement id=101 sil. (Pilot ENGEL DEĞİL.)

---

**Kaynak kodlar:** `server/routes/branch-tasks.ts` · `server/services/branch-task-scheduler.ts` · `client/src/pages/sube/kiosk.tsx` · `client/src/pages/benim-gunum.tsx`
**Veriler:** Canlı DB sorguları (20 Nis 2026 ~20:35).
**Uyarı:** Bu rapor salt okuma — hiçbir DB veya kod değişikliği yapılmadı.
