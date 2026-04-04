# Sistem Atölyesi v4 — Kapsamlı Yükseltme Planı
**Tarih:** 5 Nisan 2026
**Hedef:** Tüm sistemi tek yerden kontrol edebilme, akış testi, rol simülasyonu

---

## 1. MEVCUT DURUM VE EKSİKLER

### Mevcut 5 Tab:
- Harita: Modül listesi (çalışıyor ama statik)
- Roller: Rol grupları + basit simülasyon (sınırlı)
- Akışlar: 6 akış (eksik — toplam 25+ akış olmalı)
- Sağlık: Sistem metrikleri
- Notlar: Workshop notları

### Eksikler:
- Akışlarda yön bilgisi yok (tek yön / çift yön)
- Roller tab'ında o rolün eriştiği TÜM sayfalar listesi yok
- Her rolün katıldığı akışlar bağlantısı yok
- Modül bazlı akış filtreleme yok
- Mr. Dobody akışları eksik
- Fabrika detaylı akışları eksik
- Test/doğrulama mekanizması yok
- Akışlarda hangi DB tabloları etkileniyor bilgisi yok

---

## 2. TÜM SİSTEM AKIŞLARI (25 Akış, 7 Modül Grubu)

### A. FABRİKA AKIŞLARI (5 akış)

```
A1. Hammadde → Üretim → Mamül
    Yön: TEK YÖN (→)
    Roller: Satınalma → Fabrika Müdür → Operatör → QC
    Adımlar: Hammadde Sipariş → Teslim Alım → Reçete Seçimi →
             Üretim Başlat → İstasyon Kaydı → Yarı Mamül → Mamül
    Tablolar: raw_materials, purchase_orders, production_batches,
              factory_production_runs, factory_production_outputs

A2. Kalite Kontrol (2 Aşama)
    Yön: TEK YÖN (→), RED durumunda GERİ (←)
    Roller: Operatör → Fabrika Müdür (QC1) → Fabrika Müdür (QC2)
    Adımlar: Üretim Çıkış → Görsel Kontrol → Ölçüm → 
             Detaylı Test → ONAY → LOT Oluşturma
             veya RED → Üretim'e Geri / İmha
    Tablolar: factory_quality_checks, factory_quality_measurements,
              production_lots, waste_lots

A3. Sevkiyat → Şube Stok
    Yön: TEK YÖN (Fabrika → Şube)
    Roller: Fabrika Müdür → Depo → Supervisor (teslim)
    Adımlar: Sevkiyat Planı → LOT Seçimi (FIFO) → Paketleme →
             Çıkış Onayı → Yolda → Şube Teslim → Stok Güncelle
    Tablolar: factory_shipments, factory_shipment_items,
              branch_inventory, branch_stock_movements

A4. Reçete Yönetimi
    Yön: TEK YÖN (HQ → Fabrika → Şube bildirim)
    Roller: CEO/CGO → Fabrika Müdür → Tüm Şubeler (bildirim)
    Adımlar: Reçete Oluştur → Malzeme Listesi → Maliyet Hesabı →
             Versiyon Kaydet → Şubelere Bildirim
    Tablolar: recipes, recipe_versions, recipe_notifications

A5. Fire & Atık Yönetimi
    Yön: TEK YÖN (→)
    Roller: Operatör → Fabrika Müdür → Muhasebe (rapor)
    Adımlar: Fire Tespit → Neden Seçimi → Miktar Kaydı →
             LOT İmha → Fire Raporu
    Tablolar: waste_lots, factory_waste_reasons
```

### B. ŞUBE OPERASYON AKIŞLARI (6 akış)

