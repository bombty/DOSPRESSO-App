# DOSPRESSO Stratejik Yol Haritası — IT Danışman Önerisi
**Tarih:** 2 Nisan 2026 | **Pilot:** ~14 Nisan (12 gün)
**Temel İlke:** Daha az ama çalışan > Daha çok ama kırık

---

## MEVCUT DURUM GERÇEĞİ

### Sistem Büyüklüğü (İmpresif)
- 400 tablo, 1577 endpoint, 299 sayfa, 270 kullanıcı
- 13 Centrum dashboard, 43 ikon, Design System v4

### Ama Gerçek Sorun
```
DB'DE VAR          → DASHBOARD'DA GÖSTERİLMİYOR
─────────────────────────────────────────────────
1,215 görev         → CGO/Coach widget'ı: 0
57 arıza            → CGO canlı arıza: 0  
41 destek talebi    → CRM widget: "—"
23 müşteri GB       → Misafir widget: boş
16,107 bildirim     → Özet/digest yok — gürültü
5 periyodik görev   → Kiosk'ta görünmüyor
13 checklist        → Uyum %'si hesaplanmıyor
```

**Sonuç:** Sistem kağıt üzerinde zengin, ama kullanıcı boş ekranlar görüyor.
Pilotta şube müdürü giriş yapacak, boş dashboard görecek, "bu sistem çalışmıyor" diyecek.

---

## AŞAMA 0: TEMEL DÜZELT (Pilot öncesi — 12 gün)
**Motto:** "Az ama çalışan"

### 0.1 Veri Borusu Düzelt (2 gün) — 🔴 EN KRİTİK
Neden dashboard'lar boş? 3 olası sebep:
1. **Query filtresi** — endpoint `branchId` filtresi yanlış, HQ rolleri tüm veriyi göremiyor
2. **Auth/scope** — `requireManifestAccess` middleware veriyi engelliyor
3. **Response format** — Frontend `data.faults` bekliyor, backend `data` döndürüyor

**Yapılacak:**
- Replit'ten gelen canlı API test sonuçlarına göre her endpoint'i tek tek düzelt
- CEO/Coach/CGO rollerinin TÜM şube verisini görebildiğinden emin ol
- Her widget'ın API'den veri aldığını test et
- Boş widget'larda "Veri yok" yerine "0 açık arıza ✅" gibi pozitif mesaj göster

### 0.2 Fabrika Kiosk Doğrulama (1 gün)
- Vardiya giriş/çıkış çalışıyor mu?
- Günlük üretim kayıt formu çalışıyor mu?
- Pilot kullanıcılar (Fabrika + HQ + Işıklar + Lara) giriş yapabiliyor mu?
- Kiosk token sorunu düzeltildi mi? (doğrulama)

### 0.3 Görev Sistemi Çalıştır (1 gün)
- Görev oluşturma 500 hatası → root cause (Replit raporu ile)
- Coach → Şube'ye görev ata → Şube kiosk'ta görev görünsün
- Görev tamamla → Coach dashboard'da yansısın
- Bu TEK akışın uçtan uca çalışması yeterli

### 0.4 4 Dashboard Doğrulama (1 gün)
CEO, CGO, Coach, Müdür dashboard'larında:
- Her widget'ta gerçek veri mi, dummy mi?
- Widget'lara tıklayınca doğru sayfaya gidiyor mu?
- KPI'lar API'den canlı mi?

---

## AŞAMA 1: PİLOT (14 Nisan — 4 hafta)
**Motto:** "Alışkanlık oluştur"

### 1.1 Günlük Döngü Oluştur
Pilot başarısı = kullanıcıların HER GÜN sisteme girmesi

```
SABAH (08:00):
├── Kiosk: Vardiya giriş + açılış checklist
├── Müdür: Dashboard'a bak → günün durumu
├── Coach: Dobody morning brief → "bugün dikkat edilecekler"
└── Fabrika: Üretim planını gör

GÜN İÇİ:
├── Barista: Görevlerimi tamamla + fotoğraf
├── Supervisor: Checklist takip + varsa misafir GB yanıtla
├── Müdür: Gelen görevleri tamamla
└── Fabrika: Üretim kaydı + QC

AKŞAM (18:00):
├── Kiosk: Vardiya çıkış + kapanış checklist
├── Müdür: Günlük özet kontrolü
└── Coach: Şube skorlarını gözden geçir
```

