# DOSPRESSO CRM + Operasyon + Görev Sistemi — Kapsamlı Analiz & Yeniden Yapılanma Planı
**Tarih:** 1 Nisan 2026 | **Analiz eden:** Claude (IT Danışman)
**Durum:** TASLAK — Aslan onayı gerekli

---

## BÖLÜM 1: MEVCUT SİSTEM ANALİZİ

### 1.1 Tespit Edilen Sorunlar (Screenshot Analizi)

| # | Sorun | Ekran | Etki |
|---|-------|-------|------|
| C1 | CRM modülünde Franchise/Misafir/Görevler butonları karışık — kullanıcı ne yapacağını bilmiyor | CRM Ana | 🔴 |
| C2 | Misafir Memnuniyeti butonu HQ sayfalarında çalışmıyor, redirect döngüsü | Operasyon modülü | 🔴 |
| C3 | Görev oluşturma son adımda 500 hatası ("Görev başlatılamadı") | Task-atama | 🔴 |
| C4 | CRM'deki KPI'lar standart değil — diğer sayfalardan farklı tasarım | CRM Dashboard | 🟡 |
| C5 | HQ Destek / Destek Talepleri ayrı sayfalar — birleştirilmeli | CRM sidebar | 🟡 |
| C6 | Kontrol merkezi widget'ları tıklanabilir değil | Coach Kontrol | 🟡 |
| C7 | Operasyon modülünde 14+ tab — çok karışık | Operasyon-mega | 🟡 |
| C8 | Denetim sistemi iki yerde — Operasyon + Şube ayrı | Denetim sayfaları | 🟡 |

### 1.2 Mevcut Veritabanı Haritası (75+ ilgili tablo)

```
GÖREV SİSTEMİ (17+ tablo):
├── tasks + task_assignees + task_comments + task_evidence + task_groups
├── task_ratings + task_status_history + task_steps + task_triggers
├── hq_tasks (HQ → Şube görevleri)
├── branch_recurring_tasks + branch_task_instances + branch_task_categories
├── cowork_tasks (CRM içi görevler)
├── dobody_flow_tasks (Mr. Dobody akış görevleri)
├── role_task_templates + role_task_completions
├── shift_tasks (vardiya görevleri)
└── project_tasks + franchise_project_tasks (proje görevleri)

TALEP SİSTEMİ (8+ tablo):
├── support_tickets + support_ticket_comments (genel destek)
├── hq_support_tickets + hq_support_messages (HQ destek)
├── ticket_activity_logs + ticket_attachments + ticket_cowork_members
└── data_change_requests + equipment_service_requests

MÜŞTERİ GERİ BİLDİRİM (7+ tablo):
├── customer_feedback (QR ile misafir puanlama)
├── feedback_form_settings + feedback_custom_questions + feedback_responses
├── branch_feedbacks (şube geri bildirimi)
├── guest_complaints + product_complaints
└── feedback_ip_blocks

CHECKLIST (7+ tablo):
├── checklists + checklist_tasks + checklist_assignments
├── checklist_completions + checklist_task_completions + checklist_ratings
└── shift_checklists

DENETİM/AUDIT (8+ tablo):
├── audit_templates + audit_template_items
├── audit_instances + audit_instance_items + audit_item_scores
├── branch_audit_scores + branch_quality_audits
├── hygiene_audits + quality_audits
└── audit_logs

BİLDİRİM/İLETİŞİM (8+ tablo):
├── notifications + notification_preferences + notification_policies
├── announcements + announcement_read_status
├── messages + message_reads
├── cowork_channels + cowork_channel_members + cowork_messages
└── notification_digest_queue

DİĞER İSTEK/TALEP:
├── leave_requests (izin)
├── overtime_requests (fazla mesai)
├── shift_swap_requests + shift_trade_requests
├── exam_requests
└── recipe_notifications
```

### 1.3 Mevcut Sayfa Haritası

