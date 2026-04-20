# 📚 Role-Flows — 31 Rol Dosyası İndeksi

> **Bu dizin ne içerir?** DOSPRESSO platformundaki **31 rolün her biri için ayrı bir doküman** + 1 cross-role matrisi + 1 bulgu raporu + 1 optimizasyon raporu. Her rol dosyası 11 standart bölümden oluşur (~150 satır).
>
> **Toplam içerik:** 31 rol × ~150 satır + matris (317 satır) + findings (621 satır) + optimizations = **~6.000 satır**

---

## 🚀 Önce Buradan Başla

Henüz sistemi tanımıyorsan şu sırayla oku:

1. **Master Harita** → [`../SISTEM-VE-ROLLER-MASTER.md`](../SISTEM-VE-ROLLER-MASTER.md) (30 dakikalık özet)
2. **Modül Akış Haritası** → [`../MODUL-AKIS-HARITASI.md`](../MODUL-AKIS-HARITASI.md) (12 Mermaid sequence diyagram)
3. **Cross-Role Matris** → [`./00-cross-role-matrix.md`](./00-cross-role-matrix.md) (31×31, 4 boyut: görev/onay/eskalasyon/bildirim)
4. **Bu README** → Hangi rolden devam edeceğini seç
5. **İlgili rol dosyası** → 11 standart bölümle derinleş
6. **Bulgu raporu** → [`./99-FINDINGS.md`](./99-FINDINGS.md) (42 bulgu, kritikten düşüğe)

---

## 📖 Her Rol Dosyasının Standart 11 Bölümü

Tüm rol dosyaları aynı şablonu izler — bir rolü tanırken hangi sırayla bakacağını bil:

| # | Bölüm | İçerik |
|---|-------|--------|
| 1 | **Rol Kimliği** | Tanım, sorumluluklar, fiziksel konum, aktif user sayısı |
| 2 | **Dashboard** | Hangi mission control'a düşer, ana KPI'ler, Komuta Merkezi 2.0 widget'ları |
| 3 | **Modül Erişim Matrisi (PERMISSIONS)** | 12 modül × V/C/E/D/A yetki detayı |
| 4 | **Sidebar Menü** | `SIDEBAR_ALLOWED_ITEMS` üzerinden görünür menü öğeleri |
| 5 | **Tipik Günlük Akış** | Sabah-öğle-akşam standart aktiviteler |
| 6 | **Hangi Görevleri Atayabilir / Hangi Onayları Verir** | Cross-role matris referanslarıyla |
| 7 | **Hangi Roller Bu Rolü Eskale Edebilir** | Yukarı eskalasyon zinciri |
| 8 | **Bildirim Tetikleyicileri** | 4-katmanlı bildirim sisteminde hangi olaylara abone |
| 9 | **Endpoint Erişimi** | Read-able + write-able API path örnekleri |
| 10 | **Bilinen Boşluklar** | `99-FINDINGS.md`'deki ilgili bulgu numaraları |
| 11 | **Pilot Notları** | 28 Nis pilot için özel durum (varsa) |

---

## 👥 31 Rol — Kategori Listesi

### 🔴 Admin (1 rol)
| # | Dosya | Rol Kodu | Açıklama | Aktif User |
|---|-------|----------|----------|:---:|
| 1 | [01-admin-hq.md](./01-admin-hq.md) | `admin` | Sistem yöneticisi — tam yetki, config, RBAC, audit | 1 |

### 🟣 HQ Executive (3 rol)
| # | Dosya | Rol Kodu | Açıklama | Aktif User |
|---|-------|----------|----------|:---:|
| 2 | [02-ceo.md](./02-ceo.md) | `ceo` | CEO — tüm sistem read + AI komuta merkezi | ~3 |
| 3 | [03-cgo.md](./03-cgo.md) | `cgo` | Chief Growth Officer — operasyon sorumlusu, çapraz rapor | ~3 |
| 4 | [04-yatirimci-hq.md](./04-yatirimci-hq.md) | `yatirimci_hq` | Yatırımcı HQ — read-only finans + KPI | ~3 |

