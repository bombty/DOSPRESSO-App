# 99 — Bulgular (FINDINGS)
**Üretim Tarihi**: 2026-04-18  
**Kapsam**: 31 rol × 80+ modül × 250 route taraması — manuel + algoritmik gap detection.  
**Toplam Bulgu**: 35

---

## KRİTİK (5)

### F01 — Pilot Hazırlık
`module_flags` global=false olan modüller: `delegasyon`, `dobody.flow`, `iletisim_merkezi`, `fabrika.hammadde`, `fabrika.kalite`, `fabrika.kavurma`, `fabrika.sayim`, `fabrika.sevkiyat`, `fabrika.siparis`, `fabrika.stok`, `stok`, `dobody.chat`, `checklist (branch)`. Pilot öncesi her birinin neden disabled olduğu doğrulanmalı (eski naming mi, gerçek devre dışı mı).

### F02 — Fabrika Naming Çakışması
`fabrika.stok` (disabled) vs `fabrika.production` (enabled), `fabrika.sayim` (disabled) vs `fabrika.haccp` (enabled). İki naming şeması paralel — biri legacy, hangisi pilot için aktif net değil.

### F03 — adminhq Parola Yönetimi
`replit.md` ve IT task notları çelişiyor (`0000` vs `133200`). Pilot Pzt 09:00 öncesi tek parola standardı belirlenmeli ve mustChangePassword zorunlu yapılmalı.

### F04 — Tek Onaylayıcı SPOF
`recete_gm` reçete onayında tek başına onaylayıcı, `kalite_kontrol` ve `gida_muhendisi` SADECE 1'er kullanıcıya sahip. Tatil/hastalık durumunda satın alma & üretim kilitlenir.

### F05 — Yatirimci_HQ Dashboard Kısır
`yatirimci_hq` rolüne sadece `pdks_branch_detail` widget atanmış — 31 modül erişim yetkisi var ama dashboard'da finansal özet, şube durum, kalite skoru görünmüyor. Yatırımcı raporlama için yetersiz.

## YÜKSEK (10)

### F06 — Schema Drift
`PERMISSIONS` map'inde 31 rol var ama `users` tablosunda `fabrika_sorumlu`, `fabrika_personel`, `fabrika`, `muhasebe` rolleri için 0 aktif kullanıcı. Schema temizliği veya gelecek tahsis netleştirilmeli.

### F07 — Mudur vs Supervisor Widget Tutarsızlığı
`supervisor` rolünde `branch_score_detail` widget var, `mudur` rolünde YOK. Supervisor şube müdüründen daha detaylı skor görüyor — hiyerarşi tersine.

### F08 — Coach Yetki vs Widget Eşleşmesi
`coach` 11 modülde onay yetkisi var ama widget set'inde sadece `pdks_absence`, `shift_compliance`, `sla_tickets` var. Onay bekleyen iş kuyruğu (örn. eğitim tamamlama, denetim takip) widget olarak görünmüyor.

### F09 — Trainer Akademi Yetersiz
`trainer` rolüne `academy_admin` (edit) yetkisi var ama dashboard'da `training_progress` dışında akademi widget'ı yok. Sınav onay bekleyen, sertifika talep listesi görünmüyor.

### F10 — Fabrika Müdür Mali Görünüm
`fabrika_mudur` rolüne `financial_overview` widget atanmış ama PERMISSIONS'da `accounting` yetkisi yok (sadece `view`). Widget yüklenmesi yetkisiz endpoint çağrısı yapacak (403 muhtemel).

### F11 — Sube Kiosk Soft Delete Yetkisi
`sube_kiosk` rolünde `tasks`, `checklists` modülleri için yetki var ama PIN-based ortak cihazda kullanıcı izi (audit) zayıf — kim hangi görevi tamamladı belirsiz.

### F12 — Recete_GM Maliyet Görünüm
`recete_gm` rolünde `cost_management` ve `purchase_orders` yetkileri var ama dashboard'da widget atanmamış (sadece todays_tasks gibi standart). Maliyet senaryo karşılaştırma manuel sayfa ziyareti gerektiriyor.

### F13 — İk Onay Akışı Eksik
`muhasebe_ik` rolü `leave_requests` ve `overtime_requests` için onay yetkisi var ama bordro hesaplama otomasyonu (auto-approval threshold) belirsiz — manuel bottleneck.

### F14 — Marketing Müşteri Bildirim
`marketing` rolünde `crm_complaints` ve `customer_feedback` view yetkisi var ama yeni şikâyet bildirimi tetiklenmiyor (sadece destek alıyor). Marka itibarı için kritik.

### F15 — Branch Setup Onboarding
Pilot 4 lokasyonun 3'ü `setup_complete=false` ise onboarding wizard'ı her giriş tetikler — Pzt 09:00 hızlıca ya complete edilmeli ya bypass.

## ORTA (11)

### F16 — Stajyer Çok Yetkili
`stajyer` rolünde 31 modül erişim yetkisi var (5 yazma yetkisi dahil). Eğitim odaklı bir rol için fazla geniş — `tasks` create, `messages` create yetkileri kısıtlanmalı.

