# DOSPRESSO Şube Denetim Sistemi v2 — Tasarım Planı
**Tarih:** 4 Nisan 2026 | **Durum:** Onaylandı
**Önceki:** Basit checkbox tik atma sistemi
**Hedef:** Franchise QMS — SLA bazlı, skor entegreli, tam arşivli

---

## VİZYON
Her şubenin kalitesinin ölçülebilir, izlenebilir ve karşılaştırılabilir
olduğu; denetim sonrası aksiyonların SLA ile takip edildiği; personel
bazlı değerlendirmenin yapıldığı ve TÜM geçmişin arşivlendiği bir
franchise kalite yönetim sistemi.

---

## 1. SORU TİPLERİ (7 tip)

| Tip | DB | UI | Puanlama |
|-----|-----|------|----------|
| Checkbox | checkbox | Tik kutusu | tik=100, boş=0 |
| Evet/Hayır | yesno | İki buton | Evet=100, Hayır=0 |
| Puan (0-100) | rating | Slider/input | Girilen değer |
| Yıldız (1-5) | stars | Yıldız seçimi | x20 (5=100) |
| Çoktan seçmeli | select | Dropdown/radyo | Tanımlı puan |
| Fotoğraf | photo | Kamera/yükleme | Yüklendi=geçti |
| Metin notu | text | Textarea | Puansız |

---

## 2. ŞABLON HİYERARŞİSİ

```
Şablon: "Standart Şube Denetimi v3"
├── Dış Mekan (%10): 5 soru
├── Bina Görünüş (%10): 5 soru
├── Bar Düzeni (%15): 5 soru
├── Depo (%10): 5 soru
├── Ürün Sunumu (%15): 5 soru
├── Personel Davranış (%15): 5 soru
├── Hijyen (%15): 5 soru
└── Genel Değerlendirme (%10): 3 soru
```

Şablon versiyonlama: değiştirilince yeni versiyon, eski denetimler eski versiyonla kalır.

---

## 3. DENETİM AKIŞI

```
Başlat → Şube+Şablon seç → Form doldur → Personel denetle
  → Rapor oluşur → Bildirimler gider → Aksiyonlar yazılır
  → SLA takibi başlar → Çözülünce kapanır → Denetçi onaylar → Arşiv
```

### Bildirim Alıcıları:
- Supervisor + Supervisor Buddy + Şube Yatırımcısı + CGO (özet)

---

## 4. SKOR ETKİ ZİNCİRİ

### Şube Denetim Skoru:
- Supervisor skoru ETKİLER
- Supervisor Buddy skoru ETKİLER
- Müdür skoru ETKİLER
- Barista ve altı ETKİLEMEZ

### Personel Denetim Skoru:
- Dress code + hijyen + müşteri ilgisi + güler yüz
- Herkesin BİREYSEL skoru etkilenir (barista dahil)

### Aksiyon Uyum Skoru:
- Tamamlanan/Toplam oranı
- SLA ihlal oranı
- Supervisor görev tamamlama boyutunu etkiler

---

## 5. GEÇMİŞ VE TREND

- TÜM geçmiş arşivlenir (yıllara göre)
- Şube kartında: grafik + trend oku + açık aksiyonlar
- Karşılaştırma: son 2 denetim, tarih aralığı, yıllık
- Kategori bazlı trend (hangi alan iyileşiyor/kötüleşiyor)
- Şubeler arası benchmarking
- Görüntüleme: CEO/CGO tüm şubeler, Supervisor/Yatırımcı kendi şubesi

---

## 6. DB ŞEMASI (9 tablo)

```
audit_templates_v2: id, name, description, version, parentTemplateId, isActive, isDefault, createdBy
audit_template_categories_v2: id, templateId, name, description, weight, orderIndex
audit_template_questions_v2: id, categoryId, questionText, questionType, options(JSONB), isRequired, weight, orderIndex, helpText
audits_v2: id, templateId, templateVersion, branchId, auditorId, status, scheduledDate, startedAt, completedAt, closedAt, totalScore, personnelScore, actionComplianceScore, notes
audit_category_scores: id, auditId, categoryId, categoryName, weight, score
audit_responses_v2: id, auditId, questionId, categoryId, questionText, questionType, responseValue, score, photoUrl, note
audit_personnel_v2: id, auditId, userId, dressCodeScore, hygieneScore, customerCareScore, friendlinessScore, overallScore, notes, photoUrl
audit_actions_v2: id, auditId, title, description, categoryId, assignedToId, priority, deadline, slaHours, status, resolvedAt, resolvedBy, resolvedNote, resolvedPhotoUrl, verifiedAt, verifiedBy, slaBreached
audit_action_comments: id, actionId, userId, content, attachmentUrl
```

---

## 7. UYGULAMA PLANI

Sprint A (2-3 gün): DB + Şablon Yönetimi UI
Sprint B (2-3 gün): Denetim Formu (7 soru tipi + personel)
Sprint C (1-2 gün): Aksiyon + SLA takibi
Sprint D (1-2 gün): Geçmiş + Trend Raporlama
Sprint E (1 gün): Centrum/Dashboard entegrasyonu
