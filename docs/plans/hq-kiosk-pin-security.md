# HQ KIOSK PIN GÜVENLİK PLANI

DOCS-ONLY plan dokümanı. Implementasyon ayrı IMPLEMENTATION mod + owner GO ile yapılır.

Son güncelleme: 2 Mayıs 2026  
Durum: **PLAN — implementasyon beklemede**  
Kaynak risk: `docs/DECISIONS.md` md. 14 (HQ kiosk PIN plaintext açık risk)  
İlgili: `docs/SPRINT-LIVE.md` "Sonraki 3 Adım" #1, `docs/runbooks/kiosk-pdks-test.md`, `docs/runbooks/db-write-protocol.md`

---

## 1. Mevcut Durum (READ-ONLY Analiz Sonucu)

### HQ Kiosk Auth Akışı (Bugünkü)

| Alan | Değer |
|---|---|
| **Endpoint** | `POST /api/hq/kiosk/login` |
| **Dosya** | `server/routes/branches.ts:4122` |
| **PIN doğrulama** | **Plaintext karşılaştırma** (kod yorumuyla bilinen geçici çözüm: "A-3 kapsamı dışı, ayrı yama gerek") |
| **PIN kaynağı** | `users.phone_number` kolonu son 4 hane (yoksa varsayılan `0000`) |
| **Ayrı PIN tablosu** | YOK |
| **Hashing** | YOK |
| **Lockout** | YOK |
| **Rate limit** | YOK |
| **Failed attempt audit** | YOK |
| **PIN rotation** | YOK (telefon numarası değişmedikçe PIN değişmez) |

### Branch Kiosk Auth Akışı (Referans — Güvenli)

| Alan | Değer |
|---|---|
| **Endpoint** | `POST /api/branches/:branchId/kiosk/login` |
| **Dosya** | `server/routes/branches.ts:~2700` |
| **PIN doğrulama** | `bcrypt.compare(pin, pinRecord.hashedPin)` |
| **PIN tablosu** | `branch_staff_pins.hashed_pin` (`shared/schema/schema-09.ts`) |
| **Hashing** | bcrypt |
| **Lockout** | 3 başarısız deneme → 15 dk kilit (`pinLockedUntil`) |
| **Rate limit** | IP + user bazlı `checkKioskRateLimit` |
| **Failed attempt audit** | `pinFailedAttempts` kolonu + `pin_lockout` tipinde admin/bolge_muduru bildirimi |
| **PIN rotation** | Manuel reset (admin paneli) ile mümkün |

### Factory Kiosk Auth Akışı (Referans — Güvenli)

Branch ile aynı pattern, ayrı tablo: `factory_staff_pins.hashed_pin` (`shared/schema/schema-08.ts`).

---

## 2. Tehdit Modeli

### Tehdit Aktörleri

| Aktör | Erişim Düzeyi | Hedef |
|---|---|---|
| **Insider — eski personel** | HQ kioska fiziksel erişim | Eski telefonunun son 4'ünü biliyor → kendi adına shift kaydı veya başkası adına |
| **Insider — mevcut personel** | HQ kioska fiziksel erişim | Diğer personelin telefonunu bilirse onun adına PDKS manipülasyonu |
| **Brute force (online)** | Endpoint'e ağ erişimi | 0000-9999 arası 10.000 PIN denemesi (rate limit yok → dakikalar içinde tüm hesaplara erişim) |
| **Sosyal mühendislik** | Telefon numarası açık ağdan ulaşılabilir (LinkedIn, eski formlar) | Personelin son 4 hanesini sosyal kanaldan toplama |
| **DB sızıntısı** | DB read access (yetkisiz veya sızıntı) | `users.phone_number` zaten bilgi ifşası (KVKK kapsamı), PIN olarak kullanımı durumu ağırlaştırır |

### Risk Skor Matrisi

| Tehdit | Olasılık | Etki | Risk |
|---|---|---|---|
| Insider eski personel | YÜKSEK | YÜKSEK (PDKS manipülasyon) | 🔴 KRİTİK |
| Brute force (no rate limit) | YÜKSEK | YÜKSEK (tüm hesaplar) | 🔴 KRİTİK |
| Sosyal mühendislik | ORTA | ORTA | 🟡 ORTA |
| DB sızıntısı kapsam genişlemesi | DÜŞÜK | YÜKSEK | 🟡 ORTA |
| Insider mevcut personel | ORTA | ORTA | 🟡 ORTA |

