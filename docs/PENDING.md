# 📋 DOSPRESSO — PENDING.md

**Son güncelleme:** 5 May 2026 Pazartesi 17:50 (Aslan + Claude — Sprint 7 v3 tamamlandı)
**Format:** TASK-XXX (iş) / DECISION-XXX (Aslan kararı)
**Bağlam:** Pilot 12 May 09:00 — **7 gün uzakta**.

---

## 🚨 BU AKŞAM (5 May, ŞİMDİ)

### TASK-2026-05-05-A: Sprint 6 Bölüm 3+4 PR aç + merge
**Branch:** `claude/sprint-6-bolum-3-pdks-detail-2026-05-05` (3 commit: b14db32, 1b99683, 4ce915f)
**Link:** https://github.com/bombty/DOSPRESSO-App/pull/new/claude/sprint-6-bolum-3-pdks-detail-2026-05-05
**İçerik:** PDKS detaylı rapor endpoint+frontend + Bordro UX CTA

### TASK-2026-05-05-B: Sprint 7 PR aç + merge (3 commit)
**Branch:** `claude/sprint-7-girdi-yonetimi-tgk-2026-05-05` (3 commit: 356fd7c, f690a24, ec25b18)
**Link:** https://github.com/bombty/DOSPRESSO-App/pull/new/claude/sprint-7-girdi-yonetimi-tgk-2026-05-05
**İçerik:** Girdi Yönetimi TGK (schema + 22 endpoint + frontend + 67 hammadde import + TÜRKOMP + PDF + recipe-label-engine)

### TASK-2026-05-05-C: Replit migration EXECUTE
İki migration:
1. `migrations/2026-05-05-girdi-yonetimi-tgk.sql` — Schema (raw_materials 18 kolon, suppliers 7 kolon, 3 yeni tablo: supplier_quality_records, tgk_labels, turkomp_foods)
2. `migrations/2026-05-05-girdi-data-import.sql` — 13 tedarikçi + 67 hammadde

DRY-RUN sonra GO.

### TASK-2026-05-05-D: Smoke test
- `GET /api/girdi/list` → 67 hammadde
- `GET /api/girdi-stats/overview` → toplam, tgk, alerjen, tedarikçi
- `POST /api/recipe-label/calculate-branch` (test branchProductId) → smart match
- `GET /api/recipe-label/gap-analysis` → uyumluluk yüzdesi
- `GET /api/turkomp/cache/list` → 0 (henüz boş)

---

## 📋 YARIN (6 May Salı)

### TASK-2026-05-06-A: Mahmut Bey final demo (Sprint 6+7)
- Tüm şubeleri görüyor mu (viewOnly)
- Bordro hesaplama akışı (/maas)
- Girdi Yönetimi sayfası tanıtımı
- TGK etiket örneği

### TASK-2026-05-06-B: Eren saha test
- HQ Kiosk (18 PIN aktif)
- 4 UX fix doğrulama (Anasayfa, 30sn auto-return, Mola 2 buton, QC user list)

### TASK-2026-05-06-C: Aroma seed (HQ Coach)
- Mr. Dobody aroma data setine ihtiyaç var

### TASK-2026-05-06-D: Sistem genel taraması
- Pilot öncesi son kontrol (24+ saat öncesi)
- Console error scan
- 27 quality gate çalıştır

