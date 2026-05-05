# Bordro Tablosu Karar Logu — `monthly_payroll` vs `monthly_payrolls`

**Tarih:** 5 Mayıs 2026
**Bağlam:** Replit System Report (commit `9cdd34b43`) - Top 5 Pilot Riski #4
**Karar:** ⏳ Sprint 16'da netleşecek (pilot 12 May sonrası)

---

## 🔍 Sorun

DB'de iki adet bordro tablosu var:

| Tablo | Schema | Kullanım | Kayıt Sayısı (5 May 2026) |
|---|---|---|---|
| `monthly_payrolls` | `schema-07.ts` line 839 | HR Modülü, manuel bordro | 51 (aktif) |
| `monthly_payroll` | `schema-12.ts` line 645 | PDKS Bridge, otomatik bordro | ? |

**Risk:** İki tablo aynı amaca hizmet ediyor (aylık bordro kaydı), ancak:
- Farklı kolonlar
- Farklı endpoint'ler kullanıyor (`/api/hr/payroll` vs `/api/pdks/payroll`)
- Farklı UI sayfalarına bağlı (`/maas` vs `/sube-bordro-ozet`)
- Toplam bordro gösterirken iki tabloyu da sorgulamak gerekiyor

**Müsait olası sorunlar:**
1. Aynı personel için 2 farklı bordro kaydı (mükerrer)
2. Net maaş özetinde tablo seçim belirsizliği
3. Vergi/SGK raporunda eksik ya da çift sayım

---

## 🎯 Tablo Karşılaştırması

