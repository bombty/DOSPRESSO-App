# SHIFT_ATTENDANCE CHECK-OUT BUG PLANI

DOCS-ONLY plan dokümanı. Implementasyon ayrı IMPLEMENTATION mod + owner GO ile yapılır.

Son güncelleme: 2 Mayıs 2026  
Durum: **PLAN — implementasyon beklemede**  
Kaynak borç: `docs/DECISIONS.md` md. 15 (`shift_attendance` check-out kapanış mantığı açık teknik borç)  
İlgili: `docs/SPRINT-LIVE.md` "Sonraki 3 Adım" #2, `docs/runbooks/kiosk-pdks-test.md`, `docs/TEST-MATRIX.md`

---

## 1. Bug Özeti

| Alan | Değer |
|---|---|
| **Etkilenen tablo** | `shift_attendance` (`shared/schema/schema-03.ts:1100`) |
| **Etkilenen kolon** | `check_out_time` (timestamp, nullable) |
| **Mevcut davranış** | Kiosk shift-end işlemi sonrası bu kolon her zaman **NULL** kalır |
| **Etkilenen endpoint'ler** | Branch + HQ + Factory (3 endpoint, aynı pattern hatası) |
| **Severity** | Kayıt bütünlüğü riski (maaş etkilemez ama denetim/audit/rapor tutarsızlığı) |
| **Bilinme tarihi** | 29 Nis 2026 (md. 15 ile dokümante) |

---

## 2. Root Cause Analizi (READ-ONLY Sonucu)

### Branch Shift-End Endpoint (`server/routes/branches.ts:3273-3472`)

Mevcut handler şu tablolara dokunuyor:
- ✅ `branch_shift_sessions` UPDATE (`checkOutTime`, `workMinutes`, `netWorkMinutes`, `status`, `notes`, `checkOutLatitude/Longitude`)
- ✅ `branch_shift_events` INSERT (`check_out` event)
- ✅ `branch_shift_daily_summary` UPDATE/INSERT (günlük özet)
- ✅ `pdks_records` INSERT (`cikis` tipinde PDKS kaydı)
- ✅ `notifications` INSERT (erken çıkış / fazla mesai bildirimi)
- ✅ `branch_break_logs` UPDATE (mola kapama)
- ❌ `shift_attendance` — **HİÇ DOKUNULMUYOR**

### Check-In Tarafında Doğru Çalışıyor

Shift-start handler'ında (`branches.ts:~3010-3036`) shift_attendance kaydı doğru oluşturuluyor:
1. Var olan kayıt aranıyor (`shiftId + userId` ile)
2. Yoksa yeni kayıt INSERT ediliyor
3. **Kayıt id'si `branch_shift_sessions.shift_attendance_id` kolonuna linkleniyor**

Yani kapanış için ihtiyaç olan **link zaten mevcut** — handler sadece bu link üzerinden bir UPDATE atmıyor.

### Aynı Bug Diğer Endpoint'lerde

| Endpoint | Dosya/Satır | Durum |
|---|---|---|
| Branch shift-end | `branches.ts:3273-3472` | ❌ shift_attendance UPDATE eksik |
| HQ kiosk exit | `branches.ts:4331-4371` | ❌ Aynı bug |
| Factory end-shift | `factory.ts:~1855` | ❌ Aynı bug (factory_shift_compliance UPDATE ediliyor ama shift_attendance yok) |

---

## 3. Etki Analizi

### Maaş Etkisi → **YOK** (md. 13 + md. 15 doğrulu)

Bordro `pdks_daily_summary` (Excel import) üzerinden okunduğu için kiosk shift-end her durumda PDKS kaydını yazıyor. Maaş hesabı `shift_attendance.check_out_time` alanına bakmıyor. **Pilot Day-1 sırasında maaş güvenlik açığı YOK.**

### Etkilenen Sistem Bileşenleri

