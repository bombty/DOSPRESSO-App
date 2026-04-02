# DOSPRESSO — Ekipman Yönetim Sistemi Kuralları
**Tarih:** 2 Nisan 2026 | **Skill Dosyası Formatı**
**Bu doküman tüm ekipman işlemlerinde referans olarak kullanılmalıdır**

---

## 1. TEMEL PRENSİPLER

```
KURAL 1: Şube ekipmanları ≠ Fabrika üretim ekipmanları
  Fabrika: kavurma, paketleme, lot izleme ekipmanları
  Şube: espresso, değirmen, buzdolabı, POS, kiosk

KURAL 2: HQ belirler, şube uygular
  Ekipman sorumluluk ataması (HQ/Şube) SADECE HQ Operasyon tarafından yapılır
  Troubleshoot adımları SADECE HQ tarafından oluşturulur
  Teknik servis bilgileri SADECE HQ tarafından girilir
  Şube personeli bu ayarları DEĞİŞTİREMEZ

KURAL 3: Troubleshoot zorunlu
  Arıza kaydı oluşturmadan ÖNCE troubleshoot adımları tamamlanmalı
  Adımlar ekipman tipine göre farklıdır (HQ tarafından tanımlanır)
  Zorunlu adımlar (*) tamamlanmadan form açılmaz

KURAL 4: Tek arıza formu
  equipment-detail.tsx içindeki arıza formu KULLANILACAK (primary)
  /ariza-yeni sayfası fallback (QR kod veya doğrudan erişim için)
  Her iki form da aynı API'yi kullanır: POST /api/faults

KURAL 5: İzlenebilirlik
  Arıza durumu: şube + HQ (CGO, Coach, Trainer) tarafından izlenebilir
  Durum güncellemesi: şube VE HQ tarafından yapılabilir
  Mr. Dobody: hatırlatma, yönlendirme, eskalasyon
```

## 2. ARIZA BİLDİRİM AKIŞI

```
ŞUBE ÇALIŞANI (Supervisor/Müdür/Barista)
│
├── YOL 1: QR Kod Tara → Ekipman kartı açılır → "Arıza Kaydı" butonu
│
├── YOL 2: Ekipman Listesi → Cihaza tıkla → Detay → "Arıza Kaydı"
│
└── YOL 3: Yeni Arıza → Şube seç → Ekipman seç (dropdown)
    │
    ▼
┌─── TROUBLESHOOT (ZORUNLU) ───────────────────────┐
│ Mr. Dobody sorun giderme adımları sorar           │
│ "Makineyi kapatıp açtınız mı?" → ✅/❌            │
│ "Su tankı dolu mu?" → ✅/❌                       │
│ "Basınç göstergesi normal mi?" → ✅/❌            │
│ * Zorunlu adımlar tamamlanmadan devam edilemez     │
│ Opsiyonel adımlar: not eklenebilir                │
└───────────────────────────────────────────────────┘
    │
    ▼ (Sorun çözülmediyse)
┌─── ARIZA FORMU ──────────────────────────────────┐
│ Ekipman: otomatik dolu (cihaz adı + model + SN)  │
│ Şube: otomatik dolu (kullanıcının şubesi)        │
│ Açıklama: zorunlu (ne oldu, ne zaman)             │
│ Öncelik: Düşük / Orta / Yüksek / Kritik          │
│ Fotoğraf: isteğe bağlı                           │
│ Etkilenen bölgeler: isteğe bağlı                 │
│ Troubleshoot sonuçları: otomatik eklenir          │
└───────────────────────────────────────────────────┘
    │
    ▼
┌─── SORUMLULUK KONTROLÜ ─────────────────────────┐
│ Sistem cihazın maintenance_responsible alanına    │
│ bakar (HQ Operasyon tarafından önceden ayarlanır) │
│                                                   │
│ ┌── HQ Sorumlu ──────────────────────────────┐   │
│ │ → CGO'ya bildirim gider                     │   │
│ │ → CGO inceler, onaylarsa teknik servise     │   │
│ │   otomatik mail gönderilir                  │   │
│ │ → Arıza durumu: şube + HQ izler             │   │
│ └─────────────────────────────────────────────┘   │
│                                                   │
│ ┌── Şube Sorumlu ────────────────────────────┐   │
│ │ → Teknik servis bilgileri gösterilir         │   │
│ │   (firma adı, telefon, e-mail)              │   │
│ │ → Otomatik mail şablonu oluşturulur:        │   │
│ │   • Cihaz bilgileri (tip, model, SN)        │   │
│ │   • Şube bilgileri                          │   │
│ │   • Arıza açıklaması                       │   │
│ │   • Troubleshoot sonuçları                  │   │
│ │   • Önceki arıza geçmişi (varsa)            │   │
│ │ → "Mail Gönder" butonu → mail uygulaması    │   │
│ │ → Arıza durumu: şube + HQ izler             │   │
│ └─────────────────────────────────────────────┘   │
└───────────────────────────────────────────────────┘
```

## 3. ARIZA DURUM TAKİBİ

```
Durum Akışı:
  açık → inceleniyor → teknik_servis_bildirildi → randevu_alındı
       → teknisyen_geldi → onarılıyor → cihaz_firmaya_gönderildi
       → onarım_tamamlandı → kontrol_edildi → kapatıldı

Her durum değişikliğinde:
  - Tarih + kim değiştirdi kaydedilir
  - Açıklama/not eklenebilir
  - İlgili taraflara bildirim gider
  - Mr. Dobody deadline takibi yapar

Eskalasyon kuralları:
  - 24 saat: Supervisor → Müdür uyarı
  - 48 saat: Müdür → CGO eskalasyon
  - 72 saat: CGO → CEO bildirim
  - Mr. Dobody otomatik hatırlatma her aşamada
```