```
CRM Modülü (/crm):
├── Dashboard (KPI özet)
├── Talepler (departmanlara göre filtrelenen ticket listesi)
│   └── Teknik, Lojistik, Muhasebe, Marketing, Eğitim, İK
├── Analizler
├── SLA Kuralları
├── Channels: Franchise | Misafir | Görevler (toggle)
├── HQ Tasks Tab
└── Broadcast Tab (duyurular)

Operasyon Modülü (/gorevler):
├── Şubeler + Şube Dashboard
├── Görevler (tasks)
├── Checklistler
├── Kayıp Eşya + KE HQ
├── Canlı Takip
├── QR Tara + NFC Giriş
├── HQ Destek
├── Bildirimler + Mesajlar
├── Destek
└── Misafir Memnuniyeti (→ /crm?channel=misafir redirect)

Denetim (/denetimler, /coach-sube-denetim):
├── Denetim Şablonları
├── Denetim Yürütme
├── Kalite Denetimi
├── CAPA (Düzeltici Eylem)
└── Coach Şube Denetim
```

---

## BÖLÜM 2: ÖNERİLEN YENİ MİMARİ

### 2.1 Temel İlke: "Conversation Hub" (Onaylanan — 31 Mart)

Tüm iletişim, görev, talep ve geri bildirimler **TEK MERKEZ** altında:

```
İLETİŞİM & GÖREV MERKEZİ (Conversation Hub)
├── 📋 GÖREVLER (Task Channel)
│   ├── HQ → Şube görev atama
│   ├── Coach/Trainer → Şube görev + checklist
│   ├── Dobody otomatik görevler
│   ├── Periyodik görevler (günlük/haftalık/aylık)
│   └── Proje görevleri (yeni şube açma vb.)
│
├── 🎫 DESTEK TALEPLERİ (Support Channel)
│   ├── Şube → HQ teknik talep
│   ├── Şube → HQ lojistik talep
│   ├── Şube → HQ finans talep
│   ├── Şube → HQ eğitim talep
│   └── SLA kuralları + eskalasyon
│
├── 🎯 MİSAFİR SESİ (Guest Voice Channel)
│   ├── QR kod ile misafir geri bildirim
│   ├── Puanlama (1-5 yıldız)
│   ├── Şikayet → otomatik görev oluştur
│   ├── NPS takibi
│   └── Ürün şikayetleri
│
└── 💬 COWORK (İç İletişim)
    ├── Departman kanalları
    ├── Şube kanalları
    ├── Proje kanalları
    └── Duyurular (tek yön HQ → Tüm)
```

### 2.2 Modül Ayrımı (Yeni)

```
CRM (Müşteri & İletişim):
├── Misafir Geri Bildirim (QR + NPS + şikayet)
├── Destek Talepleri (şube ↔ HQ, departmanlara göre)
├── Cowork (iç iletişim kanalları)
├── Duyurular (HQ → Tüm)
└── Dashboard + Analizler + SLA

OPERASYON (Şube Yönetimi):
├── Görev Merkezi (tüm görev türleri tek yerde)
│   ├── Görev Oluştur (HQ/Coach/Trainer → Şube)
│   ├── Periyodik Görevler (şablon bazlı)
│   ├── Görev Takip + Raporlama
│   └── Görev Geri Bildirim (fotoğraf, puan)
├── Checklist Merkezi
│   ├── Şablon Oluştur (HQ)
│   ├── Periyodik Atama (günlük/haftalık)
│   └── Tamamlama + Puanlama
├── Denetim Merkezi
│   ├── Şablon Yönetimi (HQ — kriterler, puanlama)
│   ├── Denetim Planlama + Yürütme (Coach/Trainer)
│   ├── CAPA (düzeltici eylem takip)
│   └── Şube Denetim Görüntüleme (Müdür/Sup)
├── Kayıp Eşya
└── Canlı Personel Takip
```