### 🔵 HQ Departman (10 rol)
| # | Dosya | Rol Kodu | Açıklama | Aktif User |
|---|-------|----------|----------|:---:|
| 5 | [05-muhasebe-ik.md](./05-muhasebe-ik.md) | `muhasebe_ik` | Muhasebe & İK (Mahmut) — bordro, izin onay, evrak | 1 |
| 6 | [06-muhasebe.md](./06-muhasebe.md) | `muhasebe` | Muhasebe (legacy) — cari, ödeme, finansal rapor | 1 |
| 7 | [07-satinalma.md](./07-satinalma.md) | `satinalma` | Satın Alma (Samet) — PO, tedarikçi, mal kabul | 1 |
| 8 | [08-coach.md](./08-coach.md) | `coach` | Saha Koçu (Yavuz) — şube performans, denetim, eğitim | 1 |
| 9 | [09-trainer.md](./09-trainer.md) | `trainer` | Eğitim/Reçete (Ece) — akademi içerik, sertifika | 1 |
| 10 | [10-marketing.md](./10-marketing.md) | `marketing` | Pazarlama (Diana) — kampanya, grafik, sosyal medya | 1 |
| 11 | [11-kalite-kontrol.md](./11-kalite-kontrol.md) | `kalite_kontrol` | Fabrika QC (Ümran) — kalite, feedback eskalasyon | 1 |
| 12 | [12-gida-muhendisi.md](./12-gida-muhendisi.md) | `gida_muhendisi` | Gıda Mühendisi (Sema) — gıda güvenliği, HACCP | 1 |
| 13 | [13-teknik.md](./13-teknik.md) | `teknik` | Teknik Servis — ekipman, arıza, periyodik bakım | 1 |
| 14 | [14-destek.md](./14-destek.md) | `destek` | CRM/Destek — müşteri şikâyet, SLA, yanıt | 1 |

### 🟢 Şube (8 rol — pilot kapsamında ana hedef)
| # | Dosya | Rol Kodu | Açıklama | Aktif User |
|---|-------|----------|----------|:---:|
| 15 | [15-mudur.md](./15-mudur.md) | `mudur` | Şube Müdürü — şube ops + onay + ekip | ~22 |
| 16 | [16-supervisor.md](./16-supervisor.md) | `supervisor` | Vardiya Şefi — vardiya, görev, eğitim asistan | ~44 |
| 17 | [17-supervisor-buddy.md](./17-supervisor-buddy.md) | `supervisor_buddy` | Stajyer Şef — şef adayı | ~22 |
| 18 | [18-bar-buddy.md](./18-bar-buddy.md) | `bar_buddy` | Stajyer Barista — barista adayı | ~44 |
| 19 | [19-barista.md](./19-barista.md) | `barista` | Barista — operasyonel personel | ~150 |
| 20 | [20-stajyer.md](./20-stajyer.md) | `stajyer` | Stajyer — 14 günlük onboarding | ~50 |
| 21 | [21-yatirimci-branch.md](./21-yatirimci-branch.md) | `yatirimci_branch` | Yatırımcı Şube — read-only şube finans | ~7 |
| 22 | [22-sube-kiosk.md](./22-sube-kiosk.md) | `sube_kiosk` | Şube Kiosk — kiosk PIN giriş, hızlı aksiyon | ~22 (1/şube) |

### 🟠 Fabrika (9 rol)
| # | Dosya | Rol Kodu | Açıklama | Aktif User |
|---|-------|----------|----------|:---:|
| 23 | [23-fabrika-mudur.md](./23-fabrika-mudur.md) | `fabrika_mudur` | Fabrika Müdürü (Eren) — üretim + stok + kalite | 1 |
| 24 | [24-uretim-sefi.md](./24-uretim-sefi.md) | `uretim_sefi` | Üretim Şefi — vardiya atama, batch plan | ~1 |
| 25 | [25-fabrika-operator.md](./25-fabrika-operator.md) | `fabrika_operator` | Operatör — batch üretim kayıt | ~3 |
| 26 | [26-fabrika-sorumlu.md](./26-fabrika-sorumlu.md) | `fabrika_sorumlu` | Birim Sorumlu | ~1 |
| 27 | [27-fabrika-personel.md](./27-fabrika-personel.md) | `fabrika_personel` | Üretim Personeli | ~3 |
| 28 | [28-fabrika-depo.md](./28-fabrika-depo.md) | `fabrika_depo` | Depocu — malzeme çekme, stok, FEFO/SKT | ~1 |
| 29 | [29-sef.md](./29-sef.md) | `sef` | Şef — reçete uygulama | ~1 |
| 30 | [30-recete-gm.md](./30-recete-gm.md) | `recete_gm` | Reçete GM — reçete onayı (**SPOF — tek kullanıcı**) | 1 |
| 31 | [31-fabrika-legacy.md](./31-fabrika-legacy.md) | `fabrika` | Fabrika (legacy) — geriye dönük uyumluluk | ~1 |

**TOPLAM: 31 rol × 372 aktif kullanıcı**

---

## 🔍 Bir Rolü İncelerken Bakman Gerekenler

Aşağıdaki checklist'i kullan:

```
□ §1 Rol Kimliği — Bu rol kim, kaç kullanıcı?
□ §2 Dashboard — Giriş yaptığında ne görür?
□ §3 PERMISSIONS — Hangi modüle ne yetkisi var?
□ §4 Sidebar — UI'da hangi menüler görünür?
□ §5 Tipik Günlük Akış — Operasyonel rutini nedir?
□ §6 Görev/Onay — Kime atayabilir, kimi onaylar?
□ §7 Eskalasyon — Yukarı zinciri kim?
□ §8 Bildirimler — Hangi olaylara abone?
□ §9 Endpoint — Hangi API'lara erişir?
□ §10 Boşluklar — FINDINGS'te ne yazıyor?
□ §11 Pilot Notları — 28 Nis için özel durum var mı?
```

