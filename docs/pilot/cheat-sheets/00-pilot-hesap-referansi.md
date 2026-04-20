# Pilot Hesap Referansı — Master Tablo

**Tarih:** 21 Nisan 2026
**Pilot Go-Live:** 28 Nisan 2026 Salı 09:00
**Pilot Lokasyonları:** Işıklar (5), Lara (8), HQ (23), Fabrika (24)

> **Bu dosya tüm cheat-sheet'lerin "Kullanıcı adı + Dashboard" referansıdır.** Cheat-sheet'lerdeki `[örn ...]` placeholder'ları yerine bu tablodaki gerçek değerleri kullan.

---

## 1. HQ Rolleri (28 Nis öncesi parolalar 1Password'a)

| Rol | Username | Ad Soyad | Dashboard Rota | Cheat Sheet |
|-----|----------|----------|----------------|-------------|
| `admin` | `adminhq` | Admin HQ | `/hq-ozet` veya `/ceo-command-center` | `01-admin.md` |
| `ceo` | `aslan` | Aslan CEO | `/ceo-command-center` (MC HQ) | `14-ceo.md` |
| `ceo` (yedek) | `Ali` | Ali CEO | `/ceo-command-center` | `14-ceo.md` |
| `cgo` | `utku` | Utku CGO | `/cgo-command-center` veya `/ceo-command-center` | `15-cgo.md` |
| `muhasebe_ik` | `mahmut` | Mahmut İK | `/muhasebe-centrum` (MC Muhasebe) | `16-muhasebe.md` |
| `satinalma` | `samet` | Samet Satınalma | `/satinalma` | `17-satinalma.md` |
| `kalite_kontrol` | `umran` | Ümran Kalite | `/kalite` veya `/fabrika/kalite` | `18-kalite-kontrol.md` |
| `marketing` | `diana` | Diana Marketing | `/crm/kampanya` | `19-marketing.md` |
| `teknik` | `murat.demir` | Murat Demir | `/ekipman` veya `/teknik` | `20-teknik.md` |
| `trainer` | `ece` | Ece Trainer | `/akademi` (trainer görünüm) | `21-trainer.md` |
| `coach` | `yavuz` | Yavuz Coach | `/kocluk-paneli` veya `/coach-kontrol-merkezi` (MC Coach) | `22-coach.md` |
| `destek` | `ayse.kaya` | Ayşe Kaya | `/destek-paneli` | `23-destek.md` |
| `yatirimci_hq` | `mehmet.ozkan` | Mehmet Özkan | `/yatirimci-dashboard` (read-only) | `24-yatirimci-hq.md` |

## 2. Fabrika Rolleri

| Rol | Username | Ad Soyad | Dashboard | Cheat Sheet |
|-----|----------|----------|-----------|-------------|
| `fabrika_mudur` | `eren` | Eren Fabrika | `/fabrika` (MC Supervisor) | `25-fabrika-mudur.md` |
| `gida_muhendisi` | `sema` | Sema Gıda Mühendisi | `/fabrika/kalite` | `26-gida-muhendisi.md` |
| `uretim_sefi` | (DB sorgu) | — | `/fabrika/uretim` | `11-uretim-sefi.md` |
| `sef` | (DB sorgu) | — | `/fabrika` | `08-sef-fabrika.md` |
| `recete_gm` | (DB sorgu) | — | `/fabrika/receteler` | `13-recete-gm.md` |
| `fabrika_depo` | (DB sorgu) | — | `/fabrika/depo` | `12-fabrika-depo.md` |
| `fabrika_operator` | 6 user | — | `/fabrika-kiosk` (PIN ile) | `05-fabrika-iscisi.md` |

## 3. Şube Rolleri (Pilot 4 lokasyon)

| Rol | DB sayı | Dashboard | Cheat Sheet | Pilot 4 lokasyon |
|-----|---------|-----------|-------------|------------------|
| `mudur` | 37 | `/sube-centrum` (MC Supervisor) | `02-mudur.md` | branchId=5,8,24 |
| `supervisor` | 38 | `/supervisor-centrum` | `03-supervisor.md` | branchId=5,8 |
| `supervisor_buddy` | 39 | `/supervisor-centrum` | `10-supervisor-buddy.md` | branchId=5,8 |
| `barista` | 122 | `/sube/kiosk` (PIN ile) | `06-barista.md` | branchId=5,8 |
| `bar_buddy` | 39 | `/sube/kiosk` | `07-bar-buddy.md` | branchId=5,8 |
| `stajyer` | 42 | `/sube/kiosk` | `09-stajyer.md` | branchId=5,8 |

## 4. Yatırımcı (Şube)

| Rol | Username | Branch | Cheat Sheet |
|-----|----------|--------|-------------|
| `yatirimci_branch` | `yatirimci5` | 5 (Işıklar) | `27-yatirimci-branch.md` |
| `yatirimci_branch` | `yatirimci_b6` | 6 | `27-yatirimci-branch.md` |
| `yatirimci_branch` | `yatirimci_b10` | 10 | `27-yatirimci-branch.md` |
| `yatirimci_branch` | `yatirimci_b13` | 13 | `27-yatirimci-branch.md` |

## 5. Pilot Dışı / Arşiv

| Rol | Durum | Not |
|-----|-------|-----|
| `kurye` | DB'de yok | `04-kurye.md` mevcut ama hiç kullanıcı yok. Pilot süresince barista/bar_buddy çift görev. Dosya gelecekte rol açılırsa kullanılacak. |
| `sube_kiosk` | 18 user | Şube içi kiosk hesabı, PIN tabanlı. Cheat sheet ayrı yok (kiosk akış cheat-sheet'lerde) |

---

## 6. Parola Politikası (Pilot)

- **Pilot öncesi (21-27 Nis):** Tüm pilot kullanıcı parolaları **adminhq** tarafından sıfırlanır → `mustChangePassword=true` (ilk login zorunlu değişim)
- **Pazartesi 28 Nis 08:00:** Sıfırlama tamamlandı, tüm parolalar **1Password'a aktarıldı**
- **adminhq parola:** Pilot öncesi `0000`, **28 Nis 08:00 rotasyon zorunlu** (1Password'a)
- **Pilot süresince:** Parola değişikliği için Mr. Dobody → admin yönlendirmesi

## 7. Dashboard Mimarisi (DashboardRouter)

`client/src/components/mission-control/DashboardRouter.tsx` rol → MC eşleştirme:

| Roller | Mission Control | Ana Rotalar |
|--------|-----------------|-------------|
| ceo, cgo, admin | `MissionControlHQ` | `/ceo-command-center`, `/hq-ozet` |
| coach, trainer | `MissionControlCoach` | `/kocluk-paneli`, `/coach-kontrol-merkezi` |
| supervisor, mudur | `MissionControlSupervisor` | `/sube-centrum`, `/supervisor-centrum` |
| muhasebe_ik | `MissionControlMuhasebe` | `/muhasebe-centrum`, `/merkez-dashboard` |
| satinalma, marketing, teknik, kalite_kontrol, destek | (özel modül paneli, ana modüle yönlendirme) | İlgili modül route'u |
| yatirimci_hq, yatirimci_branch | Read-only HQ özet veya şube özet | `/hq-ozet` veya `/sube/{id}/ozet` |

---

**Sahip:** Replit Agent (oluşturma) → adminhq (parola yönetimi) → Aslan (final onay)
**Güncelleme:** Pilot süresince hesap eklendiğinde bu tablo güncellenir.
