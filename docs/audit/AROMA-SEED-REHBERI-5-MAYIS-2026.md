# 🌸 AROMA COMPATIBILITY SEED REHBERİ — 5 MAYIS 2026

> **Hedef Okuyucu:** Aslan + HQ Coach ekibi (Yavuz, Ece, vb.)
> **Süre:** 4-8 saat (8 template reçete × 4-8 aroma)
> **Kod:** Yok — sadece data entry
> **UI:** Hazır (`/branch-recipes/admin/recipe/:id/duzenle` → Aromalar tab)

---

## 🎯 NEDEN BU İŞ?

DOSPRESSO'da **template reçeteler** var (örn: "Meyveli Mojito") — tek bir reçete, **birden fazla meyve aromasıyla** servis edilir:
- Meyveli Mojito × **Mango** → "Mango Mojito"
- Meyveli Mojito × **Şeftali** → "Şeftali Mojito"
- Meyveli Mojito × **Pinkberry** → pazarlama adı: "Moulin Rouge"

**Sorun:** DB'de **32 aroma** ve **29 template reçete** var, ama **8 template için aroma compatibility seed eksik**. Pilot başlamadan önce her şube müdürünün hangi reçete + hangi aroma kombinasyonunu satabileceğini bilmesi gerek.

**Çözüm:** Bu rehber adımlarıyla 8 template'i 4-8 aroma ile eşleştir.

---

## 📋 ÖN HAZIRLIK

### 1. Yetkin var mı?
Erişim için rol: **`admin`, `ceo`, `cgo`, `coach`, `trainer`** (HQ_EDIT_ROLES)

Eğer Aslan, Yavuz veya Ece bu rolden değilse Aslan ona geçici trainer rolü ver:
```sql
UPDATE users SET role = 'coach' WHERE username = 'yavuz';
-- Pilot sonrası geri al
```

### 2. Eksik 8 Template'i Bul
**URL:** `/branch-recipes/admin`

**Filtre:**
- Tip: Template
- Aroma sayısı: 0 (filtrelenebilirse)

Veya Replit Agent'a sor:
```sql
SELECT br.id, br.name, COUNT(brac.id) AS aroma_count
FROM branch_recipes br
LEFT JOIN branch_recipe_aroma_compatibility brac ON brac.recipe_id = br.id
WHERE br.is_template = true
GROUP BY br.id, br.name
HAVING COUNT(brac.id) = 0
ORDER BY br.name;
-- Beklenen: 8 satır (eksikler)
```

### 3. 32 Aroma'yı Hatırla
**Kategoriler:**
- 🍓 **Fruit** (meyve): Mango, Şeftali, Pinkberry, Blueberry, Lime, Çilek, Kavun, Karpuz, ...
- 🌿 **Herbal** (otsu): Mint (nane), Tarçın, Vanilya, Lavanta, ...
- 🥛 **Dairy** (sütlü): Vanilya kreması, Karamel sosu, ...
- 🍯 **Sweet** (tatlı): Karamel, Çikolata, Hindistan cevizi, ...

UI'da kategori bazlı dropdown gösterilir.

---

## 🎯 AKIŞ — Her Template İçin 5 Adım

### ADIM 1: Reçete Editörünü Aç

```
URL: /branch-recipes/admin/recipe/{recipeId}/duzenle
```

**3 tab:**
1. Malzemeler
2. Adımlar
3. **Aromalar** ← bu tab'a tıkla

### ADIM 2: Mevcut Aromalar Listesi

Boş bir liste görüyorsun (henüz seed yok). Üstte:
- "Yeni Aroma Ekle" butonu
- Slot seçici (primary / primary_fruit / secondary_fruit)

### ADIM 3: Slot Bazlı Ekleme

**Slot türleri:**

| Slot | Açıklama | Örnek |
|---|---|---|
| `primary` | Tek aromalı reçete (örn: kahve) | Espresso × Vanilya |
| `primary_fruit` | İki aromalı reçetenin **ana** meyvesi | Meyveli Mojito × Mango (primary) + Pinkberry (secondary) |
| `secondary_fruit` | İki aromalı reçetenin **ikinci** meyvesi | Yukarıdaki örnek |

