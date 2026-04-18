# 00 — Çapraz Rol Matrisi (Cross-Role Matrix)
**Üretim Tarihi**: 2026-04-18  
**Kapsam**: 31 rol × tüm modüller — onay zincirleri, görev akışı, bildirim hiyerarşisi.

---

## 1. Rol Kategorileri & Kullanıcı Sayıları

| Kategori | Roller | Toplam Aktif Kullanıcı |
|----------|--------|------------------------|
| **EXECUTIVE** | admin, ceo, cgo | **9** |
| **HQ_DEPARTMENT** | muhasebe, muhasebe_ik, satinalma, coach, trainer, marketing, kalite_kontrol, gida_muhendisi, teknik, destek, yatirimci_hq | **13** |
| **BRANCH** | mudur, supervisor, supervisor_buddy, bar_buddy, barista, stajyer, yatirimci_branch, sube_kiosk | **339** |
| **FACTORY** | fabrika, fabrika_mudur, uretim_sefi, fabrika_operator, fabrika_sorumlu, fabrika_personel, fabrika_depo, sef, recete_gm | **11** |

GENEL TOPLAM: **372** aktif kullanıcı (372 hedef pilotta dahil).

---

## 2. Onay Yetkisi Matrisi (Approve Permission)

| Modül | Onay Yetkisi Olan Roller | Toplam |
|-------|--------------------------|--------|
| `branch_inspection` | admin, coach | 2 |
| `checklists` | supervisor, mudur | 2 |
| `complaints` | admin | 1 |
| `crm_campaigns` | admin, cgo | 2 |
| `crm_complaints` | admin, cgo | 2 |
| `crm_dashboard` | admin, cgo | 2 |
| `crm_feedback` | admin, cgo | 2 |
| `customer_satisfaction` | admin, coach | 2 |
| `employees` | admin, coach, supervisor, mudur | 4 |
| `equipment_faults` | admin, satinalma, teknik | 3 |
| `factory_compliance` | admin | 1 |
| `factory_food_safety` | admin, gida_muhendisi | 2 |
| `factory_quality` | admin, gida_muhendisi | 2 |
| `faults` | admin, satinalma, teknik | 3 |
| `food_safety` | admin, gida_muhendisi | 2 |
| `hr` | admin, coach | 2 |
| `knowledge_base` | admin, coach | 2 |
| `leave_requests` | admin, muhasebe_ik, coach, fabrika_mudur, supervisor, mudur | 6 |
| `overtime_requests` | admin, muhasebe_ik, coach, fabrika_mudur, supervisor, mudur | 6 |
| `product_complaints` | admin, kalite_kontrol, gida_muhendisi | 3 |
| `projects` | admin, coach | 2 |
| `purchase_orders` | admin, satinalma | 2 |
| `quality_audit` | admin, coach, gida_muhendisi | 3 |
| `support` | destek | 1 |
| `tasks` | admin, ceo, cgo, coach, fabrika_mudur, supervisor, mudur, recete_gm | 8 |
| `training` | admin, coach, supervisor, mudur | 4 |

**Tek onaylayıcısı olan modüller (SPOF risk)**:
- `support` → SADECE `destek` (admin hariç)

---

## 3. Görev Atama Hiyerarşisi

