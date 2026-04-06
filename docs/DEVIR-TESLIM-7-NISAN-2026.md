# DOSPRESSO Devir Teslim — 7 Nisan 2026 (v2)
**Son commit:** `5508529` — Admin paneline Duyurular yetki yönetimi  
**Önceki devir teslim:** `docs/DEVIR-TESLIM-6-NISAN-2026.md`  
**Oturum:** 6-7 Nisan 2026, ~10 saat, 39 commit, 3490 satır eklendi

---

## 1. SİSTEM DURUMU

| Metrik | Değer |
|--------|-------|
| Tablolar | 427 (21 schema dosyası) |
| API Endpoint | 1662 |
| Sayfa | 307 |
| Roller | 27 |
| Commit (bu oturum) | 39 |

**Son build:** Frontend ✅ Backend ✅ (hata yok)

---

## 2. BU OTURUMDA TAMAMLANAN İŞLER

### A. DUYURU SİSTEMİ v2 — 4 Sprint ✅
| Sprint | İçerik | Commit'ler | Replit |
|--------|--------|-----------|--------|
| S1 | ImageStudio, TipTap editör, kategori şablonları, onay akışı, taslak kaydet | `f0d988c`→`4287b54` | ✅ Doğrulandı |
| S2 | Landing page (/duyuru/:id), Acknowledgment | `72c6a13` | ✅ Doğrulandı |
| S3 | Header banner, dismiss tracking | `9d3ddf4` | ✅ Doğrulandı |
| S4 | Analitik dashboard, Dobody 18. event | `fab1984`, `9958462` | ✅ Doğrulandı |

**Dosyalar:**
- `client/src/components/ImageStudio.tsx` — 5 sekmeli görsel düzenleme
- `client/src/components/RichTextEditor.tsx` — TipTap zengin metin editörü
- `client/src/components/AnnouncementHeaderBanner.tsx` — Üst bar banner
- `client/src/components/AnnouncementAnalytics.tsx` — Analitik dashboard
- `client/src/pages/duyuru-detay.tsx` — Landing page

### B. KIOSK DUYURU ENTEGRASYONU ✅
**Commit:** `7851f36` + Replit fix `6fd27e8`
- Vardiya başı zorunlu duyuru okuma
- `GET /api/branches/:branchId/kiosk/pending-announcements/:userId`
- Acknowledge mutation: `selectedUser?.id` gönderilir (session user değil)
- **Replit bulgusu:** Kiosk modunda `req.user.id` = branch manager → `req.body.userId` ile düzeltildi

### C. DUYURU MİNİ QUİZ ✅
**Commit:** `8ddc6de` + Replit fix `003cd36`
- Schema: `quizQuestions` (JSON), `quizPassScore`, `quizRequired` alanları announcements'a eklendi
- `announcement_quiz_results` tablosu
- API: `GET /quiz` (correctIndex gizli), `POST /quiz-submit` (deneme takibi)
- Kiosk: 3 ekranlı quiz akışı (duyuru → quiz → sonuç)
- **Replit bulgusu:** `= ANY(${quizAnnIds})` SQL array hatası → JS filter ile düzeltildi

### D. DENETİM SİSTEMİ GENİŞLETME ✅
**Commit'ler:** `c84374f`→`dd22d25`
- 6 denetim şablonu, ~175 madde (seed: `POST /api/admin/seed-audit-templates`)
- Personel değerlendirme: 45 madde, 6 alt kategori, güler yüz %30
- `personnel_audit_scores` tablosu (6 alt kategori avg + trend)
- `audit_personnel_feedback` tablosu (denetçi→personel + yanıt)
- 6 yeni API endpoint (my-results, my-feedback, respond, branch-scores)

### E. FABRİKA SPRİNT F1 ✅
**Commit'ler:** `acd38c7`→`828a441`
- Takvim tarih fix: `Number(currentDate)` → `currentDate.toLocaleString()`
- `fabrika_mudur` kiosk erişimi eklendi (`FABRIKA_ALLOWED_ROLES`)
- Üretim Planla butonu yetki kontrolü (sadece fabrika_mudur/fabrika_sorumlu)
- BatchSpec genişletme: 7 yeni kolon (min/maxWorkers, prepDuration, expectedWaste, stationId, energyKwh, gasM3, waterL)
- 9 istasyon batch spec seed (enerji verileriyle) — `POST /api/admin/seed-batch-specs`

### F. MALİYET HESAPLAMA API ✅
**Commit:** `a80ce2b`
- `GET /api/factory/batch-cost/:batchSpecId` — Tek batch maliyet detayı
- `GET /api/factory/batch-costs-all` — Tüm istasyonların maliyet özeti
- `POST /api/admin/seed-cost-settings` — Maliyet parametreleri seed
- Yetki: admin, fabrika_mudur, fabrika_sorumlu, ceo, cgo, muhasebe

