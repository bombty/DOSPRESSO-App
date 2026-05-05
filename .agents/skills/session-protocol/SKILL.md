---
name: session-protocol
description: DOSPRESSO oturum sonu zorunlu protokolü (Çalışma Sistemi v2.0). Her oturum sonunda 5 adım sırasıyla uygulanmalıdır. "Bu oturumda hiçbir skill değişmedi" demek neredeyse imkansızdır.
---

# DOSPRESSO Çalışma Sistemi v2.0 — Oturum Sonu Protokolü

## 🆕 Son Değişiklik Özeti (6 May 2026 — İK Redesign Sprint 17)

> **Yeni Claude için:** v2.1 update. **6. perspektif eklendi (D-39, 6 May).**

**5 Zorunlu Adım (her oturum sonu — değişmedi):**
1. 4 skill dosyasını güncelle (architecture/debug/quality + bu)
2. `docs/TODAY.md` güncelle
3. `docs/PENDING.md` güncelle
4. `docs/DECIDED.md` yeni karar varsa ekle
5. `docs/DEVIR-TESLIM-X-MAYIS-2026.md` yeni dosya yaz (büyük oturumlar için)

**6-Perspektif Review** (her major commit/karar — D-39 ile genişledi):
1. **Principal Engineer** — kod kalitesi, mimari
2. **Franchise F&B Ops** — operasyonel etki
3. **Senior QA** — test edilebilirlik
4. **Product Manager** — UX, ürün stratejisi
5. **Compliance** — İş Kanunu, gıda mevzuat, KDV/AGI, KVKK
6. **End User (Persona-Specific)** ← YENİ (6 May 2026)

### 6. Perspektif: End User (Persona-Specific) Detayı

**Neden eklendi:** Mevcut 5 perspektif "uzman gözü" — kod/ops/QA/UX teorisi/hukuk. Eksik olan: **gerçek kullanıcının yaşadığı an**. Product Manager perspektifinden FARKLI: PM "tasarım stratejisi", End User "fiili deneyim".

**DOSPRESSO Personas:**

| Persona | Rol | Cihaz | Bağlam | Kritik Sorular |
|---|---|---|---|---|
| **Aslan** | CEO | Bilgisayar/iPad | Genel yönetim, IT uzmanı değil | "Komut net mi? Karar gerek mi?" |
| **Mahmut** | muhasebe_ik | Bilgisayar | Ay sonu, Excel'den geçiş | "Yeni sistem 30 dk eğitimle öğrenilir mi?" |
| **Berkan** | barista (Lara) | Cep telefonu | Mola arası 5 dk | "Form 4 tıkta mı bitiyor?" |
| **Andre** | mudur (Lara) | Telefon+tablet | Sabah açılış | "Bugün kim izinde 1 ekranda mı?" |
| **Yavuz** | coach (19 şube) | Bilgisayar | Haftalık review | "19 şube tek ekran sıkışık mı?" |
| **Eren** | fabrika_mudur | Tablet | Üretim arası | "Personel+bordro 1 yerde mi?" |
| **Sema** | gida_muhendisi/recete_gm | Bilgisayar | Reçete + besin gözden geçir | "Gizli formül role'u doğru mu?" |

**Uygulama:**
- Her major UI/UX değişikliği: 6 perspektif tablosu zorunlu
- API/schema değişikliği: 5 perspektif yeterli, End User mental check
- Bug fix tek satır: mental check yeterli

---

## ⚙️ Triangle Workflow (D-01)

**Aslan = Owner** — karar, business, GitHub PR merge, **IT uzmanı değil**:
- Şu an Excel/WhatsApp/kağıt kullanan birine geçişi kolaylaştırır
- Komutlar net, kopyala-yapıştır şeklinde verilmeli
- Çok seçenek = paraliz; net öneri ile karar kolaylaştır

**Claude = Mimari + Kod + GitHub push** — **Replit'in yapamadığı her şey**:
- Plan, tasarım, kod yazımı, GitHub branch + PR push
- Replit Build mode'da git destructive komutları engellendiği için branch switch Aslan'da

