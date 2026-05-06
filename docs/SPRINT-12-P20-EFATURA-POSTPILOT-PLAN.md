# 📄 Sprint 12 P-20 — e-Fatura / e-Arşiv / e-Defter Post-Pilot Geçiş Planı

> **Hazırlayan:** Claude (DOSPRESSO Compliance — e-Belge Geçiş Stratejisi)
> **Tarih:** 6 May 2026, 23:50
> **Sprint:** Sprint 12 P-20 (post-pilot 25 May+ planlama)
> **Yasal son tarih:** 1 Temmuz 2026 (zorunlu geçiş)
> **Kapsam:** HQ + Fabrika + Işıklar (D-12 muhasebe scope)

---

## 🚨 Yasal Aciliyet — 2026 Tebliğleri

### Ana Mevzuat

| Tebliğ | Tarih | İçerik |
|---|---|---|
| 509 sıra no.lu VUK Genel Tebliği | 19.10.2019 | e-Fatura ana çerçeve |
| 514 sıra no.lu VUK Genel Tebliği | — | Sektörel limit özelleştirme |
| 577 sıra no.lu VUK Genel Tebliği | — | Bilanço esası → e-Defter zorunlu |
| **589 sıra no.lu VUK Genel Tebliği** | **31.12.2025 RG** | **2026 yeni limitler — kağıt fatura sonu** |

### 2026 Yeni Limitler

| Mükellef Tipi | 2025 Brüt Satış Hasılatı | Geçiş Tarihi |
|---|---|---|
| Genel | **3 Milyon TL ve üzeri** | **1 Temmuz 2026** |
| e-Ticaret | 500 Bin TL ve üzeri | 1 Temmuz 2026 |
| Bilanço esası defter tutan | **CİRO FARK ETMEZ** | 1 Temmuz 2026 |
| Otel/konaklama | Ciro fark etmez | 1 Temmuz 2026 |
| Yeni kurulan şirket | İlk 3 ay | Faaliyetten itibaren |

### e-Arşiv Fatura (B2C — Son Tüketici)

**Yeni kural (2026):** Vergiler dahil **3.000 TL** üzeri tüm satışlar e-Arşiv olarak düzenlenmeli.

**DOSPRESSO için:** Şubelerde tek fatura nadiren 3.000 TL'yi aşar (kafe ortalama bilet 50-200 TL). Ancak **kurumsal toptan satış** veya **fabrika→şube transit** faturaları kesin 3.000 TL üzerinde olur → e-Arşiv zorunlu.

### Cezai Yaptırım

> Zorunluluk kapsamında olduğu halde kağıt fatura düzenleyenlere **belge tutarının %10'u oranında Özel Usulsüzlük Cezası**.

**DOSPRESSO örnek hesap:**
- 25 şube × 30 fatura/gün × 90 gün = 67,500 fatura
- Ortalama fatura: 100 TL
- Ceza riski: 67,500 × 100 × %10 = **675,000 TL** (3 ayda)

---

## 📊 DOSPRESSO Mevcut Durum Analizi

### Şu Anki Akış (manuel + parça parça)

```
[Şube POS] → günlük z-rapor → kağıt
            ↓
[Logo Software] → Excel export → e-mail attachment
            ↓
[Aslan / Muhasebe] → manuel girdi → vergi beyannamesi
```

### Sorunlar

1. ❌ **Zaman kaybı:** Aylık 25 şube × 30 gün × manuel giriş = 750 işlem
2. ❌ **Hata riski:** El ile yazılan rakam, transkript hatası
3. ❌ **Kayıt dışı risk:** Fatura kayıp, yazıcıdan çıkmama
4. ❌ **Yasal uyumsuzluk:** 1 Temmuz 2026 sonrası kağıt yasak
5. ❌ **Müşteri talebi:** Kurumsal müşteri "e-fatura kesin" diyor, yapılamıyor

### Mevcut Altyapı

✅ **Var olanlar:**
- `Logo Software` (POS + ön muhasebe)
- DOSPRESSO platformu Excel/Word import + AI parsing (Aslan'ın memories'inde)
- Branch transactions tablosu (potansiyel veri kaynağı)

