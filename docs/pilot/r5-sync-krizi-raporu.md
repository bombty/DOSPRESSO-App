# R-5 Sync Krizi Raporu — Claude'a İletilmek Üzere

**Tarih:** 23.04.2026, akşam
**Yazan:** Replit Agent (Aslan onayıyla)
**Durum:** 🚨 ACİL — R-5B smoke test denendi, bloke oldu

---

## Tek cümleyle

**Local repo (Replit ortamı) ve `origin/main` (GitHub) birbirinden 39 commit ayrışmış durumda; iki taraf da push/pull yapmamış, R-5 smoke testi çalışmıyor çünkü Claude'un kodu Replit ortamında yok.**

---

## Tam tablo (`git rev-list --left-right --count HEAD...origin/main`)

| | Sayı | İçerik |
|---|---|---|
| **Local'de var, origin'de YOK (push edilmemiş)** | **34 commit** | Replit'in son ~12 saat içinde merge ettiği TÜM task'lar |
| **Origin'de var, local'de YOK (pull edilmemiş)** | **5 commit** | Claude'un Sprint R-5 push'ları |

### Local-only commit listesi (en yenisi en üstte)

```
4d0021501 Add backend functionality for recipe cost recalculation
34e61e07c Update project status and task assignments
1a8b9d4bc Task #187: Etiket basımlarını kayıt altına al ve denetim için raporla
9035ec4ff Etiket PDF: ürün QR kodu + üretim bilgileri (Task #186)
265565526 Task #177: Toplu malzeme akışında eksik besin değer doldurma diyaloğu
f173058fc Task #183: Besin değer kayıtları için denetim defteri (audit history)
f019121fa Task #173: Reçete onayında değişiklik öncesi/sonrası gramaj farkı raporu
649c98e35 Task #182: Toplu içe aktarımı yedekle/geri al desteği
daac1d758 Task #171: Onaylanmamış reçete haftalık özet bildirimi
d985cf888 Task #174: Etiket basım PDF'ine "Gıda mühendisi onaylı" damgası ekle
c78ed3765 Task #181: Reçete toplu içe aktarma için CSV şablon indirme butonu
25e9e221c Task #184: Restrict nutrition editing to gida_muhendisi/admin/recete_gm
a90c403b5 Task #166: Toplu malzeme bulk endpoint'inde nutrition desteği
162b94001 Task #154: Onay panelinde geçmiş onayların listesi ve filtrelemesi
89293c5bb Task #160: Reçete malzemelerini Excel/CSV'den toplu içe aktarma
835bd63f3 Task #164: Reçete onay durumunu yapılandırılmış kolonda tut
bfd11630e Task #162: Eksik veri uyarılarına "Düzelt" kısayolu eklendi
245a2da82 Task #165: Mevcut besin değerleri girilmiş malzemeyi düzenleyebilme
+ 16 daha (Task #202, #155, #156, #157, #158, #159, #163, #167, #168, #175, vs.)
```

### Origin-only commit listesi (Claude'un push'ları)

```
19091e56c docs(replit.md): Sprint R-5 backend tamamlandı - durum güncel
4716ebb8d feat(r-5b): Maliyet recalc service + HTTP endpoint'leri + audit fix
d631ed2ba feat(r-5a): Backend endpoint'leri - malzeme + adim CRUD tam
3abb34271 feat(r-5d): Musteri yuzu public alerjen + besin sayfasi
ed4d9d753 docs(pilot): Replit'e durum sorusu + koordinasyon istegi
```

---

## Smoke test neden çalışmadı

R-5B (`commit 4716ebb`) için Claude'un push ettiği:
- `server/services/factory-recipe-cost-service.ts` → **Replit ortamında dosya YOK**
- `POST /api/factory/recipes/:id/recalc-cost` → route register yok
- `POST /api/factory/recipes/bulk-recalc` → route register yok

Curl çağrıları Vite catch-all'a düştü (HTML döndü). `factory_recipe_price_history` tablosu hâlâ 0 satır.

---

## Çakışma riski (pull/merge yapılırsa)

Garantili conflict olacak dosyalar:

| Dosya | Local taraf | Origin taraf | Çözüm zorluğu |
|---|---|---|---|
| `replit.md` | Bugün öğle Replit edit'i (R-5B "smoke test bekliyor") | Claude `19091e5` ("backend %100 MERGED") | KOLAY (manuel birleştir) |
| `server/routes/factory-recipes.ts` | Tasks #160 (bulk import + snapshot), #166 (nutrition payload), #177 (missingNutrition), #182 (snapshot transaction), #173 (gramaj diff helpers), #164 (approvals tablosu endpoint'leri), #184 (NUTRITION_EDIT_ROLES) | R-5A: DELETE ingredient + steps CRUD (4 yeni endpoint) | ORTA — append-only birleşim mümkün, dikkat: PATCH yetki fix Claude'da |
| `server/routes/factory-allergens.ts` | #171 weekly-summary + #187 print-log endpoints | R-5D public + besin endpoint'i | ORTA — 3 farklı feature, append-only |
| `client/src/pages/fabrika-recete-duzenle.tsx` | Tasks #152, #160, #164, #165, #166, #177, #181, #182, #184 (8 katman state hook + dialog) | Claude bu dosyaya dokunmadı (R-5A frontend'e başlamamış) | YOK — Replit kazanır |
| `client/src/pages/kalite-alerjen.tsx` | #145, #155, #157, #158, #159, #162, #186, #187, #202 | Claude dokunmadı | YOK — Replit kazanır |
| `client/src/App.tsx` | (büyük ihtimal dokunulmadı) | R-5D `/m/alerjen` route eklendi | YOK — Claude kazanır |
| `shared/schema/schema-22-factory-recipes.ts` | #164 approvals + #182 snapshots + #183 nutrition history (3 yeni tablo) | (büyük ihtimal dokunulmadı) | YOK — Replit kazanır |

---

## Önerilen merge stratejisi

### Adım 1 — Backup
```bash
git branch backup/local-23apr-evening   # local 34 commit'i koru
```

### Adım 2 — Pull --no-rebase (merge commit oluştur)
```bash
git pull origin main --no-rebase
# Conflict beklenir: replit.md, factory-recipes.ts, factory-allergens.ts
```

### Adım 3 — Conflict çözüm kuralı
- `replit.md` → her iki tarafın bilgilerini birleştir, Claude'un "Sprint R-5 backend %100 MERGED" satırı **doğrudur**, üstüne 16 Replit task'ı da listelenmeli
- `factory-recipes.ts` → Claude'un yeni endpoint'lerini Replit endpoint'lerinin SONUNA ekle, mevcut nutrition mantığını koru
- `factory-allergens.ts` → aynı strateji, append-only
- `factory-recipes.ts` PATCH yetki fix'i (Claude tarafı) → KORU

### Adım 4 — Push
```bash
git push origin main
```

### Adım 5 — Smoke test (ben Replit, Aslan Build mode aldı)
```bash
# Önce adminhq parolasını öğren (env değil — rotate olmuş)
# 1. Tekil recalc: POST /api/factory/recipes/1/recalc-cost
# 2. Bulk recalc: POST /api/factory/recipes/bulk-recalc -d '{"onlyUnpriced":true}'
# 3. Yetki: sef → tekil OK, bulk 403; barista → ikisi de 403
```

---

## Replit'in yaptığı varsayımlar (Claude doğrulasın)

1. **PATCH ingredient yetki fix** (Claude `d631ed2`'de yaptım dedi: "recete_gm + sef eklendi") → local'de mevcut PATCH route hangi rolleri kabul ediyor? Conflict'te Claude tarafı **mutlaka korunmalı**.

2. **Adım CRUD** (POST/PATCH/DELETE `/recipes/:id/steps`) → Replit local'de `factoryRecipes.steps` array kolonuyla mı yoksa ayrı `factory_recipe_steps` tablosuyla mı çalışıyor? Eğer Claude yeni tablo kullandıysa migration script de origin'de olmalı, kontrol edilmeli.

3. **R-5D public endpoint** (`/api/public/recipes/:slug`) — rate limit middleware (30/dk) hangi paketi kullanıyor? `express-rate-limit` package.json'da var mı?

---

## Aslan'ın kararı bekleniyor

A) **Replit Agent merge'ü yapsın** (45 dk, riskli ama hızlı, Aslan canlı izlesin)
B) **Claude rebase yapsın** (Claude çakışan dosyaları Replit'in yaklaşımıyla yeniden yazsın)
C) **Yarın sabah beraber otur** (kalan 12 gün rahat, panik yok, canlı koordinasyon en güvenli)

**Replit önerisi: B** — çünkü Claude orijinal yazarı, niyet bilgisini koruyor; Replit Build mode'da edit/test yapmaktansa Plan mode'da gözleyebilir.

---

## Bu raporun konumu

- Dosya: `docs/pilot/r5-sync-krizi-raporu.md`
- Local commit'ten sonra push gerekli ama bu dosyanın push'u **da** yukarıdaki conflict çözümünden sonra olmalı
- Aslan bu dosyayı Claude'a manuel iletecek (örn. Cursor mesajı)
