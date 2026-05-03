# DOSPRESSO — TAM TARAMA RAPORU
## 29 Mart 2026 — Commit b15ec545

---

# 1. PROJE GENEL BOYUTLAR

| Metrik | Değer |
|--------|-------|
| Toplam kod | 395.477 satır |
| Frontend sayfa | 281 adet |
| Frontend bileşen | 247 adet |
| Backend route dosyası | 100 adet |
| Toplam endpoint | 1.551 adet |
| Schema tablosu | 349 tablo (16.829 satır) |
| Agent skill | 31 adet (5.625 satır) |
| Servis dosyası | 33 adet |

---

# 2. KRİTİK HATALAR VE RİSKLER

## 2.1 CRASH RİSKİ — YÜKSEK (Acil)

### Hook Safety Violations: 56 sayfa
Early return (isLoading/isError) hook'lardan ÖNCE yapılıyor → React "destroy is not a function" crash.

**En kritik olanlar (büyük sayfalar):**
- academy.tsx (3374 sat) — return L80, hook L99
- yetkilendirme.tsx (2181 sat) — return L822, hook L1514
- academy-module-editor.tsx (1849 sat) — return L551, hook L842
- dobody-gorev-yonetimi.tsx — return L218, hook L700
- academy-my-path.tsx — return L140, hook L766
- ai-politikalari.tsx — return L189, hook L503

### Korumasız .toFixed/.toLocaleString: 258 kullanım
API null/undefined dönerse crash. `Number(value ?? 0).toFixed()` olmalı.

### Array Safety: 205 ihlal
API obje dönerse `.map()` crash. `Array.isArray()` kontrolü eksik.

## 2.2 GÜVENLİK — ORTA

### Korumasız Endpoint: 55 adet
isAuthenticated middleware'ı olmayan endpoint'ler:
- **crm-iletisim.ts: 19 endpoint** — tickets, dashboard, hq-tasks (AuthRequest kullanıyor ama middleware yok)
- **branches.ts: 5 endpoint** — kiosk verify-password, kiosk staff, qr-checkin (kasıtlı olabilir)
- **Diğer dosyalar: 31 endpoint** — detaylı inceleme gerekiyor

### Ad-Hoc Rol Kontrolü: 505 adet
Manifest auth: 111 endpoint (sadece %7)
Kalan 1440 endpoint'te hala eski `isHQRole()` / `isAdmin` kontrolleri.

## 2.3 UI / UX — DÜŞÜK

### Dark Mode Hardcoded: 19 ihlal
`bg-white`, `text-black` gibi dark mode'da görünmez olan renkler.

### Boş Catch: 66 adet
Hata yutma riski — sessiz fail.

---

# 3. PİLOT HAZIRLIK DURUMU

## 3.1 MEVCUT (Beklenenden ÇOK daha fazlası var!)

### Fabrika Kiosk (2854 satır, ~20 endpoint) ✅
- PIN login + device auth
- Vardiya başlat/bitir
- İstasyon atama + geçiş
- Üretim kayıt (miktar + fire + fotoğraf)
- Mola yönetimi (mola/özel ihtiyaç)
- Faz takibi (hazırlık→üretim→temizlik→tamamlandı)
- QC akışı (pending→inspect→result)
- Arıza bildirimi
- Günlük istatistikler

### Fabrika Scoring Servisi (796 satır) ✅
- 5 boyutlu skor: üretim(%35), devam(%25), kalite(%15), mola(%15), fire(%10)
- `factoryWorkerScores` tablosu (günlük/haftalık/aylık)
- `factoryStationBenchmarks` tablosu (istasyon bazlı norm)
- Yüksek fire uyarısı (>%5) otomatik bildirim

### Üretim Planlama (1442 satır, 3 endpoint) ✅
- Haftalık/günlük plan girişi
- Hedef miktar + ürün + istasyon
- Kiosk today-plans endpoint
- actualQuantity alanı var (güncelleme mekanizması eksik)

### Reçete Sistemi (2031 satır) ✅
- Kategori + malzeme listesi
- Versiyonlama (recipeVersions tablosu)
- Onay akışı + değişiklik açıklaması
- Bildirimler
- `productionRecords` tablosunda recipeId var

### QC Sistemi (1147 satır, ~10 endpoint) ✅
- 2 aşamalı: teknisyen + mühendis
- 6 kontrol kriteri (görsel, tat, doku, ağırlık, sıcaklık, paketleme)
- HACCP uyumluluk
- Fotoğraf kanıt

### Sevkiyat (1393 satır) ✅
- LOT oluşturma + takip
- Sevkiyat kaydı

### PDKS Engine (221 satır) ✅
- Gün sınıflandırma (worked/absent/off/leave)
- Fazla mesai hesaplama (shift planına göre)
- İzin tipi entegrasyonu

### Payroll Engine (219 satır) ✅
- Bordro hesaplama (devamsızlık kesinti + fazla mesai ×1.5)
- Pozisyon bazlı maaş tablosu
- Ay sonu toplu hesaplama + kaydetme

## 3.2 EKSİK — Pilot İçin Kapatılması Gereken