❌ **Eksikler:**
- Mali mühür yok
- Entegratör anlaşması yok
- e-Defter yapısı yok
- B2B müşteri kayıtları (VKN/TCKN listesi) eksik

---

## 🎯 Geçiş Stratejisi — 2 Yol Karşılaştırması

### Yol 1: GİB Portal (Ücretsiz, manuel)

**Avantaj:**
- Ücretsiz
- Hızlı başvuru

**Dezavantaj:**
- ❌ Faturalar 6 aydan uzun saklanmaz (yasal saklama 10 yıl Aslan'a düşer)
- ❌ Manuel giriş (her fatura tek tek)
- ❌ Muhasebe yazılımı entegrasyonu YOK
- ❌ 25 şube × ayda 1000 fatura = pratik DEĞİL

**DOSPRESSO için:** ❌ Uygun değil.

### Yol 2: Özel Entegratör (Ücretli, otomatik)

**Avantaj:**
- ✅ Logo / Paraşüt / mevcut yazılımlarla tam entegre
- ✅ 10 yıl yasal saklama dahil
- ✅ Otomatik gönderim, raporlama, arşivleme
- ✅ Mali mühür/e-imza tedarik dahil
- ✅ B2B/B2C ayrımı otomatik

**Dezavantaj:**
- 💰 Aylık veya kontör başı maliyet (~2,000-10,000 TL/ay 25 şube için)

**DOSPRESSO için:** ✅ **Tek mantıklı seçenek**.

---

## 🏆 Entegratör Karşılaştırma

GİB onaylı major entegratörler:

| Entegratör | Aylık Tahmini Maliyet | Logo Entegrasyonu | Avantaj |
|---|---|---|---|
| **Logo İşbaşı / Logo Cloud** | 3,500-7,000 TL | ✅ Native | Logo zaten var, doğal seçim |
| **Paraşüt** | 4,000-8,000 TL | ✅ Mevcut | Modern UX, kolay kullanım |
| **QNB eSolutions** | 3,000-6,000 TL | ✅ Mevcut | Banka entegrasyonu |
| **Faturaport** | 2,500-5,500 TL | 🟡 API | En ekonomik |
| **Mikro Faturam** | 4,000-8,000 TL | ✅ Mevcut | Yaygın kullanım |
| **Turmob Luca** | 3,500-7,000 TL | ✅ Mevcut | Mali müşavir uyumu |

**Tavsiye:** **Logo İşbaşı** veya **Paraşüt** — DOSPRESSO'da Logo zaten var, native entegrasyon süreci hızlandırır.

**Kesin karar:** Mali müşavir + Aslan ile 3 entegratör demo sonrası.

---

## 📋 DOSPRESSO İçin İmplementasyon Planı

### Sprint 18 (Post-pilot — Haziran 2026, 2 hafta)

**Hedef:** Mali altyapı + entegratör seçimi + pilot test

| Adım | Sorumlu | Süre |
|---|---|---|
| 1. Mali müşavir görüşmesi (e-Fatura yükümlülük netleştirme) | Aslan | 1 gün |
| 2. 3 entegratör demo (Logo, Paraşüt, QNB) | Aslan + IT | 3 gün |
| 3. Mali mühür temini (Kamu SM veya TÜBİTAK) | Aslan | 5 gün (bürokrasi) |
| 4. e-İmza tedariği (yedek) | Aslan | 3 gün |
| 5. Entegratör sözleşmesi imzala | Aslan | 1 gün |
| 6. Test ortamı kurulum (1-2 deneme faturası) | IT + Entegratör | 3 gün |

### Sprint 19 (Haziran 2026, 2 hafta)

**Hedef:** DOSPRESSO platform entegrasyonu

| Adım | Tahmini Saat |
|---|---|
| 1. Backend: `/api/efatura/draft` endpoint (UBL-TR XML üretimi) | 16 saat |
| 2. Backend: `/api/efatura/send` endpoint (entegratör API) | 12 saat |
| 3. Backend: `/api/efatura/status` (gönderim durumu, response code) | 8 saat |
| 4. Schema: `e_invoices` tablosu (kayıt + audit trail) | 4 saat |
| 5. Schema: `customers` tablosu zenginleştirme (VKN/TCKN, vergi dairesi) | 6 saat |
| 6. Frontend: Fatura kesme ekranı (HQ + Fabrika kullanımı için) | 24 saat |
| 7. Frontend: Şube POS'tan otomatik e-Arşiv tetikleme | 16 saat |
| 8. Test + bug fix | 16 saat |

**Toplam:** ~102 saat (~13 iş günü)

### Sprint 20 (Haziran sonu — 1 Temmuz öncesi)

**Hedef:** Production geçiş + paralel çalışma

| Adım | Açıklama |
|---|---|
| 1. Pilot fatura: 10 adet manuel test | Logo + DOSPRESSO + entegratör birlikte |
| 2. Personel eğitim (HQ muhasebe + 25 şube müdürü) | 1 hafta video + canlı eğitim |
| 3. Paralel dönem (1-15 Haziran): hem kağıt hem dijital | Hata yakalama |
| 4. **15 Haziran: Tam geçiş**, kağıt SADECE acil durum | 2 hafta erken |
| 5. **1 Temmuz: Yasal zorunluluk başlar** ✓ | Sıkıntısız |

### Sprint 21 (Temmuz 2026)

**Hedef:** e-Defter entegrasyonu (e-Fatura'ya geçen mükellef için zorunlu)

> 577 sıra no.lu VUK Tebliği: Bilanço esasına göre defter tutan + e-Fatura'ya geçen mükellef → e-Defter zorunlu

| Adım | Süre |
|---|---|
| 1. Mali müşavir e-Defter modülü hazırlık | Sürekli |
| 2. Logo'dan otomatik e-Defter export | Logo ayarı |
| 3. Aylık berat yükleme süreci (3. ayın sonuna kadar) | Aylık |

---

## 🤖 Mr. Dobody — e-Fatura Otomasyonu (Sprint 22+)

### Akıllı Hatırlatmalar

```
Mr. Dobody → Aslan/Muhasebe:

🔔 Günlük 22:00 - Şube günsonu
"Bugün 25 şube z-rapor:
✅ 23 şube tamamlandı
🟡 2 şube eksik: Lara (#8), Kepez (#15)
🚨 Bekleyen e-Arşiv: 3 fatura 3,000 TL üzeri"

🔔 Aylık 27. gün
"Bu ay e-Defter berat yükleme: 3 gün kaldı.
Logo'dan dosya hazır mı? [Kontrol Et]"

🔔 Yıllık (1 Mart)
"2025 hesap dönemi bitti.
Brüt ciro: 47,300,000 TL
e-Fatura limit aşımı: ✅ EVET (zaten geçiş yapıldı)
GİB entegratör raporu: [İndir]"
```

### Otomatik İşlemler

1. **B2B müşteri tespit:** Müşteri VKN'sini sisteme girince → otomatik GİB e-fatura mükellef sorgusu → e-Fatura mı, e-Arşiv mi karar
2. **Faturada hata tespiti:** Fatura kesildiği anda KDV hesabı, vergi dilimi otomatik kontrol
3. **Geç ödeme uyarısı:** Vadesi geçmiş B2B fatura → müşteriye otomatik mail
4. **Aylık özet:** Mali müşavire her ayın 1'inde otomatik e-Defter hazır rapor

---

## 💰 Maliyet Tahmini

### Tek Seferlik Maliyetler

| Kalem | Tahmini |
|---|---|
| Mali mühür (3 yıl) | 1,500 TL |
| e-İmza (yedek, 3 yıl) | 800 TL |
| Entegratör kurulum | 5,000-15,000 TL |
| DOSPRESSO platform geliştirme (Sprint 19) | 102 saat × ~750 TL = 76,500 TL |
| **Toplam** | **~85,000-95,000 TL** |

### Yıllık Tekrarlayan Maliyetler

| Kalem | Tahmini |
|---|---|
| Entegratör aylık ücret (Logo İşbaşı tahmini) | 5,000 × 12 = 60,000 TL |
| Mali mühür yenileme (3 yılda 1) | ~500 TL/yıl |
| Mali müşavir e-Defter ek ücret | ~12,000 TL/yıl |
| **Yıllık toplam** | **~72,500 TL** |

### ROI

- **Manuel veri girişi tasarrufu:** 25 şube × 1 saat/gün × 365 gün × 100 TL/saat = **912,500 TL/yıl**
- **Hata azaltma:** %5 hata oranı → %0.5 → ~50,000 TL/yıl tasarruf
- **Ceza riski sıfırlama:** Olası 675,000 TL ceza bertaraf
- **Net kazanç (Y1):** ~880,000 TL tasarruf − 95,000 TL kurulum = **+785,000 TL**

---

## 🚦 Risk Matrisi

| Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|
| Entegratör seçimi gecikme (1 Temmuz kaçırma) | Orta | 🔴 Çok Yüksek | Haziran başında karar (8 hafta önce) |
| Mali mühür bürokrasi | Düşük | 🟡 Orta | Erken başvuru (Mayıs sonu) |
| 25 şube personel eğitim eksikliği | Yüksek | 🟡 Orta | Video eğitim + Mr. Dobody onboarding |
| Logo entegrasyon teknik problem | Orta | 🟡 Orta | Paralel dönem 2 hafta |
| B2B müşteri VKN listesi eksiklik | Yüksek | 🟢 Düşük | İlk 3 ay aktif veri toplama |
| Yasal değişiklik (limit düşürme) | Düşük | 🟢 Düşük | Mali müşavir takibi + Mr. Dobody crawler |

---

## ✅ Aslan'ın Onay Noktaları

Bu planın aktif olabilmesi için Aslan'ın onayı bekleyenler:

- [ ] **Mali müşavirimiz e-Fatura geçiş plan/maliyet için randevu** (Mayıs-Haziran)
- [ ] **3 entegratör demo karar** (Sprint 18'de)
- [ ] **Bütçe onayı:** ~95,000 TL kurulum + 72,500 TL/yıl
- [ ] **Geçiş tarihi:** 15 Haziran (yasal limit 1 Temmuz, 2 hafta erken)
- [ ] **Mr. Dobody otomasyonu önceliği:** Sprint 22+ olarak kabul

---

## 📅 Yol Haritası Özeti

```
Mayıs 2026 (şu an):       Pilot hazırlık + bu plan onayı
Haziran 1-7:              Mali müşavir + 3 entegratör demo
Haziran 8-14:             Entegratör sözleşme + mali mühür
Haziran 15-21:            DOSPRESSO platform geliştirme (Sprint 19)
Haziran 22-30:            Test + paralel dönem
🚨 1 Temmuz 2026:         YASAL ZORUNLULUK BAŞLAR
Temmuz-Eylül:             e-Defter entegrasyonu (Sprint 21)
Ekim+:                    Mr. Dobody otomasyonu (Sprint 22+)
```

---

## 📚 Kaynaklar

1. **GİB Resmi Site:** https://ebelge.gib.gov.tr
2. **589 sıra no.lu VUK Genel Tebliği** (31.12.2025 RG)
3. **509 sıra no.lu VUK Genel Tebliği** (19.10.2019 RG — ana çerçeve)
4. **Logo İşbaşı:** https://www.logo.com.tr
5. **Paraşüt:** https://www.parasut.com
6. **GİB Mükellef Sorgu:** https://efatura.gov.tr/EFaturaMukellef.aspx (B2B müşteri tespiti)

---

**Hazırlayan:** Claude (Sprint 12 P-20 — post-pilot e-Fatura geçiş planı)
**Tarih:** 6 May 2026, 23:50
**Onay bekleyen:** Aslan (bütçe + entegratör seçim) + Mali Müşavir
**Yasal son tarih:** 1 Temmuz 2026 (cezai yaptırım: belge tutarının %10'u)
**Önerilen geçiş tarihi:** 15 Haziran 2026 (2 hafta tampon)
**Tahmini ROI Y1:** +785,000 TL net kazanç
