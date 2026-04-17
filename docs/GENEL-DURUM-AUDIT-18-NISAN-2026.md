# DOSPRESSO Platform — Genel Durum Audit Raporu

**Tarih:** 18 Nisan 2026  
**Commit:** `90e5b72a` (origin/main ile senkronize, 113 commit push edildi)  
**Auditor:** Claude

---

## 📊 Platform Büyüklüğü

| Metrik | Değer | Not |
|--------|------:|-----|
| **Repo toplam boyutu** | 1.1 GB | `attached_assets/` dahil |
| **Database tablosu (pgTable)** | **469** | 18,457 satır schema kodu |
| **Backend route dosyası** | 114 | 151,656 satır TypeScript |
| **Backend endpoint** | **1,732** | Router.get/post/put/delete/patch |
| **Frontend sayfa** | 316 | 239,696 satır TSX |
| **Module-manifest modülü** | **181** | Permission matrix |
| **Schema dosyaları** | 23 | schema-01 → schema-23 |
| **Skill dosyaları** | 4 DOSPRESSO + 5 genel | Hepsi güncel |
| **Dokümantasyon** | 61 `.md` | docs/ klasörü |
| **Toplam kod satırı (TS/TSX)** | **~410,000** | Server + Client + Shared |

---

## ✅ Çok İyi Durumda Olanlar

### 1. Git Hijyeni
- ✅ **Merge conflict YOK** (0 marker bulundu)
- ✅ **origin/main ile senkronize** (0 ahead, 0 behind)
- ✅ **Clean working tree** (hiç untracked dosya yok)
- ✅ Son 15 commit düzenli — her biri anlamlı mesaj içeriyor

### 2. Schema Temizliği
- ✅ **Duplicate export YOK** (titiz kontrol: hiçbir dosya içinde veya dosyalar arası çakışma yok)
- ✅ Schema dosyaları mantıklı bölünmüş (23 dosya, numaralandırılmış)
- ✅ `drizzle-zod` ile tüm tablolar için insert schema oluşturulmuş

### 3. Maliyet Analizi Sistemi (SON EKLENEN)
- ✅ **143 malzeme fatura fiyatı** sisteme yüklenebilir durumda (`server/data/invoice-prices.json`)
- ✅ **Donut klasik maliyet NİHAİ**: ₺17.02/adet (%57 marj, 3 saat × 2 kişi, 660 adet, fire %23)
- ✅ Fatura kaynağı tip: H-1175-1178 Donut Sos ₺300/KG, H-1049-51 Konfiseri, H-1014 Turyağ Fritöz
- ✅ Script hazır: `npx tsx server/scripts/update-prices-from-invoices.ts`

### 4. Modül Kapsamı
- ✅ 469 tablo — fabrika üretim, kiosk, HR, muhasebe, CRM, denetim, duyuru, dobody, project management tam kapsam
- ✅ 31 kullanıcı rolü, 181 permission modülü
- ✅ 1,732 endpoint — platform production-scale

