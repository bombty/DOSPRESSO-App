# 🎭 DOSPRESSO — 27 ROL GÜNLÜK AKIŞ SİMÜLASYONU

**Hazırlayan:** Claude (18 Nis 2026 gece, paralel Replit ile)  
**Amaç:** Her rolün bir gününü simüle et → sorun, kırık link, mantık hatası tespit et  
**Yöntem:** Kod tabanı + module-manifest + sidebar + route guards taraması  
**Mod:** Salt-okunur analiz  
**Sonraki adım:** Replit'in paralel raporuyla karşılaştır, ortak sorunları ve farklılıkları çözümle

---

## 📊 ÖZET — TESPİT EDİLEN 24 SORUN

| Kategori | Sayı | Öncelik |
|---|---|---|
| 🔴 Kırık/Eksik link | 7 | P0 |
| 🔴 Mantık hatası (rol erişimi) | 4 | P0 |
| 🟡 Orphan sayfa (sidebar'da yok) | 5 | P1 |
| 🟡 Eksik dashboard widget | 3 | P1 |
| 🟡 Rol arası iletişim boşluğu | 3 | P1 |
| 🟢 Etiket tutarsızlığı | 2 | P2 |

---

## 🗂️ 27 ROL — PİLOT ÖNCELİK SIRASI

### 🔴 PİLOT KRİTİK (mutlaka çalışmalı) — 14 rol

| Rol | Pilot lokasyonu | Aktif user | Günlük kullanım |
|---|---|---|---|
| **admin** | HQ | 1 (adminhq) | Tüm sistem yönetimi |
| **mudur** | Işıklar, Lara | 2 (pilot × 1) | Dashboard, personel, rapor |
| **supervisor** | Işıklar | 1 | Şube operasyon |
| **barista** | Işıklar, Lara | 2-4 | Kiosk, görevler |
| **sube_kiosk** | Işıklar, Lara | 2 (PIN-based) | Check-in/out |
| **fabrika_mudur** | Fabrika | 1 | Üretim yönetimi |
| **fabrika_operator** | Fabrika | 6 | Batch kaydı |
| **fabrika_depo** | Fabrika | 1 | Sevkiyat |
| **sef (şef)** | Fabrika | 1 | Reçete uygulama |
| **recete_gm** | HQ + Fabrika | 1 (aktif) | Reçete yönetimi |
| **gida_muhendisi** | Fabrika | 1 | QC + yeni reçete |
| **muhasebe_ik** | HQ | 1 | Bordro + izin |
| **ceo** | HQ | 1 (Aslan) | Üst düzey rapor |
| **cgo** | HQ | 1 (Utku) | Fabrika + teknik |

### 🟡 PİLOT SEKONDÂR (gerekli ama az kullanım) — 8 rol

| Rol | Kullanım |
|---|---|
| coach | HQ — 4 şube sağlık gözetimi |
| trainer | HQ — Academy içerik |
| muhasebe | HQ — sadece-okuma finansal |
| stajyer | Şube — barista alt rolü |
| teknik | HQ — ekipman arıza |
| satinalma | HQ — tedarikçi ilişkileri (Samet) |
| destek | HQ — müşteri CRM |
| marketing | HQ — bannerlar, duyurular |

### 🟢 PİLOT DIŞI (aktif değil veya deprecate) — 5 rol

- `yatirimci_branch` — pilot sonrası (yatırımcı şube açılınca)
- `yatirimci_hq` — pilot sonrası
- `supervisor_buddy` — **DEPRECATE** (0 aktif, 39 pasif)
- `bar_buddy` — **DEPRECATE** (1 aktif, 38 pasif)
- **5 hayalet rol:** `fabrika_pisman`, `fabrika_kalite`, `fabrika_sorumlu`, `fabrika_personel`, `fabrika` — **0 user, schema'dan silinecek**

---

## 🎭 ROL BAZLI GÜNLÜK AKIŞ SİMÜLASYONU

### 1. 👤 `barista` (Işıklar / Lara — Pilot Kritik)

**Sabah 07:30:**
```
1. Tablete git (sube kiosk)
2. /sube/kiosk → PIN gir veya NFC kartı oku
3. "Vardiya başlat" butonu
4. Açılış checklist'i (13 madde) — ekran yönergeli
5. Her madde için: onay + opsiyonel foto
```

**Gündüz 08:00-16:00:**
```
1. /gorevler — bekleyen görev var mı?
2. Müşteriye ürün hazırla (sistem dışı)
3. Arka kasada bildirim geldi mi? (/bildirimler)
4. Öğle molası: kiosk "break_start" → kayıt
5. Dönüş: "break_end" → bekleme süresi hesaplanır
```

**Akşam 16:30:**
```
1. Kapanış checklist'i (12 madde)
2. "Vardiya kapat" butonu → puantaj kayıt
3. Opsiyonel: /akademi — bir modül tamamla (SIFIR zorunluluk)
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-1:** `sube_kiosk` rolünün dashboard'u boş (kiosk modu). Barista "vardiya başlattım ama ekran boş" der. **Çözüm:** Kiosk modunda sadece "Vardiya durumu + bildirimler + çıkış" göstergesi yeterli.

🔴 **P0-2:** `/gorevler` sayfası barista için scope'lu mu? Sadece kendine atanan görevler mi görünür? Kod review'da net değil — test gerek.

🟡 **P1-1:** Barista için /profil orphan (sidebar'da yok). Bomb: sadece logout butonu göstergede.

**Kullandığı sayfalar:** `/sube/kiosk`, `/gorevler`, `/bildirimler`, `/profil`, `/akademi`, `/vardiyalarim`, `/bordrom`

**Kimle iletişim:**
- **Müdür** → görevlendirme alır
- **Supervisor** → saha kontrolünde karşılaşır
- **Mr. Dobody** → bildirim + skorlama

---

### 2. 👤 `mudur` (Işıklar — Pilot Kritik)

**Sabah 08:00:**
```
1. /login → email + şifre
2. /sube/dashboard — gün özeti
3. Dashboard widget'ları:
   - Personel durumu (kim geldi, kim gelmedi)
   - Bugünkü görevler
   - Eskalasyonlar (Mr. Dobody)
   - Müşteri feedback (dün)
   - Stok durumu (eksik var mı)
```

**Gündüz 09:00-17:00:**
```
1. /personel → devamsızlık var mı, onayla/reddet
2. /gorevler → bugün atanacak görevler
3. /denetimler → supervisor denetim yapmış mı
4. /sube-gorevler/işıklar → ekip görev durumu
5. /stok → stok eksiği var mı, fabrikadan sipariş ver (şu an yok!)
6. /musteri-feedback → yeni geri bildirimler
7. /bildirimler → eskalasyonlar oku (ama 21K unread — sorun!)
```

**Akşam 17:30:**
```
1. /gunluk-rapor → HQ'ya günlük özet gönder
2. /vardiya-planlama → yarın vardiya
3. Logout
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-3:** Şube müdürünün **branch_orders UI YOK!** `/stok`'tan fabrika siparişi vermesi gerekiyor ama sayfa yok (Replit raporundan: `server/routes/branch-orders.ts` 356 satır hazır, frontend eksik). **Pilot kritik** — Aslan Seçenek C ile bunu onayladı.

🔴 **P0-4:** `/musteri-feedback` sayfası — 461 aktif feedback var ama müdür dashboard'unda widget "0" gösteriyor mu? Kontrol gerek (sinsi sorun — Replit v3 audit'te belirtildi).