**Çoğu meyveli mojito + smoothie için:** `primary_fruit` slot'u kullan.

### ADIM 4: Her Aroma İçin Bilgi Doldur

Her aroma satırı için:
- ✅ **Aroma seç** (dropdown — 32 seçenek)
- ✅ **Slot** (primary / primary_fruit / secondary_fruit)
- ⚪ **Override Pump Massivo** (boş bırak — reçetenin varsayılanı kullanılır)
- ⚪ **Override Pump Long Diva** (boş bırak)
- ⚪ **Display Name Override** (özel pazarlama adı varsa, örn: "Moulin Rouge")
- ✅ **Varsayılan mı?** (1 tane "default" işaretle, UI'da önce gösterilir)

### ADIM 5: Kaydet

"Tümünü Kaydet" butonuna bas. Toast: "Aromalar kaydedildi" ✅

DB kontrolü:
```sql
SELECT brac.id, br.name AS recipe, bao.name AS aroma, brac.slot_name, brac.is_default
FROM branch_recipe_aroma_compatibility brac
JOIN branch_recipes br ON br.id = brac.recipe_id
JOIN branch_aroma_options bao ON bao.id = brac.aroma_id
WHERE br.id = {recipeId}
ORDER BY brac.is_default DESC, bao.name;
```

---

## 📋 8 ÖNERİLEN TEMPLATE × AROMA KOMBİNASYONLARI

> **Not:** Bu öneriler. Aslan + HQ Coach ekibi pazarlama stratejisine göre değiştirebilir.

### 1. Meyveli Mojito (referans: id=16, zaten 5 aroma var)
- Mango ⭐ (default), Şeftali, Pinkberry (Moulin Rouge), Blueberry, Lime
- **Slot:** primary_fruit
- **Hedef satış:** Yaz aylarının taze içeceği

### 2. Meyveli Smoothie
- Mango ⭐, Şeftali, Çilek, Kavun
- **Slot:** primary_fruit
- **Mevsim:** Yaz

### 3. Frappuccino (Kahveli)
- Vanilya ⭐, Karamel, Çikolata, Hindistan cevizi
- **Slot:** primary
- **Mevsim:** Tüm yıl

### 4. Iced Tea (Soğuk Çay)
- Şeftali ⭐, Mango, Karpuz, Lime
- **Slot:** primary_fruit
- **Mevsim:** Yaz

### 5. Lemonade (Limonata)
- Klasik (sade) ⭐, Çilek, Karpuz, Mint
- **Slot:** primary_fruit / herbal
- **Mevsim:** Yaz

### 6. Hot Chocolate (Sıcak Çikolata)
- Klasik ⭐, Karamel, Tarçın, Hindistan cevizi
- **Slot:** primary
- **Mevsim:** Kış

### 7. Latte (Sütlü Kahve)
- Klasik ⭐, Vanilya, Karamel, Hindistan cevizi, Lavanta
- **Slot:** primary
- **Mevsim:** Tüm yıl

### 8. Affogato (Dondurma + Espresso)
- Vanilya ⭐, Çikolata, Karamel
- **Slot:** primary
- **Mevsim:** Yaz

---

## ⚠️ DİKKAT EDİLECEKLER

### ✅ Yapılması gerekenler
- Her template için **en az 1 default** aroma işaretle (UI'da önce gösterilir)
- Slot **doğru seç** — primary_fruit yerine secondary_fruit yazarsan UI yanlış sıralar
- Display name override sadece **özel pazarlama adı** varsa kullan
- Pump miktarı **boş bırak** — reçetenin baz değeri kullanılır

### ❌ Yapma!
- **Aynı aroma + slot kombinasyonunu tekrar ekleme** → Unique constraint engelliyor zaten
- **Reçete'nin asıl malzemelerini değiştirme** — sadece aroma compatibility ekle
- **Pilot şubelere özel** kombinasyon yapma — global olsun, tüm şubeler aynı görsün

### 🔄 Düzenleme Sonrası
Aroma kaydettikten sonra:
1. Public ürün listesinde görünür: `/branch-recipes` (rol: barista, sef)
2. Şube müdürü "günün özelleri" olarak ön plana çıkarabilir
3. POS sisteminde yeni ürün olarak görünür (otomatik)

---

## 🎯 İLERLEMEYİ TAKİP

| # | Template | Aroma Sayısı | Default | Tamamlandı? |
|---|---|---|---|---|
| 1 | Meyveli Mojito | 5 (zaten var) | Mango | ✅ |
| 2 | Meyveli Smoothie | _ | _ | ☐ |
| 3 | Frappuccino | _ | _ | ☐ |
| 4 | Iced Tea | _ | _ | ☐ |
| 5 | Lemonade | _ | _ | ☐ |
| 6 | Hot Chocolate | _ | _ | ☐ |
| 7 | Latte | _ | _ | ☐ |
| 8 | Affogato | _ | _ | ☐ |

---

## 🚀 PILOT BAŞARI KRİTERLERİ

Pilot başlamadan önce:
- [ ] 8 template için aroma seed tamamlandı
- [ ] Her template için en az 4 kombinasyon
- [ ] Her template için 1 default
- [ ] DB toplam: 32+ aroma compat satırı (8 template × 4 ortalama)

Pilot Day-1 (12 May):
- [ ] Şube müdürleri "Günün özelleri" listesinde 5+ varyasyon görüyor
- [ ] Barista QR ile reçete açtığında aroma seçenekleri çıkıyor
- [ ] Mr.Dobody Recipe Finder skill bu kombinasyonları öneriyor

---

## 📱 MOBİL DOSTU UI (Mobil iPad'den de yapılabilir)

Aslan iPad'den çalışıyorsa:
- Sayfa responsive
- Aroma seçici grid (3 sütun mobil, 5 sütun desktop)
- Save butonu sticky bottom (kayıt sırasında scroll lazım değil)
- Toast notification ekran üstünde

iPad ile **8 template × 5 aroma = 40 satır data entry** = ortalama **2-3 saat** sürer.

---

## 🆘 SORUN ÇIKARSA

### "HQ_EDIT yetkisi yok" hatası
→ Aslan rolünü kontrol et, gerekirse temporary `coach` rol ata

### Toast: "Aroma daha önce eklendi"
→ DB'de aynı reçete + aroma + slot var. Düzenle veya farklı slot kullan.

### Display Name override görünmüyor
→ Sadece **detail page**'de görünür (örn: `/branch-recipes/16` → Mango Mojito kartında "Moulin Rouge" alt başlık)

### Replit'e ne sormalıyım?
- "Aroma seed sayısını kontrol et: kaç template'te 4+ aroma var?"
- "Hangi aroma kategorileri eksik? Yaz için Çilek, Karpuz var mı?"
- "Template-aroma kombinasyonu olmadan satılan ürün varsa kontrol et"

---

## 🔗 İLGİLİ DOSYALAR / ENDPOİNT'LER

- `client/src/pages/branch-recipes/recipe-editor.tsx` — Reçete editörü (Aromalar tab)
- `server/routes/branch-recipes.ts` — Aroma endpoint'leri (5 adet)
- `shared/schema/schema-24-branch-recipes.ts` — `branchAromaOptions` + `branchRecipeAromaCompatibility`
- API endpoint'leri:
  - `GET /api/aroma-options` (kategori bazlı)
  - `GET /api/branch-recipes/:id/aroma-options` (slot bazlı)
  - `PUT /api/branch-recipes/:id/aroma-compatibility` (replace-all)
  - `POST /api/aroma-options` (yeni aroma)
  - `PATCH /api/aroma-options/:id` (güncelle/pasif)

---

## 💼 PILOT SONRASI

Aroma seed tamamlandığında:
- 12 May'da pilot şubeler ürün çeşitlendirmesi yapabilir
- 1-2 hafta sonra hangi kombinasyonlar **en çok satılıyor** veri toplanır
- Bu veriden `Mr.Dobody recipe_finder` skill'i otomatik öneri yapar
- Düşük performanslı kombinasyonlar `is_active=false` ile gizlenir
