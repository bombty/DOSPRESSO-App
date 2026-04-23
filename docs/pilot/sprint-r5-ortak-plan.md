# Sprint R-5 ORTAK PLAN — Claude + Replit Sentezi

**Tarih:** 23 Nis 2026 21:30
**Pilot:** 28 Nis (4 gün 12 saat kaldı)
**Versiyon:** Plan B+ (6 saat — Replit'in önerisi, Claude'un üzerine)

---

## 🎯 Plan Değişikliği: Neden B+ ?

**Claude'un ilk planı (B, 7 saat):** Maliyet sistemini sıfırdan inşa et.

**Replit'in canlı DB keşfi:**
- Maliyet sistemi **zaten var** ve çalışıyor (12/27 reçete hesaplı)
- FK "yanlışı" aslında **bilinçli karar** (inventory daha zengin)
- Eksik olan **UI + 15 reçete recalc** + **alerjen yasal risk**

**Sonuç:** Altyapı tamam, eksik olan UI + 15 reçete + alerjen.

Yeni plan: **B+ (6 saat)** — altyapıya dokunma, UI'a bağla.

---

## 📋 Sprint R-5 B+ Kapsamı

### ALT SPRINT R-5A: UI Düzeltme (3 saat) — ŞART

**Hedef:** RGM + Sema reçeteyi tam düzenleyebilir.

**Backend (1 saat):**
- `PATCH /api/factory/recipes/:id/ingredients/:ingId` — VAR (test)
- `DELETE /api/factory/recipes/:id/ingredients/:ingId` — **YENİ**
- `PATCH /api/factory/recipes/:id/steps/:stepId` — **YENİ**
- `DELETE /api/factory/recipes/:id/steps/:stepId` — **YENİ**
- Yetki: `RECIPE_EDIT_ROLES` = `["admin", "recete_gm", "sef"]`

**Frontend (2 saat):**
- `fabrika-recete-duzenle.tsx`:
  - Her malzeme: inline edit (miktar/birim) + ✏️ + 🗑️
  - Her adım: ✏️ + 🗑️ + drag-handle
  - Optimistic update + toast

---

### ALT SPRINT R-5B-LITE: Maliyet UI (2 saat) — ÖNCE REPLIT

**Replit bulgusu: Maliyet servisi var, sadece UI eksik + 15 cost=0 fix**

**1. Maliyet Kartı UI (1 saat)**

`fabrika-recete-duzenle.tsx` yeni kart:
```tsx
<Card className="mb-4">
  <CardHeader>
    <CardTitle>💰 Maliyet Dökümü</CardTitle>
    <div className="flex gap-2">
      <Badge variant={recipe.costLastCalculated ? "default" : "destructive"}>
        {recipe.costLastCalculated ? "Güncel" : "Hesaplanmadı"}
      </Badge>
      <Button size="sm" onClick={() => recalcMutation.mutate()}>
        🔄 Yeniden Hesapla
      </Button>
    </div>
  </CardHeader>
  <CardContent>
    <div className="space-y-1 text-sm">
      <div className="flex justify-between">
        <span>Hammadde:</span>
        <span className="font-mono">{fmt(recipe.rawMaterialCost)} TL</span>
      </div>
      <div className="flex justify-between">
        <span>İşçilik:</span>
        <span className="font-mono">{fmt(recipe.laborCost)} TL</span>
      </div>
      <div className="flex justify-between">
        <span>Enerji:</span>
        <span className="font-mono">{fmt(recipe.energyCost)} TL</span>
      </div>
      <div className="flex justify-between font-bold border-t pt-1">
        <span>Batch:</span>
        <span className="font-mono">{fmt(recipe.totalBatchCost)} TL</span>
      </div>
      <div className="flex justify-between text-lg font-bold text-primary">
        <span>Birim:</span>
        <span className="font-mono">{fmt(recipe.unitCost)} TL</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Son: {formatDate(recipe.costLastCalculated) || "Hiç hesaplanmadı"}
      </p>
    </div>
  </CardContent>
</Card>
```

**Malzeme satırı fiyat eklentisi:**
```tsx
<span className="text-xs text-muted-foreground ml-2">
  {ing.unitPrice ? `${ing.unitPrice} TL/${ing.unit}` : '—'}
  → {ing.lineCost ? `${ing.lineCost.toFixed(2)} TL` : '—'}
</span>
```

**2. 15 Cost=0 Reçete Recalc (1 saat)**

Replit'in bulgusu: 15 reçete hiç hesaplanmamış.

**Replit görevi:**
```bash
# POST /api/factory/recipes/:id/recalc-cost (eğer varsa)
# Yoksa yeni endpoint: /api/factory/recipes/bulk-recalc
# Her 15 reçete için:
for recipeId in 15_cost_0_recipes:
  POST /api/factory/recipes/:recipeId/recalc-cost
```

Sonra verification:
```sql
SELECT COUNT(*) FROM factory_recipes WHERE cost_last_calculated IS NOT NULL;
-- Önce: 12, Sonra: 27 bekleniyor
```

**3. Audit Kaydı Düzelt (30 dk — Plus)**

Replit bulgusu: `factory_recipe_price_history` 0 satır.

Maliyet recalc sonrasında otomatik audit yazsın:
```typescript
// calculateFactoryRecipeCost içine ekle (son adım)
await db.insert(factoryRecipePriceHistory).values({
  recipeId,
  rawMaterialCost: String(rawMaterialCost.toFixed(4)),
  totalBatchCost: String(totalBatchCost.toFixed(4)),
  unitCost: String(unitCost.toFixed(4)),
  triggerSource: 'manual_recalc',
  triggeredBy: userId,
  createdAt: new Date(),
});
```

---

