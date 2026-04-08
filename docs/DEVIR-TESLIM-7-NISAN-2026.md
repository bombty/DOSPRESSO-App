# DOSPRESSO Devir Teslim — 7 Nisan 2026
## Son Commit: 14647ca9 (Claude) + 262b3396 (Replit)

## TAMAMLANAN İŞLER (~22 commit, ~5000+ satır)

### Payroll Sistemi
- FM 30dk eşik, tatil mesai, yemek bedeli, +1 ceza
- Payroll Bridge (Motor 1+2 birleştirme)
- Kesinti konfigürasyon sistemi (15 parametre, şube bazlı, cascade)
- DB: payroll_deduction_config (25 kolon) + monthly_payroll 3 kolon
- 2026 tatil seed (16 kayıt)

### CRM/Görev Faz 1+2
- Task channel CRM'den kaldırıldı (sadece Franchise+Misafir)
- Ticket→Görev dönüştürme butonu
- Scheduler max 3 açık instance limiti
- Legacy ticket guard (deprecated)
- Dead code temizliği (164 satır)
- Pilot veri temizliği (597 kayıt)

### DuyuruStudioV2 D-R1 + D-R2
- D-R1: 8 modüler dosya, /duyuru-studio route
- D-R2: BannerEditor→DuyuruStudio geçişi (-1713 satır dead code)
- announcements.tsx artık DuyuruStudio'ya Link ile yönlendiriyor

### Fabrika Reçete Sistemi (4 Sprint R-1→R-4)
- 9 tablo: factory_recipes, factory_recipe_ingredients, factory_recipe_steps,
  factory_keyblends, factory_keyblend_ingredients, factory_production_logs,
  factory_recipe_versions, factory_recipe_category_access, factory_ingredient_nutrition
- 2 yeni rol: sef (Ümit), recete_gm (İlker)
- Keyblend gizli formül sistemi (API seviyesinde korunur)
- Mamül/Yarı Mamül (output_type + parent_recipe_id)
- Per-reçete kilit sistemi
- Kiosk üretim modu (tam ekran, timer, batch, ingredient chips)
- Reçete düzenleme formu (tüm parametreler)
- Keyblend yönetim paneli
- Besin değer hesaplama + 14 alerjen tespiti
- Cinnabon seed verisi (15 malzeme, 10 adım, 1 keyblend)
- Batch: x1, x1.25, x1.5, x1.75, x2 | AR-GE: %5, %10, %25

### Diğer
- Dobody branchPerf fix
- Şube Panel sidebar 5 path mapping (Replit)
- Çalışma sistemi v1.0 (4 skill dosyası)

## SISTEM: 436+ tablo, 1680+ endpoint, 311+ sayfa, 29 rol

## BİLİNEN SORUNLAR
1. announcements.tsx eski BannerEditor Dialog → DuyuruStudio Link (tamamlandı)
2. Ticket→Görev geri bağlantı (ticket'ta bağlı görev gösterimi) eksik
3. guest_complaints boş, branch_audit_scores boş
4. product_recipes→factory_recipes migrasyon (12 kayıt) bekliyor
5. Pilot şifre sıfırlama pilot sonrası kapatılmalı

## SIRADAKİ
1. PDKS Excel Import (plan: docs/PDKS-EXCEL-IMPORT-PLAN.md)
2. Dobody CRM entegrasyonu (ticket monitoring, backlog alert)
3. Fabrika F2 (üretim↔vardiya, stok KPI)
4. Uyum Merkezi aktivasyonu

## KURALLAR
- Yeni oturumda İLK İŞ: Bu dosyayı oku
- Skill dosyaları: /mnt/skills/user/ (4 dosya, güncel)
- Çift yetki: module-manifest.ts + schema-02.ts birlikte
- Token ASLA dosya içine yazılmaz