### 2.3 Rol Bazlı Görev Matrisi

| Rol | Görev Oluştur | Görev Al | Checklist Oluştur | Denetim Yap | Destek Talep | Misafir GB Yönet |
|-----|--------------|----------|-------------------|-------------|-------------|-----------------|
| CEO | ✅ HQ→Tüm | — | — | — | Görüntüle | Dashboard |
| CGO | ✅ Teknik | — | — | — | Teknik dept | Dashboard |
| Coach | ✅ Şube→Görev | — | ✅ Şube bazlı | ✅ Şube denetim | Görüntüle | Puanlama takip |
| Trainer | ✅ Eğitim görev | — | ✅ Eğitim checklist | ✅ Eğitim denetim | Eğitim dept | Dashboard |
| Muhasebe | — | — | — | — | Finans dept | — |
| Satınalma | — | — | — | — | Lojistik dept | — |
| Müdür | ✅ Şube içi | ✅ HQ'dan gelen | — | Sonuç gör | ✅ Oluştur | ✅ Yanıtla + SLA |
| Supervisor | ✅ Ekip içi | ✅ Müdür'den | — | Sonuç gör | ✅ Oluştur | ✅ Yanıtla |
| Barista | — | ✅ Kiosk'tan al | — | — | — | — |

### 2.4 Mr. Dobody Agent Rolü

```
GÖREV OTOMASYONU:
├── Periyodik görev oluşturma (günlük açılış, kapanış, temizlik)
├── Geciken görev → otomatik eskalasyon
├── Checklist yapılmadı → uyarı gönder
├── Tamamlanan görev → skor güncelle
└── Pattern: "Lara 3 gündür temizlik checklist yapmadı" → Coach'a bildir

DESTEK OTOMASYONU:
├── SLA yaklaşıyor → ilgili departmana hatırlat
├── SLA aşıldı → otomatik eskalasyon (dept → CGO/CEO)
├── Tekrar eden sorun → "Bu arıza 3. kez" insight
└── Çözüm süresi analizi → "Teknik departman ort 48s — hedef 24s"

MİSAFİR SESİ OTOMASYONU:
├── Düşük puan (1-2) → otomatik görev oluştur (Müdür'e)
├── NPS trend düşüş → Coach'a bildir
├── Ürün şikayeti → Fabrika QC'ye yönlendir
└── Tekrar müşteri tespiti → "Sadık müşteri" badge

DENETİM OTOMASYONU:
├── Planlanan denetim yaklaşıyor → Coach'a hatırlat
├── Denetim sonucu düşük → aksiyon planı oluştur
├── CAPA deadline yaklaşıyor → Müdür'e bildir
└── Pattern: "Hijyen puanı 3 aydır düşüyor" → insight
```

---

## BÖLÜM 3: DASHBOARD YENİDEN YAPILANMA

### 3.1 Her Rol İçin Kontrol Merkezi Widget'ları

**CEO Dashboard:**
| Widget | Veri | Tıklama Hedefi | Öncelik |
|--------|------|----------------|---------|
| Şube Sağlık | branch-health API | /subeler | 🔴 |
| Eskalasyon | SLA aşan talepler | /crm?filter=sla-breach | 🔴 |
| Görev Özet | Aktif/geciken/tamamlanan | /gorevler | 🟡 |
| Gelir-Gider | Finansal özet | /finans | 🟡 |
| Personel | Aktif/izin/devamsız | /ik | 🟡 |
| CRM | Açık talep + NPS | /crm | 🟡 |
| Mr. Dobody | Aksiyon + insight | — | 🔴 |

