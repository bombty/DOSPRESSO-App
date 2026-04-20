# DOSPRESSO Cheat Sheet — CEO

**Hedef Kullanıcı**: CEO (Aslan) — stratejik karar, tüm sistem görünür, son onay mercii
**Cihaz**: Bilgisayar (asıl) + telefon (mobil dashboard)
**Erişim**: Tüm modüller, tüm şubeler, tüm raporlar, kritik onaylar

---

## 1. CEO Nedir?

Sen DOSPRESSO'nun **stratejik karar mercii** ve **son onay sahibi**sin. Operasyonel detayda boğulmazsın — KPI'ları izler, sapan göstergede müdahale eder, modül/personel/yatırım kararlarını verirsin.

Pilot süresince: **4 sayısal eşik** sahibi (login >%95, task >10/lokasyon, error <%5, smoke ≥7/8). Pilot başarı kararı senindir.

---

## 2. Login Adımları

1. Tarayıcı → sistem aç
2. Kullanıcı adı: `aslan` (veya `ceo`)
3. Parola: 1Password'da
4. "Giriş Yap" → CEO Mission Control

---

## 3. Ana Ekran (CEO Mission Control)

| Widget | İçerik |
|--------|--------|
| **Genel Sağlık** | Tüm şubeler tek bakışta (yeşil/sarı/kırmızı) |
| **Pilot KPI Eşikleri** | 4 sayısal eşik, anlık durum |
| **Mali Özet** | Bugün ciro, hafta, ay, geçen yıl karşılaştırma |
| **Personel Sapma** | Devamsızlık, geç kalma, izin yığılması |
| **Müşteri Sentimenti** | CRM şikayet/öneri trend, NPS |
| **Onay Bekleyen** | Sana yönlendirilen kritik kararlar |
| **Mr. Dobody Özeti** | AI agent'ın bugün tespit ettiği gap'ler |

---

## 4. Günlük İş Akışı

### Sabah (08:00-09:00)
1. CEO Mission Control aç
2. Genel sağlık taraması — kırmızı/sarı kalemleri not al
3. Onay bekleyen listesi → 24 saat içinde karar
4. Mali özet → dünkü ciro vs hedef

### Gün İçi
1. Müdür/coach eskalasyonları
2. Stratejik konularda sözlü/yazılı brifing
3. Mr. Dobody özet bildirimleri (push)

### Akşam
1. Gün sonu özeti — pilot kpi tahtası
2. Yarın için stratejik öncelik notu

### Haftalık (Pazartesi)
1. Geçen hafta tüm şube kıyaslaması
2. CGO + finans + operasyon brifingi
3. Pilot sırasında: günlük kararlar (haftada 7 brifing)

---

## 5. Sık Kullanılan İşler

### Onay/Red Verme (Kritik Karar)
1. Onay Bekleyen widget → kart aç
2. Detaylı bilgi + kim önerdi + etki tahmini
3. Onay / Red / Düzeltme İste
4. Sebep yaz (zorunlu, ileride referans)
5. Bildirim ilgilisine gider

### Şube Karşılaştırma Raporu
1. Sidebar → "Raporlar" → "Şube Kıyas"
2. Metrik seç (ciro, personel verim, müşteri puanı)
3. Tarih aralığı + şube seç
4. Anomali → ilgili müdüre bildirim (Mr. Dobody üzerinden)

### Personel Karar (Üst Seviye)
1. Sidebar → "İK" → personel ara
2. Performans + disiplin + eğitim geçmişi
3. Karar (terfi, ödül, ihraç) → İK'ya yönlendirme

### Stratejik Hedef Belirleme
1. Sidebar → "Stratejik Plan"
2. Çeyrek/yıl hedefleri tanımla
3. CGO + müdürlere yansıtma

---

## 6. Acil Durumlar

| Durum | Aksiyon |
|---|---|
| Pilot KPI eşik aşıldı | Mr. Dobody anlık bildirim → 1 saat içinde brifing |
| Şubede ciddi olay (yangın, müşteri kavgası vb.) | Mudur direkt eskalasyon → karar onayı |
| Mali sapma %20+ | Muhasebe + CGO brifing |
| Yasal sorun (denetim, dava) | Hukuki danışman + Aslan kişisel müdahale |
| Kritik personel ayrılma talebi | İK + ilgili müdür + sen |
| **Sistem çökmesi (genel)** | IT + Replit Agent + Claude path eskalasyon |

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
- Cheat sheet: `docs/pilot/cheat-sheets/14-ceo.md`

---

## 8. Yapma!

❌ Operasyonel detaya boğulma — müdür/coach'a yönlendir
❌ Onayı 24 saatten fazla bekletme — operasyon durur
❌ Sözlü karar verip sistem dışı bırakma — kayıt yoksa sorumluluk dağılır
❌ Pilot KPI eşik sapmasında "biraz daha bekleyelim" — eşik aşıldıysa müdahale et
❌ Müdüre direkt görev atama (coach üzerinden git) — yetki zinciri
❌ Mr. Dobody bildirimlerini görmezden gelme — gap'ler birikir

---

## 9. Pilot Süresince Özel Notlar

- 4 sayısal eşik **senin** karar kriterin: login >%95, task >10/lokasyon, error <%5, smoke ≥7/8
- Pilot ilk hafta (28 Nis - 4 May) **günde 1 brifing** (08:30, 13:00, 18:00) — coach + müdür sözlü
- Day-1 raporu (`docs/pilot/day-1-report.md`) Salı akşamı senin için doldurulur
- Pilot başarı kararı: 4 May Pazartesi 09:00 → "Devam et" / "İptal et" / "Düzelt + tekrar"