## 4. HQ OPERASYON — EKİPMAN YÖNETİMİ

```
HQ Operasyon sayfasında (/ekipman yönetimi):

A) Ekipman Katalog Yönetimi
   - Her ekipman tipi için: ad, marka, model, resim
   - Bakım aralığı (gün)
   - Kalibrasyon aralığı (varsa)
   - Kullanım kılavuzu (metin / PDF)

B) Sorumluluk Atama (ekipman tipi bazlı — global)
   - maintenance_responsible: "HQ" veya "Şube"
   - fault_protocol: "HQ Teknik" veya "Şube"
   - service_handled_by: "HQ organize" veya "Şube ilgilenecek"
   Bu ayar aynı tip tüm şubelere uygulanır.
   Örnek: Espresso makinesi → HER ZAMAN HQ Teknik
          Blender → Şube kendi ilgilenecek

C) Teknik Servis Yönetimi
   - Firma bilgileri: ad, telefon, e-mail, adres
   - Sözleşme bilgileri: garanti, bakım anlaşması
   - Ekipman → servis firma eşleştirmesi
   - Servis geçmişi (otomatik oluşur)

D) Troubleshoot Adım Yönetimi
   - Her ekipman tipi için adımlar (sıralı)
   - Zorunlu / opsiyonel işaretleme
   - Fotoğraf gerektiren adımlar
   - Mr. Dobody (AI) ile adım oluşturma
   - Adımlar tüm şubelere otomatik uygulanır

E) Bilgi Bankası (Ekipman)
   - Her ekipman tipi için: kullanım kılavuzu
   - PDF yükleme
   - Mr. Dobody ile metin oluşturma
   - AI Teknik Asistan bu bilgiyi kullanır
   - Şube personeli soru sorabilir → AI yanıtlar
```

## 5. ROL BAZLI ERİŞİM

```
KİM NE GÖREBILIR / YAPABILIR:

CGO:
  ✅ Tüm şubelerin tüm ekipmanları
  ✅ Tüm arızalar + durum takibi
  ✅ Teknik servis yönetimi
  ✅ Sorumluluk ataması
  ✅ Troubleshoot adım oluşturma
  ✅ Arıza onay → teknik servise mail
  ✅ Bilgi bankası düzenleme

Coach:
  ✅ Tüm şubelerin ekipmanları (read)
  ✅ Tüm arızalar izleme
  ❌ Teknik servis yönetimi
  ❌ Sorumluluk değiştirme

Trainer:
  ✅ Tüm şubelerin ekipmanları (read)
  ✅ Tüm arızalar izleme
  ❌ Teknik servis yönetimi

Müdür:
  ✅ KENDİ şube ekipmanları
  ✅ Arıza bildir + durum güncelle
  ✅ Teknik servis ile iletişim (şube sorumlu ise)
  ❌ Sorumluluk değiştirme
  ❌ Diğer şube ekipmanları

Supervisor:
  ✅ KENDİ şube ekipmanları
  ✅ Arıza bildir
  ✅ Durum güncelle (sınırlı)
  ❌ Teknik servis organize etme

Barista:
  ✅ Arıza bildir (QR tara → form)
  ❌ Ekipman yönetimi
  ❌ Durum güncelleme
```

## 6. MR. DOBODY ENTEGRASYONU

```
ARIZA SÜRECİNDE:
  → Troubleshoot soruları sorar (zorunlu)
  → Çözülmezse: "Arıza kaydı oluştur" yönlendirir
  → Arıza oluşturulunca: ilgili kişilere bildirim

TAKİP:
  → "Espresso makinesi 48 saattir arızalı — eskalasyon gerekli"
  → "Teknik servis randevusu yarın — hatırlat"
  → "Bu cihaz son 3 ayda 3. kez arızalandı — değişim öner"
  → "Bakım tarihi yaklaşıyor — bakım planla"

BİLGİ BANKASI:
  → AI Teknik Asistan olarak cihaz soruları yanıtlar
  → HQ'nun eklediği kılavuz + PDF bilgilerini kullanır
  → "Bu cihazın basınç ayarı nasıl yapılır?" → yanıtlar
```

## 7. TEKNİK UYGULAMA DURUMU

```
MEVCUT (zaten var):
  ✅ 7 tablo (equipment, faults, troubleshoot_steps, service_requests...)
  ✅ 20+ API endpoint
  ✅ 10 frontend sayfası (~9,700 satır)
  ✅ Troubleshoot akışı (equipment-detail formunda)
  ✅ Servis talebi oluşturma (Merkez/Şube)
  ✅ AI Teknik Asistan (bilgi bankası boş)
  ✅ QR kod akışı (URL parametre)
  ✅ Multi-stage durum takibi

DÜZELTİLDİ:
  ✅ reportedById validation fix
  ✅ Dropdown cihaz adı gösterimi
  ✅ metadata.nameTr crash fix
  ✅ Seed equipment type eşleştirme
  ✅ Sidebar Fabrika'dan ayrıldı

YAPILACAK:
  ⏳ Bilgi bankası içerik ekleme (HQ Operasyon)
  ⏳ Otomatik mail şablonu (teknik servis)
  ⏳ Coach/Trainer arıza görünürlüğü (dashboard widget)
  ⏳ Arıza durum akışı timeline UI
  ⏳ Mr. Dobody bakım hatırlatma
  ⏳ Bakım takvimi widget
```
