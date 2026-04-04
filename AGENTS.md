# DOSPRESSO — AI Agent Kuralları
**Bu dosyayı her kod değişikliği öncesi oku. İster Claude ister Replit Agent ol.**

---

## 1. GIT KURALLARI

```
✅ git pull --rebase origin main
❌ git reset --hard (ASLA — schema fix'leri kaybolur)
❌ Token'ı dosya içine yazma (push reject olur)
✅ Her commit öncesi: npm run build (frontend + backend geçmeli)
```

### Push Komutu:
```bash
git push https://[TOKEN]@github.com/bombty/DOSPRESSO-App.git HEAD:main
```

### Çakışma Olursa:
```bash
git pull --rebase origin main
# Çakışmaları çöz
git add -A && git rebase --continue
git push
```

---

## 2. İŞ PAYLAŞIMI

| Kim | Ne Yapar | Ne YAPMAZ |
|-----|----------|-----------|
| **Claude** | Büyük feature, yeni sayfa, yeni endpoint, mimari değişiklik | Replit'te test, deploy, screenshot |
| **Replit Agent** | git pull, server restart, test, küçük hotfix (typo, eksik import, SQL hata) | Yeni sayfa oluşturma, büyük refactor, mimari karar |

### Replit Agent Hotfix Kuralları:
- Sadece küçük düzeltmeler: typo, eksik import, enum uyumsuzluğu, SQL syntax
- Düzeltme öncesi `npm run build` test et
- Push öncesi `npm run build` tekrar test et
- Büyük değişiklik gerekiyorsa → YAPMA, sadece raporla

---

## 3. KOD STANDARTLARI

### Türkçe UI (zorunlu):
```
✅ ş, ç, ğ, ı, ö, ü, İ, Ş, Ç, Ğ, Ö, Ü
❌ s, c, g, i, o, u (ASCII yakınlaştırma YASAK)
✅ "Görev oluşturuldu", "Şube seçin", "Tamamlandı"
❌ "Save", "Cancel", "Delete", "Loading..."
```

### Null Safety (en sık crash nedeni):
```typescript
// DOĞRU:
Number(value ?? 0).toFixed(1)
Array.isArray(data) ? data : (data?.data || [])
data?.stats?.rating

// YANLIŞ:
value.toFixed(1)
data.map(...)
data.stats.rating
```

### Auth Middleware (her endpoint'te zorunlu):
```typescript
router.get("/api/resource", isAuthenticated, async (req, res) => {
  // Branch scope:
  const branchId = isHQRole(req.user.role) ? req.query.branchId : req.user.branchId;
});
```

### Error Response (her zaman Türkçe):
```json
{ "error": "Bu işlem için yetkiniz bulunmamaktadır." }
```

---

## 4. VERİ GÜVENLİĞİ — KRİTİK

### Veri Akışı: Şube → HQ (tek yön, ters YASAK)

### Şube çalışanı ASLA göremez:
- HQ muhasebe verileri
- Fabrika üretim maliyetleri
- Tedarikçi fiyatları
- Diğer şubelerin verileri
- Personel maaşları (kendi hariç)
- Franchise sözleşmeleri

### Yeni endpoint yazarken:
1. `isAuthenticated` ekle
2. Gerekirse `isHQOrAdmin` veya rol kontrolü ekle
3. Branch verisi ise `branchId` scope filtresi ekle
4. Test: barista olarak login → endpoint'i çağır → 403 almalı

---

## 5. VERİTABANI KURALLARI

### İsimlendirme:
- Tablo: snake_case (audit_templates_v2)
- Kolon: camelCase in Drizzle (templateId, createdAt)
- Timestamp: her zaman timezone ile

### Soft Delete:
```typescript
// İş verisi asla hard delete YAPMA:
await db.update(table).set({ isActive: false, deletedAt: new Date() });
// İstisna: sessions, tokens, cache
```

### Transaction (kritik tablolarda zorunlu):
factory_shipments, payroll, branch_inventory, change_requests

---

## 6. FRONTEND KURALLARI

### Her sayfa useQuery ile:
```typescript
if (isLoading) return <LoadingState />;
if (isError) return <ErrorState onRetry={() => refetch()} />;
```

### Dark Mode:
```
❌ bg-white, text-black (hardcoded)
✅ bg-white dark:bg-slate-900 (her zaman dark variant)
```

### Checkbox Tıklama:
```tsx
// Radix Checkbox click'i yakalar, parent div'e geçirmez
// Çözüm: pointer-events-none wrapper
<div onClick={() => toggle()}>
  <div className="pointer-events-none"><Checkbox checked={isChecked} /></div>
</div>
```

---

## 7. DENETİM SİSTEMİ v2

### API prefix: /api/v2/
### 9 tablo: schema-20-audit-v2.ts
### 7 soru tipi: checkbox, yesno, rating, stars, select, photo, text
### Skor kuralı: şube denetim → Supervisor etkiler, Barista ETKİLEMEZ
### Route dosyası: server/routes/audit-v2.ts

---

## 8. PROJE SİSTEMİ v2

### 10 tablo: schema-06.ts
### franchise_projects AYRI tablo — projects ile KARIŞTIRMA
### yeni-sube-detay.tsx (3245L) — Sprint 3'e kadar DOKUNMA
### Proje rolleri: owner, editor, contributor, viewer

---

## 9. MR. DOBODY AGENT

### Güvenlik: girdi erişim kontrolü (scope bazlı)
### Çıktıyı filtreleme DEĞİL, girdiye erişimi kısıtla
### Erişemediği veriyi sızdıramaz
### Plan: docs/DOBODY-AGENT-PLAN.md

---

## 10. BUILD & TEST

```bash
# Frontend build:
npx vite build

# Backend build:
npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Her ikisi de hatasız geçmeli!
```

---

## 11. ÖNEMLİ DOSYA KONUMLARI

| Dosya | Açıklama |
|-------|----------|
| shared/schema/schema-20-audit-v2.ts | Denetim v2 tabloları (9 tablo) |
| server/routes/audit-v2.ts | Denetim v2 API (20+ endpoint) |
| client/src/pages/proje-detay.tsx | Proje detay (6 tab) |
| client/src/pages/coach-sube-denetim.tsx | Denetim formu (7 soru tipi) |
| client/src/pages/denetim-detay-v2.tsx | Denetim detay + aksiyon |
| client/src/pages/denetim-sablonlari.tsx | Şablon yönetimi |
| docs/DOBODY-AGENT-PLAN.md | Agent sistemi planı |
| docs/DENETIM-SISTEMI-PLAN.md | Denetim planı |
| docs/PROJE-SISTEMI-PLAN.md | Proje planı |