### 3.2.1 Kiosk→Üretim Planı Bağlantısı (ÖNCELİK: P0)
**Sorun:** Kiosk'ta üretim kaydedildiğinde `factoryProductionPlans.actualQuantity` otomatik güncellenmiyor.
**Etki:** Şef plan girdi ama gerçek üretimi göremez.
**Çözüm:** `log-production` endpoint'inde plan tablosunu güncelle (JOIN: productId + planDate = today)
**Tahmini süre:** 2-3 saat

### 3.2.2 Kiosk→Reçete Bağlantısı (ÖNCELİK: P1)
**Sorun:** `factoryProductionOutputs` tablosunda `recipeVersionId` yok.
**Etki:** Hangi reçete ile üretildiği kaybolur.
**Çözüm:** Migration ile alan ekle + kiosk frontend'de reçete seçimi + log-production'da kaydet
**Tahmini süre:** 4-5 saat

### 3.2.3 Scoring Servisinin Çalıştırılması (ÖNCELİK: P1)
**Sorun:** `factory-scoring-service.ts` mevcut ama scheduler'a bağlı mı kontrol edilmeli.
**Etki:** Çalışan skorları hesaplanmıyor olabilir.
**Çözüm:** Scheduler kontrolü + eksikse cron job ekleme
**Tahmini süre:** 1-2 saat

### 3.2.4 Plan vs Gerçek Rapor Sayfası (ÖNCELİK: P2)
**Sorun:** `uretim-planlama.tsx` var ama hedef vs gerçek karşılaştırma UI eksik olabilir.
**Etki:** Şef/müdür görsel karşılaştırma yapamaz.
**Çözüm:** Mevcut sayfaya progress bar + renk kodlu hedef/gerçek widget ekle
**Tahmini süre:** 3-4 saat

---

# 4. MEGA DOSYALAR (Bölünme Gerekiyor)

| Dosya | Satır | Durum |
|-------|-------|-------|
| storage.ts | 8862 | Tüm CRUD tek dosyada |
| factory.ts | 7547 | 45+ endpoint tek dosyada |
| hr.ts | 7452 | Scope entegrasyonu yapıldı ama hala dev |
| operations.ts | 5770 | İncelenmedi |
| branches.ts | 4761 | İncelenmedi |
| admin.ts | 4148 | İncelenmedi |
| akademi.tsx | 3374 | 42 EmptyState — bitmemiş bölümler |
| fabrika/maliyet-yonetimi.tsx | 3859 | İncelenmedi |
| ai.ts | 3376 | İncelenmedi |

---

# 5. MODÜL DURUMU (Tamamlanma Tahmini)

| Modül | Backend | Frontend | Pilot Hazır? |
|-------|---------|----------|-------------|
| Fabrika Kiosk | %90 | %85 | ⚠️ 3 eksik |
| Vardiya/PDKS | %95 | %90 | ✅ |
| Bordro | %85 | %80 | ✅ (temel) |
| İK (personel) | %90 | %85 | ✅ (scope bitti) |
| Reçete | %90 | %85 | ✅ |
| QC | %90 | %80 | ✅ |
| Üretim Planlama | %80 | %75 | ⚠️ plan→actual bağ |
| Sevkiyat/LOT | %85 | %80 | ✅ (temel) |
| Mr. Dobody Agent | %70 | %60 | ❌ skill testi yok |
| Akademi | %60 | %50 | ❌ 42 empty state |
| CRM | %50 | %40 | ❌ auth sorunlu |
| Satınalma | %40 | %30 | ❌ pilot dışı |
| Muhasebe | %50 | %45 | ⚠️ temel rapor |

---

# 6. ÖNERİLEN AKSİYON PLANI

## Bu Hafta (Pilot Öncesi) — 4 iş
1. **P0:** Kiosk log-production → plan actualQuantity güncelleme (2-3 saat)
2. **P1:** factoryProductionOutputs → recipeVersionId migration (4-5 saat)
3. **P1:** Factory scoring scheduler kontrolü (1-2 saat)
4. **P2:** Plan vs gerçek UI widget (3-4 saat)
**Toplam: ~12-14 saat**

## Pilot Sonrası Faz 1 (2-4 hafta)
- Hook safety 56 sayfa fix (crash önleme)
- toFixed 258 kullanım fix
- Array safety 205 ihlal fix
- crm-iletisim auth düzeltme
- Akademi empty state'leri doldurma

## Pilot Sonrası Faz 2 (1-3 ay)
- Manifest auth 111→500+ endpoint
- QR sevkiyat sistemi
- Mr. Dobody otonom aksiyonlar
- Muhasebe Logo import + AI raporlama
- Canlı personel takip dashboard

## Uzun Vade (3-12 ay)
- 55 şube ölçeklendirme
- SGK/e-fatura entegrasyonu
- Franchise finansal modül
- Service Worker + offline
- Mega dosya bölümleme

---

# 7. TARANMAMIŞ ALANLAR

Bu raporda detaylı incelenmemiş dosyalar:
- operations.ts (5770 sat) — görev/checklist sistemi
- branches.ts (4761 sat) — şube yönetimi
- admin.ts (4148 sat) — admin paneli
- ai.ts (3376 sat) — AI entegrasyonları
- 169+ frontend sayfa (sadece İK + fabrika incelendi)
- 31 agent skill (sadece dosya listesi görüldü)
- Email/notification sistemi
- Service Worker
- i18n (TR/EN/AR/DE) durumu