| Rol | Görev Oluşturabilir | Görev Doğrulayabilir | Tipik Atayan → Atanan |
|-----|---------------------|----------------------|------------------------|
| `admin` | ✅ | ✅ | admin → tüm roller |
| `ceo` | ✅ | ✅ | ceo → tüm roller |
| `cgo` | ✅ | ✅ | cgo → tüm roller |
| `muhasebe_ik` | ❌ | ❌ | muhasebe_ik → HQ + şube müdür/supervisor |
| `satinalma` | ✅ | ❌ | satinalma → HQ + şube müdür/supervisor |
| `coach` | ✅ | ✅ | coach → HQ + şube müdür/supervisor |
| `marketing` | ❌ | ❌ | marketing → HQ + şube müdür/supervisor |
| `trainer` | ❌ | ❌ | trainer → HQ + şube müdür/supervisor |
| `kalite_kontrol` | ❌ | ❌ | kalite_kontrol → HQ + şube müdür/supervisor |
| `gida_muhendisi` | ✅ | ❌ | gida_muhendisi → HQ + şube müdür/supervisor |
| `fabrika_mudur` | ✅ | ✅ | fabrika_mudur → uretim_sefi/operator/depo |
| `muhasebe` | ❌ | ❌ | muhasebe → HQ + şube müdür/supervisor |
| `teknik` | ❌ | ❌ | teknik → HQ + şube müdür/supervisor |
| `destek` | ✅ | ❌ | destek → HQ + şube müdür/supervisor |
| `fabrika` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `yatirimci_hq` | ❌ | ❌ | yatirimci_hq → HQ + şube müdür/supervisor |
| `stajyer` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `bar_buddy` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `barista` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `supervisor_buddy` | ✅ | ❌ | _(görev alır, atamaz)_ |
| `supervisor` | ✅ | ✅ | supervisor → barista/bar_buddy/stajyer |
| `mudur` | ✅ | ✅ | mudur → supervisor/barista/stajyer |
| `yatirimci_branch` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `uretim_sefi` | ✅ | ❌ | uretim_sefi → fabrika_operator |
| `fabrika_operator` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `fabrika_sorumlu` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `fabrika_personel` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `fabrika_depo` | ❌ | ❌ | _(görev alır, atamaz)_ |
| `sef` | ✅ | ❌ | _(görev alır, atamaz)_ |
| `recete_gm` | ✅ | ✅ | _(görev alır, atamaz)_ |
| `sube_kiosk` | ❌ | ❌ | _(görev alır, atamaz)_ |

---

## 4. Bildirim Eskalasyon Zinciri

### 4.1 İzin (Leave Request) Akışı
```
[Personel] → POST /api/leave-requests
    ↓
[mudur (şube)] → POST /api/leave-requests/:id/approve
    ↓ (onay verirse)
[muhasebe_ik] → bordro hesaplamasına entegre
    ↓ (reddedilirse)
[Personel] → bildirim + sebep
```

### 4.2 Mesai (Overtime) Akışı
```
[Personel] → POST /api/overtime-requests
    ↓
[supervisor] → 1. seviye onay
    ↓
[mudur] → 2. seviye onay (saatlik eşik üstü)
    ↓
[muhasebe_ik] → bordro entegrasyon
```

### 4.3 Vardiya Değişimi (Shift Swap) — Çift Onay
```
[Personel A] → POST /api/shift-swaps (target=Personel B)
    ↓
[Personel B] → onay/red (target_approved)
    ↓ (B onayladıysa)
[supervisor/mudur] → ikinci onay (supervisor_approved)
    ↓
[Sistem] → vardiya değişimi otomatik uygulanır
```

### 4.4 Satın Alma (Purchase Order) Akışı
```
[satinalma] → POST /api/purchase-orders (draft)
    ↓
[satinalma] → submit
    ↓ (₺ eşik altı)
[satinalma] → kendi onaylar
    ↓ (₺ eşik üstü)
[muhasebe_ik / cgo] → ikinci onay
    ↓
[Tedarikçi] → siparişi alır
    ↓
[fabrika_depo / mudur] → mal kabul (goods_receipt)
```

### 4.5 Ekipman Arıza (Equipment Fault) Akışı
```
[barista/supervisor/mudur] → POST /api/equipment-faults (severity)
    ↓
[teknik] → triaj + servis sağlayıcı seçimi
    ↓
[teknik / satinalma] → faultServiceTracking güncelleme
    ↓ (status=servis_tamamlandi)
[mudur] → teslim alma + kalibrasyon test
    ↓
[teknik] → kapanış (kapandi)
```

### 4.6 Müşteri Şikâyeti (Customer Complaint) Akışı
```
[Müşteri] → QR feedback / form / telefon
    ↓
[Sistem] → guestComplaints (SLA hesaplama)
    ↓
[destek] → triaj + atama
    ↓ (severity=high/critical)
[mudur (şube)] / [marketing] / [kalite_kontrol] → aksiyon
    ↓
[destek] → kapanış + müşteri memnuniyet anketi
```