### G. ALTYAPI İYİLEŞTİRMELERİ ✅
| İş | Commit | Detay |
|----|--------|-------|
| Dobody scheduler | `569ed20` | `runPeriodicChecks` → `tick-1hr` bağlandı (DAHA ÖNCE HİÇ OTOMATİK ÇALIŞMIYORDU!) |
| Sidebar Megaphone | `dbb12a8` | admin/ceo/cgo/coach/trainer için Duyurular linki |
| 4 rol erişim fix | `1fb62f2` | BannerEditor redirect + from-banner/generate-image/read-status 403 |
| Banner route fix | `76a3a52` | AdminOnly → ProtectedRoute (HQ roller) |
| Admin yetki UI | `5508529` | rol-yetkileri'ne "Duyurular & İçerik" modülü |
| Skill güncelleme | — | `/mnt/skills/user/dospresso-architecture/SKILL.md` güncel |

---

## 3. ÇALIŞAN SİSTEMLER (DOKUNMA)

### Duyuru Sistemi
- ✅ Duyuru oluşturma (`/duyuru-yonetimi` — TipTap editör)
- ✅ İçerik Stüdyosu (`/duyurular` — BannerEditor dialog)
- ✅ Banner Editor standalone (`/banner-editor`)
- ✅ Landing page (`/duyuru/:id`)
- ✅ Header banner + dismiss
- ✅ Analitik dashboard (rol/şube/saatlik)
- ✅ Kiosk zorunlu duyuru okuma + acknowledge
- ✅ Mini quiz (kiosk entegrasyonlu)
- ✅ Dobody takip (announcement_followup)
- ✅ Sidebar Megaphone linki
- ✅ Admin yetki yönetimi

### Denetim Sistemi
- ✅ 6 şablon seed (175 madde)
- ✅ Personel skor entegrasyonu
- ✅ Geri bildirim sistemi (denetçi↔personel)

### Fabrika
- ✅ Sprint F1 (takvim, kiosk, batch spec, enerji)
- ✅ 9 istasyon batch spec seed
- ✅ Maliyet hesaplama API
- ✅ Min personel mola uyarısı (ZATEN VARDI)

### Dobody Agent
- ✅ 18 event tipi (17 + announcement_followup)
- ✅ Saatlik scheduler bağlı (tick-1hr → runPeriodicChecks)

---

## 4. BİLİNEN SORUNLAR VE BOZUK ŞEYLER

### KRİTİK — Hemen yapılmalı
| # | Sorun | Dosya | Detay |
|---|-------|-------|-------|
| 1 | **BannerEditor popup layout bozuk** | `banner-editor.tsx` (1713 satır) | Mobil/tablet'te canvas sıkışık, gradient kesilmiş, ImageStudio popup içinde popup |
| 2 | **ImageStudio popup bozuk** | `ImageStudio.tsx` (899 satır) | Kırpma alanı küçük, 5 sekme mobilde kullanılamaz |

### ORTA — Planlı yapılmalı
| # | Sorun | Dosya | Detay |
|---|-------|-------|-------|
| 3 | API endpoint'ler hardcoded rol dizileri kullanıyor | `announcements-routes.ts`, `admin-announcements-routes.ts` | `canAccess('announcements','create')` ile değiştirilmeli |
| 4 | "64 hammadde düşük stok" KPI doğruluğu | `factory.ts` → stock-overview | Genel inventory tablosu sorgulanıyor, fabrika-spesifik olmalı |
| 5 | Kavurma sayfası boş | `fabrika/kavurma.tsx` | `coffee_roasting_logs` tablosu 0 kayıt — test verisi lazım |
| 6 | Fabrika üretim planı ↔ vardiya bağlantısı yok | `schema-10.ts` | `factory_production_plans` ↔ `factory_shift_sessions` FK eksik |
| 7 | Kiosk token bug şüphesi | `sube/kiosk.tsx` | `loginMutation` → `localStorage.setItem("kiosk-token")` doğrulanmalı |

### DÜŞÜK — Sonraki fazda
| # | Sorun | Detay |
|---|-------|-------|
| 8 | Eski/yeni reçete diff görünümü | Reçete değişikliği duyurusunda before/after gösterim |
| 9 | Dinamik yetki kaydırma UI | Supervisor → müdür arası geçici yetki devri |
| 10 | Dobody autonomous threshold | %90+ confidence → onaysız aksiyon |

---

## 5. SONRAKİ OTURUM ÖNCELİKLERİ

### 1. DuyuruStudioV2 — BannerEditor Yeniden Tasarım 🔴
**Plan hazır:** `docs/DUYURU-REDESIGN-PLAN.md`
**Kapsam:**
- BannerEditor 1713 satır monolitik → ~800 satır modüler (8 dosya)
- ImageStudio 899 satır → ~400 satır sadeleştirme
- DOSPRESSO branded gradient presetleri (12 preset)
- Responsive layout (desktop grid + mobil bottom sheet)
- 5 hazır şablon (yeni ürün, reçete, kampanya, eğitim, kanuni)
- Ürün yerleştirme (isolated product + arka plan)

**Sprint planı:**
- D-R1 (~3-4 saat): Temel layout + canvas + gradientler + paneller
- D-R2 (~2-3 saat): AI görsel + yayın akışı + eski→yeni geçiş
- D-R3 (~1-2 saat): Şablonlar + dark mode + test

