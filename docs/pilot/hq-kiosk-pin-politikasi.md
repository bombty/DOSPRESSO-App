# HQ Kullanıcıları İçin Kiosk PIN Politikası

**Tarih:** 23 Nisan 2026
**Karar Sahibi:** Aslan (CEO) + adminhq
**İlgili Task:** Sprint #125 — HQ user'ları için kiosk PIN giriş stratejisi
**İlgili Script:** `scripts/pilot/17-pin-reseed.ts` (canonical v2)

---

## 1. Sorun

`scripts/pilot/17-pin-reseed.ts` v1 sürümü `users.branchId IN (5,8,23,24)` filtresi
kullanıyordu. HQ rollerindeki kullanıcıların büyük kısmı (`admin`, `ceo`, `cgo`,
`muhasebe_ik`, `satinalma`, `kalite_kontrol`, `marketing`, `teknik`, `trainer`,
`coach`, `destek`, `yatirimci_hq`) DB'de `users.branch_id = NULL` olarak duruyor.
Bu yüzden v1 reseed çalıştığında "Branch 23 (HQ) - 0 aktif user" uyarısı veriyordu.

v2 sürümü `branch_staff_pins` tablosunu doğrudan iterate eder; `users.branch_id`
filtresi yoktur. Böylece cross-branch PIN kayıtları (HQ user → herhangi bir şube)
da reseed kapsamına girer.

---

## 2. Karar (28 Nis Pilot için)

### A. HQ kullanıcılarının kiosk girişi opsiyoneldir
HQ rollerindeki kullanıcıların **birincil giriş yolu** web `/login` (kullanıcı
adı + parola). Mission Control dashboard'larına ulaşmak için kiosk gerekmez.

### B. Kiosk PIN sadece HQ branch (23) içindir
HQ rollerinden bir kullanıcıya kiosk PIN verilirse, **yalnızca Branch 23
(Merkez Ofis HQ)** kapsamında verilir. HQ user için Lara (8), Işıklar (5) veya
Fabrika (24) `branch_staff_pins` kaydı **açılmaz**.

**Gerekçe:** HQ user'ın şubeye gidip `sube_kiosk` akışına dahil olması role
karışıklığı (örn. CEO'nun barista vardiyası açması) ve audit log gürültüsü
yaratır. Şubede acil bir kiosk işlemi gerekirse o şubenin aktif `mudur` veya
`supervisor` PIN'i kullanılır.

### C. Fabrika tarafı `factory_staff_pins` ile ayrı yönetilir
HQ user `factory_staff_pins` tablosuna **eklenmez**. Fabrika kiosk PIN'leri
sadece fabrika rolleri içindir (`fabrika_mudur`, `gida_muhendisi`, `uretim_sefi`,
`sef`, `recete_gm`, `fabrika_depo`, `fabrika_operator`).

### D. Mevcut HQ kiosk PIN sahipleri (23 Nis 2026 itibariyle)
| Kullanıcı | Rol | Branch | Gerekçe |
|-----------|-----|--------|---------|
| `adminhq` | admin | 23 (HQ) | Acil bakım/IT erişimi |
| `ece` (trainer) | trainer | 23 (HQ) | HQ kiosk demo + akademi modülü |
| `test-employee` (coach) | coach | 23 (HQ) | Test hesabı (pilot sonrası kaldırılacak) |

Diğer 12 HQ rolündeki kullanıcı (Aslan, Ali, Utku, Mahmut, Samet, Ümran, Diana,
Murat, Yavuz, Ayşe, Mehmet, vb.) kiosk PIN'i **YOK** ve gerekmiyor.

---

## 3. Doğrulama Sorgusu

```sql
-- HQ branch dışında HQ rolünde aktif kiosk PIN var mı? Beklenen: 0 satır.
SELECT bsp.branch_id, b.name AS branch_name, u.username, u.role
FROM branch_staff_pins bsp
JOIN users u ON u.id = bsp.user_id
JOIN branches b ON b.id = bsp.branch_id
WHERE bsp.is_active = true
  AND bsp.branch_id != 23
  AND u.role IN ('admin','ceo','cgo','ceo_observer','muhasebe_ik','satinalma',
                 'kalite_kontrol','marketing','teknik','trainer','coach','destek',
                 'yatirimci_hq');
```

Bu sorgu **boş dönmelidir**. Bir satır gelirse ilgili kayıt deaktive edilir:
```sql
UPDATE branch_staff_pins SET is_active = false WHERE id = <pin_id>;
```

---

## 4. İstisna Prosedürü

Pilot süresince HQ user'a Lara/Işıklar/Fabrika için PIN gerekirse:
1. Aslan'dan WhatsApp "DOSPRESSO Pilot — HQ" üzerinden onay alınır
2. adminhq, `/admin/branches/:branchId/staff` üzerinden manuel PIN açar
3. Bu istisna `docs/pilot/day-1-report.md` (veya ilgili gün raporu) altına
   tarih + gerekçe ile eklenir
4. Pilot bitiminde (5 Mayıs sonrası) istisna PIN'leri toplu deaktive edilir

---

## 5. Onay

- [x] Politika yazıldı (Replit Agent, 23 Nis 2026)
- [ ] Aslan onayı (28 Nis pilot kick-off öncesi)
- [ ] adminhq doğrulama sorgusunu çalıştırdı (28 Nis 08:15)