**Genel risk:** 🔴 KRİTİK — pilot Day-1 öncesi düzeltilmesi şiddetle önerilir, ancak Owner kararına göre pilot sonrasına da bırakılabilir (md. 14).

---

## 3. Çözüm Tasarımı (Branch/Factory Pattern Uyumu)

### Hedef Mimari

| Bileşen | Detay |
|---|---|
| **Yeni tablo** | `hq_staff_pins` (branch_staff_pins/factory_staff_pins ile aynı kolon yapısı) |
| **Hashing** | bcrypt (cost factor: branch ile aynı, mevcut `bcrypt.hash(pin, 10)` veya proje standardı) |
| **Lockout** | 3 başarısız → 15 dk kilit (branch ile aynı) |
| **Rate limit** | `checkKioskRateLimit` ortak utility kullan (branch ile aynı) |
| **Audit** | `pinFailedAttempts` + `pin_lockout` tipinde notifikasyon (admin + üst yönetim) |
| **PIN rotation** | Admin paneli üzerinden reset endpoint (branch pattern) |
| **PIN initial seed** | DOCS-ONLY: Day-1 öncesi pilot HQ personeli için manuel PIN atanır + DB-WRITE protokolü ile seed edilir |

### Yeni Tablo Şeması (Önerilen)

```typescript
// shared/schema/schema-09.ts (mevcut branch_kiosk_settings ile aynı dosyada veya ayrı schema-XX.ts)
export const hqStaffPins = pgTable("hq_staff_pins", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  hashed_pin: text("hashed_pin").notNull(),
  pin_failed_attempts: integer("pin_failed_attempts").notNull().default(0),
  pin_locked_until: timestamp("pin_locked_until"),
  last_used_at: timestamp("last_used_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
}, (t) => ({
  uniqUser: unique().on(t.user_id),  // Bir kullanıcıya tek PIN
  idxLockedUntil: index().on(t.pin_locked_until),
}));
```

> **Not:** Yukarıdaki şema **öneri**dir. Implementasyon sırasında `branch_staff_pins` ve `factory_staff_pins` ile birebir karşılaştırma yapılıp aynı pattern uygulanır.

### Endpoint Refactor (Önerilen)

`server/routes/branches.ts:4122` mevcut akış:
```ts
// MEVCUT (plaintext):
const expectedPin = user.phoneNumber?.slice(-4) ?? "0000";
if (pin !== expectedPin) { return 401; }
```

Hedef akış:
```ts
// YENİ (bcrypt + lockout + rate limit):
await checkKioskRateLimit(req, "hq", branchId);
const pinRecord = await getHqStaffPin(user.id);
if (pinRecord.pinLockedUntil > now) { return 423; }
const ok = await bcrypt.compare(pin, pinRecord.hashedPin);
if (!ok) {
  await incrementFailedAttempt(pinRecord);
  if (pinRecord.pinFailedAttempts + 1 >= 3) {
    await lockPin(pinRecord, 15 * 60 * 1000);
    await notifyPinLockout(user, "hq");
  }
  return 401;
}
await resetFailedAttempts(pinRecord);
await updateLastUsedAt(pinRecord);
// ... shift session başlat
```

---

## 4. Implementasyon Adımları

### Faz A — Schema + Migration (DB-WRITE protokolü)

1. **Schema dosyası ekle** — `shared/schema/schema-09.ts` (veya yeni `schema-XX.ts`) içine `hq_staff_pins` tablosu (Bölüm 3 şeması).
2. **Migration üret** — `npx drizzle-kit generate --name=hq-staff-pins-table` (replit.md migration süreci).
3. **Migration uygula** — `psql "$DATABASE_URL" -f migrations/00NN_hq-staff-pins-table.sql` (DB-WRITE protokolü: backup → dry-run → owner GO → COMMIT → verification).
4. **Drift check** — `tsx scripts/db-drift-check.ts` → `Eksik tablo / index / FK / UNIQUE = 0` doğrula.

### Faz B — Endpoint Refactor (IMPLEMENTATION mod)

