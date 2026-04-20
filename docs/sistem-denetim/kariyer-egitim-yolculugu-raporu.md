# DOSPRESSO — Personel Kariyer & Eğitim Sistemi Denetim Raporu

**Tarih:** 20 Nis 2026 · **Talep:** Aslan + Claude · **Kapsam:** Stajyer → Supervisor yolculuğu (eğitim + sertifika + onboarding + skor) · **Yöntem:** Salt okuma

---

## BÖLÜM 1 — Kariyer Merdiveni (career_levels)

Sistem 5 seviye tanımlı, **role_id = users.role** ile bağlanır:

| Lv | role_id | Türkçe Ad | Eşik (%) | Önkoşul Roller | Modül Sayısı | Açıklama |
|----|---------|-----------|----------|----------------|--------------|----------|
| 1 | `stajyer` | Stajyer | 0 | – | 7 modül | Eğitim aşaması |
| 2 | `bar_buddy` | Bar Buddy | 60 | stajyer | 6 modül | Gelişim aşaması |
| 3 | `barista` | Barista | 75 | bar_buddy | 11 modül | Sertifikalı uzman |
| 4 | `supervisor_buddy` | Supervisor Buddy | 85 | barista | 7 modül | Yönetim asistanı |
| 5 | `supervisor` | Supervisor | 90 | supervisor_buddy | 7 modül | Takım lideri |

> **KEŞIF:** Sistem yapı olarak doğru tanımlı (5 net seviye, eşik yüzdeleri kademeli artıyor). `mudur` rolü merdivene **dahil değil** — supervisor üstü atama manuel.
> **ÖNERİ:** Pilot sonrası `mudur` için Lv6 eklenmeli (eğer kariyer içinden terfi planlanıyorsa).

---

## BÖLÜM 2 — Geçiş Kapıları (career_gates)

4 kapı tanımlı (Lv1→2, 2→3, 3→4, 4→5). Her kapının ortak yapısı:

| Alan | Default | Anlamı |
|------|---------|--------|
| `quiz_passing_score` | 80 | Quiz geçme notu (level eşiğinden bağımsız) |
| `min_attendance_rate` | 90 | Son 30 günde devam yüzdesi |
| `min_days_in_level` | 30 | Bir üst seviyeye terfi için minimum gün |
| `attendance_period_days` | 30 | Devam hesap penceresi |
| `retry_cooldown_days` | 7 | Başarısız denemeden sonra bekleme |
| `max_retries` | 3 | Maksimum tekrar |
| `requires_supervisor` | true | Pratik onayı supervisor'dan |
| `requires_coach` | true | Coach onayı zorunlu |
| `requires_cgo` | false | CGO onayı opsiyonel |

> **KEŞIF:** 4 kapının da `practical_checklist` ve `kpi_rules` jsonb alanları var ama **boş**. Quiz var, pratik checklist henüz tanımlı değil.
> **ÖNERİ:** Pilot süresince stajyer→bar_buddy kapısının pratik checklist'i (5-7 madde: süt buharlama, espresso shot, hijyen, kasa, müşteri karşılama) doldurulmalı. Diğer kapılar pilot sonrası.

---

## BÖLÜM 3 — Geçiş Denemeleri (gate_attempts)

| Toplam Deneme | Geçen | Quiz Geçen | Farklı User |
|---------------|-------|------------|-------------|
| **0** | 0 | 0 | 0 |