---

## 🎯 Pilot İçin Öncelik Sırası (28 Nis 2026)

Pilot kapsamı: HQ + Işıklar + Lara + Fabrika. Önce şu rolleri oku:

### 🔴 P0 — Pilot Day-1 yoğun kullanım
1. [15-mudur.md](./15-mudur.md) — 4 müdür (HQ + 3 şube)
2. [16-supervisor.md](./16-supervisor.md) — ~12 supervisor
3. [19-barista.md](./19-barista.md) — ~30 barista
4. [22-sube-kiosk.md](./22-sube-kiosk.md) — 4 kiosk
5. [23-fabrika-mudur.md](./23-fabrika-mudur.md) — Eren
6. [01-admin-hq.md](./01-admin-hq.md) — Aslan (adminhq)

### 🟠 P1 — Pilot Day-1 destek
7. [05-muhasebe-ik.md](./05-muhasebe-ik.md) — Mahmut
8. [08-coach.md](./08-coach.md) — Yavuz
9. [14-destek.md](./14-destek.md) — Destek
10. [13-teknik.md](./13-teknik.md) — Teknik
11. [25-fabrika-operator.md](./25-fabrika-operator.md) — 3 operatör
12. [28-fabrika-depo.md](./28-fabrika-depo.md) — Depocu

### 🟡 P2 — Pilot Hafta 1
13-22 — Diğer şube + HQ destek rolleri

### 🟢 P3 — Pilot Hafta 2+
23-31 — Yatırımcı + legacy + nadir kullanılan roller

---

## 📊 Pilot Cheat Sheet'leri

5 rol için tek-sayfa hızlı referans kartları (`docs/pilot/cheat-sheets/`):
- [admin.md](../pilot/cheat-sheets/admin.md)
- [mudur.md](../pilot/cheat-sheets/mudur.md)
- [supervisor.md](../pilot/cheat-sheets/supervisor.md)
- [kurye.md](../pilot/cheat-sheets/kurye.md)
- [fabrika-iscisi.md](../pilot/cheat-sheets/fabrika-iscisi.md)

Detaylı rol dosyaları (bu dizinde) ile cheat-sheet'ler arasında **bilgi tutarlılığı** korunur. Yeni bilgi önce cheat-sheet'e değil, role-flows dosyasına eklenir.

---

## 🛠️ Tamamlayıcı Dosyalar

| Dosya | İçerik | Satır |
|-------|--------|:-----:|
| [00-cross-role-matrix.md](./00-cross-role-matrix.md) | 31×31, 4-boyutlu (görev/onay/eskalasyon/bildirim) + 8 onay diyagramı | 317 |
| [98-OPTIMIZATIONS.md](./98-OPTIMIZATIONS.md) | RBAC + workflow optimizasyon önerileri | ~200 |
| [99-FINDINGS.md](./99-FINDINGS.md) | 42 bulgu (5 KRİTİK, 12 YÜKSEK, 15 ORTA, 10 DÜŞÜK) | 621 |

---

## 🔗 Üst Seviye Bağlantılar

| Konu | Dosya |
|------|-------|
| Sistem master harita | [`../SISTEM-VE-ROLLER-MASTER.md`](../SISTEM-VE-ROLLER-MASTER.md) |
| Modül akış (Mermaid 12 diyagram) | [`../MODUL-AKIS-HARITASI.md`](../MODUL-AKIS-HARITASI.md) |
| RBAC policy | [`../03-rbac-policy.md`](../03-rbac-policy.md) |
| Roller özet | [`../ROLES-AND-PERMISSIONS.md`](../ROLES-AND-PERMISSIONS.md) |
| Veri permissions | [`../02-data-permissions.md`](../02-data-permissions.md) |
| Mimari skill | [`../../.agents/skills/dospresso-architecture/SKILL.md`](../../.agents/skills/dospresso-architecture/SKILL.md) |
| Schema kaynağı | [`../../shared/schema/schema-01.ts`](../../shared/schema/schema-01.ts) (UserRole enum) |
| Permissions kaynağı | [`../../shared/schema/schema-02.ts`](../../shared/schema/schema-02.ts) (PERMISSIONS map) |
| Sidebar kaynağı | [`../../server/menu-service.ts`](../../server/menu-service.ts) (SIDEBAR_ALLOWED_ITEMS) |

---

**Son güncelleme:** 20 Nis 2026 Pazartesi · **Sürüm:** v1.0 · **Sahibi:** Replit Agent
