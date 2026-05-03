# 🏛️ HQ — SAMET (Satınalma) Rehber

> **Pilot Day-1: 12 May 2026 Pazartesi 09:00**
> **Hedef:** Samet (`satinalma` rolü)
> **Sahibi:** Aslan (HQ eğitimi sahibi + onay)

---

## 🎯 Pilot Süresince Görevin

1. **Tedarikçi yönetimi** — Tedarikçi listesi güncel tutma
2. **Hammadde fiyat takibi** — Fiyat değiştiğinde sistemi güncelle
3. **Sipariş onayı** — Şube müdürlerinden gelen sipariş taleplerini onayla
4. **Mal kabul kontrol** — Mal kabul edilen ürünleri sistemden takip
5. **Maliyet hesaplama desteği** — Mahmut'a fiyat sorularına cevap

---

## 1️⃣ Tedarikçi Yönetimi

### Yeni Tedarikçi Ekle
```
Sistem → "Satınalma" → "Tedarikçiler" → "Yeni Ekle"
→ Firma adı + vergi no + telefon + e-mail
→ Hangi kategori (un, süt, yumurta, vb.)
→ Ödeme vadesi (peşin / 30 gün / 60 gün)
→ Kaydet
```

### Mevcut Tedarikçi Düzenle
```
Tedarikçi listesi → ilgili firma → "Düzenle"
→ Bilgileri güncelle → Kaydet
```

⚠️ **Tedarikçi silme YOK** — sadece "pasif" yap (geçmiş kayıtlar bozulmasın).

### Pilot süresince eklenecek tedarikçi sayısı
~10-15 ana tedarikçi (un, süt, yumurta, kahve, ambalaj, donut karışım vb.)

---

## 2️⃣ Hammadde Fiyat Güncellemesi

### Sen Fiyat Sorumlususun
**Hatırlatma:** Memory'de yazılı — sen birinci başvuru noktasısın, Mahmut ikinci kaynak.

### Fiyat Değişti — Ne Yapıyorsun?

```
Sistem → "Stok" → "Hammadde Fiyatları"
→ Ürünü bul (örn. Süt 1L)
→ "Yeni Fiyat" → tarih + tedarikçi + birim fiyat
→ Eski fiyat otomatik "geçmiş" olur
→ Kaydet
```

⚠️ **Sistem fiyat geçmişini tutar** — bordro veya maliyet hesabında hangi tarihte hangi fiyat olduğu önemli.

### Fiyat Değiştiğinde Bildir

```
1. WhatsApp pilot grubu → "Süt 1L fiyatı X → Y oldu, sisteme girdim"
2. Mahmut maliyet hesabını günceller
3. Şube müdürlerine bilgi ver (yeni fiyat ürün maliyetlerini etkiler)
```

---

## 3️⃣ Sipariş Onayı (Şube Müdürlerinden)

### Sipariş Talebi Geldi
Erdem veya Andre stok kritik seviye uyarısı görünce sipariş talebi gönderir:
> "İşıklar — 50 kg un, 30 L süt, 20 kg şeker"

### Onaylama Süreci
```
1. Sistem → "Bekleyen Sipariş Talepleri"
2. Talebi aç → kontrol:
   □ Miktar mantıklı mı? (geçmiş tüketime göre)
   □ Stok seviye gerçekten kritik mi?
   □ Tedarikçi müsait mi?
   □ Fiyat güncel mi?
3. "Onayla" → tedarikçiye otomatik PO (purchase order) gönderilir
   VEYA
3. "Reddet" → sebep yaz → şube müdürüne otomatik bildirim
```

### Sipariş Onayında 5-Soru Kontrol Listesi
1. ❓ Bu kadar mıkdara gerçekten ihtiyaç var mı? (geçmiş 4 hafta tüketim)
2. ❓ Tedarikçi en uygun fiyat mı? (3 firma karşılaştırma)
3. ❓ Ödeme vadesi nakit akışına uyuyor mu?
4. ❓ Teslimat tarihi şubenin operasyonuna uygun mu?
5. ❓ Kalite kontrol (Sema/Eren onayı) gerekli mi?

