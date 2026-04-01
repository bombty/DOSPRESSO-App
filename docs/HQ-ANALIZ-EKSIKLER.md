# DOSPRESSO HQ Analizi — Eksikler, Optimizasyonlar, Dashboard İyileştirmeleri
**Tarih:** 2 Nisan 2026 | **Perspektif:** Franchise yönetim sistemi best practices

---

## BÖLÜM 1: GENEL SİSTEM EKSİKLERİ (Tüm HQ'yu Etkileyen)

### 1.1 Şu an YOK — olması gereken

| # | Eksik Özellik | Neden Kritik | Etkilenen Roller |
|---|---------------|-------------|-----------------|
| E1 | **Haftalık/Aylık Karşılaştırma (Trend)** | CEO "geçen haftaya göre durum ne?" diyemiyor. Sadece anlık veri var, trend yok. | CEO, Coach, CGO |
| E2 | **Hedef vs Gerçek Takip** | Hiçbir KPI'da "hedef" yok. %73 sağlık iyi mi kötü mü belli değil. | Tüm HQ |
| E3 | **Bekleyen Onay Merkezi** | CEO/Coach'ın onay bekleyen görevleri, CAPA'ları, talepleri tek yerde göremiyorlar. | CEO, Coach, CGO |
| E4 | **Günlük Özet / Morning Brief** | Giriş yapınca "bugün dikkat etmen gereken 5 şey" yok. Dobody bunu yapmalı. | Tüm HQ |
| E5 | **Şube Ziyaret Planlama** | Coach/Trainer sahada — hangi şubeye ne zaman gidecek? Ziyaret kaydı yok. | Coach, Trainer |
| E6 | **Takvim/Ajanda Entegrasyonu** | Denetim tarihi, CAPA deadline, görev bitiş tarihi — takvimde göremiyorlar. | Coach, Trainer, Müdür |
| E7 | **Doküman Yönetimi** | Franchise sözleşme, prosedür, SOP dokümanları merkezi depo yok. | Tüm HQ |
| E8 | **Sistem Kullanım Analitik** | Kim ne kadar kullanıyor? Hangi şube hiç giriş yapmadı? | CEO, Admin |
| E9 | **Karşılaştırmalı Raporlama** | Şube A vs Şube B detaylı karşılaştırma yok. | CEO, Coach |
| E10 | **Bildirim Özeti / Digest** | 16,107 bildirim var ama özet/digest yok — bildirim gürültüsü. | Tüm |

### 1.2 VAR ama Optimize Edilmesi Gereken

| # | Mevcut | Sorun | Çözüm |
|---|--------|-------|-------|
| O1 | Şube Sağlık Skoru | Tek boyutlu sayı — neyin düşük olduğu belli değil | 5 boyutlu spider/radar widget (Operasyon, Müşteri, Personel, Eğitim, Finans) |
| O2 | KPI'lar | Hedef yok, trend yok, sadece anlık değer | Her KPI'ya hedef + geçen hafta değeri + trend oku |
| O3 | Eskalasyon | Sadece liste — kaç gündür açık, kim sorumlu belli değil | Yaşlandırma (aging) + atanan kişi + SLA süre |
| O4 | Dobody Panel | "Bekleyen öneri yok" çoğu zaman — boş duruyor | Öneri yoksa bile günlük insight göstersin (trend, pattern) |
| O5 | Personel Widget | Sadece "Aktif" ve "Geç" — çok yüzeysel | Devamsızlık trendi, fazla mesai uyarısı, turnover riski |
| O6 | CRM Widget | "Açık: —" gösteriyor — veri bağlantısı kopuk | Açık talep + ort yanıt süresi + NPS skoru |
| O7 | Gelir-Gider | Statik sayılar — trend/karşılaştırma yok | Bu ay vs geçen ay, bütçe vs gerçek |
| O8 | Bordro | Sadece toplam — detay yok | Şube bazlı bordro dağılımı, fazla mesai maliyeti |

---

## BÖLÜM 2: ROL BAZLI DASHBOARD EKSİKLERİ

### 2.1 CEO Dashboard — Eksik Widget'lar

```
MEVCUT (6 widget):
✅ Şube Sağlık    ✅ Eskalasyon    ✅ Merkez Bordro
✅ Diğer Şubeler  ✅ Merkez Gider  ✅ Franchise KPI

EKLENMESİ GEREKEN (8 widget):
❌ Gelir Trend (haftalık/aylık karşılaştırma grafiği)
❌ Maliyet Oranları (işçilik oranı, COGS, kârlılık)
❌ Misafir Memnuniyeti (NPS trend + en iyi/kötü şube)
❌ Bekleyen Onaylar (görev onay, CAPA onay, harcama onay)
❌ Görev Durumu (toplam/geciken/tamamlanan — pie chart)
❌ Eğitim Uyumu (genel eğitim tamamlanma oranı)
❌ Sistem Kullanımı (aktif kullanıcı, giriş sayısı)
❌ Haftanın Özeti (Dobody AI: en önemli 3 gelişme)
```

