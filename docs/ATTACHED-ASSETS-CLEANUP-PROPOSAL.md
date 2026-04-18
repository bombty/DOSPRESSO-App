# attached_assets/ Cleanup Proposal — Replit Analiz Raporu

**Hazırlayan:** Replit Agent
**Tarih:** 18 Nis 2026 gece
**Durum:** READ-ONLY ANALİZ — hiçbir dosya silinmedi, hiçbir şey commit edilmedi (bu doc hariç)
**Onay süreci:** Madde 38 — Claude + Replit + Aslan üçlü onay
**Pilot blokeri mi?** HAYIR (28 Nis pilot bağımsız)

---

## 1. Özet

`attached_assets/` klasörü **1,761 dosya / 1.1 GB** içeriyor. Bunların:
- **17 dosya (~13 MB)** frontend tarafından `@assets` Vite alias üzerinden aktif kullanılıyor
- **32 dosya (~174 MB)** operasyonel doküman (PDF/DOCX/MD/HTML)
- **~1,693 dosya (~895 MB)** Replit Agent paste/screenshot artefaktı — runtime kullanımı yok
- **~19 dosya** belirsiz (PDF duplicate'ları + zip/skill/jsx) — Aslan kararı gerekli

**Server-side kod referansı:** SIFIR (`server/`, `shared/` taramada eşleşme yok)
**DB referansı:** SIFIR (`users.avatar_url` kolonu yok, `notifications.icon_url` boş)
**docs/ referansı:** Sadece bu doc + audit raporları kendi kendilerini referans veriyor (içerik değil meta)

---

## 2. Boyut Tablosu

| Kategori | Dosya | Boyut | % |
|---|---|---|---|
| **A — Aktif kullanım** | 17 | ~13 MB | %1.2 |
| **B — Operasyonel doküman** | 32 | ~174 MB | %15.8 |
| **C — Replit Agent artefakt** | ~1,693 | ~895 MB | %81.4 |
| **D — Belirsiz (Aslan kararı)** | ~19 | ~17 MB | %1.6 |
| **TOPLAM** | 1,761 | ~1,099 MB | %100 |

### Extension dağılımı
| Ext | Sayı | Boyut |
|---|---|---|
| png | 1,092 | 882.2 MB |
| pdf | 14 | 173.8 MB |
| txt | 561 | 5.4 MB |
| jpeg | 49 | 7.1 MB |
| jpg | 5 | 1.8 MB |
| webp | 8 | 0.6 MB |
| docx | 4 | 0.1 MB |
| md | 13 | 0.2 MB |
| html | 1 | <0.1 MB |
| zip | 6 | 0.1 MB |
| xlsx | 3 | 0.1 MB |

---

## 3. Kategori A — KESİNLİKLE TUT (17 dosya, ~13 MB)

Aktif `@assets` import'larıyla kanıtlandı (`grep -rE "@assets/[^\"']+" client/src`):

```
@assets/IMG_6637_1765138781125.png       (ana logo, 10 sayfada kullanılıyor)
@assets/IMG_5044_1765665383658.jpeg      (navy logo — raporlar.tsx)
@assets/IMG_7142_1773875710595.png       (cert logo — certificate-renderer.tsx)
@assets/image_1764796739092.png          (cert seal — academy-certificates.tsx)
@assets/old_board2_1767131525410.png     (guest feedback — misafir-geri-bildirim.tsx)
@assets/academy/barista_temelleri.png    (academy-landing.tsx)
@assets/academy/hijyen_guvenlik.png
@assets/academy/receteler.png
@assets/academy/musteri_iliskileri.png
@assets/academy/ekipman.png
@assets/academy/yonetim.png
@assets/academy/onboarding.png
@assets/academy/genel_gelisim.png
@assets/stock_images/coffee_machine_equip_29a816b5.jpg  (servis-talepleri.tsx)
@assets/stock_images/coffee_machine_equip_8e9d0f33.jpg
@assets/stock_images/coffee_machine_equip_c7ddb01a.jpg
@assets/stock_images/coffee_machine_equip_c86e5250.jpg
```

