# DOSPRESSO — 8 Haftalık %100 Çalışan Sistem Yol Haritası

**Tarih:** 18 Nisan 2026
**Başlangıç:** Bu hafta (Nisan 3. hafta)
**Hedef Bitiş:** Haziran 2. hafta
**Prensip:** "Önce Düzelt, Sonra Ekle" — 8 hafta **Feature Freeze**
**Referans Audit:** Replit Runtime Audit Raporu (17 Nisan 2026)

---

## 🎯 Hedef Metrikler (Pilot Launch Hazırlık)

| KPI | Şu An | 8. Hafta Sonu |
|-----|:-----:|:-------------:|
| 404 oranı | bilinmiyor | **< %0.1** |
| Avg API latency | 52ms | **< 100ms** |
| p95 API latency | bilinmiyor | **< 300ms** |
| Görev tamamlanma oranı | %44 | **> %70** |
| Görev iptal oranı | %49 | **< %15** |
| Bildirim okunma oranı | %0.02 | **> %30** |
| Açık arıza > 30 gün | 9 | **< 3** |
| Bordro hesaplama / ay | 0 | **372** (tüm personel) |
| Test coverage | 0 | **> %50** |
| Kırık sidebar linki | 17 | **0** |
| Orphan sayfa | 170 | **< 20** |
| Duplicate seed dosyası | 2 | **0** |

---

## ⏸️ FEATURE FREEZE POLİTİKASI

**8 hafta boyunca yeni özellik geliştirilmeyecek.** Sadece:
- ✅ Kırık bug fix
- ✅ Veri konsolidasyonu
- ✅ Test yazma
- ✅ Observability ekleme
- ❌ Yeni modül / yeni tablo / yeni özellik

Yeni özellik istekleri **Sprint I (9. hafta)** backlog'una alınacak.

**Bu politika Aslan + IT danışman + Replit agent tarafından paylaşılır.**

---

## 📅 SPRINT PLANI — 8 Hafta

---

### 🔥 SPRINT A — Stop the Bleeding (Hafta 1)

**Hedef:** Pilot launch öncesi tüm kullanıcı 404 görmemeli. En kritik 5 yangın söndürme.

| # | Eylem | Süre | Öncelik | Sorumlu |
|---|-------|------|---------|---------|
| A1 | **17 kırık sidebar linki düzelt** (Satınalma 5 + Fabrika 4 + /admin + /akademi + /ekipman + /ik + /raporlar) | 2 gün | P0 | IT danışman |
| A2 | **Recipe↔Product mapping fix** (script hazır: `server/scripts/fix-recipe-product-mapping.ts`) | 30 dk | P0 | Replit çalıştırır |
| A3 | Equipment fault status/priority enum migration (TR→EN tek tip) | 4 saat | P0 | IT danışman |
| A4 | `/api/seed/*` endpoint'leri admin-only middleware | 1 saat | P0 | IT danışman |
| A5 | `stub-endpoints.ts` 52 endpoint — tamamla veya 404 döndür | 1 gün | P0 | IT danışman |
| A6 | Agent bildirim aggregation (escalation_info saatlik özet) | 1 gün | P1 | IT danışman |

**Çıktılar:**
- 0 broken link (sidebar tıklanabilirliği %100)
- Seed endpoint'leri prod'da güvenli
- Enum raporları tutarlı
- Bildirim spam yok

**Checkpoint:** Cuma akşamı Replit audit — 17→0 kırık link doğrulama

---

### 🧹 SPRINT B — Veri Konsolidasyon 1 (Hafta 2)

**Hedef:** 3 paralel puantaj → 1, 3 paralel izin → 1.

