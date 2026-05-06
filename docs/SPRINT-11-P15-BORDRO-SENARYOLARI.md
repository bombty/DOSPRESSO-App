# 💰 4 Kritik Bordro Senaryosu (Sprint 11 P-15)

> **Pilot Day-1 öncesi (9-10 May)** Mahmut Bey ile birlikte koşulacak test prosedürleri.
>
> **Hedef:** Sistem Excel ile %95+ uyum. Sapma varsa pilot ertelenir.

**Tarih:** 6 May 2026
**Sahibi:** Claude (yazar) + Aslan (test koordinatörü) + Mahmut (muhasebe)
**Ön Koşul:** Sprint 9 (tax-calculator + payroll-engine refactor) bitmiş olmalı

---

## 📋 Senaryo Özeti

| # | Senaryo | Lokasyon | Personel | Hedef |
|---|---|---|---|---|
| 1 | Stajyer NET 33.000 → bordro çıkış | Lara #8 | Yeni stajyer (kurgusal) | Net+brüt+kesinti tabloları |
| 2 | Tam ay çalışan supervisor → bordro | Lara #8 | Berkan veya benzeri (49.000 NET) | Eksiksiz hesaplama |
| 3 | 2 gün izinli + 1 gün eksik → bordro | Işıklar #5 | Bar buddy (36.000 NET) | İzin kesintisi formülü |
| 4 | FM (fazla mesai) + tatil çalışması → bordro | HQ #23 | Mahmut veya yardımcı (49.000+ NET) | FM oranı + tatil katsayısı |

---

## ✅ Genel Test Prosedürü (her senaryo için)

1. Sistem üzerinden bordro hesapla (`/ik-merkezi` → bordro üret)
2. Mahmut Bey Excel ile aynı parametreler kullanarak hesapla
3. **Karşılaştırma tablosu** doldur (aşağıda her senaryo için)
4. Sapma toleransı:
   - 0-1 TL: ✅ Yuvarlama, OK
   - 2-100 TL: 🟡 İncele (vergi dilim sınırı, asgari ücret istisnası gibi)
   - 100+ TL: 🔴 BUG, pilot ertele

---

## 🎯 Senaryo 1: Stajyer NET 33.000 → Bordro Çıkış

**Amaç:** D-40 v2 (NET maaş) sisteminin doğru çalıştığını ispatla.

**Test Parametreleri:**
- NET maaş: 33.000 TL (Lara duyurusu, 24.11.2025)
- Pozisyon: Stajyer (intern)
- Lokasyon: Lara #8
- Ay: Mayıs 2026
- Çalışma günü: 30/30 (tam ay)
- İzin/eksik gün: 0
- FM: 0
- Tatil çalışması: 0

**Sistem Beklenen Çıktı (tax-calculator.ts):**

| Kalem | Değer (TL) |
|---|---|
| Brüt maaş | 41.064,64 |
| SGK %14 | -5.749,05 |
| İşsizlik %1 | -410,65 |
| Toplam SGK | -6.159,70 |
| Vergi matrahı | 34.904,94 |
| Yıllık matrah | 418.859,28 |
| Gelir vergisi (istisnasız) | ~7.500 |
| Asgari ücret istisnası | ~5.000 |
| Net gelir vergisi | ~2.500 |
| Damga vergisi (istisnasız) | 311,68 |
| Damga istisnası | 250,70 |
| Net damga vergisi | ~61 |
| **NET maaş (final)** | **33.000,00** |

**Mahmut Bey Excel Çıktısı:**

| Kalem | Değer (TL) | Sapma |
|---|---|---|
| Brüt maaş | _____ | _____ |
| SGK | _____ | _____ |
| Gelir vergisi | _____ | _____ |
| Damga vergisi | _____ | _____ |
| **NET maaş** | _____ | _____ |

**Beklenen sonuç:** Net 33.000 = Net 33.000 (sapma 0)

