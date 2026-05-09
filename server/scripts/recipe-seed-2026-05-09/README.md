# Reçete Seed — Aslan'ın 9 Reçetesi (9 May 2026)

## 📋 İçerik

Aslan'ın WhatsApp/Claude.ai üzerinden gönderdiği reçeteler:

### Pilot için 5 ürün (4 hazır, 1 eksik)

| Reçete | Sistem Adı | Malzeme Sayısı | Durum |
|---|---|---|---|
| Donut Formül | Donut Base Hamuru | 28 | ✅ Hazır |
| Beyaz Cinnaboom | Cinnaboom Classic | 27 | ✅ Hazır |
| Siyah Cinnaboom | Cinnaboom Brownie | 30 | ✅ Hazır |
| Cheesecake | Cheesecake Base | 7 | ✅ Hazır |
| **San Sebastian** | **San Sebastian** | **0** | **❌ EKSİK — Aslan göndermedi** |

### Bonus 5 reçete (Aslan ekstra gönderdi)

| Reçete | Sistem Adı | Malzeme Sayısı |
|---|---|---|
| Oreo Reçete (PDF) | Oreo Cheesecake | 9 |
| Sıcak Çikolata | Chocolate Powder | 11 |
| Creamcie Toz Karışımı | Creambase Powder | 3 |
| Bomtylatte Tozu | Bombty Latte Powder | 3 |
| Golden Latte | Golden Latte Powder (yeni) | 9 |

**Toplam:** 9 reçete, ~127 malzeme satırı

---

## 🚀 Çalıştırma (Replit Shell)

### Adım 1: Önce DRY RUN (DB'ye dokunmadan rapor al)

```bash
cd ~/workspace
git pull origin main
npx tsx server/scripts/recipe-seed-2026-05-09/run-seed.ts --dry-run --verbose
```

**Çıktı:** Her malzeme için inventory'de eşleşme var mı, yok mu raporlar. **DB değişmez.**

### Adım 2: Gözden Geçir

- `seed-result.json` dosyasını incele
- Eşleşme oranlarına bak:
  - **%80+ exact** → güzel, çalıştır
  - **%50-80** → manuel kontrol et, gerekirse `recipes-data.ts`'i düzelt
  - **<%50** → çoğu hammadde inventory'de yok, önce `inventory` doldurulmalı

### Adım 3: CANLI Çalıştır

```bash
npx tsx server/scripts/recipe-seed-2026-05-09/run-seed.ts --verbose
```

**DB güncellenir:**
- `factory_recipe_ingredients`'e malzemeler eklenir
- Eşleşmeyen hammaddeler `inventory`'ye **PASİF** olarak eklenir (Sema sonra kontrol edecek)

---

## ⚠️ Bilinen Eksikler ve Sorular

Aslan'ın doğrulaması gereken bilgiler:

1. **San Sebastian reçetesi YOK** — Aslan ayrıca gönderecek
2. **Donut Formül'de "yağ: 3100 g"** — Margarin Alba mı, başka bir yağ mı?
3. **PST = ?** (4 reçetede geçiyor, kısaltma açıklanmadı)
4. **Yumurta birim:** Oreo'da "20 ADET" — 1 yumurta 50g varsayıldı (L boy standart)
5. **Oreo Cheesecake mı, Oreo Cookie mu?** — PDF "OREO REÇETE" dedi sadece

---

## 🔄 Tekrar Çalıştırma

Script **idempotent** — reçetede zaten malzeme varsa SKIP eder.
Üzerine yazmak için önce manuel sil:

```sql
-- Sadece test için, dikkat!
DELETE FROM factory_recipe_ingredients WHERE recipe_id = (
  SELECT id FROM factory_recipes WHERE name = 'Donut Base Hamuru'
);
```

Sonra tekrar çalıştır.

---

## 📊 Beklenen Sonuç

Başarılı çalıştırma sonunda:

```
═══════════════════════════════════════
ÖZET
═══════════════════════════════════════
Toplam reçete:        9
Toplam malzeme:       127
✅ Exact eşleşme:     80 (~63%)   ← Tahmini, gerçek farklı olabilir
🔶 Partial eşleşme:   30 (~24%)
🆕 Yeni hammadde:     17 (~13%)   ← Sema kontrol etmeli
```

---

## 🎯 Sonraki Adım (Otomatik)

Reçete malzemeleri eklendikten sonra Sema (gida_muhendisi) sayfasında:

1. **Reçete detay** → "Besin Değerleri Hesapla" tıkla
   → PR #59'daki 4 katmanlı sistem inventory'den otomatik hesaplar
2. **Gramaj Onayı** ver
   → PR #59'daki auto-label çalışır → tgkLabels'a taslak etiket
3. **Etiket Bas** tıkla → PDF üretir

Pilot 12 May Pazartesi 10:00'a hazır.

---

## 📂 Dosya Yapısı

```
server/scripts/recipe-seed-2026-05-09/
├── README.md            ← bu dosya
├── recipes-data.ts      ← 9 reçete TypeScript array (insan okur)
├── run-seed.ts          ← Çalıştırma script'i
└── seed-result.json     ← Çıktı (script çalıştıktan sonra oluşur)
```
