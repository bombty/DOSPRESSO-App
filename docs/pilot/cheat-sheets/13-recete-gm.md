# DOSPRESSO Cheat Sheet — Reçete GM

**Hedef Kullanıcı**: Reçete Genel Müdürü (recete_gm) — tüm ürün reçetelerinin onay sahibi, sürüm yönetimi
**Cihaz**: Ofis bilgisayarı (asıl) + telefon (acil onaylar için)
**Erişim**: Reçete oluşturma, sürüm onaylama, yayınlama, fabrika + tüm şubelere etki

---

## 1. Reçete GM Nedir?

Sen DOSPRESSO ürün gamının "tek doğruluk kaynağı"sın. Şef bir reçete değişikliği önerse bile, **senin onayın olmadan üretime giremez**.

Sorumlulukların:
1. Reçete sürüm yönetimi (her değişiklik = yeni sürüm)
2. Hammadde + miktar + adım onayı
3. Mali etki (maliyet hesabı)
4. Yasal/sağlık etki (alerjen, hijyen)
5. Tutarlılık (22 şube + Fabrika aynı reçeteyi uygulasın)

---

## 2. Login Adımları

### Yöntem A — Ofis Bilgisayarı (Önerilen)
1. Tarayıcı → sistem aç
2. Kullanıcı adı: [size verilen, örn `recete_gm_1`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Reçete Yönetim Paneli

### Yöntem B — Telefon (Acil Onay)
1. Tarayıcıdan açılır (mobil uyumlu)
2. Aynı kullanıcı adı + parola
3. Sadece "Onay Bekleyen" listesini gör + onayla/reddet

---

## 3. Ana Ekran (Reçete Yönetim Paneli)

| Bölüm | İçerik |
|---|---|
| **Onay Bekleyen** | Şef'in önerdiği yeni sürümler (sayı + bekleme süresi) |
| **Aktif Reçeteler** | Şu an üretimde olan tüm sürümler (ürün × şube) |
| **Sürüm Geçmişi** | Geçmiş sürümler (arşiv, geri yüklenebilir) |
| **Maliyet Etkisi** | Son 30 gün hammadde fiyat değişimi → reçete maliyet farkı |
| **Standart Dışı Uygulama** | Hangi şube reçeteyi farklı uyguluyor? (sapma raporu) |

---

## 4. Günlük İş Akışı (3 Adım)

### Sabah (Ofis)
1. "Onay Bekleyen" listesi → kaç tane var, ne kadar bekliyor?
2. Acil olanlar (24 saat+ bekleyen) önce
3. Her birini incele: değişiklik gerekçesi, kim önerdi, etki ne

### Onay Süreci (Reçete Başına)
1. Reçeteyi aç → eski vs yeni sürüm yan yana
2. Kontrol listesi:
   - Hammadde değişti mi? → maliyet etkisi
   - Adım sayısı değişti mi? → operatör eğitim gerekli mi
   - Alerjen değişti mi? → alerjen etiket güncelle
   - Lezzet/doku/görünüm değişimi tahmini → kabul edilebilir mi
3. Karar: **Onay** / **Düzeltme İste** / **Red**
4. Karar sebebi yaz (zorunlu, ileride referans)

### Yayınlama
1. Onaylanan reçete → "Yayınla" butonu
2. **Zorunlu seçim:** Anında / Yarın 06:00 / Belirli tarih
3. Etki: Tüm şubelerin sıradaki batch'inden itibaren aktif
4. Şef + fabrika_mudur otomatik bildirim

### Haftalık (Pazartesi)
1. "Standart Dışı Uygulama" raporu → hangi şube hangi reçeteyi farklı uyguluyor?
2. Sapma varsa → mudur'lara "Standart Hatırlatma" gönder
3. 3 hafta üst üste sapan şube → fabrika_mudur + ceo'ya rapor

---

## 5. Sık Kullanılan İşler

### Yeni Reçete Oluşturma (Sıfırdan)
1. Sidebar → "Reçete" → "+ Yeni"
2. Ürün adı + kategori (sıcak içecek / soğuk içecek / yiyecek vb.)
3. Hammadde listesi (her biri ölçü birimi ile)
4. Adımlar (sırayla, her adımda süre + sıcaklık)
5. Foto/video ekle (görsel referans, opsiyonel ama tavsiye)
6. Maliyet otomatik hesaplı (hammadde fiyatlarından)
7. Alerjen listesi (zorunlu)
8. **Taslak** olarak kaydet → sonra Şef'e test gönder

### Sürüm Karşılaştırma
1. Aktif reçete aç → "Sürüm Geçmişi"
2. Karşılaştırmak istediğin sürümleri seç (max 3)
3. Yan yana görünür: hammadde / adım / maliyet farkları renkli
4. Geri yüklemek istersen → eski sürümü "Aktive Et"

### Acil Reçete Geri Çağırma (Hata Durumu)
1. Aktif reçetede problem fark edildi (örn alerjen unutuldu)
2. "Acil Geri Çağırma" butonu (kırmızı)
3. Sebep yaz (zorunlu, açık)
4. Otomatik etki:
   - Tüm şubeler **uyarı** alır
   - Mevcut batch'ler durdurulur
   - Eski sürüm geri aktif olur
5. Sonra düzeltilmiş yeni sürüm yayınla

### Maliyet İncelemesi
1. Sidebar → "Maliyet Etkisi"
2. Son 30 gün hammadde fiyat değişimi → en çok etkilenen 5 reçete
3. Eğer etki +%10'dan fazla → satınalma + ceo'ya rapor (alternatif tedarikçi?)
4. Eğer etki +%20'den fazla → reçete revizyonu (daha ucuz alternatif arama)

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Şef "Acil Onay" istedi | Telefon → 1 saat içinde onay/red |
| Üretimde aktif reçetede hata fark edildi | "Acil Geri Çağırma" + tüm şubelere uyarı |
| Müşteri alerjik reaksiyon raporu (CRM'den) | Reçete + alerjen listesi denetim, 24 saat içinde rapor |
| Tedarikçi hammadde değiştirdi | Aynı kalite mi? Test gerekli mi? Şef ile koordinasyon |
| Yasal değişiklik (örn yeni alerjen düzenleme) | Tüm reçeteleri tara, etkilenenleri güncelle |
| **Sistem yok** | Telefon + WhatsApp ile şef'e geçici karar, sonra retroaktif kayıt |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (şef / fabrika mudur / CEO Aslan / satınalma / CRM)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — Reçete"
- Cheat sheet: `docs/pilot/cheat-sheets/13-recete-gm.md`

---

## 8. Yapma!

❌ Onay sebebini boş bırakma — gelecekte "neden onayladık?" sorusuna cevap kalmaz
❌ Acil bekleyen reçeteyi 24 saat+ bekletme — Şef bekliyor, üretim duruyor
❌ Eski sürümü silme (sadece arşivle) — denetim/geri çağırma için lazım
❌ Maliyet etkisini görmezden gelme — kar marjı erir
❌ Şef'in itirazı olmadan **doğrudan** reçete yayınlama (Şef + sen = çift onay kuralı pilot süresince)
❌ Telefon/sözlü onay verme — sistem dışı = kayıt yok = sorumluluk dağılır

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyon (3 şube + Fabrika) → senin reçete kararların **4 lokasyonda anında etki eder**.
- Pilot ilk hafta **hiç yeni reçete yayınlama**. Sadece kritik düzeltmeler (alerjen vb.) için onay ver.
- Pilot süresince **çift onay kuralı**: Şef + sen = ikinizin onayı zorunlu (Şef sahaya yakın, sen merkez stratejik).
- Şube bazlı sapma raporu pilot süresince **günlük** kontrol et (normalde haftalık).

---

## 10. Pilot Öncesi Hazırlık (28 Nis öncesi)

| Görev | Süre | Durum |
|-------|------|-------|
| Aktif reçetelerin son sürümleri kilitli olduğundan emin ol | 1 saat | Kontrol et |
| 4 pilot lokasyonun reçete listesi aynı mı doğrula | 30 dk | Kontrol et |
| Acil geri çağırma akışını test et (sandbox) | 30 dk | Önemli |
| Alerjen tablosu güncel mi (son yasal düzenleme) | 30 dk | Yasal |
| Şef + Üretim Şefi ile pilot reçete kuralları konuş | 1 saat | Sözlü |
