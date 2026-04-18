# Sprint B — Veri Konsolidasyon Analiz Task

**Tarih:** 18 Nisan 2026 (Cumartesi öğleden sonra)
**Durum:** Planning phase — kod tarafı schema analizi yapıldı, Replit DB doğrulaması gerekli

---

## 📋 Amaç

Sprint B **veri konsolidasyonu** sprintiydi. Ama ilk araştırmada **schema'nın beklentimden daha temiz** olduğunu gördüm. Bu task Replit'ten **gerçek durumun DB doğrulamasını** almak için.

---

## 🔍 Kod Tarafı Bulguları (Claude — 18 Nis 2026 öğleden sonra)

### İzin Sistemi — BEKLENENİN AKSINE TEMİZ

**Beklenti:** "3 paralel izin tablosu var, konsolide edilmeli"
**Gerçek:** Sadece **1 tablo** var: `leave_requests` (schema-03.ts:1066)

```typescript
leaveRequests: {
  leaveType: varchar  // annual, sick, personal, unpaid  ← dört tip tek tabloda!
  startDate, endDate, totalDays
  status: pending/approved/rejected
  approvedBy, approvedAt, rejectionReason
}
```

**Sonuç:** İzin için **konsolidasyona gerek yok**. Sistem zaten düzgün tasarlanmış.

### Onboarding Sistemi — ÇOK TABLO AMA FARKLI SÜREÇLER

Toplam **5 tablo** var ama her biri **farklı bir süreç** için:

| Tablo | Kullanım | Birleşir mi? |
|-------|----------|:--:|
| `franchise_onboarding` | Yeni şube açılış süreci (franchise sahibi) | Hayır — ayrı domain |
| `onboarding_documents` | Franchise için evrak | Hayır — franchise_onboarding'e bağlı |
| `employee_onboarding` | Personel işe alım (14 gün stajyer) | Hayır — iş domain'i farklı |
| `employee_onboarding_tasks` | Stajyer görevleri | Hayır — employee_onboarding'e bağlı |
| `onboarding_templates` | Şablon deposu | Hayır — hem franchise hem employee kullanır |

**Sonuç:** 5 tablo **doğru tasarım**, birleştirme YANLIŞ olur. Raporumda "2 onboarding → 1" hedefi **yanlıştı.**

### Attendance / PDKS — GERÇEKTEN KARMAŞIK

**6 tablo:**
1. `shift_attendance` — Vardiya bazlı (shiftId ile bağlı), in/out + mola
2. `pdks_records` — Ham event log (recordType: in/out/break)
3. `attendance_penalties` — Geç kalma cezası
4. `monthly_attendance_summaries` — Aylık özet
5. `factory_weekly_attendance_summary` — Fabrika haftalık
6. `branch_weekly_attendance_summary` — Şube haftalık
7. `pdks_excel_imports` — Excel import log (bonus)

**Analiz:**
- `shift_attendance` + `pdks_records` → **paralel DEĞİL, tamamlayıcı**
  - `pdks_records`: ham event (her check-in bir satır)
  - `shift_attendance`: aggregate (bir vardiya = bir satır, toplam mesai)
- `monthly_summaries` + `weekly_summaries` → **doğru tasarım** (farklı frekans raporları)
- `attendance_penalties` → ayrı domain (disiplin)

**Olası sorun:** `pdks_records` kayıtları `shift_attendance`'a otomatik aggregate olmuyor mu? Bu bir **job consistency** kontrol soru işareti.

---

## 🎯 Replit'e Gönderilecek Analiz Task'ı

### Amaç:
Sprint B'nin gerçek kapsamını belirlemek. Kod tarafı analizim "büyük konsolidasyon gerekmiyor" diyor ama DB gerçekliğini görmeden karar veremem.

### İstenen Sorgular (READ-ONLY, hiç değişiklik yok):

