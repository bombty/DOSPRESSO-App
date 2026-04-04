# DOSPRESSO Mr. Dobody — Yarı Otonom Agent Sistemi (Revize Plan)
**Tarih:** 4 Nisan 2026 | **Durum:** Onaylandı
**Hedef Otonomi:** %35-40 (öğrenme ile 6-12 ayda %50-55)
**Yaklaşım:** İş akışı odaklı, girdi güvenlikli, öğrenen sistem

---

## 1. GÜVENLİK: GİRDİ KONTROLÜ (Çıktı filtresi DEĞİL)

### Temel Kural: Erişemediği Veriyi Sızdıramaz

Dobody her rol için çalışırken SADECE izin verilen tabloları sorgular.
Çıktı filtreleme yerine girdi kısıtlama — %100 güvenli.

### Dobody Scope (Rol Bazlı Veri Erişimi)

```
CEO/CGO Scope:
  OKUR: her şey (özet seviyede)
  OKUMAZ: TCKN, banka bilgisi, kişisel adres

Coach/Trainer Scope:
  OKUR: tüm şube denetim, eğitim, personel performans, checklist
  OKUMAZ: muhasebe, maaş, tedarikçi fiyat, fabrika maliyet

Muhasebe Scope:
  OKUR: bordro, PDKS, maliyet, gelir-gider (HQ+Fabrika+Işıklar)
  OKUMAZ: yatırımcı şube İK detayları, kişisel sağlık verileri

Satınalma Scope:
  OKUR: stok, tedarikçi, sipariş, fabrika üretim planı
  OKUMAZ: personel, maaş, denetim detayları

Supervisor/Müdür Scope:
  OKUR: KENDİ şubesi — vardiya, checklist, stok, denetim sonucu
  OKUMAZ: diğer şubeler, HQ muhasebe, fabrika maliyet, tedarikçi fiyat, maaş

Yatırımcı (Şube) Scope:
  OKUR: KENDİ şubesi — genel performans, denetim sonucu
  OKUMAZ: diğer şubeler, HQ iç verileri, maaş detayları

Barista/Alt Scope:
  OKUR: KENDİ görevleri, vardiya, eğitim, kendi denetim notu
  OKUMAZ: şube skoru detayı, diğer personel, finansal hiçbir veri

Fabrika Scope:
  OKUR: üretim planı, kalite kontrol, stok/LOT, sevkiyat
  OKUMAZ: şube satış, HQ muhasebe, personel maaş
```

### Teknik Uygulama

```
dobody_scopes tablosu:
  role → allowed_tables[] → allowed_columns[] → branch_scope (own/all/none)

Agent her sorgu öncesi:
  1. Kullanıcının rolünü al
  2. dobody_scopes'tan izinli tabloları çek
  3. Sadece izinli tablolardan veri oku
  4. branch_scope=own ise → branchId filtrele
  5. İzinsiz tablo/kolon erişimi → logla + engelle
```

### Şube Çalışanı ASLA Ulaşamaz (Hardcoded)

Fabrika üretim maliyeti, tedarikçi fiyatları, diğer şube verileri,
HQ muhasebe, personel maaşları, franchise sözleşmeleri,
sistem iç raporları — bunlar scope'ta tanımsız = erişim yok.

---

## 2. USABILITY: GÜNDE MAX 3 ÖNERİ

### Bildirim Yorgunluğu Çözümü

```
Öncelik Sistemi:
  ACİL → hemen göster (SLA ihlali, stok bitti, güvenlik)
  ÖNEMLİ → günlük brief'te (denetim hatırlatma, deadline)
  BİLGİ → haftalık özette (trend, karşılaştırma)

Kurallar:
  - Günde max 3 öneri (rol başına)
  - Tek dokunuş: Onayla / Reddet / Ertele
  - Reddetme nedeni kaydedilir → öğrenme
  - Aynı konuda tekrar etme (cooldown süresi)
```

---

## 3. İŞ AKIŞI ODAKLI — 8 TEMEL WORKFLOW

### WF-1: Denetim Döngüsü
```
Tetik: Son denetimden X gün geçti
Analiz: Şube risk skoru + geçmiş trend
Öneri → Coach'a: "X şubesi denetlenmeli, öncelik: yüksek"
Onay → takvime ekle → denetim → aksiyon takibi → kapanış
```

### WF-2: Aksiyon Takibi (SLA)
```
Tetik: Aksiyon deadline yaklaşıyor
Gün-3 → Supervisor'a hatırlatma
Gün-1 → Supervisor + Coach'a acil
Gün+0 → SLA ihlali → CGO'ya escalation
Çözüm → denetçi onayına sun
```

### WF-3: Stok Yönetimi
```
Tetik: Stok minimum eşiğin altında
Analiz: Günlük tüketim → kaç gün kaldı
Öneri → Supervisor'a sipariş (miktar hesaplanmış)
Güven %90+ ise → otomatik sipariş talebi (sadece bildir)
```

### WF-4: Eğitim Lifecycle
```
Tetik: Yeni personel / sertifika bitiyor / denetim düşük
Analiz: Hangi eğitim gerekli (denetim sonuçlarından)
Öneri → Coach'a eğitim ataması
Takip: Tamamlandı mı → skor iyileşti mi
```

### WF-5: Vardiya Optimizasyonu
```
Tetik: Yarınki plan eksik / geçmiş pattern
Analiz: Satış geçmişi + personel müsaitlik
Öneri → Supervisor'a düzenleme önerisi
Onay → personele bildirim
```

