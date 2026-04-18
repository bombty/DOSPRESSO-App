# Sprint E — Dashboard Tamamlama + Hayalet Rol Temizliği (FINAL KAPSAM)

**Tarih:** 18 Nisan 2026 (Cumartesi akşam — Replit 3. tur DB doğrulaması sonrası)
**Replit raporu:** Sprint D+E Birleşik DB Doğrulama Raporu
**Durum:** Kapsam NETLEŞTİ — 2 gün, güvenli temizlik

---

## 🔄 Önceki Plan vs Yeni Plan

### ❌ Önceki Hedef
> "Dashboard 14 rol widget tamamlama + Rol konsolidasyon 27→18"

### ✅ Yeni Hedef (Replit doğrulaması sonrası, 2 gün)
> "3 role dashboard widget + 5 hayalet rolü sil + supervisor_buddy deprecation temizliği + widget dengesizliği UX"

**Büyük konsolidasyon (27→18) Sprint I'ya erteleniyor** — pilot sırasında rol değişimi riskli.

---

## 🔍 Replit Bulguları

### 1. Dashboard Widget Eksik Roller (4 rol — beklenen 2 değil)

| Rol | Aktif User | Durum |
|------|:--:|:--|
| `sube_kiosk` | 18 | 🟡 Kiosk modu — dashboard GÖRMEMESİ LAZIM (doğru) |
| `sef` | 1 | 🔴 Aktif rol, dashboard EKSİK |
| `fabrika_depo` | 1 | 🔴 Aktif rol, dashboard EKSİK |
| `recete_gm` | 1 | 🔴 Aktif rol, dashboard EKSİK |

**Gerçek eksik: 3 rol** (sube_kiosk kasıtlı olarak dashboard görmüyor)

### 2. Hayalet Rol Envanteri (5 rol tamamen boş)

| Rol | Toplam User | Aktif | Durum |
|------|:--:|:--:|:--|
| `fabrika_operator` | 6 | 3 | ✅ GERÇEK ROL — dashboard eklenmeli |
| `fabrika_pisman` | 0 | 0 | ❌ Hayalet — silinebilir |
| `fabrika_kalite` | 0 | 0 | ❌ Hayalet — silinebilir |
| `fabrika_sorumlu` | 0 | 0 | ❌ Hayalet — silinebilir |
| `fabrika_personel` | 0 | 0 | ❌ Hayalet — silinebilir |
| `fabrika` (legacy) | 0 | 0 | ❌ Hayalet — silinebilir |

**Sonuç:** `fabrika_operator` gerçek rol (3 aktif user), diğer 5 rol TAMAMEN boş — silinebilir.

### 3. supervisor_buddy Deprecation (İlginç Bulgu)

```
supervisor_buddy: 0 aktif user, 39 pasif user
```

39 pasif user var ama 0 aktif! Muhtemelen bu rol **deprecate edilmiş**, kullanıcılar pasifleştirilmiş ama rol schema'da kalmış. Temizlik gerekli.

### 4. Widget Dengesizliği (UX Sorunu)

```
En çok widget:  admin (19), ceo (15), coach (12)
En az widget:   yatirimci_hq (1), bar_buddy (3), barista (3), stajyer (3)
```

Barista'nın sadece 3 widget'ı var — ama barista **mobil kullanıcı** (şubede çalışıyor). Bu az widget **kasıtlı mı, eksik mi?** UX kontrolü gerekli.

---

## 🎯 Sprint E — 5 Alt-İş (2 gün toplam)

### E.1: 3 Role Dashboard Widget Seed (0.5 gün) 🔴

**Amaç:** sef, fabrika_depo, recete_gm için default widget set oluştur

**Adımlar:**
1. Diğer fabrika rollerinin widget listesini incele (fabrika_mudur örnek)
2. Her rol için özel widget set:
   - **sef:** Günlük reçete listesi, üretim planı, QC durumu
   - **fabrika_depo:** Stok durumu, mal kabul kuyruğu, fire takibi
   - **recete_gm:** Reçete havuzu, maliyet analizi, revizyon talepleri
3. `dashboard_role_widgets` tablosuna INSERT
4. Test: bu 3 kullanıcı login olunca dashboard görmeli

**Acceptance:** 3 aktif user ilk giriş = dashboard görür

### E.2: fabrika_operator Widget Seed (0.25 gün)

**Amaç:** 6 user'lık gerçek role dashboard ekle

**Adımlar:**
1. fabrika_operator profili tanımla (üretim hattı operatörü)
2. Widget'lar: aktif vardiya, bugünkü üretim hedefi, QC reddi, duyurular
3. Seed INSERT

**Acceptance:** 3 aktif fabrika_operator dashboard görür

### E.3: sube_kiosk Muafiyet Kuralı (0.25 gün) 🟡

**Amaç:** Kiosk rolü `dashboard_role_widgets` raporunda "eksik" gözükmesin

**Adımlar:**
1. Kiosk rolü kasıtlı olarak dashboard görmüyor (PDKS UI kullanıyor)
2. `dashboard_role_widgets` tablosunda bu rol için özel flag:
   - `is_kiosk_role = true` (veya benzer)
   - Ya da admin UI'da bu rolü "excluded" olarak göster
