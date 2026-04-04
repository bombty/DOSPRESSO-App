# Mr. Dobody — Yarı Otonom Operasyon Asistanı (Final Plan)
**Son güncelleme:** 5 Nisan 2026
**Hedef otonomi:** %60-70 (öğrenme ile %75+)

---

## TEMEL PRENSİP

```
Her Dobody bildirimi = SORUN + KÖK NEDEN + HAZIR ÇÖZÜM + TEK TIK AKSİYON

Dobody asla sadece "sorun var" demez.
Her zaman "sorun var, sebebi bu, çözümü hazırladım, onayla" der.
```

---

## 1. KULLANICI DENEYİMİ (UX) OPTİMİZASYONU

### Problem: Bildirim Yorgunluğu
16 şubede vardiya planı yok = 16 ayrı bildirim → kimse okumaz.

### Çözüm: Grupla + Özetle + Toplu Aksiyon
```
ESKİ: 16 ayrı uyarı kartı
YENİ: "16 şubede vardiya planı eksik" → tek kart
  → Tıkla: şube listesi + toplu mesaj draft'ı
  → "Hepsine Hatırlatma Gönder" tek buton
  → Veya şube bazlı seç: sadece Batman + Kilis'e gönder
```

### Öncelik Sıralaması (En kritik 3 gösterilir)
```
1. ACIL → Hemen aksiyon gerekli (güvenlik, SLA ihlali, stok bitti)
2. ÖNEMLİ → Bugün içinde çözülmeli (skor düşüş, plan eksik)
3. BİLGİ → Haftalık brief'te gösterilir (trend, karşılaştırma)
4. TEBRİK → İyi performans takdiri (motivasyon)

Dashboard'da max 3 kart → detaylı liste ayrı sayfada
```

---

## 2. GERÇEK OTONOMİ — Dobody ÇÖZÜMÜ BİZZAT UYGULAR

### Şu anki sorun: Dobody "sipariş oluşturdum" diyor ama oluşturmuyor.

### Yeni tasarım: Onay sonrası Dobody gerçekten DB'de işlem yapar
```
Aksiyon Tipleri ve Yapılacak İşlem:

send_message      → notifications tablosuna INSERT (gerçek bildirim)
create_order      → purchase_orders tablosuna INSERT (gerçek sipariş)
assign_training   → training_assignments tablosuna INSERT (gerçek atama)
schedule_audit    → audits_v2 tablosuna INSERT (gerçek denetim planı)
create_shift      → shifts tablosuna INSERT (gerçek vardiya)
create_task       → project_tasks tablosuna INSERT (gerçek görev)
create_maintenance→ maintenance_schedules tablosuna INSERT (gerçek bakım planı)
send_reminder     → notifications tablosuna INSERT
escalate          → üst rol'e notifications INSERT
```

### Onay Akışı:
```
Dobody → "Stok siparişi hazırladım" → Kullanıcı → [Düzenle + Onayla]
  → Dobody gerçekten purchase_orders'a INSERT yapar
  → Sipariş oluşturuldu bildirimi
  → Güven skoru +2
```

---

## 3. PROAKTİF TAHMİN (Sorun olmadan ÖNCE)

### Şu an: Reaktif (sorun olduktan sonra tepki)
### Yeni: Proaktif (sorun olmadan önce uyarı)

```
Stok Tahmini:
  Tüketim hızı × gün sayısı = tahmini bitiş tarihi
  "Süt stoğu mevcut tüketim hızıyla Cuma bitecek — sipariş önerisi"

Vardiya Tahmini:
  Geçen yılın aynı haftası + mevsim faktörü
  "Geçen yıl bu hafta satışlar %30 arttı → ek 1 barista vardiyası önerisi"

Personel Trend:
  Son 2 haftada 3 geç kalma → trend kötüleşiyor
  "Mehmet'in devam skoru düşüyor → görüşme önerisi"

Ekipman Ömür Tahmini:
  3. arıza bu ay → "Bu espresso makinesi sık arızalanıyor → değişim önerisi"

Sertifika Takibi:
  30 gün önce hatırlat → 7 gün önce acil → bitiş günü escalation
```

---

## 4. BAĞLAMA ÖZEL MESAJ ÜRETİMİ (GPT-4o)

### Şu an: Template mesajlar (hep aynı, sıkıcı)
### Yeni: GPT-4o ile bağlama özel mesaj