**Riskler:**
- Mahmut Excel'inde AGİ uygulanıyor (kalktı 2022, ama bazı muhasebeciler hâlâ kullanır) → brüt farklı çıkar
- Eski 2025 vergi parametreleri Excel'de kalmış → brüt farklı çıkar
- Asgari ücret istisnası uygulanmamış → vergi yüksek, net düşük

---

## 🎯 Senaryo 2: Tam Ay Supervisor → Bordro

**Amaç:** Üst dilim (49.000 NET) için cumulative gelir vergisi hesabı doğru mu?

**Test Parametreleri:**
- NET maaş: 49.000 TL
- Pozisyon: Supervisor
- Lokasyon: Lara #8
- Ay: Mayıs 2026
- Çalışma günü: 30/30
- Bonus: 0 (default)

**Sistem Beklenen Çıktı:**

| Kalem | Değer (TL) |
|---|---|
| Brüt maaş | 67.169,60 |
| SGK %14 | -9.403,74 |
| İşsizlik %1 | -671,70 |
| Toplam SGK | -10.075,44 |
| Vergi matrahı | 57.094,16 |
| Yıllık matrah | 685.129,92 |
| Gelir vergisi (cumulative dilim hesabı) | ~7.700 |
| Asgari ücret istisnası | ~5.000 |
| Net gelir vergisi | ~2.700 |
| Damga vergisi (net) | ~259 |
| **NET maaş (final)** | **49.000,00** |

**NOT:** Bu senaryoda yıllık matrah 685K TL → %27 vergi diliminde. tax-calculator.ts cumulative hesabı doğru yapmalı:
- 0-158K: %15 = 23.700
- 158-330K: %20 = 34.400
- 330-685K: %27 = 95.880 (kümülatif sınır 1.2M altında)

**Mahmut Excel Karşılaştırma:**

| Kalem | Sistem | Excel | Sapma |
|---|---|---|---|
| Brüt | 67.169,60 | _____ | _____ |
| Net | 49.000,00 | _____ | _____ |

**Risk:** Cumulative dilim sınırlarında 1-2 TL fark olabilir. Tolerance: ±50 TL.

---

## 🎯 Senaryo 3: 2 Gün İzinli + 1 Gün Eksik

**Amaç:** PDKS sınıflandırması (eksik gün, izin) bordroya doğru yansıyor mu?

**Test Parametreleri:**
- NET maaş: 36.000 TL (Bar Buddy)
- Pozisyon: Bar Buddy
- Lokasyon: Işıklar #5
- Ay: Mayıs 2026 (31 gün)
- Çalışma günü: 28/31 (3 gün eksik)
- İzin (ücretli): 2 gün
- Eksik (ücretsiz): 1 gün
- FM: 0

**Sistem Beklenen Hesaplama (İş Kanunu Md.49):**

| Kalem | Hesap | Değer (TL) |
|---|---|---|
| NET maaş | Tam ay | 36.000 |
| Günlük ücret (NET) | 36.000 / 30 | 1.200 |
| 1 gün eksik kesintisi | -1 × 1.200 | -1.200 |
| 2 gün izin (ücretli) | 0 | 0 |
| **Düzeltilmiş NET** | 36.000 - 1.200 | **34.800** |
| Bu NET için BRÜT (tax-calculator) | netToGross(34.800) | ~44.450 |

**Önemli:** İzin ücreti SGK'ya girer, brüt etkilenir (ama negatif değil). 1 gün eksik **net'ten** düşülür (default: aylık maaş ÷ 30).

**Mahmut Excel Karşılaştırma:**

| Kalem | Sistem | Excel | Sapma |
|---|---|---|---|
| 1 gün eksik kesinti | 1.200 | _____ | _____ |
| Düzeltilmiş net | 34.800 | _____ | _____ |
| Brüt | _____ | _____ | _____ |

**Riskler:**
- Mahmut "30 gün" yerine "31 gün" bölen kullanıyor → günlük ücret farklı
- İzin gününü brüt'ten kesiyor (yanlış, ücretli izin) → daha düşük net
- 4857 SK Md.49 yorumlama farkı

