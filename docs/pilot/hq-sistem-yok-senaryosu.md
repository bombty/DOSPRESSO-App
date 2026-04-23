# HQ "Sistem Yok" Senaryosu — Acil Aksiyon Planı

**Versiyon:** 1.0 — 21 Nisan 2026
**Hedef:** Tüm HQ rolleri (CEO, CGO, Muhasebe, Satınalma, Kalite, Marketing, Teknik, Trainer, Coach, Destek, Yatırımcı)
**Senaryo:** Sistem çöktü, ağ yok, veritabanı erişilemiyor

---

## 🔴 Kritiklik Seviyeleri

### Seviye 1: Kısa Süreli (0-30 dakika)
**Belirti:** Tek sayfa yüklenmiyor, sistem genel çalışıyor

**Aksiyon:**
1. Sayfa yenile (Ctrl+F5)
2. Başka bir sayfaya geç, tekrar dön
3. 10 dk bekle, tekrar dene
4. Sorun devam → WhatsApp Teknik grubuna bildirim

**Raporlama:** Gerekmez (tekil olay)

---

### Seviye 2: Kısmi Çöküş (30 dk - 2 saat)
**Belirti:** Login çalışıyor ama belirli modül/rapor açılmıyor

**Aksiyon:**
1. Cowork mesaj → Teknik ekibe
2. Sorun kaydı: saat + etkilenen modül + kullanıcı sayısı
3. Alternatif yöntem:
   - **Muhasebe:** Önemli ödemeler için Excel/manuel takip → sonra sisteme aktar
   - **Satınalma:** Acil sipariş → direkt tedarikçiye telefon + yazılı kayıt
   - **Kalite:** Kritik denetim notlarını kağıda yaz → sonra sisteme
   - **Marketing:** Kampanya deadline kritikse email ile manuel gönder
4. 2 saat aşımında Seviye 3 olarak escalate et

**Raporlama:** Gün sonu teknik ekibe durum özeti

---

### Seviye 3: Tam Çöküş (2 saat+)
**Belirti:** Hiçbir modül erişilemiyor, sistem genel down

**Aksiyon:**
1. **Anında bildirim:** WhatsApp Ana Yönetim grubu
2. **CEO/CGO onayı:** Manuel operasyon planı aktivasyonu
3. **Rolüne göre manuel plan:**

#### CEO/CGO
- Şube müdürlerini WhatsApp ile ara
- Kritik kararları sözlü ver, sonra sisteme kayıt
- Günlük hedef güncellemelerini manuel takip et

#### Muhasebe
- Kritik ödemeler: Banka mobil uygulama + manuel dekont
- Gün sonu kayıt defterini kağıtta tut
- Fatura kabul/red manuel (Excel kayıt)
- SGK deadlinelari kritikse kağıt başvuru (e-Bildirge çalışıyorsa)

#### Satınalma
- Tedarikçilere telefon + email
- Şube sipariş talepleri: WhatsApp şube grupları
- Kabul kayıtları kağıt → sisteme aktar

#### Kalite Kontrol / Gıda Mühendisi
- HACCP sapma → kağıt kayıt formu
- Denetim görevi: manuel not defterine → foto + GPS işaret
- CAPA kritikse WhatsApp ile sorumlu atama

#### Marketing
- Kampanya deadline varsa: email + WhatsApp duyuru
- Sosyal medya paylaşımları doğrudan (sistem dışı)
- Grafik dosyalar yerel bilgisayarda saklı (backup kontrolü)

#### Teknik / Destek
- Kendi rolü aktivasyon — sorun giderme + ekibi yönlendirme
- Vendor/hosting ile iletişim
- Yedekten restore kararı → CEO onayı

#### Trainer / Coach
- Eğitim/coaching görüşmeleri WhatsApp veya fiziksel
- Şube ziyareti planlı ise devam et (notlar kağıda)
- Eğitim tamamlama kayıtları sonradan sisteme

#### Yatırımcı
- Sistem yok durumunda rapor beklememen normaldir
- Şube müdürü ile WhatsApp ile doğrudan bilgi al
- Sistem normale dönene kadar aktif talep etme

---

## 📝 Kağıt Kayıt Formu (HQ Acil Durum)

Sistem yokken doldurulması gereken kritik veriler:

```
HQ ACİL KAYIT FORMU

Tarih: ______  Saat: ______
Kayıt Tutan: ______________  Rol: ______________

İşlem Tipi:
[ ] Mali ödeme  [ ] Sipariş  [ ] Kalite sapma
[ ] Eğitim      [ ] Diğer

Detay:
_________________________________________________
_________________________________________________

Tutar/Miktar (varsa): ______________
İlgili şube/tedarikçi: ______________
Onay veren: ______________  (imza)

Sisteme aktarma deadline: 24 saat içinde
Aktarıldı mı? [ ] Evet ___saat ___dakika
```

---

## 🔄 Sistem Geri Geldiğinde

1. **Öncelik sırası:**
   - Son 24 saatte yapılmış kağıt kayıtları sisteme aktar
   - Eksik kayıt varsa raporla (muhasebe + ceo)
2. **Timestamp uyarısı:** Kağıt kayıt saati + sisteme aktarım saati ayrı kaydet (audit trail)
3. **Doğrulama:** Muhasebe mali işlemleri double-check eder
4. **Post-mortem:** 24 saat içinde teknik ekibi özet rapor yazar:
   - Çöküş sebebi
   - Etkilenen kullanıcı sayısı
   - Kaybedilen data (varsa)
   - Önlem

---

## 🚨 Hangi Durumda CEO Devrede?

- Sistem 2 saati aşan çöküş
- Kritik mali işlem engellendi (>5000 TL)
- Gıda güvenliği kritik bulgu acil eylem gerektiriyor
- Müşteri memnuniyet krizi (çöküş nedeniyle)
- Medya/sosyal medyada çöküş haberi yayıldı

---

## 💡 Önlem Kontrol Listesi

Pilot öncesi her HQ personeli kontrol etmeli:

- [ ] WhatsApp "DOSPRESSO Pilot — [Rol Kanalı]" grubuna katıldım
- [ ] Teknik ekibin telefon numarası kişilerde kayıtlı
- [ ] Kağıt kayıt formu yazdırılıp masamda
- [ ] Kritik veriler için lokal Excel yedekleme biliyorum
- [ ] Sistem çöküşü senaryosunu bir kez simüle ettim

---

## 🔗 Bağlantılı Dokümanlar

- Her HQ cheat-sheet: Acil durum bölümü bu dokümana referans verir
- `docs/pilot/mr-dobody-yonlendirme-matrisi.md`
- `docs/pilot/sube-tablet-hazirlik.md` (şube tarafı)

---

**Son güncelleme:** 21 Nisan 2026 v1.0
**Pilot sonrası revizyon:** 5 Mayıs 2026 (gerçek sistem çöküş senaryosu ile test sonrası güncellenecek)
