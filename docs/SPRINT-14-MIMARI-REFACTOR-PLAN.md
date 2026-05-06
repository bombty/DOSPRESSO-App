# 🏗️ Sprint 14 — Bağlam-İçi Tab Refactor (Mimari Yeniden Yapılandırma)

> **Karar tarihi:** 6 May 2026 22:35 (Aslan'ın gıda mühendisi modülü canlı testi sırasında)
>
> **Tetikleyici sorun:** Sema (gida_muhendisi) "Etiket Hesapla" linkine tıkladı → `productId` parametresi olmadan crash. Bu sadece bug değil, **mimari bir hatadır**.

---

## 🎯 Tespit Edilen Mimari Hata

**Şu anki yaklaşım:** Sidebar **sayfa-bazlı** organize edilmiş.

```
Sidebar (yanlış):
├── Reçeteler ✓
├── Etiket Hesapla ❌ (productId olmadan crash)
├── Tedarikçi Kalite QC ❌ (defectRate undefined)
├── Lot İzleme ❌ (bağlamı yok)
├── TÜRKOMP ❌ (searchResults.map crash)
├── Maliyet ❌ (zaten reçetede var)
├── Gıda Güvenliği ❌ (genel sayfa, anlamsız)
```

**Sorun:** Bu sayfalar **bağlamsız** açılıyor.
- Sema "Etiket Hesapla" tıklıyor → ne ürün için?
- "Lot İzleme" → hangi malzeme/reçete?
- "Maliyet" → hangi ürün?

URL parametreleri eksik → crash → kötü UX.

---

## ✅ D-44 Yeni Prensibi: Bağlam-İçi Tab (Context-First Tabs)

> **Prensip:** Bir özellik **bağlam içinde anlamlıysa**, sidebar'a değil, **ürün/reçete/hammadde detay sayfasının sekmesi** olarak yerleştirilir.
>
> Sidebar **rol-bağımsız ana iş alanlarını** içerir. Bağlam-içi özellikler (etiket, lot, maliyet, kalite kontrol, vb.) detay sayfalarında sekme olarak yer alır.

**Bu prensip tüm DOSPRESSO platformuna uygulanır** — sadece gıda mühendisi modülüne değil:
- PDKS modülü → Personel detay içinde "Devamsızlık", "Bordro", "Performans" sekmeleri
- Audit modülü → Şube detay içinde "Denetim Geçmişi", "Skor Trendi" sekmeleri
- CRM → Müşteri detay içinde "Şikayet Geçmişi", "Memnuniyet" sekmeleri

### Kural Seti

1. **Sidebar = Liste/Hub sayfaları** (bağlam-bağımsız)
2. **Detay sayfaları = Bağlam-içi sekmeler** (ürün/reçete/hammadde-bazlı)
3. **İçerik rol-bağımsız**, **aksiyonlar rol-spesifik**:
   - Sema, İlker, Aslan, CGO **aynı sekmeleri görür**
   - Sadece "Onayla", "Düzenle", "Sil" gibi butonlar role göre değişir

---

## 🏗️ Yeni Sidebar Yapısı (Hedef)

```
SIDEBAR:
├── 🏠 Dashboard (Mr. Dobody akıllı anasayfa - rol-aware)
├── 📚 Reçeteler (ana iş alanı)
├── 🥕 Hammaddeler (TGK Girdi Yönetimi)
├── 🔬 TÜRKOMP (referans araç - opsiyonel)
└── ⚙️ Ayarlar
```

**Çıkarılan/taşınan sidebar linkleri:**
- ❌ "Etiket Hesapla" → Reçete detayında "Etiket" sekmesi
- ❌ "Tedarikçi Kalite QC" → Hammadde detayında "Tedarikçi Kalite" sekmesi
- ❌ "Lot İzleme" → Hem reçete hem hammadde detayında "Lot" sekmesi
- ❌ "Maliyet" (zaten reçetede var)
- ❌ "Gıda Güvenliği" → Dashboard widget'ı

---

## 📋 Reçete Detay → 10 Sekme (Yeni)

```
🍪 BEYAZ BROWNIE (BRW-001) • v1 • 🟡 Onaysız
┌────────────────────────────────────────────────────────┐
│ Bağlam Şeridi (Mr. Dobody)                             │
│ ⚠️ Süt, Yumurta, Buğday tespit edildi                   │
│ 📊 Maliyet: 12.40 TL/100g (hedef: 10 TL ❗)             │
│ 🏷️ Etiket: Henüz oluşturulmadı                         │
│ 📦 Son lot: 2026-W18 (Cumartesi)                       │
└────────────────────────────────────────────────────────┘

[Tabs] Genel | Malzemeler | Adımlar | Besin | Alerjenler |
       Etiket 🆕 | Lot 🆕 | Maliyet | Onaylar | Geçmiş 🆕

[Rol-bazlı Üst Aksiyon]
- Sema:  [Onayla & Etiket Üret] [Reddet]
- İlker: [Düzenle] [Yeni Versiyon]
- Aslan: hepsi + [Sil]
- CGO:   sadece okuma
```

### Sekme Detayları

| # | Sekme | İçerik | Mevcut Modül |
|---|---|---|---|
| 1 | 📋 Genel | Ad, kod, kategori, versiyon, durum, tarihler | (yeni) |
| 2 | 🥄 Malzemeler | factory_recipe_ingredients tablosu | mevcut |
| 3 | 📝 Adımlar | factory_recipe_steps + timer | mevcut |
| 4 | 🥗 Besin Değerleri | TÜRKOMP + AI nutrition (factory_ingredient_nutrition) | mevcut |
| 5 | ⚠️ **Alerjenler** | 14 allerjen otomatik tespit | factory-allergens.ts taşınıyor |
| 6 | 🏷️ **Etiket** | TGK 2017/2284 etiket draft + onay + basım | etiket-hesapla.tsx taşınıyor |
| 7 | 📦 **Lot İzleme** | Bu reçeteden üretilmiş tüm lotlar + zinciri | lot-izleme taşınıyor |
| 8 | 💰 Maliyet | Hammadde × miktar × fiyat hesabı | mevcut |
| 9 | ✅ Onaylar | factory_recipe_approvals workflow | mevcut |
| 10 | 📊 **Geçmiş** | factory_production_logs | (yeni widget) |

---

## 🥕 Hammadde Detay → 5 Sekme (Yeni)

```
🥛 SÜT (KOD: H-1110) • Tedarikçi: ÖrnekSüt A.Ş.
┌────────────────────────────────────────────────────────┐
│ ⚠️ Süt - Allerjen | TÜRKOMP veri tam | 14 reçetede    │
└────────────────────────────────────────────────────────┘

[Tabs] Genel | Besin (TÜRKOMP) | Alerjen | 
       Tedarikçi Kalite 🆕 | Stok Hareketleri
```

| # | Sekme | İçerik | Mevcut Modül |
|---|---|---|---|
| 1 | 📋 Genel | Ad, kod, birim, kategori | mevcut (girdi-yonetimi) |
| 2 | 🥗 Besin (TÜRKOMP) | turkomp.tsx widget'ı | mevcut |
| 3 | ⚠️ Alerjen | 14 allerjenden hangileri | mevcut |
| 4 | 🛡️ **Tedarikçi Kalite** | tedarikci-kalite.tsx taşınıyor | taşınıyor |
| 5 | 📦 Stok Hareketleri | inventory_movements + sayım | mevcut |

---

## 🤖 Mr. Dobody Dashboard (Sprint 15)

**Tüm roller aynı 4 widget'ı görür**, içerik role göre filtrelenir:

```
┌─────────────────────────────────────────────────┐
│ 👋 Hoşgeldin {ROL}! Bugün {N} aksiyonun bekliyor │
└─────────────────────────────────────────────────┘

🚨 ACIL AKSIYON BEKLEYENLER (rol-bazlı filter)
   - Sema:  Onayım bekleyen reçeteler
   - İlker: Tamamlanmamış reçetelerim
   - Aslan: Tüm pending'ler

📊 KPI'LAR (rol-bazlı detay)
   - Sema:  Onay süresi ortalaması, allerjen tespit doğruluğu
   - Aslan: Tüm KPI'lar (CGO, IK, finans)

🤖 AI ÖNERİLERİ (rol-bazlı)
   - Sema:  "Beyaz Brownie 7 gündür bekliyor"
   - İlker: "Cinnaboom v2 için TÜRKOMP veri eksik"
   - Aslan: "Pilot 12 May'a hazırlık %85"

📅 HATIRLATMALAR (rol-bazlı)
   - Sema:  Helal sertifika SKT, mevzuat değişikliği
   - Aslan: Bordro, audit, SGK dönem
```

---

## 🛠️ Implementation Plan

### Sprint 13 (Bu gece — 6 May 2026, BU PR'DA YAPILDI)

✅ **Hızlı Fix'ler (pilot için kritik):**

| # | Fix | Dosya | Etki |
|---|---|---|---|
| F1 | TÜRKOMP `searchResults` unwrap | `client/src/pages/turkomp.tsx` | Arama çalışır |
| F2 | Tedarikçi `defectRate ?? 0` null safety | `client/src/pages/tedarikci-kalite.tsx` | Sayfa açılır |
| F3 | Etiket Hesapla — anlamlı empty state | `client/src/pages/etiket-hesapla.tsx` | Crash önlenir, reçeteye yönlendirir |
| F4 | Sidebar "Etiket Hesapla" link kaldır | `module-menu-config.ts` | Yanlış yönlendirme önlenir |

### Sprint 14 — Reçete Hub Refactor (Post-pilot, 1 hafta)

**Hedef:** Reçete detay 6 sekme → 10 sekme.

**Görevler:**
1. `fabrika-recete-detay.tsx` içine 4 yeni sekme ekle:
   - "Alerjenler" — `factory-allergens.ts` UI'sını embed
   - "Etiket" — `etiket-hesapla.tsx` içeriğini sekme olarak taşı
   - "Lot İzleme" — yeni widget
   - "Geçmiş" — `factory_production_logs` listele
2. Bağlam şeridi (top notification bar) ekle
3. Rol-bazlı aksiyon butonları (top-right)
4. Sidebar'dan ilgili link'leri kaldır:
   - "Etiket Hesapla" (zaten Sprint 13'te kaldırıldı)
   - "Lot İzleme" (eski sayfa /admin/legacy-lot-izleme'ye taşı)
5. Eski `/etiket-hesapla` route'u redirect et: `/etiket-hesapla?productId=X` → `/fabrika-recete-detay/X#etiket`

### Sprint 15 — Hammadde Hub Refactor (1 hafta)

**Hedef:** `girdi-yonetimi.tsx` detay → 5 sekme.

**Görevler:**
1. Hammadde detay sayfası oluştur (yoksa) veya genişlet
2. "Tedarikçi Kalite" sekmesi ekle (`tedarikci-kalite.tsx` taşın)
3. "Stok Hareketleri" sekmesi
4. Sidebar'dan "Tedarikçi Kalite QC" kaldır

### Sprint 16 — Mr. Dobody Dashboard (1 hafta)

**Hedef:** Rol-bağımsız akıllı anasayfa.

**Görevler:**
1. `/dashboard` route + `dashboard.tsx` sayfası
2. 4 widget: Aksiyon, KPI, AI öneriler, Hatırlatmalar
3. Her widget rol-bazlı filter (içerik aynı, filter farklı)
4. Mr. Dobody scheduler (haftalık özet, allerjen risk, vb.)

### Sprint 17 — Sidebar Final Temizliği (3 gün)

**Hedef:** Sidebar minimal hale getir.

**Görevler:**
1. Tüm taşınmış link'leri kaldır
2. Sadece ana iş alanları kalsın:
   - Dashboard, Reçeteler, Hammaddeler, TÜRKOMP, Ayarlar
3. Eski sayfaları `/admin/legacy/*` altına taşı (rollback için)
4. Smoke test: Sema, İlker, Aslan, CGO 4 rol senaryo

---

## 🎁 Yenilikçi Eklemeler (Sprint 14-17 Boyunca)

### Kategori A: AI/ML Otomasyon

| Özellik | Sprint | Değer |
|---|---|---|
| Reçete onayında **otomatik etiket draft** üret | 14 | Sema'nın 15 dk işi → 0 dk |
| **Allerjen çapraz kontrol** — yeni reçete eklendiğinde mevcutlarla örtüşme | 14 | Çapraz kontaminasyon erken tespit |
| **Maliyet/besin trade-off önerisi** | 15 | "Tereyağı yerine margarin: -%18 maliyet, +%12 doymuş yağ" |
| **TÜRKOMP eksik veri AI tahmin** (GPT-4o + güven skoru) | 15 | Veri yokluğu blocker olmasın |
| **Fotoğraftan reçete tarama** (defter sayfası → AI) | 17 | R&D hızı 10x |

### Kategori B: Compliance / Mevzuat

| Özellik | Sprint |
|---|---|
| TGK 2017/2284 otomatik denetim (etiket basılmadan önce 14 alan kontrolü) | 14 |
| Mevzuat değişikliği uyarı sistemi (Tarım Bakanlığı sayfası crawl) | 16 |
| Sertifika SKT takibi (Helal, Vegan, Organik — 30 gün öncesi uyar) | 15 |
| Tedarikçi belge yönetimi (Analiz Raporu, MSDS, Helal) | 15 |

### Kategori C: Lot İzleme (Forensic Traceability)

| Özellik | Sprint |
|---|---|
| Hammadde → Reçete → Ürün → Müşteri zinciri | 14 |
| Geri çağırma simülasyonu | 16 |
| Bozuk lot tespitinde otomatik bildirim + zincir blok | 16 |

### Kategori D: Veri Vizualizasyon

| Rapor | Mr. Dobody Tetikleyici |
|---|---|
| Haftalık alerjen risk heat map | Pazartesi 09:00 |
| Aylık reçete onay süresi (KPI) | Ay sonu |
| TÜRKOMP veri tamamlama oranı | Haftalık |
| AR-GE deneme sonuçları | Reçete bazında |

---

## 📐 Tasarım Prensipleri (Standart Olsun)

### 1. Bağlam-İçi Tab Prensibi (D-44)
- Bir özellik bir varlığa bağlıysa → o varlığın detay sayfasında sekme
- Bağlam-bağımsızsa → sidebar'da ana sayfa

### 2. Rol-Bağımsız İçerik
- Tüm roller aynı sekmeleri görür
- Sadece **aksiyonlar** rol-spesifik
- Hiç kimse "ben bu sayfayı niye göremiyorum?" sormaz

### 3. Bağlam Şeridi (Notification Strip)
- Detay sayfasının üstünde Mr. Dobody'den gelen kısa bilgi şeridi
- 3-4 önemli bilgi (alerjen, maliyet, durum, son lot)
- Her şey bir bakışta

### 4. Top-Right Aksiyon Butonları
- Rol-bazlı CTA (Onayla, Düzenle, Sil)
- En önemli aksiyon en sağda (kırmızı/yeşil)
- 2-3 aksiyon maksimum

### 5. Empty State Doğru Yönlendirme
- Hata mesajı yerine **çözüm yolu** göster
- "Önce bir reçete seçin → Reçeteler sayfasına git" gibi

---

## ✅ Onay Listesi (Aslan İçin)

Bu plana onay verirsen Sprint 14-17 detaylı sprint dosyaları post-pilot hazırlanır:

- [ ] D-44 prensibini DECIDED.md'ye ekle (bu PR'da yapılıyor)
- [ ] Sprint 14 mimari refactor planını kabul ediyorum (post-pilot)
- [ ] Reçete detay 10 sekme yapısını onaylıyorum
- [ ] Hammadde detay 5 sekme yapısını onaylıyorum
- [ ] Mr. Dobody Dashboard önceliğini onaylıyorum
- [ ] Sidebar minimal yapısını onaylıyorum (Dashboard, Reçeteler, Hammaddeler, TÜRKOMP)

---

**Hazırlayan:** Claude (Sprint 13 — gıda mühendisi modülü canlı testi sonrası mimari öneri)
**Tarih:** 6 May 2026, 22:55
**Tetikleyici:** Aslan'ın Sema rolü ile yaptığı 4 sayfa testi (Reçeteler, TÜRKOMP, Tedarikçi Kalite, Etiket Hesapla — 3'ü crash, 1'i workflow eksik)
**Sonuç:** Mimari yeniden değerlendirme + 4 hızlı fix (pilot için) + Sprint 14-17 plan
