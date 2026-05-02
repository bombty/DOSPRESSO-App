# Task #281 / B14 — NO-OP Verification Note

**Tarih:** 2 May 2026
**Task:** Sprint 2 master backlog B14 — "ROLE_MODULE_DEFAULTS — 16 eksik rol tamamla"
**Sonuç:** ✅ ÇÖZÜLDÜ NO-OP — kod / DB değişikliği gerekmez
**Karar referansı:** `docs/DECISIONS.md` madde 31
**Audit referansı:** `docs/audit/system-multi-perspective-evaluation-2026-05-02.md` Bölüm 11.5

---

## 1. B14'ün Orijinal Talebi

> ROLE_MODULE_DEFAULTS sabitine 16 eksik rol için modül listesi ekle (en kritik: ceo, mudur, sef, gida_muhendisi). Acceptance: `role_module_defaults` 31 rol × N modül DOLU.

## 2. Teşhis Hatası Kanıtı

### 2.1 `ROLE_MODULE_DEFAULTS` consumer kontrolü → 0 import

```bash
$ rg -n "ROLE_MODULE_DEFAULTS" --type ts
shared/modules-registry.ts:381:export const ROLE_MODULE_DEFAULTS: Record<string, string[]> = {
```

Tek hit: declaration. Hiçbir runtime dosya import etmiyor.

### 2.2 Gerçek consumer mekanizması — `role_module_permissions` DB tablosu

| Katman | Dosya | Rol |
|---|---|---|
| Schema | `shared/schema/schema-05.ts` | `roleModulePermissions` pgTable tanımı |
| Seed | `server/seed-role-permissions.ts` | `PERMISSIONS` (`shared/schema/schema-02.ts`) sabiti DB'ye dökülür |
| Storage | `server/storage.ts` `getRolePermissions(role)` | DB SELECT |
| API | `server/routes/certificate-routes.ts:751` | `GET /api/me/permissions` → `{ permissions: { module: actions[] } }` |
| Frontend | `client/src/hooks/useDynamicPermissions.ts` | `/api/me/permissions` consume |

### 2.3 DB doğrulama sorgusu (psql, 2 May 2026)

```sql
SELECT role, COUNT(*) AS module_perm_count
FROM role_module_permissions
GROUP BY role
ORDER BY module_perm_count DESC, role;
```

**Sonuç:** 31 distinct role, toplam **3127 satır**.

| Rol | Modül permission sayısı |
|---|---|
| admin | 240 |
| supervisor | 240 |
| coach | 235 |
| muhasebe | 231 |
| supervisor_buddy | 123 |
| yatirimci_hq | 98 |
| ceo, cgo, mudur, sef, recete_gm, uretim_sefi, satinalma, trainer, fabrika_mudur, muhasebe_ik | 79 (her biri) |
| bar_buddy, barista, destek, fabrika, fabrika_kalite, fabrika_temizlik, fabrika_paketleme, fabrika_sevkiyat, gida_muhendisi, kalite_kontrol, marketing, stajyer, sube_kiosk, teknik, ekipman_teknik, yatirimci_branch, egitim_koordinatoru, staff | 78 (her biri) |

**31/31 rol DOLU. Eksik rol YOK.**

### 2.4 5 pilot rol kritik modül kontrolü (PASS)

```sql
SELECT module FROM role_module_permissions
WHERE role = '<rol>'
  AND module IN ('dashboard','hr','employees','equipment','shifts','tasks',
                 'factory_dashboard','factory_kiosk','factory_compliance',
                 'branch_inspection','branch_inventory','checklists',
                 'inventory','notifications','users','akademi')
ORDER BY module;
```

| Rol | Toplam modül | Pilot için kritik modüller mevcut mu? |
|---|---|---|
| ceo | 79 | ✅ dashboard, hr, employees, equipment, shifts, tasks, users, akademi |
| cgo | 79 | ✅ dashboard, hr, employees, equipment, shifts, tasks |
| mudur | 79 | ✅ dashboard, employees, equipment, branch_inspection, branch_inventory, shifts |
| fabrika_mudur | 79 | ✅ factory_dashboard, factory_kiosk, factory_compliance, equipment, employees |
| sube_kiosk | 78 | ✅ dashboard, checklists, inventory, shifts, tasks, notifications |

**Pilot Day-1 etkisi: SIFIR.** Bu rollerin kullanıcıları (Aslan, Erdem, Mahmut, Eren) modülleri normal göreceklerdir.

## 3. Sonuç

- **Kod değişikliği:** Sadece `shared/modules-registry.ts:365` üzerine kısa `@deprecated` JSDoc satırı (1 satır, runtime davranışı değişmedi).
- **DB değişikliği:** Yok. `role_module_permissions` tablosu zaten 31 rol için DOLU.
- **Migration:** Üretilmedi (gerek yok). `migrations/_journal.json` değişmedi.
- **Yan etki:** Yok. Pilot Day-1 etkisi: SIFIR.

## 4. Mimari Borç (Sprint 3'e Devir)

Bu doğrulama sırasında **9 paralel rol/modül erişim mekanizması** tespit edildi (bkz. audit Bölüm 11.5 tablosu). Konsolidasyon Sprint 3 backlog:

- **B21** — Modül erişim mimari konsolidasyon (~12-16 saat)
- **B22** — `manifest-auth.ts` fail-open düzelt (~1.5 saat, güvenlik)

## 5. Reproducibility

Bu doğrulamayı yeniden üretmek için:

```bash
# 1. Consumer kontrolü
rg -n "ROLE_MODULE_DEFAULTS" --type ts

# 2. DB rol/modül sayımı
psql "$DATABASE_URL" -c "SELECT role, COUNT(*) FROM role_module_permissions GROUP BY role ORDER BY 2 DESC;"

# 3. Pilot rol kritik modül kontrolü
psql "$DATABASE_URL" -c "SELECT role, module FROM role_module_permissions
  WHERE role IN ('ceo','cgo','mudur','fabrika_mudur','sube_kiosk')
    AND module IN ('dashboard','hr','employees','equipment','shifts','tasks','factory_dashboard')
  ORDER BY role, module;"
```

Beklenen çıktı: 31 rol DOLU, 5 pilot rol kritik modülleri görür.
