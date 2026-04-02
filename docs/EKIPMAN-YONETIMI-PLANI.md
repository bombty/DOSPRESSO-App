# DOSPRESSO — Ekipman Yönetimi (Facility Management) Planı
**Tarih:** 2 Nisan 2026 | **v2 — Mevcut altyapı keşfi sonrası**
**Temel İlke:** Şube ekipmanları ≠ Fabrika üretim ekipmanları

---

## MEVCUT ALTYAPI (zaten yapılmış — %80)

### Tablolar (7 adet)
```
✅ equipment — envanter (branch, type, serial, QR, garanti, HQ/şube sorumlu)
✅ equipment_faults — arıza (AI analiz, multi-stage, fotoğraf)
✅ equipment_troubleshooting_steps — troubleshoot adımları (tip bazlı, sıralı)
✅ equipment_troubleshooting_completion — adım tamamlama takibi
✅ equipment_service_requests — servis (maliyet, firma, timeline)
✅ equipment_maintenance_logs — bakım (periyodik, maliyet, planlama)
✅ equipment_catalog — katalog (kullanım kılavuzu, kalibrasyon)
```

### API Endpoint'ler (20+)
```
✅ CRUD: equipment, faults, service-requests, catalog
✅ QR bulk generate
✅ Maintenance CRUD
✅ Service request status + timeline
✅ Comments
```

### Frontend Sayfaları (10 sayfa, ~9,700 satır)
```
✅ ariza-yeni.tsx (659L) — troubleshoot + QR akışı
✅ ariza-detay.tsx (1,449L) — detay + stage tracking
✅ ariza.tsx (460L) — arıza listesi
✅ equipment-detail.tsx (2,619L) — ekipman detay + servis
✅ equipment.tsx (1,190L) — ekipman listesi
✅ ekipman-mega.tsx (179L) — mega modül container
✅ ekipman-katalog.tsx (838L) — katalog yönetimi
✅ ekipman-analitics.tsx (325L) — analitik
✅ yonetim/ekipman-servis.tsx (981L) — servis yönetimi
✅ yonetim/ekipman-yonetimi.tsx (1,047L) — ekipman yönetimi
```

## GERÇEK SORUNLAR (navigasyon + bağlantı + veri)

### 1. Sidebar Navigasyonu (DÜZELTİLDİ ✅)
`/ariza` ve `/ekipman` → FABRIKA_MENU sidebar gösteriyordu.
Ayrı EKIPMAN_MENU oluşturuldu.

### 2. Dashboard Bağlantıları (EKSİK)
Şube dashboard'larında ekipman/arıza linklerinin kontrolü:
- Coach arıza widget → /ariza ✅
- Supervisor ekipman widget → /ekipman ✅
- Müdür → ekipman link EKSİK
- Barista → arıza bildir kısayol EKSİK

### 3. Seed Data (EKSİK)
- equipment tablosu boş — şubelere ekipman eklenmeli
- troubleshooting_steps tablosu boş — adımlar tanımlanmalı
- equipment_catalog boş — katalog oluşturulmalı

### 4. Ana Sayfa Kartı Bağlantısı
`EKIPMAN_ARIZA` modül kartı supervisor ve müdür home screen'inde var
ama yönlendirme URL doğru mu kontrol edilmeli.

## YAPILMASI GEREKEN İŞLER

### Sprint EQ-1: Veri + Bağlantı (2s)
- Seed: pilot şubeler için ekipman envanteri (espresso, değirmen, buzdolabı, POS, ...)
- Seed: troubleshoot adımları (espresso makinesi, değirmen, buzdolabı)
- Dashboard link kontrolü + düzeltme

### Sprint EQ-2: Ekipman-Fabrika Tam Ayrımı (2s)
- Fabrika modülünde kendi ekipman listesi (fabrika_equipment view)
- Şube modülünde kendi ekipman listesi (branch scoped)
- HQ'da tüm şubelerin ekipman görünümü

### Sprint EQ-3: QR Tarama Akışı (1s)
- QR kod → ekipman kartı → arıza bildir butonu
- Kiosk'tan QR okutma bağlantısı

### Sprint EQ-4: Dobody Troubleshoot (2s)
- Troubleshoot adımları tamamlanmadan arıza formu açılmamalı (UI kontrol)
- AI destekli troubleshoot adım oluşturma (HQ admin)
- Çözülmezse: teknik servis bilgileri + mail şablonu

TOPLAM: ~7 saat (önceki tahminden ~6s düşüş — altyapı zaten var)

## ÖNERİLEN MİMARİ

