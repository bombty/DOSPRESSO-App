---
name: session-protocol
description: DOSPRESSO oturum sonu zorunlu protokolü (Çalışma Sistemi v2.1). Triangle Workflow (Aslan + Claude + Replit), 5 zorunlu adım, 6 perspektif review, mode geçişi, compaction davranışı. "Bu oturumda hiçbir skill değişmedi" demek neredeyse imkansızdır.
---

# DOSPRESSO Çalışma Sistemi v2.1 — Oturum Sonu Protokolü

## 🆕 Son Değişiklik Özeti (6 May 2026 — İK Redesign Sprint 17)

> **v2.1 update — 6 May 2026 itibarıyla.** v2.0'dan farklar:
> - **6. perspektif eklendi** (D-39: End User Persona-Specific) — 5 perspektif → 6
> - **Triangle Workflow netleşti**: Aslan IT uzmanı **değil** prensibi explicit
> - **Compaction Drift Prevention** bölümü eklendi (§39 debug-guide ile bağlantılı)
> - **Feature Freeze NOT pause** (D-20 NOTU, Aslan 6 May)

---

## ⚙️ TRIANGLE WORKFLOW (D-01 + 6 May netleşmiş)

DOSPRESSO geliştirme **3 taraflı**:

### 🧑‍💼 Aslan = Owner
**Rol:** Karar, business, GitHub PR merge, UX, öncelik
**ÖNEMLİ:** Aslan **IT uzmanı değildir**. Bu prensip her etkileşimi şekillendirir:
- Komutlar net, kopyala-yapıştır şeklinde verilmeli
- Çok seçenek = paraliz; net öneri ile karar kolaylaştır
- Teknik jargon az, business dili çok
- Karar gereken sorular **explicit ask_user_input_v0** ile sun, yorumda saklı kalmasın
- Şu an Excel/WhatsApp/kağıt kullanıyor — sistem bunlara geçişi kolaylaştırmalı

### 🤖 Claude = Mimari + Kod + GitHub
**Rol:** Replit'in yapamadığı her şey
**Özellikle:**
- Plan dökümanı + sprint planlama
- Mimari kararlar + schema tasarımı
- Kod yazımı + GitHub branch + PR push (Replit branch switch yapamaz, Claude veya Aslan yapar)
- Skill update + dokümantasyon
- Replit'e prompt hazırlama
- 6 perspektif review (her major karar)

### 🔧 Replit Agent = DB + Build + Test
**Rol:** Sandbox-restricted işler
**Özellikle:**
- **Plan mode + isolated agent:** DB write, schema, migration, env değişiklikleri (pg_dump backup zorunlu)
- **Build mode:** kod editi (limited), doc, test, build verification, smoke test
- **Sandbox kısıtı:** Git destructive komutlar (`stash`, `checkout`, `reset`, `pull`) Replit'te yasak — Aslan Shell'den manuel yapar

---

## 📋 6-PERSPEKTİF REVIEW (D-07 + D-39 GENİŞLEDİ)

Her major commit/karar için **6 perspektif tablosu** zorunlu:

| # | Perspektif | Bakış |
|---|---|---|
| 1 | **Principal Engineer** | Kod kalitesi, mimari tutarlılık, performans, test edilebilirlik |
| 2 | **Franchise F&B Ops** | Operasyonel etki — şube, fabrika, müdür, çalışan akışı |
| 3 | **Senior QA** | Test stratejisi, edge case, validation, smoke senaryolar |
| 4 | **Product Manager** | UX stratejisi, kullanıcı yolculuğu, ürün yönelimi |
| 5 | **Compliance** | İş Kanunu (4857), KVKK, SGK, vergi, gıda mevzuatı |
| 6 | **End User (Persona-Specific)** | YENİ (D-39): Gerçek kullanıcının yaşadığı an |

### 6. Perspektif Personas