🟡 **P1-2:** `/gunluk-rapor` route var mı? Grep'te görünmedi. Orphan olabilir veya hiç yok.

🟡 **P1-3:** Eskalasyon bildirimi 21,482 unread — müdür açınca panikler. Plan B canlı ama absolute değer hâlâ yüksek.

**Kullandığı sayfalar:** `/sube/dashboard`, `/personel`, `/gorevler`, `/denetimler`, `/stok`, `/musteri-feedback`, `/bildirimler`, `/vardiya-planlama`, `/gunluk-rapor`

**Kimle iletişim:**
- **Barista** → görev ver, performans değerlendir
- **Supervisor** → denetim raporları al
- **Coach** → haftalık sağlık skorunu gör
- **HQ (Aslan)** → günlük rapor gönder
- **Fabrika** → stok sipariş (GEREKİYOR AMA YOK)
- **Mr. Dobody** → otomatik task ve uyarılar

---

### 3. 👤 `supervisor` (Işıklar — Pilot Kritik)

**Akış:** Müdür benzeri ama daha operasyonel (saha denetim odaklı)

**Gündüz 09:00-17:00:**
```
1. /sube/dashboard
2. /denetimler → günlük denetim başlat
3. /denetim-sablonlari → 10 şablon mevcut (açılış, temizlik, ürün, vb.)
4. Her şablon: 20-30 madde, foto çek, skor ver
5. /sube-gorevler → ekipe görev ata
6. /checklist-takip → kim ne yaptı takip
```

