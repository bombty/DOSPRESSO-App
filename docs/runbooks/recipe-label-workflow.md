# RECIPE → LABEL WORKFLOW — DOSPRESSO

Reçete üzerinden besin değer / alerjen / etiket (TGK uyumlu) iş akışı tasarımı. Sprint 2 / post-pilot kapsamında implementasyon planlanır; bu doküman karar/ilke seviyesinde referansdır.

Son güncelleme: 2 Mayıs 2026  
**Kapsam:** Sprint 2 / post-pilot (pilot sonrası implementasyon).  
Kaynak kararlar: `docs/DECISIONS.md` md. 16-17, 19-23, 25-26.  
İlgili: `docs/TEST-MATRIX.md` (rol smoke testleri).

---

## Reçete Rol Matrisi (P7.2 Sonrası)

| Rol | Reçete temel CRUD | Hammadde / Oran / Keyblend | Besin / Alerjen / Gramaj Onay | Üretim Planlama / Takip | Reçete Kilitle/Aç |
|---|---|---|---|---|---|
| **`ceo` (Aslan)** | ✅ Tam | ✅ Tam | ✅ Tam | ✅ Tam | ✅ Tam |
| **`recete_gm`** | ✅ Tam | ✅ Tam | ✅ Tam | ✅ Tam | ✅ Tam |
| **`gida_muhendisi` (Sema)** | ❌ Read-only | ❌ Yok | ✅ Aktif onay | ❌ Yok | ❌ Yok |
| **`sef` (Ümit)** | ❌ Read-only (kendi kategorisi) | ❌ Yok | ❌ Yok | ✅ Aktif (kendi kategorisi) | ❌ Yok |
| **`fabrika_mudur` (Eren)** | ❌ Read-only | ❌ Yok | ❌ Yok | ✅ Aktif (tüm kategori) | ❌ Yok |

**Backend implementasyonu (P7.2 + P7.2.1):**
- `factory-recipes.ts` rol sabitleri: `ceo` eklendi, `sef` çıkarıldı.
- `factory-recipe-nutrition.ts` `APPROVAL_ROLES`: `["admin","gida_muhendisi","kalite_yoneticisi","ust_yonetim","recete_gm","ceo"]`.
- `/api/factory/recipes/:id/calculate-nutrition` rol kontrolü: `["admin","recete_gm","gida_muhendisi","ceo"]`.

---

## İş Akışı Diyagramı (Sprint 2 Hedefi)

```
[Reçete oluşturma/güncelleme]                      ← ceo / recete_gm
        │
        ▼
[Hammadde + oran + keyblend tanımı]                ← ceo / recete_gm
        │
        ▼
[Hammadde besin değer onay panelinde bekler]       ← gida_muhendisi onaylar
        │
        ▼
[Reçete besin değer hesaplama tetiklenir]          ← ceo / recete_gm / gida_muhendisi
   POST /api/factory/recipes/:id/calculate-nutrition
        │
        ▼
[Reçete gramaj/besin/alerjen onayı]                ← gida_muhendisi onaylar
        │
        ▼
[Etiket taslağı oluşturulur]                       ← otomatik (reçete onaylı statüsünde)
        │
        ▼
[Etiket onay süreci]                               ← gida_muhendisi → ceo / recete_gm final
   Statüler: taslak → onay bekliyor → onaylı
        │
        ▼
[Etiket basım/yayın]                               ← onaylı etiket production'a çıkar
        │
        ▼
[Reçete değişirse → bağlı etiketler "revize gerekli"]   ← otomatik trigger (md. 16)
```

---

## Etiket Statü Sistemi (Önerilen)

| Statü | Anlam | Kim ne yapabilir? |
|---|---|---|
| **`taslak`** | Etiket henüz hazırlanmadı / hazırlanıyor | `ceo` / `recete_gm` / `gida_muhendisi` düzenler |
| **`onay_bekliyor`** | Hazırlık tamam, gıda mühendisi onayı bekleniyor | `gida_muhendisi` onaylar veya geri gönderir |
| **`onayli`** | Gıda mühendisi onayladı, basım/yayına hazır | `ceo` / `recete_gm` final yayını yapar |
| **`revize_gerekli`** | Bağlı reçete değişti, etiket güncellenmeli | Otomatik geçiş (md. 16); `ceo` / `recete_gm` revize eder, akış başa sarar |

**Statü transition kuralları:**
- `taslak` → `onay_bekliyor`: `gida_muhendisi`/`ceo`/`recete_gm` tetikler.
- `onay_bekliyor` → `onayli`: yalnızca `gida_muhendisi` (besin/alerjen/gramaj sorumlusu, md. 17 + 21).
- `onayli` → `revize_gerekli`: **otomatik** (reçete gramaj/içerik/alerjen değişiminde — md. 16).
- `revize_gerekli` → `taslak`: `ceo` / `recete_gm` revize işlemi başlatır.

---

## Reçete Değişikliği → Etiket Etkisi (md. 16)

Bir reçetenin aşağıdaki alanları değişirse bağlı etiketler **otomatik `revize_gerekli`** statüsüne düşer:

| Reçete Alanı | Etiket Etkisi |
|---|---|
| Hammadde ekle/sil | ✅ Revize gerekli (alerjen değişebilir) |
| Hammadde oranı/miktarı değişir | ✅ Revize gerekli (besin değer değişir) |
| Hammadde değiştirildi (substitution) | ✅ Revize gerekli (alerjen + besin) |
| Net miktar / porsiyon değişir | ✅ Revize gerekli (porsiyon başına besin) |
| Kategori / ad / açıklama değişir | ⚠️ Revize gerekli (etiket metni değişir) |
| Sadece üretim adımı değişir | ❌ Etiket etkilenmez |
| Sadece görsel / iç fotoğraf | ❌ Etiket etkilenmez |