> **KEŞIF KRİTİK:** Sistem 5 ay (Kasım 2025'ten beri) production'da ama **hiç kapı denemesi yok**. Stajyerlerden hiçbiri "bar_buddy oluyorum" akışını başlatmamış. Sebepler:
> - UI tetikleyici yok (kullanıcı kendi kapı sınavı talep edemez?)
> - Yöneticiler farkında değil
> - Pratik checklist boş → süreç tamamlanamıyor
> **ÖNERİ:** Pilot kapsamı dışı (terfi pilot içinde anlamsız) ama pilot sonrası 30 gün içinde Işıklar'da en az 1 stajyer→bar_buddy pilot terfi denemesi yapılmalı (UX testi).

---

## BÖLÜM 4 — Kullanıcı Kariyer İlerlemesi (user_career_progress)

| current_career_level_id | Kişi Sayısı | Seviye |
|-------------------------|-------------|--------|
| 1 | 6 | Stajyer |
| 2 | 2 | Bar Buddy |
| **TOPLAM** | **8** | |

Aktif kullanıcı: 159 → **151 kullanıcının (%95) `user_career_progress` kaydı YOK.**

> **KEŞIF KRİTİK:** Sistem level otomatik atamıyor. Yeni user oluşturulurken `user_career_progress` insert edilmiyor → kariyer ekranı boş kalıyor. Yalnız 8 kişi (manuel?) eklenmiş.
> **ÖNERİ:** Pilot öncesi migration: tüm aktif user'lara `role` → `career_levels.role_id` join ile current_level otomatik insert edilmeli. **5 dakikalık SQL**, pilot kapsamında değer yaratır:
> ```sql
> INSERT INTO user_career_progress (user_id, current_career_level_id, ...)
> SELECT u.id, cl.id, NOW(), NOW()
> FROM users u JOIN career_levels cl ON cl.role_id=u.role
> WHERE u.is_active=true AND NOT EXISTS (SELECT 1 FROM user_career_progress WHERE user_id=u.id);
> ```

---

## BÖLÜM 5 — Eğitim Modülleri (training_modules)

51 toplam modül seviyeye göre dağılımı:

| level | Toplam | Published |
|-------|--------|-----------|
| (incelendi, raw çıktı) | 51 | – (varsayılan published=false) |

`career_levels.required_module_ids` array'leri ile bağlanmış (1-39 arası id'ler). Modül **var**, içerik dolu görünüyor.

### Atama & Tamamlama
| training_assignments | training_completions | issued_certificates |
|----------------------|----------------------|---------------------|
| 15 atama / 4 user | **0 tamamlama** | **0 sertifika** |

`professional_training_progress`: 1 kayıt · `user_training_progress`: 27 kayıt (eski sistem?)

> **KEŞIF KRİTİK:** 51 modül seed'li ama **hiç tamamlama yok**. 15 atama da test verisi gibi (yalnız 4 farklı user). 0 sertifika basılmış. **Akademi kullanılmıyor.**
> **ÖNERİ:** Pilot süresince akademi opsiyonel — pilot ekibinin önceliği günlük operasyon. Pilot sonrası: stajyer onboarding paketi (7 zorunlu modül) ile kullanım başlatılmalı.

---

## BÖLÜM 6 — Onboarding (İşe Alış)

| Tablo | Kayıt |
|-------|-------|
| `onboarding_templates` | **1** |
| `onboarding_instances` | **0** |
| `employee_onboarding` | **2** kayıt (372 user!) |
| `employee_onboarding_assignments` | – |
| `employee_onboarding_progress` | – |
| `employee_onboarding_tasks` | – |
| `franchise_onboarding` | – |
| `food_safety_trainings` | – |

> **KEŞIF KRİTİK:** Yeni işe başlayan barista/stajyer için onboarding süreci **tetiklenmemiş**. Sistem 2 fazlı (`onboarding_instances` (program-bazlı, mentor atamalı) ve `employee_onboarding` (basit checklist)) — ikisi de boş. Pilot 4 lokasyonda 80+ aktif personel onboarding'siz çalışıyor.
> **ÖNERİ:** Pilot kapsamı dışı. Pilot sonrası ilk yeni alımda 1 kişilik canlı onboarding pilotu yapılmalı.

---

## BÖLÜM 7 — Skor Geçmişi (career_score_history)