```
EKİPMAN & ARIZA (Bağımsız Modül)
│
├── 🏢 HQ TARAFINDA (Operasyon > Ekipmanlar)
│   ├── Tüm Şube Ekipman Envanteri
│   │   ├── Her şubede hangi ekipmanlar var
│   │   ├── Ekipman kartı: marka, model, seri no, garanti, QR kod
│   │   ├── Ekipman durumu: aktif / arızalı / bakımda / kullanım dışı
│   │   └── Ekipman yaşam döngüsü (kurulum → bakım → arıza → değişim)
│   │
│   ├── Sorumluluk Atama (HQ vs Şube)
│   │   ├── Her ekipman tipi için: "HQ sorumlu" veya "Şube sorumlu" tik
│   │   ├── HQ sorumlu → teknik servis HQ organize eder
│   │   ├── Şube sorumlu → teknik servis bilgileri şubeye verilir
│   │   └── Global ayar: aynı tip tüm şubelere uygulanır
│   │
│   ├── Teknik Servis Yönetimi
│   │   ├── Teknik servis firma bilgileri (ad, tel, e-mail, adres)
│   │   ├── Ekipman → servis firma eşleştirmesi
│   │   ├── Servis sözleşme bilgileri (garanti, bakım anlaşması)
│   │   └── Servis geçmişi (tarih, işlem, maliyet)
│   │
│   ├── Troubleshooting Yönetimi
│   │   ├── Her ekipman tipi için troubleshoot adımları (HQ oluşturur)
│   │   ├── AI destekli kullanım kılavuzu oluşturma
│   │   ├── Adımlar: fotoğraf + açıklama + video link
│   │   └── "Bu adımları yapmadan arıza kaydı açılamaz" kuralı
│   │
│   ├── Bakım Planlaması
│   │   ├── Periyodik bakım takvimi (aylık/3 aylık/yıllık)
│   │   ├── Yaklaşan bakım uyarıları
│   │   ├── Bakım tamamlama kaydı
│   │   └── Bakım maliyeti takibi
│   │
│   └── Arıza Dashboard (CGO)
│       ├── Tüm şubeler açık arıza sayısı
│       ├── SLA takibi (ne kadar süredir açık)
│       ├── Trend: en çok arıza veren ekipman tipi
│       └── Maliyet analizi
│
├── 🏪 ŞUBE TARAFINDA
│   ├── QR Kod ile Ekipman Tanıma
│   │   ├── Ekipman üzerindeki QR kodu okut
│   │   ├── Ekipman kartı açılır (durum, son bakım, garanti)
│   │   ├── "Arıza Bildir" butonu
│   │   └── "Bakım Geçmişi" butonu
│   │
│   ├── Arıza Bildirimi Akışı
│   │   ├── ADIM 1: QR okut veya ekipman seç
│   │   ├── ADIM 2: Mr. Dobody troubleshoot soruları sorar
│   │   │   ├── "Makine açılıyor mu?" → Evet/Hayır
│   │   │   ├── "Su akıyor mu?" → Evet/Hayır
│   │   │   ├── "Basınç göstergesi normal mi?" → Evet/Hayır
│   │   │   └── Adımlar tamamlanmadan arıza formu açılmaz
│   │   ├── ADIM 3: Troubleshoot çözmedi → Arıza formu
│   │   │   ├── Sorun açıklaması (metin)
│   │   │   ├── Fotoğraf (zorunlu)
│   │   │   ├── Öncelik (düşük/orta/yüksek/kritik)
│   │   │   └── Troubleshoot sonuçları otomatik eklenir
│   │   ├── ADIM 4: Form gönderilir
│   │   │   ├── HQ sorumlu ekipman → CGO'ya bildirim
│   │   │   ├── Şube sorumlu → teknik servis bilgileri gösterilir
│   │   │   │   ├── Firma adı, telefon, e-mail
│   │   │   │   └── "Mail Gönder" butonu (otomatik form doldurulmuş)
│   │   │   └── Her iki durumda da arıza kaydı oluşur
│   │   └── ADIM 5: Takip
│   │       ├── Arıza durumu (açık → devam → çözüldü)
│   │       ├── Teknik servis geldi mi?
│   │       ├── Maliyet girişi
│   │       └── Kapanış (fotoğraf + açıklama)
│   │
│   └── Ekipman Listesi (kendi şubesi)
│       ├── Tüm ekipmanlar + durum
│       ├── Yaklaşan bakım hatırlatmaları
│       └── Arıza geçmişi
│
└── 🤖 MR. DOBODY ENTEGRASYONU
    ├── "Espresso makinesi 3 aydır bakım yapılmadı — hatırlat"
    ├── "Lara'da buz makinesi 48 saatten fazla arızalı — eskalasyon"
    ├── "Buzdolabı arızası tekrar etti — değişim öner"
    ├── "Bu hafta 5 arıza — en çok: değirmen (3)"
    └── Troubleshoot AI: "Basınç düşük → muhtemelen filtre tıkanmış"
```

## TEKNİK UYGULAMA

### Yeni Tablolar
```sql
-- Ekipman envanteri (şube bazlı)
equipment_inventory (
  id, branch_id, equipment_type_id,
  brand, model, serial_number, qr_code,
  purchase_date, warranty_end, status,
  maintenance_responsible: 'hq' | 'branch',
  service_provider_id, notes
)

-- Ekipman tipleri (global)
equipment_types (
  id, name, category,
  default_maintenance_responsible: 'hq' | 'branch',
  maintenance_interval_days, icon
)

-- Teknik servis firmaları
service_providers (
  id, name, phone, email, address,
  specialization, contract_end
)

-- Troubleshoot adımları (global, ekipman tipi bazlı)
troubleshoot_steps (
  id, equipment_type_id, step_order,
  question_tr, question_en,
  expected_answer, photo_url, video_url,
  ai_generated: boolean
)

-- Arıza kaydı (mevcut equipment_faults genişletilir)
-- + troubleshoot_results: jsonb (hangi adımlar yapıldı)
-- + service_provider_id: fk
-- + service_email_sent: boolean
-- + service_cost: decimal
-- + maintenance_type: 'repair' | 'preventive' | 'emergency'
```

### Sprint Tahmini
```
S-EQ1: Ekipman envanter + QR (3s)
S-EQ2: Troubleshoot adımları (AI destekli) (3s)
S-EQ3: Arıza akışı yeniden yapılanma (3s)
S-EQ4: Teknik servis yönetimi + mail (2s)
S-EQ5: HQ sorumluluk atama + bakım planı (2s)
TOPLAM: ~13 saat
```