```
Batman şubesine (3 haftadır plan yok — kronik sorun):
  "Batman şubesi 3 haftadır vardiya planı oluşturmamaktadır. 
   Bu tekrarlayan durum operasyonel kaliteyi ciddi şekilde 
   etkilemektedir. Acil düzeltme beklenmektedir."
  Ton: Ciddi, deadline kısa

Antalya Beachpark'a (ilk kez eksik — muhtemelen unutmuş):
  "Bu hafta vardiya planınız henüz oluşturulmamış görünüyor. 
   Planlama sayfasından hızlıca oluşturabilirsiniz."
  Ton: Yumuşak, hatırlatma

En iyi şubeye (skor yükseldi):
  "Tebrikler! Lara şubesi bu ay %92 skor ile en yüksek 
   performansı gösterdi. Best practice paylaşımı önerisi."
  Ton: Takdir, motivasyon
```

---

## 5. GRUPLU AKSİYONLAR

### Problem: 16 şubeye tek tek mesaj göndermek = 16 tıklama
### Çözüm: Toplu işlem

```
Toplu Mesaj:
  "16 şubede vardiya planı eksik"
  → Tümüne Gönder (tek tık → 16 bildirim oluşur)
  → Veya Seçerek Gönder (checkbox ile şube seç)

Toplu Eğitim Ataması:
  "5 personelin sertifikası bitiyor"
  → Hepsine Yenileme Ata (tek tık → 5 eğitim ataması)

Toplu Stok Siparişi:
  "4 şubede kahve stoğu kritik"
  → Toplu Sipariş Oluştur (tek tık → 4 sipariş talebi)
```

---

## 6. ESKALASİYON ZİNCİRİ (Yanıt Alınmazsa)

```
Gün 0: Dobody → Supervisor'a öneri
Gün 2: Yanıt yok → Dobody tekrar hatırlat (farklı mesaj)
Gün 4: Hala yanıt yok → Müdür/Yatırımcı'ya escalation
Gün 7: Hala çözülmedi → Coach'a escalation + acil badge

Öğrenme:
  "Batman şubesi mesajlara ortalama 5 günde yanıt veriyor"
  → Batman için escalation süresini 3 güne kısalt
  
  "Lara şubesi mesajlara aynı gün yanıt veriyor"  
  → Lara için escalation süresini 7 güne uzat
```

---

## 7. TÜM MODÜL BAĞLANTILARI (14 Modül)

### A. VARDİYA (❌ → ✅)
```
Tetikleyiciler:
  - Yarınki vardiya planı oluşturulmadı
  - Vardiyada personel eksik (izin var ama yedek atanmadı)
  - Geç kalma trendi (3+ geç kalma → uyarı)
  - Mola dönüşü check-in yapılmadı

Çözüm Aksiyonları:
  - Vardiya teklifi (müsait personele)
  - Supervisor'a/personele hatırlatma
  - Geç kalma eğilimi → görüşme önerisi
```

### B. STOK (❌ → ✅)
```
Tetikleyiciler:
  - Stok minimum seviyenin altında
  - SKT yaklaşan ürünler (30/7 gün)
  - Tüketim hızı anormal (israf şüphesi)
  - Sayım farkı yüksek

Çözüm Aksiyonları:
  - Sipariş talebi oluştur (miktar hesaplanmış)
  - FIFO sevkiyat planı (SKT yaklaşan önce)
  - Sayım hatırlatma
  - İsraf uyarısı (Supervisor'a)
```

### C. EKİPMAN (❌ → ✅)
```
Tetikleyiciler:
  - Bakım tarihi geçmiş
  - Aynı ekipman 3+ arıza (kronik sorun)
  - Arıza çözüm süresi SLA'yı aşmış
  - Kalibrasyon geçmiş

Çözüm Aksiyonları:
  - Bakım planı oluştur
  - Teknik'e/CGO'ya servis talebi
  - Ekipman değişim önerisi (kronik arıza)
```

### D. EĞİTİM (❌ → ✅)
```
Tetikleyiciler:
  - Sertifika bitiş tarihi yaklaşıyor (30/7 gün)
  - Denetimde düşük skor → ilgili eğitim eksik
  - Onboarding'de takılan personel
  - Quiz başarısız (2+ deneme)

Çözüm Aksiyonları:
  - Eğitim otomatik ata
  - Mentor'a hatırlatma
  - Coach'a onboarding raporu
```

