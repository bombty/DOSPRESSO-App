# İZİN / RAPOR / ÜCRETSİZ İZİN BAKİYE SİSTEMİ PLANI

DOCS-ONLY plan dokümanı. Implementasyon ayrı IMPLEMENTATION mod + owner GO ile yapılır.

Son güncelleme: 2 Mayıs 2026  
Durum: **PLAN — owner kararı ve implementasyon beklemede**  
Kaynak: `docs/SPRINT-LIVE.md` "Açık İşler" #3, `docs/audit/pilot-readiness-current.md` R3 risk  
İlgili: `docs/runbooks/db-write-protocol.md`

---

## 1. Mevcut Durum (READ-ONLY Analiz Sonucu)

### Var Olan Altyapı

| Bileşen | Durum | Konum |
|---|---|---|
| `leave_requests` tablosu | ✅ MEVCUT | `shared/schema/schema-03.ts:1070` |
| `GET /api/leave-requests` (admin/manager) | ✅ MEVCUT | `server/routes/hr.ts:2212` |
| `GET /api/leave-requests/my` (kullanıcı) | ✅ MEVCUT | `server/routes/hr.ts:2290` |
| `POST /api/leave-requests` (yeni talep) | ✅ MEVCUT | `server/routes/hr.ts:2320` |
| `PATCH /api/leave-requests/:id/approve` | ✅ MEVCUT | `server/routes/hr.ts:2485` |
| `PATCH /api/leave-requests/:id/reject` | ✅ MEVCUT | `server/routes/hr.ts:2558` |
| `GET /api/personnel/:id/leave-salary-summary` | ✅ MEVCUT | `server/routes/staff-evaluations-routes.ts:765` |
| Frontend: `LeaveManagementSection.tsx` | ✅ MEVCUT | `client/src/components/hr/tabs/` |
| Dashboard: muhasebe_ik leave widget | ✅ MEVCUT | `client/src/components/dashboards/muhasebe-ik-dashboard.tsx` |

### Eksik Olan (Tahmini — Schema READ-ONLY analiz gerek)

| Bileşen | Eksiklik | Risk |
|---|---|---|
| `leave_balances` tablosu | Yıllık hak + kullanılan + kalan bakiyeleri ayrı tablo olarak yok | 🔴 YÜKSEK — bakiye hesabı her seferinde leave_requests'ten toplama yapmak verimsiz + hatalı |
| Yıllık hak hesaplama mantığı | İşe başlama tarihinden itibaren kıdem bazlı yıllık hak (4857 sayılı İK) hesabı yok | 🔴 YÜKSEK |
| İzin tipleri ayrımı | leave_requests.type enum'unda (yıllık/mazeret/ücretsiz/rapor/doğum/babalık) tüm ayrımlar var mı? | 🟡 ORTA — schema doğrulama gerekli |
| Sağlık raporu (rapor) ayrı akış | Doktor raporu = rapor günü, yıllık izinden düşmez, SGK kaydı ayrı | 🟡 ORTA |
| Ücretsiz izin onay zinciri | Genelde mudur + ik onayı zorunlu, mevcut approve flow tek adım mı? | 🟡 ORTA |
| Bakiye widget (kullanıcı dashboard) | Kullanıcı kendi izin bakiyesini dashboard'da görüyor mu? | 🟡 ORTA |
| Ay sonu bakiye snapshot | Maaş hesabında izin bakiyesi snapshot lazım | 🟡 ORTA |
| KVKK — sağlık raporu hassas veri | Rapor sebebi/teşhis kayıt edilmemeli, sadece "rapor günü var" olmalı | 🔴 KVKK |

> ⚠️ **Bu plan dokümanı `leave_requests` tablosunun tam kolon listesini READ-ONLY olarak doğrulamamıştır.** Implementasyon başlamadan önce schema-03.ts:1070 detay incelemesi yapılmalı, mevcut alanlar listelenmeli, eksikler kesinleştirilmeli.

---

## 2. Pilot Day-1 Risk Değerlendirmesi

### Day-1'de İzin Akışı Kullanılacak mı?

**3 Seçenek:**