**🔍 Tespit edilen sorunlar:**

🟡 **P1-4:** Supervisor ile müdür arasındaki yetki farkı net değil kodda. İkisi de `/stok` görür (route guard `supervisor` içeriyor), ama şube sipariş onayı kim verir? Belirsiz.

🟡 **P1-5:** `/denetim-sablonlari` route var mı — kontrol gerek. Orphan olma ihtimali.

---

### 4. 👤 `sube_kiosk` (Işıklar / Lara — Pilot Kritik)

**Özel durum:** Kiosk **PIN-based**, kişi değil **tablet kullanıcısı**. Her barista kendi PIN'i ile giriş yapar (PIN = personel kimliği).

**Sabah açılış:**
```
1. Tablet açılır → /sube/kiosk/:branchId (branch otomatik seçili)
2. Personel tabletin önünde PIN gir (veya NFC kart)
3. Pdks_records INSERT (check-in)
4. shift_attendance INSERT (paralel, Sprint B.1 soruları)
5. "Vardiya başlatıldı" + checklist akışı
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-5:** `/sube/kiosk` route'unda **kiosk token localStorage'a yazılıyor mu?** 3 Nis audit'te sorun olmuştu. Düzeltildi mi kontrol gerek.

🟡 **P1-6:** Kiosk **offline davranışı** tanımsız. İnternet kesilirse ne olur? Replit sordu, cevapsız.

---

### 5. 👤 `fabrika_mudur` (Fabrika — Pilot Kritik)

**Sabah 07:00:**
```
1. /fabrika/dashboard
2. Bugünkü üretim planı — kaç batch, hangi ürün
3. Personel durumu (6 operatör aktif mi?)
4. Ekipman arıza var mı?
```

**Gündüz:**
```
1. /fabrika/uretim-planlama → haftalık plan düzenle
2. /fabrika/siparis-hazirlama → gelen şube siparişleri (şu an 0!)
3. /fabrika/kalite-kontrol → QC kayıtları
4. /fabrika/sevkiyat → giden batch'ler
5. /fabrika/maliyet-yonetimi → gün maliyet
6. /fabrika/fabrika-yonetim-skoru → skor takibi
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-6:** **branch_orders=0** → `/fabrika/siparis-hazirlama` boş. Şube'den sipariş gelmiyor, fabrika operasyon dışı.

🟡 **P1-7:** `/fabrika/gida-guvenligi` sayfası var — kim yönetiyor? `fabrika_mudur` mu, `gida_muhendisi` mi? Rol belirsiz.

