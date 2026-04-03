# VARDİYA + FABRİKA AUDIT RAPORU
**Tarih:** 3 Nisan 2026

## 🔴 KRİTİK SORUNLAR

### 1. Fabrika Üretim Planlaması — UI YOK
- Backend API VAR (GET/POST/PATCH /api/factory/production-plans)
- factory_production_plans tablosu VAR
- factoryProducts + reçete bağlantısı VAR
- AMA: Frontend'te plan oluşturma UI'sı YOK
- fabrika.tsx 4 tab: dashboard/products/batches/orders — "Plan" tab eksik

### 2. Vardiyasız Kiosk Giriş → Ceza Yazılamıyor
- Personel kiosk'tan giriş yapıyor, vardiya planlanmamışsa:
  ✅ PDKS kaydı oluşturuluyor
  ❌ Geç kalma cezası YAZILMIYOR (attendance_penalties FK constraint)
  Sistem log: "no shift scheduled today, penalty cannot be written"
- ETKİ: Vardiya planlanmadan giriş yapılırsa geç kalmalar takip EDİLEMİYOR

### 3. PDKS → Bordro Bağlantısı Gevşek
- PDKS kayıtları oluşturuluyor (giriş/çıkış)
- Overtime hesaplama mevcut (overtimeMinutes)
- AMA: Doğrudan "calculatePayroll" fonksiyonu bulunamadı
- Aylık bordro muhtemelen manuel tetikleniyor

## 🟡 İYİLEŞTİRME GEREKLİ

### 4. AI Vardiya Planlama Bağlantısı
- Agent skill olarak VAR (shift-planner.ts)
- Peak hours, rotation, weekend mantığı VAR
- Validation API VAR (/api/shifts/validate-plan)
- AMA: vardiya-planlama.tsx'ten AI önerisi butonu eksik olabilir

### 5. Checklist Auto-Atama
- /api/checklists/my-daily endpoint VAR
- Shift bazlı checklist kontrolü VAR
- AMA: Vardiya yoksa günlük checklist ataması bozuluyor olabilir

## ✅ ÇALIŞAN BAĞLANTILAR
- Kiosk QR/PIN giriş → PDKS kaydı ✅
- Kiosk → shift_attendance oluşturma (vardiya varsa) ✅
- Geç kalma tespiti (tolerans bazlı) ✅
- Shift swap/trade sistemi ✅
- Shift template + bulk create ✅
- Factory kiosk → üretim kaydı ✅