### 4.7 Kalite Denetimi (Branch Inspection) Akışı
```
[coach] → /coach-sube-denetim → denetim formu doldurur
    ↓
[Sistem] → branchQualityAudits + actionItems
    ↓ (skor < eşik)
[mudur] → CAPA aç (capa-detay)
    ↓
[coach] → follow-up denetim (followUpDate)
    ↓
[cgo] → trend görür (CGO Command Center)
```

### 4.8 Üretim Hata / Atık (Factory Waste) Akışı
```
[fabrika_operator] → atık raporlar (kiosk)
    ↓
[uretim_sefi] → sebep analizi
    ↓ (kritik fire)
[fabrika_mudur] → CAPA + eğitim
    ↓
[gida_muhendisi] → reçete revizyonu (gerekiyorsa)
    ↓
[recete_gm] → reçete onay & yayınlama
```

---

## 5. Modül Erişim Yoğunluk Matrisi (Heatmap)

Her hücre: rolün modüldeki yetki seviyesi (V=View, W=Write/CRUD, A=Approve, .=hiç yok).

| Modül | admi | ceo  | cgo  | muha | sati | coac | mark | trai | kali | gida | fabr | muha | tekn | dest | fabr | yati | staj | bar_ | bari | supe | supe | mudu | yati | uret | fabr | fabr | fabr | fabr | sef  | rece | sube |
|--------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|------|
| `dashboard         ` |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |
| `tasks             ` |   A   |   A   |   A   |   V   |   W   |   A   |   V   |   V   |   V   |   W   |   A   |   V   |   V   |   W   |   V   |   .   |   V   |   W   |   W   |   W   |   A   |   A   |   .   |   W   |   W   |   W   |   W   |   W   |   W   |   A   |   W   |
| `checklists        ` |   W   |   V   |   W   |   V   |   V   |   W   |   V   |   V   |   W   |   W   |   W   |   V   |   V   |   V   |   V   |   .   |   V   |   W   |   W   |   V   |   A   |   A   |   .   |   W   |   W   |   W   |   W   |   V   |   W   |   W   |   W   |
| `equipment         ` |   W   |   V   |   V   |   V   |   W   |   V   |   .   |   .   |   V   |   V   |   W   |   V   |   W   |   V   |   V   |   .   |   V   |   V   |   V   |   V   |   V   |   W   |   V   |   W   |   V   |   W   |   V   |   V   |   V   |   W   |   V   |
| `equipment_faults  ` |   A   |   V   |   V   |   V   |   A   |   V   |   .   |   .   |   V   |   V   |   W   |   V   |   A   |   W   |   V   |   .   |   .   |   W   |   W   |   W   |   W   |   W   |   .   |   W   |   W   |   W   |   W   |   W   |   W   |   W   |   W   |
| `hr                ` |   A   |   V   |   V   |   W   |   .   |   A   |   .   |   .   |   .   |   .   |   V   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   V   |   W   |   W   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |
| `training          ` |   A   |   V   |   V   |   V   |   V   |   A   |   V   |   W   |   V   |   W   |   V   |   V   |   V   |   V   |   V   |   .   |   V   |   V   |   V   |   V   |   A   |   A   |   .   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |
| `leave_requests    ` |   A   |   V   |   V   |   A   |   .   |   A   |   .   |   .   |   .   |   .   |   A   |   V   |   .   |   .   |   .   |   .   |   W   |   W   |   W   |   W   |   A   |   A   |   .   |   V   |   .   |   W   |   .   |   .   |   .   |   .   |   .   |
| `overtime_requests ` |   A   |   V   |   V   |   A   |   .   |   A   |   .   |   .   |   .   |   .   |   A   |   V   |   .   |   .   |   .   |   .   |   W   |   W   |   W   |   W   |   A   |   A   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |
| `accounting        ` |   W   |   V   |   V   |   W   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   W   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |
| `factory_production` |   W   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   W   |   W   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   W   |   .   |   .   |   .   |   V   |   V   |   W   |   .   |
| `factory_quality   ` |   A   |   V   |   V   |   .   |   .   |   V   |   .   |   .   |   W   |   A   |   W   |   .   |   .   |   .   |   W   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   W   |   W   |   W   |   V   |   V   |   V   |   W   |   .   |
| `satinalma         ` |   W   |   V   |   V   |   V   |   W   |   .   |   .   |   .   |   .   |   .   |   V   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   V   |   .   |
| `purchase_orders   ` |   A   |   V   |   V   |   V   |   A   |   .   |   .   |   .   |   .   |   .   |   V   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   V   |   .   |   .   |   .   |   V   |   .   |   V   |   .   |
| `crm_dashboard     ` |   A   |   V   |   A   |   .   |   .   |   V   |   V   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |
| `quality_audit     ` |   A   |   V   |   V   |   V   |   .   |   A   |   .   |   .   |   W   |   A   |   V   |   V   |   .   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   V   |   .   |   V   |   .   |   .   |   .   |   V   |   .   |
| `academy           ` |   W   |   V   |   V   |   V   |   W   |   W   |   V   |   W   |   V   |   V   |   V   |   W   |   V   |   V   |   W   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |
| `reports           ` |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   V   |   .   |   .   |   .   |   V   |   V   |   V   |   V   |   V   |   .   |   V   |   .   |   V   |   V   |   V   |   .   |
| `users             ` |   W   |   V   |   V   |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |
| `admin_settings    ` |   V   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |   .   |