**CEO KPI'larına eklenmeli:**
- Toplam Gelir (trend oklu)
- Kârlılık % (hedef vs gerçek)
- Misafir NPS (trend)
- Sistem Kullanım %

### 2.2 CGO Dashboard — Eksik Widget'lar

```
MEVCUT (8 widget):
✅ Teknik Sağlık   ✅ Canlı Arıza    ✅ Şube Sağlık
✅ Uyum            ✅ CRM            ✅ Personel
✅ Eskalasyon      ✅ Gelir-Gider

EKLENMESİ GEREKEN (5 widget):
❌ Ekipman Yaşam Döngüsü (yaş, amortisman, bakım planı)
❌ Bakım Takvimi (önleyici bakım planı — yaklaşan tarihler)
❌ Arıza Analizi (en çok arıza veren ekipman tipi, tekrar eden sorunlar)
❌ Tedarikçi Performans (yedek parça temin süresi, maliyet)
❌ SLA Performans Trend (haftalık çözüm süresi grafiği)
```

**CGO KPI'larına eklenmeli:**
- Ort Çözüm Süresi (saat) + trend
- Bakım Maliyeti (₺) 
- Ekipman Kullanılabilirlik %

### 2.3 Coach Dashboard — Eksik Widget'lar

```
MEVCUT (7 widget):
✅ Sağlık     ✅ Uyum          ✅ Eskalasyon
✅ Arıza      ✅ CRM           ✅ Personel
✅ Uyumsuz

EKLENMESİ GEREKEN (7 widget):
❌ Ziyaret Planı (bu hafta hangi şubelere gidilecek)
❌ Denetim Durumu (yaklaşan denetimler, son denetim tarihi/puanı)
❌ CAPA Takip (açık düzeltici eylemler, deadline'lar)
❌ Görev Takip (atanan görevler: tamamlanan/geciken/bekleyen)
❌ En İyi & En Kötü (TopFlop: en iyi 3 şube vs en kötü 3)
❌ Eğitim İlerleme (şube bazlı eğitim tamamlanma)
❌ Şube Karşılaştırma (2 şubeyi yan yana — spider chart)
```

**Coach KPI'larına eklenmeli:**
- Ziyaret (bu hafta planlanan/tamamlanan)
- Görev Tamamlanma %
- Denetim Puanı Ort

### 2.4 Trainer Dashboard — Eksik Widget'lar

```
MEVCUT (9 widget):
✅ Sağlık     ✅ Uyum          ✅ Eskalasyon
✅ Arıza      ✅ CRM           ✅ Personel
✅ Işıklar    ✅ Şube Eğitim   ✅ Uyumsuz

EKLENMESİ GEREKEN (5 widget):
❌ Eğitim Takvimi (yaklaşan eğitimler, planlama)
❌ Sertifika Durumu (kimde hangi sertifika var/eksik)
❌ Yetkinlik Matrisi (şube bazlı: barista skill'ler)
❌ Yeni Ürün Eğitim Takip (rollout: kaç şube tamamladı)
❌ Quiz/Sınav Sonuçları (başarı oranı, en zor konular)
```

### 2.5 Muhasebe Dashboard — Eksik Widget'lar

```
MEVCUT (6 widget):
✅ Fabrika Personel   ✅ HQ Personel     ✅ Işıklar Personel
✅ Merkez Giderler    ✅ Şubeler Bordro  ✅ Dikkat Gerektiren

EKLENMESİ GEREKEN (6 widget):
❌ Nakit Akış Özeti (giren/çıkan/bakiye)
❌ Alacak Yaşlandırma (franchise ücretleri, geciken ödemeler)
❌ Bütçe vs Gerçek (aylık karşılaştırma)
❌ Kârlılık Analizi (şube bazlı: en çok/az kazandıran)
❌ Vergi/SGK Takvimi (yaklaşan yükümlülükler)
❌ Fazla Mesai Maliyeti (şube bazlı, trend)
```

### 2.6 Satınalma Dashboard — Eksik Widget'lar

```
MEVCUT (4 widget):
✅ Kritik Stok      ✅ Fiyat Güncelleme
✅ Sipariş Giriş    ✅ Tedarikçi Performans

EKLENMESİ GEREKEN (5 widget):
❌ Sipariş Durumu (bekleyen/onaylanan/teslim edilen)
❌ Fiyat Karşılaştırma (tedarikçi A vs B vs C — aynı ürün)
❌ Stok Optimizasyon (fazla stok uyarısı, min/max önerileri)
❌ Teslim Süresi Takip (söz verilen vs gerçek teslim)
❌ Maliyet Tasarruf (geçen aya göre ne kadar tasarruf edildi)
```

---

## BÖLÜM 3: FRANCHISE YÖNETİMİ İÇİN KRİTİK EKSİKLER

### 3.1 Franchise Sağlık Göstergesi (Şu an yok)

Her şube için **5 boyutlu sağlık kartı** olmalı:

```
         Operasyon (%78)
            ╱╲
           ╱  ╲
Finans ───╱    ╲─── Müşteri
 (%65)   ╱  🏢  ╲   (%82)
         ╲      ╱
          ╲    ╱
Personel ──╲╱── Eğitim
 (%71)        (%59)

Şube: Lara | Genel Skor: 71/100
Trend: ▼ (-3 geçen haftaya göre)
```

