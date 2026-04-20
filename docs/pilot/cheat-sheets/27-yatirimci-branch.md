# DOSPRESSO Cheat Sheet — Yatırımcı (Şube)

**Hedef Kullanıcı**: Şube yatırımcısı — kendi şubesinin mali + operasyonel raporlarına erişim, karar müdahale değil sadece izleme
**Cihaz**: Bilgisayar + telefon (mobil dashboard)
**Erişim**: Read-only — sadece kendi şubesi (`branchId` filtreli)

---

## 1. Yatırımcı (Şube) Nedir?

Sen DOSPRESSO'da **belirli bir şubenin finansal/stratejik paydaşı**sın. Sisteme **read-only erişim**in var: kendi şubenin raporlarını görür, KPI izlersin. **Operasyonel kararlara müdahale etmezsin** (Şube Müdürü + Coach + CGO yetki).

**Örnek hesaplar:**
- `yatirimci5` → branchId=5 (Işıklar)
- `yatirimci_b6` → branchId=6
- `yatirimci_b10` → branchId=10
- `yatirimci_b13` → branchId=13

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: `yatirimci5` (veya size verilen username — şubeye göre)
3. Parola: 1Password (pilot ilk gün adminhq verir)
4. "Giriş Yap" → Şube Yatırımcı Dashboard → `/sube/{branchId}/ozet`

---

## 3. Ana Ekran (Şube Yatırımcı Dashboard)

| Widget | İçerik |
|--------|--------|
| **Şube Mali Özet** | Bugün, hafta, ay, yıl ciro + kar/zarar (sadece kendi şube) |
| **Şube Sağlık** | Operasyonel KPI'lar (müşteri puan, personel verim, hijyen) |
| **Personel Özet** | Mevcut kadro, devamsızlık trend (isim olmadan, agregasyon) |
| **Müşteri Sentimenti** | Şube CRM şikayet/öneri özet |
| **Karşılaştırma** | Senin şube vs ağ ortalaması (anonim diğer şubeler) |
| **Stratejik Hedefler** | Şube çeyrek/yıl hedefi vs gerçekleşen |

---

## 4. Günlük İş Akışı

### Sabah
1. Şube mali özet (dünkü ciro)
2. Şube sağlık KPI tarama
3. Müşteri sentimenti (kritik şikayet var mı)

### Haftalık
1. Pazartesi: hafta brifing (Şube Müdürü + sen + opsiyonel CGO)
2. Hafta raporu PDF (otomatik mail)

### Aylık
1. Ay sonu mali rapor
2. Stratejik hedef gözden geçirme
3. CGO + CEO ile (gerekiyorsa) brifing

---

## 5. Sık Kullanılan İşler

### Şube Mali Rapor İndirme
1. Sidebar → "Raporlar" → "Mali Özet" (sadece kendi şube görünür)
2. Tarih aralığı seç
3. PDF/Excel indir

### Karşılaştırma (Anonim)
1. Dashboard "Karşılaştırma" widget
2. Senin şube vs ağ ortalaması (diğer şubeler isimsiz)
3. Düşük performans alanları → Şube Müdürü brifing iste

### Müşteri Sentiment Detay
1. CRM → "Geri Bildirim" (kendi şube)
2. Trend (haftalık, aylık)
3. Şikayet detayı (anonim)

### Brifing Talep
1. Şube Müdürü ile direkt iletişim
2. CGO/CEO için → Mr. Dobody'e yaz, talep iletir

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Şube mali sapma %20+ | Şube Müdürü + CGO brifingi talep et |
| Müşteri sentimenti kritik düştü | Şube Müdürü brifingi iste, sebep öğren |
| Yasal sorun (denetim, dava) | CEO bilgisi al, kişisel müdahale yapma |
| Pilot süresince şube kapanma şüphesi | CEO + CGO ile direkt iletişim |

**ÖNEMLİ:** Sen müdahale etmezsin, **bilgi alır + soru sorar + brifing istersin**.

---

## 7. Yardım

🚨 **ACİL DURUM**
- Yangın: **110**
- Sağlık: **112**
- Sistem içi: **Mr. Dobody'e yaz** (chat ikonundan)
  Mr. Dobody seni doğru kişiye otomatik yönlendirir (Şube Müdürü / CGO / muhasebe)

📱 **Pilot İletişim**
- Direkt iletişim: Şube Müdürü + CGO
- Cheat sheet: `docs/pilot/cheat-sheets/27-yatirimci-branch.md`

---

## 8. Yapma!

❌ Operasyonel kararlara müdahale et — yetkisiz
❌ Personel ile direkt iletişim kur — Şube Müdürü üzerinden
❌ Diğer şubelerin verisini görmeye çalış — sistem zaten engelliyor (branchId filtreli)
❌ Sistem içi mesajda spekülasyon yap — kayıt kalır
❌ Pilot süresince ek soru/talep gönder — pilot ekibi yoğun
❌ Müdür performans değerlendirmesinde yer al — Coach + CGO yetkisi

---

## 9. Pilot Süresince Özel Notlar

- Senin şube **pilot 4 lokasyonda mı?** (Sadece Işıklar `branchId=5` pilot kapsamında)
- Pilot başarı kararı **CEO Aslan'da** — sen brifinge dahil ol
- Pilot sırasında ek toplantı talep YAPMA (ekip operasyona odaklı)
- Pilot sonu detaylı şube raporu 5 May'a tarafına ulaşır

---

## 10. Yetki Sınırları (Önemli)

| Yapabilirsin | Yapamazsın |
|--------------|------------|
| Kendi şube mali rapor görüntüle | Mali karar al |
| KPI izle (kendi şube) | KPI değiştir |
| Brifing dinle | Operasyonel emir ver |
| Müdüre soru sor | Personele direkt soru/talimat |
| Stratejik hedef gözden geçir | Hedef belirle / değiştir |
| Risk uyarısı al | Müdahale planı uygula |
| Diğer şube anonim karşılaştırma gör | Diğer şubelerin detay verisini gör |
