# DOSPRESSO — Ekipman Yönetimi (Facility Management) Planı
**Tarih:** 2 Nisan 2026
**Temel İlke:** Şube ekipmanları ≠ Fabrika üretim ekipmanları

---

## MEVCUT SORUN

Arıza/Ekipman sistemi Fabrika modülünün içinde. Bu yanlış çünkü:
- Şube espresso makinesi ≠ Fabrika kavurma makinesi
- Supervisor arıza bildirmek istediğinde Fabrika dashboard'ı görüyor
- HQ (CGO) tüm şubelerin ekipmanlarını tek yerden yönetemiyor
- Teknik servis takibi yok

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