```
B1. Vardiya Planlama → Kiosk → PDKS → Bordro
    Yön: TEK YÖN (→)
    Roller: Supervisor (plan) → Personel (kiosk) → Sistem (PDKS) →
            Muhasebe (bordro)
    Adımlar: Haftalık Plan → Vardiya Atama → Kiosk Check-in →
             Geç Kalma Tespiti → PDKS Kaydı → Gün Sınıflandırma →
             Aylık Özet → Bordro Hesaplama → Onay → Kilitleme
    Tablolar: shifts, shift_attendance, pdks_records,
              monthly_payrolls, salary_deductions

B2. Checklist Döngüsü
    Yön: TEK YÖN (→)
    Roller: Barista/Supervisor (doldur) → Supervisor (onay) → Sistem (skor)
    Adımlar: Günlük Açılış → Maddeleri Tik → Fotoğraf Ekle →
             Tamamla → Supervisor Onay → Skor Hesapla
    Tablolar: checklists, checklist_tasks, checklist_completions,
              checklist_task_completions

B3. Stok Sayım & Sipariş
    Yön: ÇİFT YÖN (Şube ↔ HQ/Fabrika)
    Roller: Supervisor (sayım) → Satınalma (sipariş) → Tedarikçi → Depo
    Adımlar: Fiziksel Sayım → Fark Tespiti → Düzeltme Kaydı →
             Sipariş Talebi → Satınalma Onayı → Tedarikçi Siparişi →
             Teslim Alma → Stok Güncelle
    Tablolar: branch_inventory, inventory_movements, purchase_orders

B4. Müşteri Geri Bildirim (QR)
    Yön: TEK YÖN (Müşteri → Şube → HQ)
    Roller: Müşteri → Sistem → Supervisor → Coach/CGO (escalation)
    Adımlar: QR Okutma → Form Doldurma → Puan + Yorum →
             Anlık Bildirim → Düşük Puan: Uyarı → Şikayet: Ticket →
             Çözüm → NPS Güncelleme
    Tablolar: customer_feedback, feedback_responses, guest_complaints

B5. Arıza Bildirim → Servis → Çözüm
    Yön: ÇİFT YÖN (Şube ↔ HQ)
    Roller: Herhangi Personel → Supervisor → CGO/Teknik → Dış Servis
    Adımlar: Troubleshoot Adımları → Çözülmediyse: Arıza Bildirimi →
             Fotoğraf + Açıklama → Supervisor Onay → HQ Yönlendirme →
             Dahili Çözüm veya Dış Servis → Takip (7 aşama) →
             Test → Kapanış
    Tablolar: equipment_faults, fault_service_tracking,
              equipment_service_requests

B6. İzin Talebi
    Yön: ÇİFT YÖN (Personel ↔ Yönetici)
    Roller: Personel (talep) → Supervisor (onay) → İK (kayıt)
    Adımlar: Talep Oluştur → Çakışma Kontrolü → Supervisor Onay →
             PDKS Güncelle → İzin Bakiye Düş
    Tablolar: leave_requests, employee_leaves
```

### C. HQ DENETİM & YÖNETİM AKIŞLARI (5 akış)

```
C1. Şube Denetim Döngüsü (v2)
    Yön: TEK YÖN (HQ → Şube)
    Roller: Coach/Trainer → Şube Personeli (denetlenen) →
            Supervisor (aksiyon) → Coach (onay)
    Adımlar: Şablon Seç → Şube Seç → Denetim Başlat →
             Form Doldur (7 tip) → Personel Denetimi (4 boyut) →
             Skor Hesapla → Aksiyon Oluştur → Deadline + SLA →
             Çözüm Bildir → Denetçi Onayı → Denetim Kapat
    Tablolar: audit_templates_v2, audits_v2, audit_responses_v2,
              audit_personnel_v2, audit_actions_v2

C2. Proje Yönetimi (v2)
    Yön: ÇİFT YÖN (HQ ↔ Tüm Katılımcılar)
    Roller: Proje Yöneticisi → Ekip Üyeleri → CEO (oversight)
    Adımlar: Proje Oluştur → Milestone Planla → Görev Ata →
             İlerleme Takip → Yorum/İletişim → Tamamlama → Arşiv
    Tablolar: projects, project_tasks, project_members,
              project_milestones, project_comments

C3. Eğitim Lifecycle
    Yön: TEK YÖN (HQ → Personel)
    Roller: Trainer (oluştur) → Coach (ata) → Personel (tamamla) →
            Sistem (sertifika)
    Adımlar: Modül Oluştur → Materyal Ekle → Quiz Ekle →
             Eğitim Ata → Personel İzle → Quiz Çöz →
             Geçer Not → Sertifika Ver → Rozet Kazan
    Tablolar: training_modules, training_assignments,
              quizzes, issued_certificates, badges

C4. Onboarding (Yeni Personel)
    Yön: TEK YÖN (İK → Personel)
    Roller: İK (kayıt) → Trainer (plan) → Supervisor (mentor) →
            Personel (tamamla)
    Adımlar: Sisteme Kayıt → Onboarding Programı Ata →
             Haftalık Görevler → Check-in'ler → Eğitim →
             Değerlendirme → Bağımsız Çalışma
    Tablolar: onboarding_templates, onboarding_instances,
              employee_onboarding

C5. Duyuru & İletişim
    Yön: TEK YÖN (HQ → Şubeler)
    Roller: Admin/CEO/CGO → Tüm Hedefler
    Adımlar: Duyuru Oluştur → Hedef Seç (rol/şube) →
             Yayınla → Okundu Takibi
    Tablolar: announcements, announcement_reads
```

