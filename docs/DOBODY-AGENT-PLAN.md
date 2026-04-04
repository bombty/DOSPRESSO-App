# DOSPRESSO Mr. Dobody — Yarı Otonom Agent Sistemi Planı
**Tarih:** 4 Nisan 2026 | **Durum:** Tasarım aşaması
**Vizyon:** Tüm modülleri izleyen, bağlantıları kuran, öneri üreten, kullanıcı onayıyla aksiyon alan yarı-otonom operasyon ortağı.

---

## 1. VERİ GÜVENLİĞİ — KİM NE GÖRÜR?

### Temel Kural: Dobody Her Şeyi Okur, Ama Rol Sınırına Göre Konuşur

```
Dobody İÇ analiz: tüm veriye erişir (fiyatlar, maliyetler, maaşlar dahil)
Dobody ÇIKTI: sadece kullanıcının rolüne uygun bilgiyi sunar
```

### Veri Sınıflandırması (4 Seviye)

| Seviye | Açıklama | Örnekler | Kimler görür |
|--------|----------|----------|--------------|
| AÇIK | Genel operasyon bilgisi | Şube adları, vardiya saatleri, genel duyurular | Herkes |
| DAHİLİ | Performans verileri | Şube skoru, denetim sonucu, görev durumu | HQ + ilgili şube yöneticisi |
| GİZLİ | Finansal/ticari veriler | Maaşlar, maliyetler, kar marjı, tedarikçi fiyatları, fabrika fiyatları | Sadece CEO/CGO/Muhasebe/Admin |
| KISITLI | Kişisel veriler | TCKN, adres, banka bilgisi, sağlık | Sadece İK + kişinin kendisi |

### Dobody Çıktı Filtresi — Her Mesajda Uygulanır

```
Dobody analiz yapar:
  "Lara şubesi süt maliyeti ₺45/L, rakip ₺38/L, kar marjı %12"

Supervisor'a gösterir:
  "Lara şubesi süt tüketimi ortalamanın %20 üstünde — israfı kontrol edin"
  (Fiyat YOK, maliyet YOK, marj YOK)

Muhasebe'ye gösterir:
  "Lara süt maliyeti bütçenin %15 üstünde — tedarikçi fiyat karşılaştırması hazır"
  (Fiyat VAR, maliyet VAR)

CEO'ya gösterir:
  "Süt maliyeti 3 şubede bütçeyi aşıyor — toplam etki: ₺12,000/ay"
  (Tam detay VAR)
```

### Şube Çalışanı ASLA Göremez (Hardcoded Kurallar)

| Veri | Neden yasak | Teknik engel |
|------|-------------|--------------|
| Fabrika üretim maliyeti | Ticari sır | API'de rol kontrolü + Dobody output filter |
| Tedarikçi fiyatları | Ticari sır | API endpoint'i HQ-only |
| Diğer şubelerin satış verisi | Rekabet | branchId scope filter |
| HQ muhasebe verileri | Yetki dışı | Manifest permission check |
| Personel maaş bilgileri | Gizlilik | İK scope filter |
| Başka şubenin personel bilgisi | Gizlilik | branchId isolation |
| Franchise sözleşme detayları | Ticari sır | Sadece CEO/CGO/Admin |
| Sistem iç raporları | Yönetim | isHQRole check |

### Teknik Uygulama: 3 Katmanlı Güvenlik

```
Katman 1 — API Seviyesi (zaten var):
  isAuthenticated → role check → branchId scope
  Şube çalışanı /api/muhasebe çağırsa 403 alır

Katman 2 — Dobody Output Filter (YENİ):
  agent_output_rules tablosu:
    role: "barista"
    blocked_topics: ["maliyet", "fiyat", "maaş", "kar", "tedarikçi", "muhasebe"]
    blocked_data_classes: ["GİZLİ", "KISITLI"]
  
  Dobody her mesaj ürettiğinde:
    1. Mesaj içeriğini tara
    2. Alıcının rolünü kontrol et
    3. Yasaklı konu/veri sınıfı varsa → filtrele veya gizle

Katman 3 — Proposal Güvenliği (YENİ):
  Dobody bir öneri oluşturduğunda:
    - Önerinin veri sınıfını belirle
    - Alıcının bu sınıfa erişimi var mı kontrol et
    - Yoksa → öneriyi gösterme veya sınıflandırılmış versiyonunu göster
```

---

## 2. ROL BAZLI DOBODY KABİLİYETLERİ

### CEO / CGO
```
İzleme:
  ✓ Tüm şubelerin performans özeti
  ✓ Proje portfolio durumu (traffic light)
  ✓ Finansal özet (gelir/gider/kar)
  ✓ Denetim trendleri (tüm şubeler)
  ✓ Personel genel memnuniyet/turnover

Öneriler:
  → "3 şube skor düşüşünde — acil denetim planı önereyim mi?"
  → "Q2 bütçe sapması %8 — detay rapor hazırlasın mı?"
  → "En iyi 3 şubenin ortak özelliği: düzenli eğitim + düşük turnover"
  → Haftalık özet brief (her Pazartesi)

Aksiyonlar (onaylı):
  → Denetim planı oluştur
  → Tüm şubelere duyuru gönder
  → Bölge toplantısı planla
```

