# DOSPRESSO Devir Teslim — 7 Nisan 2026
## Oturum: Payroll + CRM/Görev Sistemi Yeniden Yapılandırma
## Son Commit: `8a2170b0` (Claude) + `c36d6415` (Replit)

---

## 1. TAMAMLANAN İŞLER (12 Claude Commit + 1 Replit Commit)

### A. DuyuruStudioV2 Sprint D-R1
- 8 modüler dosya: DuyuruStudio, CanvasPreview, BackgroundPanel, TextPanel, ImagePanel, TemplatePanel, GradientPresets, useCanvas
- Route: `/duyuru-studio` (App.tsx ProtectedRoute)
- D-R2 BEKLİYOR: AI görsel + yayın akışı. announcements.tsx hala eski BannerEditor Dialog (3 yerde)

### B. Payroll Motor İyileştirme
- İKİ AYRI maaş motoru keşfedildi: Motor1 (basit+PDKS, aktif UI) vs Motor2 (SGK/vergi, orphan)
- pdks-engine: FM 30dk eşik, publicHolidays join, holidayWorkedDays
- payroll-engine: PayrollMonthConfig (15 parametrik alan), loadPayrollConfig(), DB'den config
- payroll-bridge.ts: PDKS + SGK birleşik motor
- DB: monthly_payroll 3 kolon + payroll_deduction_config (25 kolon, cascade)
- Seed: 2026 tatiller (16 kayıt)

### C. Kesinti Konfigürasyon Sistemi
- payroll_deduction_config: branchId + year + month bazlı, 15 parametre
- CRUD API + cascade effective config (6 katman)
- Yetki: admin/ceo/cgo tüm, muhasebe HQ+Fabrika+Işıklar
- payroll-engine hardcoded değerler yerine DB config

### D. CRM/Görev Sistemi Faz 1+2
- CRM Task channel kaldırıldı (sadece Franchise + Misafir)
- Ticket->Görev dönüştürme butonu (yeşil, ticket bilgisi pre-fill)
- Scheduler max 3 instance limiti
- Legacy ticket guard (deprecated uyarı)
- Dead code temizliği (164 satır: TaskChannelContent + imports)
- Pilot veri temizliği (597 kayıt arşivlendi)

### E. Diğer
- Dobody branchPerf undefined fix
- Şube Panel sidebar 5 eksik path mapping (Replit)

---

## 2. SİSTEM: 427+ tablo, 1662+ endpoint, 307+ sayfa, 27 rol

---

## 3. BİLİNEN SORUNLAR

| # | Sorun | Ciddiyet |
|---|-------|----------|
| 1 | announcements.tsx eski BannerEditor Dialog (3 yerde) | Orta |
| 2 | Ticket->Görev geri bağlantı eksik | Orta |
| 3 | guest_complaints boş (0 kayıt) | Düşük |
| 4 | branch_audit_scores boş (uyum skorlama aktif değil) | Orta |
| 5 | payroll_deduction_config boş (admin dolduracak) | Beklenen |
| 6 | Pilot şifre sıfırlama (162 non-admin 0000) | Pilot sonrası kapat |
| 7 | Tatil mesai çarpanı x1 mi x2 mi? | Soru açık |

---

## 4. SIRADAKİ ADIMLAR

1. DuyuruStudioV2 D-R2 (AI görsel + yayın + BannerEditor geçişi) ~3-4 saat
2. PDKS Excel Import Sprint PDKS-1 (plan: docs/PDKS-EXCEL-IMPORT-PLAN.md) ~4 saat
3. Faz 3: Dobody CRM entegrasyonu ~3 saat
4. CRM Dashboard KPI'ları ~2 saat
5. Ticket->Görev geri bağlantı ~1 saat
6. Payroll UI: Kesinti config admin paneli ~3 saat
7. Motor birleştirme: Bridge UI bağlama ~2 saat
8. Uyum Merkezi: Audit skorlama aktivasyonu ~2 saat
9. Fabrika F2: Üretim-vardiya bağlantı, stok KPI fix ~3 saat

---

## 5. DOKÜMANLAR

- docs/PDKS-EXCEL-IMPORT-PLAN.md (4 sprint, 5 tablo)
- docs/PUANTAJ-KURALLARI-ANALIZ.md (5 bakış açısı)
- docs/CRM-GOREV-ANALIZ-7-NISAN-2026.md (duplikasyon, vizyon, 3 katman)

---

## 6. ÇALIŞMA KURALLARI

- Yeni oturumda İLK İŞ: Bu dosyayı oku
- Skill dosyaları: dospresso-architecture, quality-gate, debug-guide
- Çift yetki: module-manifest.ts + schema-02.ts PERMISSIONS birlikte
- Git pull: Oturum başında rebase ile Replit fix'lerini al
- Build: Her commit öncesi frontend + backend
- Token: ASLA dosya içine yazılmaz
- Replit: Claude büyük feature, Replit test + DB migration + seed