| Seçenek | Tanım | Avantaj | Dezavantaj |
|---|---|---|---|
| **A. Manuel (Excel)** | Pilot süresince izin talepleri Excel'de tutulur, ay sonu sisteme girer | Sıfır kod, sıfır risk | Personel "neden sistemde göremiyorum" sorabilir |
| **B. Mevcut sistem (yarı eksik)** | Var olan endpoint'ler kullanılır, bakiye hesabı yapılmaz, sadece talep + onay akışı | Akış var, kullanıcı görsel olarak görür | Bakiye yok → hatalı izin onayı riski (haktan fazla izin verilir) |
| **C. Hızlı tampon: read-only "kalan izin yok" mode** | Endpoint'ler 503 döner, frontend "Bu modül pilot sonrası açılacak" mesajı | Net beklenti yönetimi | UX kötü |

**Önerim:** **A (Manuel) — Day-1 pilot süresince**, çünkü:
1. Pilot süresi (~1 ay) içinde izin sayısı az (10-20 talep tahmini)
2. Bakiye sistemi olmadan onay vermek hatalı izin riski yüksek
3. Sprint 2'de sistem tam kurulup pilot sonrası geçilir

### Owner Kararı Gerekiyor

**Karar 1:** Day-1'de izin modülü açık mı, kapalı mı?
- 🟢 Açık (mevcut sistem) → Karar 2'ye geç
- 🔴 Kapalı (manuel Excel) → Bu plan post-pilot
- 🟡 Read-only (görüntüleme var, talep yok) → Frontend hide edilebilir

**Karar 2:** Bakiye hesaplama Day-1'de zorunlu mu?
- 🟢 Evet → Faz B implementasyonu Day-1 öncesi tamamlanmalı (~6 saat iş)
- 🔴 Hayır → Onay verirken manuel kontrol (mudur "izin hakkı var mı" sözel teyit eder)

---

## 3. Hedef Mimari (Sprint 2 / Post-Pilot)

### Yeni Tablolar

```typescript
// shared/schema/schema-XX.ts (yeni veya schema-03'e eklenir)

// 1. Yıllık izin hak referans tablosu (kıdem bazlı 4857 sayılı İK)
export const leaveEntitlementRules = pgTable("leave_entitlement_rules", {
  id: serial("id").primaryKey(),
  min_seniority_years: integer("min_seniority_years").notNull(),  // 0, 5, 15
  max_seniority_years: integer("max_seniority_years"),            // 5, 15, NULL
  annual_days: integer("annual_days").notNull(),                  // 14, 20, 26
  description: text("description"),
});

// 2. Kullanıcı bazlı yıllık bakiye snapshot
export const leaveBalances = pgTable("leave_balances", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  year: integer("year").notNull(),
  type: text("type").notNull(),  // 'yillik' | 'mazeret' | 'ucretsiz' | 'rapor' | 'dogum' | 'babalik' | 'evlilik' | 'olum'
  entitled_days: integer("entitled_days").notNull(),     // hak edilen
  used_days: integer("used_days").notNull().default(0),  // kullanılan
  pending_days: integer("pending_days").notNull().default(0),  // onay bekleyen
  remaining_days: integer("remaining_days").notNull(),   // kalan (computed: entitled - used)
  carried_over_days: integer("carried_over_days").notNull().default(0),  // önceki yıldan devir
  last_calculated_at: timestamp("last_calculated_at").notNull().defaultNow(),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (t) => ({
  uniqUserYearType: unique().on(t.user_id, t.year, t.type),
  idxUser: index().on(t.user_id),
}));

// 3. Sağlık raporu kayıtları (rapor sebebi YAZILMAZ — KVKK)
export const medicalLeaves = pgTable("medical_leaves", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  start_date: date("start_date").notNull(),
  end_date: date("end_date").notNull(),
  total_days: integer("total_days").notNull(),
  doctor_report_uploaded: boolean("doctor_report_uploaded").notNull().default(false),
  document_object_storage_key: text("document_object_storage_key"),  // hassas, sadece İK okur
  sgk_reported: boolean("sgk_reported").notNull().default(false),
  approved_by: integer("approved_by").references(() => users.id),
  approved_at: timestamp("approved_at"),
  notes: text("notes"),  // sebep YAZILMAZ, sadece "rapor onaylandı" gibi
  created_at: timestamp("created_at").notNull().defaultNow(),
  deleted_at: timestamp("deleted_at"),
}, (t) => ({
  idxUser: index().on(t.user_id),
  idxDates: index().on(t.start_date, t.end_date),
}));

// 4. (Mevcut) leave_requests'e eklenecek/doğrulanacak kolonlar
//    - leave_type enum: 'yillik' | 'mazeret' | 'ucretsiz' | 'rapor' | 'dogum' | 'babalik' | 'evlilik' | 'olum'
//    - approval_chain: 'mudur_then_ik' | 'mudur_only' | 'ceo' (ücretsiz izinde mudur+ik zorunlu)
//    - balance_deducted_at: timestamp (bakiyeden düşüldüğü an)
```

