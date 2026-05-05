# 🧑‍💼 İK SİSTEMİ YENİDEN TASARIM — Master Plan
**Tarih:** 6 Mayıs 2026
**Owner kararı:** Aslan, "tüm işleri aynı anda bitir" (5 May 2026)
**Sprint:** S17-IK-REDESIGN (Feature Freeze pause sonrası)
**Branch:** `claude/ik-redesign-2026-05-06`
**Tahmini boyut:** ~3.500-5.000 satır kod, 15-20 dosya, tek PR

---

## 🎯 NEDEN BU REDESIGN

### Asıl şikayet (Aslan, 5 May 2026 21:00)
> "Şuanki sistem baya karışık. Normalde bir muhasebe, IK, CRM dashboard nasıl olmalı? Çok daha basit, istenilen bilgilere nasıl ulaşılmalı?"

### Sprint 13'ün eksik çözümü (5 May 2026)
- `ik-merkezi.tsx` (295 satır) bir **menü hub** olarak yapıldı — 13 link butonu, 4 kategoride
- Asıl sorun çözülmedi: kullanıcı hâlâ **ayrı sayfalar arasında dolaşmak** zorunda
- Mahmut bordro hesabı için Excel'i bırakmış değil — sistemden hızlı sonuç alamıyor
- Müdür için "bu hafta takım durumu" tek ekranda yok

### İçgörü
İK = gerçek bir **dashboard sistemi** olmalı (Sprint 13 menü değil). Mahmut'un Excel'i 2 farklı maaş modeli ve 5 farklı kesinti kuralı uyguluyor — sistem bu mantığı 1:1 yansıtmalı.

---

## 🌐 BÜTÜNSEL ETKİ HARİTASI

### Doğrudan etkilenecek modüller
| Modül | Etkileşim | Kritik mi? |
|---|---|---|
| **Bordro hesaplama** (`payroll-engine.ts`, `payroll.ts`) | Dual-model destek (Lara matrisi + HQ özel) | 🔴 Evet |
| **PDKS (`shifts`, `pdks_records`, `monthly_attendance_summaries`)** | Konsolide view → bordroya tek kaynak | 🔴 Evet |
| **İzin sistemi** (`leave_requests`, `employee_leaves`, `leave_records`) | Konsolide tablo + balance kalkülasyonu | 🟠 Yüksek |
| **Mesai (`overtime_requests`)** | Onay workflow yönetici dashboarduna | 🟠 Yüksek |
| **Performans (`monthly_employee_performance` + score_parameters)** | Sprint 8 placeholder dolacak — hub'a entegre | 🟡 Orta |
| **Yetki (`role_module_permissions`)** | İK modülü scope'u net: kişisel/yönetici/HQ/admin | 🟡 Orta |
| **Mali Rapor** (D-12: HQ + Fabrika + Işıklar) | Bordro toplu hesaplamada scope filter | 🔴 Evet |
| **Mr. Dobody routing** | İzin/mesai event'leri agent'a gitmeli | 🟡 Orta |
| **Kiosk** | Personel kart sayfası kiosk'tan görüntüleniyor (test gerekir) | 🟡 Orta |

### Dolaylı etkilenecek (kontrol edilecek)
- Akademi: personel kartında "eğitim" sekmesi → yeni hub'tan link
- Branch Audit V2: personel skoru audit'e besleniyor
- CRM/Görev: kullanıcı listesi okuma (read-only, bozulmaz)

### Asla etkilenmeyecek
- Reçete sistemi (branch/factory)
- Üretim planlama
- TGK etiket
- Stok modülü

---

## 🏗️ MEVCUT SCHEMA ENVANTERİ (Faz 1 keşfi)

### ✅ Yeni tablo gereksiz — mevcut yapı uyuyor
- **`positionSalaries` (schema-12)** ⇒ Lara matrisi için tasarlanmış zaten:
  - `positionCode`, `positionName`, `totalSalary`, `baseSalary`, `bonus`, `effectiveFrom`
