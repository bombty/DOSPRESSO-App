# Sprint E — Dashboard & Rol Konsolidasyon Kod Analizi

**Tarih:** 18 Nisan 2026 (Cumartesi öğleden sonra)
**Hazırlayan:** Claude (IT Danışman)
**Durum:** Kod analizi tamam, Replit DB kontrolü beklemede

---

## 🎯 Amaç

Sprint E'nin orijinal planı: **"Dashboard tamamlama 14 rol, Rol konsolidasyon 27→18"**

Replit Sprint A raporunda "14 rol boş dashboard" iddiamın **yanlış** olduğunu, gerçekte **sadece 2 rol eksik** olduğunu söyledi. Kod analizi ile bunu doğrulayalım ve gerçek Sprint E kapsamını çıkaralım.

---

## 🔍 Dashboard Mimarisi

### 2 Katmanlı Dashboard Sistemi

**1. MissionControl Bileşenleri (8 adet)** — rol gruplarına göre dashboard
```
client/src/components/mission-control/
├── MissionControlHQ.tsx         → ceo, cgo, admin
├── MissionControlDynamic.tsx    → satinalma, marketing, kalite_kontrol,
│                                  gida_muhendisi, teknik, destek (+ fallback)
├── MissionControlCoach.tsx      → coach, trainer
├── MissionControlMuhasebe.tsx   → muhasebe_ik, muhasebe
├── MissionControlYatirimci.tsx  → yatirimci_branch, yatirimci_hq
├── MissionControlSupervisor.tsx → supervisor, supervisor_buddy, mudur
├── MissionControlStajyer.tsx    → stajyer, bar_buddy, barista
└── MissionControlFabrika.tsx    → fabrika_mudur, uretim_sefi, ...
```

**2. Centrum Sayfaları (12 adet)** — detaylı modül dashboard'ları
```
client/src/pages/
├── satinalma-centrum.tsx
├── muhasebe-centrum.tsx
├── depo-centrum.tsx
├── fabrika-centrum.tsx
├── sube-centrum.tsx
├── supervisor-centrum.tsx
├── supbuddy-centrum.tsx
├── personel-centrum.tsx
├── destek-centrum.tsx
├── marketing-centrum.tsx
├── yatirimci-centrum.tsx
└── yatirimci-hq-centrum.tsx
```

**İki sistem farklı amaç için:**
- Mission Control = Günlük özet (hero cards, Dobody briefs)
- Centrum = Detaylı modül yönetimi (tabs, tables, forms)

### Dashboard Widget Sistemi (DB)

```
dashboard_widgets:          tüm widget'ların kaydı
dashboard_role_widgets:     rol başına hangi widget aktif (Replit: 24/26 dolu)
dashboard_widget_items:     widget içindeki iteratif öğeler
dashboard_module_visibility: modül erişim kontrolü
dashboard_alerts:           dashboard uyarıları
```

---

## 🔴 Tespit Edilen Sorunlar

### Sorun 1: Rol Tutarsızlığı — Schema vs Router

| Rol | schema-01.ts UserRole | DashboardRouter | Durum |
|------|:--:|:--:|:--|
| `fabrika` | ✅ var (legacy) | ❌ yok | **Router'da dashboard eksik** |
| `fabrika_operator` | ✅ var | ❌ yok | **Router'da dashboard eksik** |
| `sube_kiosk` | ✅ var | ❌ yok | Doğru — kiosk dashboard görmez |
| `fabrika_kalite` | ❌ schema'da YOK | ✅ router'da var | **Hayalet rol** (ama kullanılıyor!) |
| `fabrika_pisman` | ❌ schema'da YOK | ✅ router'da var | **Hayalet rol** (ama kullanılıyor!) |

**Kritik:** `fabrika_pisman` ("Pişman" — pasta şefi/yardımcı pasta şefi olabilir) ve `fabrika_kalite`:
- `server/routes/dashboard-widgets-routes.ts`: FACTORY_ROLES listesinde
- `server/seed-role-templates.ts`: seed rol olarak
- `server/services/notification-level-filter.ts`: bildirim ayarları
- `client/src/components/mission-control/DobodyPanel.tsx`: "Üretim asistanı" label
- `client/src/components/mission-control/shared/StaffCard.tsx`: "Pişman" label
- `client/src/lib/role-routes.ts`: `/fabrika-centrum` route

