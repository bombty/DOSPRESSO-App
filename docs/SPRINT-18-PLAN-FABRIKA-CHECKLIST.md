# 🏭 Sprint 18 Plan: Fabrika Açılış/Kapanış Checklist Sistemi

> **Aslan 11 May 2026 talebi:** Eren (fabrika müdürü) kiosk üzerinden günlük açılış/kapanış kontrol listesini doldursun. Admin tarafından dinamik olarak yönetilebilsin. Kapanış 18:00 öncesi aktif olmasın.

**Sprint:** 18
**Tahmini başlangıç:** 20 May 2026 (pilot stabil sonrası)
**Tahmini süre:** 8-12 saat aktif kod (3 alt sprint)
**Etkilenecek tablolar:** 3 yeni tablo
**Etkilenecek dosyalar:** 5-7 yeni dosya
**Etkilenecek personel:** Eren (fabrika müdürü), Aslan (admin yönetim)

---

## 🎯 Hedef

Eren'in her sabah açılış kontrolünü yapması, her akşam kapanış kontrolünü yapması, **tüm verilerin sistemde kayıt altında olması**. Eksik kalan maddeler için yöneticiye otomatik bildirim. Yıl sonu denetim için PDF rapor.

---

## 📊 Sprint 18 Alt Sprintleri

