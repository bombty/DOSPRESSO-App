# Vardiya Planlama UI — Yetki Test Raporu

**Tarih:** 21 Nisan 2026
**Test Türü:** Kod incelemesi (statik) + erişim doğrulama
**Aslan kararı referansı:** S2 — "Müdür kendi şubesi için, Coach tüm şubeler için"

---

## 1. Vardiya UI Dosyaları

| Konum | Açıklama |
|-------|----------|
| `client/src/pages/vardiya-planlama.tsx` | Yönetici paneli (asıl planlama UI) — `/vardiya-planlama` |
| `client/src/pages/vardiyalarim.tsx` | Personel görünümü — `/vardiyalarim` |
| `client/src/pages/vardiyalar.tsx` | Liste/takip — `/vardiyalar` |
| `client/src/pages/vardiya-checkin.tsx` | Vardiya başlat/bitir — `/vardiya-checkin` |
| `client/src/pages/hq-vardiya-goruntuleme.tsx` | HQ izleme (read-only) — `/hq-vardiya-goruntuleme` |
| `client/src/pages/fabrika/vardiya-planlama.tsx` | Fabrika özel planlama |
| `client/src/pages/personel-musaitlik.tsx` | Personel müsaitlik girişi |

**Module gate:** `ModuleGuard` ile "vardiya" modülü kontrol edilir (sayfa düzeyinde).

---

## 2. Server Tarafı Yetki Kontrolleri

**Ana dosya:** `server/routes/shifts.ts`

### Bulk Create (`POST /api/shifts/bulk-create`)
**Satır 1448:**
```typescript
if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'mudur', 'admin'].includes(role)) {
  return res.status(403).json({ message: "Vardiya oluşturma yetkiniz yok" });
}
```

**Satır 1483-1486 (branch izolasyon):**
```typescript
const invalidBranch = shiftsData.find(s => isBranchRole(role) && s.branchId !== user.branchId);
if (invalidBranch) {
  return res.status(403).json({ message: "Sadece kendi şubeniz için vardiya oluşturabilirsiniz" });
}
```

### Update (`PATCH /api/shifts/:id`) — Satır 1652
```typescript
if (!isHQRole(role) && !['supervisor', 'supervisor_buddy', 'mudur', 'admin'].includes(role)) {
  return res.status(403).json({ message: "Yetkiniz yok" });
}
```

### Delete (`DELETE /api/shifts/:id`) — Satır 1778
Aynı yetki bloğu.

### Genel Endpoint'ler (291, 394, 427, 461, 489)
Coach + supervisor + admin + HQ explicit beyaz listede.

---

## 3. Aslan S2 Kararı — Doğrulama

| Senaryo | Beklenen | Kod Durumu | Sonuç |
|---------|----------|------------|-------|
| Mudur kendi şubesine vardiya oluştur | ✅ Yetkili | `'mudur' in list` + `isBranchRole` filtre | ✅ DOĞRU |
| Mudur başka şubeye vardiya oluştur | ❌ Reddedilmeli | `isBranchRole(role) && branchId !== user.branchId` → 403 | ✅ DOĞRU |
| Coach tüm şubelere vardiya oluştur | ✅ Yetkili (4 lokasyon) | `isHQRole(role)` → branch kontrol bypass | ✅ DOĞRU |
| Supervisor kendi şubesine | ✅ Yetkili | `'supervisor' in list` + `isBranchRole` | ✅ DOĞRU |
| Barista vardiya oluştur | ❌ Reddedilmeli | `!isHQRole + not in list` → 403 | ✅ DOĞRU |

**Sonuç:** Aslan'ın S2 kararı **mevcut kodda zaten karşılanmıştır**. Kod değişikliği gerekmiyor.

---

## 4. Pilot Lokasyonları için Vardiya Sahipliği

