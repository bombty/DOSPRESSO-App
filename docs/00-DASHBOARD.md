# 📊 DOSPRESSO — 00-DASHBOARD.md

**Son Güncelleme:** 18 Nis 2026 Cumartesi gece (Aslan oturumu sonu)
**Amaç:** Her Claude oturumu başında 5 dakikada sisteme hizalan
**Güncelleme Kuralı:** Her oturum sonu `session-protocol` skill'i Adım 1 gereği güncellenir ve commit'lenir

> Bu dosya statik değil, **yaşayan durum özeti**. Değişirse → commit. 100 doküman yerine bu 1 dosya.

---

## 🎯 Şu An Neredeyiz?

| Metrik | Değer |
|---|---|
| **Pilot Hazırlık Skoru** | **5.4/10 (%75)** — Replit v3 audit (18 Nis) |
| **Aktif Sprint** | A ✅ tamam → **B başlıyor** (Pazartesi 21 Nis) |
| **Feature Freeze** | 18 Nis → 15 Haz (yeni özellik YOK) |
| **Pilot Başlangıç** | ~15 Haziran 2026 |
| **Pilot Lokasyon** | HQ + Fabrika + Işıklar + Lara |

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
- Toplam > **3,000**/hafta → Plan A.2 (task_escalation_log) Sprint I (16 Haz+) başına ekle
- Arası (2,000-3,000) → monitörde tut, pilot başlangıcında (15 Haz) tekrar ölç

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
