# PERSONEL IMPORT — DRY-RUN RAPORU

**Tarih:** 28 Nisan 2026
**Mod:** READ-ONLY (hiçbir DB write yapılmadı)
**Kapsam:** Lara (id=8), Işıklar (id=5), Fabrika/İmalathane (id=24), Ofis/HQ (id=23)
**Kaynak dosyalar:** `PERSONEL_özlük_app_1777403226993.xlsx`, `Lara_Sube_Maas_2026_1777403226993.xlsx`

---

## 📊 FINAL TABLO — Kaç kişi etkilenecek (sayım özeti)

| # | Kategori | Sayı | Aksiyon |
|---|---|---|---|
| 1 | **Güvenli UPDATE** (yüksek güven eşleşme) | **6** | UPDATE `users` (birth_date, hire_date, department, net_salary) |
| 2 | **Reaktive** (DB'de pasif, Excel'de aktif) | **1** | UPDATE `users` SET is_active=true (BÜŞRA DOĞMUŞ) |
| 2b | **Rol değişikliği** (mevcut user, yeni rol) | **2** | Sema: `recete_gm`→`gida_muhendisi`; Eren Fabrika: last_name='Elmas' (Eren Elmas ile aynı kişi ise) |
| 3 | **Yeni oluşturma adayı** (Excel'de var, DB'de yok) | **21–27** | INSERT `users` (karar sonrası net — +1 Aslan/RGM) |
| 4 | **Pasifleştirme adayı** (DB'de test/demo, Excel'de yok) | **14–19** | UPDATE `users` SET is_active=false, deleted_at=now() (soft-delete; HARD DELETE YOK) |
| 5 | **Owner kararı gerekli** (soyad çakışması veya rol belirsiz) | **8 vaka** (~12-14 kişi etkili) | Karar gelmeden işlem yok |
| 6 | **Pilot user — korunacak** (Excel'de yok ama replit.md pilot) | **2** (mudur5/Erdem, eren/Eren Fabrika) | Dokunma |
| 7 | **Kapsam dışı (kiosk)** | **3** (isiklar, lara, fabrika kiosk hesapları) | Dokunma — insan personel değil |
| 8 | **Kapsam dışı (yatırımcı/CEO/admin/system)** | **1** (yatirimci5/Halil Özkan) | Dokunma |
| 9 | **Diğer şubeler** (Mallof, Markantalya, Beachpark, Gaziantep, Konya, Samsun, Batman, Düzce, Siirt, Kilis, Şanlıurfa, Nizip vs.) | **~326 user** | **Tamamen dokunulmayacak — rapora dahil değil** |
| 10 | **Lara aylık puantaj** (Excel'den 9 kişi × 4 ay) | **36 satır** | INSERT `monthly_payroll` (status='draft', notes='manual_excel_import') |
| 11 | **İşten ayrılma kaydı** | **1** (BUĞRA SAKIZ — 19.02.2026) | INSERT `employee_terminations` |
| 12 | **Maaş history** | ~30 (eşleşen + yeni) | INSERT `employee_salaries` |
| 13 | **Yıllık izin 2026** | ~30 | INSERT/UPSERT `employee_leaves` |
| 14 | **Yan haklar** (kasa tazminatı + yakıt) | ~10-15 | INSERT `employee_benefits` |

### Özet sayım (sadece kapsam içi 4 birim — toplam 46 user):
- ✏️ Etkilenecek: ~**42-50 user** (eşleşme + yeni + pasif)
- 🛡️ Korunacak: ~**4-6 user** (kiosk, yatırımcı, pilot)
- 🌐 Tamamen dışarıda: ~**326 user** (18 diğer şube + admin + service hesapları)

### Hard delete: ❌ YOK
Tüm "silme" aksiyonları **soft-delete** (`is_active=false` + `deleted_at=now()`).
**Sebep:** `users` tablosundan FK CASCADE ile uçacak tablolar:
- `branch_monthly_payroll_summary` (CASCADE) — payroll geçmişi
- `branch_shift_sessions` (CASCADE) — vardiya kayıtları
- `disciplinary_reports` (CASCADE) — disiplin
- `audit_personnel_feedback` (CASCADE) — denetim feedback
- `checklist_completions` (CASCADE) — checklist tamamlama

---

## ✅ Şube ID doğrulama

| Excel etiketi | DB Şube | DB ID | Doğrulandı |
|---|---|---|---|
| IŞIKLAR | Işıklar | 5 | ✅ |
| LARA | Antalya Lara | 8 | ✅ |
| OFİS / HQ | Merkez Ofis (HQ) | 23 | ✅ |
| İMALATHANE / FABRİKA | Fabrika | 24 | ✅ |

---

## 1) Excel'den okunan kişi listesi

### A) `PERSONEL_özlük_app.xlsx` → ÇİZERGE sheet (26 kişi, sıra 9 ve 16 boş)

#### İMALATHANE (Fabrika) — 10 kişi
| Sıra | Ad Soyad | Önerilen Branch | Önerilen Rol | Doğum | İşe Giriş | Maaş özeti | İzin kalan |
|---|---|---|---|---|---|---|---|
| 1 | ARİFE YILDIRIM | Fabrika (24) | fabrika_operator | 26.11.2000 | 23.05.2025 | 5 haneli TL | 0 |
| 2 | ATİYE KAR | Fabrika (24) | fabrika_operator | 01.02.1970 | 24.02.2017 | 5 haneli TL | 10.5 |
| 3 | BÜŞRA DOĞMUŞ | Fabrika (24) | fabrika_operator | 01.01.2000 | 08.08.2023 | 5 haneli TL | 2 |
| 6 | FİLİZ KARALİ | Fabrika (24) | fabrika_operator | 01.06.1970 | 25.07.2018 | 5 haneli TL | 5.5 |
| 7 | GALİP CAN BORAN | Fabrika (24) | fabrika_operator | 27.06.2003 | 18.03.2024 | 5 haneli TL | 14.5 |
| 8 | HATİCE KOCABAŞ | Fabrika (24) | fabrika_operator | 20.10.1978 | 21.07.2025 | 5 haneli TL | 0 |
| 10 | LEYLA SÖNMEZ | Fabrika (24) | fabrika_operator | 01.01.1990 | 01.10.2025 | 5 haneli TL | 0 |
| 12 | MİHRİCAN VEZİROĞLU | Fabrika (24) | fabrika_operator | 12.04.1990 | 29.05.2023 | 5 haneli TL | 0 |
| 13 | MUSTAFA CAN HORZUM | Fabrika (24) | fabrika_operator | 09.07.1997 | 22.01.2024 | 5 haneli TL | 8 |
| 17 | ÜMÜT KOŞAR | Fabrika (24) | **owner decision** (sef/uretim_sefi?) | 10.04.1978 | 17.11.2025 | 5 haneli (yüksek) TL | 0 |

#### OFİS (HQ) — 5 kişi
| Sıra | Ad Soyad | Önerilen Branch | Önerilen Rol | Doğum | İşe Giriş | Maaş özeti |
|---|---|---|---|---|---|---|
| 4 | DIANA NAYFONOVA | HQ (23) | **owner decision** (HQ rolü?) | 03.11.1981 | 20.01.2025 | 5 haneli TL |
| 5 | EREN ELMAS | HQ (23) | **owner decision** | 22.04.1994 | 25.05.2021 | 5 haneli TL |
| 11 | MAHMUT ALTUNAY | HQ (23) | **owner decision** | 05.09.1992 | 24.11.2025 | 5 haneli (yüksek) TL |
| 14 | ŞEVKET SAMET KARA | HQ (23) | **owner decision** | 23.11.1988 | 15.04.2024 | 5 haneli TL |
| 15 | UTKU DERNEK | HQ (23) | **owner decision** (CGO/yönetici?) | 21.06.1991 | 08.09.2015 | 5 haneli (en yüksek) TL |

#### IŞIKLAR — 11 kişi
| Sıra | Ad Soyad | Önerilen Rol | Doğum | İşe Giriş | Maaş özeti |
|---|---|---|---|---|---|
| 18 | AHMET HAMİT DOĞAN | barista | 01.01.2000 | 08.10.2025 | 5 haneli |
| 19 | ATEŞ GÜNEY YILMAZ | barista | 17.09.1999 | 27.12.2023 | 5 haneli |
| 20 | BASRİ ŞEN | supervisor | 12.02.1994 | 01.09.2022 | 5 haneli |
| 21 | CİHAN KOLAKAN | barista | 01.06.1996 | 24.11.2025 | 5 haneli |
| 22 | ECE ÖZ | **owner decision** (coach/supervisor?) | 11.02.1994 | 06.09.2022 | 5 haneli |
| 23 | EFE KADİR KOCAKAYA | barista | 17.09.1999 | 18.09.2025 | 5 haneli |
| 24 | KEMAL HÜSEYİNOĞLU | barista | 20.10.2001 | 18.08.2023 | 5 haneli |
| 25 | YAVUZ KOLAKAN | **owner decision** (mudur/yatirimci?) | 25.06.1995 | 19.02.2021 | 5 haneli (yüksek) |
| 26 | SÜLEYMAN OLGUN | barista | ? | 13.01.2026 | 5 haneli |
| 27 | İSMAİL SİVRİ | stajyer | ? | 09.02.2026 | 5 haneli |
| 28 | HÜLYA TÜZÜN | stajyer | 05.01.1977 | 17.02.2026 | 5 haneli |

**Not:** ÇİZERGE'de TC ve telefon kolonu **YOK**. Sadece DB'deki mevcut user'larda var (örnek olarak görülen TC'ler maskelenirse: `21265******`, `24187******`, `35048******` vs. — son 4 hane DB'de mevcut, raporda gösterilmiyor).

### B) `Lara_Sube_Maas_2026.xlsx` → 9 kişi (Şubat 2026 sheet'inden)

| Sıra | Ad Soyad | Pozisyon | Önerilen Rol | İşe Giriş (çalışma sheet) | Maaş aralığı | Statü |
|---|---|---|---|---|---|---|
| 1 | DENİZ HALİL ÇOLAK | Supervisor Buddy | supervisor_buddy | ? | 40.000 TL band | aktif |
| 2 | EREN DEMİR | Barista | barista | 06.09.2024 | 41.000 TL band | aktif |
| 3 | VEYSEL HÜSEYİNOĞLU | Barista | barista | 27.10.2025 | 41.000 TL band | aktif |
| 4 | DİLARA JENNEFER ELMAS | Barista | barista | 27.10.2025 | 41.000 TL band | aktif |
| 5 | BERKAN BOZDAĞ | Bar Buddy | bar_buddy | 03.11.2025 | 36.000 TL band | aktif |
| 6 | EFE YÜKSEL | Bar Buddy | bar_buddy | ? | 36.000 TL band | aktif |
| 7 | GÜL DEMİR | Bar Buddy | bar_buddy | 01.12.2025 | 36.000 TL band | aktif |
| 8 | Yağız Törer | Stajyer | stajyer | ? | 33.000 TL band | aktif |
| 9 | **BUĞRA SAKIZ** | Stajyer | stajyer | ? | 33.000 TL (orantılı) | **işten ayrılmış 19 Şubat 2026** → terminated |

**Çalışma sheet'inden ek isimler (Şubat'ta yok ama varlığı belgelenmiş):**
- ALİCAN ERKENEKLİ — Stajyer, giriş 22.04.2026 (yeni)
- ŞAHİN BERKER ERSÜRMELİ — Stajyer, giriş 21.04.2026 (yeni)
- DENİZ AYVAZOĞLU — pozisyon belirsiz, giriş 24.05.2025 → **owner decision required**

**TC ve telefon:** Lara dosyasında **YOK**.

---

## 2) Mevcut DB'deki kapsam içi personeller (46 user)

### Işıklar (12 user — 11 aktif, 1 pasif)

| ID kısa | Username | Ad Soyad | Role | Aktif | TC var mı | Test/demo? | Excel karşılığı |
|---|---|---|---|---|---|---|---|
| 6e240549 | suleyman | Süleyman Aydın | barista | ✅ | ❌ | ❌ | ⚠️ Excel'de **SÜLEYMAN OLGUN** (farklı soyad → muhtemelen farklı kişi) |
| 4cfa0da6 | ahmethamit | Ahmet Hamit Doğan | barista | ✅ | ❌ | ❌ | ✅ AHMET HAMİT DOĞAN |
| 9379801c | **isiklar** | Işıklar **Kiosk** | sube_kiosk | ✅ | ❌ | ❌ | **KIOSK — kapsam dışı** |
| 83b203d4 | kemal | Kemal Kolakan | barista | ✅ | ❌ | ❌ | ⚠️ Excel'de **KEMAL HÜSEYİNOĞLU** (farklı soyad — owner decision) |
| 714d7f30 | efe | Efe Kolakan | bar_buddy | ✅ | ❌ | ❌ | ⚠️ Excel'de yok (Excel'de **EFE KADİR KOCAKAYA** var, farklı kişi) |
| 47a30f2d | cihan | Cihan Kolakan | barista | ✅ | ✅ TC mevcut | ❌ | ✅ CİHAN KOLAKAN |
| ee76fb82 | mudur5 | **Erdem Yıldız** | mudur | ✅ | ❌ | ❌ | ❌ Excel'de YOK (pilot müdürü — replit.md'de pilot user) |
| 0bd4c7ce | atesguney | Ateş Güney Yılmaz | barista | ✅ | ✅ TC | ❌ | ✅ ATEŞ GÜNEY YILMAZ |
| 858d7987 | yatirimci5 | Halil Özkan | yatirimci_branch | ✅ | ❌ | ❌ | ❌ Excel'de YOK (yatırımcı, personel değil) |
| 9487cc4b | abdullah | Abdullah Üzer | barista | ✅ | ✅ TC | ❌ | ⚠️ ÇİZERGE'de yok ama IŞIKLAR sheet'inde başlık olarak var → owner decision |
| f8319722 | basri | Basri Şen | supervisor | ✅ | ✅ TC | ❌ | ✅ BASRİ ŞEN |
| 6226c602 | edanur | Edanur Tarakcı | barista | ❌ | ❌ | ❌ | ❌ Excel'de YOK (zaten pasif) |

