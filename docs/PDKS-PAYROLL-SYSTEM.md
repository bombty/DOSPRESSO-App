# DOSPRESSO — Vardiya, PDKS ve Bordro Sistemi
**Paraya dokunan sistem. Yanlış hesaplama = yasal sorun.**

---

## 1. GENEL AKIŞ

```
Vardiya Planlama (shifts tablosu)
  ↓
Kiosk Check-in (QR/PIN) → pdks_records + shift_attendance oluşturulur
  ↓
Gün Sınıflandırma (PDKS Engine)
  worked | absent | no_shift | program_off | unpaid_leave | sick_leave | annual_leave
  ↓
Aylık Özet (workedDays, absentDays, overtimeMinutes)
  ↓
Bordro Hesaplama (Payroll Engine)
  baseSalary - absenceDeduction - bonusDeduction + overtimePay = netPay
```

---

## 2. VARDİYA SİSTEMİ

### Vardiya Tipleri:
- **Sabah**: 08:00–16:00 (standart)
- **Öğle**: 12:00–20:00
- **Akşam**: 16:00–00:00
- **Adhoc**: otomatik oluşturulur (kiosk girişi vardiya yoksa)

### Vardiya Planı:
- Şube müdürü/supervisor haftalık plan yapar
- Full-time: 45 saat/hafta, part-time: özel
- 3-4 vardiya sistemi (şube + fabrika + HQ)

### KRİTİK MİMARİ KURALI (3 Nisan 2026 fix):
```
Her kiosk check-in'de shift_attendance kaydı oluşturulur
  — zamanında gelse de, geç gelse de
  — ESKİ (hatalı): sadece geç kalanlara kayıt oluşturuyordu
  — YENİ (doğru): herkese kayıt → ceza sadece geç kalanlara

Vardiya yoksa → adhoc shift oluşturulur:
  status: "confirmed"
  shiftType: "morning"
  time: "08:00:00"
```

---

## 3. KİOSK SİSTEMİ

### 3 Tip Kiosk:
- **Şube kiosk**: QR + PIN ile giriş
- **HQ kiosk**: aynı mantık, farklı endpoint
- **Fabrika kiosk**: PIN bazlı (factory_staff_pins)

### Check-in Akışı:
```
Personel kiosk'a gelir → QR okutma veya PIN girişi
  ↓
Sistem shift arar (bugünkü vardiya planı)
  Bulursa → shift_attendance kaydı oluşturur
  Bulamazsa → adhoc shift oluşturur → attendance kaydı

  Geç mi? → penalty hesaplanır (parametrik kurallar)
  Zamanında → penalty yok
```

### Anomali Tespiti:
- Mola dönüşü check-in yapılmazsa → kiosk ekranında uyarı
- Uyarı ekip arkadaşlarına da görünür (şeffaflık)
- Coach/Trainer/Supervisor canlı personel takibi yapabilir

### Bilinen Bug:
```
sube/kiosk.tsx → loginMutation onSuccess handler'ında
kioskToken localStorage'a kaydedilmiyor.
FIX: if (data.kioskToken) localStorage.setItem("kiosk-token", data.kioskToken)
DURUM: doğrulanmadı, beklemede
```

---

## 4. PDKS (Personel Devam Kontrol Sistemi)

### DB Tabloları:
```
pdks_records — giriş/çıkış kayıtları
  userId, date, time, type(giris/cikis), source(qr/pin/manual), branchId

shift_attendance — vardiya devam kayıtları
  shiftId, userId, checkInTime, checkOutTime, status, lateMinutes, penaltyAmount

shifts — vardiya planları
  branchId, userId, date, startTime, endTime, shiftType, status

scheduled_offs — programlı izinler
  userId, date, offType(haftalik/resmi_tatil/kapanish)

leave_requests — izin talepleri
  userId, leaveType(annual/sick/unpaid), startDate, endDate, status
```