**CGO Dashboard:**
| Widget | Veri | Tıklama | Öncelik |
|--------|------|---------|---------|
| Canlı Arıza | Açık arızalar | /ekipman | 🔴 |
| Şube Sağlık | Teknik sağlık | /subeler | 🔴 |
| Teknik Talepler | CRM teknik dept | /crm?dept=teknik | 🔴 |
| SLA Durum | SLA ihlalleri | /crm?filter=sla | 🔴 |
| Ekipman Yaşam | Bakım planı | /ekipman?tab=bakim | 🟡 |
| Uyum | Checklist uyum | /checklistler | 🟡 |
| Personel | Teknik ekip | /ik | 🟡 |
| Gelir-Gider | Maliyet takip | /finans | 🟡 |
| Mr. Dobody | Teknik insight | — | 🔴 |

**Coach Dashboard:**
| Widget | Veri | Tıklama | Öncelik |
|--------|------|---------|---------|
| Sağlık | Tüm şubeler skor | /subeler | 🔴 |
| Uyum | Checklist + denetim | /checklistler | 🔴 |
| Eskalasyon | Geciken görevler | /gorevler?filter=geciken | 🔴 |
| Arıza | Açık arızalar | /ekipman | 🟡 |
| CRM | Misafir NPS + talep | /crm?channel=misafir | 🟡 |
| Personel | Performans | /ik | 🟡 |
| Denetim Plan | Yaklaşan denetimler | /denetimler | 🟡 |
| Görev Takip | Atanan görevler | /gorevler | 🟡 |
| Mr. Dobody | Şube insight | — | 🔴 |

**Müdür Dashboard:**
| Widget | Veri | Tıklama | Öncelik |
|--------|------|---------|---------|
| Şube Skor | Kendi şube | /sube-ozet | 🔴 |
| Misafir GB | Bekleyen + SLA | /crm?channel=misafir | 🔴 |
| Görevlerim | HQ'dan gelen | /gorevler | 🔴 |
| Personel | Vardiya + devamsızlık | /ik | 🔴 |
| Stok | Kritik stok | /stok | 🟡 |
| Finans | Gelir-gider + fiks | /finans | 🟡 |
| Checklist | Günlük uyum | /checklistler | 🟡 |
| Arıza | Açık arızalar | /ekipman | 🟡 |
| Mr. Dobody | Aksiyon | — | 🔴 |

### 3.2 Widget Tıklanabilirlik Kuralı

**HER widget ve KPI tıklanabilir olmalı:**
- Widget header'da → ikon: navigasyon ok →
- Widget'a tıklama → ilgili sayfaya `navigate()`
- KPI chip'e tıklama → filtrelenmiş liste sayfası
- Listeden item tıklama → detay sayfası

---

## BÖLÜM 4: TEKNİK DÜZELTMELER

### 4.1 Acil Bug Fix'ler

| # | Bug | Dosya | Çözüm |
|---|-----|-------|-------|
| B1 | Görev oluşturma 500 hatası | server/routes/tasks.ts:769 | try-catch + hata detayı logla |
| B2 | Misafir Memnuniyeti redirect döngüsü | App.tsx redirect | CRM channel=misafir doğru çalışıyor mu kontrol |
| B3 | Kontrol merkezi widget tıklanmıyor | *-centrum.tsx | Widget onClick → navigate() ekle |
| B4 | CRM KPI'lar standart değil | crm-mega.tsx | CentrumShell KpiChip kullan |

### 4.2 CRM Yeniden Yapılanma Adımları

```
Aşama 1 — Temizlik (2s):
├── Misafir Memnuniyeti redirect düzelt
├── CRM channel toggle'ı net etiketle
├── Görev 500 hatası düzelt
└── KPI'ları CentrumShell standardına getir

Aşama 2 — Unified Navigation (3s):
├── CRM sidebar: Talepler | Misafir Sesi | Görevler | Cowork | Duyurular
├── Her section kendi KPI strip'i
├── Filtreleme: departman, şube, durum, tarih
└── SLA kuralları entegrasyonu

Aşama 3 — Operasyon Ayrımı (3s):
├── Operasyon modülünden CRM öğelerini çıkar (Mesajlar, Destek, Misafir)
├── Operasyon = Görev Merkezi + Checklist + Denetim + Kayıp Eşya + Canlı Takip
├── Operasyon'a "Görev Şablonları" oluşturma ekle
└── Denetim: HQ'da şablon yönetimi, Coach'ta yürütme, Şube'de görüntüleme

Aşama 4 — Agent Entegrasyonu (2s):
├── Dobody → CRM SLA uyarıları
├── Dobody → Görev otomasyonu
├── Dobody → Misafir şikayet → otomatik görev
└── Dobody → Denetim hatırlatma
```