### Antalya Lara (16 user — 6 aktif, 10 pasif test)

| ID kısa | Username | Ad Soyad | Role | Aktif | Test/demo? | Excel karşılığı |
|---|---|---|---|---|---|---|
| d4a5d4fd | larabarista1 | Barista Bir | barista | ✅ | ✅ **placeholder isim** | ❌ |
| 0338cc48 | **lara** | Antalya Lara **Kiosk** | sube_kiosk | ✅ | ❌ | **KIOSK — kapsam dışı** |
| 629b81fd | laramudur | **Andre Müdür** | mudur | ✅ | ❌ pilot user | ❌ Excel'de yok (Andre, replit.md pilot) |
| d628cf39 | larasupervisor | Lara Supervisor | supervisor | ✅ | ✅ **generic isim** | ❌ |
| 400a8a52 | larabarista3 | Barista Üç | barista | ✅ | ✅ **placeholder** | ❌ |
| 45e03a81 | larabarista2 | Barista İki | barista | ✅ | ✅ **placeholder** | ❌ |
| 2112e990 | tsupervisorbuddy1_b8 | Zeynep Arslan | supervisor_buddy | ❌ | ✅ `_b8` test suffix | ❌ |
| 605cd38c | tbarbuddy1_b8 | Ayşe Demir | bar_buddy | ❌ | ✅ test | ❌ |
| 8d5d0ed7 | tsupervisorbuddy2_b8 | Elif Doğan | supervisor_buddy | ❌ | ✅ test | ❌ |
| d813e963 | tbarista2_b8 | Mehmet Kaya | barista | ❌ | ✅ test | ❌ |
| a992e3b7 | mudur_b8 | İbrahim Keskin | mudur | ❌ | ✅ test | ❌ |
| e443fd05 | tbarista1_b8 | Emre Yıldırım | barista | ❌ | ✅ test | ❌ |
| 7f7c82a0 | teststajyer2_b8 | Merve Yılmaz | stajyer | ❌ | ✅ test | ❌ |
| ba82548b | tbarbuddy2_b8 | Fatma Çelik | bar_buddy | ❌ | ✅ test | ❌ |
| 0e5ddccf | testsupervisor_b8 | Hasan Öztürk | supervisor | ❌ | ✅ test | ❌ |
| adf8ae11 | teststajyer1_b8 | Burak Şahin | stajyer | ❌ | ✅ test | ❌ |

