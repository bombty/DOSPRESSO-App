# FABRİKA ÜRETİM MVP PLANI

DOCS-ONLY plan dokümanı. Implementasyon ayrı IMPLEMENTATION mod + owner GO ile yapılır.

Son güncelleme: 2 Mayıs 2026  
Durum: **PLAN — owner kararı (Day-1 scope) beklemede**  
Kaynak: `docs/SPRINT-LIVE.md` "Açık İşler" #5, `docs/audit/pilot-readiness-current.md` R4 risk

---

## 1. Mevcut Durum (READ-ONLY Analiz Sonucu)

### ✅ Var Olan Altyapı (Zengin)

| Bileşen | Durum | Konum |
|---|---|---|
| `weekly_production_plans` | ✅ MEVCUT | `shared/schema/schema-18-production-planning.ts:28` |
| `production_plan_items` | ✅ MEVCUT | `shared/schema/schema-18-production-planning.ts:55` |
| `production_batches` | ✅ MEVCUT | `shared/schema/schema-08.ts:186` |
| `factory_production_runs` | ✅ MEVCUT | `shared/schema/schema-08.ts:406` |
| `factory_production_outputs` | ✅ MEVCUT | `shared/schema/schema-08.ts:649` |
| `GET /api/factory/batches` | ✅ MEVCUT | `factory.ts:237` |
| `POST /api/factory/batches` | ✅ MEVCUT | `factory.ts:263` (manifest 'fabrika', 'create') |
| `PATCH /api/factory/batches/:id` | ✅ MEVCUT | `factory.ts:280` (manifest 'fabrika', 'edit') |
| `GET /api/factory/production-plans` | ✅ MEVCUT | `factory.ts:2716` |
| `POST /api/factory/production-plans` | ✅ MEVCUT | `factory.ts:2819` |
| `PATCH /api/factory/production-plans/:id` | ✅ MEVCUT | `factory.ts:2999` |
| `GET /api/factory/production-stats` | ✅ MEVCUT | `centrum-endpoints.ts:21` |
| `GET /api/factory/production-dashboard` | ✅ MEVCUT | `factory-f2.ts:30` |
| `GET /api/factory/batch-cost/:id` | ✅ MEVCUT | `factory.ts:7406` |
| `POST /api/factory/production-logs/:id/complete` | ✅ MEVCUT | `factory-recipes.ts:2027` |
| `GET /api/factory/production-logs` | ✅ MEVCUT | `factory-recipes.ts:2055` |
| Fabrika Mission Control dashboard | ✅ MEVCUT | `fabrika_mudur` rolü için 10 widget (replit.md, Task #240b) |

### Önemli Bulgu

> **Fabrika üretim modülü "MVP eksik" değil — sistem zaten zengin.** Asıl soru: Day-1'de **hangi alt-modül** Eren ve fabrika ekibi tarafından **gerçek operasyonda** kullanılacak?

---

## 2. Day-1 Scope — Asıl Karar

### Modül Seviyesi Olası Scope'lar

| Scope | Kapsam | Eren'in Day-1 Aksiyonu | Risk |
|---|---|---|---|
| **S0 — Read-only** | Sadece dashboard + raporları görür, yazma YOK | Dashboard kontrol, üretim takibi gözlem | 🟢 ÇOK DÜŞÜK |
| **S1 — Plan görüntüleme** | Haftalık üretim planı görür, batches listeler | Plan onaylama / inceleme | 🟢 DÜŞÜK |
| **S2 — Batch oluşturma** | Yeni production_batch girer, mevcut planı uygular | Day-1 üretim batch'i girer | 🟡 ORTA |
| **S3 — Tam üretim akışı** | Plan + batch + run + output + complete + cost | Tam üretim yönetimi | 🔴 YÜKSEK (kompleks akış) |
| **S4 — Kiosk üretim takibi** | Şefler kiosk üzerinden run/output kayıt eder | Şef rolü Day-1'de aktif | 🔴 YÜKSEK |

### Pilot İçin Önerim

**S1 + S2 — "Plan görüntüleme + batch oluşturma" — Day-1 minimum çalışır kapsam**

**Sebep:**
- S0 çok kısıtlı (Eren'in beklentisini karşılamaz, "üretim modülü çalışmıyor" şikayeti olabilir)
- S3/S4 çok kapsamlı (kiosk + şef + run + output zinciri pilot Day-1 için fazla risk)
- S1+S2 ortayı bulur: dashboard + plan view + batch CRUD = "üretim takibi" sağlar, kiosk akışı pilot sonrası

---

## 3. S1+S2 Scope Detayı

### Day-1'de Aktif Olan Endpoint'ler

| Endpoint | Method | Rol | Davranış |
|---|---|---|---|
| `/api/factory/production-stats` | GET | hepsi | Dashboard sayıları |
| `/api/factory/production-dashboard` | GET | hepsi | Detaylı dashboard data |
| `/api/factory/production-plans` | GET | hepsi | Haftalık planlar listesi |
| `/api/factory/production-plans/:id` | GET | hepsi | Plan detay |
| `/api/factory/production-plans` | POST | fabrika_mudur, ceo | Yeni plan (Day-1'de istenirse) |
| `/api/factory/batches` | GET | hepsi | Batch listesi |
| `/api/factory/batches/:id` | GET | hepsi | Batch detay |
| `/api/factory/batches` | POST | fabrika_mudur, ceo (manifest: 'fabrika', 'create') | Yeni batch |
| `/api/factory/batches/:id` | PATCH | fabrika_mudur, ceo (manifest: 'fabrika', 'edit') | Batch güncelle |
| `/api/factory/batch-cost/:id` | GET | hepsi | Maliyet hesabı |

### Day-1'de KAPATILACAK Endpoint'ler (Geçici)

| Endpoint | Method | Sebep |
|---|---|---|
| `/api/factory/production-logs/:id/complete` | POST | Run/output zinciri Day-1'de aktif değil |
| Şef/kiosk üretim run kayıt akışı | POST/PATCH | S4 kapsamı |

> **Not:** Bu endpoint'ler "kapatılır" demek `module_flags` veya runtime feature flag ile gizlenir. Backend kod silinmez.

### Frontend Scope

- **Fabrika Mission Control dashboard** (10 widget, mevcut)
- **Üretim Planları sayfası** — view + create + edit
- **Batch Listesi + Detay** — view + create + edit + cost
- **Run/Output sayfaları** — frontend'de görünmez veya "yakında" placeholder
- **Şef Kiosk üretim akışı** — Day-1'de görünmez

---

## 4. Owner Kararı Gerekiyor

**Karar 1:** Day-1'de fabrika üretim scope'u nedir?
- 🟢 S0 (read-only) — En düşük risk
- 🟢 **S1+S2 (plan + batch)** — Önerilen
- 🟡 S3 (tam akış) — Yüksek risk, ama Eren tam kullanmak isterse
- 🔴 S4 (kiosk dahil) — Pilot Day-1 için kompleks

**Karar 2:** Eren ile Day-1 öncesi tek tek modül turu yapılacak mı? (1 saat eğitim/walkthrough)

**Karar 3:** Şef rolü (Ümit) Day-1'de fabrika modülüne dokunacak mı?
- 🟢 Hayır — sadece üretim takibi gözlem
- 🟡 Evet — batch oluşturma yetkisi ek (manifest 'fabrika', 'create' rol kontrolü)

**Karar 4:** Day-1'de "üretim takibi başarılı" KPI'ı nasıl ölçülür?
- Tahmini: kaç plan oluşturuldu, kaç batch açıldı, kaç batch kapandı

---

## 5. Implementasyon Adımları (S1+S2 Scope)

### Faz A — Hiçbir Kod Değişikliği YOK (Karar Yeterli)

1. Owner kararı yazılır (`DECISIONS.md` yeni madde)
2. `module_flags` tablosunda fabrika alt-modülleri kontrol:
   - `fabrika_dashboard` = true
   - `fabrika_planning` = true
   - `fabrika_batches` = true
   - `fabrika_runs` = false (S4 hariç)
   - `fabrika_kiosk_production` = false (S4 hariç)
3. Frontend'de `module_flags` kontrolü ile alt-sayfalar gizlenir/görünür
4. Eren ile 1 saat walkthrough (Day-1 öncesi)
5. Day-1 KPI ölçüm planı yazılır

### Faz B — Eğer module_flags Yetersizse (Kod Değişikliği)

6. `client/src/lib/nav-registry.ts` — fabrika alt-sayfa nav listesi düzenlemesi
7. Backend'de S4 endpoint'lerine `requireManifestAccess` eklenir veya 403 döner

### Faz C — Test

8. fabrika_mudur (Eren) login → dashboard 10 widget render → plan + batch sayfası açılır
9. fabrika_mudur "yeni batch" oluşturma akışı sorunsuz
10. Maliyet hesabı API döner
11. Şef (Ümit) login → fabrika modülünü görmemeli (Karar 3 = Hayır ise)
12. Müsterek modüller (akademi, görev) Day-1'de açık

---

## 6. Day-1 SONRASI Genişletme

### Sprint 2 — Faz A (Day-2-7)

- S3 — Tam üretim akışı: run + output + complete
- Worker scoring entegrasyonu
- Batch maliyet detay raporları

### Sprint 2 — Faz B (Day-8-14)

- S4 — Kiosk üretim takibi (şef rolü)
- Lot tracking + kalite kontrol entegrasyonu
- Üretim verimi dashboard

### Sprint 2 — Faz C (Day-15+)

- Reçete + besin + alerjen + etiket sistemi entegrasyonu (ayrı plan)
- TGK uyumlu etiket workflow

---

## 7. Açık Kararlar (Owner GO Bekliyor)

1. **Karar 1: Day-1 scope** (S0 / S1+S2 / S3 / S4)
2. **Karar 2: Eren walkthrough yapılacak mı?** (1 saat eğitim)
3. **Karar 3: Şef Ümit Day-1'de fabrika yazma yetkisi var mı?**
4. **Karar 4: KPI ölçüm yöntemi** (kaç plan, kaç batch, kaç completed)
5. **Module flags:** Day-1 öncesi `module_flags` tablo durumu doğrulanmalı, eksikse seed edilmeli (DB-WRITE protokolü)
6. **Pilot şubeler vs fabrika:** Üretim batch'leri sadece fabrika için mi, pilot şubeler de batch oluşturabilir mi?
7. **Onay zinciri:** Üretim planı kim onaylar? (fabrika_mudur tek mi, ceo onayı mı zorunlu)

---

## 8. Effort Tahmini

| Faz | İş | Tahmini Süre |
|---|---|---|
| A | Owner karar + module_flags kontrol + walkthrough | 2 saat (eğitim dahil) |
| B | Eğer kod değişikliği gerekirse | 2-4 saat |
| C | Test (8+ senaryo) | 1 saat |
| **Toplam (sadece karar yeterse)** | | **~3 saat** |
| **Toplam (kod değişikliği gerekirse)** | | **~7 saat** |

> S1+S2 scope için **kod değişikliği gerekmeyebilir**, sadece module_flags + walkthrough + UX kontrol yeterli.

---

## 9. Risk + Bağımlılık

- **`module_flags` tablosu** sağlıklı çalışıyor mu? — replit.md'de "Komuta Merkezi 2.0" ve "module_flags granular kontrol" referansları var, ama Day-1 öncesi pratik test gerekli
- **fabrika_mudur dashboard 10 widget** — replit.md Task #240b'de "Eren için 10 widget yeniden sıralandı" diyor, Day-1 öncesi smoke test (TEST-MATRIX `fabrika_mudur` rolü)
- **`requireManifestAccess('fabrika', 'create'/'edit')`** middleware doğru çalışıyor mu? — Endpoint'lerde bu kontrol var, ancak rol-manifest mapping tablosu doğrulanmalı
- **factory.ts dosya boyutu** — Endpoint sayısı çok (7000+ satır), fix yapılırsa regression riski yüksek → her değişiklik sonrası TEST-MATRIX `fabrika_mudur` smoke test

---

## 10. İlgili Dosyalar

- `shared/schema/schema-08.ts` (production_batches, factory_production_runs, factory_production_outputs)
- `shared/schema/schema-18-production-planning.ts` (weekly_production_plans, production_plan_items)
- `server/routes/factory.ts` (ana fabrika endpoint'leri)
- `server/routes/factory-f2.ts` (production-dashboard)
- `server/routes/factory-recipes.ts` (production-logs)
- `server/routes/centrum-endpoints.ts` (production-stats)
- `client/src/lib/nav-registry.ts` (fabrika nav)
- `client/src/components/dashboards/` (fabrika_mudur dashboard)
- `module_flags` tablosu (DB)

---

> **Bu doküman PLAN'dır. Asıl iş Day-1 öncesi owner ile S1+S2 scope kararı + Eren walkthrough'tur. Kod değişikliği büyük olasılıkla GEREKLİ DEĞİL.**