---

## BÖLÜM 5: SPRİNT ÖNERİSİ

### Mevcut Sprint Planına Ekleme

```
PRE-SPRINT (mevcut — 2s):
├── P1: Kiosk token fix ✅
├── P2: CGO veri bağlantıları
├── P3: Dashboard veri doğrulama
└── P4: Görev 500 bug fix (YENİ)

S3: Fabrika QC + Depo (6s) — DEĞİŞMEDİ

S3.5 (YENİ): CRM Temizlik (3s):
├── Misafir Memnuniyeti redirect fix
├── CRM KPI standardizasyonu
├── Görev oluşturma bug fix
├── Widget tıklanabilirlik (tüm dashboardlar)
└── CRM sidebar reorganizasyonu

S4: Şube Rolleri (10s) — genişletildi:
├── Mevcut: Müdür, Sup, SupBuddy, Personel, Yatırımcı
└── Ek: Her rolde CRM + görev entegrasyonu

S5: Operasyon Yeniden Yapılanma (9s → 12s):
├── 5A: Operasyon modül temizliği (CRM öğeleri çıkar)
├── 5B: Görev Merkezi (unified task system)
├── 5C: Checklist + Denetim ayrımı
├── 5D: Admin Tema Özelleştirme
└── 5E: Quality gate + tasarım tutarlılığı
```

---

## BÖLÜM 6: KARAR GEREKTİREN KONULAR

Aslan'ın onayı gereken kararlar:

1. **CRM adı değişsin mi?** "İletişim & Görev Merkezi" veya "Conversation Hub" mı kalsın?
2. **Operasyondan ne çıkar?** Mesajlar, Destek, Misafir Memnuniyeti → CRM'e taşınsın mı?
3. **Görev sistemi nerede yaşar?** CRM altında mı yoksa Operasyon altında mı?
4. **Denetim ayrımı:** HQ'da şablon + Coach'ta yürütme + Şube'de sadece sonuç?
5. **Pilot scope:** CRM temizliği pilot öncesi mi sonrası mı?
6. **Cowork kanalları:** Departman bazlı mı yoksa şube bazlı mı?

---

*Bu doküman taslaktır. Aslan onayından sonra sprint planına entegre edilecektir.*

---

## BÖLÜM 7: ONAYLANAN KARARLAR (1 Nisan 2026)

### 7.1 Kesinleşen Yapı

```
CRM (adı kalıyor):
├── 1. Görev Atama (anlık — HQ→Şube, acil görev, CRM'in EN ÖNÜ)
├── 2. Destek Talepleri (şube ↔ HQ, departman bazlı, SLA)
├── 3. Misafir Sesi (QR geri bildirim, NPS, şikayet)
├── 4. Cowork (HQ merkezli, şubeden kişi davet edilebilir)
├── 5. Duyurular (tek yön HQ → Tüm)
├── 6. Mesajlar (Operasyon'dan taşındı)
└── Dashboard + Analizler + SLA Kuralları

OPERASYON:
├── 1. Görev Şablonları & Periyodik Görevler
│   ├── Rol bazlı task şablonları (günlük/haftalık/aylık)
│   ├── Açılış checklist, kapanış checklist, temizlik planı
│   ├── Coach/Trainer oluşturur → şubelere atanır
│   └── Tamamlama + fotoğraf + puan → raporlama
├── 2. Checklist Merkezi
│   ├── Şablon yönetimi (HQ)
│   ├── Periyodik atama + takip
│   └── Uyum skoru → şube sağlığına etki
├── 3. Denetim Merkezi
│   ├── HQ: Şablon + kriter + puanlama yönetimi
│   ├── Coach/Trainer: Denetim planlama + yürütme
│   ├── Şube: Kendi denetim sonuçlarını görme
│   └── CAPA (düzeltici eylem takip)
├── 4. Kayıp Eşya
└── 5. Canlı Personel Takip
```