| Bileşen | Etki | Severity |
|---|---|---|
| `shift_attendance` audit raporları | check_out_time NULL → "kapatılmamış vardiya" gibi görünür | 🟡 ORTA |
| Erken çıkış / disiplin raporları | Devamsızlık modülü `shift_attendance.status` alanına bakıyorsa NULL check_out tutarsızlık üretir | 🟡 ORTA |
| Cross-tablo doğrulama (data integrity) | `branch_shift_sessions.checkOutTime` SET ama `shift_attendance.check_out_time` NULL → tutarsız çift kayıt | 🟡 ORTA |
| `attendance_penalties` ile bağlantı (`shared/schema/schema-05.ts:227`) | `shiftAttendanceId` FK var, ceza hesabında check_out_time NULL'a düşerse "vardiya kapanmamış" mantığı tetikleyebilir | 🟡 ORTA |
| KPI / dashboard widget'ları | Ortalama vardiya süresi `shift_attendance` üzerinden hesaplanıyorsa NULL check_out → 0 dakika sayılır | 🟢 DÜŞÜK (mevcut widget'lar `branch_shift_sessions` kullanıyor) |
| Mr. Dobody late arrival skill (`server/agent/skills/late-arrival-tracker.ts`) | `pdks-engine.ts:classifyDay` üzerinden çalışıyor, `shift_attendance` kullanmıyor | 🟢 ETKİSİZ |

### Tarihsel Veri Etkisi

Pilot Day-1 öncesi mevcut tüm `shift_attendance` kayıtlarında `check_out_time = NULL`. Eski test kayıtları (`PILOT_PRE_DAY1_TEST_2026_04_29` notlu) da NULL.