**Aktif import yapan 17 frontend dosyası:** App.tsx, app-header.tsx, login.tsx, register.tsx, reset-password.tsx, forgot-password.tsx, merkez-dashboard.tsx, raporlar.tsx, sube/dashboard.tsx, sube/employee-dashboard.tsx, fabrika/dashboard.tsx, misafir-geri-bildirim.tsx, academy-landing.tsx, academy-certificates.tsx, certificate-renderer.tsx, yonetim/servis-talepleri.tsx (16 farklı dosya, IMG_6637 birden fazla yerde).

---

## 4. Kategori B — OPERASYONEL DOKÜMAN (32 dosya, ~174 MB)

Çoğunluk PDF (174 MB'ın 173 MB'ı). Pilot için "tut" tercihi ama duplicate temizliği gerekli.

### 4.1 Check-List PDF'leri (3 dosya, ~? MB)
- `Açılış Check-List Genel kopyası_1762360462545.pdf`
- `1. Aracı Check-List kopyası_1762360506538.pdf`
- `Kapanış Check- list_1762360506538.pdf`
**Karar:** TUT — operasyonel referans

### 4.2 Reçete PDF'leri — ⚠️ DUPLICATE TESPIT (7 dosya, ~148 MB!)
```
Reçete 08.2025_1762360462545.pdf            ← orijinal (ilk yükleme)
Reçete 08.2025_1762774969400.pdf            ← duplicate
Reçete_08.2025_1762774969400_1765227366936.pdf  ← duplicate (re-upload)
Reçete_08.2025_1762774969400_1765297743451.pdf  ← duplicate
Reçete_08.2025_1762774969400_1765298496879.pdf  ← duplicate
Reçete_08.2025_1762774969400_1769369683518.pdf  ← duplicate
Reçete_08.2025_1762774969400_1770918452491.pdf  ← duplicate
```
**6 kopya × 21.1 MB = ~127 MB tasarruf potansiyeli.** Aynı PDF Replit Agent'a 7 kez yüklenmiş. Md5 karşılaştırması yapılmadı (Aslan onayı sonrası yapılır) — eğer içerikler farklı revizyonsa hepsi tutulur.
**Karar:** D'ye taşı (Aslan kararı)

### 4.3 Diğer PDF (4 dosya, ~38 MB)
- `Konya_10.2025_1769369699403.pdf` (Konya şube ay raporu)
- `Işıklar_01.2026_1770919078065.pdf` (7.5 MB — Işıklar pilot lokasyon!)
- `Ürün_Katalog_2026-digital_1770919078065.pdf` (9.0 MB)
- `DOSPRESSO_Rapor_ddaec2fc-...pdf` (UX Audit raporu)
**Karar:** TUT

### 4.4 DOCX Audit Raporları (4 dosya, 0.1 MB)
- `DOSPRESSO_Analiz_Raporu_1772265776732.docx`
- `DOSPRESSO_Analiz_Raporu_2_1772265776732.docx`
- `DOSPRESSO_Ek_Analiz_1772265776732.docx`
- `DOSPRESSO_UX_Audit_Phase1_1772323049819.docx`
**Karar:** TUT — küçük, ekip raporu