### 7.2 CRM vs Operasyon Görev Ayrımı

| | CRM Görev Atama | Operasyon Görev Şablonları |
|---|---|---|
| **Ne zaman** | Anlık, acil | Planlı, periyodik |
| **Kim oluşturur** | HQ herhangi yetkili | Coach/Trainer/Admin |
| **Kime** | Belirli şube/kişi/rol | Tüm şubeler/roller |
| **Tekrar** | Tek seferlik | Günlük/haftalık/aylık |
| **Örnek** | "Lara kasasını kontrol et" | "Her gün 08:00 açılış checklist" |
| **Takip** | CRM talep gibi (açık/çözülen) | Tamamlanma oranı + skor |
| **Dobody** | SLA eskalasyon | Yapılmadı uyarısı |

### 7.3 Operasyon'dan CRM'e Taşınacaklar

| Öğe | Eski Yer | Yeni Yer |
|-----|----------|----------|
| Mesajlar | Operasyon tab | CRM > Cowork |
| HQ Destek | Operasyon tab | CRM > Destek Talepleri |
| Destek | Operasyon tab | CRM > Destek Talepleri |
| Misafir Memnuniyeti | Operasyon tab (redirect) | CRM > Misafir Sesi |
| Bildirimler | Operasyon tab | Genel (bottom nav) |

### 7.4 Cowork Kuralları
- Varsayılan: HQ kullanıcıları erişir
- Şubeden kişi: kanal sahibi tarafından davet edilir
- Kanal türleri: Departman, Proje, Şube (isteğe bağlı)
- Dosya paylaşımı + mention + görev oluşturma (→ CRM görev)

---

## BÖLÜM 8: FRANCHISE YÖNETİMİ İÇİN OPERASYON DETAYI

### 8.1 Operasyon Modülünde Olması Gerekenler