- **`monthlyPayroll` (schema-12)** ⇒ kullanılan tablo (16 kayıt), `positionCode` field'ı dual-model destekliyor
- **`users.netSalary` (schema-02:2706)** ⇒ kişiye özel hakediş için zaten var
- **`payrollDeductionConfig` (schema-12)** ⇒ FM threshold, holiday pay, meal allowance ayarları

### 🟡 Konsolidasyon kararı
- **Bordro:** `monthlyPayroll` (schema-12) AKTİF — D-19/D-22 ile karara bağlandı, schema-07 `monthlyPayrolls` deprecated
- **İzin:** `leave_requests` + `employee_leaves` + `leave_records` → DB query sonucu sonrası **kanonik tablo seçimi**
- **PDKS:** `pdks_records` (boş) + `shift_attendance` + `monthly_attendance_summaries` (685 dolu) → kanonik view

### ➕ Eklenecek (yeni)
- `positionSalaries` SEED migration (Lara'nın 5 pozisyonu — Stajyer/BarBuddy/Barista/SupBuddy/Sup)
- `users.salary_model` (opsiyonel) — ENUM: 'lara_position' | 'custom_individual'. positionCode varlığından da çıkarılabilir, ama explicit olması debug kolaylaştırır.

---

## 📐 4 FAZ — TEK SPRINT'TE

### FAZ 1 — Schema sağlamlaştırma (~2 saat, 4-5 dosya)

**Migrations:**
1. `migrations/2026-05-06-position-salaries-lara-seed.sql`
   - Lara 5 pozisyonu seed (Stajyer 33K, BarBuddy 36K, Barista 41K, SupBuddy 45K, Sup 49K)
   - `effective_from = '2026-01-01'` (Lara duyurusuna göre)
   - Header'da resmi kaynak: "DOSPRESSO 2026 Maaş & Prim Sistemi – Şube Uygulama Duyurusu, 24.11.2025"
2. `migrations/2026-05-06-leave-system-canonical-view.sql`
   - DB query sonucu sonra netleşecek — hangi tablo aktif kullanılıyorsa kanonik kılınır, diğerleri 30 gün shadow read window'a alınır (Sprint B prensip)
3. `shared/schema/schema-12.ts` — `users.salary_model` enum kolonu (opsiyonel)
4. `server/services/payroll-engine.ts` — dual-model destek (positionCode varsa lookup, yoksa users.netSalary)

**5-perspektif review:**
| Perspektif | Değerlendirme |
|---|---|
| Principal Eng | Schema değişikliği minimal, mevcut yapıya saygılı. Migration backup zorunlu. |
| Franchise F&B | Lara pozisyon matrisi sistemde olduğunda Mahmut Excel'i sadeleşir. |
| Senior QA | Migration EXECUTE öncesi 3 senaryo test: Lara çalışanı, HQ çalışanı, geçiş anı. |
| Product Manager | Dual-model "show, don't hide" — kullanıcıya hangi modda olduğu belli olsun. |
| Compliance | İş K. Md.49 ÷30 günlük ücret korunmalı; Lara ÷çalışma günü farklı, doğru hesap modu seçimi kritik. |

---

### FAZ 2 — Yeni İK Hub + 4 Dashboard (~2 gün, 6-8 yeni component)

**Replace:** `client/src/pages/ik-merkezi.tsx` (295 satır menü → 100 satır wrapper, asıl iş 4 dashboard component'inde)

**Yeni componentler:**
1. `client/src/components/ik/PersonalDashboard.tsx`
   - Bu ay bordrom (kart): brüt + net + çalışma gün + izin gün + FM saat
   - İzin bakiyem: 2026 hak edilen + 2025 devir + kullanılan + kalan
   - Performansım: 5 kategori 90 puan (Sprint 8'den)
   - Hızlı aksiyonlar: izin talep, mesai talep, profil güncelle
2. `client/src/components/ik/ManagerDashboard.tsx`
   - Takım kartı: bu hafta takvim (vardiya + izin + mesai tek görünüm)
   - Onay kuyruğu: bekleyen izin/mesai (sayı + 1 tıkla onayla)
   - Bu ay bordro durum: takımdan kaç bordro hazır/eksik
   - Performans skor kartı (rol bazlı)
3. `client/src/components/ik/HQDashboard.tsx`
   - 4 lokasyon özet (Işıklar 11 + İmalathane 10 + Ofis 5 + Lara 9)
   - Bu ay toplu bordro durum (Mahmut için kritik)
   - İK uyarıları: kontrat süresi yaklaşan, izni 0 olan, hak ediş zamanı gelen
   - Hızlı aksiyonlar: yeni personel, toplu bordro, mali rapor
4. `client/src/components/ik/AdminDashboard.tsx`
   - Skor parametreleri (Sprint 8'den linkli)
   - Pozisyon maaş matrisi yönetimi (Lara için)
   - payroll_parameters yıllık değerler (Mahmut için)
   - KVKK / audit panel
5. `client/src/components/ik/PendingActionsBanner.tsx`
   - Tüm dashboard'larda üstte ortak
   - Bekleyen onay/aksiyon sayıları
6. `client/src/components/ik/SalaryModelBadge.tsx`
   - Personel kartlarında "Lara Pozisyon" / "Özel" rozet

**Backend support:**
- `server/routes/ik-hub.ts` (yeni)
  - `GET /api/ik-hub/dashboard?role=mudur` → role-tailored aggregate
  - `GET /api/ik-hub/team-calendar?branchId=` → takım takvimi (vardiya + izin + mesai)
  - `GET /api/ik-hub/pending-actions` → onay kuyruğu sayıları
  - `GET /api/ik-hub/personnel-stats?branchId=` → şube personel istatistik

**5-perspektif review:**
| Perspektif | Değerlendirme |
|---|---|
| Principal Eng | Component reusability + tek aggregate endpoint = N+1 query yok. |
| Franchise F&B | Mahmut: "bu ay kim eksik bordro" 1 tıkla görünür. Müdür: takım takvimi 1 ekran. |
| Senior QA | 4 dashboard × 4 rol = 16 kombinasyon. Manuel test plan zorunlu. |
| Product Manager | Mobile-first (pilot tablette). Tap-friendly target boyutu 44px+. |
| Compliance | Maaş bilgisi gizleme: HQ rolleri tüm görsün, mudur kendi şubesi, barista sadece kendisi. |

---

### FAZ 3 — Self-service akışları (~1 gün, 3-4 sayfa)

**Yeni/güncellenen sayfalar:**
1. `client/src/pages/ik/izin-talep.tsx`
   - Mahmut'un Excel'inde 12 ay matrisi → digital
   - Tarih seçimi (range), izin tipi (yıllık/mazeret/sağlık/ücretsiz)
   - Bakiye kontrolü canlı (mevcut + hak edilen + devir)
   - Submit → notification yöneticiye → onay/red
2. `client/src/pages/ik/mesai-talep.tsx`
   - Tarih + saat aralığı + neden
   - Submit → mudur onay
3. `client/src/pages/bordrom.tsx` (mevcut, GÜNCELLE)
   - Lara formatında bordro PDF üretimi
   - "🔵 PDKS'den otomatik" / "🟡 Elle girilebilir" mantığı

**Backend:**
- `POST /api/leave-requests` zaten var → form binding
- `POST /api/overtime-requests` zaten var
- `GET /api/payroll/me/:year/:month/pdf` (yeni endpoint — Lara formatında PDF)

**5-perspektif review:**
| Perspektif | Değerlendirme |
|---|---|
| Principal Eng | PDF üretim için pdfkit veya puppeteer? Mevcut TGK PDF mantığını yeniden kullan. |
| Franchise F&B | Self-service = barista kendi izin talebini yapar, müdür WhatsApp yerine sistemden onaylar. |
| Senior QA | İzin balance overflow test (9.5 gün kalmış, 10 gün talep). |
| Product Manager | Talep formu max 3 alan (tarih, tip, neden) — minimum friction. |
| Compliance | Yıllık izin İş K. Md.53 (0-1 yıl: 14 gün, 1-5 yıl: 14 gün, 5-15 yıl: 20 gün, 15+: 26 gün). |

---

### FAZ 4 — Yönetici dashboardu detayları (~1 gün, 3 sayfa)

**Yeni sayfalar:**
1. `client/src/pages/ik/takim-takvimi.tsx`
   - Aylık görünüm (calendar grid)
   - Vardiya + izin + mesai aynı görünümde renk kodlu
   - Müdür/supervisor: kendi şubesi
2. `client/src/pages/ik/bordro-onay.tsx`
   - Şube müdürü kendi şubesinin bordrosunu görür
   - "Onayla" butonu → muhasebe (Mahmut) onayına gider
   - Mahmut → CEO onayına gönderir
3. `client/src/pages/ik/onay-kuyrugu.tsx`
   - Tüm bekleyen onaylar (izin, mesai, bordro)
   - Toplu işlem: "Hepsini onayla" / "Detay göster"

**Backend:**
- `GET /api/ik-hub/team-calendar` (yukarıda zaten var)
- `POST /api/payroll/:id/approve` (yeni veya mevcut workflow)
- `GET /api/ik-hub/approvals/pending?role=` (yeni)

**5-perspektif review:**
| Perspektif | Değerlendirme |
|---|---|
| Principal Eng | Approval chain: mudur → muhasebe (Mahmut) → ceo. State machine açıkça tanımlı. |
| Franchise F&B | Müdür "haftalık takım durumu" tek ekranda — operasyonel kazanç büyük. |
| Senior QA | State transition test: pending→approved, pending→rejected, approved→null (rollback?) |
| Product Manager | Bulk approve riski — yanlış onay sonrası undo? 24 saat içinde undo tab eklenebilir. |
| Compliance | Bordro onay audit trail KVKK için zorunlu — `record_revisions` tablosuna kaydet. |

---

## 🚨 KRİTİK RİSKLER VE ÖNLEMLER

| Risk | Etki | Önlem |
|---|---|---|
| **Schema değişikliği DB'de uygulanmazsa drift** | Drizzle TS ile DB farklı | Migration EXECUTE öncesi pg_dump backup; Replit isolated agent ile uygula |
| **Dual-model maaş hesabı yanlış mod seçimi** | Kullanıcının maaşı yanlış | Salary mode resolution: `if (user.positionCode) lookup positionSalaries; else use user.netSalary`. Test 3 senaryo: Lara, HQ, geçiş. |
| **3 paralel izin tablosu konsolidasyonunda veri kaybı** | Eski izin kayıtları kaybolur | Sprint B prensibi: 30 gün shadow read window. Eski tabloları DROP yapma — `is_active=false` ile pasifleştir. |
| **Yeni hub mevcut sayfaları kıracak link verir** | Müdür tıklar, 404 alır | Tüm linkler mevcut route'lara verilir. Yeni sayfalar `/ik/*` namespace'inde — çakışma yok. |
| **5 May incident tekrarı: marker push** | Build kırılır, pilot riski | Her commit öncesi `grep '<<<<<<<'` zorunlu (D-38). |
| **Tek büyük PR (3K-5K satır)** | Review zor, hata gözden kaçar | Mantıksal commit'ler (her commit kendi içinde tutarlı + buildable). 5 perspektif her commit'te. |
| **Mahmut Excel'i ile sistem farklılığı** | Pilot ay bordro 0 ya da yanlış | "Excel ayna mod": pilot ilk ay paralel mod, sistem-Excel diff raporu. |
| **D-12 muhasebe scope ihlali** | Lara bordrosu mali rapora karışır | `/api/ik-hub/financial-summary` endpoint hard-coded scope: HQ+Fabrika+Işıklar. |
| **KVKK: maaş bilgisi gizleme** | Barista başka baristanın maaşını görür | Salary fields backend'de scope-filtered: kullanıcı ya kendi (her zaman) ya yetkili rol (mudur/HQ) görür. |

---

## 📊 BAŞARI KRİTERLERİ

### Faz 1 sonrası
- [ ] `position_salaries` 5 kayıt (Lara matrisi)
- [ ] Migration EXECUTE smoke test geçti
- [ ] payroll-engine dual-model test 3 senaryoda PASS

### Faz 2 sonrası
- [ ] /ik-merkezi yeni hub render — 4 rol için farklı görüntü
- [ ] PendingActionsBanner doğru sayı gösteriyor
- [ ] Mobile (Safari iPad) layout sorunsuz

### Faz 3 sonrası
- [ ] Barista kendi izin talebini yapabiliyor
- [ ] Bakiye real-time hesaplanıyor
- [ ] Bordro PDF Lara formatında üretiliyor

### Faz 4 sonrası
- [ ] Müdür takım takvimini görüyor (vardiya+izin+mesai aynı ekran)
- [ ] Onay kuyruğu çalışıyor (mudur→Mahmut→CEO)
- [ ] Audit trail her onay için kayıt

### Genel pilot kriterleri
- [ ] Mahmut Excel diff raporu < %5 sapma
- [ ] 33 pilot kullanıcı için 1 hafta günlük login >%80
- [ ] 0 P0 incident
- [ ] Bordro doğrulaması: Mayıs 2026 bordrosu üret + Mahmut onaylar

---

## 🔄 ROLLBACK PLANI

Her commit kendi başına buildable. Eğer Sprint sonunda kritik sorun çıkar:

1. **PR mergelenmediyse:** branch'i kapat, plan dökümanı işe yaradı (sonraki sprint için baz)
2. **Mergelenip canlı bozulursa:** revert PR (GitHub UI tek tıkla)
3. **Schema değişikliği geri alma:** Migration ROLLBACK section'ları her dosyada var
4. **Eski sayfa kaldıysa:** Yeni hub içinde "Klasik görünüm" toggle (geçiş süresi 1 ay)

---

## 📅 SPRINT TAKVİMİ (gerçekçi)

| Gün | Faz | Çıktı |
|---|---|---|
| 6 May (bugün) | Plan + Faz 1 | Plan dosyası commit + position_salaries seed migration |
| 7 May | Faz 2 (1/2) | ik-merkezi.tsx + PersonalDashboard + ManagerDashboard |
| 8 May | Faz 2 (2/2) | HQDashboard + AdminDashboard + ik-hub backend |
| 9 May | Faz 3 | izin-talep + mesai-talep + bordrom PDF |
| 10 May | Faz 4 (1/2) | takim-takvimi + bordro-onay |
| 11 May | Faz 4 (2/2) + Test | onay-kuyrugu + integration test + PR aç |
| 12 May | Buffer + Mahmut diff | Excel-sistem karşılaştırma + final fix |

**Toplam:** 7 gün (gerçekçi); pilot tarihi Aslan'ın takdirinde.

---

## 🤝 İLETİŞİM

- **Aslan:** Owner, her faz sonunda onay
- **Replit Agent:** DB query + migration EXECUTE + smoke test
- **Mahmut:** Bordro doğrulama, payroll_parameters update — **doğrudan iletişim YOK** (Aslan'ın kararı: ben Excel'den tahmin yapacağım, Mahmut sonra feedback verir)
- **Claude:** Mimari + kod + skill update + dökümantasyon

---

## 📋 DEPENDENCY KONTROL

Bu sprintten ÖNCE bitmiş olmalı:
- ✅ Sprint 8 EXECUTE (DB cleanup + 35 personel UPSERT) — **hâlâ bekliyor!** (P-3 PENDING)
  - **Risk:** Sprint 8 EXECUTE olmadan benim sprintim 119 fake personelle test edilir
  - **Karar:** Faz 1 schema migration Sprint 8 ile aynı zamanda Replit'e gönderilebilir (paralel migration)
- ✅ Token write yetkisi — düzeltildi (PR #25 ile push çalıştı)
- ✅ payroll_parameters 2026 düzeltildi — PR #25 mergelendi

Bu sprintten SONRA gelecek:
- Akademi seed (Sprint A-H Sprint C kapsam)
- Stok modülü pilot enable kararı
- monthly_payroll → monthly_payrolls migration (D-22 Seçenek A, pilot sonrası)

---

**Son güncelleme:** 6 May 2026 (Claude, plan v1)
**İlgili kararlar:** D-07 (5 perspektif), D-12 (muhasebe scope), D-19 (monthly_payroll aktif), D-20 (Feature Freeze pause), D-22 (bordro tablo karar), D-24 (35 gerçek personel)