### Sprint 18.1 — DB Schema + Backend (3-4 saat)
- 3 yeni Drizzle tablosu
- 6 yeni endpoint
- Migration script
- Seed data (Aslan'ın listesindeki 25+ madde)

### Sprint 18.2 — Admin Yönetim Sayfası (2-3 saat)
- /fabrika/checklist-yonetim sayfası
- CRUD: checklist item ekle/düzenle/sil
- Sıralama drag-drop
- "Aktif" toggle (sabah açılış / akşam kapanış)
- Kategori (Açılış / Kapanış / İkisi de)

### Sprint 18.3 — Kiosk Eren Sayfası (3-4 saat)
- /fabrika/kiosk-checklist sayfası
- Saat kontrolü: 18:00+ kapanış aktif (öncesi sadece açılış)
- Madde madde kontrol: checkbox + opsiyonel not + opsiyonel foto
- Soğuk hava deposu derece input (number)
- Personel dropdown (geç kalan/habersiz seçim)
- Submit sonrası özet sayfa + onay
- Eksik madde uyarısı + müdüre bildirim

### Sprint 18.4 — Raporlama (1-2 saat) — opsiyonel post-Sprint 18
- Mahmut /muhasebe-fabrika-rapor sayfasında günlük checklist görünümü
- Aylık tamamlanma oranı
- PDF export (Sprint 17'deki PDF utility yeniden kullanılır)

---

## 🗄️ DB Schema (Sprint 18.1)

### Tablo 1: `factory_checklists`

Üst seviye checklist tanımı (Aslan veya admin oluşturur).

```sql
CREATE TABLE factory_checklists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,                 -- "Sabah Açılış" / "Akşam Kapanış"
  type VARCHAR(20) NOT NULL,                  -- 'open' (açılış) | 'close' (kapanış)
  active_after_time VARCHAR(5),               -- '18:00' (sadece kapanış için, null=her zaman)
  active_before_time VARCHAR(5),              -- '10:00' (sadece açılış için)
  is_active BOOLEAN DEFAULT TRUE,
  required_role VARCHAR(50) DEFAULT 'fabrika_mudur',  -- Hangi roller doldurabilir
  notify_on_incomplete BOOLEAN DEFAULT TRUE,  -- Eksik kalırsa bildirim gönder
  notify_targets JSONB,                       -- ['admin', 'ceo'] gibi rol listesi
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);
```

### Tablo 2: `factory_checklist_items`

Her checklist'in maddeleri. Aslan'ın listesindeki 25+ madde buraya seed edilir.

```sql
CREATE TABLE factory_checklist_items (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES factory_checklists(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(50),                       -- 'Makinalar' / 'Soğuk Hava' / 'Personel' / 'Güvenlik'
  title TEXT NOT NULL,                        -- "Soğuk hava deposu -19°C mü?"
  description TEXT,                           -- Ek açıklama / talimat
  item_type VARCHAR(30) NOT NULL,             -- 'checkbox' | 'number' | 'personnel_select' | 'text' | 'photo'
  is_required BOOLEAN DEFAULT TRUE,
  min_value DECIMAL(10,2),                    -- Sayısal madde için min eşik (örn -19 derece için -25)
  max_value DECIMAL(10,2),                    -- Sayısal madde için max eşik (örn -19 derece için -15)
  critical_threshold DECIMAL(10,2),           -- Aşılırsa alarm (örn -16 dereceden sıcak ise)
  photo_required BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Tablo 3: `factory_checklist_submissions`

Eren'in her gün doldurduğu kayıtlar.

```sql
CREATE TABLE factory_checklist_submissions (
  id SERIAL PRIMARY KEY,
  checklist_id INTEGER REFERENCES factory_checklists(id),
  submitted_by_id VARCHAR(255) REFERENCES users(id),
  submission_date DATE NOT NULL,
  submission_time TIMESTAMP DEFAULT NOW(),
  type VARCHAR(20) NOT NULL,                  -- 'open' | 'close'
  status VARCHAR(20) NOT NULL DEFAULT 'in_progress',  -- 'in_progress' | 'completed' | 'incomplete'
  total_items INTEGER NOT NULL,
  completed_items INTEGER NOT NULL DEFAULT 0,
  critical_violations INTEGER DEFAULT 0,      -- Kritik eşik aşımı sayısı
  notes TEXT,
  items JSONB NOT NULL,                       -- [{itemId, value, photo, note, isCritical}]
  notified_at TIMESTAMP,                      -- Eksik kalmışsa bildirim gönderildi mi
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(submission_date, type, checklist_id) -- Bir gün, bir tip, bir checklist sadece bir kayıt
);
```

---

## 📋 Seed Data — Aslan'ın 25+ Maddesi

### Sabah Açılış Checklist (type='open')

| Sıra | Kategori | Madde | Tip |
|---|---|---|---|
| 1 | Personel | Habersiz işe gelmeyen var mı? | personnel_select (multi) |
| 2 | Personel | Geç kalan personel var mı? | personnel_select (multi) |
| 3 | Makinalar | Klimalar çalışıyor mu? | checkbox |
| 4 | Makinalar | Donut makinası açıldı, sorunsuz mu? | checkbox + photo |
| 5 | Makinalar | Hamur hattı çalışıyor mu? | checkbox |
| 6 | Makinalar | Fırın çalışıyor mu? | checkbox |
| 7 | Makinalar | Ocak çalışıyor mu? | checkbox |
| 8 | Makinalar | Kahve kavurma makinası çalışıyor mu? | checkbox |
| 9 | Soğuk Hava | Soğuk Hava Deposu #1 derece (kritik -19) | number, min=-25, max=-15, critical=-16 |
| 10 | Soğuk Hava | Soğuk Hava Deposu #2 derece | number, min=-25, max=-15, critical=-16 |
| 11 | Soğuk Hava | Soğuk Hava Deposu #3 derece | number, min=-25, max=-15, critical=-16 |
| 12 | Üretim | Giriş katı buzdolapları çalışıyor mu? | checkbox |
| 13 | Üretim | +4 dolabı çalışıyor ve kapısı kapalı mı? | checkbox |
| 14 | Temizlik | Önceki günden temizlik uygunsuzluğu var mı? | text (opsiyonel) |
| 15 | Üst Kat | Şurup makinası çalışıyor mu? | checkbox |
| 16 | Güvenlik | Su filtre sistemi çalışıyor mu? | checkbox |
| 17 | Güvenlik | Kompresor çalışıyor mu? | checkbox |
| 18 | Güvenlik | Haşare/fare korucu sistem çalışıyor mu? | checkbox |

### Akşam Kapanış Checklist (type='close', active_after_time='18:00')

| Sıra | Kategori | Madde | Tip |
|---|---|---|---|
| 1 | Makinalar | Donut makinası kapalı mı? | checkbox |
| 2 | Makinalar | Hamur hattı kapalı mı? | checkbox |
| 3 | Makinalar | Fırın kapalı mı? | checkbox |
| 4 | Makinalar | Ocak kapalı mı? | checkbox |
| 5 | Makinalar | Kahve kavurma makinası kapalı mı? | checkbox |
| 6 | Makinalar | Klimalar kapalı mı? | checkbox |
| 7 | Soğuk Hava | Soğuk Hava Deposu #1 son derece | number |
| 8 | Soğuk Hava | Soğuk Hava Deposu #2 son derece | number |
| 9 | Soğuk Hava | Soğuk Hava Deposu #3 son derece | number |
| 10 | Üretim | Buzdolapları son derece | number |
| 11 | Üretim | Tüm dolap kapakları kapalı mı? | checkbox |
| 12 | Üretim | +4 dolabı kapısı kapalı mı? | checkbox |
| 13 | Üst Kat | Şurup makinası kapalı mı? | checkbox |
| 14 | Üst Kat | Tank ağzı kapalı mı? | checkbox |
| 15 | Üretim | Gıda ürünleri ağızları kapalı mı? | checkbox |
| 16 | Güvenlik | Depo kapı + camlar kapalı mı? | checkbox |
| 17 | Güvenlik | Camlardaki aspiratör kapakları kapalı mı? | checkbox |
| 18 | Güvenlik | Su filtre sistemi durdu mu? | checkbox |
| 19 | Güvenlik | Kompresor kapalı mı? | checkbox |
| 20 | Güvenlik | Haşare/fare korucu sistem aktif mi? | checkbox |
| 21 | Güvenlik | Havalandırma kapalı mı? | checkbox |
| 22 | Güvenlik | Tüm ışıklar kapalı mı? | checkbox |
| 23 | Güvenlik | Alarm kuruldu mu? | checkbox |

---

## 🔌 Backend API Endpoint'leri (Sprint 18.1)

```
GET    /api/factory/checklists              → Tüm checklist tanımları
POST   /api/factory/checklists              → Yeni checklist oluştur (admin)
PATCH  /api/factory/checklists/:id          → Checklist düzenle (admin)
DELETE /api/factory/checklists/:id          → Checklist sil (admin, soft)

GET    /api/factory/checklists/:id/items    → Bir checklist'in maddeleri
POST   /api/factory/checklists/:id/items    → Yeni madde ekle (admin)
PATCH  /api/factory/checklist-items/:id     → Madde düzenle (admin)
DELETE /api/factory/checklist-items/:id     → Madde sil (admin)

GET    /api/factory/checklists/active?type=open|close  → Şu an dolabilecek aktif checklist
                                                          (saat kontrolü yapılır)

POST   /api/factory/checklist-submissions   → Yeni submission oluştur veya devam
PATCH  /api/factory/checklist-submissions/:id  → Bir madde işaretle
POST   /api/factory/checklist-submissions/:id/complete  → Tamamlandı işaretle

GET    /api/factory/checklist-submissions   → Geçmiş raporlar (Mahmut için)
GET    /api/factory/checklist-submissions/:id  → Tek bir submission detay
GET    /api/factory/checklist-submissions/:id/pdf  → PDF rapor indir
```

### Saat Kontrolü Mantığı (kritik!)

```typescript
// Kapanış checklist'i 18:00'den önce DOLDURULAMAZ
// Açılış checklist'i 12:00'den sonra DOLDURULAMAZ (kuralı esnek)

router.get('/api/factory/checklists/active', async (req, res) => {
  const { type } = req.query;  // 'open' | 'close'
  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  
  const checklists = await db.select().from(factoryChecklists).where(eq(factoryChecklists.type, type));
  
  // Saat kontrolü
  const available = checklists.filter(c => {
    if (type === 'close' && c.active_after_time && currentTime < c.active_after_time) {
      return false; // 18:00'den önce kapanış aktif değil
    }
    if (type === 'open' && c.active_before_time && currentTime > c.active_before_time) {
      return false; // 10:00'dan sonra açılış aktif değil (opsiyonel)
    }
    return true;
  });
  
  if (available.length === 0) {
    return res.status(403).json({ 
      message: type === 'close' 
        ? `Kapanış kontrolü 18:00'dan sonra yapılabilir. Şu an: ${currentTime}` 
        : 'Açılış kontrolü 10:00'dan önce yapılabilir.'
    });
  }
  
  res.json(available);
});
```

---

## 🎨 Frontend Sayfaları (Sprint 18.2 + 18.3)

### Sayfa 1: `/fabrika/checklist-yonetim` (Admin - Aslan)

- Drag-drop ile madde sıralama (@dnd-kit/core)
- Yeni madde ekle modalı (item_type, min/max/critical değerleri)
- Toggle aktif/pasif
- Seed data import butonu (Aslan'ın 25+ maddesini hızlı kur)

### Sayfa 2: `/fabrika/kiosk-checklist` (Eren - Kiosk)

```
┌─────────────────────────────────────────────┐
│ 🏭 EREN — FABRİKA KAPANIŞ — 11 Mayıs 2026  │
├─────────────────────────────────────────────┤
│ ⏰ Saat: 19:30 — Kapanış aktif ✅         │
│                                              │
│ 📋 İlerleme: 8 / 23 madde                   │
│ ████████░░░░░░░░░░░░░░  35%                 │
│                                              │
│ ── MAKİNALAR ──                              │
│ ☑ Donut makinası kapalı mı? ✓               │
│ ☑ Hamur hattı kapalı mı? ✓                  │
│ ☐ Fırın kapalı mı?                          │
│ ☐ Ocak kapalı mı?                           │
│                                              │
│ ── SOĞUK HAVA ──                             │
│ ☑ S.H. #1: [-19] °C ✓ (kritik OK)          │
│ ⚠️ S.H. #2: [-15] °C — KRİTİK! Notify     │
│                                              │
│ ── GÜVENLİK ──                               │
│ ☐ Alarm kuruldu mu?                         │
│                                              │
│ [Tamamla → Çıkış]                           │
└─────────────────────────────────────────────┘
```

### Akış

1. Eren kiosktan PIN ile giriş
2. Sayfada saat kontrol: 18:00 öncesi → "Kapanış henüz aktif değil" mesajı
3. 18:00 sonrası → Aktif kapanış checklist'i listeler
4. Her madde işaretlenebilir, sayısal değer girilebilir
5. Kritik eşik aşıldığında: anlık alarm + bildirim (Aslan + Mahmut)
6. Tamamlandığında: özet sayfa + "Çıkış yap"
7. Eksik kalmış madde varsa: müdür bildirim
8. Submission DB'ye kaydedilir

### Akış (Açılış)

1. Eren sabah kioska gelir, PIN
2. /fabrika/kiosk-checklist açılır → "Açılış kontrolü" seçer
3. 18 madde sırayla doldurur
4. Personel dropdown'dan eksik personel seçer (toplu işaretleme)
5. Tamamla → DB'ye kaydedilir
6. Aslan'a/Mahmut'a günlük özet bildirimi

---

## 🚨 Bildirim Akışı (entegre)

### Kritik Eşik Aşımı

Soğuk hava deposu -15°C girilirse (kritik eşik -16°C):

```typescript
if (value > criticalThreshold) {
  await createNotification({
    userId: aslanId,
    type: 'factory_critical_violation',
    title: '🚨 Fabrika Kritik Uyarı',
    message: `Soğuk Hava Deposu #2 derecesi: ${value}°C (eşik: ${criticalThreshold}°C)`,
    link: `/fabrika/checklist-detay/${submissionId}`,
    priority: 'critical',
  });
}
```

### Eksik Madde

Eren saat 21:00'da işi bırakıp henüz 15/23 madde dolduruysa:

```typescript
// Cron job (her saat 21:00, 22:00, 23:00 check)
const incompleteSubmissions = await db.select()
  .from(factoryChecklistSubmissions)
  .where(and(
    eq(factoryChecklistSubmissions.submission_date, today),
    eq(factoryChecklistSubmissions.status, 'in_progress'),
    sql`completed_items < total_items`
  ));

for (const sub of incompleteSubmissions) {
  await createNotification({
    userId: aslanId,
    type: 'factory_checklist_incomplete',
    title: '⚠️ Fabrika Kapanış Eksik',
    message: `Eren henüz kapanış checklist'ini tamamlamadı (${sub.completed_items}/${sub.total_items})`,
    link: `/fabrika/checklist-detay/${sub.id}`,
  });
}
```

---

## 📑 PDF Rapor (Sprint 18.4, opsiyonel)

Aylık denetim raporu — Mahmut ay sonu indirir:

- Sayfa 1: Aylık özet (kaç gün tamam, kaç eksik, kritik aşım sayısı)
- Sayfa 2+: Her gün için açılış+kapanış durumu (tablo)
- Sayfa N: Kritik aşım detayları (hangi gün, hangi madde, ne değer)
- Sayfa Sonu: İmza alanı

Sprint 17'de yapılan PDF utility'si yeniden kullanılır.

---

## ⚠️ Risk Notları

1. **18:00 saat kontrolü timezone meselesi:**
   - Server UTC'de çalışıyor (genelde)
   - Türkiye saatiyle 18:00 kontrolü için: `new Date().toLocaleString('tr-TR', { hour12: false, timeZone: 'Europe/Istanbul' })` kullan
   - Test: Server'a Asia/Istanbul olarak ayarla veya runtime'da çevir

2. **Veri büyüklüğü:**
   - Her gün 2 submission × 23 madde = ~46 satır JSONB
   - Yılda 365 × 46 = ~17,000 satır per submission
   - JSONB indeksleme önemli

3. **Foto yükleme:**
   - Sprint 18'de foto opsiyonel
   - Eklenirse: `/uploads/factory-checklist/` dizini + multer (mevcut kiosk-fault-report'taki pattern)

4. **Çoklu fabrika ileride:**
   - Şu an tek fabrika (#24)
   - Eğer 2. fabrika açılırsa: `factory_checklists.branch_id` foreign key eklenir

---

## ✅ Sprint 18 Definition of Done

- [ ] 3 yeni tablo oluşturuldu, migration çalıştı
- [ ] 12 endpoint test edildi (401/200/403 doğrulandı)
- [ ] Admin sayfası: Aslan checklist yönetimi yapabiliyor
- [ ] Kiosk sayfası: Eren açılış+kapanış doldurabiliyor
- [ ] Saat kontrolü çalışıyor (18:00 öncesi kapanış engelleniyor)
- [ ] Kritik eşik bildirimleri Aslan+Mahmut'a gidiyor
- [ ] Eksik checklist için scheduled cron çalışıyor
- [ ] Aslan'ın 25+ maddesi seed edildi
- [ ] PDF rapor (Sprint 18.4 — opsiyonel) çalışıyor

---

## 📅 Önerilen Takvim (Post-Pilot)

| Hafta | Sprint | Süre |
|---|---|---|
| 20-21 May | Sprint 18.1 (DB + Backend) | 3-4 saat |
| 22-23 May | Sprint 18.2 (Admin sayfa) | 2-3 saat |
| 24-26 May | Sprint 18.3 (Kiosk sayfa) | 3-4 saat |
| 27-28 May | Test + Eren ile dry-run | 2 saat |
| 29 May+ | Production deploy | — |
| 1 Haz+ | Sprint 18.4 (PDF rapor) | 1-2 saat |

---

## 🔗 İlgili Sprintler

- **Sprint 17 (bu PR):** Basri butonu fix + vardiya sıfırlama doc + PDF utility temel
- **Sprint 18.1-3 (post-pilot):** Bu döküman
- **Sprint 18.4 (post-Sprint 18):** PDF rapor entegrasyonu

---

**Son güncelleme:** 11 May 2026
**Yazan:** Claude (Anthropic) — Aslan'ın 11 May talebine göre
**Pilot tarihi:** 13 May 2026 — Bu sprint POST-PILOT
