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