### Coach / Trainer
```
İzleme:
  ✓ Tüm şubelerin denetim durumu
  ✓ Eğitim tamamlanma oranları
  ✓ Personel gelişim skorları
  ✓ Şube sağlık haritası
  ✗ Finansal detaylar (maliyet, fiyat, maaş)

Öneriler:
  → "Lara 45 gündür denetlenmedi + hijyen trend düşük — öncelikli"
  → "5 personelin sertifikası bitiyor — yenileme eğitimi atayım mı?"
  → "Yeni barista Ahmet'in ilk 30 gün performansı düşük — mentorluk öner"
  → "Cross-branch: Konyaaltı'nın bar düzeni puanı en yüksek — pratiğini paylaş"

Aksiyonlar (onaylı):
  → Eğitim ata
  → Denetim planla
  → Best practice paylaş
```

### Muhasebe / İK
```
İzleme:
  ✓ Bordro veri tamamlanma durumu (HQ + Fabrika + Işıklar)
  ✓ PDKS eksikleri
  ✓ İzin/fazla mesai anomalileri
  ✓ Maliyet analizi
  ✗ Yatırımcı şube İK detayları (kendi yönetirler)

Öneriler:
  → "3 şubenin PDKS verileri eksik — bordro hesaplanamaz"
  → "Bu ay fazla mesai bütçeyi %15 aştı — detay?"
  → "5 kişinin izin bakiyesi 20 günü aştı — planlama önerisi"

Aksiyonlar (onaylı):
  → PDKS hatırlatma gönder
  → Bordro taslağı oluştur
```

### Satınalma
```
İzleme:
  ✓ Stok seviyeleri (tüm şubeler)
  ✓ Tedarikçi fiyat karşılaştırma
  ✓ Sipariş geçmişi
  ✗ Personel verileri

Öneriler:
  → "5 şubede süt stoku kritik — toplu sipariş oluşturayım mı?"
  → "Tedarikçi A'nın fiyatı %8 arttı — alternatif: Tedarikçi B"
  → "Fabrika üretim planıyla şube stok tahmini uyuşmuyor"

Aksiyonlar (onaylı):
  → Sipariş talebi oluştur
  → Tedarikçi karşılaştırma raporu
```

### Supervisor / Müdür (Şube)
```
İzleme:
  ✓ KENDİ şubesinin performansı
  ✓ Kendi personelinin durumu
  ✓ Kendi şubesinin stok durumu
  ✓ Kendi şubesinin denetim sonuçları
  ✗ Diğer şubeler (hiçbir veri)
  ✗ HQ muhasebe/finans
  ✗ Fabrika maliyetleri

Öneriler:
  → "Yarınki vardiyada 1 kişi eksik — Ayşe müsait, çağırmak ister misin?"
  → "Denetim aksiyon deadline'ı yarın — henüz çözülmedi"
  → "Kahve çekirdeği stoku 3 günlük — sipariş talebi oluşturayım mı?"
  → "Bu hafta en çok müşteri şikayeti: bekleme süresi"

Aksiyonlar (onaylı):
  → Vardiya değişikliği öner
  → Stok talebi oluştur
  → Personele görev ata
```

### Yatırımcı (Şube)
```
İzleme:
  ✓ Kendi şubesinin genel performansı
  ✓ Denetim sonuçları
  ✓ Personel özet durumu (detaysız)
  ✗ Maaş detayları (kendi İK'sı yönetir ama Dobody göstermez)
  ✗ Diğer şubeler
  ✗ HQ iç verileri

Öneriler:
  → "Şubenizin bu ayki skoru: 78 (geçen ay: 82) — düşüş nedeni: hijyen"
  → "2 açık denetim aksiyonu var — deadline yaklaşıyor"
```

### Barista / Bar Buddy / Stajyer
```
İzleme:
  ✓ Kendi görevleri
  ✓ Kendi eğitim durumu
  ✓ Kendi vardiya planı
  ✓ Bugünkü checklist
  ✗ Şube skoru detayı
  ✗ Diğer personelin verileri
  ✗ Finansal hiçbir veri
  ✗ Denetim sonuçları (sadece kendi personel denetim notu)

Öneriler:
  → "Bugünkü görevlerin: açılış checklistesi + kahve eğitimi modülü"
  → "Vardiya değişikliği: yarın 08:00 → 10:00 — onaylıyor musun?"
  → "Eğitim sertifikan 5 güne bitiyor — yenileme modülünü tamamla"
```

