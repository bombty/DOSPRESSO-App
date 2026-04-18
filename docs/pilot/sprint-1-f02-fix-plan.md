# Sprint I — F02 Module Flags Runtime Fix Plan

**Sprint dönem**: 5 May - 12 May 2026 (Pilot sonrası ilk hafta)  
**Hazırlayan**: Replit Agent  
**Kaynak Bulgu**: `docs/pilot/f02-kod-inceleme-raporu.md` §4 (KRİTİK YAPISAL BULGU)  
**Aslan Onayı Bekleniyor**: Pilot Day-7 raporu sonrası

---

## 1. Sorunun Özeti

### Tespit (Cumartesi 19 Nis 2026)
- Tüm `client/src/pages/fabrika/*.tsx` dosyalarında `useModuleFlag` çağrısı **0 sonuç**
- Tüm `client/src/pages/**` taraması: **0 sonuç** (genel yapısal sorun)
- Module flag'ler sadece `/admin/module-flags` panelinde "Açık/Kapalı" gösteriyor
- **Runtime'da hiçbir koruma yok** — disabled flag'li modül route'una erişim 200 OK döner

### Risk
- Admin "modülü kapadım" sanıyor → kullanıcılar hâlâ erişebiliyor
- **Silent fail / yanlış güvenlik hissi**
- KVKK / audit sorunu (devre dışı modül loglaması)

---

## 2. İki Çözüm Seçeneği

### Seçenek A — Module Flags'i KALDIR (4 saat) 🗑️
**Yaklaşım**: Boşa duran sistemi temizle.

**Adımlar**:
1. `module_flags` tablosu drop
2. `dashboard_role_widgets` rol bazlı yetkilendirmeye geç
3. `/admin/module-flags` admin sayfası sil
4. Backend `module-flags-routes.ts` sil
5. Frontend `useModuleFlag` hook sil

**Avantaj**: Kod borç temizliği, basitleşme  
**Dezavantaj**: Granular kapatma kapasitesi kaybolur (ileride gerekebilir)

---

### Seçenek B — Module Flags'i CANLANDIR (8 saat) ⚡ **ÖNERİLEN**
**Yaklaşım**: Mevcut sistemi gerçek koruma haline getir.

**Adımlar**:
1. **Hook iyileştirme** (1 saat):
   - `useModuleFlag(key)` zaten var (`hooks/useModuleFlag.ts`)
   - Hierarchical resolver: global → branch → role
   - Cache strategy: TanStack Query 5 dk staleTime
   
2. **Sayfa korumaları** (4 saat):
   - 31 ana sayfaya `useModuleFlag` çağrısı ekle:
     - `pages/fabrika/*.tsx` (8 sayfa)
     - `pages/akademi/*.tsx` (5 sayfa)
     - `pages/crm/*.tsx` (4 sayfa)
     - `pages/satinalma/*.tsx` (3 sayfa)
     - `pages/dobody/*.tsx` (3 sayfa)
     - Kalan 8 sayfa (HR, kalite, finans)
   - Disabled flag → `<ModuleDisabledPage moduleKey={...} />` component
   
3. **Sidebar filtresi** (2 saat):
   - `client/src/components/sidebar/AppSidebar.tsx` → menu items için flag check
   - Disabled modüller sidebar'da görünmez (tamamen gizli)

4. **API koruması** (1 saat):
   - Backend middleware: `requireModuleFlag(moduleKey)` 
   - Disabled modül endpoint'leri 403 + `{ error: 'MODULE_DISABLED' }`
   - Frontend hata yakalayıcı: 403 → "Modül kapalı" toast

---

## 3. Önerilen Aksiyon — Seçenek B (Detaylı)

### Tasarım: `<ModuleDisabledPage />` Component

```tsx
// client/src/components/ModuleDisabledPage.tsx
export function ModuleDisabledPage({ moduleKey }: { moduleKey: string }) {
  return (
    <div className="flex h-screen items-center justify-center" data-testid={`page-module-disabled-${moduleKey}`}>
      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Modül Kullanılamıyor</CardTitle>
        </CardHeader>
        <CardContent>
          <p>Bu modül şu anda devre dışı bırakılmış. Yöneticinizle iletişime geçin.</p>
          <p className="text-xs text-muted-foreground mt-2">Modül: <code>{moduleKey}</code></p>
        </CardContent>
        <CardFooter>
          <Button asChild>
            <Link href="/">Ana Sayfaya Dön</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
```

### Sayfa Kullanım Pattern'i