### 2. Fabrika Sprint F2 🟡
- Üretim planı ↔ vardiya bağlantısı
- min_stock_level + düşük stok KPI düzeltmesi
- Kavurma test verisi

### 3. Maliyet Dashboard UI 🟡
- API hazır (`batch-cost`, `batch-costs-all`)
- Frontend: istasyon bazlı maliyet karşılaştırma tablosu
- Birim maliyet breakdown (enerji + işçilik + hammadde)

---

## 6. TEKNİK REFERANSLAR

### Dosya Konumları
| Ne | Nerede |
|----|--------|
| Schema dosyaları | `shared/schema/schema-01.ts` → `schema-21-dobody-proposals.ts` |
| Module manifest | `shared/module-manifest.ts` |
| PERMISSIONS map | `shared/schema/schema-02.ts` satır 44 |
| Sidebar config | `client/src/lib/navigation-config.ts` |
| Nav-rail bileşeni | `client/src/components/nav-rail.tsx` |
| Menu service | `server/menu-service.ts` |
| Dobody workflow engine | `server/lib/dobody-workflow-engine.ts` |
| Skill dosyaları | `/mnt/skills/user/dospresso-*` (read-only mount) |

### Seed Endpoint'leri (Admin ile çağır)
| Endpoint | Ne yapar |
|----------|----------|
| `POST /api/admin/seed-audit-templates` | 6 denetim şablonu, 175 madde |
| `POST /api/admin/seed-batch-specs` | 9 istasyon batch spec + enerji |
| `POST /api/admin/seed-cost-settings` | 6 maliyet parametresi |
| `POST /api/admin/seed-checklists` | Kontrol listeleri |
| `POST /api/admin/seed-salaries` | Maaş verileri |

### Push Komutu
```bash
git push https://[TOKEN]@github.com/bombty/DOSPRESSO-App.git HEAD:main
```
**Token ASLA dosya içine yazılmaz.**

### Çalışma Akışı
```
Claude → büyük feature/architecture → GitHub push
    ↓
Aslan talimatı Replit'e yapıştırır
    ↓
Replit: pull → test → bug varsa fix + push → rapor
    ↓
Claude: pull --rebase → Replit fix'lerini çeker → devam
```
**Her push'tan sonra Replit test talimatı hazırla** (Aslan hatırlatmasını bekleme!)

### Çift Yetki Kuralı (KRİTİK)
Her rol/yetki değişikliğinde İKİSİNİ BİRLİKTE güncelle:
1. `shared/module-manifest.ts` — modül erişim
2. `shared/schema/schema-02.ts` → `PERMISSIONS` map

### Build Komutları
```bash
# Frontend
NODE_OPTIONS="--max-old-space-size=3072" npx vite build --outDir dist/public

# Backend
npx esbuild server/index.ts --bundle --platform=node --outdir=dist --format=esm --packages=external --loader:.node=file
```

---

## 7. REPLİT İŞBİRLİĞİ NOTLARI

### Replit'in Bu Oturumda Bulduğu Kritik Bug'lar (6 adet)
1. `createdById` schema omit — form submit kırılıyordu
2. `acknowledgedAt` kolonu — read ≠ acknowledge ayrımı gerekiyordu
3. `setLocation` SPA iyileştirmesi — window.location.href → wouter
4. Kiosk acknowledge personel ID — session user değil body'den alınmalı
5. SQL array literal — `= ANY(${array})` → JS filter
6. Fabrika Sprint F1 doğrulama + DB migration

### Replit Kuralları
- `git reset --hard` KULLANMAZ
- Küçük fix → commit + push
- Büyük mimari değişiklik YAPMAZ
- Plan modunda kod değiştirmez, sadece analiz

---

## 8. DOUBLE-CHECK SONUÇLARI (Bu oturumda yapılan)

### Doğrulanmış tespitler:
- ✅ Min personel mola uyarısı ZATEN VAR (analizde yanlış "eksik" yazmıştım)
- ✅ "64 hammadde düşük stok" bug değil, genel inventory sorgusu (doğru veri)
- ✅ Dobody runPeriodicChecks daha önce HİÇ otomatik çalışmıyordu → düzeltildi
- ✅ Kavurma boş card = veri eksikliği (bug değil)

### Dikkat edilmesi gerekenler:
- BannerEditor: 1713 satır monolitik, refactor gerekli
- API endpoint'ler: hardcoded rol dizileri → DB-driven yapılmalı
- Fabrika: 163 ürün var ama sadece 9'u batch spec'li

---

## 9. YENİ OTURUMDA İLK YAPILACAKLAR

```
1. Bu dokümanı oku: docs/DEVIR-TESLIM-7-NISAN-2026.md
2. Skill dosyalarını oku: /mnt/skills/user/dospresso-*
3. git clone + git pull --rebase (Replit fix'leri olabilir)
4. Tasarım planını oku: docs/DUYURU-REDESIGN-PLAN.md
5. DuyuruStudioV2 Sprint D-R1'e başla
```
