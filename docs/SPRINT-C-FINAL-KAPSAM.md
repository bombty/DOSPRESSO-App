# Sprint C — 3 Paralel İş (FINAL KAPSAM)

**Tarih:** 18 Nisan 2026 (Cumartesi öğleden sonra — Replit DB doğrulaması sonrası)
**Replit raporu:** Sprint B+C Birleşik DB Doğrulama Raporu
**Durum:** Kapsam netleşti, Sprint B bittikten sonra başlayacak

---

## 🔄 Önceki Plan vs Yeni Plan

### ❌ Önceki Hedef (RESMİ OLARAK YANLIŞ)
> "Akademi v1/v2/v3 → v3 konsolide et, CRM tablolarını düzgün oluştur"

### ✅ Yeni Hedef (Replit DB Doğrulaması Sonrası)
> "3 Paralel Aktivasyon + Migration İşi: Gate aktivasyonu + Audit v1→v2 content migration + CRM Birleşik Dashboard"

**Sebep:** 
- DB doğrulaması Akademi **konsolidasyonu gerekmediğini** gösterdi (tek sistem, 51 modül, aktif)
- Ama 3 farklı sorun tespit etti — hepsi **aktivasyon/migration** işi, konsolidasyon değil

---

## 🎯 Sprint C — 3 Paralel İş

### C.1: Gate Sınavı Aktivasyonu (1-2 gün)

**Sorun:** Aslan'ın hibrit terfi modeli için Gate sistemi kodda hazır ama kullanılmıyor:

```
career_gates:         5 tanımlı gate (Gate-0, Gate-1, Gate-2, Gate-3, ...)
gate_attempts:        0 deneme 🔴
exam_requests:        0 talep 🔴
user_career_progress: 8 kayıt (kariyer ilerleyişi takipte!)
```

**İş akışı:**
- 8 kullanıcı kariyerlerini takip ediyor ama hiçbiri sınava giremedi
- Muhtemelen "Sınav Talep Et" butonu UI'da gizli veya menüde yok

**Yapılacaklar:**
1. UI kontrolü — `client/src/pages/akademi/` altında gate/exam sayfası var mı?
2. Exam request akışı frontend'te bağlı mı? (v2 academy route'ları kodda var, UI eksik olabilir)
3. Gate detay sayfasında "Sınav talep et" butonu aktif mi?
4. 1 test kullanıcısı ile sınav akışı end-to-end test et:
   - User → "Gate-0'a başvur" butonuna tıkla
   - `exam_requests` tablosuna kayıt oluştur
   - Supervisor onayı
   - `gate_attempts` tablosuna sınav başlatma kaydı
   - Quiz tamamla
   - Sonuç + terfi

**Acceptance:**
- ✅ 1 test kullanıcısı için end-to-end Gate-0 sınavı tamamlandı
- ✅ `exam_requests` > 0 kayıt
- ✅ `gate_attempts` > 0 kayıt
- ✅ Hibrit terfi modeli (skor + sınav + yönetici önerisi) aktif

### C.2: Audit v1 → v2 Content Migration (2 gün)

**Sorun:** İki audit sistemi paralel kullanılıyor:

```
v1 tarafı (İÇERİK DOLU):
  audit_templates:       10 template
  audit_template_items:  203 item
  audit_instances:       6 denetim
  audit_logs:            3,476 log

v2 tarafı (İÇERİK BOŞ, AKTİVİTE DOLU):
  audit_templates_v2:        1 template
  audit_template_categories_v2: 2 kategori
  audit_template_questions_v2:  7 soru
  audits_v2:                 7 denetim
  audit_responses_v2:        17 yanıt
  audit_actions_v2:          2 aksiyon
  audit_personnel_v2:        4 personel
```

Yani **hem v1 hem v2 kullanılıyor.** İçerik (10 template × 203 item) v1'de, aktivite v2'de. Tek sistem yapmak için **content migration** lazım.