**Replit = DB + build + test + smoke test:**
- Plan mode + isolated agent: DB write, schema, migration, env
- Build mode: kod editi, doc, test, build verification
- Aslan + Claude'un yaptığı işin doğrulaması

---
- Replit = Main agent (build, plan/build mode, isolated task agent)
- Claude (ben) = Architecture, code, GitHub push, skill update

**Plan/Build Mode:**
- DB write/schema/migration → Plan mode + isolated agent + backup
- Docs/UI/code edit → Build mode OK
- Plan mode'da git mutating yasak (push/commit/checkout)

**5 May Incident Dersi:**
- Conflict resolve → Replit Resolve UI VEYA `git checkout <hash> -- <files>` (asla `git add -A && git commit` conflict varken)
- Token → asla dosyaya yazma (D-05), sadece konuşmada

---

## ZORUNLU — Her Oturum Sonunda (5 Adım, Sırasıyla)

"Bu oturumda hiçbir skill değişmedi" demek neredeyse **IMKANSIZDIR**.
- Kod yazdıysan → en az `dospresso-architecture` güncellenmeli (sayılar değişti)
- Bug çözdüysen → `dospresso-debug-guide` güncellenmeli
- Yeni kontrol gerekiyorsa → `dospresso-quality-gate` güncellenmeli
- Workflow değiştiyse → bu dosya (`session-protocol`) güncellenmeli

---

## Adım 1 — Devir Teslim Yaz + Push

```bash
git add -A
git commit -m "fix/feat: [konu] — [özet]"
git push origin main
```

> Not: Token gerektiren durumlarda AGENTS.md §1 "Push Komutu" bölümüne bakın.
> Token'ı doğrudan komuta gömmeyin — repo push reject eder.

Commit mesajı formatı:
- `fix:` → hotfix (typo, import, SQL ALTER TABLE)
- `feat:` → yeni özellik (IT sprint commit pull)
- `docs:` → sadece skill/döküman güncelleme

---

## Adım 2 — 4 Skill Dosyasını Güncelle

| Skill | Ne Zaman Güncellenir? | Örnek Değişiklik |
|---|---|---|
| `dospresso-architecture` | Tablo/endpoint/rol/sayfa sayısı değişti | "29 Roles" → "31 Roles" |
| `dospresso-debug-guide` | Yeni bug tespit edilip çözüldü | §17 Drizzle kolon uyuşmazlığı |
| `dospresso-quality-gate` | Yeni kontrol maddesi gerekti | Madde 19: Schema-DB sync |
| `session-protocol` | Workflow'un kendisi değişti | Bu adımlar güncellenirse |

### Güncelleme Kontrol Listesi:

**dospresso-architecture:**
- [ ] Rol sayısı doğru mu? (şu an: 29)
- [ ] `pages/` sayısı doğru mu? (şu an: 311)
- [ ] `routes/` sayısı doğru mu? (şu an: 110)
- [ ] Schema dosyası sayısı doğru mu? (şu an: 16)
- [ ] Yeni tablolar "New Tables" bölümünde mi?
- [ ] Yeni route dosyaları "New Route Files" bölümünde mi?
- [ ] Yeni modül "Completed Modules" bölümünde mi?

**dospresso-debug-guide:**
- [ ] Yeni hata tipi Quick Triage tablosuna eklendi mi?
- [ ] İlgili §N bölümü yazıldı mı?

**dospresso-quality-gate:**
- [ ] Yeni madde eklendi mi?
- [ ] Başlık ve description'daki rakam güncellendi mi?
- [ ] Rapor şablonundaki sıra güncellendi mi?

---

## Adım 3 — GitHub docs/ Güncelle

```bash
# Değişiklik varsa:
git add docs/
git commit -m "docs: [konu] güncellendi"
git push origin main
```

