# O06 — Fabrika Müdürü (Eren) Mali Yetki Senkron

**Pazartesi 28 Nis 2026, 10:00-12:00 (2 saat)**  
**Bulgu**: F02-related — `fabrika_mudur` rolüne `accounting` widget atanmış (`schema-02.ts:1868`) ama PERMISSIONS map'inde `accounting.read` yetkisi yok → Eren mali panele girince 403.

---

## 1. Tespit (Cumartesi öncesinden)

```typescript
// shared/schema/schema-02.ts:1868 (fabrika_mudur block)
fabrika_mudur: {
  // ...
  // ❌ accounting yetkisi YOK (sadece widget atanmış)
}

// dashboard_role_widgets DB
| role            | widget_key          |
|-----------------|---------------------|
| fabrika_mudur   | financial_overview  |  ← AMA permission yok → widget endpoint 403
```

---

## 2. Çözüm (2 saat)

### 2.1 PERMISSIONS Map Patch (1 saat)

```typescript
// shared/schema/schema-02.ts — fabrika_mudur block
fabrika_mudur: {
  // ... existing permissions ...
  
  // ✅ EKLENECEK: Mali panel okuma yetkisi
  accounting: {
    read: true,        // Mali rapor görüntüleme
    write: false,      // Yazma YOK (muhasebe rolüne ait)
    approve: false,    // Onay YOK
    delete: false,
  },
  
  // Fabrika maliyet panelleri için (zaten varsa atla)
  cost_management: {
    read: true,
    write: true,       // Fabrika maliyet girişi
    approve: false,
    delete: false,
  },
  
  // Fabrika finansal raporlar
  financial_reports: {
    read: true,
    write: false,
    approve: false,
    delete: false,
  },
},
```

### 2.2 Widget Endpoint Patch (30 dk)

```typescript
// server/routes/unified-dashboard-routes.ts
// financial_overview widget handler — fabrika_mudur için filtre
case 'financial_overview':
  if (user.role === 'fabrika_mudur') {
    // ✅ Sadece fabrika maliyet verisi (tüm finans değil)
    return await getFinancialOverviewForFabrika(user.branchId);
  } else if (['admin', 'ceo', 'cgo', 'muhasebe'].includes(user.role)) {
    return await getFinancialOverviewFull();
  } else {
    throw new Error('FORBIDDEN');
  }
```

### 2.3 Smoke Test (30 dk)

```bash
# Eren login → /fabrika/dashboard → mali widget yüklenmeli
curl -X GET "$REPLIT_DEV_DOMAIN/api/me/dashboard-data" \
  -H "Cookie: connect.sid=<eren_session>" \
  | jq '.widgets[] | select(.key == "financial_overview")'

# Beklenen: { "key": "financial_overview", "data": { "monthly_cost": 1234567, ... } }
# 403 dönmüyor olmalı
```

---

## 3. Risk & Geri Alma

| Risk | Mitigasyon |
|---|---|
| Eren tüm finansa erişim kazanır | `read: true, write: false` — sadece okuma |
| Fabrika dışı veri görür | Endpoint'te `branchId` filtresi |
| Audit eksik | Yeni rol-permission değişikliği audit log'a yazılmalı |

**Rollback**:
```typescript
// schema-02.ts — eklenen 3 block'u kaldır, git revert
git revert <commit-sha>
```

---

## 4. Değişen Dosyalar

- [ ] `shared/schema/schema-02.ts` (fabrika_mudur block — +12 satır)
- [ ] `server/routes/unified-dashboard-routes.ts` (financial_overview handler — +5 satır)
- [ ] `server/services/financial.service.ts` (getFinancialOverviewForFabrika — yeni fonksiyon, ~30 satır)

**Toplam diff**: ~50 satır