### Merkez Ofis HQ (1 user — 0 aktif, 1 pasif)

| ID kısa | Username | Ad Soyad | Role | Aktif | Test? | Excel? |
|---|---|---|---|---|---|---|
| 1e189abc | test-employee | Yavuz Supervisor | coach | ❌ | ✅ test | ❌ |

→ **HQ'da hiç gerçek personel yok.** Excel'in 5 OFİS kişisi tamamen yeni eklenecek.

### Fabrika (17 user — 11 aktif, 6 pasif)

| ID kısa | Username | Ad Soyad | Role | Aktif | TC? | Test? | Excel? |
|---|---|---|---|---|---|---|---|
| f6d3fcba | emreacarstj | Emre Acar | stajyer | ✅ | ❌ | ⚠️ `.com` test email | ❌ |
| df8073bf | fatiharslanstj | Fatih Arslan | stajyer | ✅ | ❌ | ⚠️ test email | ❌ |
| b8743987 | filizdemir | Filiz Demir | fabrika_operator | ✅ | ❌ | ⚠️ test email | ❌ ⚠️ Excel'de **FİLİZ KARALİ** var (farklı soyad — owner decision) |
| 81240bf9 | depocu | **Test Depocu** | fabrika_depo | ✅ | ❌ | ✅ açıkça test | ❌ |
| hq-eren-fabrika | eren | Eren Fabrika | fabrika_mudur | ✅ | ❌ | ❌ pilot | ❌ Excel'de yok (replit.md pilot — `Eren — fabrika_mudur`) |
| 4aa226d5 | atiyekar0706 | Atiye Kar | supervisor | ✅ | ✅ | ❌ | ✅ ATİYE KAR (rol farklı: DB=supervisor, Excel'de "İMALATHANE" → fabrika_operator/şef?) |
| a5cb16ee | **fabrika** | Fabrika **Kiosk** | fabrika_operator | ✅ | ❌ | ❌ | **KIOSK — kapsam dışı** |
| hq-ilker-recete-gm | RGM | Sema Reçete GM | recete_gm | ✅ | ❌ | ❌ | ❌ Excel'de yok |
| hq-umit-sef | Umit | Ümit Usta | sef | ✅ | ❌ | ⚠️ duplicate (umit ile çakışma) | ❌ |
| 52665297 | umit | Ümit Usta | uretim_sefi | ✅ | ❌ | ⚠️ duplicate (Umit ile çakışma) | ❌ |
| 6d5b583c | arifeyildirim0 | Arife Yıldırım | fabrika_operator | ✅ | ✅ | ❌ | ✅ ARİFE YILDIRIM |
| 41d2a9f0 | busradogmus20 | Büşra Doğmuş | fabrika_operator | ❌ | ✅ | ❌ | ✅ BÜŞRA DOĞMUŞ → **reaktive et** |
| 63e73592 | umitkara | Ümit Kara | supervisor_buddy | ❌ | ❌ | ⚠️ test email | ❌ |
| 18fc2ddd | selinyildizstj | Selin Yıldız | stajyer | ❌ | ❌ | ⚠️ test email | ❌ |
| 4006e4a0 | mihricanyilmaz | Mihrican Yılmaz | fabrika_operator | ❌ | ❌ | ⚠️ test email | ⚠️ Excel'de **MİHRİCAN VEZİROĞLU** (farklı soyad — owner decision) |
| cd3b8fba | mervecelikstj | Merve Çelik | stajyer | ❌ | ❌ | ⚠️ test email | ❌ |
| 38f93cb4 | leylaozdemir | Leyla Özdemir | fabrika_operator | ❌ | ❌ | ⚠️ test email | ⚠️ Excel'de **LEYLA SÖNMEZ** (farklı soyad — owner decision) |

---

## 3) Eşleşen kayıtlar

### YÜKSEK güven (ad+soyad+branch tam) — 6 kişi
| Excel | DB | Eşleşme | Değişecek alanlar |
|---|---|---|---|
| AHMET HAMİT DOĞAN | ahmethamit (Işıklar) | ad+soyad+branch | birth_date, hire_date doğrula, **net_salary güncelle** |
| ATEŞ GÜNEY YILMAZ | atesguney (Işıklar) | ad+soyad+branch (TC mevcut) | hire_date doğrula |
| BASRİ ŞEN | basri (Işıklar) | ad+soyad+branch (TC mevcut) | birth_date doğrula (DB: 1993-06-06, Excel: 12.02.1994 — **çakışma**) |
| CİHAN KOLAKAN | cihan (Işıklar) | ad+soyad+branch (TC mevcut) | birth_date doğrula (DB: 2003-03-31, Excel: 01.06.1996 — **çakışma**) |
| ATİYE KAR | atiyekar0706 (Fabrika) | ad+soyad+branch (TC mevcut) | role değişebilir (DB=supervisor, Excel İMALATHANE → operator?) |
| ARİFE YILDIRIM | arifeyildirim0 (Fabrika) | ad+soyad+branch (TC mevcut) | birth_date EKLE (DB'de yok, Excel: 26.11.2000) |

### ORTA güven (reaktive gereken) — 1 kişi
| Excel | DB | Sebep | Aksiyon |
|---|---|---|---|
| BÜŞRA DOĞMUŞ | busradogmus20 (Fabrika, **inactive**) | ad+soyad+branch+TC | **is_active=true yap, hire_date doğrula** |

### DÜŞÜK güven (owner decision required) — 5 kişi
| Excel | DB adayı | Çakışma sebebi |
|---|---|---|
| KEMAL HÜSEYİNOĞLU | kemal (Kemal **Kolakan**, Işıklar) | Soyad farklı — DB'de yanlış soyad olabilir |
| EFE KADİR KOCAKAYA | efe (Efe **Kolakan**, Işıklar) | Hem ad hem soyad farklı — muhtemelen farklı kişi |
| SÜLEYMAN OLGUN | suleyman (Süleyman **Aydın**, Işıklar) | Soyad farklı — muhtemelen farklı kişi |
| FİLİZ KARALİ | filizdemir (Filiz **Demir**, Fabrika) | Soyad farklı |
| MİHRİCAN VEZİROĞLU | mihricanyilmaz (Mihrican **Yılmaz**, Fabrika, inactive) | Soyad farklı |
| LEYLA SÖNMEZ | leylaozdemir (Leyla **Özdemir**, Fabrika, inactive) | Soyad farklı |

---

## 4) Yeni oluşturulması önerilen kişiler

**Genel öneri:** username = ad+soyad slugify (Türkçe karakter normalize), password = `0000` (pilot kuralı), email yoksa boş bırak veya `<username>@dospresso.placeholder` (ileride güncellenir).

### Fabrika (5 yeni + 1 yeni RGM Aslan + 1 rol değişikliği)
| Excel adı | Username önerisi | Önerilen rol | Eksik alanlar |
|---|---|---|---|
| GALİP CAN BORAN | galipcanboran | `fabrika_operator` | TC, telefon, email |
| HATİCE KOCABAŞ | haticekocabas | `fabrika_operator` | TC, telefon, email |
| MUSTAFA CAN HORZUM | mustafacanhorzum | `fabrika_operator` | TC, telefon, email |
| ÜMÜT KOŞAR | umutkosar | **owner decision** (`sef` / `uretim_sefi` / `fabrika_operator`?) | TC, telefon, email — yüksek maaşlı |
| FİLİZ KARALİ (eğer DB'deki Filiz Demir ile aynı kişi DEĞİLSE) | filizkarali | `fabrika_operator` | TC, telefon, email |
| MİHRİCAN VEZİROĞLU (DB'deki ile farklıysa) | mihricanveziroglu | `fabrika_operator` | TC, telefon, email |
| LEYLA SÖNMEZ (DB'deki ile farklıysa) | leylasonmez | `fabrika_operator` | TC, telefon, email |
| **ASLAN (RGM)** ⚠️ Excel'de YOK, owner direkt verdi | ? (ad/soyad netleşince) | **`recete_gm`** ✅ | **Tam ad/soyad, TC, telefon, email, branch, hire_date — owner decision** |

### Fabrika — mevcut user'larda rol değişikliği (owner kararı)
| Mevcut user | Mevcut rol | **Yeni rol** | Aksiyon |
|---|---|---|---|
| `hq-ilker-recete-gm` (Sema Reçete GM) | `recete_gm` | **`gida_muhendisi`** ✅ | UPDATE users SET role='gida_muhendisi' (RGM görevi Aslan'a devredilecek) |
| `hq-eren-fabrika` (Eren Fabrika) | `fabrika_mudur` | `fabrika_mudur` (KORU) ✅ | Eğer EREN ELMAS ile aynı kişi ise → last_name='Elmas', birth/hire date Excel'den UPDATE |

### HQ Ofis (4 yeni + 1 belirsiz) — owner kararıyla rol mapping NETLEŞTİ ✅
| Excel adı | Username önerisi | **Onaylanmış rol** | Eksik alanlar |
|---|---|---|---|
| UTKU DERNEK | utkudernek | **`cgo`** ✅ | TC, telefon, email |
| DIANA NAYFONOVA | diana | **`marketing`** ✅ | TC, telefon, email |
| ŞEVKET SAMET KARA | samet (veya sevketsamet) | **`satinalma`** ✅ | TC, telefon, email |
| MAHMUT ALTUNAY | mahmut (veya mahmutaltunay) | **`muhasebe_ik`** ✅ | TC, telefon, email |
| EREN ELMAS | ⚠️ **Bekleyen karar:** mevcut `hq-eren-fabrika` (Eren Fabrika, fabrika_mudur) ile **AYNI KİŞİ** mi? Eğer öyleyse → mevcut kaydı güncelle (last_name='Elmas', birth_date=22.04.1994, hire_date=25.05.2021), branch=Fabrika kalsın. Eğer farklı kişi ise → HQ'da yeni kayıt aç, rol? | TC, telefon, email |

### Işıklar — owner kararıyla ECE ve YAVUZ rolleri NETLEŞTİ ✅
| Excel adı | Username önerisi | **Onaylanmış rol** | Not |
|---|---|---|---|
| ECE ÖZ | ece (veya eceoz) | **`trainer`** ✅ | ⚠️ Branch: HQ (23) mü Işıklar (5) mı? — pilot için **bekleyen karar** |
| YAVUZ KOLAKAN | yavuz (veya yavuzkolakan) | **`coach`** ✅ | ⚠️ Branch: HQ (23) mü Işıklar (5) mı? Mevcut `test-employee` (Yavuz Supervisor, coach, HQ, pasif) ile çakışma yok ama username `yavuz` müsait |
| HÜLYA TÜZÜN | hulyatuzun | stajyer | Yeni giriş |
| İSMAİL SİVRİ | ismailsivri | stajyer | Yeni giriş |
| (KEMAL HÜSEYİNOĞLU eğer DB'deki Kemal ile farklıysa) | kemalhuseyinoglu | barista | Soyad çakışması — owner decision |
| (EFE KADİR KOCAKAYA eğer DB'deki Efe ile farklıysa) | efekadirkocakaya | barista | Soyad çakışması — owner decision |
| (SÜLEYMAN OLGUN eğer DB'deki Süleyman ile farklıysa) | suleymanolgun | barista | Soyad çakışması — owner decision |

### Lara (8-12 yeni)
| Excel adı | Username önerisi | Önerilen rol | Not |
|---|---|---|---|
| DENİZ HALİL ÇOLAK | denizhalilcolak | supervisor_buddy | |
| EREN DEMİR | erendemir | barista | giriş 06.09.2024 |
| VEYSEL HÜSEYİNOĞLU | veyselhuseyinoglu | barista | |
| DİLARA JENNEFER ELMAS | dilarajenniferelmas | barista | |
| BERKAN BOZDAĞ | berkanbozdag | bar_buddy | |
| EFE YÜKSEL | efeyuksel | bar_buddy | |
| GÜL DEMİR | guldemir | bar_buddy | |
| Yağız Törer | yagiztorer | stajyer | |
| BUĞRA SAKIZ | bugrasakiz | stajyer → **terminated** | İşten ayrıldı 19.02.2026 — `is_active=false`, `employee_terminations` kaydı |
| ALİCAN ERKENEKLİ | alicanerkenekli | stajyer | giriş 22.04.2026 (yeni) |
| ŞAHİN BERKER ERSÜRMELİ | sahinberkerersürmeli | stajyer | giriş 21.04.2026 (yeni) |
| DENİZ AYVAZOĞLU | denizayvazoglu | **owner decision** | Pozisyonu Excel'de boş, giriş 24.05.2025 |

**TOPLAM YENİ:** ~21-26 kişi (eşleşme kararlarına bağlı).

---

## 5) Pasifleştirme/arşiv adayı test personeller (kapsam içi)

### Lara — 13 kişi pasif/arşiv adayı
| Username | Ad Soyad | Sebep | Önerilen aksiyon |
|---|---|---|---|
| larabarista1 | Barista Bir | placeholder isim | **soft delete** (`deleted_at=now`, `is_active=false`) |
| larabarista2 | Barista İki | placeholder isim | soft delete |
| larabarista3 | Barista Üç | placeholder isim | soft delete |
| larasupervisor | Lara Supervisor | generic isim | soft delete |
| tsupervisorbuddy1_b8 .. teststajyer1_b8 (10 adet) | Test isimler | `_b8` test suffix, zaten `is_active=false` | **soft delete** veya bırak |

**laramudur (Andre Müdür)** — pilot kullanıcı, replit.md'de geçiyor. **Owner decision: koru veya yenisiyle değiştir.**
**lara (Kiosk)** — kapsam dışı, dokunulmayacak.

### Fabrika — 5-6 kişi pasif/arşiv adayı
| Username | Ad Soyad | Sebep | Aksiyon |
|---|---|---|---|
| depocu | Test Depocu | açıkça test | soft delete |
| emreacarstj | Emre Acar | `dospresso.com` test email pattern, Excel'de yok | **owner decision** (gerçek mi test mi?) |
| fatiharslanstj | Fatih Arslan | aynı pattern | owner decision |
| filizdemir | Filiz Demir | test email pattern | owner decision (FİLİZ KARALİ ile bağ?) |
| umitkara | Ümit Kara | test email, zaten pasif | bırak veya soft delete |
| selinyildizstj/mervecelikstj/mihricanyilmaz/leylaozdemir | hepsi pasif | test pattern | bırak |
| Umit / umit (DUPLICATE) | Ümit Usta x2 | iki user aynı kişiymiş | **owner decision: hangisi kalacak?** |

### HQ — 1 kişi
| Username | Ad Soyad | Aksiyon |
|---|---|---|
| test-employee | Yavuz Supervisor | soft delete (zaten pasif) |

### Işıklar — 0 kişi (test/demo yok)
edanur (zaten pasif) Excel'de yok ama özlük dosyasında pasif olduğu için bırakılabilir.

**❗ KESİNLİKLE HARD DELETE ÖNERİLMİYOR.** Tüm aksiyonlar soft delete (`deleted_at=now()`). FK bağımlılığı var:
- `branch_monthly_payroll_summary.user_id ... ON DELETE CASCADE` — hard delete = payroll geçmişi UÇAR
- `branch_shift_sessions ... CASCADE` — vardiya kayıtları UÇAR
- `disciplinary_reports ... CASCADE` — disiplin kayıtları UÇAR
- `audit_personnel_feedback ... CASCADE` — denetim feedback'leri UÇAR

---

## 6) Güncellenecek özlük alanları (eşleşen 7 kişi)

`users` tablosunda doğrudan güncellenebilecek alanlar:
| Excel alanı | DB kolonu | Tip |
|---|---|---|
| Doğum tarihi | `birth_date` | date |
| İşe giriş | `hire_date` | date |
| Departman (İMALATHANE/OFİS/IŞIKLAR) | `department` | varchar |
| Maaş (hak ediş/temel) | `net_salary`, `bonus_base` | integer (kuruş **değil**, TL — **dikkat** Excel'deki "31.000 TL" → 31000) |
| Yan haklar (yakıt, kasa) | `meal_allowance`, `transport_allowance` | integer |

**`employee_salaries` tablosuna ayrıca history kaydı:** base_salary, net_salary, employment_type, weekly_hours, hourly_rate, payment_day, effective_from. → eşleşen + yeni 30+ kişi için.

**`employee_benefits` tablosu:** meal/transport benefit (kasa tazminatı, yakıt). → ÇİZERGE'de değer var olanlar için.

**`employee_leaves` tablosu (yıllık izin):**
- `year`, `total_days`, `used_days`, `remaining_days`, `carried_over` — ÇİZERGE kolonları: 2025 kalan izni, 2026 hak edilen, toplam, aylık kullanım, kalan.
- 2026 yılı için her eşleşen kişiye 1 satır.

---

## 7) Lara aylık veriler analizi (Ocak/Şubat/Mart/Nisan 2026)

### Excel kolonları → `monthly_payroll` tablo eşleşmesi (mükemmel uyum)

| Excel kolonu | `monthly_payroll` kolonu |
|---|---|
| Çalışılan Gün | `worked_days` |
| Off Gün | `off_days` |
| Eksik Gün | `absent_days` |
| Ücretsiz İzin | `unpaid_leave_days` |
| Raporlu Gün | `sick_leave_days` |
| FM Dakika | `overtime_minutes` |
| Toplam Maaş | `total_salary` |
| Taban Maaş | `base_salary` |
| Kasa Prim + Performans | `bonus` |
| Günlük ücret | `daily_rate` |
| Kesinti (gün) | `absence_deduction` |
| Bonus kesinti (ücretsiz izin nedeniyle) | `bonus_deduction` |
| FM bedeli | `overtime_pay` |
| NET ÖDEME | `net_pay` |

### Yazma kapsamı
- **9 kişi × 4 ay = 36 satır** (Ocak/Şubat/Mart/Nisan 2026)
- `branch_id=8` (Antalya Lara), `position_code` = pozisyon mapping (supervisor_buddy/barista/bar_buddy/stajyer)
- `total_calendar_days` = 28 (Şubat) / 30 (Nisan) / 31 (Ocak/Mart) — ay bazlı
- `status` = `'imported'` veya `'draft'` (review için draft daha güvenli)

### ⚠️ PDKS/payroll çakışma riski
- **`monthly_payroll`** ve **`branch_monthly_payroll_summary`** iki ayrı tablo. Birincisi user×ay detayı, ikincisi şube×ay özeti. **Excel'i sadece `monthly_payroll`'a yaz**, branch summary mevcut sistemden hesaplanmaya devam etsin.
- **PDKS** (`branch_shift_sessions`, `branch_weekly_attendance_summary`) gerçek vardiya kayıtlarından beslenir. Excel'deki "çalışılan gün" PDKS'siz gelirse: Mr. Dobody late_arrival_tracker yanlış sinyal üretebilir. **Çözüm:** `monthly_payroll.notes='manual_excel_import'` flag ekle, PDKS engine bu kayıtları skip etsin (kod değişikliği — bu fazda yok).
- **`employee_terminations`** — BUĞRA SAKIZ için kayıt: `termination_date=2026-02-19`, `reason='istifa'` veya `'işten ayrılma'`.

---

## 8) Risk ve karar listesi

### Güvenli update (yüksek güven)
- 6 yüksek güven eşleşme: birth_date, hire_date, net_salary, department alanları
- BÜŞRA DOĞMUŞ reaktivasyonu (`is_active=true`)

### Owner kararı GEREKLİ
1. **Soyad çakışmaları:** Kemal Kolakan vs Hüseyinoğlu, Süleyman Aydın vs Olgun, Filiz Demir vs Karalı, Mihrican Yılmaz vs Veziroğlu, Leyla Özdemir vs Sönmez, Efe Kolakan vs Kocakaya — bunlar **aynı kişi farklı kayıt** mı yoksa **iki farklı kişi** mi?
2. **HQ rol mapping:** UTKU DERNEK, EREN ELMAS, DIANA, MAHMUT, ŞEVKET SAMET — şirkette pozisyonları ne (CGO/operasyon/muhasebe)?
3. **Fabrika rol:** ÜMÜT KOŞAR yüksek maaş, sef/üretim sefi mi?
4. **Işıklar:** ECE ÖZ → coach/supervisor (replit.md'de "Coach=ece"), YAVUZ KOLAKAN → mudur/yatırımcı?
5. **Lara mevcut pilot user'lar:** Andre (laramudur) ve Lara Supervisor → koru, sil, yeni biriyle değiştir?
6. **Fabrika duplicate:** `Umit` (hq-umit-sef, sef) ve `umit` (uretim_sefi) — hangisi kalacak?
7. **Pilot user'lar:** mudur5 (Erdem), eren (Eren Fabrika) → Excel'de yok, koru?
8. **Test email pattern personeller** (emreacarstj, fatiharslanstj, filizdemir vb.): gerçek personel mi test mi?

### Eksik alanlar (hiçbir kaynaktan gelmeyen)
- TC kimlik (sadece DB'de mevcut bazı kişiler için — Excel'de YOK)
- Telefon (her iki kaynakta YOK)
- Email (her iki kaynakta YOK)
- Adres, askerlik durumu, eğitim, medeni hal — Excel'de YOK
- IBAN/banka — Excel'de YOK
- Acil durum kontak — Excel'de YOK

### DB'de karşılığı OLMAYAN Excel alanları
- "KASA TAZMİNATI" → `employee_benefits.meal_benefit_amount` veya yeni alan? (yemek değil, pozisyon primi → muhtemelen `bonus_base` doğru)
- "YAKIT elden" → `transport_allowance` (var, ama "elden" işareti eksik — sadece tutar girilebilir)
- Aylık izin kullanım dağılımı (Ocak/Şubat/.../Aralık) → `employee_leaves` tek satır, aylık dağılım tablosu YOK. Sadece toplam tutulabilir.

### Etkilenen tablolar (yazma yapılırsa)
1. `users` — UPDATE eşleşenler, INSERT yeni
2. `employee_salaries` — INSERT (history)
3. `employee_benefits` — INSERT (kasa/yakıt)
4. `employee_leaves` — INSERT/UPDATE 2026 yılı
5. `employee_terminations` — INSERT (BUĞRA SAKIZ)
6. `monthly_payroll` — INSERT 36 satır (Lara × 4 ay)
7. `users` UPDATE `is_active=false` + `deleted_at` set (test users)

**Toplam: ~7 tablo, ~80-100 satır write** (final karara göre).

### Audit log / rollback
- **Audit log:** `audit_logs` tablosu mevcut. Her INSERT/UPDATE için manual entry önerilir, veya tek bir `data_change_log` toplu kayıt.
- **Rollback:**
  - Önerilen yaklaşım: Tek transaction içinde tüm yazma. Hata olursa rollback.
  - Yedek: Yazmadan önce kapsam içi user'ların (`branch_id IN (5,8,23,24)`) tam dump'ını al → `/tmp/backup_users_<ts>.sql`.
  - Soft delete ile zaten geri alınabilir (`UPDATE users SET deleted_at=NULL, is_active=true WHERE id=...`).
  - Yeni eklenen user'lar için: `DELETE FROM users WHERE id IN (...)` mümkün ama sadece HİÇBİR FK referansı oluşmadıysa.

---

## 9) Uygulama planı (sadece plan, yazma yok)

### Phase 0: Hazırlık (yazma öncesi onay)
- [ ] Owner decision'ları toplama: 8 belirsiz vakanın her biri için ad soyad → karar listesi.
- [ ] Yedekleme: `pg_dump --table=users --table=employee_salaries --table=employee_benefits --table=employee_leaves --table=employee_terminations --table=monthly_payroll "$DATABASE_URL" > /tmp/backup_pre_import_<ts>.sql`
- [ ] Boş bir test ortamı veya transaction sandwich planı.

### Phase 1: Güvenli update (6-7 kişi, 1 transaction)
- 6 yüksek güven eşleşmenin `users` UPDATE'i (birth_date, hire_date, department, net_salary)
- BÜŞRA DOĞMUŞ reaktivasyonu
- `data_change_log` kaydı

### Phase 2: Yeni personel oluşturma (~21-26 kişi, 1 transaction)
- Owner kararına göre net liste
- `users` INSERT (ID = `gen_random_uuid()`, password = bcrypt('0000'), `must_change_password=true`)
- Username çakışma kontrolü (örn: `ece`, `umit` zaten var)
- `data_change_log` toplu kayıt

### Phase 3: Test/demo personel pasifleştirme (~14-19 kişi, 1 transaction)
- `larabarista1/2/3, larasupervisor, depocu, test-employee` → soft delete
- 10 `_b8` test user → soft delete (zaten inactive, sadece `deleted_at` set)
- FK CASCADE etkisi: Lara test user'larının payroll/shift kayıtları kalır (soft delete olduğu için CASCADE tetiklenmez)

### Phase 4: Maaş/izin/hak ediş import (~30 kişi, 1 transaction)
- `employee_salaries` INSERT: tüm eşleşen + yeni kişiler için, `effective_from` = hire_date veya 2026-01-01
- `employee_benefits` INSERT: kasa tazminatı + yakıt olanlar için
- `employee_leaves` 2026 INSERT/UPSERT: izin_2026_hak (total), izin_kullanilan (used), izin_kalan (remaining)

### Phase 5: Lara aylık puantaj/payroll import (36 satır)
- `monthly_payroll` INSERT: 9 kişi × 4 ay = 36 satır, status='draft', notes='manual_excel_import'
- `employee_terminations` INSERT: BUĞRA SAKIZ (termination_date=2026-02-19, reason)
- PDKS/late_arrival_tracker ile çakışma kontrolü (post-import doğrulama)

### Phase 6: Audit log + rollback doğrulama
- `audit_logs` toplu özet kaydı (entity_type='bulk_personnel_import', record_count, source_files)
- Smoke test: kapsam içi şubelerin user listesi sayım, her phase için sayım doğrulaması
- Spot check: 3 random kişi için `users` + `employee_salaries` + `employee_leaves` join ile doğrulama
- Rollback senaryosu: hata durumunda `pg_restore` ile yedekten geri dönüş; başarılı senaryoda yedek 30 gün saklanır

---

## ÖZET — Karar İçin Kritik Sorular

Aşağıdaki 8 karar gelmeden Phase 1-6 başlatılamaz:

1. **Soyad çakışmaları (5-6 kişi):** Aynı kişi mi farklı kişi mi? (Kemal Kolakan/Hüseyinoğlu, Süleyman Aydın/Olgun, Filiz Demir/Karalı, Mihrican Yılmaz/Veziroğlu, Leyla Özdemir/Sönmez, Efe Kolakan/Kocakaya)
2. **HQ rolleri (5 kişi):** UTKU DERNEK (CGO?), EREN ELMAS, MAHMUT ALTUNAY, ŞEVKET SAMET KARA, DIANA NAYFONOVA — hangi DB rolleri?
3. **Fabrika rolleri:** ATİYE KAR (DB=supervisor, Excel=İMALATHANE: kalsın supervisor mi yoksa fabrika_operator mı?), ÜMÜT KOŞAR (sef/üretim_sefi/operator?)
4. **Işıklar belirsizleri:** ECE ÖZ (coach/trainer/supervisor?), YAVUZ KOLAKAN (mudur/yatırımcı?)
5. **Lara mevcut pilot user'lar:** Andre Müdür (laramudur) ve Lara Supervisor — koru, sil, yeniyle değiştir?
6. **Fabrika duplicate:** "Umit" (hq-umit-sef) ve "umit" (uretim_sefi) — hangi ID kalsın?
7. **Pilot kullanıcıları (Erdem mudur5, Eren fabrika_mudur):** Excel'de yok, korunsun mu?
8. **Test email patternli aktif Fabrika user'ları (emreacar, fatiharslan, filizdemir):** Gerçek mi test mi? Eğer test ise pasifleştir, gerçek ise Excel'de neden yok?