| Dosya | Ne Zaman? |
|---|---|
| `docs/CALISMA-SISTEMI.md` | Süreç/workflow değişikliği |
| `docs/BUSINESS-RULES.md` | Yeni iş kuralı keşfi |
| `docs/sprint-planlar/` | Sprint tamamlandı veya değişti |

---

## Adım 4 — Memory Güncelle (replit.md)

`replit.md` dosyasına şunları yaz:
- Son başarılı commit hash
- Kritik keşifler (DB mismatch, route sorunu, yeni kural)
- Bekleyen maddeler listesi

---

## Adım 5 — Replit Talimatı Hazırla

Bir sonraki oturum başına bağlam notu:

```
Sprint: R-X
Son commit: [hash]
Bekleyen sorunlar:
  - [sorun 1]
  - [sorun 2]
Test edilmesi gereken endpoint'ler:
  - POST /api/factory/[endpoint]
  - GET /api/[module]/[endpoint]
Önemli dosyalar:
  - server/routes/[router].ts
  - client/src/pages/[page].tsx
```

---

## Sık Atlanan Hatalar

1. **Architecture sayıları güncellenmez** → Bir sonraki oturum yanlış bilgiyle başlar
2. **Debug-guide'a §N eklenmez** → Aynı bug sonraki sprintte tekrar zaman alır
3. **Quality-gate madde eklenmez** → Aynı kontrol atlanmaya devam eder
4. **Commit mesajı genel kalır** → IT danışman ne yapıldığını anlamaz
5. **Bekleyen maddeler yazılmaz** → Oturum kapandığında kaybolur

---

## Güncel Sistem Durumu (03.05.2026 itibarıyla)

| Metrik | Değer |
|---|---|
| Roller | 31 |
| Sayfalar | 311 |
| Route dosyaları | 110 |
| Schema dosyaları | 16 |
| Quality Gate maddeleri | 19 |
| Debug guide bölümleri | §24 |
| Son Sprint | TASK #117 (tamamlandı — Donut seed + senaryo API) |
| Son commit | ce3635317 (hotfix: seed-donut-recipe-v2 ref_id + expected_unit_weight_unit) |
| Bekleyen | Task #92 fabrika_depo erişim sorunu (HR_ACCESS_DENIED leftovers/inventory), Task #93 düşük stok→satınalma, Task #94 LOT&SKT girişi |
| Güncel Değerler | 31 rol, 305 sayfa, 262 route (App.tsx), 23 schema, 455 pgTable, §24 debug, 35 quality-gate |

---

## Feature Freeze Politikası (18.04.2026 — 8 haftalık pilot hazırlık)

**18 Nisan 2026 → 15 Haziran 2026** arasında **yeni özellik geliştirilmez**. Sadece:
- ✅ Kırık bug fix
- ✅ Veri konsolidasyonu
- ✅ Test yazma
- ✅ Observability ekleme
- ❌ Yeni modül / yeni tablo / yeni özellik

### Aslan'dan Yeni Özellik İsteği Geldiğinde:

Örnek: "Cinnaboom maliyet hesabı", "Yeni CRM widget", "Brownie reçete ekle"

**Cevap şablonu:**
> "Bu istek Sprint I (9. hafta, 16 Haziran sonrası) backlog'una eklendi. Şu an Sprint [X] kapsamında [konu] üzerinde çalışıyoruz. Feature Freeze politikası gereği yeni özellik sırada bekliyor."

### İstisnalar (Freeze'e aykırı değil):
- **Kritik güvenlik fix** (A4 seed safeguard gibi)
- **Kırık link düzeltmesi** (A1)
- **Veri konsolidasyon** (Sprint B — 3 puantaj → 1)
- **Mevcut veri kalibrasyonu** (fatura fiyat senkronizasyonu gibi)

### Commit Mesajı Ön Ekleri (Freeze döneminde):
- ✅ `fix(security):` — güvenlik patch
- ✅ `fix:` — bug fix
- ✅ `chore(data):` — veri senkronizasyon/migration
- ✅ `docs:` — dokümantasyon
- ✅ `refactor:` — kod temizliği
- ✅ `test:` — test yazma
- ❌ `feat:` — yeni özellik **YASAK** (istisnalar: Sprint hedefi + roadmap referansı)

