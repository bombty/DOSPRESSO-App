---
name: dospresso-roles-and-people
description: DOSPRESSO pilot personnel roster, role-to-user mapping, pilot branch supervisors, and known data hygiene issues. Use BEFORE any task that mentions specific people (Yavuz, Ümit, Sema, etc.), pilot branches (Işıklar, Lara), or role-specific testing (coach, recete_gm, sef yetki testi). Source of truth: DB users + branches tables (last sync 3 May 2026).
---

# DOSPRESSO Roller ve Personel (Pilot Day-1: 12 May 2026 Pazartesi 09:00)

> **Pilot tarihi geçmişi:** 28 Nis → 5 May → 4 May → 5 May → **12 May 2026** (DECISIONS#34, 3 May 2026)
> **PIN coverage:** %100 (branch 31→127, factory 13→14) — Task #324 (3 May 2026)
> **Sayfa/endpoint sayısı:** 305 sayfa / 1.985 endpoint / 455 tablo (3 May 2026)

## HQ (Merkez) Ekibi — 12 aktif kişi

| İsim | Username | Rol | Sorumluluk | Notu |
|---|---|---|---|---|
| Aslan Fahrettin | `aslan` | `ceo` | Owner / Product Lead | Tüm yetkiler |
| Ali | `Ali` | `ceo` | Ortak — şirket özetleri, görev atama, istatistik | Salt-yönetim odaklı, operasyon Aslan'da |
| Utku | `utku` | `cgo` | Chief Growth Officer + Kalite Kontrol | ⚠️ Ümran'ın yerine kalite görevi de aldı (25 Apr 2026). CGO rolünde checklist/complaints/product_complaints CRUD eksik — pilot öncesi yetki ekleme veya delege gerek |
| Yavuz | `yavuz` | `coach` | Franchise Koçu | branchId=null, tüm şubeler |
| Ece | `ece` | `coach` | Franchise Koçu (eski trainer) | 25 Apr 2026: trainer→coach geçti |
| Mahmut İK | `mahmut` | `muhasebe_ik` | Muhasebe + İK + payroll | PDKS Excel sahibi |
| Samet | `samet` | `satinalma` | Satınalma | Hammadde fiyat sorumlusu |
| Sema | `sema` | `gida_muhendisi` | Gıda Mühendisi | Alerjen+besin onayı |
| Sema | `RGM` | `recete_gm` | Reçete GM | ⚠️ Aynı kişi, 2. hesap |
| Diana | `diana` | `marketing` | Marketing + Grafik Tasarım | HQ dashboard: /hq-dashboard/marketing — pazarlama kampanyası, sosyal medya, görsel tasarım |
| ~~Ümran Kalite~~ | ~~`umran`~~ | ~~`kalite_kontrol`~~ | **AYRILDI 25 Apr 2026** — is_active=false, deleted_at set | Görev Utku'ya devredildi |
| Ayşe Kaya | `ayse` | `destek` | Destek/Teknik servis | Ticket çözüm |
| Murat Demir | `murat` | `teknik` | IT/Teknik altyapı | Sistem bakım |
| Mehmet Özkan | `mehmet` | `yatirimci_hq` | Yatırımcı (HQ) | Salt-okur dashboard |

## Fabrika (#24) Ekibi — 5 aktif kişi

| İsim | Username | Rol | Şube | Notu |
|---|---|---|---|---|
| Eren | `eren` | `fabrika_mudur` | Fabrika (#24) | 25 Apr 2026: branchId atandı |
| Sema | `RGM` | `recete_gm` | Fabrika (#24) | Reçete CRUD + lock yönetimi |
| Ümit Usta | `Umit` | `sef` | Fabrika (#24) | ⚠️ Duplicate (case-sens) |
| Ümit Usta | `umit` | `uretim_sefi` | Fabrika (#24) | ⚠️ Duplicate (case-sens) |

## Pilot Şubeler (5 May 2026)

### Aktif Pilot Kapsamı
| ID | Şube | Type | Müdür | Supervisor |
|---|---|---|---|---|
| 5 | Işıklar | `bombtea` (HQ-owned) | Erdem Yıldız | Basri Şen |
| 8 | Antalya Lara | `franchise` | Lara Müdür ⚠️ | Lara Supervisor ⚠️ |
| 23 | Merkez Ofis (HQ) | `franchise` ⚠️ | — | — |
| 24 | Fabrika | `franchise` ⚠️ | Eren | — |

### Hazırlık Modu — 16 Şube (`setup_complete=false`, 25 Apr 2026 ayarlandı)

**Karar:** Pilot Day-1'de bu 16 şube `setup_complete=false` durumunda. Veriler korunmuş, müdür/supervisor login ettiğinde **Onboarding Wizard** otomatik açılır (3 adım: personel yükle, gap analiz, setup tamamla). Tamamlandığında bu şube canlıya geçer.

**Şubeler:** Antalya Mallof/Markantalya/Beachpark, Gaziantep İbrahimli/İbnisina/Üniversite, Konya Meram/Bosna, Samsun Marina/Atakum, Batman, Düzce, Siirt, Kilis, Şanlıurfa, Nizip.

**Aktivite Tabanı (gerekçe — son 30 gün):**
- Pilot 2 şube: 363 PDKS + 36 feedback + 30 görev + 289 vardiya (gerçek kullanım)
- 16 hazırlık şubesi: 0 PDKS + 0 feedback + 4 görev + 0 vardiya (atıl/seed)

→ Hibrit C kararı: 16 şubeyi açmak Yavuz dashboard'unu yanıltıyordu (sahte rakamlar). Hazırlık moduna alınca pilot 4 şube net görünür, kademeli açılış kapısı açık.

**Geri dönüş:** Tek SQL — `UPDATE branches SET setup_complete=true WHERE id IN (...)`

## Yetki Matrisi (Rol → Modül → Erişim)

Tam yetki tablosu: `shared/schema/schema-02.ts` PERMISSIONS map (line 52-2519).
Toplam 27 rol tanımlı (4 hayalet legacy).

### Pilot Day-1 Kritik Yetkiler

| Modül | coach | sef | recete_gm | gida_muhendisi | mudur | supervisor | muhasebe_ik | satinalma |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| `attendance` (PDKS) | view | — | — | — | view | view | view+CRUD | — |
| `shifts` (Vardiya) | view+CRUD | — | — | — | view+CRUD | view | — | — |
| `hr` | full | — | — | — | view+CRUD | view | full | — |
| `leave_requests` | approve | — | — | — | approve | view | full | — |
| `factory_production` | — | — | full | view | — | — | — | — |
| `factory_food_safety` | view | — | — | full | — | — | — | — |
| `branch_orders` | full | — | — | — | full | view+create | — | full |

### Yetki Kapsamı (Branch Scope)
- `branchId=null` + executive role (`admin`, `ceo`, `cgo`, `coach`, `muhasebe_ik`, `satinalma`, `marketing`) → **tüm şubeler**
- `branchId=X` + branch role (`mudur`, `supervisor`, `barista`) → **sadece kendi şubesi**
- Fabrika rolleri (`recete_gm`, `sef`, `fabrika_mudur`, `gida_muhendisi`) → fabrika kapsamında, şubeleri görmez

## Bilinen Sorunlar (R-6 Backlog)

### P1 — Pilot öncesi çözüm gerekebilir
1. **Sema duplicate hesap** (`sema` + `RGM`): İki ayrı kullanıcı, manual login switch. **Karar:** Pilot başında iki hesap kalsın, R-6'da konsolide. Sema'ya kullanım talimatı brief'lenecek.
2. **Lara generic isimler**: "Lara Müdür" + "Lara Supervisor" — Aslan franchise sahibiyle iletişime geçtikten sonra UPDATE.
3. **Ali CEO duplicate**: Aslan'dan başka aktif `ceo` rolü. Test mi, partner mi? Aslan'a sorulacak.

### P2 — Pilot'u etkilemez, R-6'da temizlik
4. **Ümit duplicate** (`Umit` + `umit`): Aslan fabrikada doğrulayacak, muhtemelen `uretim_sefi` kalıcı.
5. **Test hesapları aktif**: `test_hq_all` (admin), `depocu` (Test Depocu) — pilot öncesi `is_active=false`.
6. **HQ #23 + Fabrika #24 ownership_type='franchise'**: Yanlış kategori, `bombtea` veya yeni tip (`internal`/`factory`) olmalı.
7. **Pilot-dışı 18 şube hâlâ aktif**: Yavuz dashboard'unda 20 şube görür. Sistem-seviyesi pilot_scope flag yok.

## Test Hesapları (Pilot Mod, 0000 şifre)

```
admin       — ADMIN_BOOTSTRAP_PASSWORD (UUID 0ccb206f-2c38-431f-8520-291fe9788f50)
Umit/sef    — RECIPE_EDIT_ROLES yetki testi
RGM/recete_gm — RECIPE_EDIT_ROLES yetki testi
barista.k2  — yetki olmayan rol testi
```
Cookie dosyaları: `/tmp/{admin,sef,rgm,barista}.txt`

## R-5 Test Reçeteleri

- **Recipe 16 — Cheesecake Frambuaz**: 9 ingredient, ŞEKER id=30, 3 alerjen (gluten/sut/yumurta), unit_cost 8.05 TL, coverage 22% (2/9)
- Lock pattern: `recipe.editLocked && req.user.role !== "admin"` → 403

## Güncelleme Talimatı

**Bu dosya `users` ve `branches` tablolarındaki gerçek veriyi yansıtır.** Aşağıdaki durumlardan biri olduğunda DERHAL güncellenmeli:

1. Yeni kullanıcı eklendiğinde / silindiğinde (HQ, fabrika, pilot şube)
2. Bir kullanıcının `role` veya `branch_id` kolonu değiştiğinde
3. Bir şubenin `setup_complete`, `is_active` veya `ownership_type` kolonu değiştiğinde
4. PERMISSIONS map'te (`shared/schema/schema-02.ts`) bir rolün modül izinleri değiştiğinde
5. Yeni şube açıldığında veya kapatıldığında
6. "Bilinen Sorunlar" bölümündeki bir madde çözüldüğünde (sil veya R-6 sprint notuna taşı)

### Doğrulama SQL'i (her güncelleme sonrası çalıştır)
```sql
-- HQ ekibi
SELECT username, first_name, last_name, role, branch_id, is_active 
FROM users 
WHERE deleted_at IS NULL AND is_active=true 
  AND (branch_id IS NULL OR branch_id IN (23, 24))
ORDER BY role;

-- Pilot şubeler
SELECT id, name, ownership_type, setup_complete, is_active 
FROM branches WHERE id IN (5, 8, 23, 24);

-- Pilot şube yöneticileri
SELECT b.name, u.first_name, u.last_name, u.role, u.is_active
FROM users u JOIN branches b ON b.id=u.branch_id
WHERE u.role IN ('mudur','supervisor','supervisor_buddy')
  AND u.deleted_at IS NULL AND b.id IN (5, 8);
```

## Sprint 2 → Sprint 3 Geçiş Bilgileri (3 May 2026)

### F36 — PIN Coverage %100 (Task #324)
- `branch_staff_pins`: 31 → **127 aktif** (+96)
- `factory_staff_pins`: 13 → **14 aktif** (+1)
- Migration: `migrations/2026-05-03-pin-seed-pilot.sql`
- Script: `scripts/pilot/27-pin-seed-missing.ts` (--dry-run/--apply)
- Bcrypt rounds=10, BANNED_PINS check, hash collision tarama
- Pasif/silinmiş kullanıcı PIN'leri otomatik deaktive
- Snapshot: `branch_staff_pins_bk_20260503`, `factory_staff_pins_bk_20260503`
- Audit: `scripts/audit/pin-coverage-2026-05.sql`

### Bundle 7 — Şube Puantaj + Fazla Mesai Onay Workflow (#311 + #327)

**Şube ayarları** (`branch_kiosk_settings` schema-09):
- Müdür `lateToleranceMinutes` (geç gelme tolerans, default 15dk)
- Default seed: `routes/branches.ts` L2586-2592 upsert ile otomatik
- F15 (#326): `late-arrival-tracker.ts` artık `payrollDeductionConfig` cascade'inden okur

**Overtime workflow** (`overtime_requests` schema-05 L142):
- Status: `pending | approved | rejected`
- Endpoint'ler: `routes/misc.ts` L1182-1327
  - `GET /api/overtime-requests` — liste
  - `POST /api/overtime-requests` — worker yeni talep
  - `PATCH /api/overtime-requests/:id/approve` — müdür onay
  - `PATCH /api/overtime-requests/:id/reject` — müdür red
- UI: `pages/pdks.tsx` `KioskToleranceSettings` + `pages/overtime-requests.tsx`
- Audit log: `attendance_settings_audit` tablosu (Task #328 ✅, 3 May)
- E2E test: `tests/e2e/branch-attendance-settings.spec.ts` (3 senaryo PASS)

### Mimari Borç (Task #281 — Sprint 4'e ertelendi)
- `ROLE_MODULE_DEFAULTS` (`shared/modules-registry.ts:368`) **DEAD CODE** (0 import)
- Gerçek mekanizma: `role_module_permissions` DB tablosu (3127 satır, **31 rolün hepsi DOLU**)
- Erişim API'si: `GET /api/me/permissions`
- 9 paralel rol/modül erişim mekanizması var → **B21 Sprint 4'te konsolidasyon (20-30h)**
- `manifest-auth` middleware **fail-open** → **B22 Sprint 4'te düzeltilecek**

### F33 Route Guard (8/13 + 5 zaten guardlı = 13/13 ✅)
- Bundle 2 (#306): `/iletisim`, `/nfc-giris`, `/qr-tara`, `/bilgi-bankasi`, `/bildirimler`
- #325: `/duyuru/:id`, `/akademi-ana`, `/ogrenme-yolum`
- Zaten guard'lı (audit yanlış tespit etmişti): `/personel/:id`, `/egitim/:id`, `/personel-onboarding-akisi`, `/icerik-studyosu`, `/duyurular`
- CI regression: `scripts/audit/route-guard-coverage.ts` + `.github/workflows/route-guard-coverage.yml`
- Whitelist: `scripts/audit/public-routes-whitelist.json` (262 route, 32 bare, 0 violation baseline)

## İlgili Skill'ler

- `dospresso-architecture` — Genel mimari, 27 rol detay
- `dospresso-debug-guide` — TypeScript req.user pattern, kiosk auth
- `dospresso-quality-gate` — Rol erişim 17-point checklist
- `dospresso-sprint-planner` — R-6 backlog format