### Fabrika Rolleri
```
İzleme:
  ✓ Üretim planı ve durumu
  ✓ Kalite kontrol sonuçları
  ✓ Stok/LOT durumu
  ✓ Sevkiyat takibi
  ✗ Şube satış verileri
  ✗ HQ muhasebe
  ✗ Personel maaşları

Öneriler:
  → "Bugünkü üretim planı: 50kg espresso blend + 30kg filtre"
  → "LOT #234 son kullanma tarihi yaklaşıyor — öncelikli sevk et"
  → "Kalite kontrolde 2 parti red — tekrar üretim planla"
```

---

## 3. CROSS-MODULE BAĞLANTILAR

Dobody'nin asıl gücü modüller arası bağlantı kurmak:

```
Denetim ↔ Eğitim:
  Düşük skor → ilgili eğitim modülü öner

Denetim ↔ Personel:
  Personel denetim düşük → bireysel gelişim planı

Vardiya ↔ Denetim:
  Vardiya eksik günlerde denetim skoru düşük mü? → korelasyon

Stok ↔ Satınalma:
  Stok kritik → otomatik sipariş önerisi

PDKS ↔ Bordro:
  Eksik giriş → bordro uyarısı

Eğitim ↔ Performans:
  Eğitim tamamlama → skor iyileşmesi takibi

Checklist ↔ Denetim:
  Günlük checklist puanı düşük → denetim önceliği artır

Proje ↔ Takvim:
  Proje deadline → takvim entegrasyonu
```

---

## 4. TEKNİK MİMARİ

### Yeni DB Tabloları

```sql
-- Dobody Önerileri (Proposal)
dobody_proposals (
  id, role_target, user_id, branch_id,
  proposal_type (info/action/warning/question),
  title, description,
  data_class (AÇIK/DAHİLİ/GİZLİ/KISITLI),
  source_module (denetim/vardiya/stok/eğitim/proje/pdks),
  related_entity_type, related_entity_id,
  suggested_action_type (create_task/send_notification/create_order/assign_training),
  suggested_action_data (JSONB),
  status (pending/approved/rejected/expired/auto_applied),
  priority (low/medium/high/urgent),
  expires_at,
  approved_by, approved_at,
  rejected_reason,
  created_at
)

-- Dobody Çıktı Güvenlik Kuralları
dobody_output_rules (
  id, role,
  blocked_topics (TEXT[]), -- ["maliyet","fiyat","maaş","kar"]
  blocked_data_classes (TEXT[]), -- ["GİZLİ","KISITLI"]
  allowed_modules (TEXT[]), -- ["denetim","vardiya","görev"]
  max_detail_level (summary/detail/full),
  created_at
)

-- Dobody Event Log (ne zaman ne tetikledi)
dobody_events (
  id, event_type, source_module,
  entity_type, entity_id,
  event_data (JSONB),
  proposals_generated (INTEGER),
  processed_at
)
```

### Event Akışı

```
Olay oluşur (denetim tamamlandı, görev gecikti, stok düştü)
  ↓
Event Bus → dobody_events tablosuna kaydet
  ↓
Agent Skill tetiklenir → veriyi analiz et
  ↓
Proposal oluştur → data_class belirle
  ↓
Alıcının rolünü kontrol et → output_rules filtrele
  ↓
Uygunsa → dobody_proposals'a kaydet → kullanıcıya göster
Uygun değilse → logla ama gösterme
```

---

## 5. UYGULAMA PLANI

### Sprint Dobody-1 (2-3 gün): Proposal Sistemi Altyapısı
- [ ] 3 yeni tablo (proposals, output_rules, events)
- [ ] Proposal CRUD API
- [ ] Centrum'da Dobody Proposal widget
- [ ] Onay/ret UI (her rolün dashboard'unda)
- [ ] Output rules seed data (tüm roller)

### Sprint Dobody-2 (2-3 gün): Denetim + Proje Event Bağlantısı
- [ ] Denetim tamamlandığında → event → skor analiz → proposal
- [ ] Aksiyon SLA yaklaşınca → event → hatırlatma proposal
- [ ] Proje görev gecikme → event → uyarı proposal
- [ ] Proje tamamlanma → event → özet proposal

### Sprint Dobody-3 (2-3 gün): Vardiya + Stok + Eğitim
- [ ] Vardiya eksikliği → event → öneri proposal
- [ ] Stok kritik → event → sipariş önerisi proposal
- [ ] Eğitim süresi dolma → event → yenileme proposal
- [ ] PDKS eksikliği → event → muhasebe uyarı

### Sprint Dobody-4 (1-2 gün): Cross-Module Analiz
- [ ] Haftalık özet brief (CEO/Coach)
- [ ] Şube karşılaştırma önerileri
- [ ] Pattern detection (tekrarlayan sorunlar)
- [ ] Korelasyon analizi (denetim ↔ eğitim ↔ performans)

### Sprint Dobody-5 (1 gün): Güvenlik Audit
- [ ] Tüm output_rules test et
- [ ] Şube çalışanı perspektifinden penetrasyon testi
- [ ] Veri sızıntısı kontrolü
- [ ] Log analizi