```sql
-- 1. İzin sistemi kayıt durumu
SELECT 
  leave_type, 
  status, 
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM leave_requests 
GROUP BY leave_type, status
ORDER BY leave_type, status;

-- 2. Onboarding sistemi kullanım
SELECT 'franchise_onboarding' as tbl, COUNT(*) FROM franchise_onboarding
UNION ALL SELECT 'employee_onboarding', COUNT(*) FROM employee_onboarding  
UNION ALL SELECT 'employee_onboarding_tasks', COUNT(*) FROM employee_onboarding_tasks
UNION ALL SELECT 'onboarding_documents', COUNT(*) FROM onboarding_documents
UNION ALL SELECT 'onboarding_templates', COUNT(*) FROM onboarding_templates;

-- 3. Attendance sistemleri kayıt dağılımı
SELECT 'shift_attendance' as tbl, COUNT(*) FROM shift_attendance
UNION ALL SELECT 'pdks_records', COUNT(*) FROM pdks_records
UNION ALL SELECT 'pdks_excel_imports', COUNT(*) FROM pdks_excel_imports
UNION ALL SELECT 'attendance_penalties', COUNT(*) FROM attendance_penalties
UNION ALL SELECT 'monthly_attendance_summaries', COUNT(*) FROM monthly_attendance_summaries
UNION ALL SELECT 'factory_weekly_attendance_summary', COUNT(*) FROM factory_weekly_attendance_summary
UNION ALL SELECT 'branch_weekly_attendance_summary', COUNT(*) FROM branch_weekly_attendance_summary;

-- 4. pdks_records → shift_attendance aggregate kontrolü
-- Son 7 günde pdks_records var mı ama shift_attendance yok mu?
SELECT 
  pr.record_date,
  COUNT(DISTINCT pr.user_id) as users_in_pdks,
  COUNT(DISTINCT sa.user_id) as users_in_shift_attendance,
  COUNT(DISTINCT pr.user_id) - COUNT(DISTINCT sa.user_id) as missing_in_attendance
FROM pdks_records pr
LEFT JOIN shift_attendance sa ON sa.user_id = pr.user_id 
  AND DATE(sa.created_at) = pr.record_date
WHERE pr.record_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY pr.record_date
ORDER BY pr.record_date DESC;

-- 5. Duplicate risk: Aynı kullanıcı aynı gün 2+ shift_attendance?
SELECT user_id, DATE(created_at) as day, COUNT(*) as records
FROM shift_attendance
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id, DATE(created_at)
HAVING COUNT(*) > 1
LIMIT 20;
```

### Beklenen Output:

1. **İzin sistemi:** Kaç kayıt var, dağılımı nasıl? Tek tablo yeterli mi?
2. **Onboarding:** Hangi tablo boş, hangi tablo dolu? Gerçekten 5 farklı süreç mi var?
3. **Attendance/PDKS:** shift_attendance ve pdks_records arasında **gap** var mı? Varsa aggregate job eksikliği demek.
4. **Duplicate'ler:** Aynı kullanıcının aynı gün birden fazla kaydı varsa, bu bir bug'dır.

---

## 🎯 Replit Cevabına Göre Sprint B Planı

**Senaryo 1: Her şey temiz (benim umduğum)**
- Sprint B → Akademi v1/v2/v3 konsolidasyonuna erken geçer (Sprint C işi)
- Ya da ek bir sprint (kod temizlik) eklenir

**Senaryo 2: Attendance aggregate bozuk**
- Sprint B → pdks_records'u shift_attendance'a otomatik aggregate eden job yazılır
- Önemli: ham veri kaybolmadan aggregate

**Senaryo 3: Duplicate'ler var**
- Sprint B → data cleanup migration + unique constraint
- Backup alınıp duplicate'ler temizlenir

---

## 📦 Sprint B — Kararsız Durum Notu

İlk "haftada 3 konsolidasyon" hedefi **fazla iyimserdi**. Kod analizi gösterdi ki:
- İzin: zaten temiz (1 tablo, 4 tip)
- Onboarding: ayrı süreçler (5 tablo doğru)
- Attendance: daha derin inceleme gerekli

**Yeni hedef (Replit cevabına göre belirlenecek):**
- Ya Sprint B → Sprint C işine geçiş (Akademi konsolidasyonu 3→1 gerçek iş)
- Ya Sprint B → attendance aggregate job (gerçek sorun varsa)

Bu **disiplinli bir yaklaşım** — "konsolidasyon adı altında gereksiz değişiklik yapma" prensibi.