### `monthly_payrolls` (schema-07)
**Amaç:** HR modülü, manuel bordro hesaplama
**Bağlı endpoint:** `/api/hr/payroll/*` (Sprint 6'da inşa)
**Kolon yapısı:**
- `userId`, `year`, `month`
- `grossSalary`, `netSalary`, `bonusAmount`
- `taxAmount`, `sgkEmployee`, `sgkEmployer`
- `mealAllowance`, `transportAllowance`
- `deductions` (JSONB)
- `status` (draft/approved/paid)
- `approvedById`, `approvedAt`

**UI:** `/maas` (toplu hesaplama), `/bordro-ozeti` (özet)

### `monthlyPayroll` (schema-12)
**Amaç:** PDKS Bridge, otomatik bordro (vardiya saatleri × hourly rate)
**Bağlı endpoint:** `/api/pdks/payroll/*` (Sprint 7 PDKS Excel Import sonrası)
**Kolon yapısı:**
- `userId`, `year`, `month`
- `totalHours`, `regularHours`, `overtimeHours`
- `hourlyRate`, `grossPay`, `netPay`
- `attendanceDeductions`, `sourceShifts` (FK array)

**UI:** `/sube-bordro-ozet` (şube özeti), PDKS dashboard

---

## 📊 Mevcut Veri Analizi (Replit raporu)

**`monthly_payrolls`:** 51 kayıt (Şubat-Mart-Nisan 2026 IK kaydı)
**`monthlyPayroll`:** Replit raporunda 0 olarak görünüyor (PDKS Bridge çalışmıyor olabilir)

Replit'in bulgusu: **PDKS otomatik bordro Bridge çalışmıyor** → `monthlyPayroll` tablosu fiilen kullanılmıyor → iki tablonun olması gereksiz karışıklık.

---

## 🛠️ Olası Çözümler (Sprint 16'da değerlendirilecek)

### Seçenek A: `monthly_payroll` (schema-12) Deprecate Et ✅ ÖNERİ
- `monthlyPayrolls` (schema-07) kanonik tablo olur
- PDKS Bridge `monthlyPayrolls`'a yazacak şekilde refactor edilir
- `monthlyPayroll` tablosu read-only "deprecated" olarak işaretlenir
- Veriler migrate edilir (varsa)
- Schema-12'deki tablo tanımı silinmez (geriye uyum için), ama yeni endpoint açılmaz

**Avantaj:**
- Tek source of truth
- HR modülü ve PDKS aynı tabloya yazar
- Raporlama basitleşir

**Risk:**
- PDKS Bridge'in yeniden inşası gerek (~6-10 saat iş)
- Mevcut PDKS verilerinin migrate edilmesi (~50 satır olabilir)

### Seçenek B: İki Tabloyu Da Sakla, Senkron Et
- `monthlyPayrolls` ana, `monthlyPayroll` PDKS-otomatik
- Trigger ile her PDKS bordrosu manuel onay sonrası `monthlyPayrolls`'a kopyalanır
- UI'da hangi tablodan geldiği görsel olarak belli olur

**Avantaj:**
- Mevcut kod değişmiyor
- PDKS Bridge çalışmaya devam eder

**Risk:**
- Trigger karmaşık (race condition riski)
- Mükerrer kayıt riski
- Audit log karmaşık

### Seçenek C: `monthly_payrolls` Deprecate Et, `monthlyPayroll`'a Geç
- PDKS-bazlı tablo (schema-12) kanonik olur
- Manuel bordro hesaplama PDKS-bazlı yapıya entegre edilir

**Avantaj:**
- PDKS Bridge zaten yazılmış, kullanılır

**Risk:**
- 51 mevcut bordro kaydının migrate edilmesi
- HR modülünün tamamen yeniden inşası (~10-15 saat)
- Sprint 6'da yapılan iş çöpe gider

---

## 🚀 Pilot İçin Geçici Çözüm (5 May 2026)

**Pilot 12 May'e 7 gün var, mimari refactor ŞU AN yapılmaz.** Geçici çözüm:

1. ✅ `monthlyPayrolls` (schema-07) **fiilen kullanılan** tablo olsun
2. ✅ Tüm UI ve raporlar `monthlyPayrolls`'tan okusun
3. ⏸️ `monthlyPayroll` (schema-12) tablosu **read-only "dormant"** kalır
4. ⏸️ PDKS Bridge `monthlyPayroll`'a yazıyorsa Sprint 16'da migrate edilecek

## 📅 Sprint 16 Plan (Pilot Sonrası)

- [ ] PDKS Bridge'in nereye yazdığını araştır (eğer çalışıyorsa)
- [ ] `monthlyPayroll`'da kayıt varsa `monthlyPayrolls`'a migrate et
- [ ] PDKS Bridge'i `monthlyPayrolls`'a yazacak şekilde refactor et
- [ ] `monthlyPayroll` tablosunu DEPRECATED notuyla schema'da bırak
- [ ] Code review: hiçbir endpoint `monthlyPayroll`'a yeni write atmayacak
- [ ] 2026 Eylül'de tablo drop edilebilir (data backup sonrası)

---

## ⚠️ Pilot Süresince Dikkat

**Mahmut'a uyarı:** `/maas` ve `/sube-bordro-ozet` farklı tablolardan okur. **Tutarlı veri görmek istiyorsan SADECE `/maas` veya `/bordro-merkezi` üzerinden işlem yap.** PDKS Bridge'i pilot süresince DISABLE (cron task durdur) önerilir — manuel bordro yeterli.

**Karar Önerisi (Sprint 15 itibariyle):**
- Pilot süresince `monthly_payrolls` (schema-07) ana tablo
- PDKS Bridge KAPALI (cron task disable)
- Manuel bordro `/maas` üzerinden Mahmut tarafından
- Sprint 16'da Seçenek A (deprecate `monthlyPayroll`) uygulanır

---

**İlgili Dosyalar:**
- `shared/schema/schema-07.ts` line 839 (`monthlyPayrolls`)
- `shared/schema/schema-12.ts` line 645 (`monthlyPayroll`)
- `server/routes/hr.ts` (`/api/hr/payroll/*`)
- `server/routes/pdks.ts` (`/api/pdks/payroll/*`)
- `client/src/pages/maas.tsx`
- `client/src/pages/sube-bordro-ozet.tsx`
- `docs/SISTEM-RAPORU-5-MAYIS.md` (Replit raporu)