### 1.2 Dobody'i Aktifleştir (pilot boyunca)
Şu an Dobody "Bekleyen öneri yok" diyor. Pilotta şunları yapmalı:

```
Hafta 1: Basit hatırlatmalar
├── "Lara bugün checklist yapmadı"
├── "3 arıza 24 saatten fazla açık"
└── "Fabrika QC onay bekliyor"

Hafta 2: Pattern tespiti
├── "Işıklar 3 gündür kapanış checklist eksik"
├── "Ali Barista tüm görevleri zamanında — tebrik et"
└── "Teknik departman ort çözüm süresi 36s"

Hafta 3-4: Aksiyon önerisi
├── "Lara NPS 3.2 → 2.8 düştü — Coach ziyareti önerilir"
├── "Fazla mesai maliyeti %20 arttı — vardiya planı optimize et"
└── "5 şubede hijyen checklist uyumu <%60 — toplu eğitim öner"
```

### 1.3 Pilotta YAPMA Listesi
```
❌ Yeni modül ekleme
❌ Yeni tablo oluşturma
❌ Tasarım değişikliği
❌ Yeni rol ekleme
✅ Sadece bug fix + veri bağlantı düzeltme
✅ Kullanıcı feedback'ine göre UX iyileştirme
✅ Dobody insight'larını geliştirme
```

---

## AŞAMA 2: PİLOT SONRASI GENIŞLEME (Mayıs-Haziran 2026)

### Öncelik 1: Veri Akışını Zenginleştir
| Hafta | İş | Etki |
|-------|-----|------|
| H1 | Hedef sistemi (her KPI'ya target) | CEO/Coach karar verebilir |
| H2 | Haftalık trend (bu vs geçen hafta) | Kötüleşme erken görülür |
| H3 | Şube karşılaştırma widget | En iyi/kötü şube net |
| H4 | 5 boyutlu sağlık kartı | Franchise sağlık net |

### Öncelik 2: CRM Yeniden Yapılanma (S3.5)
| Hafta | İş |
|-------|-----|
| H5 | CRM sidebar reorganizasyonu |
| H6 | Operasyon'dan CRM'e taşıma |
| H7 | Denetim ayrımı (HQ/Coach/Şube) |
| H8 | Widget tıklanabilirlik + navigasyon |

### Öncelik 3: Dashboard Zenginleştirme
| Hafta | İş |
|-------|-----|
| H9 | CEO: +8 widget (gelir trend, NPS, onaylar...) |
| H10 | Coach: +7 widget (ziyaret, denetim, CAPA...) |
| H11 | CGO: +5 widget (ekipman yaşam, bakım takvimi...) |
| H12 | Muhasebe/Satınalma: +11 widget |

### Öncelik 4: Otomasyon
| Hafta | İş |
|-------|-----|
| H13 | Dobody erken uyarı sistemi |
| H14 | Otomatik görev oluşturma (düşük puan → görev) |
| H15 | SLA eskalasyon zinciri |
| H16 | Admin tema özelleştirme |

---

## AŞAMA 3: ÖLÇEKLENDİRME (Temmuz-Aralık 2026)

25 şube → 55 şube hedefi için:
- Bölge/cluster yönetimi
- Franchise sözleşme yönetimi
- Sistem kullanım analitik
- Best practice paylaşımı
- Excel import → POS API entegrasyonu
- Tam otonom Dobody (onay mekanizmalı)

---

## ÖZETLENMİŞ TAVSİYE

```
ŞİMDİ (12 gün):
├── Veri borusunu düzelt → dashboard'lar canlansın
├── 1 akış uçtan uca çalışsın (görev ata → tamamla → dashboard'da gör)
├── Fabrika kiosk çalışsın
└── 4 dashboard gerçek veri göstersin

PİLOT (4 hafta):
├── Günlük döngü oluştur (checklist → görev → skor)
├── Dobody'i aktifleştir (hatırlatma → pattern → aksiyon)
└── Bug fix only — yeni özellik YASAK

SONRA (aylık):
├── Hedef + trend + karşılaştırma
├── CRM yapılanma
├── Dashboard zenginleştirme
└── Otomasyon
```

**Tek cümleyle:**
Pilot başarısı = kullanıcı her gün giriş yapıyor + ekranlar boş değil + 1 iş akışı sorunsuz çalışıyor. Geri kalan her şey bundan sonra.
