# DOSPRESSO — CRM & Görev Sistemi Derin Analiz
## Replit İstişare Talimatı
### 7 Nisan 2026

---

## 1. SCREENSHOT ANALİZİ — TESPİT EDİLEN KRİTİK SORUNLAR

### 🔴 SORUN 1: Görev Duplikasyonu (Operasyon ↔ CRM)
**Screenshot 6** (Operasyon → Görevler → Bana Atanan):
- Gecikmiş: **734**, Bekleyen: 133, Devam Eden: 27, Tamamlanan: 578

**Screenshot 7** (CRM → Görevler tab'ı):
- Gecikmiş: **164**, Bekleyen: 133, Devam: 39, Tamamlanan: 578

**Aynı tasks tablosu, iki farklı UI'dan gösteriliyor!** Kullanıcı aynı veriyi iki yerde görüyor — hangisini kullanacağını bilemiyor. CRM'deki "Görevler" tab'ı ve Operasyon'daki "Görevler" sayfası ayrı olmamalı.

### 🔴 SORUN 2: 734 Gecikmiş Görev (Tekrarlayan Görev Patlaması)
**Screenshot 5** (Şube Görevleri):
- 20 adet "Tezgah dezenfeksiyon kontrolü" — hepsi aynı, hepsi "Açık görev"
- Tekrarlayan görev şablonu her gün yeni görev oluşturuyor ama kimse tamamlamıyor
- Sonuç: Gecikmiş görev sayısı katlanarak artıyor

**ROOT CAUSE**: Tekrarlayan görevler tamamlanmadan yenisi açılıyor. Otomasyon kontrolü yok.

### 🔴 SORUN 3: Şube Panel Hata
Şubeler → Uyum Merkezi açılıyor ama altındaki "Şube Panel" menüsü tıklanınca hata veriyor. Route tanımlı değil veya bileşen yüklenemiyor.

### 🟡 SORUN 4: Kiosk Yönetimde Şubeler Eksik
**Screenshot 1** (PDKS ayarları):
- 7 şube/lokasyon listeleniyor: Beachpark, Lara, Markantalya, Fabrika, Işıklar, Merkez Ofis, Test Branch
- Ama sistemde 25 şube var — gerisi görünmüyor
- Kiosk ayarlarının tüm aktif şubelerde tanımlı olması gerekiyor

### 🟡 SORUN 5: Uyum Merkezi Verileri Anlamsız
**Screenshot 3** (Uyum Merkezi):
- Tüm şubeler 28 skor, "Devam 0, Checklist 50, Müşteri 50"
- 18 şubeden 0 sağlıklı, 2 uyarı, 16 kritik
- Veriler gerçek durumu yansıtmıyor (seed/test verisi kalıntısı)

---

## 2. MEVCUT MİMARİ HARİTASI

### 2.1 Görev Sistemi (tasks tablosu — TEK tablo)
```
tasks tablosu → HER ŞEY burada:
  - HQ'dan şubeye atanan görevler (sourceType: 'hq_manual')
  - Dobody'nin oluşturduğu görevler (sourceType: 'dobody')
  - Tekrarlayan görevler (sourceType: 'periodic')
  - Vardiya bazlı görevler (sourceType: 'shift_bound')
  - Şube içi görevler (sourceType: 'branch_internal')
  
Frontend'te AYNI veri 3 FARKLI yerde gösteriliyor:
  1. /task-takip (Operasyon → Görevler → Bana Atanan)
  2. /task-atama (Operasyon → Görevler → Toplu Atama)  
  3. CRM-mega.tsx → "Görevler" tab'ı (HqTasksTab)
```

### 2.2 CRM/Ticket Sistemi (KAOTIK — 3 ayrı yapı)
```
Yapı 1: supportTickets (schema-12, yeni)
  → crm-iletisim.ts route'ları
  → Departman bazlı ticket sistemi
  → SLA kuralları, cowork, attachments
  → CRM-mega.tsx ana UI'ı

Yapı 2: hqSupportTickets (schema-03, eski)
  → Eski HQ destek ticket sistemi
  → Muhtemelen kullanılmıyor

Yapı 3: guestComplaints (schema-05)
  → Misafir şikayet sistemi
  → Ayrı API, ayrı UI (sikayetler.tsx)

Yapı 4: customerFeedback (schema-04)
  → Misafir geri bildirim (NPS)
  → Ayrı API, ayrı UI (feedback.tsx)
```

### 2.3 İletişim Kanalları (DAĞINIK)
```
Şu an iletişim 5+ FARKLI yerde:
  1. CRM Ticket sistemi → Şube ↔ HQ departman iletişimi
  2. Görev sistemi → HQ → Şube görev ataması (+ soru/cevap)
  3. Duyuru sistemi → HQ → Tüm şubelere tek yönlü
  4. Bildirimler → Sistem → Kullanıcı (push notification)
  5. Dobody → AI → Kullanıcı (öneri + aksiyon)
  6. Denetim geri bildirim → Denetçi ↔ Personel
```

---

## 3. ÇELİŞKİ ANALİZİ

### Operasyon Görevleri vs CRM Görevleri — Hangisi Ne?

| Özellik | Operasyon Görevleri | CRM "HQ Tasks" |
|---------|--------------------|-----------------| 
| Kaynak | tasks tablosu | tasks tablosu (AYNI!) |
| Oluşturan | HQ/Coach/Dobody/Tekrarlayan | CRM içinden (HQ) |
| Hedef | Şube personeli | Şube/Departman |
| UI | /task-takip, /task-atama | CRM-mega.tsx → Görevler tab |
| Fark | Hiçbir fark YOK | Sadece farklı filtre |

**SONUÇ:** CRM'deki "Görevler" tab'ı gereksiz — Operasyon görev sayfasının duplikası.

### CRM Ticket vs Görev — Gerçek Fark Nedir?

| | CRM Ticket | Görev |
|--|-----------|-------|
| **Amaç** | İletişim (soru sor, sorun bildir, talep et) | İş yaptırma (temizle, kontrol et, düzelt) |
| **Akış** | Açılır → Yanıtlanır → Kapatılır | Atanır → Yapılır → Onaylanır |
| **SLA** | Var (cevap süresi) | Var (bitiş tarihi) |
| **Departman** | Evet (teknik, lojistik, İK...) | Hayır (genel) |
| **Cowork** | Evet (birden fazla kişi katılabilir) | Hayır |
| **Mesajlaşma** | Ticket altında yorum zinciri | Soru/cevap (basit) |

---

## 4. REPLİT İSTİŞARE TALİMATI

### Replit'in Yapacağı İnceleme (KOD DEĞİŞİKLİĞİ YOK — sadece analiz)

#### A. Mevcut Durumu Doğrula
```sql
-- 1. Toplam görev sayısı ve durum dağılımı
SELECT status, COUNT(*) FROM tasks GROUP BY status ORDER BY COUNT(*) DESC;

-- 2. sourceType dağılımı (hangi kaynaklardan geliyor?)
SELECT source_type, COUNT(*) FROM tasks GROUP BY source_type;

-- 3. Tekrarlayan görev sorunu — kaç görev aynı description'la var?
SELECT description, COUNT(*) as cnt FROM tasks 
WHERE status IN ('beklemede', 'gecikmiş') 
GROUP BY description HAVING COUNT(*) > 3 ORDER BY cnt DESC LIMIT 10;

-- 4. CRM ticket durumu
SELECT status, department, COUNT(*) FROM support_tickets GROUP BY status, department ORDER BY department;

-- 5. Eski ticket sistemi kullanılıyor mu?
SELECT COUNT(*) FROM hq_support_tickets;

-- 6. Misafir şikayet durumu
SELECT status, COUNT(*) FROM guest_complaints GROUP BY status;

-- 7. Müşteri feedback durumu
SELECT COUNT(*) FROM customer_feedback;

-- 8. Görev-ticket çakışma: Aynı veriyi iki yerde gösterenler
SELECT t.id, t.description, t.source_type, t.status, t.branch_id
FROM tasks t WHERE t.source_type = 'hq_manual' AND t.status = 'gecikmiş'
ORDER BY t.created_at DESC LIMIT 20;
```

#### B. Frontend Sayfa Testi
Her sayfayı aç, screenshot al, durum raporla:

| Sayfa | URL | Test |
|-------|-----|------|
| CRM Ana | /crm-mega veya /hq-destek | Hangi tab'lar var? Veri doluluğu? |
| CRM Ticket Liste | CRM → Franchise tab | Ticket sayısı? Departman filtresi? |
| CRM Misafir | CRM → Misafir tab | NPS/şikayet verileri? |
| CRM Görevler | CRM → Görevler tab | Operasyon ile aynı veri mi? |
| Operasyon Görevler | /task-takip | "Bana Atanan" tab'ı — gecikmiş sayısı |
| Şube Görevleri | /sube-gorevler | Tekrarlayan duplikat var mı? |
| Misafir GB | /misafir-memnuniyeti-modul | NPS form çalışıyor mu? |
| Şikayetler | /sikayetler | Şikayet listesi var mı? |
| Destek | /destek | Ayrı bir destek sayfası var mı? |

#### C. Hatalı Sayfaları Tespit Et
```bash
# Tüm route'ları tara — 404 dönen veya crash eden sayfaları bul
for path in "/sube-panel" "/sube-uyum" "/sube-kontrol-paneli" "/uyum-paneli" "/destek-talepleri" "/misafir-memnuniyeti"; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5000$path")
  echo "$path → $STATUS"
done
```

#### D. Kiosk Ayarları — Eksik Şubeleri Bul
```sql
-- Kiosk config olan şubeler
SELECT b.id, b.name, 
  CASE WHEN kc.id IS NOT NULL THEN '✅' ELSE '❌' END as kiosk_config
FROM branches b
LEFT JOIN (
  SELECT DISTINCT branch_id as id FROM -- kiosk settings tablosu
  -- veya: branches tablosundaki kiosk alanları
  SELECT id FROM branches WHERE is_active = true
) kc ON b.id = kc.id
WHERE b.is_active = true
ORDER BY b.name;
```

#### E. "Şube Panel" Hatasını Tespit Et
1. CGO veya Coach olarak giriş yap
2. Şubeler → Uyum Merkezi altında "Şube Panel" veya benzeri menüyü tıkla
3. Hata mesajını kopyala (console + ekran)
4. Hangi URL'ye yönlendirdiğini raporla

---

## 5. VİZYON ÖNERİSİ: BİRLEŞİK İLETİŞİM MERKEZİ

### 5.1 Mevcut Sorun
```
Kullanıcı kafası karışık:
  "Şubeye görev mi atayacağım? → Operasyon → Görevler → Toplu Atama"
  "Şubeden teknik destek mi isteyeceğim? → CRM → Yeni Ticket"
  "Personele duyuru mu yapacağım? → Duyurular → Yeni Duyuru"
  "Şube sağlık durumunu mu göreceğim? → Şubeler → Uyum Merkezi"
  "Arıza mı bildireceğim? → Ekipman → Arıza Bildir"

5 FARKLI YER, 5 FARKLI AKIŞ — karışıklık kaçınılmaz.
```

### 5.2 Öneri: 3 Katmanlı Basitleştirme

```
KATMAN 1: İLETİŞİM MERKEZİ (CRM)
  ├── Ticket Sistemi (Şube ↔ HQ departman iletişimi)
  │     → Teknik talep, lojistik talep, İK talep, genel
  │     → SLA + cowork + mesajlaşma
  │     → Misafir şikayetleri de burada (dış iletişim)
  │
  ├── Misafir Merkezi (NPS + Geri Bildirim + Şikayet)
  │     → QR/link ile gelen misafir feedback'i
  │     → NPS skoru ve trendi
  │     → Şikayet yanıtlama (SLA dahilinde)
  │
  └── Duyurular (tek yönlü broadcast)
        → Tüm şubelere / hedef gruba
        → Zorunlu okuma + quiz
        → Banner + landing page

KATMAN 2: GÖREV MERKEZİ (OPERASYON)
  ├── Görev Atama & Takip
  │     → HQ → Şubeye görev ata
  │     → Dobody → otomatik görev önerisi
  │     → Tekrarlayan görevler (kontrollü!)
  │
  ├── Checklistler
  │     → Açılış/kapanış kontrol listeleri
  │     → Vardiya bazlı zorunlu kontroller
  │
  └── Denetim & CAPA
        → Coach denetim yürütme
        → Aksiyon maddeleri (CAPA)
        → Eskalasyon

KATMAN 3: DOBODY (AI KATMANı — her yerde)
  ├── İletişim Merkezi'nde → SLA aşımı uyarısı
  ├── Görev Merkezi'nde → Geciken görev uyarısı
  ├── Dashboard'da → Günlük brief
  └── Kiosk'ta → Personel uyarıları
```

### 5.3 CRM → Görevler Tab'ı Ne Olacak?

**Seçenek A: KALDIR** — Görevler sadece Operasyon'da olsun
- Pro: Duplikasyon biter, basit
- Con: CRM'den görev oluşturmak pratik (ticket → görev dönüşümü)

**Seçenek B: "Ticket → Görev Dönüştür" butonu ekle**
- CRM'de ticket açılır → Çözüm gerekiyorsa "Görev Oluştur" butonu
- Görev Operasyon'da görünür — CRM'de sadece bağlantı
- Pro: Akış mantıklı, duplikasyon yok
- Con: İki tıklama fazla

**ÖNERİ: Seçenek B** — CRM'de görev tab'ı kaldırılır, yerine "ticket → görev dönüşüm" butonu eklenir.

---

## 6. KRİTİK DÜZELTME PLANI (Öncelik Sıralı)

### P0 — Hemen (Bu oturum veya sonraki)

| # | Sorun | Çözüm | Süre |
|---|-------|-------|------|
| 1 | Tekrarlayan görev patlaması (734 gecikmiş) | Tamamlanmamış tekrar varken yeni oluşturma, toplu arşivleme | 2-3 saat |
| 2 | Şube Panel hata | Route/component düzeltme | 30 dk |
| 3 | Kiosk ayarlarında eksik şubeler | Tüm aktif şubelere varsayılan seed | 1 saat |

### P1 — CRM Sadeleştirme (Planlı sprint)

| # | Sorun | Çözüm | Süre |
|---|-------|-------|------|
| 4 | CRM Görevler tab duplikasyonu | Tab kaldır, "Ticket→Görev" butonu ekle | 2-3 saat |
| 5 | Eski ticket sistemi (hqSupportTickets) | Kullanılmıyorsa orphan temizliği | 1 saat |
| 6 | Misafir şikayet/feedback birleştirme | CRM → Misafir tab'ında tek UI | 3-4 saat |

### P2 — Vizyon Geliştirme (Sonraki fazda)

| # | Özellik | Açıklama | Süre |
|---|---------|----------|------|
| 7 | Birleşik İletişim Merkezi | 3 katmanlı yapı | 5-8 saat |
| 8 | Ticket → Görev dönüşüm akışı | CRM'den görev oluşturma | 2-3 saat |
| 9 | Dobody CRM entegrasyonu | SLA aşımı otomatik uyarı | 2 saat |

---

## 7. REPLİT'E RAPOR FORMATI

```
=== A. VERİTABANI DURUMU ===
Görev sayıları (status bazlı): ___
sourceType dağılımı: ___
Tekrarlayan duplikat görevler: ___
CRM ticket sayısı: ___
Eski ticket (hqSupportTickets): ___
Misafir şikayet: ___
Müşteri feedback: ___

=== B. SAYFA TESTLERİ ===
CRM Ana: ✅/❌ [hangi tab'lar, veri doluluğu]
CRM Ticket: ✅/❌
CRM Misafir: ✅/❌
CRM Görevler: ✅/❌ [Operasyon ile aynı veri mi?]
Operasyon Görevler: ✅/❌
Misafir GB: ✅/❌
Şikayetler: ✅/❌

=== C. HATALI SAYFALAR ===
Şube Panel: [URL] → [hata mesajı]
Diğer hatalar: ___

=== D. KİOSK EKSİK ŞUBELER ===
Toplam şube: ___
Kiosk config olan: ___
Eksik: ___ (liste)

=== E. ÖNERİLER ===
CRM Görevler tab'ı kaldırılmalı mı: evet/hayır [gerekçe]
Tekrarlayan görev sorunu: [kök neden + öneri]
İletişim birleştirme: [görüş]

PUSH: hayır (sadece analiz)
```

---

## 8. ASLAN'A SORULAR (Plan Onayı İçin)

1. **CRM Görevler tab'ı**: Kaldıralım mı? Yoksa sadece CRM kaynaklı görevleri mi göstersin?

2. **734 gecikmiş görev**: Toplu arşivle miyiz yoksa 30+ gün gecikmişleri otomatik kapansın mı?

3. **Misafir sistemi**: guestComplaints + customerFeedback + productComplaints → CRM altında tek "Misafir" tab'ına mı birleştirilsin?

4. **Eski hqSupportTickets**: Veri varsa taşınsın mı (supportTickets'e) yoksa arşivlensin mi?

5. **İletişim Merkezi vizyonu**: 3 katmanlı yapı (İletişim + Görev + Dobody) uygun mu?
