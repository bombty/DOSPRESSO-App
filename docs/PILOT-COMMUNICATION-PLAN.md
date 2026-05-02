# DOSPRESSO — Pilot Communication Plan

> **Amaç:** Pilot kullanıcılarla Day-1 öncesi/sırası/sonrası iletişim kanalını, eğitim/duyuru/destek formatlarını netleştirmek.
> **Sahip:** Aslan (owner) + Eren (fabrika) + Sema (gıda mühendisi)
> **Kapsam:** Pilot Day-1'den Pilot çıkışına kadar (~1-3 ay)

---

## 1. İletişim Kanalları

### Birincil: WhatsApp Pilot Grubu

| Alan | Değer |
|---|---|
| **Grup adı** | DOSPRESSO Pilot 2026 |
| **Yönetici** | Aslan + Eren |
| **Üye sayısı** | (PILOT-USER-LIST-2026-05'ten gelir, ~15-25 kişi) |
| **Kurulum tarihi** | _______ (Day-1'den 3 gün önce) |
| **İletişim dili** | Türkçe |
| **Mesaj saatleri** | 08:00 - 22:00 (gece sessiz) |

**Kullanım kuralları:**
- ✅ Sistem hatası bildirimi
- ✅ Duyuru / planlı bakım
- ✅ Hızlı soru-cevap
- ✅ Acil eskalasyon
- ❌ Operasyon detay tartışması (ayrı 1-1 mesaj)
- ❌ Kişisel veri paylaşımı (KVKK)

### İkincil: Telefon (Acil)

Eskalasyon sırası `PILOT-USER-LIST-2026-05.md` Bölüm 9'da.

### Üçüncül: E-mail (Resmi)

| Konu | Alıcı | Format |
|---|---|---|
| Gün sonu rapor | Tüm pilot kullanıcılar | HTML, KPI özet |
| Haftalık retro | Çekirdek ekip | PDF rapor |
| Aylık değerlendirme | Yönetim | Sunum |

---

## 2. Day-1 Öncesi İletişim (Hazırlık)

### T-7 Gün (Day-1'den 1 hafta önce)

- [ ] Pilot kullanıcı listesi finalize (`PILOT-USER-LIST-2026-05.md`)
- [ ] WhatsApp grubu kuruldu, herkes eklendi
- [ ] Davet mesajı atıldı:

**Şablon:**
> "Merhaba [İsim], DOSPRESSO pilot programına katılımın için teşekkürler! 🙏 Pilot Day-1: [tarih]. Bu gruptan tüm güncellemeleri takip edeceğiz. Eğitim videosu yakında paylaşılacak. Soruların için Aslan veya Eren'e direkt ulaşabilirsin."

### T-3 Gün

- [ ] Eğitim videosu paylaşımı (YouTube link veya WhatsApp)
- [ ] Kullanım kılavuzu PDF (`docs/pilot-user-guide-2026-05.pdf` — eksik, hazırlanmalı)
- [ ] Her rol için "Day-1'de şunu yapacaksın" özet

### T-1 Gün (Day-1'den önceki gün)

- [ ] Final hazırlık duyurusu:

**Şablon:**
> "Yarın DOSPRESSO Pilot Day-1! 🚀 Sabah saatlerinde sisteme ilk login yapacaksın. Sorun yaşarsan WhatsApp grubuna yaz, 30 dk içinde dönüş alırsın. İyi şanslar!"

- [ ] Acil iletişim kart paylaşımı (Aslan + Eren tel)
- [ ] Backup verification (Owner)

---

## 3. Day-1 Saatlik İletişim Akışı

| Saat | Kim | Mesaj |
|---|---|---|
| 06:00 | Eren | "Fabrika sabah vardiyası başlıyor. Kiosk giriş test ediyoruz, sorun olursa hemen yaz." |
| 07:30 | Aslan | "İyi sabahlar ekip! 🌅 Pilot Day-1 başladı. WhatsApp grubu açık, ne sorun olursa hemen yaz." |
| 09:00 | Aslan | "Saat 09:00 itibarıyla şube login durumu: [şube X ✅, şube Y ✅, şube Z ⏳]. Eksikler için kontrol ediyorum." |
| 12:00 | Aslan | "Öğlen kontrolü: [N] kullanıcı aktif, [M] hata raporu. Devam edebiliriz." |
| 17:00 | Aslan | "Akşam vardiyası yaklaştı. Vardiya çıkışlarını kiosk'tan unutmayın!" |
| 22:00 | Aslan | "Day-1 sona erdi! Bugünkü kayıtlar: [özet]. Yarın Day-2, eksikler varsa sabah yazın." |

---

## 4. İncident Bildirimi (Pilot Süresince)

### Severity'ye Göre Bildirim Sıklığı

| Severity | Kanal | Sıklık |
|---|---|---|
| **P0** (sistem down) | WhatsApp + telefon | 5 dk içinde herkese |
| **P1** (1 modül/lokasyon down) | WhatsApp grubu | 15 dk içinde |
| **P2** (kozmetik / 1 kullanıcı) | WhatsApp grubu (etkilenen) | 1 saat içinde |
| **P3** (gözlem) | Gün sonu raporda |

### Şablonlar

**P0 — Duraklat:**
> "🚨 ACİL: DOSPRESSO sistem teknik sorun nedeniyle geçici olarak duraksak. Tüm pilot kullanıcılar lütfen kullanıma ARA verin, manuel kayıt tutun. Tekrar başlama bildirimi geldiğinde devam edin. ETA: ~10 dk."

**P0 — Devam:**
> "✅ Sistem geri açık. DOSPRESSO normal kullanıma döndü. Manuel tuttuğunuz kayıtları sisteme girebilirsiniz. Geçen süre için özür dileriz."

**P1 — Kısmi Sorun:**
> "⚠️ DİKKAT: [Modül adı] geçici sorun yaşıyor. [Etkilenen kullanıcı/şube] lütfen şimdilik [alternatif yöntem] kullanın. Düzeltme ETA: ~30 dk."

**Veri Kaybı:**
> "ℹ️ BİLGİ: Saat HH:MM ile HH:MM arası girilen [veri tipi] verileri kaybolmuş olabilir. Lütfen kontrol edin, eksikse tekrar girin. Özür dileriz."

---

## 5. Eğitim Materyalleri (Eksikler)

| Materyal | Format | Durum | Sorumlu |
|---|---|---|---|
| Pilot tanıtım videosu | YouTube/MP4 | ❌ EKSİK | Aslan + Sema |
| Kullanım kılavuzu (genel) | PDF | ❌ EKSİK | Sema |
| Kiosk PDKS rehber | PDF + video | ❌ EKSİK | Eren |
| Reçete + etiket workflow | PDF | 🟡 docs/runbooks/recipe-label-workflow.md var, son kullanıcı versiyonu yok | Sema |
| Mr. Dobody nedir | Video | ❌ EKSİK | Aslan |
| Bordro + PDKS rapor | PDF | ❌ EKSİK | Ümit |

**Risk:** Day-1 öncesi en az **kiosk PDKS rehber** + **kullanım kılavuzu** olmazsa kullanıcılar kafalarında soru işaretiyle başlar.

---

## 6. Geri Bildirim Toplama

### Günlük Mini Anket (Pilot ilk 1 hafta)

WhatsApp'ta her gün saat 22:00:
> "Bugünkü deneyim için 1-5 puan ver: 5 = mükemmel, 1 = berbat. Bir cümle yorum eklersen süper olur. (Sadece Aslan görür)"

### Haftalık Retro Toplantısı

| Alan | Değer |
|---|---|
| **Gün** | Her Pazar 18:00 |
| **Süre** | 30-45 dk |
| **Kanal** | Online (Zoom/Meet) |
| **Katılım** | Çekirdek ekip (5 kişi) |
| **Çıktı** | `docs/audit/pilot-retro-week-N.md` |

### Pilot Sonu Anket

Pilot bitiminde tüm kullanıcılara detaylı anket (Google Forms?):
- Memnuniyet (1-10)
- En sevilen 3 özellik
- En sorunlu 3 özellik
- Sürekli kullanır mısın? (E/H)
- Yorumlar

---

## 7. Mr. Dobody İletişim Politikası (Pilot Day-1)

| Senaryo | Aksiyon |
|---|---|
| Mr. Dobody yanlış görev açtı | Pilot kullanıcı şikayet → WhatsApp grubu → Aslan agent kapat |
| Mr. Dobody çok mesaj gönderiyor | Notification frequency düşür (admin UI) |
| Mr. Dobody yanlış öneri | Geri bildirim toplanır, post-pilot iyileştirme |

**Owner kararı (D3 bekliyor):** Day-1'de Mr. Dobody açık mı kapalı mı?
- **Önerim:** İlk 3 gün kapalı, sonra kademeli aç (görev otomasyonu önce, sonra öneri/uyarı).

---

## 8. KVKK Uyumluluk (İletişim)

- WhatsApp grubu üyeleri yazılı onay vermeli (telefon numarası kullanım)
- Pilot kullanıcı verileri sadece pilot ekibi içinde paylaşılmalı
- Müşteri verisi (CRM) WhatsApp'ta KESİNLİKLE paylaşılmaz
- Personel bilgisi (PDKS, izin) sadece İK + ilgili yönetici görür
- Sema'nın "sağlık raporu sebebi" yazma yasağı (DECISIONS#XX) iletişimde de geçerli

---

## 9. Pilot Sonu İletişim

| T+ | Aksiyon |
|---|---|
| **Pilot bitiş günü** | Teşekkür mesajı + final anket linki |
| **+1 hafta** | Retrospektif rapor (`docs/audit/pilot-retro-final.md`) |
| **+2 hafta** | Pilot kullanıcılarla 1-1 görüşme (3-5 kişi) |
| **+1 ay** | Genel açılış (rollout) duyurusu — pilot dışı kullanıcılara |

---

## 10. İLİŞKİLİ DOKÜMANLAR

- `docs/PILOT-USER-LIST-2026-05.md` — Kim kimle iletişim kuruyor
- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — İncident kayıt
- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — Rollback prosedür
- `docs/DECISIONS.md` — KVKK + iletişim kararları

---

> **Bu plan Day-1'den 7 gün önce devreye alınmalı. WhatsApp grubu kurulumu + eğitim materyali eksiği = Day-1 NO-GO kriteridir.**