### E. CHECKLİST (❌ → ✅)
```
Tetikleyiciler:
  - Açılış checklistesi tamamlanmadı (09:00'a kadar)
  - Kapanış checklistesi tamamlanmadı
  - Checklist skoru düşük trend
  - Fotoğrafsız tamamlama (sahte mi?)

Çözüm Aksiyonları:
  - Personele anlık hatırlatma
  - Supervisor'a bildirim
  - Sahte tamamlama uyarısı
```

### F. CRM (❌ → ✅)
```
Tetikleyiciler:
  - NPS 7 gün üst üste düştü
  - Şikayet paterni (aynı konu 3+ şikayet)
  - Çözülmemiş şikayet ticket'ı (SLA)
  - Müşteri feedback'i çok düşük (1-2 puan)

Çözüm Aksiyonları:
  - Kök neden analizi (pattern → mesaj draft)
  - Supervisor'a acil bildirim
  - Coach'a trend raporu
```

### G. FABRİKA (❌ → ✅)
```
Tetikleyiciler:
  - Yarınki üretim planı oluşturulmadı
  - QC red oranı %5 aştı
  - LOT SKT yaklaşıyor
  - Fire oranı hedefin üstünde
  - Hammadde stoku kritik

Çözüm Aksiyonları:
  - Üretim planı taslağı (geçen haftadan)
  - FIFO sevkiyat planı
  - Hammadde sipariş önerisi
  - QC raporu + eğitim önerisi
```

### H. ONBOARDING (❌ → ✅)
```
Tetikleyiciler:
  - Yeni personel 3+ gün adım tamamlamadı
  - Check-in yapılmadı
  - Quiz başarısız

Çözüm Aksiyonları:
  - Mentor'a hatırlatma
  - Trainer'a rapor
  - Personele teşvik mesajı
```

### I. İK (❌ → ✅)
```
Tetikleyiciler:
  - İzin bakiyesi bitmek üzere
  - PDKS eksikleri (bordro hesaplanamaz)
  - Yüksek turnover riski (skor + devam düşük)

Çözüm Aksiyonları:
  - Muhasebe'ye PDKS eksik raporu
  - İK'ya turnover risk uyarısı
```

---

## 8. VERİ KALİTESİ TAKİBİ (En Kritik)

### Problem: Veri kötüyse Dobody yanlış karar verir.
### Çözüm: Dobody'nin İLK önceliği veri kalitesi kontrolü.

```
Veri Kalitesi Kontrolleri:
  - "Batman şubesinden 5 gündür PDKS verisi gelmiyor" → ACİL
  - "Kilis checklistleri %100 tik — sahte olabilir" → UYARI
  - "Stok sayımı 30 gündür yapılmadı" → ÖNEMLİ
  - "3 şubenin kiosk'u offline" → ACİL

Bu kontroller diğer tüm önerilerden ÖNCE gelir.
Veri eksik olan şube için Dobody öneri ÜRETMEZ.
Bunun yerine: "Veri eksik — önce veri kalitesini düzeltin" der.
```

---

## 9. ÖZEL DURUMLAR

### Yeni Şube (İlk 30 gün — Onboarding Modu)
```
Dobody daha yumuşak tonla çalışır
Daha fazla rehberlik, daha az ceza
"Vardiya planı oluşturmayı unutmayın — nasıl yapılır: [link]"
```

### Tatil/Özel Günler
```
Ramazan: vardiya kuralları farklı
Bayram: şubeler kapalı → uyarı bastırılır
Yaz sezonu: turist bölgeleri ek personel önerisi
```

### Kapanan/Askıya Alınan Şube
```
Pasif şube için Dobody önerisi üretilmez
Stok transferi önerisi (kapanan → aktif şubeye)
```

---

## 10. ÖĞRENME VE GELİŞİM

### Kısa Vadeli (Her onay/ret)
```
Onay → güven +2, o pattern'i tekrarla
Ret (gereksiz) → tetik eşiğini yükselt
Ret (zamanlama) → farklı saat/gün dene
Ret (yanlış) → o veri kaynağını kontrol et
```

### Orta Vadeli (Aylık analiz)
```
Hangi workflow en çok kabul ediliyor? → ağırlığını artır
Hangi şube en çok ret ediyor? → o şube için önermeyi azalt
Hangi saat dilimi en çok onay alıyor? → o saatte öner
```