Yani **kodun her yerine dağılmış 2 rol**, ama schema'da UserRole enum'da YOK. Bu **typescript ile bile yakalanamayan tutarsızlık**.

### Sorun 2: Replit Bulgusu — `dashboard_role_widgets` Eksiklik

Replit: "24/26 rol widget dolu, 2 eksik"

Tahminim **eksik olan 2 rol**:
1. `fabrika_operator` (schema'da var, Router'da yok, widget assignment'ı da eksik)
2. Biri daha (Replit SQL ile netleşir)

### Sorun 3: Rol Konsolidasyon İhtiyacı (27→18)

Raporumda "27 rol var, 18'e düşürülmeli" demiştim. Hangi roller konsolide edilebilir?

**Potansiyel Konsolidasyon (12 rol):**

| Konsolide et | Nereye | Neden |
|---|---|---|
| `muhasebe` (eski) | → `muhasebe_ik` | Fonksiyon aynı, legacy rol |
| `fabrika` (eski) | → `fabrika_mudur` | Legacy generic rol |
| `fabrika_personel` | → `fabrika_operator` | 0 kullanıcı, gereksiz |
| `fabrika_sorumlu` | → `fabrika_mudur` | 0 kullanıcı, gereksiz |
| `fabrika_kalite` | → `kalite_kontrol` | Fabrika kalite = genel kalite kontrol aynı iş |
| `fabrika_pisman` | → `fabrika_operator` | "Pişman" → üretim operatörü |
| `destek` | → `teknik` | Destek = teknik destek, aynı rol |
| `marketing` | → CGO altında | 1 kullanıcı, doğrudan CGO'ya |
| `trainer` | → `coach` | Yetki seti %90 örtüşüyor |
| `yatirimci_hq` | → `yatirimci_branch` | 1 kullanıcı, tek yapı |

**31 → ~20 rol** (Aslan'ın 18 hedefi yakın).

Ama **dikkat:** Bu konsolidasyon **büyük bir iş**. Her rol için:
- Permissions matrix güncelle (schema-02.ts)
- Route guards güncelle
- Widget assignments taşı
- User table'daki role'leri migrate et (rol X olan kullanıcılar artık Y)
- Sidebar menu_items güncelle
- Audit trail

### Sorun 4: Kör Nokta — `fabrika_pisman`

Sprint A'daki Rapor v1.0'da bu rolü **hiç bahsetmedim**. Yani:
- Schema'da YOK ama kullanılıyor
- Raporda YOK ama kritik bir pasta şefi rolü
- Kod tipler kontrol etmemiş

---

## 🎯 Sprint E — Gerçek Kapsam (Revize)

### Önceki Plan:
> "Dashboard tamamlama 14 rol, Rol konsolidasyon 27→18"

### Revize Plan (4 ana iş):

**E.1: Dashboard Widget Eksikliği (0.5 gün)** 🔴
- Replit DB kontrolüyle eksik 2 rolü bul (`dashboard_role_widgets` tablosu)
- Muhtemelen: `fabrika_operator` + 1 başka
- Widget'ları ata (default template kullan)
- Test: bu roller login olup dashboard'ı görebilsin

**E.2: Rol Tutarsızlığı Çözümü (1 gün)** 🟡
- `fabrika_kalite` ve `fabrika_pisman` schema'ya ekle VEYA kaldır
- Schema'da tanımla + `UserRole` enum'a ekle
- VEYA kod'dan sil (hangisi doğruysa)
- **Karar Aslan'a:** Bu roller gerçek mi, hayal mi?

**E.3: Rol Konsolidasyon — Sadece Ölü Roller (1 gün)** 🟢
- **Güvenli konsolidasyon:** 0 kullanıcılı rolleri sil
  - `fabrika_sorumlu`, `fabrika_personel` → Sprint A'da tespit edildi (0 kullanıcı)
- **Sadece legacy rolleri deprecated yap:** `fabrika`, `muhasebe` (eski versiyon)
- **DİKKAT:** Gerçek kullanıcısı olan rolleri birleştirme (breaking change, pilot sonrası)

**E.4: Mission Control Rol Eşleme Temizliği (0.5 gün)**
- DashboardRouter.tsx'teki typo'ları düzelt (`fabrika_pisman`, `fabrika_kalite`)
- 31 rol → 31 dashboard eşleme (hiç rol eksiksiz olmasın)
- Manifest ile doğrulanabilir test eklenebilir

### Toplam Süre: 3 gün (pilot öncesi güvenli temizlik)

### Erteleme: Büyük Rol Konsolidasyon → Sprint I (Hafta 9+)

**12 rolün gerçek konsolidasyonu büyük iş** — pilot sırasında yapmak riskli çünkü:
- Mevcut kullanıcı rolleri değişir
- Permission akışlarını kırabilir
- Frontend UI beklenmedik yerlerde bozulur

Pilot sonrası, **stabil bir sürümde** yapılsın (Sprint I).

---

## 📋 Replit'ten İstenecek DB Doğrulaması

```sql
-- E1. Dashboard widget assignment eksikliği
SELECT DISTINCT role 
FROM users 
WHERE is_active = true 
  AND role NOT IN (
    SELECT DISTINCT role FROM dashboard_role_widgets WHERE is_enabled = true
  );
-- Beklenen: 2 rol — hangi 2 rol?

-- E2. Her rolün kaç widget'ı var?
SELECT role, COUNT(*) as widget_count, 
       SUM(CASE WHEN is_enabled THEN 1 ELSE 0 END) as enabled
FROM dashboard_role_widgets
GROUP BY role
ORDER BY widget_count DESC;

-- E3. Hayalet rol kontrolü (schema'da olmayan ama kullanılan)
SELECT role, COUNT(*) as user_count
FROM users
WHERE is_active = true
GROUP BY role
ORDER BY user_count DESC;
-- fabrika_pisman veya fabrika_kalite rollü kullanıcı var mı?

-- E4. Ölü roller (0 kullanıcı)
SELECT role, COUNT(*) 
FROM users 
GROUP BY role
HAVING COUNT(*) = 0;
-- Bu sorgu users tablosunda 0 kullanıcılı rolü bulmaz (yok zaten)
-- Alternatif: enum listesi ile karşılaştır

-- E5. Rol dağılımı (kim kaç kişi)
SELECT role, 
       COUNT(*) FILTER (WHERE is_active = true) as aktif,
       COUNT(*) FILTER (WHERE is_active = false) as pasif,
       COUNT(*) as toplam
FROM users
GROUP BY role
ORDER BY aktif DESC;
```

---

## 📦 Sprint E Acceptance

| # | Kriter | Hedef |
|:-:|--------|-------|
| 1 | Tüm aktif roller widget'lı | `dashboard_role_widgets` tüm aktif rolleri kapsar |
| 2 | Schema-Router tutarlı | DashboardRouter'da schema'da olmayan rol YOK |
| 3 | Hayalet roller netleşti | `fabrika_pisman`, `fabrika_kalite` ya schema'ya eklendi ya kod'dan silindi |
| 4 | Ölü roller temiz | 0 kullanıcılı rol yok (schema'dan silindi) |
| 5 | Tüm roller dashboard'lı | Her aktif rol DashboardRouter'dan bir dashboard alır |

---

## 🚧 Sprint E Bağımlılıkları

- **Sprint E ← A:** Rol tutarsızlığı Sprint A'da "30/31 roles consistent" iddiası vardı, tam değilmiş
- **Sprint E → Pilot:** Tüm pilot kullanıcılarının dashboard'ı olması şart

---

## 💡 Aslan'a Öneri

Sprint E **küçük ama çok önemli bir sprint**. 3 gün sürecek ama:
- **Pilot güvenliği:** Her kullanıcı dashboard görüyor
- **Kod hijyeni:** Schema ile router tutarlı
- **Dokümantasyon:** Hangi rol ne iş yapıyor net

**Ama büyük rol konsolidasyonu (12 rol → 6 rol) Sprint I'ya ertelenmeli** — pilot sırasında rol değişimi riskli.

Aslan'a sorulacak: `fabrika_pisman` (Pişman) ve `fabrika_kalite` gerçek rol mü, yoksa typo/legacy mi?
