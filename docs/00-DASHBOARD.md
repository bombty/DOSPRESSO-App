# 📊 DOSPRESSO — 00-DASHBOARD.md

**Son Güncelleme:** 19 Nis 2026 Cumartesi gece (Task #113 tamam + token yenilendi)
**Amaç:** Her Claude oturumu başında 5 dakikada sisteme hizalan
**Güncelleme Kuralı:** Her oturum sonu `session-protocol` skill'i Adım 1 gereği güncellenir ve commit'lenir

> Bu dosya statik değil, **yaşayan durum özeti**. Değişirse → commit. 100 doküman yerine bu 1 dosya.

---

## 🎯 Şu An Neredeyiz?

| Metrik | Değer |
|---|---|
| **Pilot Hazırlık Skoru** | **~7.5/10 (%85)** — Task #113 10 madde tamam, yük testi yeşil |
| **Aktif Sprint** | A ✅ tamam → **B başlıyor** (Pazartesi 20 Nis) |
| **🚨 PILOT BAŞLANGIÇ** | **28 Nisan 2026 Salı sabah 09:00** (FAZAL) |
| **Pilot tipi** | **CANLI OPERASYONEL** (beta değil — operasyonel aciliyet) |
| **Pilot Lokasyon** | HQ + Fabrika + Işıklar + Lara |
| **Rollout sırası** | Işıklar + HQ → 24 saat izle → Lara + Fabrika |
| **23 Nisan Perşembe** | 🎉 Ulusal Egemenlik ve Çocuk Bayramı — minimal çalışma |

**Pilot kullanıcı profilleri (yük testinden doğrulandı):**
- **Işıklar:** abdullah, ahmethamit, cihan, kemal, atesguney, süleyman (6 barista DB'de ✅)
- **Lara:** larabarista1, larabarista2 (DB'de ✅), mudur+supervisor parolaları bekleniyor
- **Fabrika + HQ:** Pazartesi Aslan detay paylaşacak

**Rollback politikası:** **Esnek** — Aslan + Claude + Replit WhatsApp günlük, kriz anında IT rollback yetkili.

---

## 🆕 Task #113 TAMAMLANDI (19 Nis 2026 — Replit)

Hafta sonu 10 maddelik "Pilot Hardening" paralel bitirildi. Origin HEAD: `57066a7`.

**Üretilen dosyalar:**
- ✅ `docs/pilot/success-criteria.md` — 4 sayısal eşik (Aslan onaylı)
- ✅ `docs/pilot/yuk-testi-raporu.md` + script — adminhq 710ms full flow, 5 user paralel OK
- ✅ `docs/pilot/mobil-test-raporu.md` + `screenshots/`
- ✅ `docs/pilot/cheat-sheets/01-05` — admin, mudur, supervisor, kurye, fabrika
- ✅ `docs/pilot/destek-hatti-prosedur.md` + `internet-kesintisi-prosedur.md`
- ✅ `docs/pilot/db-izolasyon-raporu.md` + `scripts/pilot/00-db-isolation.sql`
- ✅ `docs/AGENT-OWNERSHIP.md` — Claude vs Replit path sahipliği
- ✅ `docs/pilot/sprint-1-f02-fix-plan.md` — pilot sonrası F02 useModuleFlag fix

**🟢 Yük Testi Sonucu:**
- adminhq akış: 710ms total / avg 178ms / max 463ms (hedef < 500ms ✅)
- DB connection pool: 5 eşzamanlı user OK, çakışma yok
- **Pazar 27 Nis 22:30:** Gerçek pilot parolaları ile re-test zorunlu (4 user henüz parolasız)

**⚠️ Küçük bulgular (pilot bloker değil):**
- `/api/login` (flat) kullanılıyor, `/api/auth/login` (REST) değil — UI doğru çağırıyor, pilot sonrası refactor
- 4 test user DB'de yok — parolalar Pazartesi sabah SMS ile dağıtılacak

---

## 🎯 8/8 Pilot Kararı (18 Nis Cumartesi gece finalize)

| # | Konu | Karar |
|---|---|---|
| 1 | Pilot tarihi | **28 Nisan 2026 Salı 09:00** |
| 2 | Satınalma kapsamı | **Seçenek C** (branch_orders UI, 1.5 gün) |
| 3 | Rollout sıralaması | **FAZAL**: Işıklar+HQ → 24 saat → Lara+Fabrika |
| 4 | Pilot tipi | **CANLI OPERASYONEL** (beta değil) |
| 5 | Rollback | **Esnek** — WhatsApp günlük, kural yok |
| 6 | Kullanıcı profil | Işıklar tam ✅, diğerleri Pazartesi |
| 7 | Notification | **Plan A.2 Feature Freeze istisna** |
| 8 | Test süresi | **2 gün** (G3 + G5) + G6 eğitim |

---

## 🚀 Pazartesi 20 Nis Gün 1 — Sabah 09:00 Kick-off

### 🤖 Replit bağımsız yapacak (5 iş, ~50 dk):
- [ ] adminhq parola rotate (scripts/reset-admin-password.ts)
- [ ] Test Branch 1 + Örnek şube soft-delete
- [ ] seed_test 704 PDKS kaydı temizlik
- [ ] Nisan bordro backfill (B.5 catch-up tetik, 31 user)
- [ ] Duplicate scheduler log final verify

### 🧑‍💻 Claude paralel yapacak (3 iş, ~4 saat):
- [ ] Sprint B.1 yeni kapsam: shift_attendance ↔ pdks_records tutarlılık
- [ ] Sprint B.3: monthly_attendance_summaries scheduler
- [ ] Sprint A.2: notification task_escalation_log (Feature Freeze istisna)

### 🧑‍💼 Aslan paralel yapacak:
- [ ] 4 lokasyondan cihaz envanteri (tablet markası, internet, NFC)
- [ ] Lara + HQ + Fabrika pilot kullanıcı profilleri
- [ ] Cumartesi eğitim takvimi (4 lokasyon × 45-60 dk)

---

## 🆕 Task #112 Sonrası — 5 KRİTİK Bulgu Pazartesi Gün 1'e Eklendi

Referans: `docs/role-flows/99-FINDINGS.md` (Replit push sonrası)

### 🚨 F01 ÖNCELİK REVİZYONU (18 Nis gece, Replit F02 kod incelemesi sonrası)

**Büyük bulgu:** Replit F02 incelemesinde tespit etti — `pages/fabrika/*.tsx`'te `useModuleFlag` çağrısı **0 sonuç.** Module flag'ler runtime'da etkisiz, sadece admin paneli görünümü için.

**Sonuç:** F01 "13 disabled modül aç" işi P0'dan **P2'ye düştü.**

- F01 → 🟡 **P2 (kozmetik)** — 30 dk, Pazartesi 16:00'da 4 modül aç (delegation, iletisim_merkezi, dobody.flow, checklist)
- F02 → 🟢 **P3 (Sprint D pilot sonrası)** — 3 Türkçe modül soft-delete pilot'tan sonra
- F03, F04, F05 → 🔴 **P0 KALIYOR** (gerçek pilot bloker)

**Pazartesi tasarrufu:** 9 saat → 6-7 saat.  
**Madde 37 §23 dersi:** "Flag/config tablolarında `is_enabled=false` görünce runtime etkisini grep ile kontrol et, sonra bloker kararı ver." Skill'e eklenecek.

### Replit ek iş (Pazartesi ~1 saat, revize):

- [ ] **F01 (P2 kozmetik)** — 4 modül aç (30 dk)
- [ ] **F02 (P3 ertelendi)** — Sprint D'ye taşındı
- [ ] **F03** — adminhq parola rotate (15 dk, zaten planda)
- [ ] **F04** — 3 SPOF role karşılıklı backup (30 dk)
  - `recete_gm` ↔ `kalite_kontrol` (Senaryo A: users.backup_roles[] array kolonu)
  - `kalite_kontrol` ↔ `gida_muhendisi`
- [ ] **F05** — Yatirimci_HQ status=inactive (5 dk)

### 🕑 Kalan 37 bulgu (12 YÜKSEK + 15 ORTA + 10 DÜŞÜK) Sprint I (28 Nis+) backlog

### 📦 Replit'in 15 Hazırlık Dosyası (Pazar 27 Nis sabah'a kadar hazır)

- 5 doküman: sprint plan, f02 kod inceleme, parola runbook, 2 patch dosyası
- 10 script: F01+F02 toggle+rollback, F04 SPOF, test-branch cleanup, Nisan bordro backfill (--dry-run/--commit), O13+O06+O03

Push bekleniyor — Aslan GitHub token yenileyecek.

---

## 🔴 AÇIK P0 BLOKERLER (4)

| # | Sorun | Kanıt | Süre | Zaman |
|---|---|---|---|---|
| 1 | Devamsızlık pipeline ölü | shift_attendance son 7g=0, summary tabloları=0 | 2 gün | Pazartesi (Sprint B) |
| 2 | Bildirim spam regression | 21,482 okunmamış, haftalık 7,975 yeni (escalation_info+franchise_escalation) | 2 saat | 🟡 Plan B uygulanıyor (Replit T004) |
| 3 | Schema drift (fiyat geçmişi) | ✅ ÇÖZÜLDÜ (Replit Task #106 + #103) | - | Tamam |
| 4 | adminhq parolası `0000` | users tablosunda, pilot öncesi rotate şart | 5 dk | Pazartesi öncesi |

---

## 📍 ZORUNLU KONTROL NOKTASI — 25 Nisan 2026 (1 hafta sonra)

**Plan B (notification spam fix, 18 Nis uygulanan) ölçümü:**

```sql
SELECT type, COUNT(*)
FROM notifications
WHERE created_at >= NOW() - INTERVAL '7 days'
  AND type IN ('escalation_info','franchise_escalation','agent_escalation_info')
GROUP BY type;
```

**Karar kuralı:**
- Toplam < **2,000**/hafta → Plan B başarılı, Plan A.2 gereksiz
- Toplam > **3,000**/hafta → Plan A.2 (task_escalation_log) Sprint I (28 Nis+) başına ekle
- Arası (2,000-3,000) → monitörde tut, pilot başlangıcında (28 Nis) tekrar ölç

**Baseline (18 Nis):** 6,305/hafta (3 type toplamı)
**Plan B tahmini:** ~1,890/hafta (-70%)

---

## 🟡 AÇIK P1 (12 madde)

Detay: `docs/GENEL-DURUM-AUDIT-18-NISAN-2026.md` (Replit) + `SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` §7.2

Özetle: bordro Nisan yarım (10/41 user), satınalma fiilen yok (branch_orders=0), 3 rol dashboard widget yok (sef/fabrika_depo/recete_gm), görev tamamlama %22.6, drizzle-kit push kırık, 5 hayalet rol silinecek, session_forced_logout son 7g 33, Test Branch+Örnek şube silinecek, seed_test 704 PDKS temizlik, supervisor_buddy deprecate, npm audit borcu, gate sistemi dormant.

---

## 📊 Sistem Boyutu (18 Nis 2026)

| Alan | Değer | Not |
|---|---|---|
| Şubeler | 22 (20 aktif + HQ + Fabrika, 2 test) | Hepsi setup_complete ✅ |
| Kullanıcılar | 372 toplam / 159 aktif | 213 pasif (temizlik) |
| Roller | 27 kullanılan, 5 hayalet | Hayaletler silinecek |
| DB tabloları | 435 | Şişkin (423 + 12 drift) |
| Schema dosyaları | 23 (schema-01..23) | 18,545 satır toplam |
| Server route dosyaları | 114 | Çok parçalı |
| Frontend sayfaları | 215 | Code split gerekli |
| Sidebar kırık link | 0 (Sprint A1'de 26→0) | Orphan 16 sayfa kaldı |

---

## 📈 Son 7 Gün Telemetri

| Metrik | Değer | Yorum |
|---|---|---|
| pdks_records (tüm) | 10 event | 🔴 Çok düşük |
| pdks_records (kiosk) | 6 event | 🔴 Kullanım durmuş |
| shift_attendance | 0 | 🔴 Aggregate ölü (Sprint B hedefi) |
| Login (toplam) | 74 | ⚠️ Sadece admin/HQ/fabrika |
| **Şube müdür/barista/coach login** | **0** | 🔴 **Pilot kullanım yok** |
| Forced logout | 33 | 🔴 Session konfig sorunu |
| Login failed | 13 | 🟢 Normal |
| Notification üretim | 7,975 | 🔴 Spam (cooldown yok) |
| Task yeni | 2 | 🔴 Görev üretimi durdu |
| Task tamamlanan | 0 | 🔴 Tamamlama akışı durdu |
| Customer feedback | 0 | 🔴 Müşteri girişi yok |

---

## 🎯 8 Haftalık Sprint Roadmap

| Sprint | Tarih | İçerik | Durum |
|---|---|---|---|
| **A** | 21 Nis (1g) | Stop the Bleeding (26 kırık link, enum, seed safety) | ✅ 6/6 |
| **B** | 21-25 Nis | Attendance Pipeline Repair | 🟡 B.2 ✅ yazıldı, B.1+B.3+B.5 Pazartesi |
| **C** | 28 Nis - 4 May | Gate + Audit v1→v2 + CRM dashboard | 📋 Analiz tamam |
| **D** | 5-11 May | Bordro schema temizliği + Satınalma aktivasyon | 📋 Analiz tamam |
| **E** | 12-18 May | Dashboard widget + Rol konsolidasyon | 📋 Analiz tamam |
| **F** | 19-25 May | Test + CI/CD (vitest kurulu, 0 test) | 🔜 Kod analizi tamam |
| **G** | 26 May - 1 Haz | Performans (n+1, cache, materialized view) | 🔜 Kod analizi tamam |
| **H** | 2-15 Haz | Observability (Pino + Sentry + slow query) | 🔜 Kod analizi tamam |

---

## 🧠 Son Oturum Sonucu — 18 Nis 2026 Gece

**Push edildi (HEAD: `6d25a48`):**
- `379749e` fix(attendance): Sprint B.2 weekly catch-up
- `872e076` docs(skills): Madde 37 + §17/§18/§19
- `6d25a48` docs: devir-teslim + Replit prompt

**Yazıldı ama push edilmedi (Pazartesi 1 dk iş):**
- B.5 monthly_payroll scheduler (90 satır, server/index.ts) — son satır çağrısı eksik
- Komut paketi: `docs/REPLIT-ARASTIRMA-PROMPT-18NIS.md` yanında yazılı

**Aksi istikamette düşündüğümüz (iptal):**
- B.1 pdks→shift_attendance aggregate iskeleti — kiosk zaten real-time yazıyor, 300 satır silindi

**Memory kalibrasyonları:**
- #20: Teknik karar Claude, iş kararı Aslan
- #21: shift_attendance 6 yazıcı keşfi + ders
- #22: Oturum başı git log kontrol zorunlu

---

## 🚨 Git Hijyen Uyarısı

**Replit'in 18 Nis raporu diyor:** Local HEAD `95e9f6bcc`, 12 commit unpushed.
**Claude'un bu gece push'u:** `6d25a48` (3 commit).
**Sonuç:** Replit push fail edecek (non-fast-forward).

**Çözüm komutu** (Replit'e gönderilecek): `docs/REPLIT-ARASTIRMA-PROMPT-18NIS.md` yanındaki git+B.5 paketi.

**Kural:** Her Claude oturumu başında `git fetch && git log origin/main..HEAD` kontrolü (Memory #22).

---

## 📝 Bekleyen İş Kararları (Aslan)

- [ ] seed_test 704 PDKS kaydı: sil/arşivle/bırak?
- [ ] Cinnaboom commercial R&D vs platform önceliği dengesi
- [ ] Samet'in satınalma rol kapsamı (fatura+PO mi, sadece fatura mı?)
- [ ] 55 şube zamanlaması (2027/2028 rakam dağılımı)
- [ ] Yatırımcı şube operasyonel model (rapor görür mü, onay verir mi?)
- [ ] Pilot sonrası Sprint I+ yönü (franchise proje yönetimi sırası)
- [ ] Bordro scheduler ayın hangi günü kaçta çalışsın (muhasebe tercihi)
- [ ] Notification spam hotfix ne zaman (bu hafta sonu / Pazartesi / Sprint sonrası)
- [ ] 15 yeni doküman önerisinden hangileri öncelikli (Replit v4 raporu)

---

## 🔒 Çalışma Sistemi — Üçgen

| Köşe | Birincil Sorumluluk | Süreç |
|---|---|---|
| **Aslan** | İş kararı, süreklilik hafızası, UX sezgisi | Seçim yapar, onay verir |
| **Claude** | Mimari, kod, doküman, strateji, skill | Analiz, yazar, öneri getirir |
| **Replit** | DB doğrulama, runtime, build, 30-satır hotfix | Test eder, yakalar |

**Altın Kural (Madde 37):** Kod yazımı **ÖNCESİ** Replit DB teyidi. Envanter + 5 Kuşku Sorusu + Risk classifier.

---

## 🔑 Her Oturum Başı 5 Dakikalık Çeklist

```bash
# 1. Bu dosyayı oku (şu an buradasın)
cat docs/00-DASHBOARD.md

# 2. Git durumu kontrol
git fetch origin
git log --oneline origin/main..HEAD  # push edilmemiş?
git log --oneline HEAD..origin/main  # yeni çekilmemiş?

# 3. En son devir-teslim dosyasını tara
ls docs/DEVIR-TESLIM-*.md | tail -1 | xargs cat

# 4. Aktif sprint FINAL-KAPSAM
cat docs/SPRINT-B-FINAL-KAPSAM.md

# 5. Skill dosyalarını okumak gerekiyorsa (major iş öncesi):
# .agents/skills/dospresso-architecture/SKILL.md
# .agents/skills/dospresso-quality-gate/SKILL.md  (özellikle Madde 37!)
# .agents/skills/dospresso-debug-guide/SKILL.md (§17-§19)
# .agents/skills/session-protocol/SKILL.md
```

5 dakikada hizalandın. Çalışmaya başlayabilirsin.

---

## 📚 Derin Referanslar (İhtiyaç halinde)

| Konu | Dosya |
|---|---|
| Tam sistem analizi (1085 satır) | `docs/SISTEM-ANLAYIS-RAPORU-18-NISAN-2026.md` |
| Pilot hazırlık 8 hafta | `docs/PILOT-HAZIRLIK-8-HAFTA-YOL-HARITASI.md` |
| Replit v3 kapsamlı audit | `docs/GENEL-DURUM-AUDIT-18-NISAN-2026.md` (dış, Aslan ileti) |
| Aktif sprint kapsam | `docs/SPRINT-B-FINAL-KAPSAM.md` |
| Sprint C-E analiz | `docs/SPRINT-{C,D,E}-FINAL-KAPSAM.md` |
| Kod ders kuralları | `.agents/skills/dospresso-quality-gate/SKILL.md` (Madde 37!) |
| Bug pattern'leri | `.agents/skills/dospresso-debug-guide/SKILL.md` (§17-§19) |
| Mimari referans | `.agents/skills/dospresso-architecture/SKILL.md` |

---

## ⚠️ Kronik Bilgi Boşlukları (Pilot'a kadar doldurulacak)

| Boşluk | Sprint | Kim yazacak |
|---|---|---|
| Pilot kullanıcı profilleri (4 lokasyon × 3-4 kişi) | - | Aslan (saha bilgisi) |
| 27 rol × günlük akış dokümanı | C/E | Aslan + Claude |
| Runbook (DB down, kiosk bozuk prosedürü) | H | Claude + Replit |
| Security audit (KVKK, 2FA, rate limit) | H | Claude + Replit |
| Haftalık canlı veri snapshot otomatik üretim | G | Replit (npm script) |
| ER diyagramı + dead table listesi | F | Replit (DB audit) |

---

*Son oturum: 18 Nis 2026 Cumartesi gece. Bir sonraki: Pazartesi 21 Nis sabah.*
*Bu dosya her oturum sonu güncellenir. Değişirse commit.*

---

## 🗑️ Repo Cleanup Kararı (18 Nis gece finalize)

**Karar:** Option 1.5 — Selective Aggressive + PİLOT SONRASI

**Ne silinecek (Cat C, 1693 dosya, ~895 MB):**
- Replit Agent ekran görüntüleri (IMG_0XXX.png)
- Replit paste metinleri (Pasted-*.txt)
- Yalnızca attached_assets/ klasörü içinde
- Frontend/backend/DB'de **sıfır referans** (Replit tarama doğruladı)

**Ne KORUNACAK:**
- ✅ Reçeteler (DB — factory_recipes tablosu)
- ✅ Roller (shared/schema/schema-02.ts + module-manifest.ts)
- ✅ Görevler (DB — tasks tablosu)
- ✅ Kullanıcılar (DB — users tablosu)
- ✅ Bordro (DB — monthly_payroll)
- ✅ Aktif @assets import'ları (17 dosya: logo, academy, stock_images)
- ✅ Operasyonel doc (PDF, DOCX, MD — 32 dosya)
- ✅ Tüm kod (client/, server/, shared/, docs/)

**Ne zaman:** 28 Nis pilot GO LIVE SONRASI. Pilot öncesi HİÇ dokunulmayacak.

**Cat D (19 dosya) tek tek karar:**
- 7 reçete PDF duplicate → md5 karşılaştır aynıysa 6 sil
- 10 Excel/zip seed dump → KolayIK DB'ye seed olduysa sil
- 3 .skill dosyası → .agents/skills/ ile aynıysa sil
- 1 akademi-v3-mockup.jsx → frontend kullanım yok, muhtemelen sil

**Git history rewrite:** HAYIR (pilot öncesi risk, pilot sonrası ayrı task).

Referans: `docs/ATTACHED-ASSETS-CLEANUP-PROPOSAL.md` (Replit commit 9a5532587)

---