**Bileşenler:**
1. Operasyon: checklist uyumu + görev tamamlama + denetim puanı
2. Müşteri: NPS + şikayet oranı + yanıt süresi
3. Personel: devamsızlık + turnover + eğitim tamamlama
4. Finans: gelir trendi + maliyet kontrolü + bordro oranı
5. Eğitim: sertifika oranı + quiz başarı + onboarding

### 3.2 Franchise Karşılaştırma (Şu an yok)

CEO/Coach'ın en çok ihtiyacı olan:
```
┌──────────────┬────────┬────────┬────────┐
│              │ Lara   │ Işıklar│ Kemer  │
├──────────────┼────────┼────────┼────────┤
│ Sağlık       │ 29 🔴  │ 67 🟡  │ 82 🟢  │
│ Gelir        │ ₺78K   │ ₺92K   │ ₺105K  │
│ NPS          │ 3.2    │ 3.8    │ 4.1    │
│ Personel     │ 6/7    │ 8/8    │ 9/10   │
│ Checklist    │ %52    │ %78    │ %91    │
│ Denetim      │ 45     │ 72     │ 88     │
│ Görev        │ %34    │ %65    │ %82    │
│ Arıza        │ 5 açık │ 2 açık │ 0      │
└──────────────┴────────┴────────┴────────┘
```

### 3.3 Erken Uyarı Sistemi (Şu an yok)

```
MR. DOBODY → PATTERN TESPİTİ → ERKEN UYARI

Örnekler:
⚠️ "Lara'da personel devir hızı son 3 ayda %40 — sektör ort %15"
⚠️ "Kemer'de hijyen denetim puanı 3 aydır düşüyor: 88→72→61"
⚠️ "Işıklar'da müşteri şikayetleri %200 arttı (geçen aya göre)"
⚠️ "Fabrika QC red oranı %12 — hedef <%5"
⚠️ "4 şubede açılış checklist 5+ gündür yapılmıyor"

Bunlar şu an hiç yok — Dobody sadece "Bekleyen öneri yok" diyor.
```

### 3.4 Performans Hedef Sistemi (Şu an yok)

Her şube için hedefler olmalı:
- Aylık gelir hedefi → CEO/Muhasebe belirler
- NPS hedefi → Coach belirler (ör: minimum 4.0)
- Checklist uyum hedefi → Coach belirler (ör: minimum %85)
- Eğitim tamamlama hedefi → Trainer belirler (ör: minimum %90)
- Arıza çözüm SLA → CGO belirler (ör: kritik <4s, normal <24s)

Dashboard'larda hedef çizgisi gösterilmeli — "gerçek vs hedef"

---

## BÖLÜM 4: TEKNİK OPTİMİZASYON ÖNERİLERİ

### 4.1 Veri Katmanı

| # | Sorun | Çözüm |
|---|-------|-------|
| V1 | 16,107 bildirim — temizlik yok | 30 gün sonra arşivle, digest oluştur |
| V2 | role_permissions = 0 | Dinamik izin sistemi kontrol et, varsayılan izinler seed et |
| V3 | employee_documents = 0 | Pilot öncesi örnek doküman yükle |
| V4 | purchase_orders = 0 | Satınalma modülü seed data ekle |
| V5 | cowork_channels = 0 | Varsayılan departman kanalları oluştur |
| V6 | 270 user / 62 aktif | İnaktif hesapları temizle veya arşivle |

### 4.2 Dashboard Performans

| # | Sorun | Çözüm |
|---|-------|-------|
| D1 | Her widget ayrı API çağrısı | Dashboard-level aggregate endpoint oluştur |
| D2 | Şube sağlık hesaplama yavaş olabilir | Günlük snapshot tablosu (branch_daily_snapshots) |
| D3 | KPI'lar her render'da hesaplanıyor | 5dk cache (staleTime: 300_000) |
| D4 | Widget'lar boş veri gösteriyor | Skeleton → "Veri yok" mesajı → "Veri ekle" CTA |

---

## BÖLÜM 5: ÖNCELİK SIRASI

### Pilot İçin ŞART (14 Nisan öncesi)
1. Widget veri bağlantıları düzelt (boş widget'lar)
2. Görev oluşturma 500 hatası düzelt
3. Widget tıklanabilirlik ✅ (yapıldı)
4. Fabrika QC + Depo (S3)

### Pilot Sonrası İlk Dalga
5. Hedef vs Gerçek sistemi (tüm KPI'lara hedef ekle)
6. Haftalık trend (geçen hafta vs bu hafta)
7. Şube karşılaştırma widget'ı (CEO + Coach)
8. 5 boyutlu sağlık kartı
9. Dobody insight sistemi (pattern → erken uyarı)

### İkinci Dalga
10. Ziyaret planlama (Coach/Trainer)
11. Takvim entegrasyonu
12. Doküman yönetimi
13. Sistem kullanım analitik
14. Bekleyen onay merkezi

---

*Bu doküman franchise yönetim best practice'lerine ve mevcut sistem analizine dayanmaktadır.*
