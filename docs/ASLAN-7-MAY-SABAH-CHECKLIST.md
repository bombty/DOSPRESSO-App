# ☀️ 7 May 2026 Perşembe — Aslan Sabah Checklist

> **Hazırlayan:** Claude (6 May gece otonom mesai sonu)
> **Hedef:** 7 May günsonu pilot için tüm acil blocker'ları çözmek

---

## ⏰ Saat 09:00 — Kahvaltı Sonrası: 5 Dakikada Toparlanma

```
1. Bu dosyayı oku (5 dk)
2. WhatsApp'ta Mahmut'a "Bugün/yarın 30 dk müsait misin?" mesajı (1 dk)
3. Replit'e git, son durum kontrol (2 dk)
```

---

## ⏰ Saat 09:10 — 3 PR Mergele (10 dk)

Sırayla aç ve "Squash and merge" tıkla:

### 1️⃣ TGK Compliance Audit
https://github.com/bombty/DOSPRESSO-App/compare/main...claude/sprint-12-p19-tgk-verification-2026-05-06

**Ne içeriyor:** TGK 2017/2284 mevzuatı + DOSPRESSO etiket motoru karşılaştırması. Compliance skoru **73.5/100** (pilot için yeterli, post-pilot iyileştirme listesi var).

### 2️⃣ e-Fatura Post-Pilot Plan
https://github.com/bombty/DOSPRESSO-App/compare/main...claude/sprint-12-p20-efatura-postpilot-plan-2026-05-06

**Ne içeriyor:** 1 Temmuz 2026 yasal son tarih, Sprint 18-20 implementasyon planı, ROI Y1 +785,000 TL.

### 3️⃣ PENDING v4 + Devir Final V2
https://github.com/bombty/DOSPRESSO-App/compare/main...claude/sprint-12-closing-pending-v4-2026-05-06

**Ne içeriyor:** Bütün PENDING güncellemesi + son devir-teslim raporu.

---

## ⏰ Saat 09:20 — Replit Deploy (15 dk)

Replit Agent'a bu prompt'u ver:

```
Main güncel — 3 yeni PR var (P-19 TGK audit, P-20 e-Fatura plan, PENDING v4).

ADIMLAR:
1. git pull origin main
2. bash scripts/install-git-hooks.sh
3. npm run build
4. Workflow restart

DOĞRULA:
- GET /api/health → 200
- Admin login + GET /api/admin/hq-users-pin-status → 200 (19 user)
- /admin/hq-pin-yonetimi sayfası açılıyor mu?

Sonuçları raporla.
```

Beklenen: ~10 dk içinde "Deploy başarılı" mesajı.

---

## ⏰ Saat 09:35 — 🔴 KRİTİK: HQ PIN Set + WhatsApp (45 dk)

**Pilot için tek kritik blocker.** 12 May'a kadar bitmesi şart, **bugün yapılırsa rahat**.

### Adım 1: Sayfa Aç (1 dk)
iPad'inden: `https://[replit-url]/admin/hq-pin-yonetimi`

### Adım 2: 19 HQ User Listesi Geldi mi? (1 dk)
- 19 satır görmelisin
- Sıralama: admin → ceo → cgo → diğer alfabetik

### Adım 3: Her Biri İçin 4 Haneli PIN Belirle (15 dk)

**Tavsiye:** Memorable ama tahmin edilemeyen rakamlar. Örnekler:
- Doğum yılı son 4 hane (1985 → 9851 ya da çevir)
- Ev numarası
- Anlamlı bir tarih (evlilik yıldönümü vs.)
- Telefon numarası ortası 4 hane

**ÖNEMLİ:** Aynı PIN'i 2 kullanıcıya verme. Tablonun sağındaki kutucuklara her biri için ayrı PIN gir.

### Adım 4: "Toplu Reset" Butonu (1 dk)
Mavi buton tıkla → confirm → ~5 sn'de "X kullanıcının PIN'i sıfırlandı" toast.

### Adım 5: "PIN Listesini Kopyala" (5 dk)

Buton tıkla → panoya yapışır. Format:
```
HQ Kiosk PIN Listesi
==================================================

Aslan (👑 CEO): 1234
Mahmut (📊 Muhasebe/İK): 5678
Yavuz (⚽ Coach): 9012
Sema (🎯 CGO): 3456
... (19 satır)

⚠️ GÜVENLİ DAĞITIM:
- Her kullanıcıya WhatsApp DM ile gönder
- Grup chat'inde paylaşma
- 30 gün içinde herkes kendi PIN'ini değiştirsin
```

### Adım 6: WhatsApp DM Dağıtımı (20 dk)

**ÖNEMLİ:** **Grup'a değil, her kullanıcıya özel DM gönder.**

Mesaj şablonu:
```
Merhaba [İsim],

DOSPRESSO platformu kiosk PIN'in: [PIN]

Pilot 18 May Pazartesi 10:00'da canlıya çıkıyoruz.
- Bu PIN'i unutma 🔒
- Kimseyle paylaşma
- Pilot Day-1'de kioska giriş için kullanacaksın
- 30 gün sonra kendi PIN'ini değiştirebilirsin

Sorun olursa bana yaz.

Aslan
```

### Adım 7: Tamamlandı! (2 dk)
Tablo'da "PIN Durumu" kolonunda hepsi ✅ olmalı.

---

## ⏰ Saat 10:30 — Replit P-7 Migration EXECUTE (30 dk)

Replit Agent'a (sabah verdiğim prompt — yine aynı):

