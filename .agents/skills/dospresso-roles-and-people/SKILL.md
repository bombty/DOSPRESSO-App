---
name: dospresso-roles-and-people
description: DOSPRESSO pilot personnel roster, role-to-user mapping, pilot branch supervisors, and known data hygiene issues. Use BEFORE any task that mentions specific people (Yavuz, Ümit, Sema, etc.), pilot branches (Işıklar, Lara), or role-specific testing (coach, recete_gm, sef yetki testi). Source of truth: DB users + branches tables (last sync 25 Apr 2026).
---

# DOSPRESSO Roller ve Personel (Pilot 5 May 2026)

## HQ (Merkez) Ekibi — 12 aktif kişi

| İsim | Username | Rol | Sorumluluk | Notu |
|---|---|---|---|---|
| Aslan Fahrettin | `aslan` | `ceo` | Owner / Product Lead | Tüm yetkiler |
| Ali CEO | `Ali` | `ceo` | ⚠️ ? (Aslan'a sorulacak) | Duplicate veya partner? |
| Utku | `utku` | `cgo` | Chief Growth Officer | Executive — tüm şubeler otomatik |
| Yavuz | `yavuz` | `coach` | Franchise Koçu | branchId=null, tüm şubeler |
| Ece | `ece` | `coach` | Franchise Koçu (eski trainer) | 25 Apr 2026: trainer→coach geçti |
| Mahmut İK | `mahmut` | `muhasebe_ik` | Muhasebe + İK + payroll | PDKS Excel sahibi |
| Samet | `samet` | `satinalma` | Satınalma | Hammadde fiyat sorumlusu |
| Sema | `sema` | `gida_muhendisi` | Gıda Mühendisi | Alerjen+besin onayı |
| Sema | `RGM` | `recete_gm` | Reçete GM | ⚠️ Aynı kişi, 2. hesap |
| Diana Marketing | `diana` | `marketing` | Pazarlama+grafik tasarım | HQ dashboard: /hq-dashboard/marketing |
| Ümran Kalite | `umran` | `kalite_kontrol` | Kalite Kontrol | Şube denetim, food safety |
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

### Pilot Dışı (DB'de aktif AMA pilot scope'unda yok!)
**18 şube aktif ve `setup_complete=true`:** Antalya Mallof, Markantalya, Beachpark, Gaziantep İbrahimli/İbnisina/Üniversite, Konya Meram/Bosna, Samsun Marina/Atakum, Batman, Düzce, Siirt, Kilis, Şanlıurfa, Nizip — her biri 6-8 personelle.

⚠️ **Önemli:** Bu şubeler dashboard'larda, coach view'unda, CRM'de, raporlarda **görünür**. Pilot 5 May'da Yavuz Yavuz Işıklar+Lara ile sınırlanacaksa, sistem-seviyesi izolasyon (ör. `pilot_branches` flag) yapılmamış.

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

## İlgili Skill'ler

- `dospresso-architecture` — Genel mimari, 27 rol detay
- `dospresso-debug-guide` — TypeScript req.user pattern, kiosk auth
- `dospresso-quality-gate` — Rol erişim 17-point checklist
- `dospresso-sprint-planner` — R-6 backlog format
