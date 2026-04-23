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

> Not: `test-employee` (coach) hesabı pilot demo amaçlıydı; 23 Nis 2026
> itibariyle kiosk PIN deaktive edildi ve hesap soft-delete yapıldı (Task #127).

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

### 3.1 Otomatik Audit (Task #136)

Yukarıdaki sorgu `scripts/pilot/audit-hq-kiosk-pins.ts` içinde otomatize
edildi. Çalıştırma:

```bash
tsx scripts/pilot/audit-hq-kiosk-pins.ts
```

Çıktılar (`docs/pilot/audit/` altına tarih damgalı):
- `hq-kiosk-pins-<YYYY-MM-DD>.json` — yapısal kayıt (CI/cron için)
- `hq-kiosk-pins-<YYYY-MM-DD>.md` — pilot raporuna eklenebilir özet

Exit kodu: `0 = PASS` (0 ihlal), `1 = FAIL` (deaktive iş listesi MD içinde),
`2 = beklenmedik hata`. Pilot kick-off (28 Nis) öncesi manuel veya cron ile
çalıştırılır.

**Otomatik scheduler (Task #212, 23 Nis 2026):** `server/scheduler/hq-kiosk-pin-audit.ts`
modülü `startHqKioskPinAuditScheduler()` ile sunucu açılışında devreye girer
ve her gece **02:00 (Europe/Istanbul)** audit'i tetikler. Aynı çekirdek
fonksiyon (`runHqKioskPinAudit`) hem CLI script hem scheduler tarafından
kullanılır; pilot süresince (28 Nis – 5 May) günlük denetim insansız çalışır.

- **PASS**: stdout'a tek satır log (`[HQ Kiosk PIN Audit] PASS — ihlal yok…`),
  `docs/pilot/audit/hq-kiosk-pins-<YYYY-MM-DD>.{json,md}` üretilir.
- **FAIL**: aynı raporlara ek olarak `audit_logs` tablosuna kayıt düşer
  (`event_type = 'kiosk.hq_pin_audit_alert'`, `action = 'ALERT'`,
  `details` içinde ihlal listesi + rapor yolları). Bu kayıt pilot kanalına
  alarm akıtmak için tüketilir; manuel deaktive akışı §3 ve §4'te.
- Üretilen `docs/pilot/audit/*.{json,md}` dosyaları repo'ya otomatik
  commitlenmez; günlük raporlarda (`docs/pilot/day-X-report.md`) ilgili
  tarihin md dosyasına link verilir.

---

## 4. İstisna Prosedürü

Sunucu tarafında **soft-guard** mevcuttur (Sprint #128, 23 Nis 2026):
`POST /api/branches/:branchId/kiosk/set-pin` endpoint'i HQ rolündeki bir
kullanıcıya `branchId != 23` ile PIN açılmasını **400 hata** ile engeller.
Yanıt kodu: `HQ_USER_BRANCH_PIN_BLOCKED`.

Pilot süresince HQ user'a Lara/Işıklar/Fabrika için PIN gerekirse:
1. Aslan'dan WhatsApp "DOSPRESSO Pilot — HQ" üzerinden onay alınır
2. adminhq, `/admin/branches/:branchId/staff` üzerinden manuel PIN açar.
   İstek body'sine **mutlaka** override flag'i eklenir:
   ```json
   { "userId": "<id>", "pin": "1234", "force": true,
     "reason": "Aslan onayı 23 Nis 14:30 — Lara'da geçici barista vardiyası" }
   ```
   `force: true` gönderildiğinde sunucu `audit_logs` tablosuna
   `eventType: 'kiosk.hq_pin_exception'` ve
   `details.type: 'HQ_KIOSK_PIN_EXCEPTION'` kaydı düşer (gerekçe + onay
   veren admin id dahil).
3. Bu istisna `docs/pilot/day-1-report.md` (veya ilgili gün raporu) altına
   tarih + gerekçe ile eklenir
4. Pilot bitiminde (5 Mayıs sonrası) istisna PIN'leri toplu deaktive edilir.
   İstisna kayıtları için sorgu:
   ```sql
   SELECT created_at, user_id AS approver, details
   FROM audit_logs
   WHERE event_type = 'kiosk.hq_pin_exception'
   ORDER BY created_at DESC;
   ```

---

## 5. Onay

- [x] Politika yazıldı (Replit Agent, 23 Nis 2026)
- [ ] Aslan onayı (28 Nis pilot kick-off öncesi)
- [ ] adminhq doğrulama sorgusunu çalıştırdı (28 Nis 08:15)