### D. MR. DOBODY (AGENT) AKIŞLARI (4 akış)

```
D1. Event → Analiz → Öneri → Onay
    Yön: ÇİFT YÖN (Sistem ↔ Kullanıcı)
    Roller: Sistem (event) → Dobody (analiz) → Kullanıcı (onay/ret) →
            Dobody (öğrenme)
    Adımlar: Olay Algıla → Scope Kontrol → Analiz →
             Günlük Limit Kontrol → Duplikasyon Kontrol →
             Öneri Oluştur → Kullanıcıya Sun → Onayla/Reddet →
             Öğrenme Kaydı → Güven Skoru Güncelle
    Tablolar: dobody_events, dobody_proposals, dobody_learning,
              dobody_workflow_confidence

D2. SLA Takip & Escalation
    Yön: TEK YÖN (Dobody → Kullanıcılar, kademeli)
    Roller: Dobody → Supervisor (Gün-3) → Coach (Gün-1) → CGO (Gün+0)
    Adımlar: Aksiyon Deadline Kontrol → 3 Gün Kala: Supervisor Uyarı →
             1 Gün Kala: Coach Uyarı → Deadline Geçti: SLA İhlali →
             CGO Escalation
    Tablolar: audit_actions_v2 (slaBreached), dobody_proposals

D3. Haftalık Brief (WF-8)
    Yön: TEK YÖN (Dobody → Yönetim)
    Roller: Dobody → CEO + Coach
    Adımlar: Haftalık Veri Topla → Denetim Özeti → Aksiyon Durumu →
             Bekleyen Öneri → Brief Oluştur → CEO'ya + Coach'a Gönder
    Tablolar: dobody_proposals

D4. Scope & Güvenlik
    Yön: TEK YÖN (Kural → Uygulama)
    Roller: Admin (scope tanımla) → Dobody (kural uygula)
    Adımlar: Rol Scope Tanımla → İzinli Modüller → Yasaklı Kelimeler →
             Branch Scope → Her Sorguda Kontrol
    Tablolar: dobody_scopes
```

### E. FİNANSAL AKIŞLAR (3 akış)

```
E1. Bordro Hesaplama & Ödeme
    Yön: TEK YÖN (PDKS → Muhasebe)
    Roller: Sistem (PDKS) → Muhasebe (hesapla) → Admin (onayla)
    Adımlar: PDKS Özet Çek → Pozisyon Maaş Eşle → Kesinti Hesapla →
             Fazla Mesai Hesapla → Net Maaş → Kontrol → Onayla → Kilitle
    Tablolar: pdks_records, position_salaries, monthly_payrolls

E2. Satınalma Süreci
    Yön: ÇİFT YÖN (Şube ↔ Satınalma ↔ Tedarikçi)
    Roller: Supervisor (talep) → Satınalma (sipariş) → Tedarikçi → Depo
    Adımlar: İhtiyaç Tespit → Talep Oluştur → Teklif Al →
             Sipariş Ver → Takip → Teslim Alma → Fatura Kontrol
    Tablolar: purchase_orders, purchase_order_items, suppliers

E3. Gelir-Gider Analizi
    Yön: TEK YÖN (Veriler → Rapor)
    Roller: Muhasebe → CEO/CGO
    Adımlar: Veri Topla → Kategorize → Analiz → Rapor → Sunum
    Tablolar: financial_records, monthly_reports
```