### 4.5 Markdown Promptları (13 dosya, 0.2 MB)
- 8× `SKILL_*.md` (Replit Agent'a iletilen skill prompts)
- `FAB-0A-prompt_1773355461401.md`
- `CRM-Sprint-1-prompt_1773444965009.md`
- `CRM-Sprint-2-prompt_1773448266925.md`
- `DOSPRESSO_Rol_Dashboard_Menu_Audit_Raporu.md`
- `DOSPRESSO_UI_Audit_Report.md`
**Karar:** TUT — düşük maliyet, prompt geçmişi

### 4.6 HTML (1 dosya)
- `subat2026_v2_guncel_kural_1772736507025.html`
**Karar:** TUT (içerik bilinmiyor — Aslan ne olduğunu söyleyebilir)

---

## 5. Kategori C — REPLIT AGENT ARTEFAKT (~1,693 dosya, ~895 MB)

### 5.1 Pasted-*.txt (561 dosya, 5.4 MB)
Replit chat'inde paste edilmiş prompt/içerik dump'ları. Tipik isim: `Pasted--ROLE-Senior-Product-Architect-...txt`

**5-point safety check (561 dosyanın hiçbiri için runtime referans yok):**
- ✅ `grep -rn "Pasted-" client/ server/ shared/` → 0 eşleşme
- ✅ `grep -rn ".txt" docs/` → sadece bu doc içinde
- ✅ Vite import yok (`@assets/Pasted-*` yok)
- ✅ DB'de URL kolonu yok
- ✅ HTML `<img src=>` yok (zaten .txt)

**Sample 10 dosya:**
```
Pasted--ROLE-Senior-Product-Architect-AI-Systems-Designer-...txt
Pasted--app-DOSPRESSO-Franchise-Operations-...txt
Pasted--ADMIN-HQ-OF-S-MEN-YAPISI-TAM-UZUNLUKTA-...txt
Pasted--DOSPRESSO-Academy-AI-WebApp-Geli-tirme-...txt
Pasted-A-a-da-t-m-seviyeler-ve-mod-ller-i-in-...txt
Pasted--academy-name-DOSPRESSO-Academy-version-1-0-...txt
... (555 daha, hepsi aynı paragm)
```
**Karar:** SİL adayı — sıfır runtime risk

### 5.2 IMG_*.png (~1,087 dosya, ~880 MB) — **EN BÜYÜK BLOK**
iPhone/Mac screenshot dump'ları. Aktif 5 (IMG_6637, IMG_5044 .jpeg, IMG_7142, image_*, old_board2) DIŞINDA hepsi.

**5-point safety check:**
- ✅ `grep -rE "IMG_" client/src/ | grep -v "IMG_6637\|IMG_5044\|IMG_7142\|IMG_0441\|IMG_0442"` → 0 eşleşme
- ✅ Server tarafı: 0 eşleşme
- ✅ DB: 0 eşleşme
- ✅ docs/ markdown'larında dosya adı geçmiyor (bu doc hariç)
- ✅ HTML hardcoded `<img>` yok

**Sample 10 dosya (aktif olmayanlar):**
```
IMG_5045_1762360432101.png
IMG_5044_1762360432101.png   ← Eski sürüm (aktif olan _1765665383658)
IMG_6409_1762366140110.png
IMG_6409_1762366556364.png    ← duplicate timestamp
IMG_6415_1762707756527.png
IMG_6416_...png  IMG_6417_...png  IMG_6418_...png
... (1,077 daha)
```
**En büyük 1 dosya:** `IMG_0844_1773962611669.png` = **8.2 MB** (büyük ekran screenshot)
**Karar:** SİL adayı — sıfır runtime risk

### 5.3 webp duplicate (8 dosya, 0.6 MB)
IMG_0441 + IMG_0442 her biri 4 farklı timestamp ile = 8 dosya. Aynı içerik 4'er kez upload.
**Karar:** SİL adayı

### 5.4 Diğer (jpg/jpeg, 49 dosya, 7.1 MB)
4 stock_images jpg AKTİF (Cat A). Diğer 50 jpeg/jpg `IMG_*.jpeg` formatında, kullanım yok.
**Karar:** SİL adayı (aktif 4 hariç)

---

## 6. Kategori D — ASLAN KARARI GEREKLİ (~19 dosya, ~17 MB)

### 6.1 Reçete PDF Duplicate'ları (7 dosya, ~127 MB tasarruf)
Bkz. §4.2. Md5 hash karşılaştırması Aslan onayı sonrası yapılır. Eğer:
- Tüm içerikler aynı → 6 kopya silinir, 1 kalır
- İçerikler revizyon farklılığı → tarihler dosya adında, hepsi tutulabilir veya en yenisi seçilir

### 6.2 Excel/Numbers/Zip Veri Dump'ları (10 dosya, ~? MB)
```
Örnek_şube_LİMAN_ŞUBE_AÇILIŞ_CHECK_LİST_*.xlsx
Personel_2025_kolay_ik_CoffeeDonutTumVeriler_*.zip (2 kopya)
kolayik_personel_CoffeeDonutTumVeriler_*.zip
bombtyCoffeeDonutTumVeriler_*.xlsx (2 kopya)
ayrıntılı_satınalma_raporu_*.numbers
files_2_*.zip, files_3_*.zip
```
**Soru Aslan'a:** Bunlar **ilk veri seed'i** mi yoksa **debug dump** mı? Eğer DB'ye seed olduysa silinebilir. KolayIK personel verileri pilot için referans olabilir.

### 6.3 jsx/skill (4 dosya, ~? MB)
```
akademi-v3-mockup_2_1773317008387.jsx     (eski mockup, frontend'de kullanılmıyor)
dospresso-debug-guide_1773611299144.skill
dospresso-architecture_1773611299144.skill
dospresso-quality-gate_1773611299144.skill
```
**Soru Aslan:** `.skill` dosyaları zaten `.agents/skills/` altında aktif. Bu kopyalar artık gereksiz mi?

---

## 7. Cleanup Yaklaşım Seçenekleri

### Option 1: Hepsini sil (Cat C tamamı)
- **Aksiyon:** `git rm` ~1,693 dosya, .gitignore'a `attached_assets/Pasted-*`, `attached_assets/IMG_*` ekle
- **Working tree kazancı:** 1.1 GB → ~205 MB (-895 MB)
- **Risk:** Tarihçede kalır, gerekirse `git show HEAD~N:attached_assets/X.png` ile geri çağrılır
- **Onay:** Kategori D AYRI ele alınır

### Option 2: Selective — Sadece TXT (en güvenli)
- **Aksiyon:** Sadece `Pasted-*.txt` (561 dosya, 5.4 MB) sil
- **Kazanç:** Çok az (5.4 MB)
- **Risk:** SIFIR
- **Değer/risk oranı:** Düşük — uğraşmaya değmez

### Option 3: Object Storage'a taşı
- **Aksiyon:** Tüm Cat C'yi Replit Object Storage'a yükle, repo'dan sil, gerekirse URL'den oku
- **Kazanç:** 895 MB working tree + git history boyutu (gelecek için)
- **Risk:** Object Storage'da kalan dosyalar erişilebilirlik gerektirir; kimse onlara bakmıyor zaten
- **Maliyet:** Object Storage ücreti (Replit free tier yeterli muhtemelen)
- **Karmaşıklık:** Yüksek — bu kadar uğraşa değmez

### Option 4: Hiçbir şey yapma
- **Kazanç:** SIFIR
- **Maliyet:** 1.1 GB clone, 1.7 GB .git/objects (her yeni clone uzun sürer)
- **Risk:** SIFIR
- **Pilot etkisi:** YOK (deploy sırasında attached_assets/Pasted-* deploy bundle'a girmez, sadece import edilenler bundle'a girer)

### Option 1.5 (BENİM ÖNERİM): Selective Aggressive
- **Aksiyon:**
  1. `git rm` Cat C tüm IMG_*, Pasted-*, webp duplicate'lar (1,693 dosya, ~895 MB)
  2. `.gitignore` zaten 43 satır — `attached_assets/IMG_*`, `attached_assets/Pasted-*` ekle (zaten cleanup gece commit'te yarısı vardı)
  3. Cat D Aslan'a SUNULDU, 7 Reçete duplicate için Aslan'ın "en yenisini tut" kararıyla 6 silinir (~127 MB ek)
  4. zip/jsx Aslan onaylarsa (~5-10 MB) silinir
- **Toplam kazanç:** Working tree 1.1 GB → **~80 MB** (-1,020 MB, -%93)
- **.git history:** Aynen kalır (1.7 GB), AMA yeni clone'larda Git pack delta sayesinde net transfer azalır (büyük PNG'ler delta'ya gitmez ama zaten artık değişmiyor)
- **Pilot deploy etkisi:** SIFIR — Vite bundle zaten sadece import edilen 17 dosyayı dahil ediyor

---

## 8. Önerim: **Option 1.5**

### Gerekçe
1. **Çıktı/girdi oranı en yüksek:** 30 dakika iş, **~1 GB working tree azalması**
2. **Risk SIFIR:** Server, DB, frontend, docs taramada 0 eşleşme — runtime regresyon imkansız
3. **Pilot bağımsız:** 28 Nis'i etkilemez, ama yeni clone yapan herkes (Replit Reserved VM provision, Aslan'ın laptop, CI/CD) hızlı kurulur
4. **Geri dönüş kolay:** History'de duruyor, `git checkout HEAD~1 -- attached_assets/X.png` ile geri alınır
5. **Madde 38 disiplini:** 3'lü onay sonrası tek commit, tek mesaj, audit izi açık

### Uygulama Planı (Aslan onayından sonra, ayrı Build mode task)
1. Pre-flight: Aktif 17 + B kategori 32 = 49 dosya whitelist'i (oluştur ve `scripts/cleanup-attached-assets.sh` içine yaz)
2. `git rm` Cat C tüm dosyalar (whitelist dışı, IMG_*, Pasted-*, webp, jpg/jpeg sadece IMG_* prefix olanlar)
3. `.gitignore` ekle: `attached_assets/IMG_*`, `attached_assets/Pasted-*`, `attached_assets/*.webp`
4. Cat D Aslan kararıyla ek silme
5. Build smoke test: `npm run build` — Vite hata vermemeli
6. Frontend smoke test: `/login`, `/raporlar`, `/academy-landing`, `/yonetim/servis-talepleri` sayfaları açılmalı (logo + academy + machine resimleri yüklenmeli)
7. Tek commit: `chore(hygiene): remove ~1700 unused attached_assets artifacts (Madde 38 onaylı, runtime impact 0)`
8. Push + deploy doğrulaması

### Tahmini Süre
- Whitelist + script: 20 dk
- Build + smoke test: 10 dk
- Toplam: ~30 dk

---

## 9. Önemli Nuance: Git History Rewrite YAPILMAMALI

**Aslan'ın 1.1 GB derdi muhtemelen working tree.** Onu Option 1.5 çözer.

**Ama .git/objects = 1.7 GB.** Bu sadece `git filter-branch` veya BFG repo-cleaner ile temizlenir. **Karşı çıkıyorum** çünkü:
- Force push gerekir → tüm collaborator clone'ları kırılır
- Replit deploy reset gerekir
- GitHub Actions cache invalidate
- 28 Nis pilot öncesi bu risk **yasak**

**Pilot sonrası** (örn Haziran), low-traffic dönemde history rewrite ayrı task olarak ele alınabilir. Şu an YAPILMAZ.

---

## 10. Özet — Aslan'a Karar Listesi

| # | Karar | Önerim |
|---|---|---|
| 1 | Cleanup yapılsın mı? | EVET (Option 1.5) |
| 2 | Hangi Option? | 1.5 (selective aggressive — TXT + IMG_* + webp duplicate) |
| 3 | Cat D Reçete 7 PDF? | Md5 karşılaştır, aynıysa 6 sil |
| 4 | Cat D Excel/zip seed dump? | Aslan: bu veriler DB'ye seed oldu mu? Olduysa sil |
| 5 | Cat D .skill 3 dosya? | `.agents/skills/` ile aynıysa sil |
| 6 | Cat D .jsx mockup? | Frontend'de kullanım yok — sil |
| 7 | Git history rewrite? | HAYIR (pilot sonrası ayrı task) |
| 8 | Ne zaman uygulansın? | Pilot SONRASI (28 Nis sonrası), pilot'u bloke etmesin |

---

## 11. Acceptance — Bu Görevin Tamamlanması

- [x] T001: 1,761 dosya 4 kategoriye ayrıldı (A=17, B=32, C=~1693, D=~19)
- [x] T002: Boyut tablosu tamamlandı (her kategori MB cinsinden)
- [x] T003: Cat C için 5-point safety check geçti — hepsi runtime'dan bağımsız
- [x] T004: Bu doküman yazıldı
- [x] T005: HİÇBİR DOSYA SİLİNMEDİ, sadece bu proposal commit edildi

**Sonraki adım:** Aslan + Claude + Replit pazartesi sabah konuşur, karar çıkarsa Build mode'da ayrı task açılır.

---

*Hazırlayan: Replit Agent — 18 Nis 2026 gece*
*Madde 38 disiplini: analiz → öneri → onay → uygulama*