| Lokasyon | Branch ID | Mudur (kendi şubesi) | Coach (HQ — tüm şubeler) |
|----------|-----------|----------------------|--------------------------|
| Işıklar | 5 | ✅ branchId=5 mudur | ✅ HQ Coach |
| Lara | 8 | ✅ branchId=8 mudur | ✅ HQ Coach |
| HQ | 23 | (admin) | ✅ HQ Coach |
| Fabrika | 24 | ✅ Fabrika mudur (Eren) | ✅ HQ Coach |

---

## 5. API Smoke Test Sonuçları (21 Nis 2026 — Yapıldı ✅)

**adminhq ile gerçek API testi** (Coach yetki seviyesi simülasyonu, isHQRole=true):

```
POST /api/login (adminhq / 0000) → 200 OK
POST /api/shifts/bulk-create (branchId=5, shiftDate=2099-01-01) → 201 OK
  Response: {"message":"1 vardiya oluşturuldu","shifts":[{"id":55891, ...}]}
DELETE /api/shifts/55891 → 200 OK (test verisi temizlendi)
GET /api/shifts?branchId=5&startDate=2026-04-28&endDate=2026-05-04 → 200 OK
```

**Sonuç:** Vardiya planlama API ÇALIŞIYOR. "Mart'tan beri çökmüş" iddiası **doğrulanmadı** — API tarafı sağlam. UI tarafında bir bug varsa pilot öncesi browser smoke test ile yakalanır.

### Kalan Smoke Test (Browser - Coach + Mudur)

Aşağıdaki test 26 Nis Cumartesi adminhq + yavuz (coach) hesaplarıyla browser'dan yapılmalı:

### Coach Smoke Test (HQ rolü)
- [ ] `/vardiya-planlama` aç → şube seçici görünür
- [ ] Şube 5 (Işıklar) seç → hafta tablosu açılır
- [ ] Vardiya ekle (örn: Pzt 08:00-16:00, barista X) → kaydet → 200 OK
- [ ] Şube 8 (Lara) seç → hafta tablosu açılır → vardiya ekle → 200 OK
- [ ] Şube 24 (Fabrika) için aynı

### Mudur Smoke Test (Branch rolü)
- [ ] Mudur (branchId=5) login
- [ ] `/vardiya-planlama` aç → kendi şube otomatik (5)
- [ ] Vardiya ekle → 200 OK
- [ ] Diğer şubeyi seçmeye çalış → UI engellemese bile API → 403 ("Sadece kendi şubeniz için...")

### Beklenen Sonuç
- Coach 4 lokasyon için planlama yapabilir
- Mudur sadece kendi şubesine planlama yapabilir
- Barista/personel `/vardiya-planlama` rotasına erişemez (ModuleGuard + API yetki)

---

## 6. Pilot Hazırlık Aksiyonları

1. **Coach hesabı pilot öncesi tanımlı olmalı** (HQ rolünde, branchId=null veya 23)
2. **4 lokasyonun mudur hesabı pilot öncesi parolası rotasyonu yapılmış olmalı** (1Password)
3. **Vardiya planları pilot başlamadan önce 28 Nis - 4 May haftası için Coach tarafından girilmeli** (Aslan S2)
4. **Manuel smoke test pilot öncesi hafta sonu (26 Nis Cumartesi) yapılmalı** — yukarıdaki checklist

---

## 7. Bilinen Notlar

- "Mart'tan beri çökmüş vardiya planlama" referansı (önceki session) — kod incelemesinde **yetki sistemi sağlam** görünüyor. Çökme muhtemelen UI/data layer'da ya da o dönem aktif olmayan bir başka bug'da. Pilot öncesi smoke test bunu tespit edecek.
- Mevcut UI üzerinden manuel girişin yeterli olduğu Aslan tarafından doğrulandı (S2). SQL ile manuel girme **YAPILMAYACAK**.

---

**Rapor sahibi:** Replit Agent
**Sonraki adım:** Pilot öncesi 26 Nis Cumartesi manuel smoke test (Coach + 1 mudur), sonuçların `docs/pilot/day-1-report.md`'ye yansıtılması.