### Uzun Vadeli (6-12 ay)
```
Güven %90+ ve 10+ öneri = otonom eşik
Otonom: Dobody aynı tip aksiyonu onaysız uygular, sadece bildirir
"Süt siparişi otomatik oluşturuldu (her zamanki miktar)"
```

---

## 11. GÜVENLİK (Girdi Scope + Aksiyon Scope)

### Çift Katmanlı Güvenlik:
```
Katman 1 — Girdi: Dobody hangi veriyi okuyabilir (mevcut)
Katman 2 — Aksiyon: Dobody hangi işlemi yapabilir (YENİ)

Örnek: Supervisor Dobody'si
  OKUR: kendi şube vardiya, stok, checklist, ekipman
  YAPAR: send_reminder, create_shift (kendi şubesinde)
  YAPAMAZ: create_order (satınalma yetkisi), schedule_audit (HQ yetkisi)
```

---

## 12. TEKNİK MİMARİ

### Mevcut (çalışıyor):
```
dobody_scopes              — rol bazlı erişim kuralları
dobody_proposals            — öneri sistemi
dobody_events              — olay kaydı
dobody_learning            — öğrenme kaydı
dobody_workflow_confidence  — güven skoru
```

### Eklenecek:
```
dobody_action_log          — gerçekleştirilen aksiyonlar (INSERT/UPDATE kaydı)
dobody_group_proposals     — gruplu öneri (16 şube = 1 grup öneri)
dobody_escalation_chain    — escalation zinciri (kim → kim → kim)
dobody_context_templates   — GPT-4o prompt şablonları (bağlama özel mesaj)
dobody_special_periods     — özel dönemler (tatil, Ramazan, sezon)
```

### Aksiyon Yürütme Motoru (YENİ):
```
Kullanıcı "Onayla" tıklar
  → action_executor.ts çağrılır
  → suggestedActionType'a göre:
     send_message → notifications INSERT
     create_order → purchase_orders INSERT
     assign_training → training_assignments INSERT
     create_shift → shifts INSERT
     ...
  → dobody_action_log'a kaydet
  → Kullanıcıya "İşlem tamamlandı" bildirim
```

---

## 13. UYGULAMA PLANI (Sprint'ler)

### Sprint Dobody-5: Aksiyon Yürütme Motoru (2 gün)
- action_executor.ts: onay sonrası gerçek DB işlemi
- dobody_action_log tablosu
- send_message + create_order + assign_training aksiyonları

### Sprint Dobody-6: Eksik Modül Bağlantıları (3 gün)
- Vardiya event'leri (plan eksik, geç kalma)
- Stok event'leri (kritik seviye, SKT)
- Ekipman event'leri (bakım gecikmesi, tekrar arıza)
- Checklist event'leri (tamamlanmamış, düşük skor)

### Sprint Dobody-7: Gruplu Aksiyon + Escalation (2 gün)
- dobody_group_proposals tablosu
- Toplu mesaj / toplu atama UI
- Escalation zinciri (2→4→7 gün)

### Sprint Dobody-8: CRM + Fabrika + Proaktif (2 gün)
- CRM event'leri (NPS düşüş, şikayet paterni)
- Fabrika event'leri (üretim planı, QC, SKT)
- Proaktif stok tahmini (tüketim hızı)

### Sprint Dobody-9: GPT-4o Entegrasyonu (2 gün)
- Bağlama özel mesaj üretimi
- Kök neden analizi
- Cross-branch karşılaştırma önerileri

### Sprint Dobody-10: Veri Kalitesi + Özel Dönemler (1 gün)
- Veri kalitesi kontrol endpoint'i
- Tatil/özel dönem takvimi
- Yeni şube onboarding modu

---

## 14. OTONOMİ YÜZDESI TAHMİNİ

```
Şu an (Dobody 1-4):                    ~25%
+ Aksiyon yürütme motoru (Sprint 5):    ~35%
+ 4 yeni modül bağlantısı (Sprint 6):  ~45%
+ Gruplu aksiyon + escalation (Sprint 7): ~55%
+ CRM + Fabrika + Proaktif (Sprint 8):   ~60%
+ GPT-4o entegrasyonu (Sprint 9):        ~65%
+ Veri kalitesi + özel dönem (Sprint 10): ~68%
+ 6 ay öğrenme sonrası:                  ~75%
```