### Yıllık Hak Hesaplama Mantığı (4857 sayılı İK)

| Kıdem | Yıllık İzin Hakkı |
|---|---|
| 0-1 yıl | Hak yok (ama İŞ KANUNU 53. madde: 1 yıl tamamlanmış olmalı, sonra 14 gün) |
| 1-5 yıl | 14 gün |
| 5-15 yıl | 20 gün |
| 15+ yıl | 26 gün |
| 18 yaşından küçük + 50 yaşından büyük | Min 20 gün |

**Hesaplama servisi** (`shared/services/leave-balance-service.ts`):

```typescript
export async function calculateAnnualEntitlement(userId: number, year: number) {
  const user = await getUserWithStartDate(userId);
  const seniority = differenceInYears(new Date(year, 11, 31), user.workStartDate);
  if (seniority < 1) return 0;
  if (seniority < 5) return 14;
  if (seniority < 15) return 20;
  return 26;
}

export async function recalculateBalance(userId: number, year: number, type: string) {
  const entitled = await calculateAnnualEntitlement(userId, year);
  const used = await sumApprovedLeaveDays(userId, year, type);
  const pending = await sumPendingLeaveDays(userId, year, type);
  const carried = await getPreviousYearCarryOver(userId, year);
  await db.upsert(leaveBalances).values({
    user_id: userId,
    year, type,
    entitled_days: entitled,
    used_days: used,
    pending_days: pending,
    remaining_days: entitled + carried - used - pending,
    carried_over_days: carried,
    last_calculated_at: new Date(),
  });
}
```

---

## 4. Implementasyon Adımları

### Faz A — Schema + Migration (DB-WRITE protokolü)

1. Schema dosyaları: `leave_entitlement_rules`, `leave_balances`, `medical_leaves` tabloları
2. `leave_requests` tablosuna eksik kolonlar (varsa)
3. Migration: `npx drizzle-kit generate --name=leave-balance-system`
4. DB uygulama: `psql ... -f migrations/00NN_leave-balance-system.sql` (DB-WRITE protokolü)
5. Drift check: 0

### Faz B — Backend Servisler

6. `shared/services/leave-balance-service.ts` (yıllık hak + bakiye hesaplama)
7. Endpoint'ler:
   - `GET /api/leave-balances/my` — kullanıcının kendi bakiyesi
   - `GET /api/leave-balances/:userId` — mudur/ik için diğer kullanıcı
   - `POST /api/leave-balances/recalculate` — admin manuel yeniden hesap
   - `POST /api/medical-leaves` — rapor kaydı (object storage upload)
   - `GET /api/medical-leaves/:userId` — sadece İK + ilgili kullanıcı
8. Mevcut `POST /api/leave-requests` endpoint'inde:
   - Talep oluştururken bakiye kontrolü (haktan fazla istenirse 400)
   - `pending_days` artırılır
9. Mevcut `PATCH /api/leave-requests/:id/approve` endpoint'inde:
   - Onaylanınca `used_days` artırılır, `pending_days` azalır
   - `balance_deducted_at` SET
10. `PATCH /api/leave-requests/:id/reject`:
    - Reddedilince `pending_days` azalır

### Faz C — Frontend

11. `LeaveManagementSection.tsx` güncelleme:
    - Bakiye kartları (yıllık/mazeret/ücretsiz/rapor)
    - Talep formunda bakiye gösterimi (HEDEF: "Kalan: 8 gün, Talep: 5 gün")
    - Bakiye yetersizse submit disabled
12. Kullanıcı dashboard widget: "İzin bakiyem" widget (`dashboard_widgets` registry)
13. Mudur dashboard: "Onay bekleyen izinler" widget (zaten var mı?)

### Faz D — Veri Seed (DB-WRITE protokolü)