| Persona | Rol | Cihaz | Bağlam | Kritik Sorular |
|---|---|---|---|---|
| **Aslan** | CEO | Bilgisayar/iPad | Genel yönetim, IT uzmanı değil | Komut net mi? Karar gerek mi? |
| **Mahmut** | muhasebe_ik | Bilgisayar | Ay sonu, Excel'den geçiş | Yeni sistem 30 dk eğitimle öğrenilir mi? |
| **Berkan** | barista (Lara) | Cep telefonu | Mola arası 5 dk | Form 4 tıkta mı bitiyor? |
| **Andre** | mudur (Lara) | Telefon+tablet | Sabah açılış | Bugün kim izinde 1 ekranda mı? |
| **Yavuz** | coach (19 şube) | Bilgisayar | Haftalık review | 19 şube tek ekran sıkışık mı? |
| **Eren** | fabrika_mudur | Tablet | Üretim arası | Personel + bordro 1 yerde mi? |
| **Sema** | gida_muhendisi/recete_gm | Bilgisayar | Reçete + besin | Gizli formül role'u doğru mu? |

### Uygulama
- **UI/UX değişikliği:** 6 perspektif tablosu zorunlu (yazılı)
- **API/schema değişikliği:** 5 perspektif yeterli + End User mental check
- **Bug fix tek satır:** Mental check yeterli (commit mesajına 1 cümle)

---

## 🔄 MODE GEÇİŞİ (D-26)

| İş | Mode | Açıklama |
|---|---|---|
| Kod editi, lint, doc | **Build** | Replit Build mode'da OK |
| DB write, schema, migration | **Plan** | Replit Plan mode + isolated agent + pg_dump backup |
| GitHub branch + PR | **Aslan Shell** | Sandbox git destructive komutları engelliyor |
| Skill + MD update | **Build** | Claude veya Replit Build mode |

**Build mode'da DB yazma YASAK** — kuralı esnetme.

---

## 🚨 5 ZORUNLU ADIM (HER OTURUM SONU)

> "Bu oturumda hiçbir skill değişmedi" demek **NEREDEYSE İMKANSIZDIR**:
> - Kod yazdıysan → en az `dospresso-architecture` güncellenmeli
> - Bug çözdüysen → `dospresso-debug-guide` güncellenmeli
> - Yeni kontrol gerekiyorsa → `dospresso-quality-gate` güncellenmeli
> - Workflow değiştiyse → bu dosya (`session-protocol`) güncellenmeli

### Adım 1 — 4 Skill Dosyasını Güncelle

| Skill | Ne Zaman? | Örnek |
|---|---|---|
| `dospresso-architecture` | Tablo/endpoint/rol/sayfa sayısı veya yeni modül | "23 → 24 aktif rol", payroll dual-model bölümü |
| `dospresso-debug-guide` | Yeni bug tespit + çözüldü | §37 Orphan `});` merge artığı |
| `dospresso-quality-gate` | Yeni kontrol maddesi | QG-32 Vite + esbuild ikili |
| `session-protocol` | Workflow değişti | 6. perspektif eklendi (bu dosya) |

**Format:** Her skill'in üstünde "🆕 Son Değişiklik Özeti (X tarih — Sprint Y)" kutusu. Eski içerik silinmez (audit trail), yeni özet üste eklenir.

### Adım 2 — `docs/TODAY.md` Güncelle

- Bugün ne yapıldı (commit listesi tablo)
- Yeni kararlar (D-X)
- Bonus bulgular (varsa)
- Şu an bekleyen iş + sırada ne

### Adım 3 — `docs/PENDING.md` Güncelle

- Tamamlananları çıkar
- Yeni bekleyen işleri ekle (P-X)
- Öncelik sırası: 🔥 aktif → 🔴 sonraki → 🟡 sonra → 🟢 backlog

### Adım 4 — `docs/DECIDED.md` Yeni Karar Varsa

- D-X numarası art arda (D-39 → D-40 → D-41 ...)
- Format: Karar + Detay + Neden
- Asla silinmez — yeni karar eski karara not olarak eklenir

### Adım 5 — Devir Teslim Dosyası (Büyük Oturumlar İçin)

