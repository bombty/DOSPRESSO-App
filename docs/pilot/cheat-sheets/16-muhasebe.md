# DOSPRESSO Cheat Sheet — Muhasebe

**Hedef Kullanıcı**: Muhasebe sorumlusu — mali kayıt, fatura, vergi, bordro, raporlama
**Cihaz**: Bilgisayar (asıl)
**Erişim**: Mali modül, fatura, ciro raporları, bordro, gider takibi

---

## 1. Muhasebe Nedir?

Sen DOSPRESSO'nun **mali kayıt + uyum** sorumlususun. Tüm fatura, gider, ciro kayıtları sende toplanır. Yasal zaman çizelgelerine (KDV, gelir vergisi, bordro) uyum kritik.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: [örn `muhasebe`]
3. Parola: SMS/WhatsApp
4. "Giriş Yap" → Muhasebe Paneli

---

## 3. Ana Ekran (Muhasebe Paneli)

| Widget | İçerik |
|--------|--------|
| **Bugün Mali Özet** | Toplam ciro, gider, net |
| **Bekleyen Fatura** | Tedarikçi faturaları (giriş bekleyen) |
| **Aylık Hedef vs Gerçekleşen** | Bütçe takip |
| **Bordro Takvim** | Maaş ödeme tarihleri, vergi son ödeme |
| **Banka Hareketleri** | Hesap bakiyeleri (read-only entegrasyon) |
| **KDV/Vergi Yaklaşan** | Son ödeme tarihleri uyarı |

---

## 4. Günlük İş Akışı

### Sabah
1. Dünkü ciro tüm şubeler → mali kayıt
2. Bekleyen fatura listesi → işle
3. Banka hareket kontrol

### Gün İçi
1. Tedarikçi fatura giriş (geldikçe)
2. Şube müdürlerinden gelen gider talepleri
3. Mali sapma anomali → CGO + CEO bildirim

### Ay Sonu
1. Bordro hesap (HR ile koordineli)
2. KDV beyanı hazırlık
3. Ay sonu raporu CEO + CGO'ya

---

## 5. Sık Kullanılan İşler

### Tedarikçi Fatura Giriş
1. Sidebar → "Fatura" → "+ Yeni"
2. Tedarikçi seç → tarih + numara + tutar
3. Kategori (hammadde / ekipman / hizmet / kira)
4. KDV oranı + tutar
5. Foto ekle (orijinal fatura) → zorunlu
6. "Kaydet" → muhasebe sistemi otomatik işler

### Şube Gider Onayı
1. Sidebar → "Gider Talepleri" → bekleyen liste
2. Müdür talebini incele (sebep + tutar + foto)
3. Bütçe içinde mi kontrol
4. Onay/Red + sebep
5. Onay → ödeme talimatı, müdüre bildirim

### Bordro Hesap (Ay Sonu)
1. Sidebar → "Bordro" → "Yeni Dönem"
2. PDKS verisi otomatik gelir (mesai + izin)
3. Maaş + prim + vergi + SGK otomatik hesaplı
4. Onay → ödeme talimatı + bordro PDF

### Aylık Mali Rapor
1. Sidebar → "Raporlar" → "Aylık"
2. Ciro + gider + kar/zarar + nakit akışı
3. Geçen ay + yıl karşılaştırma
4. CEO + CGO'ya PDF gönder

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Vergi son ödeme yaklaştı (3 gün) | Acil ödeme talimatı + CEO bilgilendirme |
| Banka bakiyesi kritik düştü | CEO + CGO acil brifing |
| Şube ciro raporu eksik (1 gün+) | Mudur + IT eskalasyon |
| Tedarikçi fatura tutarsızlık | Tedarikçi + satınalma kontrol |
| Bordro sapma | HR ile koordineli, çalışana açıkla |
| **Sistem yok** | Kâğıt kayıt + Excel, sonra retroaktif |

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- **Sistem sorunu:** Cowork (mesaj) → Müdür veya Supervisor'a DM
- **Pilot süresince:** WhatsApp "DOSPRESSO Pilot" grubu **birincil kanal**
- **Not:** Mr. Dobody otomatik uyarı sistemi (karşılıklı sohbet değil)

📱 **Pilot İletişim**
- WhatsApp Pilot Grubu: "DOSPRESSO Pilot — HQ"
- Cheat sheet: `docs/pilot/cheat-sheets/16-muhasebe.md`

---

## 8. Yapma!

❌ Fatura giriş foto olmadan — denetim risk
❌ Vergi/bordro tarih kaçırma — yasal yaptırım
❌ Gider onayını bütçe kontrolsüz yap
❌ Şube ciro sapmasını "küçük" diye geçiştir
❌ KDV oranını manuel tahmin et — listeden seç
❌ Bordro hesabı PDKS verisi gelmeden yapma

---

## 9. Pilot Süresince Özel Notlar

- Pilot 4 lokasyon mali kayıt **anlık** tutulur (normalde günlük)
- Pilot süresince ciro raporu **2 saatte bir otomatik** gelir, manuel kayıt gerekmez
- Pilot ilk hafta sapma toleransı %3 (normalde %5)
- Pilot sonu kapanış raporu CEO için 5 May Salı sabahına hazır olmalı