---

## 🎯 Senaryo 4: FM + Tatil Çalışması

**Amaç:** Fazla mesai katsayısı (%50) + resmi tatil çalışması (%100) doğru hesaplanıyor mu?

**Test Parametreleri:**
- NET maaş: 49.000 TL (Supervisor)
- Pozisyon: Supervisor
- Lokasyon: HQ #23
- Ay: Mayıs 2026
- Standart çalışma: 30/30 gün, 8 saat
- FM: 8 saat (1 gün × 8 saat fazladan)
- Tatil çalışması: 1 gün (8 saat) — 19 Mayıs Atatürk'ü Anma Bayramı

**Sistem Beklenen Hesaplama:**

| Kalem | Hesap | Değer (TL) |
|---|---|---|
| Saatlik NET ücret | 49.000 / (30 × 8) | 204,17 |
| FM saatlik ücret (×1.5) | 204,17 × 1.5 | 306,25 |
| FM toplam | 8 saat × 306,25 | 2.450 |
| Tatil çalışma saatlik (×2.0) | 204,17 × 2.0 | 408,33 |
| Tatil toplam | 8 saat × 408,33 | 3.266,67 |
| Ek ödeme (NET) | 2.450 + 3.266,67 | 5.716,67 |
| **Toplam NET** | 49.000 + 5.716,67 | **54.716,67** |
| Bu NET için BRÜT | netToGross(54.716,67) | ~75.240 |

**4857 SK Referansı:**
- Md.41: Fazla mesai = saatlik × 1.5 (zamlı)
- Md.47: Resmi tatil = saatlik × 2.0 (1 gün ücret + 1 gün zamlı = 2x)

**Mahmut Excel Karşılaştırma:**

| Kalem | Sistem | Excel | Sapma |
|---|---|---|---|
| FM toplam | 2.450 | _____ | _____ |
| Tatil toplam | 3.266,67 | _____ | _____ |
| Toplam NET | 54.716,67 | _____ | _____ |
| Brüt | _____ | _____ | _____ |

**Riskler:**
- FM katsayısı %50 ya da %25 (Mahmut config'de farklı olabilir)
- Tatil çalışması %100 ya da %150 (Mahmut farklı uygulayabilir)
- 1.5 vs 1.25 katsayı farkı %20 sapma yaratır

---

## 🚦 Senaryo Sonrası Karar Matrisi

| Senaryo Sapması | Karar |
|---|---|
| 4/4 senaryo ±50 TL içinde | ✅ Pilot 18 May'a hazır |
| 1-2 senaryo 100-500 TL sapma | 🟡 Mahmut'la formül netleştir, fix yap, pilot 18 May |
| 3+ senaryo 500+ TL sapma | 🔴 Sistem ya da Excel'de büyük hata, pilot 25 May'a ertele |
| Senaryo 1 (Stajyer) sapma | 🔴 D-40 v2 hata, hemen düzelt |

---

## 📅 Test Programı (8 May Cuma)

| Saat | İş |
|---|---|
| 14:00-14:30 | Aslan + Mahmut sistem ekranı + Excel açılır |
| 14:30-15:30 | Senaryo 1+2 (basit, tam ay) |
| 15:30-16:30 | Senaryo 3+4 (PDKS + FM, daha karmaşık) |
| 16:30-17:00 | Sapma analizi + karar |

---

## 🔗 İlgili Dosyalar

- `server/lib/tax-calculator.ts` (Sprint 9 — TR 2026 vergi)
- `server/lib/payroll-engine.ts` (Sprint 9 sonrası — refactor edilecek)
- `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md` (revizyon planı)
- `docs/DECIDED.md` D-40 v2 (NET maaş kararı)

---

**Hazırlayan:** Claude (claude.ai web/iPad)
**Tarih:** 6 May 2026, 18:45
**Versiyon:** v1.0 (Sprint 11 P-15 ön doküman, Cuma test günü revize edilecek)