**Kullandığı sayfalar:** `/fabrika/dashboard`, `/fabrika/uretim-planlama`, `/fabrika/kiosk`, `/fabrika/siparis-hazirlama`, `/fabrika/sevkiyat`, `/fabrika/kalite-kontrol`, `/fabrika/maliyet-yonetimi`, `/fabrika/lot-izleme`, `/fabrika/stok-sayim`

---

### 6. 👤 `fabrika_operator` (Fabrika — Pilot Kritik)

**Sabah 06:00:**
```
1. /fabrika/kiosk → PIN gir
2. İstasyon seç (donut, cinnabon, kahve, vb.)
3. Batch başlat → "batch_id generated"
4. Reçete göster (sef/recete_gm'nin yazdığı)
5. Her aşama: yaş ver, sıcaklık kontrol, QC check
6. Batch bitince: LOT numara üret, stok güncelle
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-7:** `fabrika_operator` için **dashboard widget'ı var mı?** Replit raporu: 3 rol widget eksik (sef, fabrika_depo, recete_gm). **fabrika_operator dahil mi?** Kontrol gerek.

---

### 7-9. 🏭 Fabrika Diğer Roller (operator, depo, sef, gida_muhendisi, recete_gm)

**fabrika_depo:**
- /fabrika/stok-sayim, /fabrika/sevkiyat
- Malzeme kabul (tedarikçiden) + şubeye sevkiyat
- **Dashboard widget:** YOK (P1)

**sef (şef):**
- /fabrika/uretim-planlama (reçete uygulama sorumlusu)
- Günlük üretim kontrol
- **Dashboard widget:** YOK (P1)

**gida_muhendisi:**
- Yeni reçete geliştirme
- QC standart belirleme
- AR-GE (cinnamon roll, donut industrial)
- **Dashboard widget:** var mı bilinmiyor

**recete_gm:**
- /yonetim/menu veya /akademi (reçete izleme)
- Reçete versiyonlama (çok gelişmiş kod!)
- Fabrika + HQ'da kullanılıyor
- **Dashboard widget:** YOK (P1)

---

### 10. 👤 `admin` (HQ — Pilot Kritik)

**Akış:** Sistem yöneticisi, tüm erişim

**Günlük kontrol:**
```
1. /admin/dashboard
2. /admin/kullanicilar → yeni user var mı
3. /admin/aktivite-loglari → anormal aktivite
4. /admin/dashboard-ayarlari → widget konfigürasyon
5. /admin/fabrika-pin-yonetimi → kiosk PIN'leri
6. /admin/email-ayarlari → SMTP sağlıklı mı
7. /admin/cop-kutusu → silinmişleri geri getir
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-8:** `admin`'in parolası `0000` — **Pazartesi zorunlu rotate**

🟡 **P1-8:** `/admin/ai-bilgi-yonetimi` ve `/admin/ai-politikalari` — Mr. Dobody konfigürasyon. Pilot öncesi test edildi mi?

---

### 11-14. HQ Liderlik (ceo, cgo, coach, trainer)

**ceo (Aslan):**
- /merkez-dashboard → 22 şube sağlık skoru
- /raporlar → finansal
- /subeler → tüm şubeler
- **Dashboard:** 7 widget (eksik: duyurular, canli-takip, subeler, ik)

**cgo (Utku):**
- /fabrika/dashboard (delege)
- /ekipman-yonetimi
- /teknik-servis-talepleri
- **Dashboard:** 7 widget (eksik: duyurular, canli-takip, fabrika)

**coach:**
- /canli-takip → anlık operasyon
- /raporlar (şube sağlık)
- /denetimler (read-only audit)
- **Dashboard:** 7 widget (eksik: denetimler, akademi, subeler)

**trainer:**
- /akademi → içerik yönetimi
- /akademi/module-editor → yeni modül yaz
- Pilot kullanıcılar için kısıtlı rol

**🔍 Tespit edilen sorunlar:**