### F17 — Yatirimci_branch Eğitim Erişim
`yatirimci_branch` rolünde `training_progress` widget var ama `academy` modülü yetkisi sadece view → öğrenci listesi görünmesin diye kapatılmalı veya filtrelenmeli (PII).

### F18 — Bar_buddy ve Barista Aynı Widget
İkisi de aynı 3 widget'a sahip (`todays_tasks`, `training_progress`, `quick_actions`). Bar_buddy yardımcı rolü için ek bir widget (örn. üst seviye supervisor görünümü) yok.

### F19 — Sube Kiosk Tek Yönlü
`sube_kiosk` PIN ile vardiya başlat/bitir/mola yapar ama bunun şube müdürünün onay/görünüm akışına entegrasyonu zayıf — anlık vardiya panosu yok.

### F20 — Fabrika Operator Görev Atama
`fabrika_operator` `tasks: create` yetkisi yok — kendisine atanan görevi sadece tamamlar. Hat lideri istasyondan görev atayamaz, üst rol gerektirir.

### F21 — Equipment Maintenance Otomatik
`teknik` rolünde `equipment_maintenance` view yetkisi yok PERMISSIONS'da (sadece widget). Bakım planlama sayfasına gittiğinde 403 alabilir.

### F22 — CRM Tek Endpoint
`/crm` ve `/crm-mega` aynı işlevde mi yoksa ayrı mı net değil. Marketing & destek ikisini de açıyor olabilir → kullanıcı kafası karışık.

### F23 — PDKS Widget Karmaşası
5 farklı PDKS widget var: `pdks_overview`, `pdks_attendance`, `pdks_absence`, `pdks_branch_detail`, `pdks_payroll`. Her biri farklı endpoint, farklı rol → tek bir unified PDKS widget rol-aware olmalı.

### F24 — Lost & Found Çift Sayfa
`/kayip-esya` (şube) ve `/kayip-esya-hq` (HQ) ayrı sayfalar. HQ'da merkezi takip ile şube'de yerel kayıt arasındaki sync mekanizması belirsiz.

### F25 — Sef Reçete Sınırlı
`sef` rolü `recipes` modülünde sadece view yetkisi (PERMISSIONS reçete yok). Mutfakta reçete adaptasyonu yapamayacak.

### F26 — Iletisim_merkezi Redirect
`iletisim_merkezi` modül flag disabled, App.tsx'te `IletisimMerkeziRedirect` → `/crm`. Ama eski ezbere giden kullanıcılar için kalıcı yönlendirme bilgilendirmesi yok.

## DÜŞÜK (9)

### F27 — Gida_muhendisi & Kalite_kontrol Üst Üste
İki rolün dashboard widget set'i %100 aynı (6 widget). Sorumluluklar PERMISSIONS'da farklılaşmış (gıda mühendisi food_safety approve var) ama dashboard ayrımı yok.

### F28 — Fabrika Legacy Rolü
`fabrika` rolü PERMISSIONS'da var ama 0 user. App.tsx'te `FabrikaOnly` group'ta dahil — silinmeli veya açık olarak deprecated marklanmalı.

### F29 — Ajanda Genel Erişim
`ajanda` modül flag global enabled, sadece admin PERMISSIONS'da (CRUD). Diğer rollerde view yetkisi bile yok → menüde görünüyor mu?

### F30 — Banner & Duyuru Çakışması
`/admin/bannerlar` ve `/admin/duyurular` ayrı sayfalar. AnnouncementHeaderBanner globalde gösteriliyor, ikisinin priority/visibility kuralı net değil.

### F31 — HQ Kiosk Rolü Eksik
`/hq/kiosk` route App.tsx'te public path, ama `hq_kiosk` rolü PERMISSIONS'da yok. Hangi rol kullanıyor belirsiz.

### F32 — Mr. Dobody Widget Atanmamış
19 widget var ama `dobody`/`agent` widget yok. Mr. Dobody Mini Bar global ama dashboard widget olarak gösterilmiyor.

### F33 — SLA Tracker İkili
`sla_tracker` ve `sla_tickets` farklı widget mı yoksa duplicate mı? coach'ta ikincisi, mudur/supervisor/destek'te birincisi → tutarsızlık.

### F34 — Push Permission Banner
`PushPermissionBanner` global ama hangi rollerde push notification fiilen gönderiliyor net değil — sadece kritik/kişiye özel mi?

### F35 — 215 Page vs 250 Route
215 .tsx dosya, 250 route → 35 fazla route bazı sayfaları multiple path ile gösteriyor. Yönlendirme tutarsızlığı (kanonik URL belirsiz).

---

## Özet Tablo
| Severity | Adet |
|----------|------|
| KRİTİK | 5 |
| YÜKSEK | 10 |
| ORTA | 11 |
| DÜŞÜK | 9 |
| **TOPLAM** | **35** |

---

## Pilot İçin Aksiyon Önceliği (28 Nisan 2026 öncesi)
1. **F01-F05 (KRİTİK)**: Pilot blokeri — Pzt 09:00 öncesi MUTLAKA çözülmeli.
2. **F06-F15 (YÜKSEK)**: Pilot ilk haftasında izlenmeli, hızlı patch hazır.
3. **F16-F26 (ORTA)**: Pilot sonrası 1. ay roadmap.
4. **F27-F35 (DÜŞÜK)**: Backlog — gelecek sprint.