```
OPERASYON
│
├── 📋 GÖREV ŞABLONLARI & PERİYODİK GÖREVLER
│   ├── Şablon Kütüphanesi (Admin/Coach/Trainer oluşturur)
│   │   ├── Açılış prosedürleri (günlük)
│   │   ├── Kapanış prosedürleri (günlük)
│   │   ├── Temizlik planı (günlük/haftalık)
│   │   ├── Eğitim görevleri (haftalık/aylık)
│   │   ├── Stok sayım (haftalık)
│   │   ├── Ekipman bakım kontrol (haftalık/aylık)
│   │   └── Özel görevler (tek seferlik kampanya vb.)
│   │
│   ├── Atama Kuralları
│   │   ├── Rol bazlı: "Tüm Barista'lara" / "Tüm Supervisor'lara"
│   │   ├── Şube bazlı: "Sadece Lara + Işıklar"
│   │   ├── Zaman bazlı: Günlük 08:00 / Haftalık Pazartesi / Aylık 1.
│   │   └── Koşullu: "Stok <kritik ise" → otomatik sayım görevi
│   │
│   ├── Tamamlama & Kanıt
│   │   ├── Fotoğraf zorunlu/isteğe bağlı
│   │   ├── Alt görevler (sub-tasks) — hepsi tamamlanınca ana görev kapanır
│   │   ├── Onay mekanizması (Supervisor onayı gerekli mi?)
│   │   └── Süre takibi (görev ne kadar sürede tamamlandı)
│   │
│   └── Raporlama (Arka Plan)
│       ├── Tamamlanma oranı → şube sağlık skoruna etki
│       ├── Gecikme oranı → Coach dashboard'da görünür
│       ├── Rol bazlı performans → "Barista Ali %92, Barista Veli %64"
│       ├── Şube karşılaştırma → "Işıklar %88, Lara %52"
│       └── Trend analizi → "Son 4 haftada temizlik uyumu düşüyor"
│
├── ☑️ CHECKLIST MERKEZİ
│   ├── Şablon Türleri
│   │   ├── Vardiya açılış checklist (zorunlu — vardiya başlamadan)
│   │   ├── Vardiya kapanış checklist (zorunlu — çıkışta)
│   │   ├── Mola dönüş checklist (mini — hijyen kontrol)
│   │   ├── Haftalık ekipman kontrol
│   │   ├── Aylık derin temizlik
│   │   └── Özel: Kampanya/etkinlik checklist
│   │
│   ├── Yürütme
│   │   ├── Kiosk'ta göster → personel tamamlar
│   │   ├── Supervisor canlı takip → "3/7 madde tamamlandı"
│   │   ├── Fotoğraf ekleme (isteğe bağlı)
│   │   └── Otomatik süre damgası
│   │
│   └── Raporlama
│       ├── Uyum skoru → şube sağlık bileşeni
│       ├── En çok atlanan maddeler → Coach insight
│       └── Dobody: "Lara 3 gündür kapanış checklist yapmadı"
│
├── 🔍 DENETİM MERKEZİ
│   │
│   ├── Şablon Yönetimi (HQ — Admin/Coach/Trainer)
│   │   ├── Denetim kategorileri (Hijyen, Servis, Ekipman, Eğitim, Genel)
│   │   ├── Kriter tanımlama (madde, ağırlık, puan aralığı)
│   │   ├── Puanlama sistemi (1-5 veya Evet/Hayır/Kısmen)
│   │   ├── Fotoğraf zorunlu alanlar
│   │   └── Versiyon yönetimi (şablon güncelleme geçmişi)
│   │
│   ├── Denetim Planlama & Yürütme (Coach/Trainer)
│   │   ├── Ziyaret planı oluştur (hangi şube, ne zaman)
│   │   ├── Mobil denetim formu (tablet/telefon)
│   │   ├── Madde bazlı puanlama + not + fotoğraf
│   │   ├── Anlık skor hesaplama
│   │   └── Denetim sonucu → şubeye bildirim
│   │
│   ├── CAPA (Düzeltici/Önleyici Eylem)
│   │   ├── Düşük puan → otomatik aksiyon planı oluştur
│   │   ├── Deadline ata (Müdür'e)
│   │   ├── Takip → tamamlanma kontrolü
│   │   └── Dobody: "CAPA deadline 2 gün kaldı — Lara müdürüne hatırlat"
│   │
│   └── Şube Tarafı (Müdür/Supervisor — sadece okuma)
│       ├── Kendi denetim sonuçlarını gör
│       ├── CAPA listesi ve deadline
│       ├── Tarihçe ve trend
│       └── NOT: Şubeler denetim formu düzenleyemez!
│
├── 📦 KAYIP EŞYA (mevcut — değişiklik yok)
│
└── 📍 CANLI PERSONEL TAKİP (mevcut — değişiklik yok)
```

### 8.2 Rol Bazlı Görev Detayları

**CEO/Admin:**
- Görev oluşturmaz (CRM üzerinden acil atama yapabilir)
- Dashboard'dan tüm sistemi izler
- Eskalasyon onayları

**CGO:**
- Teknik görev şablonları oluşturabilir (ekipman bakım, kalibrasyon)
- Teknik denetim kriterleri tanımlar
- Arıza → görev dönüşümünü yönetir

