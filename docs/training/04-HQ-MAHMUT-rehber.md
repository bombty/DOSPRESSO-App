# 🏛️ HQ — MAHMUT (Muhasebe-İK) Rehber

> **Pilot Day-1: 12 May 2026 Pazartesi 09:00**
> **Hedef:** Mahmut (`muhasebe_ik` rolü)
> **Sahibi:** Aslan (HQ eğitimi sahibi + onay)
> **Format:** A4, ofis dosyası

---

## 🎯 Pilot Süresince Görevin

1. **Günlük PDKS takibi** — Her gün 22:00'da gün sonu kontrolü
2. **Bordro hesaplama** — Mayıs sonu (31 May) ilk pilot bordrosu
3. **PIN sıfırlama** — Müdürlerden gelen taleplere cevap
4. **PDKS düzeltme** — Kayıt yanlışı varsa düzeltme
5. **AGI hesabı** — 2026 AGI parametreleri sistemde, doğrula

---

## 1️⃣ Günlük PDKS Kontrolü (Her Gün 22:00)

### Ekran: Telefondan veya bilgisayardan
**Menü:** Personel → PDKS → Günlük

### Kontrol Listesi
```
□ Bugün vardiya açan herkesin çıkışı kaydedildi mi?
□ Açık vardiya var mı? (Hâlâ "Vardiya başlattı, bitirmedi")
□ Anormal mesai var mı? (>11 saat çalışan)
□ Mola süresi 120 dk'yı aşan? (Pilot ilk hafta kuralı)
□ Geç kalan/erken çıkan? (Kontrol şube müdürüyle)
```

### Anormal Vardiya Düzeltme
Personelle birebir konuş, sonra:
```
Sistem → "PDKS Düzeltme" → kullanıcı seç
→ Düzeltilecek tarih + giriş/çıkış zamanı
→ "Sebep" alanına yaz (kanıt isterse)
→ Kaydet
```

⚠️ **Düzeltme audit log'a yazılır** — geçmişe dönük yapılan tüm değişiklik takip edilir.

---

## 2️⃣ Mayıs Sonu Bordro (31 May 2026)