---

## 4️⃣ Mal Kabul Kontrol

### Mal Geldi → Şubede Mal Kabul Yapıldı
Şube müdürü mal kabul ettikten sonra senin telefonuna bildirim gelir:
> "Lara şubesi 50 kg un kabul etti — fatura no #1234"

### Senin Yapacakların
```
Sistem → "Mal Kabul Geçmişi"
→ Lara şubesi son kabul → kontrol:
  □ Sipariş ettiğimiz miktarda mı?
  □ Fatura tutar doğru mu?
  □ Kalite sorunu var mı? (şube müdürü işaretlemişse)
→ "Onayla" → fatura sistemde resmileşir
   VEYA
→ "İtiraz" → Aslan'a escalate
```

### KDV Kontrol (KDV %1 vs %18)
**ÖNEMLİ:** Pilot öncesi F29 fix yapıldı — KDV item-level tutuluyor.
- Gıda (un, süt, ekmek): %1
- Yemek hizmet: %10
- Diğer (ambalaj, deterjan): %18

**Senin işin:** Faturadaki KDV oranı doğru mu kontrol et. Yanlışsa tedarikçiye iade.

---

## 5️⃣ Maliyet Hesaplama Desteği

### Mahmut Senden Sorabilir
> "Bu ay maliyet artışı var — un fiyatı ne kadar arttı?"

### Cevap Üretme
```
Sistem → "Stok" → "Hammadde Fiyat Geçmişi"
→ Un → tarih aralığı (Nis 1 - May 1)
→ Excel çıktı al → Mahmut'a WhatsApp at
```

### Sema'dan İstek Gelirse (Reçete Maliyet)
> "Cinnabon recipe için tüm hammadde fiyatları"

```
Sistem → "Reçete Maliyet"
→ Cinnabon → güncel fiyatlarla maliyet hesabı
→ Çıktı al → Sema'ya gönder
```

⚠️ Pilot süresince **döviz takibi YOK** (F31 ertelendi). Tüm fiyatlar TRY varsayılır.

---

## 6️⃣ Pilot İlk Hafta Acil Stok Kontrolü

İlk hafta tedarikçi siparişler gecikme olabilir. Her sabah 09:00:
```
1. Sistem → "Stok Genel Durum"
2. Kritik seviyedeki ürünler → liste
3. Sipariş edildi mi kontrol → edilmediyse hemen sipariş aç
4. Şube müdürlerine WhatsApp brifi
```

---

## ⚠️ KIRMIZI ÇİZGİLER

❌ **Tedarikçi silme** — sadece pasif yap
❌ **Eski fiyat üzerine yazma** — yeni fiyat olarak ekle, eski tarihte tut
❌ **Onaysız sipariş kapat** — şube müdürü talebi olmalı
❌ **Mal kabul olmadan fatura kayıt** — ardışık olmalı: sipariş → kabul → fatura
❌ **KDV oran sallama** — gıda %1, diğer %18 ayrımı net

---

## 📞 Acil Hat

- **Aslan (CEO):** _______
- **Mahmut (Muhasebe):** _______ (maliyet sorularında)
- **Sema (Gıda Müh.):** _______ (reçete + kalite)
- **Eren (Fabrika):** _______ (üretim hammadde)
- **Şube Müdürleri:**
  - Erdem (Işıklar): _______
  - Andre (Lara): _______

---

## 🎓 Pilot İlk Hafta Eğitim

### Aslan ile Birlikte
- 12 May Pazartesi — İlk gün, hangi siparişler var, kontrol et
- 13 May Salı — Mal kabul akışı
- 14 May Çarşamba — KDV kontrol pratiği
- Hafta sonu — Hangi tedarikçi sorunları çıktı, listele

### Senin Notların
Her sipariş onaylarken **defterine** yaz:
- Hangi tedarikçi
- Ne kadar (TL)
- Ne için (şube/fabrika)
- Sorunlu mu

Hafta sonu Aslan ile gözden geçir.

---

*v1.0 — 3 May 2026 — Aslan hazırlar, Samet ile birlikte uygular*