| # | Eylem | Süre |
|---|-------|------|
| B1 | **Puantaj audit script** (hangi tabloda kaç kayıt, çakışma var mı) | 4 saat |
| B2 | `attendance_unified` view oluştur (shift_attendance + pdks_excel + pdks_records) | 1 gün |
| B3 | Shadow read window başlat (dual-write 1 hafta, sonra eski'yi kapat) | 1 hafta |
| B4 | **İzin audit script** (leave_requests vs leave_records vs employee_leaves) | 4 saat |
| B5 | `leaves` tek tablo migration | 1 gün |
| B6 | 2 onboarding sistemini birleştir (employee_onboarding* + onboarding_*) | 1 gün |

**Kritik prensip:** Hiçbir tablo **silinmeden** önce 30 gün archive period. Dual-write ile doğrulama yapılacak.

**Çıktılar:**
- Tek "source of truth" puantaj verisi
- Tek izin tablosu
- Tek onboarding sistemi
- Bordro hesaplama için doğru veri kaynağı

---

### 🎓 SPRINT C — Akademi + CRM Konsolidasyon (Hafta 3)

**Hedef:** 3 akademi versiyonundan 1'i canlıya. CRM tablolarını düzgün isimlendir.

| # | Eylem | Süre |
|---|-------|------|
| C1 | **Akademi access log analizi** — v1/v2/v3 hangisi canlı? (son 30 gün endpoint hit) | 4 saat |
| C2 | Diğer 2 versiyonun route'larını v3'e redirect et (301) | 4 saat |
| C3 | v3'te eksik özellikleri tek seferde port et | 2 gün |
| C4 | v1+v2 kod arşivle (6 ay grace, sonra sil) | 2 saat |
| C5 | **CRM tabloları oluştur** (`crm_tickets`, `crm_messages`, `crm_customers`) | 1 gün |
| C6 | `crm-iletisim.ts` 33 endpoint'i doğru tablolara bağla | 1 gün |
| C7 | 25 akademi orphan sayfa için sidebar bağlantısı | 4 saat |

**Çıktılar:**
- Tek akademi versiyonu canlıda
- CRM modülü DB ile senkron
- Müşteri ticket sistemi çalışır

---

### 📦 SPRINT D — Satınalma + Fabrika Modül Tamamlama (Hafta 4)

**Hedef:** Tüm sidebar öğeleri çalışır durumda. Bordro hesaplama aktif.

| # | Eylem | Süre |
|---|-------|------|
| D1 | Satınalma 5 sayfası oluştur (sipariş, tedarikçi, mal kabul, stok, ana) | 3 gün |
| D2 | Fabrika kalite-kontrol sayfası | 1 gün |
| D3 | Fabrika üretim-planlama sayfası (zaten backend var) | 2 gün |
| D4 | Fabrika performans + vardiya-uyumluluk sayfaları | 1 gün |
| D5 | **Bordro hesaplama job** — payroll_records dolsun | 2 gün |
| D6 | Bordro onay workflow (muhasebe → ceo onay) | 1 gün |

**Çıktılar:**
- Satınalma modülü %100 çalışır
- Bordro hesaplama otomatik (aylık 372 personel)
- Fabrika modülü bütünleşmiş

---

### 🎨 SPRINT E — Dashboard Tamamlama + Rol Temizliği (Hafta 5)

**Hedef:** Her kullanıcı kendi dashboard'unu görür. Ölü roller temizlenir.

| # | Eylem | Süre |
|---|-------|------|
| E1 | 14 boş rol için dashboard widget atamaları (stajyer, bar_buddy, gida_muhendisi, kalite_kontrol, satinalma, marketing, recete_gm, destek, teknik, fabrika_depo, fabrika_mudur, uretim_sefi, sef, yatirimci_hq) | 2 gün |
| E2 | Coach Uyum Paneli'ni sidebar'a ekle | 1 saat |
| E3 | Komuta Merkezi 14 boş rol için minimum widget seti | 1 gün |
| E4 | **Rol konsolidasyonu** 27→18: tek kullanıcılı 13 rolün 9'unu birleştir | 2 gün |
| E5 | Ölü rolleri sil (fabrika_personel, fabrika_sorumlu — 0 kullanıcı) | 1 saat |
| E6 | Architecture skill ↔ DB senkronizasyon (29 vs 25 rol) | 2 saat |

**Çıktılar:**
- Her rol minimum 3 widget görür
- 27 rol → 18 rol (daha az bakım)
- Skill dosyası = DB gerçeği

---

### 🧪 SPRINT F — Test Altyapısı + CI/CD (Hafta 6)

**Hedef:** Her PR otomatik test edilir. Unit test coverage %50'ye çıkar.

| # | Eylem | Süre |
|---|-------|------|
| F1 | Vitest kurulumu + ilk test dosyaları (auth, cost-analysis) | 1 gün |
| F2 | **10 kritik E2E senaryo** yaz (Playwright) | 3 gün |
| F3 | GitHub Actions CI pipeline (tsc + eslint + vitest + playwright smoke) | 1 gün |
| F4 | Pre-commit hook (husky + lint-staged) | 2 saat |
| F5 | PR template (Schema değişti? Test eklendi? Sidebar bağlandı?) | 1 saat |
| F6 | Drizzle migration history aç (`drizzle-kit generate`) | 4 saat |

**10 E2E Senaryo:**
1. Müdür login → görev oluştur → barista ata → tamamla
2. Müdür → vardiya oluştur → barista check-in/out → puantaj görünür
3. Barista QR arıza bildir → teknik atama → çözüm
4. Admin → yeni şube → onboarding wizard
5. Fabrika operatör kiosk → reçete üret → kalite kontrol → batch kapat
6. Şifre unut → email reset → yeni şifre login
7. CRM müşteri şikayeti → ticket → görev → çözüm
8. Akademi modül başla → quiz çöz → sertifika
9. Bordro hesapla → onay → personel görüntüleme
10. Mr. Dobody gap detection → öneri → görev oluşur

**Çıktılar:**
- Her PR CI'dan geçmeden merge olmaz
- 10 kritik akış otomatik test ediliyor
- Schema drift erken tespit

---

### ⚡ SPRINT G — Performans Optimizasyonu (Hafta 7)

**Hedef:** p95 API latency <300ms. Yavaş sorgular düzeltildi.

| # | Eylem | Süre |
|---|-------|------|
| G1 | N+1 query tespiti (Drizzle `with:` ekle) | 2 gün |
| G2 | Composite index ekle (branch_id, created_at, status gibi) | 1 gün |
| G3 | **Materialized view** cost-analysis için (hourly refresh) | 1 gün |
| G4 | Caching stratejisi (user permissions 5dk, module flags 10dk, reçete maliyeti 1 saat) | 2 gün |
| G5 | Bundle splitting (dist/index.js 5.9MB → <3MB) | 1 gün |
| G6 | Frontend lazy-load akademi + eski analytics modülleri | 4 saat |

**Hedef endpoint'ler:**
- `/api/cost-analysis/recipes` 131ms → <50ms
- `/api/me/dashboard-data` 128ms → <50ms

**Çıktılar:**
- p95 latency <300ms
- Server bundle 5.9MB → <3MB
- Client ilk sayfa yüklenme <2sn

---

### 👁️ SPRINT H — Observability + Hardening (Hafta 8)

**Hedef:** Her hata 5 dakika içinde tespit edilir. Audit trail tam.

| # | Eylem | Süre |
|---|-------|------|
| H1 | **Structured logging** (Pino) — traceId, userId, role, duration | 1 gün |
| H2 | **Sentry entegrasyonu** (frontend + backend error tracking) | 1 gün |
| H3 | Slow query log (>200ms otomatik kayıt) | 4 saat |
| H4 | 404 tracking (kullanıcı hangi linke tıkladı 404?) | 4 saat |
| H5 | **Sistem sağlık widget** (Mr. Dobody için) | 2 gün |
| H6 | Audit trail genişletme (INSERT/UPDATE/DELETE all) | 1 gün |

**Dashboard KPI'ları (admin için):**
- Bugün ne kadar görev oluştu/tamamlandı/iptal?
- Açık arıza > 30 gün sayısı
- Bordro hesaplanmamış personel
- Eğitim tamamlama oranı (rol bazlı)

**Çıktılar:**
- Production hataları 5dk içinde Slack'e düşer
- Her kullanıcı 404'ü tespit edilir
- Admin panelinde sistem sağlığı görünür

---

## 🤝 İŞ BÖLÜMÜ — IT Danışman ↔ Replit Agent ↔ Aslan

### Aslan (Direktör)
- ✅ Öncelikleri belirler
- ✅ Sprint onayı verir
- ✅ Pilot launch kararı
- ✅ Fatura/üretim gerçek verisi sağlar

### IT Danışman (Claude)
- ✅ Yeni özellik geliştirme (Sprint I sonrası)
- ✅ Mimari kararlar
- ✅ Schema tasarımı
- ✅ Sprint planlama
- ✅ Code review (PR onayı)
- ✅ Büyük feature sprintleri

### Replit Agent
- ✅ Pull + build + test rapor
- ✅ Hotfix-level bug fix (TS error, schema drift, kırık link)
- ✅ Haftalık audit raporları
- ✅ DB sağlık kontrolü
- ✅ Seed/launch validation
- ✅ Script execution (migration, seed, prices)

---

## 📆 HAFTALIK SYNC PROTOKOLÜ

**Pazartesi:**
- Replit Agent → Haftalık audit raporu (Perşembe'de hazır)
- Aslan + IT Danışman → Sprint gözden geçir, haftalık plan

**Çarşamba:**
- IT Danışman → Mid-week checkpoint (sprint ilerleme)

**Cuma akşamı:**
- Replit Agent → Otomatik smoke test + audit
- IT Danışman → Haftalık sprint kapanış + sonraki hafta plan

---

## 🚦 BAŞARI KRİTERLERİ

### Hafta 4 Sonu (Mid-point)
- ✅ 0 kırık sidebar linki
- ✅ 3 paralel sistem konsolide (puantaj, izin, onboarding)
- ✅ Satınalma modülü çalışır
- ✅ Bordro hesaplama aktif
- ⏳ Pilot teorik hazır (Factory+HQ+Işıklar+Lara)

### Hafta 8 Sonu (Final)
- ✅ Tüm 12 KPI yeşil
- ✅ CI/CD pipeline otomatik
- ✅ Her hata 5 dk içinde tespit
- ✅ p95 <300ms
- ✅ Test coverage >%50
- 🚀 **Pilot launch ready — %100 çalışan sistem**

---

## ⚠️ RİSKLER VE ÖNLEMLER

### Risk 1: Feature Freeze İhlali
**Önlem:** Aslan + IT danışman her yeni özellik talebini reddediyor. Sadece P0 bug fix.

### Risk 2: Veri Kaybı (Konsolidasyon Sprint B)
**Önlem:** 30 gün dual-write window. Hiçbir tablo 30 gün önce silinmez.

### Risk 3: Pilot Launch Gecikmesi
**Önlem:** Sprint A-D (Hafta 1-4) yeterli — pilot hafta 5'te başlayabilir. E-H hardening.

### Risk 4: Replit Agent Yanlış Commit
**Önlem:** Her Replit commit Claude tarafından review edilir. Büyük değişiklikler öncesi plan onayı.

### Risk 5: Schema Drift Devam Eder
**Önlem:** Sprint F6 (migration history) — drizzle-kit generate artık zorunlu.

---

## 📋 İLK HAFTA ACİL AKSIYONLARı (Bu Hafta)

### Bugün (Cuma 18 Nisan):
- ✅ Recipe↔Product mapping script hazır (`fix-recipe-product-mapping.ts`) → Replit çalıştıracak
- ✅ 8 haftalık plan commit edildi (bu doküman)
- ⏳ Fatura fiyat senkronizasyon script'i çalıştırılacak

### Önümüzdeki Hafta (21-27 Nisan):
- ⏳ Sprint A başlangıç — 17 kırık linki düzeltme başlar
- ⏳ Enum migration (TR→EN)
- ⏳ Seed endpoint security
- ⏳ Agent notification aggregation

### Cuma 25 Nisan:
- ✅ Sprint A sonuç raporu (Replit audit)
- ✅ Sprint B kick-off (veri konsolidasyon)

---

## 🎯 FİNAL HEDEF

**18 Haziran 2026 (8 hafta sonu):**
> DOSPRESSO %100 çalışan sistem. 22 şube + HQ + Fabrika gerçek production'da. Tüm KPI yeşil. Her hata 5 dk içinde tespit ediliyor. Pilot başarılı, tam rollout hazır.

---

*Doküman sahibi: Aslan (Direktör)*
*Planlayan: Claude (IT Danışman)*
*Uygulayıcı: IT Danışman + Replit Agent*
*Denetleyen: Aslan + Replit haftalık audit*

**Bu plan değişirse önce bu doküman güncellenir, sonra uygulama başlar.**