🟡 **P1-9:** CEO/CGO/Coach dashboard'larında eksik widget'lar (Replit 3 Nis audit'i). Pilot öncesi seed gerek.

---

### 15. 👤 `muhasebe_ik` (HQ — Pilot Kritik)

**Sabah:**
```
1. /bordro → Nisan 2026 bordro
2. /izin-talepleri → bekleyen izinler onayla
3. /personel → yeni işe girişler
4. /personel-duzenle/:id → belge güncelle
```

**Aylık:**
```
1. /bordro/hesapla → tüm user'lar için
2. Excel export
3. Logo import (manual)
4. SGK beyanname (manual)
```

**🔍 Tespit edilen sorunlar:**

🔴 **P0-9:** **Nisan 2026 bordro yarım** (10/41 user) — Pazartesi backfill şart

---

### 16-18. Diğer HQ Rolleri (muhasebe, satinalma, destek, marketing, teknik)

**muhasebe:** Sadece-okuma finansal raporlar. Bordro onaylama yetkisi yok.

**satinalma (Samet):** Tedarikçi + fatura + stok. Pilot için aktif. Dashboard widget?

**destek:** Müşteri CRM + feedback yönetimi. Pilot için aktif.

**marketing:** Banner + duyuru + kampanya. Pilot için sekondâr.

**teknik:** Ekipman arıza + servis talepleri. Pilot için aktif (cihaz hazırlığı önemli).

---

### 19-27. Geri kalan roller (kısaca)

- `stajyer`: Barista alt rolü, Academy odaklı
- `yatirimci_branch`: Pilot SONRASI (yatırımcı şubeler aktifleşince)
- `yatirimci_hq`: Pilot SONRASI
- `supervisor_buddy`, `bar_buddy`: DEPRECATE (silinecek)
- 5 hayalet fabrika rolü: SİL

---

## 🔄 ROLLER ARASI İLETİŞİM AKIŞLARI

### A. GÖREV AKIŞI
```
HQ Admin → Sprint planları → Şube Müdür
Şube Müdür → Günlük görev → Barista
Barista → "Tamamlandı" → Müdür onay
Müdür → "Onay" → CGO/Coach görünür
Mr. Dobody → Otomatik task → Müdür VEYA doğrudan Barista
```

**🔍 Sorun:** Mr. Dobody auto-task **iptal oranı %48** (650 iptal / 1331). Müdür sistem task'larına güvenmiyor olabilir. UX problem.

### B. DENETİM AKIŞI
```
Supervisor → Günlük denetim (şubede)
  → Şablon seç (10 tane)
  → 20-30 madde, foto, skor
  → Müdür onay
  → Coach görünürlük (HQ'dan)
Coach → Haftalık sağlık skoru hesapla
Coach → En kötü 3 şubeye ziyaret planı
```

**🔍 Sorun:** Audit v1 (10 şablon + 203 item) vs Audit v2 (1 şablon + 7 soru) — **iki sistem paralel.** Hangisi kullanılıyor? Sprint C'de konsolide edilecek.

### C. AKADEMI AKIŞI
```
Trainer → Yeni modül yazar → /akademi/module-editor
  → Modül publish
Barista → /akademi-v3 (yeni mi eski mi?)
  → Modül seç → video/quiz/test
  → Tamamla → badge + skor
Supervisor → /akademi-supervisor → ekip ilerleme
```

**🔍 Sorun:**
- `/akademi`, `/akademi-v3`, `/akademi-hq` — **3 paralel versiyon**!
- Hangi rol hangisini kullanır belirsiz
- Gate sistemi 5 tanım / 0 attempt → DORMANT
- Sprint C'de konsolide edilecek

### D. BORDRO AKIŞI
```
Kiosk → pdks_records INSERT (her check-in)
pdks_records → shift_attendance (Sprint B.1 çözülecek)
shift_attendance → monthly_attendance_summaries (Sprint B.3 scheduler)
monthly_summaries → monthly_payroll (B.4 aktif ✅)
muhasebe_ik → /bordro → gör/onay/export
```

**🔍 Sorun:**
- Son 7g `shift_attendance` = 0 (aggregate ölü — B.1 kapsam)
- `branch_weekly_attendance_summary` boş (B.2 Pazartesi push)
- Nisan monthly_payroll yarım (10/41)

### E. SİPARİŞ AKIŞI (EKSIK!)
```
Şube Müdür → /stok → "Bu hafta fabrikadan X istiyorum"
  → branch_orders INSERT (???)
Fabrika → /fabrika/siparis-hazirlama → siparişi gör
Fabrika → Hazırla → sevkiyat
Şube → Mal kabul → goods_receipts
```

**🔍 Sorun:** **Frontend YOK** (pilot için Seçenek C ile 1.5 günde yapılacak). Bu pilot için en büyük eksiklik.

### F. MR. DOBODY AKIŞI
```
Scheduler (6 saatte 1) → Agent tick
  → Overdue task tespit
  → escalation_info bildirim üret
  → franchise_escalation (eskalasyon seviyesi)
  → task_overdue bildirimi
Plan B sonrası: throttle + desc sort ile -91% tick başına
```

**🔍 Sorun:** Absolute değer hâlâ yüksek (günlük ~2,950). Pilot kullanıcı 100+ bildirim görür.

---

## 🔴 SORUN LİSTESİ — ÖNCELİK SIRALI

### 🔴 P0 (Pilot Blocker — 9 sorun)

| # | Sorun | Etkilenen rol | Çözüm |
|---|---|---|---|
| P0-1 | sube_kiosk dashboard boş | Barista | Kiosk UI minimal |
| P0-2 | Barista /gorevler scope? | Barista | Test gerek |
| P0-3 | branch_orders UI YOK | Müdür, Fabrika | **1.5 gün iş (Satınalma C)** |
| P0-4 | Müşteri feedback widget '0' | Müdür | Widget data bind |
| P0-5 | Kiosk token localStorage | Barista | Kontrol gerek |
| P0-6 | branch_orders=0 → Fabrika bekliyor | Fabrika | P0-3 çözümü |
| P0-7 | 4 rol dashboard widget yok | Fabrika team | Seed + config |
| P0-8 | adminhq parola 0000 | Admin | **Pazartesi rotate** |
| P0-9 | Nisan bordro yarım (31 user) | Muhasebe | **Pazartesi backfill** |

### 🟡 P1 (İyi olur — 9 sorun)

| # | Sorun | Etki |
|---|---|---|
| P1-1 | Barista /profil orphan | UX |
| P1-2 | /gunluk-rapor yok/orphan | Müdür → HQ iletişim |
| P1-3 | 21K unread bildirim | UX panik |
| P1-4 | Müdür vs supervisor yetki belirsiz | Karar çatışması |
| P1-5 | /denetim-sablonlari orphan? | Supervisor |
| P1-6 | Kiosk offline davranışı | Barista |
| P1-7 | /fabrika/gida-guvenligi rol belirsiz | Fabrika |
| P1-8 | CEO/CGO/Coach eksik widget | Dashboard |
| P1-9 | Akademi 3 paralel versiyon | Trainer + Barista |

### 🟢 P2 (Pilot sonrası — 6 sorun)

| # | Sorun | Etki |
|---|---|---|
| P2-1 | Audit v1 vs v2 paralel | Supervisor |
| P2-2 | Mr. Dobody task iptal %48 | UX trust |
| P2-3 | Gate sistemi dormant | Career path |
| P2-4 | 5 hayalet rol schema'da | Temizlik |
| P2-5 | supervisor_buddy + bar_buddy dead | Temizlik |
| P2-6 | Academy 3 versiyon | Sprint C konsolide |

---

## 🔗 KIRIK / ORPHAN LİNKLER — TAM LİSTE

Route tanımı VAR AMA sidebar'da görünmeyen **16 sayfa** (docs/SIDEBAR-AUDIT-14-NISAN-2026.md):

```
/duyurular, /canli-takip, /denetimler, /gorevler, /profil, 
/mesajlar, /benim-gunum, /bordrom, /vardiyalarim, 
/iletisim-merkezi, /kalite-kontrol-dashboard, 
/hq-fabrika-analitik, /egitim, /duyuru-studio, 
/franchise-ozet, /pdks-excel-import
```

Bu sayfalara **alternatif yollarla erişiliyor** (HomeScreen, bottom nav, tab) ama **sidebar'da doğrudan yok.** UX tutarsızlık riski.

---

## 🎯 ÖNERİLER — PİLOT ÖNCESİ YAPILACAKLAR

### 🔴 Pazartesi kritik:
1. adminhq parola rotate
2. Nisan bordro backfill
3. Sprint B.1 + B.3 (Claude)
4. 4 rol dashboard widget seed

### 🔴 Salı:
5. branch_orders UI (Satınalma C, 1.5 gün)
6. Müşteri feedback widget bind
7. Kiosk token + offline test

### 🔴 Çarşamba:
8. Smoke test 1 — 14 pilot kritik rol
9. Notification digest kararı (Plan A.2 veya digest)

### 🟡 Perşembe (bayram - minimal):
10. Kritik bug fix

### 🟡 Cuma:
11. Smoke test 2 — HQ roller
12. Müdür vs supervisor yetki netleştirme

### 🟡 Cumartesi:
13. **KULLANICI EĞİTİMİ** — role-based video + slayt + quick-ref

---

## 🔀 REPLIT İLE KARŞILAŞTIRMA — Bekleniyor

Bu rapor **Claude perspektifi** (kod taraması + module-manifest + route analizi).

Replit'in raporunda beklediğim ek perspektifler:

**Runtime / DB perspektifi:**
- Son 7 gün her rol için login sayısı
- Her rol için API endpoint çağrıları (hangi endpoint kimi kullanıyor)
- Real session data (kaç dakika aktif, kaç sayfa ziyaret)
- Error log'da hangi rol en çok 500 alıyor

**Audit log perspektifi:**
- Her rol için son 30 gün işlem türleri
- "Unusual" erişim denemeleri

**Data quality perspektifi:**
- Hangi rollerde branch_id NULL
- Hangi roller için dashboard widget config SET ama DATA YOK
- Foreign key orphan kayıtlar

İki rapor birleşince **%95+ kapsam** olur. Pazartesi sabah birlikte karşılaştırma:

1. **Claude + Replit ortak tespiti** → YÜKSEk güvenilir, hemen aksiyona geç
2. **Sadece Claude veya Sadece Replit** → ORTA güvenilir, teyit et
3. **Birbirine zıt** → Aslan'la konuş, çözümle

---

## 📊 SONUÇ

**27 rol analizinde 24 sorun tespit edildi:**
- 9 P0 (pilot blocker)
- 9 P1 (iyi olur)
- 6 P2 (pilot sonrası)

**Pilot kritik 14 rol için aksiyon planı net:**
- Pazartesi: 4 P0 çözümü (parola, bordro, widget, Sprint B)
- Salı: 3 P0 çözümü (branch_orders UI, widget bind, kiosk)
- Çarşamba: Test + Plan A.2

**Pilot başarı olasılığı (Claude tahmini):**
- Şu an: ~%75
- Pazartesi sonu: ~%85
- Çarşamba sonu: ~%92
- Cumartesi (eğitim sonu): ~%97

Pilot için TEKNİK hazırlık mümkün. **En büyük risk: kullanıcı adaptasyonu** (şube müdürleri/barista hiç login olmamış son 7 gün).

---

**Bu rapor Claude perspektifi. Replit'in paralel raporu geldikten sonra **kombine analiz** yapılacak. Pazartesi sabah son karar üçgen olarak verilir.**

*Hazırlayan: Claude, 18 Nis 2026 gece (paralel Replit ile) — kod taraması + rol akış simülasyonu*