5 alt skor + 1 composite:
- `training_score` (eğitim)
- `practical_score` (saha pratiği)
- `attendance_score` (devam)
- `manager_score` (yönetici değerlendirmesi)
- `composite_score` (ağırlıklı toplam)

**Aylık snapshot** sistemi (`score_month` varchar `YYYY-MM`). **0 kayıt** — hiç hesaplanmamış.

`user_career_progress` tablosunda da aynı 4 skor + composite alanları **canlı** tutulur (real-time). Ama 8 kayıttan kaçında dolu olduğu kontrol edilmedi (büyük olasılıkla default 0).

> **KEŞIF:** Skor hesap motoru (`composite_score = w1*training + w2*practical + w3*attendance + w4*manager`) muhtemelen **çalıştırılmamış**. Zamanlanmış job aranmadı, ama 0 kayıt → ya job yok ya bozuk.
> **ÖNERİ:** Pilot kapsamı dışı.

---

## BÖLÜM 8 — Rozet Sistemi (badges)

| badges | user_badges |
|--------|-------------|
| 12 tanımlı | **2 dağıtılmış** (2 farklı user) |

> **KEŞIF:** 12 rozet seed'li (örnek: "İlk Modül", "Quiz Ustası" vb. tahmin) ama dağıtım otomatik tetiklenmemiş.
> **ÖNERİ:** Pilot dışı. Akademi aktive olduktan sonra anlam kazanır.

---

## ÖZET TABLO — Yolculuğun Sağlık Durumu

| Aşama | Durum | Neden |
|-------|-------|-------|
| Career Level Tanımı | ✅ HAZIR | 5 seviye + 4 kapı tanımlı |
| Quiz Sistemi | ⚠️ KISMEN | Yapı var, içerik tek test (id=101) |
| Pratik Checklist | ❌ BOŞ | Tüm kapılarda jsonb=`[]` |
| Eğitim Modülü İçerik | ✅ HAZIR | 51 modül seed |
| Modül Atama → Tamamlama | ❌ ÖLÜ | 15 atama, 0 completion, 0 sertifika |
| User Career Progress | ❌ EKSİK | 159 aktif user → 8 kayıt (%5) |
| Gate Attempt | ❌ HİÇ | 0 deneme — kimse terfi başlatmamış |
| Onboarding | ❌ ÖLÜ | 0 instance, 2 employee_onboarding |
| Skor Geçmişi | ❌ HİÇ | 0 kayıt |
| Rozet | ⚠️ ZAYIF | 2 dağıtım |

---

## TASARIM İÇİN 3 ÖNCELİK (Pilot ÖNCESİ)

1. **🔥 user_career_progress backfill** — 5 dakikalık SQL (Bölüm 4). 151 aktif user'a current_level atayan migration. Kariyer ekranı pilotta görünür hale gelir, gerçek skor olmasa da seviye gözükür.
2. **🔥 1. Kapı pratik checklist (5-7 madde)** — Stajyer→Bar Buddy geçişi için sahaya odaklı checklist tanımlanmalı. Pilot sırasında en azından 1 lokasyonda test edilebilir.
3. **⚡ Quiz içerik bekleyebilir** — Pilot sırasında quiz akışı zaten kiosk'tan kaldırılıyor (önceki rapor). Akademi quiz'i pilot sonrası.

## TASARIM İÇİN 3 ÖNCELİK (Pilot SONRASI)

4. **Onboarding pilotu** — İlk yeni alımda mentor + 7 günlük checklist ile canlı test.
5. **Akademi tetikleyici** — Yeni stajyer eklendiğinde 7 zorunlu modül auto-assign.
6. **Skor cron job** — Aylık composite_score hesap motorunu çalıştır (`career_score_history` insert).

---

**Veriler:** Canlı DB (20 Nis 2026 ~20:50). Salt okuma, hiçbir değişiklik yapılmadı.