14. `leave_entitlement_rules` seed: 4 satır (0-1, 1-5, 5-15, 15+)
15. Mevcut tüm kullanıcılar için 2026 yılı bakiye hesabı:
    - `users.work_start_date` mevcut mu? Yoksa varsayılan değer yaklaşımı (örn: 1 Oca 2025 fallback) — owner kararı
    - `recalculateBalance(userId, 2026, 'yillik')` her kullanıcı için
16. Önceki izin talepleri varsa onlar `used_days`'e yansıtılır

### Faz E — KVKK + Audit

17. `medical_leaves.notes` alanına teşhis/sebep YAZILMAZ kuralı
18. `medical_leaves.document_object_storage_key` sadece İK rolü erişebilir (RBAC)
19. Bakiye değişiklik audit log (`audit_log` tablosu varsa)

### Faz F — Test

20. 4857 İK uyumluluk testleri (kıdem hesabı)
21. Bakiye senaryoları: yıllık/mazeret/ücretsiz/rapor ayrı ayrı
22. Concurrency testi (aynı anda 2 talep)
23. Ay sonu carry-over (devir) testi

---

## 5. Açık Kararlar (Owner GO Bekliyor)

1. **Pilot Day-1'de izin modülü kullanılacak mı?** (Bölüm 2 — Karar 1)
   - Önerim: **Manuel (Excel) — pilot sonrası sisteme**
2. **`users.work_start_date` kolonu var mı?** Schema doğrulama gerekiyor; yoksa eklenmeli
3. **Yıllık hak hesabında "yaş" kuralı (4857 53. madde) uygulanacak mı?** (18 altı + 50 üstü → min 20 gün)
4. **Carry-over (devir) yapılacak mı?** Kullanılmayan yıllık izin sonraki yıla aktarılır mı? (4857 56. madde — aktarılmaz, ödenir; ama operasyonel olarak şirket politikası)
5. **Ücretsiz izin onay zinciri** — sadece mudur mu, mudur + İK mi, mudur + CEO mu?
6. **Sağlık raporu doküman saklama yeri** — Replit Object Storage (private bucket) mı, ayrı sistem mi?
7. **SGK entegrasyonu** — Rapor günleri SGK'ya bildirilecek mi (Bağ-Kur API)?
8. **Eski personel için bakiye seed** — Geçmiş yılların izin geçmişi var mı? Yoksa 2026'dan başlanır mı?

---

## 6. Effort Tahmini

| Faz | İş | Tahmini Süre |
|---|---|---|
| A | Schema + migration + drift check | 1.5 saat |
| B | Backend servis + endpoint refactor | 4 saat |
| C | Frontend bakiye gösterimi + widget | 3 saat |
| D | Veri seed (entitlement rules + 2026 bakiye) | 1 saat |
| E | KVKK + audit | 30 dk |
| F | Test (8+ senaryo) | 2 saat |
| **Toplam** | | **~12 saat** |

> Bu iş **Sprint 2 / pilot sonrası** önerilir. Pilot Day-1 öncesi sadece "Day-1'de izin akışı manuel/Excel" kararı yazılı olarak verilir.

---

## 7. Risk + Bağımlılık

- **KVKK uyumu** — Sağlık raporu hassas veri, doğru handling şart
- **4857 İK uyumu** — Kıdem hesabı yanlışsa hukuki risk
- **Bordro entegrasyonu** — Bakiye hesabı maaş hesabını etkilemez (md. 13 + Excel-bazlı), ama ücretsiz izin günleri brut maaştan düşüldüğü için maaş entegrasyonu YOK garanti edilmeli
- **`shift_attendance` etkisi** — İzin günü olan personelin `pdks_engine.classifyDay` çıktısı 'leave' dönmeli, mevcut davranış doğrulanmalı

---

## 8. İlgili Dosyalar

- `shared/schema/schema-03.ts:1070` — mevcut `leave_requests`
- `server/routes/hr.ts:2212-2558` — mevcut izin endpoint'leri
- `server/routes/staff-evaluations-routes.ts:765` — leave-salary-summary
- `client/src/components/hr/tabs/LeaveManagementSection.tsx` — frontend
- `client/src/components/dashboards/muhasebe-ik-dashboard.tsx` — dashboard widget
- `shared/services/` — yeni `leave-balance-service.ts`
- `migrations/` — yeni migration

---

> **Bu doküman PLAN'dır. Pilot Day-1 öncesi sadece "kullanılacak mı" kararı yazılır. Tam implementasyon Sprint 2 işi.**