### Her Commit Öncesi Check:
```bash
# Son commit mesajını kontrol et
git log -1 --pretty=%s | grep -E "^(fix|chore|docs|refactor|test)" || echo "⚠️ FEATURE FREEZE İHLALİ — prefix değişti mi?"
```

---

## 8 Haftalık Yol Haritası Referansı

**Her oturum başında ilk okunacak:**
`docs/PILOT-HAZIRLIK-8-HAFTA-YOL-HARITASI.md`

**Mevcut sprint durumu:**
- **Sprint A** (21-27 Nisan): Stop the Bleeding — 🟡 %33 (A2, A4 tamam)
- **Sprint B** (28 Nisan-4 Mayıs): Veri konsolidasyon
- **Sprint C** (5-11 Mayıs): Akademi + CRM
- **Sprint D** (12-18 Mayıs): Satınalma + Bordro
- **Sprint E** (19-25 Mayıs): Dashboard + Rol temizliği
- **Sprint F** (26 Mayıs-1 Haziran): Test + CI/CD
- **Sprint G** (2-8 Haziran): Performans
- **Sprint H** (9-15 Haziran): Observability

**12 KPI Hedef** (şu an 2/12 yeşil, final: 12/12)

---

## İletişim Modu — "SANA + REPLIT'E" Formatı (18.04.2026)

Aslan, Claude'un yazdıklarını **doğrudan Replit Agent'a kopyalıyor.** Bu nedenle her yanıt **iki bölümlü** olmalı:

### 🧑‍💼 SANA (Aslan'a) özet:
- Kısa Türkçe özet
- Ne oldu, hangi kararı vermesi gerekiyor
- Teknik detaylar (ama özlü)