### 5. Yakın Zamanda Yapılanlar (son 10 commit)
- Fatura fiyat senkronizasyonu (bu commit)
- Personel maliyeti SGK dahil güncelleme (₺76→₺216/saat)
- Labne kova doğrulama + Cheesecake 180g düzeltme
- Fabrika Üretim Stok Merkezi (Task #91)
- Donut reçetesi 29 malzeme ayrıştırma
- Keyblend v2 envanter fiyat kontrolü
- Satınalma (purchase orders) + stok hareketleri

---

## ⚠️ Teknik Borç ve İyileştirme Alanları

### 🔴 P1 — Yüksek Öncelik

#### 1.1. TypeScript `any` Kullanımı: **2,549 satırda**
- Type safety riski — büyük bir sayı
- Özellikle `server/` ve `client/` içinde yaygın
- **Aksiyon:** ilk 200 kritik `any`'i proper type'a dönüştür. Yeni kodda `any` yasaklanabilir ESLint rule ile.

#### 1.2. Büyük Route Dosyaları (monolith riski)
| Dosya | Satır | Durum |
|-------|------:|-------|
| `server/routes/factory.ts` | **7,956** | 🔴 Kritik — bölünmeli (factory-recipes, factory-production, factory-kiosk) |
| `server/routes/hr.ts` | 7,460 | 🔴 Bölünmeli (hr-employees, hr-leaves, hr-payroll, hr-shifts) |
| `server/routes/operations.ts` | 5,846 | ⚠️ İzlenmeli |
| `server/routes/branches.ts` | 5,496 | ⚠️ İzlenmeli |
| `server/routes/admin.ts` | 4,260 | ⚠️ İzlenmeli |

**Risk:** Dosya 3000 satırı geçince code review yavaşlıyor, test zorlaşıyor, merge conflict ihtimali artıyor.

**Aksiyon:** hr.ts ve factory.ts için modüler ayırma sprintinde bölünsün.

#### 1.3. Büyük Frontend Pages
| Dosya | Satır | Not |
|-------|------:|-----|
| `fabrika/maliyet-yonetimi.tsx` | **3,859** | Maliyet analizi — bileşenlere ayrılmalı |
| `yonetim/akademi.tsx` | 3,374 | Akademi modülü |
| `yeni-sube-detay.tsx` | 3,245 | Şube detay |
| `fabrika/kiosk.tsx` | 2,897 | Kiosk UI |
| `equipment-detail.tsx` | 2,659 | Ekipman detay |

**Aksiyon:** Büyük sayfalar child component'lere ayrılmalı (tab/section bazında).

### 🟡 P2 — Orta Öncelik

#### 2.1. Raw SQL Kullanımı: 566 `db.execute(sql...)` çağrısı
- Drizzle ORM query builder yerine raw SQL kullanımı
- SQL injection riski YOKsa da type safety kayboluyor
- **Aksiyon:** Her raw SQL için bir Drizzle query alternatifi olduğu kontrol edilsin. Zorunlu olmayan yerlerde Drizzle query builder'a geçilsin.

#### 2.2. Console.log Temizliği: 19 adet
- Production'da `console.log` spam'i performans/log dosyası şişmesi riski
- **Aksiyon:** Logger servisine (pino/winston) migrate edilsin veya kaldırılsın.

#### 2.3. `attached_assets/` 1,742 dosya
- Hassas bilgi sızma riski (Aslan'ın kendi uyarısı ile önceki sessionlarda temizlendi)
- Şu an sadece 1 satır `.gitignore` entry var
- **Aksiyon:** `attached_assets/*` whitelist değil blacklist yap, `.gitignore`'da `attached_assets/` directory bazında ignore edildiği teyit edilsin.

### 🟢 P3 — Düşük Öncelik

#### 3.1. TODO Yorumları: 16 adet
```
announcements-routes.ts  : Bildirim sistemiyle entegre et
certificate-routes.ts    : getDailyPerformanceScore
shifts.ts                : Remove deprecated v1
manifest-auth.ts         : Admin panelden ayarlanabilir yap
DobodyProposalWidget.tsx : Backend notification endpoint
```
**Aksiyon:** Sprint'lere dağıt, her birini GitHub issue yap.

---

## 🚨 Kritik Eksikler ve Riskler

### 1. Test Coverage
- `*.test.ts` dosyaları `tsconfig.json`'da exclude edilmiş
- Test suite var mı yok mu belirsiz — E2E test script (`server/scripts/e2e-tests.ts`) var ama unit test görünmüyor
- **Risk:** 410K satır kod için test piramidi yok
- **Aksiyon:** Kritik path'ler için minimum unit test suite (vitest/jest) eklenmeli

### 2. CI/CD Pipeline
- `.github/workflows/` yok (kontrolü ettim)
- Replit üzerinden manuel deploy
- **Risk:** Build hatası üretime geçebilir
- **Aksiyon:** GitHub Actions ile minimum `tsc --noEmit` + lint check pipeline kur.

### 3. Database Migration Disiplini
- `drizzle-kit push` doğrudan schema sync yapıyor
- Migration history tutulmuyor (drizzle'de migration klasörü yok gibi görünüyor)
- **Risk:** Production DB state kaybı veya geri alamama
- **Aksiyon:** `drizzle-kit generate` ile migration dosyaları tutulsun.

### 4. Environment Variable Management
- `.env.example` dosyası repo'da var mı kontrol edilmedi
- Production secret'ler nasıl yönetiliyor?
- **Risk:** Yanlış config ile production çalışması

### 5. Error Monitoring
- Sentry/Rollbar entegrasyonu görünmüyor
- Production hataları nasıl toplanıyor?

---

## 📈 Büyüme Trendi

### Son 3 Oturumda Yapılanlar (rakamlara yansımış)
- 14 Nisan: 468 tablo → Bu gün: **469 tablo** (+1)
- 14 Nisan: ~1,800 endpoint → Bu gün: **1,732 endpoint** (aynı seviye)
- 14 Nisan: 314 page → Bu gün: **316 page** (+2)
- Son 15 commit'te büyük feature'lar: Fabrika Stok Merkezi, Mal Çekme, Donut reçetesi, Cost Analysis, Factory Recipes v2

### Bu Oturumdaki Büyük Katkı
- 🎯 Excel bazlı ₺39.32 hatalı donut maliyeti → Gerçek ₺17.02 (%57 marj) — **2.3× doğrulaştırma**
- 🎯 FO Zelandya gerçek fiyatı keşfedildi (₺300/KG kesin, H-1175-1178 fatura)
- 🎯 143 malzemenin fatura verisi sisteme yüklenmeye hazır
- 🎯 Personel maliyeti SGK dahil gerçek rakama (₺45K/ay ÷ 26 ÷ 8 = ₺216.35/saat)

---

## 🎯 Genel Durum Puanı

| Kriter | Puan | Açıklama |
|--------|:----:|----------|
| **Büyüklük / Kapsam** | **9/10** | 469 tablo, 1732 endpoint, 316 page — production scale |
| **Kod Kalitesi** | **7/10** | `any` kullanımı ve büyük dosyalar sorunlu, ama merge conflict/duplicate yok |
| **Dokümentasyon** | **9/10** | 61 doc, 4 skill dosyası, session handoff dokümanları |
| **Git Hijyeni** | **10/10** | Senkron, temiz, düzenli commit mesajları |
| **Schema Dizaynı** | **9/10** | 23 modüler dosya, drizzle+zod, relation'lar tanımlı |
| **Veri Bütünlüğü (Cost)** | **9/10** | Fatura bazlı senkronizasyon + price history |
| **Test & CI** | **3/10** | 🔴 Kritik eksik — unit test yok, CI pipeline yok |
| **Production Hazırlığı** | **7/10** | Pilot Nisan 2026 Factory+HQ+Işıklar+Lara için yeterli |

### **GENEL ORTALAMA: 7.9/10** — Production-pilot ready, ama test/CI yatırımı acil

---

## 🚀 Önerim (Öncelik Sırası)

### Kısa Vadeli (Bu Hafta)
1. ✅ **Fatura fiyatları senkronizasyon script'ini Replit'te çalıştır** (hazır, bekliyor)
2. ⏳ Replit'ten **detaylı runtime audit raporu iste** (aşağıda instrüksiyon)
3. ⏳ Un + Tuz + Ayçiçek Yağ + Alba fiyatlarını faturadan netleştir (fatura dosyasında yok)
4. ⏳ Cheesecake + Cinnaboom + Brownie maliyetlerini aynı disiplinle çıkar

### Orta Vadeli (Bu Ay — Pilot Öncesi)
5. ⏳ **hr.ts ve factory.ts refactor** — route'lar modüler dosyalara bölünsün
6. ⏳ **Drizzle migration history** açılsın (drizzle-kit generate)
7. ⏳ **Kritik path unit test'leri** eklensin (vitest) — auth, cost-analysis, factory-recipes
8. ⏳ **GitHub Actions CI** kurulsun — minimum `tsc --noEmit` + build check

### Uzun Vadeli (Pilot Sonrası)
9. ⏳ **`any` type cleanup** sprint — 2,549 `any` → proper types
10. ⏳ **Sentry/error monitoring** entegrasyonu
11. ⏳ **E2E test suite** genişletilsin (Playwright)

---

## 📝 Replit Agent'a İstenecek Detaylı Audit Raporu

Aşağıdaki prompt'u Replit Agent'a gönderebilirsin:

```
Runtime Audit Raporu istiyorum. Aşağıdaki kontrolleri yap ve bana her birinin sonucunu raporla:

1. TypeScript Build Check: npx tsc --noEmit çıktısında kaç error var?

2. Database Schema Drift: drizzle-kit check (varsa) çıktısı — schema ile prod DB arasında fark var mı?

3. Broken Imports: server/routes/ ve client/src/pages/ içinde resolve olmayan import var mı?

4. Unused Files: server/ içinde import edilmeyen/hiç kullanılmayan .ts dosyaları liste (özellikle seed-*.ts tekrarları)

5. Console Errors (runtime): server çalışırken ilk 30 saniyede hangi hata/warning'ler basılıyor?

6. Slow Queries: pg_stat_statements varsa en yavaş 10 sorguyu listele. Yoksa Drizzle debug log ile endpoint response time ortalamalarını çıkar.

7. Memory Footprint: Server RAM kullanımı ne kadar (process.memoryUsage())?

8. Bundle Size: npm run build çalıştır — client bundle boyutu ne? 

9. Missing Permissions: module-manifest.ts ile schema-02.ts PERMISSIONS arasında mismatch var mı (bir modül sadece birinde var)?

10. Orphan Routes: server/routes/ içinde tanımlı ama server/index.ts'de register edilmeyen route dosyası var mı?

11. Seed Data Integrity: npx tsx server/scripts/launch-validation.ts çalıştır ve rapor et.

12. Factory Recipe ↔ Product Mapping: 27 ürünün hepsi reçete ile eşleşmiş mi (14/27 değil 27/27 olmalı sonunda)?

Sadece bu 12 maddenin sonuçlarını raporla. Kod değişikliği yapma.
```

Bu prompt'u Replit'e gönder, sana detaylı runtime audit versin. 

---

*Rapor son güncelleme: 18 Nisan 2026, Claude*
