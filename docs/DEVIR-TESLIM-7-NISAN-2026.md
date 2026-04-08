# DOSPRESSO Devir Teslim — 7-8 Nisan 2026
## Son Commit: 957ef0ed | Sistem: 441+ tablo, 1695+ endpoint, 313+ sayfa, 30 rol

## TAMAMLANAN İŞLER (~30 commit)

### Payroll Sistemi ✅
- FM 30dk eşik, tatil mesai, yemek, +1 ceza, Bridge, kesinti config (15 parametre)
- payroll_deduction_config (25 kolon) + 2026 tatil seed (16 kayıt)

### CRM/Görev Faz 1+2 ✅
- Task channel kaldırıldı, Ticket→Görev, scheduler max 3, dead code -164 satır, pilot temizlik 597 kayıt

### DuyuruStudioV2 D-R1 + D-R2 ✅
- 8 modüler dosya, BannerEditor 1713→15 satır (redirect), admin/bannerlar→/duyuru-studio

### Fabrika Reçete Sistemi R-1→R-4 ✅
- 9 tablo, 2 yeni rol (sef+recete_gm), Keyblend gizli formül
- Kiosk üretim modu, reçete düzenleme, Keyblend yönetimi
- Besin değer hesaplama + 14 alerjen + Cinnabon seed

### PDKS Excel Import Sprint-1 ✅
- 5 tablo (pdks_excel_imports, records, daily_summary, monthly_stats, mappings)
- Upload+parse API, personel eşleştirme (kod/isim/manuel), günlük özet hesaplama
- Frontend sayfası + IK sidebar

### Dobody CRM Entegrasyonu ✅
- agent-engine.ts: supportTickets monitoring eklendi
- Backlog alert (10+), SLA ihlali, yüksek öncelik escalation

### Denetim + Düzeltmeler ✅
- Reçete route yetki fix (FabrikaOnly→ProtectedRoute)
- Banner ölü link fix (/admin/banner-editor→/duyuru-studio)
- Çalışma sistemi v2.0 + maliyet optimizasyonu protokolü

## BİLİNEN SORUNLAR
1. Reçete listesinde Düzenle/Yeni butonları tüm rollere görünüyor (API koruyor)
2. PDKS tarih parse: TR formatı edge case
3. product_recipes→factory_recipes migrasyon (12 kayıt) bekliyor
4. guest_complaints boş, branch_audit_scores boş

## SIRADAKİ
1. Fabrika F2 (üretim↔vardiya, stok KPI)
2. Uyum Merkezi aktivasyonu
3. PDKS Sprint-2 (hesaplama motoru)