### F. İK & PERSONEL AKIŞLARI (2 akış)

```
F1. Personel Yaşam Döngüsü
    Yön: TEK YÖN (→)
    Roller: İK → Trainer → Supervisor → Personel
    Adımlar: İşe Alım → Sisteme Kayıt → Onboarding →
             Eğitim → Aktif Çalışma → Performans Takip →
             Terfi/Transfer → İşten Ayrılış
    Tablolar: users, employee_onboarding, training_assignments

F2. Performans Değerlendirme
    Yön: ÇİFT YÖN (Yönetici ↔ Personel)
    Roller: Supervisor → Personel → Coach
    Adımlar: Değerlendirme Başlat → Composite Score Hesapla →
             Denetim + Checklist + Eğitim + Devam = Toplam →
             Geri Bildirim → Gelişim Planı
    Tablolar: composite_scores, staff_evaluations
```

---

## 3. ROL BAZLI SAYFA HARİTASI (Her rolün eriştiği sayfalar)

### CEO
```
Sayfalar: ceo-command-center, projeler, proje-detay, raporlar,
          sube-saglik-skoru, denetim-sablonlari, denetimler,
          ekipman-mega, stok-yonetimi, fabrika, kullanici-yonetimi,
          sistem-atolyesi, duyurular, crm-mega, akademi, task-atama
Akışlar: C1, C2, C5, D3, E3 (oversight)
```

### Coach
```
Sayfalar: coach-kontrol-merkezi, coach-sube-denetim, denetim-detay-v2,
          denetim-sablonlari, egitim-takip, personel-listesi,
          sube-saglik-skoru, akademi, projeler
Akışlar: C1 (yürütücü), C3 (atama), D2 (escalation alıcı)
```

### Supervisor
```
Sayfalar: supervisor-centrum, vardiya-planlama, checklist-doldur,
          stok-sayim, ekipman-detay, personel-listesi, ariza-bildir
Akışlar: B1 (plan), B2 (onay), B3 (sayım), B5 (bildirim), B6 (onay)
```

### Barista
```
Sayfalar: personel-centrum, kiosk-giris, checklist-doldur,
          egitim-modul, gorevlerim
Akışlar: B1 (kiosk giriş), B2 (doldur), C3 (eğitim al)
```

(Diğer roller benzer şekilde dokümante edilecek)

---

## 4. YÖN KURALLLARI (Tek yön / Çift yön)

### TEK YÖN (→) — Veri bir yöne akar:
- Şube → HQ (performans verisi, PDKS, skor)
- Fabrika → Şube (sevkiyat, ürün)
- HQ → Şube (duyuru, görev atama)
- HQ → Personel (eğitim atama)
- Dobody → Kullanıcı (öneri, brief)
- PDKS → Bordro (hesaplama)

### ÇİFT YÖN (↔) — İki taraf veri alışverişi yapar:
- Şube ↔ HQ (stok talebi → onay, arıza → çözüm)
- Personel ↔ Yönetici (izin talebi → onay/ret)
- Kullanıcı ↔ Dobody (öneri → onay/ret → öğrenme)
- HQ ↔ Katılımcılar (proje görevleri → ilerleme)

---

## 5. UI GELİŞTİRME PLANI

### Roller Tab Geliştirmeleri:
- Her rol tıklandığında: büyük simülasyon paneli
- Eriştiği tüm sayfalar listesi (sayfa adı + path)
- Katıldığı akışlar listesi (tıklanabilir → akış tab'ına git)
- Dobody scope bilgisi
- Veri erişim matrisi (ne görebilir, ne göremez)

### Akışlar Tab Geliştirmeleri:
- Modül bazlı filtreleme (Fabrika/Şube/HQ/Dobody/Finans/İK)
- Her akışta yön göstergesi (→ tek yön, ↔ çift yön)
- Her adımda: ilgili tablolar, ilgili API endpoint
- Her adımda: o adımı yapan rol (tıklanabilir → roller tab'ına git)
- Akış durumu göstergesi (çalışıyor/kısmen/planlanıyor)
- Her akışta test butonu (API call yaparak doğrulama)

### Yeni: Bağlantı Matrisi
- Hangi modül hangi modüle veri gönderiyor
- Modül × Modül matrisi (ısı haritası)