### TASK-2026-05-06-E: Sprint 7 Frontend İyileştirmeler (Pilot için kritik DEĞİL)
- [ ] Reçete sayfasında "Etiket Hesapla" butonu (recipe-label-engine'i çağırır)
- [ ] Etiket önizleme modal (besin değeri tablosu + alerjen vurgu)
- [ ] Onay zinciri UI (gıda mühendisi onayı)

---

## 📋 PİLOT SONRASI (13 May+)

### TASK-2026-05-13-A: Satınalma → Girdi auto-fill
- Yeni hammadde alımında purchaseOrders → rawMaterials otomatik link
- "Bilgileri tamamla" wizard

### TASK-2026-05-13-B: Tedarikçi performans dashboard
- supplierQualityRecords üzerinden aggregate
- Trend grafik (kabul/şartlı/red oranı zaman içinde)
- Otomatik uyarı (red oranı %X üstü ise)

### TASK-2026-05-13-C: TÜRKOMP cache batch
- En çok kullanılan 50 hammadde için TÜRKOMP'tan veri çek (manuel arama → "Getir" butonu ile)
- Cache durumu dashboard

---

## 🚨 SABAH ASLAN'A BEKLEYEN

### 1. Replit Plan Mode Sonuç Kontrolü
Gece çalıştı, sabah doğrula:
```bash
git fetch origin
git log --oneline -10  # son commit'ler
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name='factory_recipes' AND column_name LIKE '%storage%' OR column_name LIKE '%manufacturer%';"
psql -c "SELECT id, status FROM factory_shift_sessions WHERE id IN (113, 114);"
```

Beklenen:
- Son commit: branch merge (3 commit getirmiş olmalı)
- factory_recipes: 4 yeni kolon (storage_conditions, manufacturer_info, may_contain_allergens, shelf_life_days)
- Vardıya 113+114: status='completed'

### 2. Recipe Finder Skill İlk Run (07:00 sonrası)
```bash
grep "RecipeFinder" /tmp/logs/Start_application_*.log | tail -10
```
```sql
SELECT COUNT(*), MAX(created_at), subcategory
FROM agent_pending_actions WHERE category='egitim'
GROUP BY subcategory;
```

### 3. Eren Kiosk + Etiket Testi (1.5 saat birlikte)
- `docs/audit/PDKS-TEST-CHECKLIST-DETAYLI-5-MAYIS-2026.md` (Replit, 330 satır)
- `docs/audit/ETIKET-SMOKE-TEST-5-MAYIS-2026.md` (Claude, 250+ satır)

---

## 📌 P1 — PILOT ÖNCESİ (12 May'a 8 gün)

### TASK-AROMA-SEED-COMPATIBILITY (Aslan + HQ Coach)
**Süre:** Kod yok, data entry — 4-8 saat
**Konu:** 32 aroma DB'de, 8 template reçete için compatibility eksik
**Rehber:** `docs/audit/AROMA-SEED-REHBERI-5-MAYIS-2026.md`

### TASK-MRP-MISSING-UI (Claude — opsiyonel)
**Süre:** 3-4 saat
**Konu:** MRP-Light backend'de var, 4 endpoint UI'sız:
- `/api/mrp/daily-plan/:id/confirm` (HQ onay)
- `/api/mrp/leftovers/:id/verify` (akşam kapanış)
- `/api/mrp/deduct-stock` (stok düşme)
- `/api/mrp/calculate-waste` (fire hesabı)

**Pilot etkisi:** Düşük (mevcut 7 endpoint UI var). Post-pilot polish yapılabilir.

### TASK-EREN-KIOSK-FIX (PDKS sonrası)
**Bekliyor:** Eren testi sonrası bug listesi
**Olası fix'ler:** Phase butonlarına vurgu, auto-logout (8h), prompt mesajları

---

## 📌 P2 — POST-PILOT (12 May sonrası)

### TASK-INSIGHTS-STUB-FIX
**Süre:** 10 dk
**Dosya:** `client/src/pages/trainer-egitim-merkezi.tsx`
**Konu:** Stub `/api/agent/insights` → gerçek `/api/agent/actions`

### TASK-DEMO-APPROVAL-UI
**Süre:** 1-2 saat
**Konu:** Süpervizör paneline "Demo Onayı Bekleyenler" widget

### TASK-DRAG-DROP-RECIPE
**Süre:** 1-2 saat
**Konu:** Reçete editöründe dnd-kit ile drag-drop sıralama

### TASK-RECETE-LOCK-UI
**Süre:** 1 saat
**Konu:** `POST /api/factory/recipes/:id/lock` UI butonu — kalite/audit risk azaltma

### TASK-PAYROLL-FABRIKA-DESTEK
**Süre:** 1 gün
**Konu:** `payroll-engine.ts`'e `factory_shift_sessions` ekle (Eren maaş sisteme girmesi için)

### TASK-FACTORY-F2-DASHBOARD
**Karar bekliyor:** F2 backend var (268 satır), UI yok. Kalsın mı, kaldırılsın mı?

### TASK-KIOSK-REFACTOR
**Süre:** 1 hafta
**Konu:** kiosk.tsx (2897 satır, 16 step) → component split + useReducer

### TASK-BRANCH-OPENING-COWORK
**Süre:** 3-5 gün
**Konu:** id=4 izmir projesi için cowork tooling (Vendor Portal MVP)

---

## 🚫 İPTAL / BEKLET

- AI auto-suggest reçete adımları (1-2 ay sonra)
- Versiyon geçmişi reçete editör (low-priority)
- Diff görünümü reçete editör

---

## 🔧 KÜÇÜK (gerekirse 5-15 dk)

- Phantom roller (5 adet, 0 user) → kaldırılabilir post-pilot
- Procurement modülü dormant → activate kararı
- ~2887 raw `console.log` → Sentry/Pino entegrasyonu

---

## 📝 KARAR BEKLEYEN

### DECISION-COWORK-OPTION
Yeni şube açılış için A/B/C? (Vendor Portal / Cowork yorum / Gantt)

### DECISION-FABRIKA-MAAŞ
Eren maaşı pilot sırasında manuel Excel mi, yoksa payroll-engine fabrika destek mi?
**Tavsiye:** Manuel Excel pilot için. Post-pilot engine ekleme.

### DECISION-F2-DASHBOARD
Factory F2 dashboard kalsın mı? UI yapılır mı?
**Tavsiye:** Pilot sonrası karar. Şimdilik dondur.
