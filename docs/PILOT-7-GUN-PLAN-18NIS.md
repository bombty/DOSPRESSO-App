# 🚨 PİLOT 7 GÜN PLAN — 18 Nis 2026 → 25 Nis 2026

**Durum değişikliği:** Aslan'ın kararı ile pilot başlangıcı **58 gün → 7 gün** sonrasına kaydı. Bu doküman, kalan zamanda yapılması zorunlu işleri 12 perspektiften çıkarır.

**Pilot başlangıç (tahmini):** 25 Nisan 2026 Cumartesi  
**Pilot lokasyon:** HQ + Fabrika + Işıklar + Lara  
**Hazırlık günü:** 7 (Pazartesi 21 - Pazar 27 Nisan)

---

## ⚖️ ŞU ANKİ DURUM — Net Tespit

### ✅ Yapıldı (18 Nis gece)
- B.2 attendance weekly catch-up
- Monthly payroll scheduler (Replit'in orijinali — duplicate temizlendi)
- B.5 yan kazanım: Ocak/Şubat/Mart 2026 bordrolar tamamlandı (20 şube × 287 user)
- Notification spam Plan B: tick başı 135 → 12 (-91%)
- Schema drift: 3 migration uygulandı (factory_product + factory_recipe + inventory_price_history)
- Madde 37 + §17/§18/§19 skill kuralları yazıldı
- 00-DASHBOARD.md sistem hizalama dosyası

### 🔴 Açık P0 (7 gün içinde ZORUNLU)
1. Sprint B.1 yeni kapsam: shift_attendance ↔ pdks_records tutarlılık
2. Sprint B.3: monthly_attendance_summaries scheduler (hâlâ scheduler yok)
3. adminhq parola `0000` rotate
4. Test Branch + Örnek şube sil
5. seed_test 704 PDKS kaydı temizle
6. Nisan 2026 bordro backfill (31 eksik user)

### 🔴 P0 ama 7 GÜNDE KAPALANAMAYAZ (iş kararı gerekli)
- **branch_orders UI** (şube → fabrika sipariş): 1.5 gün iş, pilot için kritik
- **goods_receipts UI** (mal kabul): 1 gün iş, pilot için kritik
- **Pilot kullanıcı profilleri** (4 lokasyon × 3-4 kişi): Aslan'ın sağlayacağı bilgi

### 🟡 P1 (Ertelenebilir, pilot sonrası)
- 3 rol dashboard widget (sef, fabrika_depo, recete_gm) — 0.5 gün
- drizzle-kit push kırığı — 1 saat, workaround var
- 5 hayalet rol temizliği — 1 saat
- Görev tamamlama %22.6 (Mr. Dobody auto-task'ları) — tasarım sorunu
- supervisor_buddy deprecate — 0.5 gün
- session_forced_logout 33 — 1 saat debug

---

## 🎯 7 GÜN DETAYLI PLAN

### GÜN 1 — Pazartesi 21 Nis: VERİ SAĞLIĞI + GÜVENLİK

| Saat | İş | Sahip | Süre |
|---|---|---|---|
| 09:00 | adminhq parola rotate (cli + güvenli parola üretimi) | Aslan | 10 dk |
| 09:15 | Test Branch 1 + Örnek şube sil | Aslan/Replit | 5 dk |
| 09:30 | seed_test 704 PDKS kaydı temizlik (`/pilot-baslat` UI) | Aslan | 15 dk |
| 10:00 | Sprint B.1 yeni kapsam: tutarlılık analizi | Claude + Replit | 2 saat |
| 13:00 | Sprint B.3: monthly_attendance_summaries scheduler | Claude | 1.5 saat |
| 15:00 | Nisan 2026 bordro backfill (31 eksik user) | Replit | 30 dk |
| 16:00 | Duplicate scheduler doğrulama (log'larda tek "started" var mı) | Replit | 15 dk |
| 16:30 | 25 Nisan ölçüm SQL'i (notification regression) — erken ölçüm | Replit | 15 dk |
| **Gün sonu deliverable:** | Tüm P0 veri sorunları çözüldü, güvenlik açığı kapatıldı |  |  |

### GÜN 2 — Salı 22 Nis: SATINALMA AKTİVASYONU

🔴 **Kritik karar gerekli:** Satınalma akışı 2.5 gün iş. 7 günde yapılır ama Feature Freeze'i gerektirir (gerçek özellik, yeni UI + endpoint'ler).

**Seçenek A: Satınalma aktivasyonu 7 gün plana dahil**
- branch_orders UI (1.5 gün) + goods_receipts UI (1 gün)
- Feature Freeze istisnası (Aslan onayı gerekli)
- Pilot'ta gerçek sevkiyat akışı çalışır

**Seçenek B: Satınalma el yordamıyla, pilot'ta Google Sheets**
- 2.5 gün pilot polish'ine gider
- Pilot'ta kullanıcılar Excel/Sheets'te sipariş tutar
- DOSPRESSO bu modülü pilot sonrası 4-6 hafta içinde tamamlar

**Seçenek C: Sadece branch_orders, goods_receipts pilot sonrası**
- 1.5 gün iş
- Pilot'ta şube → fabrika sipariş DOSPRESSO'da, mal kabul elden
- Orta yol

**Benim teknik önerim: Seçenek C** — çünkü:
- Şube müdürünün ana akışı (sipariş verme) çalışır
- Mal kabul fabrikada az frekans (haftada 1-2), Google Sheets idare eder
- Feature Freeze kısmi ihlal (daha az)

### GÜN 3 — Çarşamba 23 Nis: SMOKE TEST ROUND 1

**Amaç:** 4 pilot lokasyon için end-to-end akış testi

**Test senaryoları:**

1. **Barista Günlük Akış (her lokasyon × 2 user)**
   - Sabah kiosk check-in → vardiya başlat
   - Açılış checklist → %100 tamamla
   - Görev kontrolü → aldığın görev var mı
   - Vardiya kapat

2. **Müdür Günlük Akış (her lokasyon × 1 user)**
   - Dashboard → eskalasyonlar
   - Personel yokluk kontrolü
   - Günlük rapor görüntüle
   - Bildirim sayısı makul mü (<50 mi?)

3. **HQ Coach Akış**
   - 4 lokasyon sağlık skoru görme
   - En kötü şube tespit

4. **Fabrika Operatör**
   - Kiosk → istasyon → batch başlat
   - QC kaydı

5. **Muhasebe**
   - Bordro view Nisan
   - İzin onayı (test)

**Kabul kriterleri:**
- Her senaryoda 0 crash
- Her sayfada loading <3 saniye
- Mobile (iPhone + Android) sayfalar açılıyor
- Türkçe karakterler düzgün
- Dark mode sorunsuz

### GÜN 4 — Perşembe 24 Nis: BUG FIX ROUND + KULLANICI HAZIRLIĞI

- Çarşamba testinde çıkan bug'ların fix'i (4 saat buffer)
- Pilot kullanıcı hesapları doğrula (4 lokasyon × 3-4 kişi = 12-16 user)
- Tablet/kiosk cihaz check:
  - İnternet bağlantısı var mı
  - Chrome güncel mi
  - Kiosk login çalışıyor mu
  - NFC kart var mı (personel girişi için)

### GÜN 5 — Cuma 25 Nis: KULLANICI EĞİTİMİ

**Her pilot lokasyon için 45-60 dk online eğitim:**
- Işıklar müdürü + supervisor (45 dk)
- Lara müdürü + supervisor (45 dk)
- HQ — Aslan + IT + muhasebe (60 dk)
- Fabrika — fabrika_mudur + 2-3 operatör (60 dk)

**Eğitim içeriği:**
- Kiosk check-in/out
- Dashboard anlatımı
- Görev ve bildirim yönetimi
- Bordro görüntüleme
- Problem bildirim kanalı

**Pazartesi 21 Nis — bekleyen Aslan aksiyon:** Eğitim materyali yazılacak (video + slayt + 1 sayfalık quick ref).

### GÜN 6 — Cumartesi 26 Nis: SON KONTROL + DEPLOY

- Tüm schedulers çalışıyor mu (10 cron job)
- DB backup alındı mı (rollback noktası)
- Notification spam 7 günlük ölçüm — Plan A.2 gerekli mi?
- Son bug fix (2 saat buffer)
- Replit deploy'u stabil mi (15 dk smoke test)

### GÜN 7 — Pazar 27 Nis: REZERV + GO LIVE

- Son hotfix rezervi (4 saat)
- Pilot başlangıç ekip toplantısı (1 saat)
- 17:00 canlıya geçiş
- 24/7 izleme başla (ilk hafta Aslan + Claude + Replit online)

---

## 🔍 12 PERSPEKTİFTEN RİSK ANALİZİ

### 1. 🏢 İŞ SAHİBİ (Aslan)
**Riskler:**
- Pilot erken → franchise yatırımcılar sistemi beğenmez → itibar zararı
- Satınalma akışı yoksa pilot sırasında Excel'e dönüş → kullanıcı güveni düşer
- 7 gün eğitim süresi **kısa** → pilot kullanıcı kaosa sürüklenebilir

**Mitigasyon:**
- Pilot "test" olarak sun (beta etiketli), kullanıcı beklentisi ayarla
- 1-sayfalık quick reference sheet bırak
- İlk hafta "Claude + Replit + Aslan daima online" taahhüdü

### 2. 👤 SON KULLANICI
**Riskler:**
- Login şimdilik sadece admin/HQ yapıyor (son 7g). Şube müdürleri/baristalar **hiç login olmamış**.
- Cihaz hazırlığı bilinmiyor (kaç tablet, hangi marka, internet hızı)
- Eğitim süresi 45 dk → yetişmez

**Mitigasyon:**
- Pazartesi öncesi her pilot lokasyonla ARA TELEFON GÖRÜŞMESİ (Aslan) — cihaz ve network durumu öğren
- Eğitimi video kaydet, tekrar tekrar izlenebilsin
- WhatsApp destek grubu kur

### 3. 🔧 DEVOPS / SRE
**Riskler:**
- Replit autoscale limiti — 4 şube + HQ + Fabrika = ~50 concurrent user, kaldırır
- Backup stratejisi belirsiz — DB rollback noktası?
- Health check endpoint yok (monitoring ne kontrol edecek?)

**Mitigasyon:**
- Pazartesi Replit'ten: `/api/health` endpoint doğrulama
- DB dump al (haftalık → pilot öncesi 3 snapshot)
- Replit deploy logs izleme kurma

### 4. 🛡️ GÜVENLİK & KVKK
**Riskler:**
- adminhq parola `0000` — hâlâ açık (5 dk iş ama yapılmadı)
- 2FA yok — admin panel risk
- SQL injection test yok
- Rate limit yok (brute force)
- forced_logout 33/hafta — session bug olabilir

**Mitigasyon:**
- Pazartesi adminhq parola rotate (öncelik #1)
- 2FA pilot sonrası (yeni özellik)
- Session bug'ını araştır (1 saat iş)
- Pilot "kapalı beta" — sadece bilinen kullanıcılar erişir

### 5. 📊 VERİ / ANALİTİK
**Riskler:**
- seed_test 704 PDKS kayıt pilot data'sına karışır → yanlış rapor
- branch_id NULL ~25 user → bordro hesaplaması hatalı
- Dashboard widget'larda "0" gösteriliyor (veri var ama bağlı değil)

**Mitigasyon:**
- Pazartesi seed_test temizlik zorunlu
- branch_id NULL user'ları düzelt (Replit 10 dk iş)
- Dashboard widget seed (P1 ama pilot öncesi şart — 0.5 gün)

### 6. 🎨 UX / TASARIM
**Riskler:**
- 215 sayfa — 16 orphan, bazı rol'lerin sidebar'ı fakir
- Mobile breakpoint test edilmemiş
- Loading/Error state tutarsız

**Mitigasyon:**
- Gün 3 smoke test sırasında mobile + dark mode kontrol
- Sadece pilot'ta kullanılan ~20 sayfa detaylı test (diğerlerini pilot sonrası)

### 7. 💰 FİNANS / MUHASEBE
**Riskler:**
- Nisan 2026 bordro yarım (10/41 user) → pilot ay muhasebe kapatamaz
- KDV matrisleri belirsiz
- Franchise royalty hesaplama yok

**Mitigasyon:**
- Pazartesi Nisan bordro backfill zorunlu
- KDV default %18 (donut %1 sonradan düzeltilecek)
- Royalty Sprint I sonrası

### 8. 📱 MOBİL / KIOSK
**Riskler:**
- Cihaz envanteri bilinmiyor
- Offline-first sayfa yok (internet kesilirse işlem durur)
- NFC kart durumu belirsiz

**Mitigasyon:**
- Her pilot lokasyondan Aslan cihaz listesi alıp (Pazartesi önce)
- Pilot sırasında internet zayıf dakikalarda kiosk log'larını kaydet
- Offline-first Sprint I (pilot sonrası)

### 9. 📈 KAPASİTE / ÖLÇEKLEME
**Riskler:**
- 4 lokasyon × ~15 user = ~60 concurrent user. Neon DB connection pool yeterli mi?
- Dashboard queries 4 lokasyon için aggregate — sorun yok
- 22 şube yerine 4 şube → sistem hafif

**Mitigasyon:**
- Pilot'ta gerçek user load'u ilk 24 saat izle
- Slow query log ayarlı (eğer aktif değilse aktif et)

### 10. 🔄 VENDOR / 3RD PARTY
**Riskler:**
- Replit deploy reliability — geçmişte kesinti oldu mu?
- Neon Postgres uptime — SLA nedir?
- OpenAI API kota — Mr. Dobody pilot'ta ne kadar çağırıyor?

**Mitigasyon:**
- Pilot başlangıcı öncesi Replit status page kontrol
- Neon backup alındı mı doğrula
- Mr. Dobody çağrı sayısını 1 hafta monitörde tut

### 11. 🧪 TEST / KALİTE
**Riskler:**
- 0 test dosyası (vitest kurulu)
- Manuel smoke test yeterli mi?
- Regression test yok — pilot'ta bug'lar düzeltildikçe başkası bozulabilir

**Mitigasyon:**
- Gün 3 manuel smoke test senaryoları dokümante et
- Her bug fix'ten sonra **aynı senaryoyu tekrarla**
- Vitest test yazma Sprint F (pilot sonrası)

### 12. 📚 DOKÜMANTASYON
**Riskler:**
- 80+ doküman, kullanıcı için erişilebilir değil
- Quick reference sheet yok
- FAQ yok

**Mitigasyon:**
- Cuma eğitim için 1-sayfalık quick ref yaz
- WhatsApp destek grubunda FAQ topla
- 00-DASHBOARD.md günlük güncelle (iç takım için)

---

## 🚨 KRİTİK KARAR NOKTALARI — Aslan'dan Beklenen

| # | Karar | Seçenekler | Etki |
|---|---|---|---|
| 1 | Pilot 7 gün kararı neden değişti? | Yatırımcı baskısı mı, pazar fırsatı mı? | Plan'ın tüm risk tolerans seviyesini belirler |
| 2 | Satınalma akışı pilot kapsamında mı? | A/B/C seçenekleri | 2.5 gün kapsam farkı |
| 3 | 4 lokasyon aynı anda mı, fazalı mı? | Paralel / Önce Işıklar → 24 saat → Lara... | Risk dağıtımı |
| 4 | Pilot "beta" etiketli mi yoksa "canlı" mı? | Kullanıcı beklentisi | İtibar riski |
| 5 | Rollback kriterleri? | Hangi durumda pilot iptali? | Karar otoritesi |
| 6 | Pilot kullanıcı profilleri? | Her lokasyon kim? | UX adaptasyonu |
| 7 | Mr. Dobody bildirim spam Plan B yeterli mi? | %70 azalma pilot için kabul edilebilir mi? | Plan A.2 gerekebilir |
| 8 | Test süresi 1 gün yeterli mi? | Daha fazla gün gerekir mi? | Plan esnekliği |

---

## 📋 FEATURE FREEZE REVİZYONU

**Eski kural:** 18 Nis → 15 Haz, yeni özellik YOK.

**Yeni gerçek:** Pilot 25 Nis → 8 haftalık freeze yerine **7 günlük sprint**. İki seçenek:

**A) Freeze korunur (tercih ettiğim):** Yeni özellik yok. Sadece bug fix + kapalı işler. Satınalma UI **yeni özellik** sayılır → atla.

**B) Freeze kısmi ihlali:** Satınalma branch_orders UI pilot için zorunlu → istisna yap.

**Ben (A) öneririm** çünkü:
- 7 günde yeni UI + test + eğitim = risk katlanır
- Pilot kullanıcıları "Google Sheets'e sipariş yazma" geçici çözümüne alıştırabiliriz
- Pilot sonrası 2-3 hafta içinde satınalma modülü tam açılır

---

## 💡 BENİM NET ÖNERİM

### Kısa Vadeli Strateji (7 gün)
1. **Satınalma'yı pilot kapsamı dışında tut** (Google Sheets geçici)
2. **Pilot "kapalı beta" etiketi** — kullanıcı beklentisi düşük
3. **4 lokasyon FAZAL** — Önce Işıklar + HQ (27 Nis) → 24 saat izle → Lara + Fabrika (28 Nis)
4. **Feature Freeze kesinlikle korunsun** — sadece bug fix, temizlik, veri düzeltme
5. **Gün 3 test senaryoları Aslan'la birlikte yazılsın** (kimi test ediyoruz netleşsin)

### Risk Tolerans Stratejisi
- Pilot'un ilk 48 saat: P0 bug → anında fix + deploy
- Pilot'un 3-7 günü: P1 bug → ertesi sabah fix
- Pilot başarı kriteri: "7 gün sonunda 4 lokasyonda günlük %70+ aktif kullanım"
- Başarısızlık kriteri: "Kullanıcı 3 gün sistem kullanmıyor" veya "Kritik bug 4 saatte fix edilemedi"

---

## 🎯 SONUÇ

**7 günde pilot başlatmak MÜMKÜN ama RİSKLİ.** Çalışacak plan var, ama:

- Feature Freeze disiplini korunmalı
- Satınalma kapsamdan çıkarılmalı (VEYA Aslan Seçenek B/C onaylamalı)
- Test için en az 1 tam gün ayrılmalı
- Kullanıcı eğitimi minimum 45 dk × lokasyon × 2 kişi

Bu plan **Aslan'ın onayından sonra** uygulanabilir. Teknik karar yetkisi Madde 37'ye göre bende; ancak **pilot tarihi + kapsam iş kararıdır** ve Aslan'a aittir.

---

## 🔄 Sırada — Ne Olmalı?

1. **Aslan kararları** (yukarıdaki 8 karar noktası)
2. **Replit teyit** — bu planla uyumlu mu, ek riskler görüyor mu
3. Onaydan sonra 00-DASHBOARD.md güncellenir
4. Gün 1 (Pazartesi) iş listesi kesinleşir

---

*Hazırlayan: Claude — 18 Nis 2026 gece (pilot 7 gün kararı sonrası)*
*Bir sonraki güncelleme: Aslan onayı sonrası, Pazartesi sabah*