5. **`server/routes/branches.ts:4122` HQ kiosk login refactor** — bcrypt compare + lockout + rate limit (Bölüm 3 hedef akış).
6. **Yardımcı fonksiyonlar** — `getHqStaffPin`, `incrementFailedAttempt`, `lockPin`, `notifyPinLockout` (branch pattern'inden uyarla, mümkünse ortak utility'e refactor).
7. **PIN reset endpoint** — `POST /api/admin/hq-kiosk/reset-pin/:userId` (admin yetkisi, audit log).
8. **PIN seed endpoint (admin paneli)** — `POST /api/admin/hq-kiosk/set-pin/:userId` (yeni PIN ata, hash'le, eski kaydı override et).

### Faz C — PIN Seed (DB-WRITE protokolü)

9. **Pilot HQ personel listesi netleştir** — Hangi kullanıcılar HQ kiosk kullanır? `users WHERE role IN ('mahmut'in rolü, ceo, vb. — owner ile netleşir)`.
10. **PIN üretimi** — Her HQ personeli için 6 haneli rastgele PIN üret (offline, hassas log YOK — sadece personel ile yüz yüze paylaşılır).
11. **Seed scripti** — `scripts/pilot/26-hq-kiosk-pin-seed.ts` (örnek, DB-WRITE protokolü: backup → dry-run → owner GO → COMMIT → verification).
12. **Doğrulama** — Her HQ personel ile bir kez login testi (TEST-MATRIX.md `sube_kiosk` smoke test akışı).

### Faz D — Eski Plaintext Akış Temizliği

13. **`user.phoneNumber.slice(-4)` placeholder kodunu sil** (refactor sonrası kullanılmaz, dead code).
14. **Eski yorum bloklarını güncelle** — "A-3 dışı, plaintext" notunu kaldır.
15. **DECISIONS.md md. 14 güncelle** — "HQ kiosk PIN plaintext riski kapatıldı, bcrypt + lockout devrede" yeni kararı ekle (eski karar `geçersiz — bkz. yeni madde` ile arşivle).

---

## 5. Test Matrisi

### Pozitif Senaryolar
| # | Senaryo | Beklenen |
|---|---|---|
| 1 | Geçerli HQ personel + doğru PIN | HTTP 200, shift session ID döner |
| 2 | Yanlış PIN, 1 deneme | HTTP 401, `pinFailedAttempts=1` |
| 3 | Yanlış PIN, 3 deneme | HTTP 401, `pinLockedUntil=NOW+15dk`, admin notifikasyon |
| 4 | Kilit sırasında doğru PIN dene | HTTP 423 (locked), kilit süresi dolmadan login YOK |
| 5 | Kilit dolduktan sonra doğru PIN | HTTP 200, `pinFailedAttempts=0` reset |
| 6 | PIN reset endpoint | Admin yetkisiyle yeni PIN set, eski hash override |

### Negatif Senaryolar
| # | Senaryo | Beklenen |
|---|---|---|
| 7 | Inactive/soft-deleted user PIN doğru | HTTP 401 (TEST-MATRIX `sube_kiosk` kuralı) |
| 8 | Var olmayan user_id | HTTP 401 (info leak yok — generic mesaj) |
| 9 | Rate limit aşımı (IP bazlı 10+ istek/dk) | HTTP 429 |
| 10 | PIN'siz request | HTTP 400 |
| 11 | SQL injection denemesi | Drizzle ORM koruması, HTTP 400/401 |

### KVKK / Audit
| # | Kontrol | Beklenen |
|---|---|---|
| 12 | Failed attempt log'u sadece sayım, PIN değeri YOK | ✅ |
| 13 | Lockout notifikasyonu admin/üst yönetime gider | ✅ |
| 14 | PIN reset audit log'u (kim, ne zaman, kim için) | ✅ |
| 15 | Hashed PIN response'ta DÖNMEZ | ✅ |

---

## 6. Rollback Planı

### Schema Rollback
- Migration `DOWN`: `DROP TABLE hq_staff_pins;` (FK CASCADE ile bağımlı kayıt yok)
- Backup: migration öncesi `users` snapshot'ı (PIN seed öncesinde de gerek)

### Endpoint Rollback
- Git revert ile commit geri alınır (ahead-only push, force YOK)
- Eski plaintext fallback geçici olarak yeniden devreye alınır (sadece acil durumda, owner GO)

### Veri Rollback
- PIN seed yapılmışsa: `hq_staff_pins` snapshot'tan restore (DB-WRITE protokolü)
- Hard delete YOK (md. 8) — sadece soft-delete (`deleted_at` SET)

### Acil Durum (production'da kritik bug)
1. Endpoint kapat → `/api/hq/kiosk/login` 503 dönsün (geçici)
2. Owner + ChatGPT bilgilendir
3. Issue analiz → fix forward veya rollback kararı
4. HQ personel için manuel devam takibi (Excel) — kayıt bütünlüğü için

---

## 7. Effort Tahmini

| Faz | İş | Tahmini Süre |
|---|---|---|
| A | Schema + migration | 30 dk |
| B | Endpoint refactor + helper'lar | 1.5 saat |
| C | PIN seed + pilot personel listesi | 1 saat |
| D | Cleanup + DECISIONS güncelleme | 30 dk |
| **Test** | Tüm test matrisi (15 senaryo) | 1 saat |
| **Toplam** | | **~4.5 saat** |

> Pilot Day-1 öncesi tamamlanması için **net yarım gün** ayırılması yeterlidir. Owner pilot sonrasına bırakırsa (md. 14 mevcut karar) bu plan post-pilot referansa kalır.

---

## 8. Açık Kararlar (Owner GO Bekliyor)

1. **Pilot Day-1 öncesi mi, sonrası mı?** (md. 14 mevcut karar pilot sonrası diyor — değişikliği owner onaylamalı)
2. **HQ kiosk personel listesi netleştirme** — Hangi roller HQ kioska login olur? (`mudur`+? `ceo`+? `muhasebe_ik`+?)
3. **PIN uzunluğu** — 4 hane (branch pattern) mi, 6 hane mi?
4. **Lockout süresi** — 15 dk (branch pattern) mi, daha uzun mu (HQ daha kritik)?
5. **PIN rotation politikası** — Periyodik zorunlu rotation var mı, sadece manuel reset mi?
6. **PIN unutma akışı** — Personel PIN'i unutursa kim sıfırlar? (admin? mudur? supervisor?)
7. **Mevcut HQ kullanıcıların eski telefon-bazlı login'i** — Refactor sonrası eski yöntem 401 dönecek; geçiş süresi tampon var mı (örn. ilk gün eski + yeni paralel)?

---

## 9. Bağımlılıklar / Yan Etkiler

- **`shift_attendance` check-out kapanış bug** (md. 15) — bağımsız iş ama HQ kiosk refactor sırasında aynı endpoint'e dokunulur, fırsat yakalanırsa beraber düzeltilir.
- **`branch_staff_pins` + `factory_staff_pins` ile ortak utility** — Refactor fırsatı: 3 tablo için ortak `kioskPinService` oluşturulabilir (DRY). Ama scope creep riski → ayrı task olarak değerlendir.
- **TEST-MATRIX.md güncelleme** — `sube_kiosk` rolü smoke testleri HQ akışını da içermeli (bugün branch odaklı).
- **`docs/runbooks/kiosk-pdks-test.md` güncelleme** — HQ Phase'i bcrypt akışına göre yenilenecek.

---

## 10. İlgili Dosyalar (Implementasyon Başlangıç Noktaları)

- `server/routes/branches.ts:4122` — HQ kiosk login (refactor edilecek)
- `server/routes/branches.ts:~2700` — Branch kiosk login (referans pattern)
- `server/routes/factory.ts` — Factory kiosk login (referans pattern)
- `shared/schema/schema-09.ts:297` — `branchKioskSettings` tanımı (referans)
- `shared/schema/schema-09.ts` — `branch_staff_pins` tanımı (referans)
- `shared/schema/schema-08.ts` — `factory_staff_pins` tanımı (referans)
- `migrations/` — yeni migration dosyası
- `scripts/pilot/` — yeni seed scripti

---

> **Bu doküman PLAN'dır. Implementasyon başlamadan önce owner GO + IMPLEMENTATION moduna geçiş gerekir. DB write işleri ayrıca DB-WRITE moduna geçilerek protokol uyarınca yapılır.**