**Implementasyon notu (Sprint 2):** Reçete update endpoint'inde audit hook → bağlı `recipe_labels` satırlarını `revize_gerekli` statüsüne çekecek trigger / service-layer mantığı.

---

## TGK Uyum Gereksinimleri

Türk Gıda Kodeksi etiketleme yönetmeliği uyumu için etiketin minimum içermesi gerekenler:

1. **Ürün adı** (reçete `name`)
2. **İçindekiler** (hammadde listesi — azalan ağırlık sırası)
3. **Alerjen vurgusu** (gluten, süt, yumurta, fındık, vb. — bold/altı çizili)
4. **Net miktar** (gram / ml)
5. **Besin değer tablosu** (100 g/ml + porsiyon başına):
   - Enerji (kcal + kJ)
   - Yağ (toplam + doymuş)
   - Karbonhidrat (toplam + şeker)
   - Lif
   - Protein
   - Tuz
6. **Üretici bilgisi** (ad, adres)
7. **Son tüketim / TETT** (tarih veya parti kodu)
8. **Saklama koşulu** (oda sıcaklığı / soğutucu / dondurucu)
9. **Parti / lot kodu** (üretim batch ile bağlantı)
10. **Helal / vejetaryen / vegan** sertifikasyon işareti (varsa)

**Backend gereksinim (Sprint 2):**
- `recipe_labels` tablosu yukarıdaki alanları içermeli.
- `recipe_nutrition_per_100g` ve `recipe_nutrition_per_portion` materialized view veya cached compute.
- Alerjen master listesi (`allergens` lookup tablosu).
- TGK alerjen mapping (hammadde → alerjen).

---

## Besin Değer Hesaplama (Mevcut Yapı)

P7.2.1 sonrası mevcut endpoint'ler (canlı, pilot kullanımına hazır):

| Endpoint | Method | Yetki | Açıklama |
|---|---|---|---|
| `/api/factory/ingredient-nutrition/pending` | GET | `ceo`, `gida_muhendisi`, `kalite_yoneticisi`, `ust_yonetim`, `recete_gm`, admin | Confidence < 100 olan hammadde besin kayıtları |
| `/api/factory/ingredient-nutrition/:id/onay` | PATCH | (aynı) | Tek tıkla onay (confidence=100, source=manual_verified) |
| `/api/factory/recipes/:id/calculate-nutrition` | POST | `ceo`, `recete_gm`, `gida_muhendisi`, admin | Reçete besin değer hesaplama tetikle |

**Hesaplama mantığı (özetle):**
1. Reçete hammadde listesi alınır (`recipe_ingredients`).
2. Her hammaddenin onaylı besin değeri (`ingredient_nutrition` confidence=100) çekilir.
3. Reçete oranıyla skala edilip toplanır → `recipe_nutrition_per_100g`.
4. Net miktarla çarpılıp `recipe_nutrition_per_portion` hesaplanır.

---

## Sprint 2 / Post-Pilot Kapsamı

### Faz A — Etiket Modülü Backend
1. `recipe_labels` schema (statü, TGK alanları, audit kolonları).
2. Reçete update → label `revize_gerekli` trigger (md. 16).
3. Etiket statü transition endpoint'leri (rol guard'ları).
4. Etiket önizleme PDF/HTML render (server-side veya client-side).

### Faz B — Etiket Modülü Frontend
1. Etiket listesi sayfası (`/labels`) — statü filtre, arama.
2. Etiket detay sayfası (önizleme + edit + onay).
3. Onay paneli (`gida_muhendisi` için bekleyen onaylar).
4. Reçete sayfasında "bağlı etiketler" sekmesi.

### Faz C — TGK / Yasal Uyum
1. Alerjen master + hammadde→alerjen mapping.
2. TGK yönetmelik checklist validation (etiket onay öncesi).
3. Türkçe etiket metin şablonları.
4. Yasal denetim raporu export.

### Faz D — Üretim Entegrasyonu
1. Üretim batch → label lot kod ataması.
2. Etiket basım kuyruğu (üretim onayı sonrası).
3. Etiket revize bildirimi (Mr. Dobody → ilgili roller).

---

## Açık Kararlar (Owner GO Bekliyor)

1. **Etiket statü adlandırma:** Türkçe (`taslak/onay_bekliyor/onayli/revize_gerekli`) mi İngilizce (`draft/pending/approved/needs_revision`) mi? — DB enum tutarlılığı için karar gerek.
2. **Etiket basım kanalı:** Sistem içinden direct printer integration mı, PDF export + manuel basım mı?
3. **Etiket görsel şablonu:** Tek standart şablon mı, ürün kategorisine göre çoklu şablon mu?
4. **TGK uyum onayı:** İç kontrol mü, dış denetçi mi onaylayacak?
5. **Etiket revize zaman çizelgesi:** Reçete değişiminden kaç saat içinde etiket güncellenmeli (SLA)?

Bu açık kararlar Sprint 2 planlama oturumunda owner ile netleştirilir.

---

> Bu doküman ilke seviyesinde referansdır. Implementasyon Sprint 2 sprint planı içinde detaylandırılır. Mevcut pilot (Sprint 1) kapsamında etiket modülü çalışır durumda DEĞİLDİR; reçete + besin değer akışı pilot kapsamına dahildir, etiket akışı post-pilot.