5+ commit yapıldıysa, **`docs/DEVIR-TESLIM-{DD-AY-YYYY}-{SABAH/AKSAM/GECE}.md`** yaz:
- 🎯 EN ÖNEMLİ DURUM (tek bakışta özet)
- 🚦 SONRAKİ CLAUDE'UN İLK İŞİ (numbered list)
- 📊 BUGÜN NE YAPILDI (sprint × commit tablosu)
- 🔴 BEKLEYEN İŞLER
- 🛠️ TEKNİK STACK + KIMLIK DEĞERLERİ
- 🔑 SCHEMA TUZAKLARI
- 🤝 SONRAKI OTURUM AÇILIŞ KONUŞMASI ÖRNEĞİ

---

## 🌀 COMPACTION DRIFT PREVENTION

Yeni Claude oturumu açılırsa veya transkript kompaktlanmışsa **ÖNCE bağlamı doğrula**:

### Açılış protokolü (yeni Claude için)

```bash
# 1. Branch state — önceki oturum commit'leri var mı?
git fetch origin
git log --oneline origin/main..HEAD  # branch'te kaç commit
git log -10 --oneline                # son 10 ne hakkında

# 2. Marker check (D-38)
grep -rE '^<<<<<<<|^=======$|^>>>>>>>' \
  client/src/pages/ server/routes/ shared/schema/ 2>/dev/null | head -10
# 0 olmalı

# 3. Devir teslim dosyası varsa öncelikli oku
ls -t docs/DEVIR-TESLIM-*.md 2>/dev/null | head -1
```

### Kompakt Sonrası Davranış

1. Compaction summary'yi oku (sistem otomatik gösterir)
2. **DEVIR-TESLIM dosyasını oku** (en güncel)
3. **Branch state'i tara** (`git log --oneline origin/main..HEAD`)
4. **Sonra** kullanıcının mesajına cevap ver
5. Eksik bağlam varsa transkript dosyasından incremental oku

### Compaction Drift Sinyalleri

- "X yapılması lazım" demeden önce branch'i kontrol et — belki zaten yapılmış
- "Önceki ben" yapmış olabilir, kompakte özetinde tam yansımamış olabilir
- §39 debug-guide: Branch State Drift detayları

---

## 💰 REPLIT ↔ CLAUDE MALIYET OPTIMIZASYONU

**Replit'e gönder:** Sadece DB migration + build + API test + smoke test (~30 satır prompt).

**Claude yapar (Replit'e gitmez):**
- Kod validation (manifest vs schema)
- Skill güncellemeleri
- Audit raporları analizi
- Numerical check
- Dokümantasyon
- Sprint planlama
- 6 perspektif review tablosu

**Sonuç:** Replit'e giden iş %40-50 azalır, Claude daha etkin kullanılır.

---

## 📐 FEATURE FREEZE — D-20 NOTU (6 May 2026)

**Statu:** PAUSE EDİLDİ.

Aslan kararı (6 May 2026): "Birkaç gün içinde her şeyi bitirelim, pilot tarihi ben belirleyeceğim."

- 18 Apr - 15 Haz Feature Freeze politikası **şu an aktif değil**
- Yeni özellik talepleri reddedilmeyecek
- Pilot tarihi tekrar set edilince Feature Freeze tekrar aktif olabilir

**Pilot tarihi belirlendiğinde:** Feature Freeze yeniden aktive edilir, yeni özellik istekleri "Sprint I (pilot+1) backlog" yanıtı verilir.

---

## 📨 İLETİŞİM FORMATI — "SANA + REPLIT'E"

Aslan'a yazılan teknik mesajlar **iki bölümlü** olabilir:

### Format

```
🧑‍💼 SANA (Aslan'a) özet
- Kısa Türkçe özet
- Ne oldu, hangi kararı vermesi gerekiyor
- Teknik detaylar (özlü)

🤖 REPLIT'E GÖNDERİLECEK
- Kod bloğu içinde (``` ile çevrili)
- Net komutlar
- Kopyala-yapıştır hazır
- Acceptance kriterleri dahil
```

### Ne zaman bu format?

- ✅ Replit'e DB sorgusu/migration prompt'u verirken
- ✅ Replit'e build/test komut zinciri verirken
- ❌ Aslan'a sadece bilgi/karar sunarken (basit cevap yeterli)

### Task Plan Sunumu

- Replit **doğru task planı** hazırladıysa → Aslan doğrudan butona basar
- Task planı **yanlış/eksikse** → Claude düzeltme metni hazırlar

---

## 🔑 5 May Incident Dersleri (5 May 2026 hotfix)

### Conflict Resolution Disiplini

- **YASAK:** `git checkout --theirs .` (toptan), `git add -A && git commit` (conflict varken)
- **DOĞRU:** GitHub Resolve UI VEYA hotfix branch + PR
- **CLI conflict:** `git checkout <hash> -- <files>` (specific dosyalar için)

### Token Disiplini (D-05)

- Asla dosyaya yazma (md, comment, config dahil)
- Sadece konuşmada paylaş
- Push komutu format: `git push "https://x-access-token:TOKEN@github.com/bombty/DOSPRESSO-App.git" BRANCH`

### Pre-commit Kontrol (D-38)

```bash
# Marker check
grep -rE '^<<<<<<<|^=======$|^>>>>>>>' \
  $(git diff --name-only) 2>/dev/null
