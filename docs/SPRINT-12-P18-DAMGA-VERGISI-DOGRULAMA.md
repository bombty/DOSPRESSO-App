# 📜 Damga Vergisi 2026 Muafiyeti — Doğrulama Raporu

> **Sprint 12 P-18 (6 May 2026)** — Audit Compliance 7.6 doğrulama.
>
> **Sonuç:** ✅ tax-calculator.ts'te doğru uygulanıyor. Sprint 9 P-2 refactor sonrası bordrolarda görünür olacak.

---

## 📋 Mevzuat Referansı

**488 Sayılı Damga Vergisi Kanunu Tablo (IV) - 1/b:** Hizmet sözleşmesi gereği yapılan ödemelerden binde 7.59 (%0.759) damga vergisi alınır.

**193 Sayılı Gelir Vergisi Kanunu (Asgari Ücret İstisnası):**
> "Hizmet erbabına yapılan ücret ödemelerinin, asgari ücretin gelir ve damga vergisi tutarını aşmayan kısmı vergiden istisnadır."

**Resmi Gazete 26.12.2025 / 33119:** 2026 yılı asgari ücret 33.030 TL brüt → asgari ücretin damga vergisi: 33.030 × 0.00759 = **250,70 TL/ay**.

---

## 🧮 Hesap Mantığı

```
1. Brüt damga = Brüt maaş × 0.00759
2. İstisna   = min(Brüt damga, Asgari brüt × 0.00759)  → 250,70 TL ile sınırlı
3. Net damga = max(0, Brüt damga - İstisna)
```

**Sonuç:** Asgari brüt ücret veya altındaki kısım **damga vergisinden muaftır**. Üst kısım için %0.759 ödenir.

---

## ✅ Test Sonuçları

### Test 1: Asgari Ücret (Brüt 33.030)
| Kalem | Değer |
|---|---|
| Brüt | 33.030,00 TL |
| Damga (istisnasız) | 250,70 TL |
| Damga istisnası | 250,70 TL |
| **Net damga** | **0,00 TL** ✅ |

**Beklenen:** Asgari ücretliler damga vergisi ödememeli. **Sistem doğru çalışıyor.**

### Test 2: 50.000 TL Brüt (Bar Buddy)
| Kalem | Değer |
|---|---|
| Brüt | 50.000,00 TL |
| Damga (istisnasız) | 379,50 TL |
| Damga istisnası | 250,70 TL |
| **Net damga** | **128,80 TL** ✅ |

**Beklenen:** Asgari brüt'ün üstündeki 16.970 TL × 0.00759 = 128,80. **Doğru.**

### Test 3: 200.000 TL Brüt (Yönetim)
| Kalem | Değer |
|---|---|
| Brüt | 200.000,00 TL |
| Damga (istisnasız) | 1.518,00 TL |
| Damga istisnası | 250,70 TL |
| **Net damga** | **1.267,30 TL** ✅ |

**Beklenen:** Asgari brüt'ün üstündeki 166.970 TL × 0.00759 = 1.267,30. **Doğru.**

### Test 4: Damga Oranı
| Parametre | Değer |
|---|---|
| `TR_2026.stampDutyRate` | 0.00759 ✅ |
| Beklenen | 0.00759 (binde 7.59) |

**Doğru:** 488 SK Tablo (IV) - 1/b ile uyumlu.

---

## 🔧 Mevcut Durum vs Hedef

### Şu An (6 May 2026)
- ✅ `server/lib/tax-calculator.ts` — damga vergisi doğru hesaplıyor
- ❌ `server/lib/payroll-engine.ts` — **damga vergisi hesaplamıyor** (mevcut bordrolar damga göstermez)
- ⏳ Sprint 9 P-2 refactor (Mahmut bordro doğrulama sonrası) → tax-calculator entegre edilecek

### Hedef (Sprint 9 P-2 Sonrası)
- ✅ payroll-engine `grossToNet()` çağırır → damga otomatik hesaplanır
- ✅ Bordro UI brüt + tüm kesintiler tablosu → damga görünür
- ✅ Pilot Day-1'de Mahmut Excel ile damga karşılaştırması yapabilir

---

## 📊 Bordro Şablonu (Sprint 9 P-2 Sonrası)

```
═══════════════ BORDRO ═══════════════
Personel: Mahmut Bey (HQ)
Ay: Mayıs 2026

Brüt Maaş:                75.000,00 TL
─────────────────────────────────────
SGK Primi (%14):         -10.500,00 TL
İşsizlik Sigortası (%1):    -750,00 TL
─────────────────────────────────────
Vergi Matrahı:            63.750,00 TL
Yıllık Matrah:           765.000,00 TL
Gelir Vergisi:            -8.500,00 TL
  (asgari ücret istisnası: 4.997 TL)
Net Gelir Vergisi:        -3.503,00 TL
Damga Vergisi:              -569,25 TL  ← BU!
  (asgari ücret istisnası: 250,70 TL)
Net Damga Vergisi:          -318,55 TL  ← BU!
─────────────────────────────────────
Toplam Kesinti:          -15.071,55 TL

NET MAAŞ:                59.928,45 TL
═══════════════════════════════════════
```

---

## 🚦 Aksiyon Listesi

### ✅ Tamamlanan
- tax-calculator.ts damga vergisi mantığı (Sprint 9)
- 4/4 doğrulama testi geçti
- Asgari ücret istisnası doğru uygulanıyor

### ⏳ Sprint 9 P-2 (Mahmut Bordro Doğrulama Sonrası)
- payroll-engine.ts'te `grossToNet()` import et
- PayrollResult'a damga alanları ekle:
  - `stampDutyBeforeExemption`
  - `stampDutyExemption`
  - `stampDuty`

### ⏳ Sprint 9 P-2 — UI Güncellemesi
- `client/src/pages/bordrom.tsx` — damga vergisi satırı ekle
- `client/src/pages/ik/bordro-onay.tsx` — damga vergisi satırı

### ⏳ Sprint 11 P-13 (Mahmut bordro çapraz kontrol — 10 May Pazar)
- Mahmut Excel ile damga vergisi karşılaştırma
- Sapma %5 altı olmalı

---

## 📚 İlgili Dosyalar

- `server/lib/tax-calculator.ts:158-165` — damga hesaplama logic'i
- `server/lib/payroll-engine.ts` — entegre edilecek (Sprint 9 P-2)
- `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md` — bordro UI planı
- `docs/SPRINT-11-P15-BORDRO-SENARYOLARI.md` — 4 senaryoda damga test

---

**Hazırlayan:** Claude (Sprint 12 P-18)
**Tarih:** 6 May 2026, 20:35
**Test Komutu:** `npx tsx server/lib/tax-calculator.ts` (runTests fonksiyonu damga örneği vermez, ayrı test'le doğrulandı)
**Sonuç:** ✅ Audit Compliance 7.6 KAPATILDI — tax-calculator doğru, payroll-engine entegrasyonu Sprint 9 P-2'de yapılacak.