### 🤖 REPLIT'E GÖNDERİLECEK:
- Kod bloğu içinde (``` ile çevrili)
- Net komutlar, net soru
- Kopyala-yapıştır hazır, yorum yok
- Acceptance kriterleri dahil

**Örnek:**
```
🤖 REPLIT'E GÖNDERİLECEK:

[Task adı]
cd /home/runner/workspace && git pull --rebase && \
npx tsx server/scripts/X.ts && \
echo "Beklenen: ..."

Acceptance: ...
```

### Task Planı Sunulduğunda:
- Replit **doğru task planı** hazırladıysa → Aslan doğrudan butona basar, metin göndermeye gerek yok
- Task planı **yanlış/eksikse** → Claude düzeltme metni hazırlar, Aslan Replit'e yapıştırır

---

## Replit ↔ Claude Maliyet Optimizasyonu (18.04.2026)

**Replit'e gönderilecek:** Sadece **DB migration + build + API test + frontend open test** (~30 satır max).

**Claude yapar (Replit'e gitmez):**
- Kod validation (manifest vs schema)
- Skill güncellemeleri
- Audit raporları analizi
- Numerical check (tablolar, rakamlar)
- Dokümantasyon
- Sprint planlama

**Hesaplama:** Replit'e giden iş ~%40-50 azalır, agent maliyeti düşer, Claude daha etkin kullanılır.

---

## Oturum Sonu Kontrol Listesi (Güncellenmiş)

```bash
# 1. Tüm skill güncellemeleri commit edildi mi?
git status --short .agents/skills/

# 2. Skill'ler aynı tarihte mi?
for s in dospresso-architecture dospresso-debug-guide dospresso-quality-gate session-protocol; do
  stat -c "%y %n" .agents/skills/$s/SKILL.md
done

# 3. Son commit Feature Freeze uyumlu mu?
git log -1 --pretty=%s | grep -E "^(fix|chore|docs|refactor|test)"

# 4. Push tamam mı?
git status  # "up to date with origin/main" olmalı
```

4/4 ✅ olmadan oturum kapanmaz.

---

## 18.04.2026 Güncellemesi — Feature Freeze Politikası + Replit Task Pattern

### Feature Freeze (18 Nisan → 15 Haziran 2026)

**8 haftalık sprint boyunca yeni özellik geliştirilmez.** Sadece:
- ✅ Kırık bug fix (P0/P1)
- ✅ Veri konsolidasyonu (3→1 tablolar)
- ✅ Test yazma
- ✅ Observability ekleme
- ❌ Yeni modül / yeni tablo / yeni sayfa / yeni endpoint

**Aslan'dan gelen yeni özellik isteği** (ör. Cinnaboom maliyet analizi, yeni dashboard widget) → nazikçe "Sprint I (9. hafta) backlog'una ekliyorum" de.

**İstisna:** Kritik güvenlik fix (A4 seed guards gibi), mevcut özellik bug fix (kırık link), veri düzeltme (recipe↔product mapping). Bunlar Sprint A-H kapsamında zaten var.

Referans: `docs/PILOT-HAZIRLIK-8-HAFTA-YOL-HARITASI.md`

### Replit Task İş Akışı (18 Nisan pratiği)

Replit'e büyük iş gönderirken:

1. **Claude → Net plan yazar** (mesajın içinde "REPLIT'E GÖNDERİLECEK" bölümü)
2. **Aslan → Kopyala-yapıştır** Replit Agent'a gönderir
3. **Replit Agent → Plan mode'da task hazırlar** (Done looks like + Steps + Out of scope + Acceptance)
4. **Aslan → Build butonuna basar** (metin yapıştırmadan, sadece onaylar)
5. **Replit → Sırayla uygular** + rapor döner
6. **Aslan → Raporu Claude'a iletir**
7. **Claude → Değerlendirir**, commit + skill güncellemesi yapar

**Kritik:** Task planı mükemmelse, metin yapıştırmak yerine doğrudan Build butonuna basılır. Replit Agent'ın kendi task planı Claude'unkinden iyi olabilir — pattern match et.

### İletişim Formatı (Aslan Tercihi)

Mesajlar **iki bölüm** halinde hazırlanır:

```
🧑‍💼 SANA (Aslan'a) özet
(Kısa Türkçe özet — karar gereken noktalar, durum)

🤖 REPLIT'E GÖNDERİLECEK
(Net komut + blok kod + kopyala-yapıştır hazır)
```

Aslan Replit'e iletmek için benim yazdıklarımı direkt kopyalar, o yüzden **Replit'e hitap eden kısım metin temiz** olmalı.

### Bu Oturumdaki Örnek Disiplin İhlali ve Düzeltmesi

**İhlal:** Recipe↔Product mapping tamamlandıktan sonra Cinnaboom maliyet hesabına geçtim — "mevcut özellik, yeni değil" bahanesiyle.

**Aslan'ın müdahalesi:** Replit audit raporunu tekrar gönderdi, hatırlattı.

**Düzeltme:** Cinnaboom Sprint I'ya ertelendi. Sprint A maddeleriyle devam edildi (A4 seed security tamamlandı).

**Ders:** Feature Freeze = sadece yeni tablo/route eklememek değil, **yeni hesaplama/doküman/feature de** eklememek. Mevcut sprintin kapsamı neyse ona sadık kal.

---

## Oturum Sonu Kontrol Listesi — 18 Nisan Revizyon

```bash
# 1. Skill tarihleri son 1 saat içinde mi?
for s in dospresso-architecture dospresso-debug-guide dospresso-quality-gate session-protocol; do
  echo "=== $s ==="
  stat -c "%y" .agents/skills/$s/SKILL.md
done

# 2. 4/4 skill güncellendi mi? (eğer bu oturumda kod yazıldıysa)
git log -1 --name-only | grep -E "SKILL\.md$" | wc -l  # ≥1 olmalı (sadece docs-only oturumu ise 0 OK)

# 3. Commit mesajı Feature Freeze uyumlu?
git log -1 --pretty=%s | grep -vE "^feat:" || echo "⚠️ feat: commit — Feature Freeze ihlal riski"

# 4. Push tamam?
git fetch && git status  # up to date with origin/main

# 5. Bugünkü oturum transkripti journaled mi?
ls /mnt/transcripts/ | tail -3
```

5/5 ✅ = oturum temiz kapanır.

---

## 🆕 UPDATE (5 Mayıs 2026, Gece) — Sprint 7-16 Mega Maraton Sonrası

### YENİ KURAL: DEVIR-TESLIM Dosyası ÖNCELİKLİ

Yeni oturum açıldığında, **kullanıcı bir şey yazmadan ÖNCE**, eğer mevcut ise:

```
docs/DEVIR-TESLIM-{tarih}-{vakit}.md
```

dosyasını **OKU**. Bu dosya:
- Önceki oturumun tam özeti
- Aktif sprint durumu
- Bekleyen işler
- Kritik tuzaklar
- Aslan'a sorulacak ilk soru

şeklinde **100% hafıza** sağlar. TODAY/PENDING/DECIDED'tan önce gelir.

### Devir Teslim Yazma Kuralları (Session End)

Her büyük oturum sonunda (özellikle 5+ commit yapıldığında):

1. **`docs/DEVIR-TESLIM-{DD-AY-YYYY}-{SABAH/AKSAM/GECE}.md`** yaz
2. İçerik şablonu:
   - 🎯 EN ÖNEMLİ DURUM (tek bakışta özet)
   - 🚦 SONRAKİ CLAUDE'UN İLK İŞİ (numbered list)
   - 📊 BUGÜN NE YAPILDI (sprint × commit tablosu)
   - 🎯 ASLAN'IN TÜM TALEPLERİ KARŞILIĞI (✅/⏳ tablo)
   - 🔴 BEKLEYEN İŞLER (kritik / önemli / backlog)
   - 🛠️ TEKNİK STACK + KIMLIK DEĞERLERİ (her seferinde tekrar)
   - 📋 PLATFORM METRİKLERİ
   - 🔑 SCHEMA TUZAKLARI (UNUTMA!)
   - 👥 ROL TANIMLARI
   - ⚙️ ÇALIŞMA SİSTEMİ KURALLARI
   - 🚨 SON 24 SAATTE ÖĞRENİLEN DERSLER
   - 📁 ÖNEMLİ DOSYA YOLLARI
   - 🤝 SONRAKI OTURUM AÇILIŞ KONUŞMASI ÖRNEĞİ
   - 🔚 KAPANIŞ KONTROL LİSTESİ
3. TODAY.md, PENDING.md, DECIDED.md güncellemelerini de aynı oturumda yap
4. Hepsi tek commit'te git push

### Compaction Sonrası Davranış

Eğer transkript compact edilmişse (`/mnt/transcripts/...txt`):
1. Compaction summary'yi oku (sistem otomatik gösterir)
2. DEVIR-TESLIM dosyasını oku (en güncel)
3. **Sonra** kullanıcının mesajına cevap ver
4. Eksik bağlam varsa transkript dosyasından detay çek (`view` tool ile incremental)

### Triangle Workflow Hatırlatması

Her oturum başında sun: "Önceki oturumda Replit ne yaptı?" Çünkü:
- Replit local commit'leri remote'ta görünmeyebilir (push yapmadıysa)
- Replit conflict resolve sırasında bir şeyler bozmuş olabilir (5 May vakası: 30 marker)
- `git fetch` + `git log --oneline origin/main..HEAD` ile **HER SESSION BAŞINDA** doğrula

### Yeni Risk Sinyalleri (5 May Vakası Sonrası)

Aşağıdakilerden biri varsa ÖNCE `git status` + marker kontrolü yap:

```bash
# Her oturum başında (Replit'in commit yaptığı gün):
grep -rE '^<<<<<<<|^=======$|^>>>>>>>' \
  client/src/pages/ \
  server/routes/ \
  shared/schema/ 2>/dev/null | head -10

# 0 satır çıkmalı. 1+ satır varsa ESBUILD CRASH RİSKİ var, hotfix gerekli.
```