3. Health check'te false positive yaratmasın

**Acceptance:** Sube_kiosk health check'te "eksik" rolü olarak sayılmaz

### E.4: 5 Hayalet Rolü Arşivle (0.5 gün) 🟡

**Amaç:** 0 user'lı 5 rolü temiz şekilde kaldır

**Silinecek roller:**
- `fabrika_pisman` (0 user)
- `fabrika_kalite` (0 user)
- `fabrika_sorumlu` (0 user)
- `fabrika_personel` (0 user)
- `fabrika` (legacy, 0 user)

**Adımlar:**
1. Güvenlik kontrolü:
   - Hiç user bu rolde mi? (0 beklendi)
   - Permissions matrix'te referans var mı?
   - Route guards'ta geçiyor mu?
2. Temiz silme:
   - `schema-01.ts` UserRole enum'dan kaldır
   - `schema-02.ts` PERMISSIONS map'ten kaldır
   - `DashboardRouter.tsx` FACTORY_ROLES dizisinden kaldır
   - `dashboard-widgets-routes.ts` eski rol referanslarını kaldır
   - `seed-role-templates.ts` eski template'leri kaldır
   - `notification-level-filter.ts` eski ayarları kaldır
3. `audit_logs` tablosuna silme kaydı

**Acceptance:** 5 hayalet rol kod tabanında yok, build başarılı, regresyon yok

### E.5: supervisor_buddy Deprecation Temizliği (0.5 gün) 🟡

**Amaç:** 39 pasif user var ama 0 aktif — rol kullanımdan kaldırılmış, kalıntılar temizlensin

**Adımlar:**
1. Aslan'a teyit: supervisor_buddy kullanımdan kalktı mı?
   - Eğer evet: rol arşivle, 39 pasif user başka role taşı veya silinsin
   - Eğer hayır: neden 0 aktif? test kullanıcıları mı?
2. Karar sonrası:
   - Arşiv durumda: E.4 gibi sil
   - Aktif durumda: yeni user'lar ataması planlansın

**Acceptance:** supervisor_buddy durumu netleşti (aktif veya arşiv)

### E.6: Widget Dengesizliği UX Kontrolü (0.5 gün)

**Amaç:** barista (3 widget) vs admin (19 widget) farkı kasıtlı mı incele

**Adımlar:**
1. Barista mobil kullanım akışı test et
2. 3 widget yeterli mi?
   - "Bugünkü vardiyam"
   - "Görevlerim"
   - "Duyurular"
3. Daha fazla lazımsa öneriler:
   - Performans skoru
   - Akademi ilerleme
   - Checklist durumu
4. Aslan onayı ile widget ekle/değiştir

**Acceptance:** Barista mobil akışı test edilmiş, widget sayısı kasıtlı/optimize

---

## 📋 Sprint E Toplam

| Alt-Sprint | Süre | Kritiklik |
|:--:|:--:|:--:|
| E.1 3 Role Widget Seed | 0.5g | 🔴 |
| E.2 fabrika_operator Widget | 0.25g | 🟡 |
| E.3 sube_kiosk Muafiyet | 0.25g | 🟡 |
| E.4 5 Hayalet Rol Sil | 0.5g | 🟡 |
| E.5 supervisor_buddy Temizlik | 0.5g | 🟡 |
| E.6 Widget UX Kontrolü | 0.5g | 🟢 |
| **TOPLAM** | **2.5 gün** | - |

---

## 🚧 Büyük Rol Konsolidasyon Ertelendi (Sprint I)

Orijinal planda "27 rol → 18 rol konsolidasyon" vardı. Şu an **erteleniyor**:

**Sebep:** Pilot sırasında user role değişimi:
- Permission matrix kırılabilir
- Route guards beklenmedik yerlerde fail olabilir
- User retraining gerekir

**Sprint I (Hafta 9+):** Pilot stabilize olduktan sonra, **production seviyesinde** rol konsolidasyonu yapılır.

---

## 📦 Commit Stratejisi

```
feat(dashboard): Sprint E.1 — 3 rol için widget seed (sef, fabrika_depo, recete_gm)
feat(dashboard): Sprint E.2 — fabrika_operator widget seed
fix(dashboard): Sprint E.3 — sube_kiosk kiosk muafiyet kuralı
chore(roles): Sprint E.4 — 5 hayalet rol arşivlendi
chore(roles): Sprint E.5 — supervisor_buddy deprecation temizliği
refactor(dashboard): Sprint E.6 — barista widget set UX iyileştirme
```

---

## 💡 Aslan'a Sorulacak

1. **supervisor_buddy** — deprecate edildi mi, neden 0 aktif 39 pasif?
2. **fabrika_pisman** — "Pişman" pasta şefi rolü var mı yoksa tamamen typo mu?
   - Replit: DB'de **0 user** → gerçekte kullanılmıyor
   - Silinebilir ama Aslan'a teyit
3. **barista widget sayısı** (3) — mobil kullanım için yeterli mi?