### DRY_RUN Modu (Mayıs için)
**KARAR (DECISIONS#2):** İlk pilot bordrosu DRY_RUN — **gerçek ödeme YAPILMAZ**, sistemden çıktı alınır + Mahmut elle hesabıyla karşılaştırır.

### Adım Adım
```
1. 31 May Cuma → "Bordro" menüsü
2. "Aylık Bordro Çalıştır" → Mayıs 2026 seç
3. Filtre: HQ + Fabrika + Işıklar (sadece, Lara hariç — Andre franchise)
4. "Hesapla" → Sistem hesaplama yapar (~2 dk)
5. PDF çıktı al → kendi Excel'inle karşılaştır
6. Fark varsa → SİSTEM YANLIŞ, derhal Aslan'a bildir
```

### Kontrol Edilecek Alanlar
- **Çalışma saati toplam** — PDKS'ten doğru çekildi mi?
- **Fazla mesai** — sadece onaylı mesailer dahil mi? (DECISIONS#39: 30 dk altı yok)
- **Mola düşülmüş** — yarım saat üstü molalar düşüldü mü?
- **AGI** — 2026 değerleri (Aslan ile birlikte 2026 baş güncellemesi yapıldı)
- **Brüt → Net** — SGK + gelir vergisi + işsizlik + asgari geçim

### DRY_RUN Sonrası
- Mahmut Aslan'a rapor: "Sistem doğru / yanlış / aşağıdaki farklar var"
- Doğruysa → Hazirran ayında **gerçek bordro** açılabilir
- Yanlışsa → Aslan + Claude düzeltir, tekrar test

---

## 3️⃣ PIN Sıfırlama Talebi Geldi

### Şube müdüründen gelen örnek mesaj
> "Mahmut, Selma PIN'ini unuttu, sıfırlar mısın?"

### Adımlar
```
1. Sistem → "Kullanıcılar" → Selma'yı bul
2. "PIN Sıfırla" → onayla
3. Sistemde PIN '0000' olur
4. Müdüre WhatsApp at: "Selma PIN sıfırlandı, '0000' ile giriş yapıp kendi PIN'ini belirlesin"
5. Personel PIN'ini değiştirdi mi → 24 saat sonra kontrol et (audit log)
```

⚠️ **PIN '0000' kullanıcıyı kilitler** — ilk girişte değiştirme zorunlu (Sprint 2 kararı).

---

## 4️⃣ Coach (Yavuz) Talebi: "Lara için Excel iste"

Yavuz pilot süresince eski sistemden veri ister.

### Excel İmport (Logo'dan veya Excel'den)
```
Sistem → "Veri İmport" → Excel/CSV
→ Şube seç (Lara) → Tarih aralığı
→ Sütun eşleştirme (sistem otomatik yapar)
→ "Önizle" → kontrol
→ "İmport"
```

⚠️ Pilot süresince **sadece HQ + Fabrika + Işıklar** verilerini sen yönetiyorsun. Lara verisi Andre'nin sorumluluğunda.

---

## 5️⃣ AGI 2026 Parametreleri (Doğrulama)

Sistem 2026 AGI değerlerini kullanıyor:
- Bekar: ₺_____ aylık
- Evli (eşi çalışmıyor): ₺_____
- + 1 çocuk: +₺_____
- + 2 çocuk: +₺_____
- + 3 çocuk: +₺_____

**Doğrulama:** Sosyal Güvenlik Kurumu (SGK) sitesinden 2026 AGI tablosuyla karşılaştır. Eksik/yanlış varsa Claude'a (Aslan üzerinden) bildir.

---

## 6️⃣ Mr. Dobody (AI Agent) Senden Veri İsterse

Sistem Mr. Dobody bazen otonom soru sorar:
> "Mahmut, Mayıs Hafta 1'de Lara şubesi 50 saat fazla mesai işaretlendi, bu doğru mu?"

### Cevap
- **Evet** → Onayla
- **Hayır** → "Hayır" + sebep yaz (örn. "Lara'da 4 personel hastalık")
- **Bilmiyorum** → "Şube müdürüne soracağım" → 24 saat içinde dön

---

## ⚠️ KIRMIZI ÇİZGİLER

❌ **PDKS düzeltme audit log'unu silme** — yasal zorunluluk
❌ **Bordro DRY_RUN kapatma** — pilot süresince DRY_RUN açık kalır (DECISIONS#2)
❌ **Lara verisini elle değiştir** — Andre franchise, sen erişemezsin
❌ **PIN '0000' bırakma** — kullanıcı PIN'ini değiştirmediyse 24 saat sonra hesabı kilitle

---

## 📞 Acil Hat

- **Aslan (CEO):** _______
- **Claude (sistem):** Aslan üzerinden
- **SGK soruları:** Aslan + harici muhasebeci
- **Şube müdürleri:**
  - Erdem (Işıklar): _______
  - Andre (Lara): _______
  - Eren (Fabrika): _______

---

## 🎓 Pilot İlk Hafta Eğitim Notları

### Sen + Aslan'ın Birlikte Yapacakları
- 12 May Pazartesi 09:00 — İlk pilot vardiyalarını birlikte izle
- 13 May Salı — İlk gün sonu raporunu birlikte gözden geçir
- 17 May Cumartesi — İlk hafta sonu PDKS özet
- 31 May Cumartesi — DRY_RUN bordro çalıştırma

### Sorularını Yaz
Her gün **bir günlük not defteri** tut: "Bugün ne sorundum, ne öğrendim?" Hafta sonu Aslan'a göster.

---

*v1.0 — 3 May 2026 — Aslan hazırlar, Mahmut ile birlikte uygular*