```
DOSPRESSO Sprint 10 P-7 — HQ Kiosk PIN Migration EXECUTE

Aslan onay verdi (A seçeneği). Plan mode + isolated task agent + pg_dump zorunlu.

ADIMLAR (sırayla):

1. git pull origin main (zaten yapıldı)
2. bash scripts/install-git-hooks.sh (zaten yapıldı)
3. Workflow restart (zaten yapıldı)

4. Smoke test (1 dk):
   - GET /api/health → 200
   - Admin login + GET /api/admin/hq-users-pin-status → 200 (19 user)

5. Plan mode + isolated task agent (Sprint 8a/8b/8c pattern):

   PRE_CHECK SQL:
   SELECT COUNT(*) FROM users
   WHERE role IN ('admin','ceo','cgo','ceo_observer','muhasebe_ik',
                  'satinalma','kalite_kontrol','marketing','teknik',
                  'trainer','coach','destek','yatirimci_hq')
     AND is_active = true;
   -- Beklenen: 19

   pg_dump backup AL:
   pg_dump > backups/pre-sprint-10-p7-migration-2026-05-07.sql

   EXECUTE migration:
   migrations/2026-05-06-sprint-10-p7-hq-kiosk-pin-bcrypt-migration.sql

   POST_CHECK:
   SELECT COUNT(*) FROM branch_staff_pins WHERE branch_id = 23;
   -- Beklenen: 19 (değişmemeli — sen UI'dan reset ettin, sayı aynı)

6. Çıktıyı raporla
```

---

## ⏰ Saat 11:00 — Mahmut Çağrısı (30 dk)

WhatsApp veya telefon ile Mahmut'a:

> "Mahmut Bey, pilot 18 May'a hazırlık için 5 dakikalık bir yardımına ihtiyacım var. Şubat veya Mart 2026 bordrolarından **5 farklı pozisyon için BRÜT maaş rakamlarını** söyleyebilir misin? (Örn: stajyer, supervisor, müdür, vb.) — Sistemim ile karşılaştırıp doğrulayacağız."

Aldığın 5 brüt rakamı bana iletirsen (WhatsApp'a yapıştır), tax-calculator'ı kalibre ederim. ~10 dk sürer.

---

## ⏰ Saat 12:00 — Öğle Arası ☕

Bu noktada pilot için **3 kritik blocker** çözülmüş olur:
- ✅ HQ PIN dağıtımı tamam
- ✅ Sprint 10 migration EXECUTE
- ✅ Mahmut bordro doğrulama başlatıldı

---

## ⏰ Saat 14:00 — Cuma Hazırlık

### P-11 Pilot Day-1 Dry-Run (Cuma 14:00-18:00)

4 lokasyon için onay al:
- **Işıklar #5:** Recep (sabah açılış) — saat 14:00-14:30
- **Lara #8:** Andre (yatırımcı + müdür) — 14:30-15:00
- **HQ #23:** Mahmut + sen — 15:00-15:30
- **Fabrika #24:** Eren — 15:30-16:00

Her birine WhatsApp:
```
[İsim], pilot Day-1 öncesi 30 dakikalık dry-run yapacağız.
9 May Cuma saat [SAAT] uygun mu?
```

---

## 📊 Günsonu Hedefi (7 May 18:00)

| ✓ | Yapılacak | Süre |
|---|---|---|
| ✓ | 3 PR mergele | 10 dk |
| ✓ | Replit deploy | 15 dk |
| ✓ | HQ PIN set + WhatsApp dağıt (19 kişi) | 45 dk |
| ✓ | Replit P-7 migration EXECUTE | 30 dk |
| ✓ | Mahmut bordro çağrı | 30 dk |
| ✓ | Cuma dry-run randevu (4 lokasyon) | 30 dk |
| **Toplam** | | **~2.5 saat** |

---

## 🚨 Kritik Önceliklendirme

Eğer zaman kısıtlıysa, bu sırayla yap:

1. 🔴 **HQ PIN dağıtım** (pilot blocker — 12 May deadline)
2. 🔴 **3 PR mergele** (kod versiyonlama)
3. 🟠 **Replit P-7 migration** (audit trail)
4. 🟠 **Mahmut çağrısı** (Cuma deadline)
5. 🟡 **Cuma dry-run randevu** (10 May'a kadar zaman var)

---

## 🌟 Bonus: Eğer Vakit Kalırsa

### Sprint 12 P-22 — KVKK Aydınlatma Metni (Pilot Day-1 öncesi)

Şube ekranlarında (kiosk login öncesi) görünmesi gereken metin. Şablon:

```markdown
🛡️ DOSPRESSO Kişisel Veri Aydınlatma Metni

Bu kiosku kullanmanız sırasında:
- Adınız, soyadınız, vardiya bilginiz işlenir
- Veriler 5996 sayılı kanun ve KVKK kapsamında saklanır
- Detaylı politika: dospresso.com/kvkk

Devam etmek için "Anladım"a tıklayın.

[Anladım — Devam Et]
```

Bu metin docs/KVKK-VERI-ISLEME-POLITIKASI.md'den uyarlandı. Pilot Day-1 öncesi (15 May'a kadar) şube ekranlarına eklenmesi gerek.

---

**Hazırlayan:** Claude (otonom 7 saat mesai sonrası — saat 00:15)
**Tarih:** 7 May 2026 Perşembe için
**Pilot:** 18 May 2026 Pazartesi 10:00 (11 gün kaldı)

İyi günler Aslan ☀️ — bu listeyi tamamlarsan pilot için %95+ hazır olursun.
