# DOSPRESSO — Pilot Kullanıcı Listesi (12 May 2026)

> **Pilot Day-1: 12 Mayıs 2026 Pazartesi 09:00** (DECISIONS#34)
> **TASLAK** — Owner kontrol etmeli, eksik alanları doldurmalı.
> **Güncelleme:** Owner her pilot dalga başlangıcında bu dökümanı günceller, eski versiyonları arşivler.

---

## 1. Pilot Kapsamı

| Alan | Değer |
|---|---|
| **Pilot Day-1 tarihi** | **12 Mayıs 2026 Pazartesi 09:00** |
| **Pilot süre** | TBD (önerim: 4 hafta — 12 May → 9 Haz) |
| **Pilot lokasyon sayısı** | **4 birim** (2 şube + HQ + Fabrika) |
| **Pilot kullanıcı sayısı** | ~30-35 kişi (tahmini) |
| **Pilot çıkış kriteri (success metric)** | TBD — önerim: (1) %80+ günlük aktif kullanım, (2) 0 P0 incident, (3) Mahmut Mayıs sonu bordro doğruladı, (4) Sema/Eren reçete + üretim akışı sorunsuz |

> **Owner:** Pilot süresi ve çıkış kriteri kararını ver, bu satırları güncelle.

---

## 2. Pilot Yönetim Çekirdek Ekibi

| İsim | Username | Rol (Sistem) | Sorumluluk | Telefon | E-mail |
|---|---|---|---|---|---|
| **Aslan Fahrettin** | `aslan` | `ceo` | Pilot owner, son karar, P0 escalation | _______ | _______ |
| **Yavuz** | `yavuz` | `coach` | Tüm pilot şubeleri saha koçluğu | _______ | _______ |
| **Eren** | `eren` | `fabrika_mudur` | Fabrika koordinasyon, rollback co-imza | _______ | _______ |
| **Sema** | `sema` / `RGM` | `gida_muhendisi` / `recete_gm` | Reçete + besin + alerjen support | _______ | _______ |
| **Mahmut** | `mahmut` | `muhasebe_ik` | HR + bordro + PDKS Excel sahibi | _______ | _______ |
| **Samet** | `samet` | `satinalma` | Hammadde fiyat + tedarikçi | _______ | _______ |
| **Utku** | `utku` | `cgo` | Quality + complaints + CGO ops | _______ | _______ |

> **Owner:** Telefon + e-mail bilgilerini doldur. Yoksa "yok" yaz.

---

## 3. Pilot Şube Kullanıcıları

### 3.1 Şube #5 — Mavi Boncuk Işıklar (HQ-owned)

| İsim | Username | Rol | Telefon | Notlar |
|---|---|---|---|---|
| **Erdem Yıldız** | `erdem` (?) | `mudur` | _______ | Day-1 sabah 09:00 ilk login |
| **Basri** | `basrisen` | `supervisor` | _______ | Test başarılı 29 Apr 2026 |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |

> **Owner:** Erdem'in sistem username'ini doğrula. Işıklar'da Day-1'de aktif olacak baristaları (~6 kişi) tek tek listele.

### 3.2 Şube #8 — Antalya Lara (Franchise)

| İsim | Username | Rol | Telefon | Notlar |
|---|---|---|---|---|
| **Andre** | _______ | `mudur` | _______ | Franchise sahibi |
| **Berkan** | `berkanbozdag` | `supervisor` | _______ | Test başarılı 29 Apr 2026 |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |
| _______ | _______ | `barista` | _______ | _______ |

> **Owner:** Andre'nin sistem username'ini doğrula. Lara'da Day-1'de aktif baristaları (~3 kişi) tek tek listele.

---

## 4. HQ Kullanıcıları (Şube #23 — Merkez)

| İsim | Username | Rol | Telefon | Notlar |
|---|---|---|---|---|
| **Aslan** | `aslan` | `ceo` | _______ | Owner |
| **Ali** | `Ali` | `ceo` | _______ | Ortak (salt-yönetim) |
| **Mahmut** | `mahmut` | `muhasebe_ik` | _______ | HQ kiosk Day-1 (test 29 Apr) |
| **Samet** | `samet` | `satinalma` | _______ | Tedarikçi listesi sahibi |
| **Yavuz** | `yavuz` | `coach` | _______ | branchId=null, tüm şubeler |
| **Ece** | `ece` | `coach` | _______ | Eski trainer |
| **Diana** | `diana` | `marketing` | _______ | Pazarlama + grafik |
| **Utku** | `utku` | `cgo` | _______ | + Kalite (Ümran yerine) |
| **Ayşe Kaya** | `ayse` | `destek` | _______ | Ticket çözüm |
| **Murat Demir** | `murat` | `teknik` | _______ | IT altyapı |
| **Mehmet Özkan** | `mehmet` | `yatirimci_hq` | _______ | Salt-okur |

> **Owner:** Telefon bilgilerini doldur. HQ'da Day-1 aktif olmayacak kişi varsa işaretle.

---

## 5. Fabrika Kullanıcıları (Şube #24)

| İsim | Username | Rol | Telefon | Notlar |
|---|---|---|---|---|
| **Eren** | `eren` | `fabrika_mudur` | _______ | Fabrika müdürü, Day-1 sahibi |
| **Sema** | `RGM` | `recete_gm` | _______ | 2. hesap (ana: `sema` HQ) |
| **Ümit Usta** | `Umit` | `sef` | _______ | ⚠️ Case-sens duplicate (R-6) |
| **Ümit Usta** | `umit` | `uretim_sefi` | _______ | ⚠️ Aynı kişi, 2. hesap |
| **Buşra Doğmuş** | `busradogmus` | `fabrika_personel` (?) | _______ | Test başarılı 29 Apr 2026 |
| _______ | _______ | `fabrika_operator` | _______ | _______ |
| _______ | _______ | `fabrika_operator` | _______ | _______ |
| _______ | _______ | `fabrika_operator` | _______ | _______ |
| _______ | _______ | `fabrika_depo` | _______ | _______ |

> **Owner:** Eren ile birlikte fabrika personelini listele. ~7 personel + Eren + Sema + Ümit (2 hesap) = 10-11 kişi tahmini.

---

## 6. Rol Dağılımı Özet (Day-1 Aktif — Tahmini)

| Rol | Kullanıcı Sayısı |
|---|---|
| `ceo` | 2 (Aslan + Ali) |
| `cgo` | 1 (Utku) |
| `coach` | 2 (Yavuz + Ece) |
| `muhasebe_ik` | 1 (Mahmut) |
| `satinalma` | 1 (Samet) |
| `gida_muhendisi` | 1 (Sema) |
| `recete_gm` | 1 (Sema 2. hesap) |
| `marketing` | 1 (Diana) |
| `destek` | 1 (Ayşe) |
| `teknik` | 1 (Murat) |
| `yatirimci_hq` | 1 (Mehmet) |
| `mudur` | 2 (Erdem + Andre) |
| `supervisor` | 2 (Basri + Berkan) |
| `barista` | ~9 (Lara 3 + Işıklar 6) |
| `fabrika_mudur` | 1 (Eren) |
| `sef` + `uretim_sefi` | 2 hesap (Ümit) |
| `fabrika_personel` | 1 (Buşra) |
| `fabrika_operator` | ~3 (TBD) |
| `fabrika_depo` | 1 (TBD) |
| **TOPLAM** | **~33 kullanıcı** |

---

## 7. Pilot Destek Hattı (P0/P1 Incident)

| Sorun Tipi | Birinci Hat | İkinci Hat | Süre |
|---|---|---|---|
| **P0 — Kiosk açılmıyor / Sistem çöktü** | Aslan (CEO) | Murat (teknik) | < 15 dk |
| **P1 — Bordro/PDKS hatalı** | Mahmut | Aslan | < 1 saat |
| **P1 — Reçete/etiket sorunu** | Sema | Eren | < 1 saat |
| **P1 — Fabrika üretim** | Eren | Aslan | < 1 saat |
| **P2 — Şube operasyon** | Yavuz (coach) | Mahmut | < 4 saat |
| **P2 — Kullanıcı eğitim** | Yavuz | Ece | < 4 saat |

> **Owner:** Mesai dışı destek (akşam/hafta sonu) için kim sorumlu?
> **Önerim:** Pilot ilk hafta (12-18 May) **24/7 Aslan + Murat**, sonra normal saat.

---

## 8. Day-1 Sabah Akışı (12 May Pazartesi)

| Saat | Kim | Ne Yapacak |
|---|---|---|
| **08:00** | Aslan | adminhq parola rotasyon |
| **08:15** | Murat | Sistem health check (DB, kiosk, backup) |
| **08:30** | Yavuz | 4 birim koordinatörlerine "GO" mesajı |
| **08:45** | Şube müdürleri | Kiosk açılış, Wi-Fi kontrol |
| **09:00** | **PILOT GO-LIVE** | Tüm birimler aktif |
| **09:15** | Aslan | İlk kullanıcı login'leri izle (dashboard) |
| **12:00** | Aslan + Yavuz | Öğlen sync (incident var mı?) |
| **18:00** | Yavuz | Gün sonu rapor (Aslan'a) |
| **22:00** | Mahmut | PDKS gün sonu kontrolü |

---

## 9. Eksik / TBD Alanlar (Owner Aksiyonu)

- [ ] Pilot süresi kararı (önerim: 4 hafta)
- [ ] Pilot success metric (önerim: %80+ kullanım, 0 P0, bordro doğru)
- [ ] Tüm telefon + e-mail bilgileri
- [ ] Erdem (Işıklar mudur) sistem username doğrulama
- [ ] Andre (Lara mudur) sistem username doğrulama
- [ ] Işıklar 6 barista isim/username
- [ ] Lara 3 barista isim/username
- [ ] Fabrika 3-4 operator + 1 depo isim/username
- [ ] Mesai dışı destek sorumlusu (akşam/hafta sonu)

---

## 10. Onay & İmza

> **Owner Aslan:** Yukarıdaki tüm alanlar doğrulanıp doldurulmadan Pilot Day-1 GO verilmez.
> **Hedef:** 8 Mayıs Cuma akşam 18:00'a kadar liste tam olmalı (smoke test öncesi).

| İmza | Tarih |
|---|---|
| Owner (Aslan) | _______ |
| Coach (Yavuz) | _______ |
| Fabrika Müdürü (Eren) | _______ |
| Muhasebe (Mahmut) | _______ |

---

**Son güncelleme:** 3 Mayıs 2026 (Claude taslak — Owner doldurmalı)
**İlgili:** `docs/SPRINT-3-MASTER-PLAN.md`, `docs/PILOT-DAY1-CHECKLIST.md`, `docs/DECISIONS.md` md.34
