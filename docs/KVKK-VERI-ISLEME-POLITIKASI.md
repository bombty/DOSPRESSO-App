# 🔒 KVKK Kişisel Veri İşleme Politikası — DOSPRESSO Platform

> **6698 Sayılı Kişisel Verilerin Korunması Kanunu uyarınca hazırlanmıştır.**
>
> **Sprint 12 P-17 (6 May 2026)** — Pilot 18 May öncesi KVKK uyumu.

**Veri Sorumlusu:** DOSPRESSO Gıda San. ve Tic. A.Ş.
**Adres:** [Aslan tarafından doldurulacak — şirket merkezi adresi]
**KEP:** [doldurulacak]
**Bilgi İşlem İletişim:** Aslan, CEO ([email])

**Versiyon:** v1.0 (6 May 2026)
**Yürürlük:** 18 May 2026 (Pilot Day-1)

---

## 📋 İçindekiler

1. [Amaç ve Kapsam](#1-amaç-ve-kapsam)
2. [İşlenen Kişisel Veri Kategorileri](#2-işlenen-kişisel-veri-kategorileri)
3. [Kişisel Verilerin İşlenme Amaçları](#3-kişisel-verilerin-işlenme-amaçları)
4. [Hukuki Sebepler](#4-hukuki-sebepler)
5. [Veri Saklama Süreleri (Retention Policy)](#5-veri-saklama-süreleri)
6. [Kişisel Verilerin Aktarılması](#6-kişisel-verilerin-aktarılması)
7. [Veri Sahibinin Hakları](#7-veri-sahibinin-hakları)
8. [Veri Güvenliği Tedbirleri](#8-veri-güvenliği-tedbirleri)
9. [Çerez Politikası](#9-çerez-politikası)
10. [İletişim ve Başvuru](#10-iletişim-ve-başvuru)
11. [Politika Güncellemeleri](#11-politika-güncellemeleri)

---

## 1. Amaç ve Kapsam

### 1.1 Amaç
Bu politika, **DOSPRESSO Gıda San. ve Tic. A.Ş.** ("DOSPRESSO" veya "Şirket") tarafından işletilen franchise yönetim platformu üzerinde işlenen kişisel verilerin, **6698 Sayılı Kişisel Verilerin Korunması Kanunu** ("KVKK") uyumlu olarak işlenmesini sağlamayı amaçlar.

### 1.2 Kapsam
Bu politika aşağıdaki veri sahiplerini kapsar:
- **Personel:** DOSPRESSO HQ, Fabrika ve şube çalışanları
- **Franchise Yatırımcıları:** Şube sahipleri, müdürler
- **Müşteriler:** Şube ziyaretçileri (sadece geri bildirim QR ile)
- **Tedarikçiler:** Procurement süreci taraf irtibat kişileri

---

## 2. İşlenen Kişisel Veri Kategorileri

### 2.1 Personel Verileri (HR)

| Kategori | Veri | Kaynak | Modül |
|---|---|---|---|
| Kimlik | Ad, soyad, TC kimlik no | personel kayıt formu | `users` tablosu |
| İletişim | Telefon, e-posta, adres | personel kayıt formu | `users` tablosu |
| Mesleki | Pozisyon, başlangıç tarihi, maaş bilgisi | personel kayıt formu, IK girişi | `users`, `position_salaries` |
| Sağlık | (Belirli olmayan veriler) | -- | -- |
| Finansal | Banka hesap, IBAN, maaş tutarı | bordro modülü | `users`, `monthly_payroll` |
| PDKS | Çalışma saatleri, mola süreleri, devamsızlık | kiosk check-in | `shift_attendance`, `pdks_daily_summary` |
| Performans | Görev tamamlama oranı, eğitim, denetim skoru | otomatik sistem | `task_ratings`, `branch_audits` |

**NOT:** Sağlık verisi (özel nitelikli kişisel veri) **işlenmemektedir**. İş kazası raporları için ayrı süreç hazırlanacaktır.

### 2.2 Müşteri Verileri (Sınırlı)

| Kategori | Veri | Kaynak | Modül |
|---|---|---|---|
| İletişim (opsiyonel) | E-posta veya telefon (sadece müşteri vermek istediğinde) | QR kod geri bildirim | `customer_feedback` |
| Anonim | Memnuniyet skoru, yorum metni | QR kod geri bildirim | `customer_feedback` |
| IP/Cihaz | IP adresi, cihaz türü | otomatik (web log) | `audit_logs` |

**NOT:** Sadece geri bildirim formundan **kendi rızasıyla** verilen iletişim bilgileri işlenir. Anonim geri bildirim varsayılan moddur.

### 2.3 Yatırımcı/Franchise Sahibi

| Kategori | Veri | Kaynak | Modül |
|---|---|---|---|
| Kimlik | Ad, soyad, ünvan | sözleşme | `users` (yatirimci_hq, yatirimci_sube rolü) |
| Şirket | Vergi numarası, ticaret unvanı | sözleşme | `branches` |
| Finansal | Yatırım tutarı, royalti | sözleşme | (offline, sistem dışı) |
| Performans | Şube cirosu, kâr/zarar | otomatik | `branch_metrics` |

### 2.4 Tedarikçi (Procurement)

| Kategori | Veri | Kaynak |
|---|---|---|
| Kimlik | Şirket adı, irtibat kişisi adı | tedarikçi kayıt |
| İletişim | Telefon, e-posta | tedarikçi kayıt |
| Finansal | Vergi no, IBAN, fatura geçmişi | sözleşme + ERP |

---

## 3. Kişisel Verilerin İşlenme Amaçları

### 3.1 Personel Verileri
- **İş sözleşmesinin ifası** (KVKK m.5/2-c)
  - Bordro hesabı ve ödeme
  - PDKS (puantaj) kayıtları
  - SGK bildirimleri
  - Performans değerlendirme
- **Yasal yükümlülük** (KVKK m.5/2-ç)
  - 4857 SK ve 5510 SK gereği bildirim
  - 213 SK (VUK) defter ve belge düzeni
- **Meşru menfaat** (KVKK m.5/2-f)
  - İç kontrol, audit log
  - Mr. Dobody otomatik anomali tespiti

### 3.2 Müşteri Verileri
- **Açık rıza** (KVKK m.5/1) — Sadece müşteri kendi rızasıyla iletişim verirse
- Memnuniyet ölçümü ve hizmet kalitesi iyileştirme

### 3.3 Yatırımcı Verileri
- **Sözleşmenin ifası** (franchise sözleşmesi)
- **Yasal yükümlülük** (vergi, SGK)

---

## 4. Hukuki Sebepler

| Veri Tipi | Hukuki Sebep | KVKK Madde |
|---|---|---|
| Personel HR | Açık rıza + İş sözleşmesi | m.5/2-a, c |
| Personel SGK | Yasal yükümlülük | m.5/2-ç |
| PDKS, kiosk | Meşru menfaat (operasyonel takip) | m.5/2-f |
| Bordro, maaş | Sözleşmenin ifası | m.5/2-c |
| Müşteri geri bildirim | Açık rıza | m.5/1 |
| Audit log | Meşru menfaat (güvenlik) | m.5/2-f |
| Tedarikçi | Sözleşmenin ifası | m.5/2-c |

---

## 5. Veri Saklama Süreleri (Retention Policy)

> **🔥 KRİTİK:** Bu sürelerin sistemin **otomatik silme/anonimleştirme** akışı henüz **sistemde uygulanmadı**. Sprint 14 (post-pilot) iş listesinde.

### 5.1 Personel Verileri

| Veri | Saklama Süresi | Sonra Ne Olur | Yasal Dayanak |
|---|---|---|---|
| Personel kimlik (ad, TC) | İş ilişkisi süresince + **10 yıl** | Anonimleştir veya sil | İş sözleşmesi + IK ihtilafları zamanaşımı |
| İletişim (telefon, e-posta) | İş ilişkisi süresince + **5 yıl** | Sil | Meşru menfaat sınırı |
| Banka/IBAN | İş ilişkisi süresince + **5 yıl** | Sil | Mali işler zamanaşımı |
| Bordro detay | **10 yıl** (5510 SK m.86 uyarınca) | Arşivle veya sil | SGK denetim süresi |
| PDKS detay | **5 yıl** | Sil | İş kanunu defter saklama süresi |
| Performans değerlendirme | İş ilişkisi süresince | Sil | -- |

### 5.2 Müşteri Verileri

| Veri | Saklama Süresi | Sonra Ne Olur |
|---|---|---|
| Geri bildirim (anonim) | Süresiz (anonim) | -- |
| Geri bildirim (iletişimle) | **2 yıl** | İletişim bilgisi anonimleştir |
| IP/Cihaz log | **6 ay** | Sil (audit_logs) |

### 5.3 Yatırımcı/Franchise

| Veri | Saklama Süresi |
|---|---|
| Sözleşme süresince + sözleşme bitiminden sonra **10 yıl** | (TBK ihtilaf zamanaşımı) |

### 5.4 Audit Log

| Veri | Saklama Süresi |
|---|---|
| audit_logs tablosu | **2 yıl** (güvenlik soruşturmaları) |
| critLog (critical events) | **5 yıl** |

---

## 6. Kişisel Verilerin Aktarılması

### 6.1 Yurt İçi Aktarım
| Alıcı | Veri | Amaç | Hukuki Sebep |
|---|---|---|---|
| SGK | Personel kimlik, bordro | SGK bildirimi (m.86) | Yasal yükümlülük |
| GİB (Gelir İdaresi) | Personel kimlik, bordro | Vergi bildirimi | Yasal yükümlülük |
| Banka | IBAN, ad, tutar | Maaş ödemesi | Sözleşmenin ifası |
| Muhasebe firması (varsa) | Bordro detayı | Muhasebe hizmeti | Sözleşmenin ifası |

### 6.2 Yurt Dışı Aktarım
**KVKK m.9 uyarınca:** DOSPRESSO platformu **Neon (PostgreSQL)** ve **Replit** altyapısını kullanıyor. Bu hizmetler ABD/AB merkezli olabilir. Aktarım için:
- ✅ Açık rıza (personel sözleşmesinde madde)
- ✅ Standart sözleşme maddeleri (SCC) — Neon ve Replit uyumlu
- ✅ Veriler şifrelenmiş aktarım (TLS 1.2+)

**TODO (Sprint 14):** Neon ve Replit'in DPA (Data Processing Agreement) imzalı kopyaları arşive eklenecek.

---

## 7. Veri Sahibinin Hakları (KVKK m.11)

Veri sahipleri aşağıdaki haklara sahiptir:

1. **Bilgi alma:** Hangi verilerinizin işlendiğini öğrenme
2. **Erişim:** Verilerinize erişim talep etme
3. **Düzeltme:** Yanlış verilerin düzeltilmesini talep etme
4. **Silme:** İşleme sebebi ortadan kalktığında silme talep etme
5. **Sınırlama:** Veri işlemenin sınırlandırılmasını talep etme
6. **Aktarım engeli:** Verilerin başkasına aktarılmasına itiraz
7. **Otomatik karar:** Otomatik sistemler (Mr. Dobody) ile alınan kararlara itiraz
8. **Tazminat:** Kanuna aykırı işlemden dolayı zarar görmenizde tazminat talep etme

### 7.1 Hak Talebi Süreci
1. Veri sahibi yazılı dilekçe ile başvurur (e-posta veya KEP)
2. **DOSPRESSO** **30 gün** içinde cevaplar (KVKK m.13)
3. Talep haklı bulunursa: ücretsiz, kabul edilirse 30 gün içinde işlem tamamlanır
4. Reddedilirse: gerekçe yazılı belirtilir
5. Veri sahibi memnun değilse **KVKK Kurumu**'na şikayet edebilir (kvkk.gov.tr)

---

## 8. Veri Güvenliği Tedbirleri

### 8.1 Teknik Tedbirler
- ✅ **Şifreleme:** TLS 1.2+ tüm aktarımlarda
- ✅ **Hashleme:** Şifreler ve PIN'ler bcrypt (cost 10) ile hashleniyor
- ✅ **Yetkilendirme:** `requireManifestAccess` middleware ile fail-closed
- ✅ **Audit Log:** Tüm kritik işlemler `audit_logs` tablosunda
- ✅ **Session Yönetimi:** Express-session + secure cookies
- ✅ **Backup:** Günlük pg_dump + haftalık schema backup
- ✅ **Pre-commit Hook:** Token leak ve marker engelleme
- ✅ **Structured Logging:** Pino-uyumlu JSON log (Sprint 10 P-8)
- ⏳ **Sentry/Datadog entegrasyonu:** Post-pilot Sprint 14

### 8.2 İdari Tedbirler
- Personel KVKK farkındalık eğitimi (yıllık)
- Veri ihlali (data breach) bildirim prosedürü (KVKK m.12 — 72 saat)
- Erişim hakları rol bazlı (manifest-auth)
- Üst yönetim KVKK uyumu sorumlusu: **Aslan, CEO**

### 8.3 Veri İhlali Bildirim Prosedürü
1. İhlal tespit edilir → Aslan + güvenlik ekibi acil toplanır
2. **72 saat içinde** KVKK Kurumu'na bildirim (m.12/5)
3. Etkilenen veri sahiplerine bildirim
4. Düzeltici tedbirler + audit raporu
5. Politika güncellemesi (gerekiyorsa)

---

## 9. Çerez Politikası

DOSPRESSO platformu aşağıdaki çerezleri kullanır:

| Çerez | Tür | Süre | Amaç |
|---|---|---|---|
| `connect.sid` | Zorunlu (oturum) | Oturum | Login durumu |
| `kiosk-token` | Zorunlu (kiosk) | 8 saat | Kiosk oturumu |
| Tarayıcı tercihi | Tercihler | 1 yıl | Kullanıcı UI ayarları |

**Reklam veya tracking çerezi KULLANILMAZ.**

---

## 10. İletişim ve Başvuru

Tüm KVKK başvuruları aşağıdaki kanallarla iletilebilir:

- **E-posta:** [doldurulacak — Aslan KEP/normal email]
- **KEP:** [doldurulacak]
- **Posta:** [şirket adresi]
- **Yazılı dilekçe:** Şirket merkezinde imza ile teslim

Başvuru içeriği:
1. Ad, soyad, TC kimlik veya pasaport
2. İletişim bilgisi
3. Talep konusu (bilgi alma, silme, vb.)
4. İmza (yazılı dilekçeyse)

---

## 11. Politika Güncellemeleri

### 11.1 Versiyon Geçmişi
| Versiyon | Tarih | Değişiklik | Onaylayan |
|---|---|---|---|
| v1.0 | 6 May 2026 | İlk yayın (pilot öncesi) | Aslan, CEO |
| v1.1 | (TBD) | Sprint 14 — automated retention + Neon DPA | -- |

### 11.2 Güncelleme Bildirimi
Politika güncellendiğinde:
- Sistem girişinde popup gösterilir
- Önemli değişiklik ise e-posta gönderilir
- Veri sahipleri 30 gün içinde itiraz edebilir

---

## 12. Sprint 14 Yapılacaklar (Post-Pilot)

> Bu politika **dokümandır**. Otomatik uygulama (sistem akışı) henüz tam değil.

### 12.1 Eksik Sistem Akışları
- [ ] **Otomatik retention:** PDKS 5 yıl sonra, audit log 2 yıl sonra otomatik sil
- [ ] **Anonimleştirme:** Bordro 10 yıl sonra TC kimlik anonimleştir
- [ ] **Kullanıcı self-service:** Veri silme talebi UI üzerinden başvuru
- [ ] **Neon DPA:** Standart sözleşme maddeleri imzalı kopyası arşive
- [ ] **Replit DPA:** Aynı şekilde
- [ ] **Veri ihlali şablonu:** 72 saat bildirim form template'i
- [ ] **KVKK farkındalık eğitimi:** Tüm personel için yıllık (Sema/HR organize edebilir)

---

## 📋 Onay

Bu politika aşağıdaki kişiler tarafından okunmuş ve uygun bulunmuştur:

| Kişi | Rol | Tarih | İmza |
|---|---|---|---|
| Aslan | CEO, Veri Sorumlusu | -- | -- |
| Mahmut | HR/Bordro | -- | -- |
| (Hukuk danışmanı) | -- | -- | -- |

---

**Son Güncelleme:** 6 May 2026, 20:00 (Sprint 12 P-17)
**Durum:** v1.0 — Aslan onayı ve hukuk danışmanı incelemesi sonrası yayına alınacak
**İlgili dosyalar:** `docs/PENDING.md` (Sprint 12 P-17), `docs/DECIDED.md` D-43
