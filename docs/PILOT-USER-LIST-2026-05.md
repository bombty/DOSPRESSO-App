# DOSPRESSO — Pilot Kullanıcı Listesi (May 2026)

> **TEMPLATE — Owner doldurmalı.** Pilot Day-1'de aktif olacak kullanıcılar, rolleri, lokasyonları, iletişim bilgileri.
> **Güncelleme:** Owner her pilot dalga başlangıcında bu dökümanı günceller, eski versiyonları arşivler.

---

## 1. Pilot Kapsamı (Owner imzalamalı)

| Alan | Değer |
|---|---|
| **Pilot Day-1 tarihi** | _______ (Owner D1 kararı) |
| **Pilot süre** | _______ (1 ay, 2 ay, 3 ay?) |
| **Pilot lokasyon sayısı** | _______ (kaç şube + HQ + Fabrika?) |
| **Pilot kullanıcı sayısı** | _______ (toplam kaç kişi?) |
| **Pilot çıkış kriteri (success metric)** | _______ (KPI'lar: %X kullanım, %Y memnuniyet, vs.) |

---

## 2. Pilot Yönetim Çekirdek Ekibi

| İsim | Rol (Sistem) | Sorumluluk | Telefon | E-mail |
|---|---|---|---|---|
| Aslan | `admin` / `ceo` | Pilot owner, son karar | _______ | _______ |
| Eren | `fabrika_mudur` | Fabrika koordinasyon, rollback co-imza | _______ | _______ |
| Sema | `gida_muhendisi` | Reçete + besin + alerjen support | _______ | _______ |
| Ümit | `muhasebe_ik` (?) | HR + bordro support | _______ | _______ |
| Mahmut | `mudur` (?) | HQ kiosk + şube koordinasyon | _______ | _______ |
| _______ | _______ | _______ | _______ | _______ |

---

## 3. Pilot Şube Kullanıcıları

### Şube: _______ (örn. Işıklar)

| İsim | Sistem Kullanıcı Adı | Rol | Telefon | Notlar |
|---|---|---|---|---|
| _______ | basrisen | supervisor | _______ | Day-1 sabah 09:00 ilk login |
| _______ | _______ | barista | _______ | _______ |
| _______ | _______ | bar_buddy | _______ | _______ |

### Şube: _______ (örn. Lara)

| İsim | Sistem Kullanıcı Adı | Rol | Telefon | Notlar |
|---|---|---|---|---|
| _______ | berkanbozdag | mudur (?) | _______ | _______ |
| _______ | _______ | barista | _______ | _______ |

### Şube: _______ (devam...)

_(Owner her aktif pilot şube için satır ekler)_

---

## 4. HQ Kullanıcıları

| İsim | Sistem Kullanıcı Adı | Rol | Telefon | Notlar |
|---|---|---|---|---|
| Mahmut | mahmut | (HQ rol) | _______ | HQ kiosk Day-1 |
| _______ | _______ | satinalma | _______ | _______ |
| _______ | _______ | marketing | _______ | _______ |
| _______ | _______ | coach | _______ | _______ |
| _______ | _______ | trainer | _______ | _______ |

---

## 5. Fabrika Kullanıcıları

| İsim | Sistem Kullanıcı Adı | Rol | Telefon | Notlar |
|---|---|---|---|---|
| Eren | _______ | fabrika_mudur | _______ | Day-1 yönetici |
| Buşra | busradogmus | fabrika_personel (?) | _______ | _______ |
| _______ | _______ | uretim_sefi | _______ | _______ |
| _______ | _______ | fabrika_operator | _______ | _______ |
| _______ | _______ | fabrika_depo | _______ | _______ |

---

## 6. Rol Dağılımı Özet (Day-1 Aktif)

| Rol | Kişi Sayısı | Notlar |
|---|---|---|
| admin | _______ | Sadece Aslan? |
| ceo | _______ | _______ |
| cgo | _______ | Boş mu? |
| muhasebe_ik | _______ | _______ |
| satinalma | _______ | _______ |
| marketing | _______ | _______ |
| coach | _______ | _______ |
| trainer | _______ | _______ |
| kalite_kontrol | _______ | _______ |
| gida_muhendisi | _______ | Sema |
| recete_gm | _______ | _______ |
| mudur | _______ | _______ |
| supervisor | _______ | _______ |
| sef | _______ | _______ |
| barista | _______ | _______ |
| bar_buddy | _______ | _______ |
| supervisor_buddy | _______ | _______ |
| stajyer | _______ | _______ |
| yatirimci_branch | _______ | _______ |
| fabrika_mudur | _______ | Eren |
| uretim_sefi | _______ | _______ |
| fabrika_operator | _______ | _______ |
| fabrika_sorumlu | _______ | _______ |
| fabrika_personel | _______ | _______ |
| fabrika_depo | _______ | _______ |
| sube_kiosk | _______ | Şube başına 1 |
| **TOPLAM** | _______ | |

---

## 7. Pilot Dışı Roller (Day-1'de OLMAYAN)

Bunlar pilotun dışındadır, Day-1'de aktif kullanıcı OLMAMALI:
- `admin` hariç sistem rolleri
- Legacy roller: `muhasebe`, `teknik`, `destek`, `fabrika`, `yatirimci_hq` (B19 ile temizlenecek)

Eğer bu rollerden kullanıcı kaldıysa Day-1 öncesi ya rolü güncelle ya `is_active=false` yap.

---

## 8. Day-1 Sabah Login Saatleri (Coğrafi Dağılım)

| Saat | Kim | Lokasyon | Aksiyon |
|---|---|---|---|
| 06:00 | _______ | Fabrika | Sabah vardiyası kiosk giriş |
| 07:30 | _______ | Şube X | Açılış vardiyası giriş |
| 09:00 | Aslan | HQ | Pilot Day-1 onay komutası |
| 09:30 | _______ | Şube Y | _______ |
| _______ | _______ | _______ | _______ |

---

## 9. Acil Eskalasyon Sırası

1. **Aslan** (her sorun) — _______ tel
2. **Eren** (fabrika sorun) — _______ tel
3. **Sema** (reçete/etiket) — _______ tel
4. **Replit Agent** (sistem hata) — sohbet ekranı
5. **Replit Support** (platform/Neon) — Replit support kanalı

---

## 10. İLİŞKİLİ DOKÜMANLAR

- `docs/PILOT-DAY1-CHECKLIST.md` — Day-1 GO/NO-GO
- `docs/PILOT-DAY1-INCIDENT-LOG.md` — İncident kayıt
- `docs/PILOT-DAY1-ROLLBACK-PLAN.md` — Rollback prosedür
- `docs/PILOT-COMMUNICATION-PLAN.md` — Kullanıcı bildirimi
- `docs/TEST-MATRIX.md` — Smoke test matrisi (her rol için)

---

> **Bu döküman pilot Day-1 sabah saatine kadar Owner tarafından doldurulmalı. Boş bırakılan satırlar pilot Day-1 öncesi NO-GO kriteridir.**