### WF-6: Performans Erken Uyarı
```
Tetik: Şube skoru 2 hafta üst üste düştü
Analiz: Hangi kategoriler düşüyor + nedenler
Öneri → farklı kişilere farklı aksiyon:
  Coach: denetim planla
  Supervisor: checklist uyumunu artır
  Trainer: eğitim tamamla
```

### WF-7: Proje Gecikme Yönetimi
```
Tetik: Görev deadline geçti / proje zamanın %80'inde ama %60 ilerleme
Analiz: Kritik yoldaki engeller
Öneri → Proje yöneticisine risk raporu + çözüm
```

### WF-8: Haftalık Brief
```
Tetik: Her Pazartesi 08:00
CEO → portfolio + şube haritası + kritik konular (3 madde)
Coach → denetim durumu + en riskli 3 şube
Supervisor → kendi şubesinin haftalık performansı
```

---

## 4. ÖĞRENME MEKANİZMASI

```
Her öneri sonucu kaydedilir:
  Onaylandı → bu pattern doğru
  Reddedildi (gereksiz) → tetik eşiğini yükselt
  Reddedildi (zamanlama) → farklı zaman dene
  Ertele → önceliği düşür
  Onaylandı + sonuç olumlu → güveni artır

Güven Skoru (workflow bazlı):
  %90+ kabul → rutin ise otomatik uygula, sadece bildir
  %70-90 kabul → öneri + onay iste
  <%70 kabul → sadece bilgilendir, aksiyon önerme
```

---

## 5. DB ŞEMASI

```
dobody_scopes:
  id, role, allowed_tables(TEXT[]), allowed_columns(JSONB),
  branch_scope(own/all/none), blocked_keywords(TEXT[])

dobody_proposals:
  id, workflow_type(WF-1..WF-8), role_target, user_id, branch_id,
  proposal_type(info/action/warning),
  title, description, priority(acil/onemli/bilgi),
  source_module, related_entity_type, related_entity_id,
  suggested_action_type, suggested_action_data(JSONB),
  status(pending/approved/rejected/expired/auto_applied),
  expires_at, approved_by, approved_at,
  rejected_reason, created_at

dobody_events:
  id, event_type, source_module,
  entity_type, entity_id, event_data(JSONB),
  proposals_generated, processed_at

dobody_learning:
  id, workflow_type, proposal_id,
  outcome(approved/rejected/expired),
  rejection_reason, result_positive(BOOLEAN),
  confidence_delta(NUMERIC), created_at

dobody_workflow_confidence:
  id, workflow_type, role,
  confidence_score(0-100), total_proposals, approved_count,
  auto_apply_enabled(BOOLEAN), updated_at
```

---

## 6. OTONOMİ SEVİYELERİ

```
Seviye 1 — Bilgilendir (şu an): %10
  "Lara skoru düştü" bildirimi

Seviye 2 — Öner (Sprint Dobody-1,2 sonrası): %25-30
  "Lara'ya hijyen eğitimi öneriyorum" + [Onayla]

Seviye 3 — Onaylı Aksiyon (Sprint Dobody-3,4 sonrası): %35-40
  "Eğitim planladım, Coach onaylasın mı?" → onay → otomatik atama

Seviye 3.5 — Güvenilir Rutin (6-12 ay kullanım sonrası): %50-55
  Güven %90+ olan workflow'larda otomatik aksiyon + bildir

Seviye 4 — Yarı Otonom (12-24 ay): %60-65
  Rutin kararlar otomatik, sadece istisnalar insana
```

---

## 7. UYGULAMA PLANI

### Önce: Denetim Sprint D — Trend Raporlama (1 gün)

### Sprint Dobody-1 (2-3 gün): Proposal Altyapısı
- [ ] 5 yeni tablo (scopes, proposals, events, learning, confidence)
- [ ] Scope seed data (tüm roller)
- [ ] Proposal CRUD API
- [ ] Centrum'da Dobody Proposal widget (Onayla/Reddet/Ertele)
- [ ] Her rolün dashboard'unda öneri kartı

### Sprint Dobody-2 (2-3 gün): 8 Workflow Bağlantısı
- [ ] WF-1: Denetim döngüsü (son denetim tarihi kontrol)
- [ ] WF-2: Aksiyon SLA takibi (hatırlatma + escalation)
- [ ] WF-3: Stok yönetimi (kritik seviye tespiti)
- [ ] WF-4: Eğitim lifecycle (sertifika takibi)
- [ ] WF-5: Vardiya optimizasyonu
- [ ] WF-6: Performans erken uyarı
- [ ] WF-7: Proje gecikme
- [ ] WF-8: Haftalık brief

### Sprint Dobody-3 (2 gün): Öğrenme + Brief
- [ ] Öğrenme mekanizması (onay/ret → güven skoru)
- [ ] Güven eşiklerine göre otomatik aksiyon
- [ ] Haftalık brief generator (rol bazlı)
- [ ] Cooldown sistemi (tekrar etmeme)

### Sprint Dobody-4 (1 gün): Güvenlik Audit
- [ ] Tüm scope'lar test (barista → muhasebe erişim denemesi)
- [ ] Cross-branch izolasyon testi
- [ ] Dobody çıktısında veri sızıntısı kontrolü
- [ ] Penetrasyon test raporu
