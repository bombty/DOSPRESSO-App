# DECIDED — Mimari & Operasyonel Kararlar

## 5 Mayıs 2026 (Mahmut feedback sonrası)

### Yetki Modeli
- **muhasebe_ik VIEW endpoint'leri:** tüm şubeleri görür (viewOnly=true)
- **muhasebe_ik WRITE endpoint'leri:** sadece managed_branches (5/23/24)
- Kural: `/api/employees`, `/api/leave-requests` → tüm şubeler
- Kural: `PUT /api/employees/:id`, `PATCH /api/leave-requests/:id` → sadece managed

### Personel Listesi
- Kiosk hesapları (sube_kiosk, fabrika_kiosk, kiosk, hq_kiosk) personel listesinde GÖSTERİLMEZ
- Bunlar sistem hesabı, gerçek personel değil
- Maaş tab'ı, İK personel tab'ı, izin yönetimi — hepsinde kiosk filtre uygulanır

### Bordro Mimarisi
- **/bordrom** → personel için kişisel bordro görünümü
- **/maas** → HQ/admin için toplu hesaplama + onay
- Bordrom sayfasında HQ rolleri için "Toplu Hesaplama" linki (yönlendirme)
- PDKS verisi yoksa "henüz hazırlanmadı" + yöneticiye yönlendirme mesajı

### PDKS Detay
- Yeni endpoint: `GET /api/personnel/:userId/attendance-detail?startDate=&endDate=`
- 5 veri kaynağı entegre: pdks_records + factory_shift_sessions + shift_assignments + leave_requests + overtime_requests
- Otomatik anomali tespiti: no_show, no_check_out, no_check_in, late_NNmin
- Frontend: /personel-detay/:id → "attendance" tab tamamen yenilendi

### İK Dashboard Anomali Etkileşimi
- Anormallik kartlarındaki personel listesi tıklanabilir
- Tıklayınca → /personel-detay/:userId?tab=attendance
- Mahmut anomalili personeli hızlı görür → detay sayfasında uygunsuzluğu inceler

### Personel Kartı Hızlı Eylemler (HQ rolleri için)
- 📊 PDKS → /personel-detay/:id?tab=attendance
- 🏖️ İzin → /personel-detay/:id?tab=leave
- 📝 Tutanak → /personel-detay/:id?tab=disciplinary

## Önceki Kararlar (Hatırlatma)

### Triangle Workflow
- **Claude (Sandbox):** Architecture, code, GitHub push
- **Replit:** DB migration, build, smoke test
- **Aslan:** Business/UX/priority kararları + GitHub UI merge

### Schema Lessons
- `users.hire_date` (NOT start_date)
- `pdks_records`: recordDate + recordTime + recordType (giris/cikis)
- `factory_shift_sessions`: checkInTime + checkOutTime + workMinutes
- `MANAGED_BRANCH_IDS = [5, 23, 24]` (HQ + Fabrika + Işıklar)

### Çalışma Sistemi v2.0
- Skill files her session sonunda güncellenir
- 5 perspektifli review zorunlu (Engineer / F&B Ops / QA / PM / Compliance)
- DB write öncesi: backup + DRY-RUN + GO zorunlu
- Schema kolon adlarını grep'le doğrula, asla varsayma

### Pilot Lokasyonları (12 May 2026)
- #5 Antalya Işıklar (HQ-owned)
- #8 Antalya Lara (franchise)
- #23 Merkez HQ
- #24 Fabrika