**Renk yorumu**: `A` = Onay yetkisi (en yüksek), `W` = Yazma yetkisi, `V` = Sadece görüntüleme, `.` = Yetki yok.

---

## 6. Dashboard Widget Atama Matrisi

| Rol | Atanan Widget | Eksik Tipik Widget |
|-----|---------------|---------------------|
| `admin` | 19 adet | ✅ tam |
| `ceo` | 15 adet | ✅ tam |
| `cgo` | 11 adet | financial_overview |
| `muhasebe_ik` | 8 adet | ✅ tam |
| `satinalma` | 6 adet | ✅ tam |
| `coach` | 12 adet | ✅ tam |
| `marketing` | 6 adet | ✅ tam |
| `trainer` | 5 adet | ✅ tam |
| `kalite_kontrol` | 6 adet | ✅ tam |
| `gida_muhendisi` | 6 adet | ✅ tam |
| `fabrika_mudur` | 10 adet | ✅ tam |
| `muhasebe` | 7 adet | ✅ tam |
| `teknik` | 8 adet | ✅ tam |
| `destek` | 7 adet | ✅ tam |
| `fabrika` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `yatirimci_hq` | 1 adet | ai_briefing, todays_tasks, quick_actions |
| `stajyer` | 3 adet | branch_status, staff_count |
| `bar_buddy` | 3 adet | branch_status, staff_count |
| `barista` | 3 adet | branch_status, staff_count |
| `supervisor_buddy` | 5 adet | ✅ tam |
| `supervisor` | 11 adet | ✅ tam |
| `mudur` | 10 adet | ✅ tam |
| `yatirimci_branch` | 10 adet | todays_tasks |
| `uretim_sefi` | 7 adet | ✅ tam |
| `fabrika_operator` | 3 adet | qc_stats, staff_count |
| `fabrika_sorumlu` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `fabrika_personel` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `fabrika_depo` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `sef` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `recete_gm` | 0 adet | factory_production, qc_stats, staff_count, todays_tasks |
| `sube_kiosk` | 0 adet | todays_tasks, branch_status, staff_count, quick_actions |

---

## 7. Kiosk & PIN-Based Roller

| Rol | Login Tipi | Endpoint |
|-----|-----------|----------|
| `sube_kiosk` | PIN (4-6 haneli) | `POST /api/kiosk/sube/login` |
| `fabrika_operator` | PIN (vardiya açılışı) | `POST /api/kiosk/fabrika/login` |
| Diğer roller | username + bcrypt password | `POST /api/login` |