# 0 satır olmalı

# Token check  
git diff | grep -E '(ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]+'
# 0 satır olmalı
```

---

## 📋 OTURUM SONU KONTROL LİSTESİ

```bash
# 1. Skill tarihleri son 1 saat içinde mi?
for s in dospresso-architecture dospresso-debug-guide dospresso-quality-gate session-protocol; do
  stat -c "%y %n" .agents/skills/$s/SKILL.md
done

# 2. 4 skill güncellendi mi? (kod yazıldıysa)
git log -1 --name-only | grep -E "SKILL\.md$" | wc -l  # ≥1 olmalı

# 3. 3 MD güncellendi mi?
git log -1 --name-only | grep -E "docs/(TODAY|PENDING|DECIDED)\.md" | wc -l

# 4. Marker + token kontrol
grep -rE '^<<<<<<<' . 2>/dev/null | wc -l  # 0 olmalı
git diff | grep -cE '(ghp|gho|github_pat)_'  # 0 olmalı

# 5. Push tamam?
git status -sb  # "## branch ...origin/branch" olmalı, ahead/behind yok

# 6. Devir teslim varsa yazıldı mı? (5+ commit'lik oturumlar için)
ls -lt docs/DEVIR-TESLIM-*.md 2>/dev/null | head -1
```

6/6 ✅ olmadan oturum kapanmaz.

---

## 🔁 SIK ATLANAN HATALAR

1. **Architecture sayıları güncellenmez** → Bir sonraki oturum yanlış bilgiyle başlar
2. **Debug-guide'a §N eklenmez** → Aynı bug sonraki sprintte tekrar zaman alır
3. **Quality-gate madde eklenmez** → Aynı kontrol atlanmaya devam eder
4. **DECIDED.md karar eklenmez** → Aynı sorun tekrar tartışılır (örn. D-22 bordro tablo karar)
5. **Compaction sonrası branch tarama yapılmadan iş başlanır** → Mevcut commit'ler kaybolur (5 May vakası)
6. **PR description hazırlamadan PR açılır** → 6 perspektif review eksik kalır

---

## 📚 ÖNCEKİ VERSİYONLAR (Audit Trail)

### v2.0 (5 May 2026 Gece) — Sprint 7-16 Mega Maraton
- 5 zorunlu adım (skill + MD + DECIDED + DEVIR-TESLIM)
- 5-perspektif review (PE/F&B/QA/PM/Compliance)
- Triangle Workflow temelleri
- Conflict resolution + token disiplin

### v1.x (Mart - 18 Apr 2026)
- Feature Freeze politikası (18 Apr - 15 Haz)
- "SANA + REPLIT'E" iki bölümlü iletişim
- Replit/Claude maliyet optimizasyonu
- Sprint A-H 8 haftalık yol haritası

**Audit kuralı:** Eski versiyonlar silinmez, yeni versiyon en üste eklenir. v2.1 = v2.0 + (D-39 6. perspektif + Compaction Drift + Aslan IT uzmanı değil prensibi).

---

**Son güncelleme:** 6 May 2026, 01:30 (v2.1 finalize)