**Karar gerek:** Geriye dönük backfill yapılacak mı? (Bölüm 8 — Açık Kararlar #1)

---

## 4. Fix Tasarımı

### Minimum Fix (Branch shift-end için, ~5 satır)

`server/routes/branches.ts:3273-3472` içinde mevcut `branch_shift_sessions` UPDATE'inden sonra:

```typescript
// MEVCUT (özet):
await db.update(branchShiftSessions)
  .set({ checkOutTime: now, workMinutes, netWorkMinutes, status: 'completed', ... })
  .where(eq(branchShiftSessions.id, sessionId));

// EKLENECEK (yeni — minimum fix):
const session = await db.select({ shiftAttendanceId: branchShiftSessions.shiftAttendanceId })
  .from(branchShiftSessions)
  .where(eq(branchShiftSessions.id, sessionId))
  .then(rows => rows[0]);

if (session?.shiftAttendanceId) {
  await db.update(shiftAttendance)
    .set({ checkOutTime: now, status: 'completed' })  // status alanı varsa
    .where(eq(shiftAttendance.id, session.shiftAttendanceId));
}
```

### Aynı Pattern HQ ve Factory İçin

| Endpoint | Mevcut UPDATE Yeri | Eklenecek Blok |
|---|---|---|
| Branch shift-end | `branches.ts:~3450` (sonu) | Yukarıdaki blok |
| HQ kiosk exit | `branches.ts:~4360` | Aynı blok (`hqShiftSessions.shiftAttendanceId` üzerinden) |
| Factory end-shift | `factory.ts:~1900` | Aynı blok (`factoryShiftSessions.shiftAttendanceId` üzerinden) |

### Ortak Utility (Refactor Önerisi)

3 endpoint aynı bloku tekrar etmek yerine `shared/services/shift-attendance-service.ts` (yeni dosya):

```typescript
// shared/services/shift-attendance-service.ts (öneri)
export async function closeShiftAttendance(
  shiftAttendanceId: number | null | undefined,
  closeTime: Date = new Date()
) {
  if (!shiftAttendanceId) return;
  await db.update(shiftAttendance)
    .set({ checkOutTime: closeTime, status: 'completed' })
    .where(eq(shiftAttendance.id, shiftAttendanceId));
}
```

3 endpoint tek satırla çağırır:
```typescript
await closeShiftAttendance(session.shiftAttendanceId);
```

> **Karar gerek:** Minimum fix mi (3 yerde 5'er satır = 15 satır), refactor mi (1 utility + 3 çağrı)? Refactor daha temiz ama scope büyür → Bölüm 8 #2.

---

## 5. Implementasyon Adımları

### Faz A — Branch Endpoint Fix (IMPLEMENTATION mod)

1. **`server/routes/branches.ts:~3450`** — Branch shift-end handler'ında `branch_shift_sessions` UPDATE sonrası shift_attendance UPDATE bloğu ekle.
2. **Schema import doğrulama** — `branches.ts:72` `shiftAttendance` zaten import edilmiş ✅, ek import gerek yok.
3. **Hata handling** — `shiftAttendanceId` NULL ise sessiz geç (kiosk akışında değil de manuel session oluşturmuş eski kayıtlar olabilir).

### Faz B — HQ Endpoint Fix

4. **`server/routes/branches.ts:~4360`** — HQ kiosk exit handler'ında aynı blok.
5. **`hqShiftSessions.shiftAttendanceId` link kontrolü** — HQ shift-start handler'ında shift_attendance kaydı oluşturuluyor mu, link kuruluyor mu? (READ-ONLY analiz gerekli — bu plan dosyasında doğrulanmadı, implementasyon öncesi kontrol edilmeli.)

### Faz C — Factory Endpoint Fix

6. **`server/routes/factory.ts:~1900`** — Factory end-shift handler'ında aynı blok.
7. **`factoryShiftSessions.shiftAttendanceId` link kontrolü** — Aynı mantıkla doğrula.

### Faz D — Geriye Dönük Backfill (DB-WRITE protokolü, OPSIYONEL)

8. **Karar:** Eski kayıtlar için backfill yapılacak mı? (Bölüm 8 #1)
9. **Backfill scripti (eğer yapılacaksa)** — `scripts/backfill/01-shift-attendance-checkout-time.ts`:
   ```sql
   -- Read-only analiz: kaç kayıt etkilenir?
   SELECT COUNT(*) FROM shift_attendance sa
   WHERE sa.check_out_time IS NULL
     AND EXISTS (
       SELECT 1 FROM branch_shift_sessions bss
       WHERE bss.shift_attendance_id = sa.id
         AND bss.check_out_time IS NOT NULL
     );

   -- Backfill UPDATE (DB-WRITE protokolü):
   UPDATE shift_attendance sa
   SET check_out_time = bss.check_out_time,
       status = 'completed'
   FROM branch_shift_sessions bss
   WHERE bss.shift_attendance_id = sa.id
     AND bss.check_out_time IS NOT NULL
     AND sa.check_out_time IS NULL;
   ```

10. **Aynı backfill HQ + Factory için** — `hq_shift_sessions` + `factory_shift_sessions` kaynaklı.

### Faz E — Test + Doğrulama

11. **Smoke test** — TEST-MATRIX `sube_kiosk` akışı (login → shift-start → shift-end) sonrası `shift_attendance.check_out_time` SET olmalı.
12. **Regression test** — Mevcut `branch_shift_sessions` davranışı (work_minutes hesabı, daily summary) etkilenmemeli.
13. **DECISIONS.md md. 15 güncelle** — "shift_attendance check_out kapanış kapatıldı, branch+HQ+factory düzeltildi" yeni karar maddesi ekle (eski madde `geçersiz — bkz. yeni madde` ile arşivle).

---

## 6. Test Matrisi

### Pozitif Senaryolar
| # | Senaryo | Beklenen |
|---|---|---|
| 1 | Branch kiosk shift-start → shift-end | `shift_attendance.check_out_time = shift-end zamanı`, `status='completed'` |
| 2 | HQ kiosk login → exit | `shift_attendance.check_out_time` SET |
| 3 | Factory kiosk start → end | `shift_attendance.check_out_time` SET |
| 4 | Cross-tablo tutarlılık | `branch_shift_sessions.check_out_time` ≈ `shift_attendance.check_out_time` (saniye farkı OK) |

### Negatif / Edge Case'ler
| # | Senaryo | Beklenen |
|---|---|---|
| 5 | `shiftAttendanceId` NULL olan eski session shift-end | Hata YOK, branch_shift_sessions UPDATE devam, shift_attendance dokunulmuyor (graceful) |
| 6 | shift-end iki kez çağrılır (idempotency) | İlk çağrı SET, ikinci çağrı zaten kapalı (status='completed') → tekrar SET veya 409 |
| 7 | Mola sırasında shift-end | Mola kapatılır + check_out_time SET |
| 8 | Erken çıkış (planlanan saat öncesi) | check_out_time SET + early-exit notification gider |
| 9 | Fazla mesai (planlanan saat sonrası) | check_out_time SET + overtime notification gider |

### Regression Kontrolü
| # | Kontrol | Beklenen |
|---|---|---|
| 10 | `branch_shift_daily_summary` etkilenmedi | ✅ Önceki davranış aynı |
| 11 | `pdks_records` INSERT etkilenmedi | ✅ Aynı |
| 12 | Bordro `pdks_daily_summary` (Excel) etkilenmedi | ✅ Aynı (Excel kanalı bağımsız) |
| 13 | Mr. Dobody late arrival skill etkilenmedi | ✅ Aynı (`pdks-engine.ts` üzerinden) |
| 14 | `attendance_penalties` ceza hesabı etkilenmedi | ✅ Sadece davranış iyileşir (NULL check_out → tarih SET) |

---

## 7. Rollback Planı

### Kod Rollback
- Git revert ile commit geri alınır (forward-only push, force YOK)
- Eski davranış: `shift_attendance.check_out_time` yine NULL kalır → bilinen bug geri döner

### Veri Rollback (Backfill yapılmışsa)
- Backfill öncesi backup: `CREATE TABLE backup_shift_attendance_<tarih> AS TABLE shift_attendance;`
- Restore SQL:
  ```sql
  UPDATE shift_attendance sa
  SET check_out_time = b.check_out_time, status = b.status
  FROM backup_shift_attendance_<tarih> b
  WHERE sa.id = b.id;
  ```
- Bu rollback **opsiyonel** — backfill verinin doğruluğu zaten branch_shift_sessions ile çapraz doğrulanabilir, restore tipik olarak gereksiz.

### Acil Durum (production'da kritik bug)
1. shift-end endpoint'leri normal çalışıyor zaten (UPDATE ekleme yan etkisi minimal)
2. Acil durumda eklenmiş bloku try/catch içinde sustur (graceful degrade)
3. Owner bilgilendir → fix forward

---

## 8. Açık Kararlar (Owner GO Bekliyor)

1. **Backfill yapılacak mı?** Pilot test kayıtları (4 birim, 29 Nis 2026) için `check_out_time = NULL`. Geriye dönük doldurma:
   - **Yapılır** → `branch_shift_sessions.check_out_time`'dan kopyalanır (DB-WRITE protokolü).
   - **Yapılmaz** → Sadece bundan sonraki kayıtlar düzgün, eski kayıtlar tutarsız kalır.
   - **Önerim:** Yapılır, çünkü pilot Day-1 sırasında "boş bırakılmış shift_attendance" görünmesi karışıklık yaratır.

2. **Minimum fix mi, refactor mı?** 3 yerde aynı 5 satır mı, ortak utility mi?
   - **Önerim:** Refactor (`shared/services/shift-attendance-service.ts`) — DRY prensibi, gelecek bakım kolaylığı, scope sınırlı.

3. **`shiftAttendance.status` alanı `'completed'` mi başka bir değer mi?** Schema'da status enum'unu kontrol etmek gerek (Bölüm 5 doğrulama adımı).

4. **HQ ve Factory aynı PR'da mı, ayrı PR'larda mı?** 
   - **Önerim:** Aynı PR, çünkü 3 endpoint aynı bug, aynı çözüm pattern'i, test matrisi paralel.

5. **Pilot Day-1 öncesi mi, sonrası mı?**
   - md. 15 mevcut kararda "düzeltilmesi gerekir" diyor ama sıralama belirsiz.
   - Bug pilot Day-1 fonksiyonalitesini bozmaz (maaş etkilenmez), ama kayıt bütünlüğü açısından Day-1 öncesi kapatmak daha temiz olur.
   - **Önerim:** Day-1 öncesi düzelt, low risk + 1 saat iş.

6. **shift-end idempotency — iki kez shift-end çağrılırsa?** Mevcut davranış `branch_shift_sessions` için ne yapıyor (409 mı SET mi)? Aynı mantık `shift_attendance` için de uygulanmalı.

---

## 9. Effort Tahmini

| Faz | İş | Tahmini Süre |
|---|---|---|
| A | Branch endpoint fix (5-15 satır kod) | 20 dk |
| B | HQ endpoint fix + link kontrolü | 30 dk |
| C | Factory endpoint fix + link kontrolü | 30 dk |
| D | Backfill (eğer yapılacaksa) | 45 dk (DB-WRITE protokolü dahil) |
| E | Test (14 senaryo) + DECISIONS güncelleme | 45 dk |
| **Toplam (refactor önerisi ile)** | | **~3 saat** |

> Pilot Day-1 öncesi tamamlanması için **net 3-4 saat** ayırılması yeterlidir. HQ kiosk PIN planı (~4.5 saat) ile birleştirilirse aynı yarım gün içinde her ikisi de devreye alınabilir.

---

## 10. Bağımlılıklar / Yan Etkiler

- **HQ kiosk PIN security planı** (`hq-kiosk-pin-security.md`) — Bağımsız iş ama HQ kiosk endpoint'i ortak. PIN refactor + check_out fix aynı PR'da yapılabilir veya sırayla. **Önerim:** İki ayrı PR, çünkü scope farklı (auth vs data integrity), test matrisleri ayrı.
- **TEST-MATRIX.md güncelleme** — `sube_kiosk` smoke testlerinde "shift-end sonrası `check_out_time` SET olmalı" maddesi eklenir.
- **`docs/runbooks/kiosk-pdks-test.md` güncelleme** — "⚠️ Bilinen açık (md. 15)" notu kaldırılır, yeni davranış belgelenir.
- **Mr. Dobody late arrival skill** — Bu skill `pdks-engine.ts` üzerinden çalışır, `shift_attendance` kullanmaz → fix sonrası davranış değişikliği YOK.
- **Mission Control widget'ları** — Mevcut widget'lar `branch_shift_sessions` kullanıyor → fix sonrası dashboard etkisi YOK.

---

## 11. İlgili Dosyalar (Implementasyon Başlangıç Noktaları)

- `server/routes/branches.ts:3273-3472` — Branch shift-end (refactor edilecek)
- `server/routes/branches.ts:4331-4371` — HQ kiosk exit (aynı bug)
- `server/routes/factory.ts:~1855` — Factory end-shift (aynı bug)
- `server/routes/branches.ts:~3010-3036` — Branch shift-start (referans: shift_attendance INSERT + link doğru çalışıyor)
- `shared/schema/schema-03.ts:1100` — `shift_attendance` tablo tanımı
- `shared/schema/schema-05.ts:227` — `attendance_penalties.shift_attendance_id` FK (yan etki kontrolü)
- `shared/services/` — yeni `shift-attendance-service.ts` (refactor önerisi)
- `scripts/backfill/` — yeni `01-shift-attendance-checkout-time.ts` (opsiyonel)

---

> **Bu doküman PLAN'dır. Implementasyon başlamadan önce owner GO + IMPLEMENTATION moduna geçiş gerekir. Backfill yapılacaksa DB-WRITE protokolü ayrıca uygulanır.**