```tsx
// pages/fabrika/quality.tsx (örnek)
import { useModuleFlag } from "@/hooks/useModuleFlag";
import { ModuleDisabledPage } from "@/components/ModuleDisabledPage";

export default function FabrikaQualityPage() {
  const { isEnabled, isLoading } = useModuleFlag('fabrika.quality');
  
  if (isLoading) return <PageSkeleton />;
  if (!isEnabled) return <ModuleDisabledPage moduleKey="fabrika.quality" />;
  
  return (/* normal page content */);
}
```

### Backend Middleware Pattern

```typescript
// server/middleware/requireModuleFlag.ts
export function requireModuleFlag(moduleKey: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const flag = await db.query.moduleFlags.findFirst({
      where: and(
        eq(moduleFlags.moduleKey, moduleKey),
        eq(moduleFlags.scope, 'global'),
        isNull(moduleFlags.deletedAt)
      )
    });
    
    if (!flag?.isEnabled) {
      return res.status(403).json({
        error: 'MODULE_DISABLED',
        moduleKey,
        message: 'Bu modül şu anda devre dışı'
      });
    }
    next();
  };
}

// Kullanım: server/routes/fabrika-quality.ts
router.use(requireModuleFlag('fabrika.quality'));
```

---

## 4. Çalışma Tahmini

| Görev | Süre | Bağımlılık |
|---|---|---|
| Hook + ModuleDisabledPage component | 1 saat | — |
| Backend middleware + 1 örnek route | 1 saat | Hook |
| Sayfa korumaları (31 sayfa) | 4 saat | Component |
| Sidebar filtresi | 2 saat | Hook |
| Smoke test (10 modül enable/disable senaryosu) | 1 saat | Tüm yukarıdaki |
| Dokümantasyon | 30 dk | — |
| **Toplam** | **~9.5 saat** | |

---

## 5. Bağımlılıklar & Riskler

### Bağımlılıklar
- `useModuleFlag` hook mevcut mu? (kontrol et: `client/src/hooks/`)
- `module_flags` tablosu güncel mi? (Pazartesi F01+F02 sonrası)
- Mr. Dobody flag check'i ayrı çalışıyor mu? (`dobody.flow` etkilenecek mi?)

### Riskler
- 31 sayfaya değişiklik = regresyon riski yüksek
- Çözüm: Her sayfa için ayrı PR (kademeli rollout)
- Smoke test: Her modülü manuel toggle edip 5 user perspektifinden test

---

## 6. Acceptance Kriterleri

- [ ] `module_flags` tablosunda `is_enabled=false` olan modülün route'u **403** döner (API)
- [ ] Disabled modül sayfasına gidince `<ModuleDisabledPage>` görünür (UI)
- [ ] Disabled modül sidebar menüsünde **görünmez**
- [ ] Aslan dashboard'undan toggle yapınca → 5 dk içinde tüm kullanıcılarda etkili
- [ ] Audit log: her `module_flag` toggle audit_logs'a düşer
- [ ] 31 sayfa için `useModuleFlag` çağrısı eklenmiş

---

## 7. Sprint I Sıralı Plan (5-12 May 2026)

| Gün | İş |
|---|---|
| Pzt 5 May | Hook + Component + Backend middleware (3 saat) |
| Sal 6 May | Fabrika 8 sayfa korumaları (3 saat) |
| Çar 7 May | Akademi + CRM 9 sayfa (3 saat) |
| Per 8 May | Geri kalan 14 sayfa + sidebar filter (3 saat) |
| Cum 9 May | Smoke test + bug fix (2 saat) |
| Cum 9 May | Production deploy + audit log doğrulama (1 saat) |

**Toplam**: 5 iş günü × 2-3 saat = ~13 saat (buffer ile)

---

## 8. Pilot Day-7 Karar Tablosu

Pilot Day-7 (5 May 2026) raporu sonrası Aslan kararı:

| Pilot Sonuç | Sprint I F02 Fix Önceliği |
|---|---|
| 4/4 ✅ tüm hafta | Yüksek — hemen başla (Pzt 5 May) |
| 3/4 🟡 ortalama | Orta — Sprint I sonuna sıkıştır |
| 2/4 🔴 ortalama | Düşük — başka kritik fix önce |
| ≤1/4 🚨 | Erteleme — pilot değerlendirme önce |

---

## 9. Pilot Sonrası İlk Aksiyon

Sprint I başlamadan önce **Pazartesi 5 May 09:00** task ref'i oluşturulacak:
> "F02 Module Flags Runtime Etkinleştirme — Seçenek B"

Bu plan dosyası task description'ı olur.

**Sorumlu**: Replit Agent (planı task'a çevir), Aslan (önceliklendirme onayı)
