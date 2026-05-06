# 🌙 DEVİR TESLİM — 6 Mayıs 2026 Gece

> **Yarınki Claude (veya aynı ben) için:** Bu dosyayı oku → 4 skill oku → DECIDED.md tara → PENDING.md sırasıyla git.
>
> **EN ÖNEMLİ:** Bu gece bordro mantığında kritik bir BUG yakaladık. Sprint 8d (yarın ilk iş) bunu çözecek.

---

## 🎯 EN ÖNEMLİ DURUM (Tek Bakışta)

**Pilot tarihi:** TBD (Aslan belirleyecek)
**Branch:** main güncel (HEAD: önemli son commit'ler aşağıda)
**Açık branch:** `claude/payroll-net-brut-revision-2026-05-06` (PR henüz açılmadı, doküman PR)
**Bekleyen büyük iş:** Sprint 8d (net/brüt refactor) → Sprint 8e (35 personel UPSERT)

**Kritik Bilgi (D-40 v2):** Aslan netleştirdi — DOSPRESSO'daki TÜM maaş tutarları **NET** (eline geçecek). Brüt sistem hesaplayacak. payroll-engine.ts'te BUG var (net'i brüt'e karşılaştırıyor).

---

## 🚦 SONRAKI CLAUDE'UN İLK İŞİ (Sırasıyla)

### 1️⃣ Mevcut açık branch'i mergele (5 dk)
```
https://github.com/bombty/DOSPRESSO-App/compare/main...claude/payroll-net-brut-revision-2026-05-06
```
- İçerik: Sadece doküman (revizyon planı + D-40 v2)
- Squash and merge
- Aslan'a 1 prompt ver, mergesin

### 2️⃣ Sprint 8d — Kod Refactor (3 saat)
Plan dosyası: `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md` (302 satır, hazır)

Yapılacaklar:
- Yeni: `server/lib/tax-calculator.ts` (TR 2026 vergi sistemi)
- Refactor: `server/lib/payroll-engine.ts` satır 285-303 (asgari ücret kontrolü → NET cinsinden)
- Migration: `payroll_parameters` tablosuna `minimum_wage_net` kolonu (28.075,50 TL)
- UI: `bordrom.tsx` ve `bordro-onay.tsx` brüt + kesintiler tablosu
- Yorum temizlik: `migrations/2026-05-06-position-salaries-lara-seed.sql` (compliance uyarısı yanlış alarmdı)

### 3️⃣ Sprint 8e — 35 Personel UPSERT (45 dk)
Sprint 8d sonrası: Replit'e prompt ver, `migrations/2026-05-05-sprint-8-data-cleanup-personnel-sync.sql` EXECUTE et.

**Risk:** 18 fake şube pasifleştirir + 119 fake personel pasifleştirir + 35 gerçek personel UPSERT eder. Plan mode + isolated agent + pg_dump zorunlu.

Bu migration sonrası:
- ✅ Mahmut, Berkan, Andre, Yavuz, Eren, Sema gerçek isimleri görünür
- ✅ Bordro UUID'ler kaybolur, gerçek isimler gelir
- ✅ "Off: 31" sorunu kalkmaya başlar (PDKS data eklendikçe)

---

## 📊 BU GECE NE YAPILDI

### Sprint 17 — İK Redesign (PR #26 Mergelendi)
- 13 commit, +3500 satır
- /ik-merkezi v2 (Mahmut-first dashboard)
- 5 yeni İK sayfası (izin/mesai/takvim/bordro-onay/onay-kuyrugu)
- payroll-engine dual-model (NET/BRUT bug burada)
- 3 yeni endpoint (me-self-service)
- hr.ts:2187 orphan `});` fix

### Sprint 8a — score_parameters DDL (Replit Task #351 ✅)
- `score_parameters` tablosu (19 kolon — schema'da 18 yazıyor, +1 fazla audit kolonu var muhtemel)
- `score_parameter_history` tablosu (8 kolon)
- 7 index
- Backup: `backups/pre-sprint-8a-ddl-...-schema.sql`

### Sprint 8b — Lara Seed (Replit Task #353 ✅)
- intern (Stajyer) eklendi (33.000 NET)
- Diğer 4 pozisyon zaten vardı (bar_buddy 36K, barista 41K, sup_buddy 45K, supervisor 49K)
- **Önemli bulgu:** Schema'da UNIQUE constraint yokmuş → Replit Task #353'te WHERE NOT EXISTS pattern kullandı
- Backup alındı

### Sprint 8c — UNIQUE Constraint (Replit Task #354 ✅)
- ALTER TABLE ADD CONSTRAINT position_salaries_code_effective_unique
- Idempotent (DO block ile)
- Sprint 8b sorununu kalıcı çözdü
- Backup alındı

### Net/Brüt Bug Tespiti + Revizyon Planı
- `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md` yazıldı (302 satır)
- D-40 v2 revize edildi (eski v1 audit trail için kaldı)
- Branch push'lı, PR açılmadı (Aslan açacak)

### Handoff Dosyası
- `docs/HANDOFF-TO-CLAUDE-CODE-2026-05-06.md` (538 satır, Claude Code için)
- Aslan denedi, "anlamadığım şekilde ilerliyor" deyip mevcut sisteme döndü
- Triangle Workflow korundu (Sen + Replit + Claude)

---

## 🚨 KRİTİK BUG (Yarın İlk İş)

### `server/lib/payroll-engine.ts` satır 285-303

```typescript
// MEVCUT (BUG'lı — Sprint 17'de yazılmış):
const minWageGross = await getMinimumWageGross(year, month);  // BRÜT
if (resolvedTotal < minWageGross) {  // resolvedTotal NET (DB'den), minWageGross BRÜT
  // ❌ NET → BRÜT karşılaştırma, MATEMATIK YANLIŞ
}
```

**Sonuç:** Stajyer 33.000 NET → kod yanlış olarak 33.030 (BRÜT) yazıyor.

**Doğru Mantık:**
- DB tüm maaşlar NET (D-40 v2)
- Brüt asgari = 33.030 TL → Net asgari = ~28.075,50 TL (TÜRMOB 2026)
- Karşılaştırma NET cinsinden olmalı: `if (resolvedTotal < minWageNet)`
- Brüt + kesintiler hesabı `tax-calculator.ts` modülünde

**Detaylı plan:** `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md`

---

## 🔑 TR 2026 Vergi Hızlı Referans

```
Brüt Asgari:    33.030,00 TL (RG 26.12.2025/33119)
Net Asgari:     28.075,50 TL (TÜRMOB resmi)

SGK İşçi:       %15 (SGK 14% + İşsizlik 1%)
Damga Vergisi:  %0.759 (binde 7.59)

Gelir Vergisi 2026 Dilimleri:
  0-158.000:        %15
  158-330.000:      %20
  330-1.200.000:    %27
  1.200-4.300.000:  %35
  4.300.000+:       %40

Asgari Ücret Vergi İstisnası:
  Brüt asgari ücret kısmı gelir+damga vergisinden muaf
  AGİ kaldırıldı (2022)

Basit dönüşüm (asgari bandında):
  Net = Brüt × 0.85 → Brüt = Net / 0.85
```

---

## 📂 GUARDRAIL DOSYALARI (Yarın İlk Açılır)

1. **Bu dosya** — `docs/DEVIR-TESLIM-6-MAYIS-2026-GECE.md`
2. **Revizyon planı** — `docs/PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md`
3. **DECIDED.md** — D-40 v2 + 41 toplam karar
4. **PENDING.md** — Sprint 8d → 8e öncelik akışı (güncellemem lazım)
5. **TODAY.md** — 6 May içeriği (güncellemem lazım)

---

## 🔧 TEKNİK DURUM

**Repo:** `bombty/DOSPRESSO-App`
**Default branch:** `main` (HEAD: post-Sprint 8c)
**Açık branch'ler:**
- `claude/payroll-net-brut-revision-2026-05-06` (push'lı, PR yok — Aslan açacak)

**DB Durum (6 May 03:30 itibarıyla):**
- ✅ score_parameters tablosu var (Sprint 8a)
- ✅ score_parameter_history tablosu var
- ✅ position_salaries: 19 satır, 5'i Lara (intern dahil)
- ✅ position_salaries UNIQUE constraint aktif (Sprint 8c)
- ❌ payroll_parameters.minimum_wage_net henüz yok (Sprint 8d)
- ❌ 35 gerçek personel UPSERT henüz yok (Sprint 8e)
- ⏳ 119 fake personel hâlâ aktif (Sprint 8e ile pasifleşecek)
- ⏳ 18 fake şube hâlâ aktif (Sprint 8e ile pasifleşecek)

**Replit Task'ları:**
- #351 (Sprint 8a) DONE
- #353 (Sprint 8b) DONE
- #354 (Sprint 8c) DONE
- #355 (eski premise — Stajyer fallback) PROPOSED — IPTAL EDİLECEK Sprint 8d'de
- #353 (Sprint 8 ana data-cleanup) CANCELLED — yeni Task gerekecek Sprint 8e'de

---

## 🤝 YARINKI AÇILIŞ MESAJI

Aslan ertesi gün açtığında muhtemelen yazacak:
> "Selam, kaldığımız yerden devam edelim."

Senin cevabın:
```markdown
✅ Bu dosyayı okudum (DEVIR-TESLIM-6-MAYIS-2026-GECE.md)
✅ Net/brüt revizyon planını okudum (PAYROLL-NET-BRUT-REVISION-PLAN-2026-05-06.md)
✅ DECIDED.md D-40 v2 taradım
✅ Branch state taradım

## Sırada
1. Açık PR mergele (revizyon planı doküman, sadece dokümana onay)
2. Sprint 8d başla — kod refactor (~3 saat)
3. Sprint 8e — 35 personel UPSERT

Hangisinden başlayalım? Çay/kahve almışsın umarım, çünkü Sprint 8d 
biraz konsantrasyon ister 😊
```

---

## 💪 BUGÜNKÜ BAŞARI ÖZET

✅ İK Redesign Sprint 17 (büyük) mergelendi
✅ Sprint 8a/8b/8c (3 küçük migration) mergelendi
✅ Schema sağlamlaştı (UNIQUE constraint)
✅ Bordro mantığında kritik bug yakalandı (production'a gitmeden!)
✅ Net/brüt revizyon planı hazırlandı
✅ Triangle Workflow korundu

Toplam bu gece: **17+ commit**, **~6 saatlik mesai**.

---

**Hazırlayan:** Claude (claude.ai web/iPad)
**Tarih:** 6 May 2026, 03:30
**Sonraki çalışma:** Yarın (sakin kafayla, 3-4 saatlik blok)
**Aslan'a not:** İyi geceler, harika iş çıkardın 🌙