**Coach:**
- Şube bazlı görev şablonları oluşturur
- Denetim planlar ve yürütür
- Checklist şablonları oluşturur
- Görev + denetim + checklist raporlarını takip eder
- CAPA oluşturur ve takip eder
- Şube ziyaret planı yapar

**Trainer:**
- Eğitim görev şablonları oluşturur
- Eğitim denetimi yapar (barista yetkinlik, reçete bilgisi)
- Eğitim checklist'leri oluşturur
- Sertifika/quiz görevleri atar

**Müdür (Yatırımcı):**
- HQ'dan gelen görevleri görür ve tamamlar
- Kendi şubesi için alt görev oluşturabilir
- Checklist'leri personele atar
- Denetim sonuçlarını görür + CAPA tamamlar
- Misafir GB'ye yanıt verir (SLA dahilinde)

**Supervisor:**
- Müdür'den gelen görevleri ekibe dağıtır
- Checklist tamamlama takibi
- Personel performans değerlendirmesi
- Vardiya devir teslim kontrolü

**Barista/Personel:**
- Kiosk'tan günlük görevleri görür
- Checklist tamamlar (açılış/kapanış)
- Görev tamamlama + fotoğraf yükleme
- Performans puanını görür

### 8.3 Arka Plan Raporlama Akışı

```
Görev/Checklist Tamamlandı
        ↓
    Veri kaydı (kim, ne zaman, süre, fotoğraf)
        ↓
    ┌───────────────────────────────────┐
    │ BRANCH HEALTH SCORE ENGINE       │
    │ 5 Boyut:                         │
    │ 1. Operasyonel Uyum (%checklist) │
    │ 2. Görev Tamamlama (%)           │
    │ 3. Denetim Puanı (son 3 ay ort) │
    │ 4. Misafir Memnuniyeti (NPS)     │
    │ 5. Personel Performansı          │
    └───────────┬───────────────────────┘
                ↓
    ┌───────────────────────────────────┐
    │ MR. DOBODY PATTERN ENGINE        │
    │ Tespit:                          │
    │ - "Lara 3 haftadır düşüyor"      │
    │ - "Işıklar hijyen puanı artıyor" │
    │ - "Ali 5 gündür gecikiyor"        │
    └───────────┬───────────────────────┘
                ↓
    ┌───────────────────────────────────┐
    │ DASHBOARD WIDGET'LAR             │
    │ CEO: Genel sağlık haritası       │
    │ Coach: Şube karşılaştırma        │
    │ Müdür: Kendi şube detayı         │
    │ Sup: Ekip performansı            │
    └───────────────────────────────────┘
```

### 8.4 Dobody Agent Görev Otomasyonu

```
OTOMATİK GÖREV OLUŞTURMA:
├── Misafir 1-2 puan verdi → Müdür'e "Misafir şikayeti incele" görevi
├── Checklist 3 gün yapılmadı → Supervisor'a "Checklist uyumu düştü" uyarı
├── Denetim puanı <60 → otomatik CAPA oluştur
├── Ekipman arıza bildirimi → CGO'ya teknik görev
├── Stok kritik seviye → Satınalma'ya sipariş hatırlatma
└── Yeni personel eklendi → otomatik onboarding görev seti

OTOMATİK ESKALASYON:
├── Görev 48s gecikti → Supervisor → Müdür → Coach sırasıyla
├── CRM talep SLA aşıldı → departman → CGO/CEO
├── CAPA deadline aşıldı → Coach → CEO
└── Misafir şikayet 24s yanıtsız → Müdür → Coach

INSIGHT & RAPORLAMA:
├── "Lara'da temizlik puanı son 4 haftada %82→%54 düştü"
├── "Işıklar en iyi görev tamamlama oranı: %94"
├── "Teknik departman ort çözüm süresi 36s — hedef 24s"
└── "Ali Barista — 3 haftadır tüm görevleri zamanında tamamlıyor → rozet öner"
```