### ALT SPRINT R-5C-MIN: Alerjen Minimum (1 saat) — YASAL ŞART

**Replit bulgusu: 12 reçete malzemesi tamamen boş (alerjen yasal risk)**

**1. Malzeme Alerjen Badge (30 dk)**

```tsx
// Malzeme satırında
{ing.allergens?.length > 0 && (
  <div className="flex gap-1">
    {ing.allergens.map(a => (
      <Badge key={a} variant="destructive" className="text-[10px]">
        {ALLERGEN_ICONS[a] || '⚠️'} {ALLERGEN_SHORT[a]}
      </Badge>
    ))}
  </div>
)}
```

**2. Reçete Toplam Alerjen Kartı (30 dk)**

```tsx
<Card className="border-orange-500">
  <CardHeader>
    <CardTitle>⚠️ Alerjen Özeti</CardTitle>
  </CardHeader>
  <CardContent>
    {uniqueAllergens.length > 0 ? (
      <div className="flex gap-2 flex-wrap">
        {uniqueAllergens.map(a => (
          <Badge variant="destructive">
            {ALLERGEN_ICONS[a]} {ALLERGEN_LABELS[a]}
          </Badge>
        ))}
      </div>
    ) : (
      <p className="text-sm text-muted-foreground">
        Alerjen tespit edilmedi (veya tüm malzemelere verify edilmedi)
      </p>
    )}
  </CardContent>
</Card>
```

---

## 🎁 BONUS SPRINT R-5D (İsteğe Bağlı, 1 saat)

**Replit'in yeni fikri:** Müşteri-yüz alerjen QR sayfası

**Senaryo:** Müşteri "fındık alerjim var" diye soruyor → Barista QR gösteriyor → Müşteri telefonla okuyor → Ürün bazlı alerjen tablosu görüyor.

**Ekranlar:**
- `/kalite/alerjen/[product-id]` — Public URL (auth yok)
- Ürün fotoğrafı, malzeme listesi, alerjen uyarıları
- 8 alerjen ikon: 🌾 gluten, 🥛 süt, 🥚 yumurta, 🥜 fındık, 🌰 fıstık, 🫘 soya, 🍞 susam, 🍷 sülfit

**Teknik:** Pilot sonrası QR kod basılabilir ama şimdilik linkten çalışır.

---

## 📊 Zamanlama — Bu Gece + Yarın

| Saat | İş | Sorumlu |
|---|---|---|
| **23 Nis 22:00-01:00** | R-5A UI (backend + frontend) | Claude |
| **24 Nis 09:00-11:00** | R-5B-LITE UI kartı | Claude |
| **24 Nis 11:00-12:00** | Audit kayıt fix | Claude |
| **24 Nis 12:00-13:00** | Test + commit + push | Claude |
| **24 Nis 14:00-14:30** | 15 reçete bulk recalc | **Replit** |
| **24 Nis 14:30-15:30** | R-5C-MIN alerjen UI | Claude |
| **24 Nis 16:00-17:00** | BONUS müşteri QR sayfası | Claude |

**Toplam Claude: 7-8 saat**
**Toplam Replit: 30 dk**

---

## 🔴 Aslan Onayı — Sadece 2 Soru

### 1. Plan B+ (6 saat) + Bonus (1s) = 7 saat — Kabul mü?
- R-5A: UI edit/delete (ŞART)
- R-5B-LITE: Maliyet UI + 15 recalc
- R-5C-MIN: Alerjen badge + özet
- BONUS R-5D: Müşteri QR sayfası (opsiyonel)

### 2. Maliyet Formülü — Mahmut'a bugün/yarın sorulsun mu?
Replit'in bulgusu: Sistem **zaten çalışıyor**, formül büyük ihtimalle önceden Mahmut onaylı. Yine de doğrulama için Mahmut'a sorulmalı.

**Alternatif:** Formül şu an kullanımda, Mahmut onayı **pilot süresince** al (pilot 1. hafta = 28 Nis - 4 May), sonra gerekirse ayarla.

---

## 🎯 Replit'in Yeni 5 Optimizasyon Fikri — Pilot Sonrası

Sprint I (29 Nis+) için backlog'a eklendi:

1. **AI maliyet anomali tespiti (Mr. Dobody)**
2. **Tedarikçi auto-switch**
3. **Reçete A/B test (versions)**
4. **Müşteri-yüz alerjen QR** (veya bonus R-5D olarak şimdi)
5. **Kapasite bazlı üretim planlama trigger**

---

## 🛠️ Aslan'ın Açtığı 3 Task (Parallel İş)

Ekran görüntüsünden:
1. **Sema'nın 12 reçete alerjen+besin girmesi** (pilot 28 Nis öncesi)
2. **factory_ingredient_nutrition duplicate birleştir** (yazım/kasa)
3. **/kalite/alerjen müşteri sayfası** — Bu **BONUS R-5D** ile aynı!

Harika — Aslan aynı şeyi düşünmüş. **R-5D paket kapsamında yapılır.**

---

## 🎯 Claude'un Özeleştirisi

Replit haklı, ben 3 kritik hata yaptım:
1. ❌ "Maliyet=0" dedim, oysa %44 hesaplı
2. ❌ "FK yanlış" dedim, oysa bilinçli karar
3. ❌ 3. sistemi (legacy `recipes`) atladım

**Ders:** Canlı DB verisi kod analizinden daha güvenilir. Bir sonraki analizde önce **Replit'e DB sorgu** yaptırayım, sonra kodlayayım.

---

## ✅ Hazır — Aslan Kararıyla Başlıyoruz

Plan B+ kabul mü? Mahmut'a maliyet formülü pilot sırasında danışalım mı yoksa önce mi?
