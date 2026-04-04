# DOSPRESSO Devir Teslim — 5 Nisan 2026 (Oturum 2)

## ACİL DÜZELTME GEREKLİ (Barista Perspektifinden Bulunan Bug'lar)

### BUG-1: Barista "Benim Günüm" React Crash (KRİTİK)
- Sayfa: personel-centrum.tsx (veya benim-gunum bileşeni)
- Hata: "Rendered more hooks than during the previous render"
- Sebep: Koşullu hook çağrısı (if içinde useQuery veya useState)
- Etki: Barista ana sayfası tamamen çöküyor
- Fix: Koşullu hook'ları bileşen dışına taşı veya early return öncesine al
- Screenshot: IMG_1479

### BUG-2: Barista "İzin Yönetimi" Crash
- Sayfa: İK modülü → İzin Talepleri
- Hata: "Bir hata oluştu — Beklenmeyen bir hata meydana geldi"
- Sebep: Muhtemelen null veri veya API hatası
- Etki: Barista izin talebi oluşturamıyor
- Screenshot: IMG_1476

### BUG-3: Şube Ekipman Listesi Boş
- Sayfa: Ekipman modülü (barista perspektifi)
- Durum: Dashboard'da 8 ekipman görünüyor ama liste boş/tıklanamaz
- Sebep: branchId scope filtresi veya ekipman-şube bağlantısı eksik
- Screenshot: IMG_1480

### BİLGİ: Çalışan Sayfalar (Barista)
- Akademi/Onboarding: ✅ Çalışıyor (IMG_1478)
- Mesai Talepleri: ✅ Çalışıyor, 0 kayıt (IMG_1477)
- Yeni Arıza Bildirimi: ✅ Çalışıyor (IMG_1481)

---

## SİSTEM ATÖLYESİ DİAGNOSTİK ÖZELLİĞİ (Planlanan)

### Aslan'ın İsteği:
Sistem Atölyesi'nde tek bir yerden:
- Hangi sayfalar çalışıyor, hangisi kırık
- Her rolün her sayfasındaki durum (✅ / ❌ / ⚠️)
- Akışlardaki kırık adımlar
- Link akışları (A sayfası → B sayfası → çalışıyor mu?)
- Fonksiyon akışları (API call → DB sorgusu → sonuç)

### Teknik Yaklaşım:
1. Backend: `/api/system/health-check` endpoint
   - Her modülün API endpoint'lerini çağırır
   - Sonucu (200/401/403/500) kaydeder
   - Rol bazlı test (barista olarak, coach olarak...)

2. Frontend: Sağlık tab'ına "Sayfa Durumu" bölümü
   - Rol × Sayfa matrisi (ısı haritası)
   - Tıklanabilir: hangi sayfa hangi rolde kırık
   - Son test tarihi + sonucu

3. Otomatik güncelleme:
   - Her deploy sonrası health check çalıştır
   - Kırık sayfa → Dobody uyarı oluştur

### Bu Özellik İçin Sprint Planı:
- Sprint SA-1: Health check API + temel matris UI
- Sprint SA-2: Rol bazlı test + akış doğrulama
- Sprint SA-3: Otomatik güncelleme + Dobody entegrasyonu

---

## BU OTURUMDA TAMAMLANAN İŞLER

### Kod (14 commit):
- Proje v2 Sprint 1: 6 tab portfolio dashboard
- Denetim v2 Sprint A-D: şablon, form, aksiyon, SLA, trend
- Dobody Sprint 1-3: 5 tablo, 8 workflow, öğrenme, brief
- DobodyProposalWidget: 4 dashboard entegrasyonu
- Sistem Atölyesi v4: 20 akış, modül filtre, yön göstergesi

### Dokümantasyon (19 dosya):
AGENTS.md, STATUS.md, CHANGELOG.md
docs/: BUSINESS-RULES, ROLES-AND-PERMISSIONS, FACTORY-SYSTEM,
PDKS-PAYROLL-SYSTEM, EQUIPMENT-SYSTEM, STOCK-INVENTORY-SYSTEM,
EDUCATION-ACADEMY, CRM-CUSTOMER-SYSTEM, CHECKLIST-SYSTEM,
NOTIFICATION-SYSTEM, KPI-SCORING-SYSTEM, DATA-PRIVACY-KVKK,
INTEGRATION-MAP, API-CATALOG, DOBODY-AGENT-PLAN,
DENETIM-SISTEMI-PLAN, PROJE-SISTEMI-PLAN, SISTEM-ATOLYESI-PLAN

### Skills (3 güncellendi):
dospresso-architecture, dospresso-quality-gate, dospresso-debug-guide

---

## SONRAKİ OTURUM ÖNCELİKLERİ

1. BUG-1 düzelt (Barista ana sayfa crash) — ACİL
2. BUG-2 düzelt (İzin Yönetimi crash)
3. BUG-3 düzelt (Ekipman listesi boş)
4. Sistem Atölyesi diagnostic özelliği Sprint SA-1
5. Tüm rollerin tüm sayfalarını test et
6. Duyuru düzenleme bug'ı (hala detay bekleniyor)