**Yapılacaklar:**
1. Migration script yaz: `server/scripts/migrate-audit-v1-to-v2.ts`
   - 10 v1 template → 10 v2 template (kategori yapısına dönüştür)
   - 203 v1 item → v2 question (kategori × sırası korunarak)
   - FK ilişkilerini yeni ID'lerle güncelle
2. Migration'ı dry-run modda çalıştır, sonuçları raporla
3. Aslan onayı ile gerçek migration
4. v1 tabloları için "deprecated" notu ekle (archived, is_legacy=true)

**Acceptance:**
- ✅ v2'de 10 template + 203 soru var
- ✅ v1 template'leri arşivlendi (silinmedi, audit trail)
- ✅ Mevcut 7 v2 denetimi hala çalışıyor
- ✅ Coach yeni denetim oluşturursa v2 template'lerden seçebiliyor

### C.3: CRM Birleşik Dashboard (1 gün)

**Sorun:** CRM tablosu yok (crm_* prefix'li) ama **müşteri ilişkileri fiilen var**:

```
customer_feedback:   461 kayıt ✅ AKTİF
support_tickets:      66 kayıt ✅ AKTİF
guest_complaints:      0 kayıt
product_complaints:    0 kayıt
```

461 müşteri feedback'i toplanmış ama bir arada görüntülenmiyor. Dashboard eksik.

**Yapılacaklar:**
1. `/crm` sayfasında 3-tab widget:
   - **Tab 1: QR Müşteri Feedback** (461) — şubelere göre, rating dağılımı
   - **Tab 2: Support Ticketları** (66) — departman, durum, SLA
   - **Tab 3: Müşteri Şikayet** (guest_complaints + product_complaints)
2. Top-level metrikler:
   - Ortalama rating
   - Bugünkü yeni feedback sayısı
   - Açık ticket sayısı + SLA uyarıları
3. Filtre: tarih, şube, kategori

**Acceptance:**
- ✅ `/crm` sayfası 461 feedback'i gösteriyor
- ✅ 66 support ticket aynı yerde
- ✅ Metrikler canlı
- ✅ Yeni `crm_*` tablo oluşturulmadı (gereksiz)

---

## 📋 Sprint C Süresi

| Alt Sprint | Süre | Paralel mi? |
|:--:|:--:|:--:|
| C.1 Gate Aktivasyon | 1-2 gün | Evet (UI işi) |
| C.2 Audit Migration | 2 gün | Evet (script işi) |
| C.3 CRM Dashboard | 1 gün | Evet (UI işi) |
| **Toplam** | **4-5 gün** | Paralel çalışmayla 3 gün mümkün |

---

## 🚧 Bağımlılıklar

- **Sprint B → Sprint C:** Bağımsız, paralel gidebilir (Sprint B attendance pipeline, Sprint C farklı modüller)
- **Sprint C → Sprint D:** Bağımsız
- **Sprint C.2 (Audit Migration) → Pilot:** İçerik migration öncesi Coach/Trainer'a bildirim + eğitim gerekli

---

## 💡 Öğrenilen

**Sprint C'nin orijinal planı tamamen yanlıştı.** "Akademi v1/v2/v3 paralel" iddiası DB'de kanıtlanmadı — tek sistem çalışıyor. Ama Gate sistemi dormant, Audit içerik migration'a ihtiyaç duyuyor, CRM ise dashboard eksik.

Bu sprint "konsolidasyon değil, **aktivasyon + migration**" sprinti.

**Sprint A'daki ders tekrar işe yaradı:** DB kontrol ≠ kod kontrol. İkisi birleşince gerçek iş ortaya çıkar.

---

## 📦 Sprint C Commit Stratejisi

Her alt-sprint ayrı commit:
- `feat(gate): Sprint C.1 — Gate sınav aktivasyonu (UI + end-to-end test)`
- `chore(migration): Sprint C.2 — Audit v1→v2 content migration (203 item)`
- `feat(crm): Sprint C.3 — CRM birleşik dashboard (feedback + ticket)`

Her commit öncesi Quality Gate kontrol.