### Gün Sınıflandırma (pdks-engine.ts):
```typescript
Öncelik sırası:
1. İzin varsa → leave tipine göre (unpaid_leave / sick_leave / annual_leave)
2. PDKS kaydı yoksa + programlı izin → program_off
3. PDKS kaydı yoksa + vardiya planlanmamış → no_shift (devamsızlık DEĞİL)
4. PDKS kaydı yoksa + vardiya planlanmış → absent (devamsızlık)
5. PDKS kaydı varsa → worked (çalışmış)

Çalışma süresi hesabı:
  giriş-çıkış çiftleri bulunur → süre farkı toplanır
  Fazla mesai = çalışılan - planlanan (pozitifse)
```

---

## 5. BORDRO HESAPLAMA (payroll-engine.ts)

### Formül:
```
baseSalary = pozisyon maaşı (position_salaries tablosundan)
dailyRate = baseSalary / 30

absenceDeduction = absentDays × dailyRate
bonusDeduction = absentDays × (bonus / 30)
overtimePay = (overtimeMinutes / 60) × (dailyRate / 8) × 1.5

netPay = baseSalary + bonus - absenceDeduction - bonusDeduction + overtimePay
```

### Pozisyon-Maaş Eşleştirme:
```
stajyer → stajyer pozisyon maaşı
bar_buddy → bar_buddy maaşı
barista → barista maaşı
supervisor_buddy → supervisor_buddy maaşı
supervisor → supervisor maaşı
mudur → supervisor maaşı (aynı)
```

### Parametrik Kurallar (admin/muhasebe ayarlar):
- Geç kalma kesinti oranları (dakika bazlı)
- Devamsızlık kesinti formülü
- Fazla mesai çarpanı: ×1.5 (standart)
- Yemek yardımı, ulaşım yardımı (users tablosunda)
- Prim matrahı ve oranı (users tablosunda)

### KRİTİK KURALLAR:
```
1. Bordro hemen kilitlenir (data_lock — değiştirilemez)
2. Değişiklik → change_request workflow başlatılmalı
3. Muhasebe SADECE HQ + Fabrika + Işıklar bordrosunu yönetir
4. Yatırımcı şubeleri KENDİ bordrosunu yönetir
5. SGK/e-fatura entegrasyonu YOK (Logo Excel/Word import → AI parsing)
```

---

## 6. MESAİ HESAPLAMA

```
Standart: 45 saat/hafta (full-time)
Fazla mesai başlangıcı: günlük planlanan saati aşan kısım

Hesap:
  overtimeMinutes = max(0, workedMinutes - plannedMinutes)
  overtimeHours = overtimeMinutes / 60
  overtimePay = overtimeHours × hourlyRate × 1.5

  hourlyRate = dailyRate / 8
  dailyRate = baseSalary / 30
```

---

## 7. EKSİK SAAT

```
Eksik saat = planlanan - çalışılan (negatifse)
  15 dk'ya kadar → tolerans (kesinti yok)
  15-30 dk → yarım saat kesinti
  30+ dk → tam kesinti (parametrik kurallara göre)
```

---

## 8. İZİN SİSTEMİ

```
İzin Tipleri:
  annual — yıllık izin (hak ediş hesabı otomatik)
  sick — sağlık izni (rapor gerekli)
  unpaid — ücretsiz izin (maaştan kesilir)
  personal — kişisel izin

leave_requests tablosu:
  talep → onay bekleme → onaylandı/reddedildi
  Onay: Supervisor → Müdür veya HQ

İzin-vardiya çakışma kontrolü: ileride otomatik

employee_leaves tablosu:
  Toplam hak, kullanılan, kalan bakiye
```

---

## 9. ÖNEMLİ DOSYA KONUMLARI

```
server/lib/pdks-engine.ts          — Gün sınıflandırma motoru (221L)
server/lib/payroll-engine.ts       — Bordro hesaplama motoru (219L)
shared/schema/schema-03.ts         — shifts, shift_attendance, leave_requests
shared/schema/schema-05.ts         — overtime_requests, attendance_penalties, monthly_summaries
shared/schema/schema-07.ts         — shift_corrections, salary_deductions, monthly_payroll
shared/schema/schema-12.ts         — pdks_records, position_salaries
server/routes/shifts.ts            — Vardiya API'leri
server/routes/hr.ts                — İK API'leri (bordro dahil)
client/src/pages/vardiya-planlama.tsx — Vardiya planlama UI
client/src/pages/ik.tsx            — İK modülü (bordro tab'ı)
```
