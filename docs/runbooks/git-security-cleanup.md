# GIT SECURITY CLEANUP RUNBOOK — DOSPRESSO

Repository (özellikle public repo) için hassas dosya yönetim politikası ve cleanup prosedürü. Owner (Aslan) tarafından koyulan kural; Replit (uygulayıcı) bu protokolü takip eder.

Son güncelleme: 2 Mayıs 2026  
Kaynak karar: `docs/DECISIONS.md` md. 18 (GitHub hassas dosya cleanup current tracking içindir).

---

## Public Repo Risk Notu

DOSPRESSO repository'si **public** olabilir. Public repo demek:
- Tüm git history dünya tarafından görüntülenebilir.
- Bir dosya history'de varsa, current HEAD'den çıkarılması o dosyayı geçmiş commit'lerden silmez.
- Geçmiş commit'lerdeki hassas içerikler **history rewrite** olmadan temizlenmez.
- **History rewrite (git filter-branch, BFG, git-filter-repo) sadece owner özel kararıyla yapılır.** Pilot süresince history rewrite YAPILMADI; pilot sonrası ayrı karar konusudur.

---

## Hassas Dosya Türleri (Repository'de TUTULMAZ)

Aşağıdaki dosyalar repository'ye **commit edilmemeli**:

### 1. Veritabanı Operasyonu Çıktıları
- `*.sql.gz` — pg_dump çıktıları
- `backup/`, `backups/` dizinleri
- `dump-*.sql`, `*-dump.sql`, `*-backup.sql`
- `COMMIT-*.sql` — manuel commit edilen DML/DDL scriptleri (genellikle hassas WHERE clause + veri içerir)

### 2. Personel / KVKK Verisi
- `*.xlsx` (personel listesi, müşteri listesi)
- `personel-*.csv`, `staff-*.csv`, `employees-*.csv`
- `kvkk-*` ile başlayan tüm dosyalar
- Pilot personel referansları içeren JSON snapshot'lar (`pilot-staff-*.json`)

### 3. Kimlik / Yetki Materyalleri
- `*.bcrypt`, `*-hash.txt` — bcrypt hash dump'ları
- `pin-list-*`, `pins-*.csv` — PIN listeleri (plaintext veya hash)
- `.env`, `.env.*`, `.env.local` — environment secret'ları (Replit Secrets kullanılır)
- `*.pem`, `*.key`, `*.p12` — özel anahtarlar/sertifikalar
- `service-account-*.json` — cloud service account'ları

### 4. Import / Audit Logları
- `import-output-*.log`, `import-*.txt` — Excel import detay log'ları (ad/soyad/PIN içerebilir)
- `pdks-debug-*.log` — PDKS debug çıktıları (TC kimlik, telefon vb.)
- `audit-raw-*.json` — ham audit dump'ları (PII maskelenmemiş)

### 5. Geçici Test/Debug Çıktıları
- `tmp-*`, `temp-*`, `debug-*`
- `cookies-*.txt`, `session-*.json` (test login session'ları)
- `screenshot-pii-*.png` (PII içeren ekran görüntüleri)

---

## .gitignore Kuralları

`.gitignore` dosyasında aşağıdaki pattern'lar bulunmalı:

```gitignore
# === Database ===
*.sql.gz
*.dump
backup/
backups/
dump-*.sql
*-dump.sql
*-backup.sql
COMMIT-*.sql

# === Personel / KVKK ===
*.xlsx
personel-*.csv
staff-*.csv
employees-*.csv
kvkk-*
pilot-staff-*.json

# === Kimlik / Yetki ===
*.bcrypt
*-hash.txt
pin-list-*
pins-*.csv
.env
.env.*
!.env.example
*.pem
*.key
*.p12
service-account-*.json

# === Import / Audit ===
import-output-*.log
import-*.txt
pdks-debug-*.log
audit-raw-*.json

# === Geçici / Test ===
tmp-*
temp-*
debug-*
cookies-*.txt
session-*.json
screenshot-pii-*.png

# === IDE / OS ===
.DS_Store
.idea/
.vscode/
*.swp
node_modules/
```

> `!.env.example` istisna: env şablon dosyası (gerçek secret içermez) commit edilebilir.

---

## Current Tracking Cleanup Prosedürü

Eğer hassas dosya **mevcut HEAD'de tracked** ise (önceden commit edilmiş ve hâlâ tracking'de):

### Adım 1 — Tespit
```bash
git ls-files | grep -E "(\.sql\.gz|\.xlsx|\.bcrypt|\.env$|backup/|dump-|COMMIT-)"
```

### Adım 2 — `.gitignore` güncellemesi
- Pattern'ı `.gitignore`'a ekle (üstteki tablodan).
- Commit edilmeyen değişiklik olarak bırak.

### Adım 3 — Working tree'den korunarak tracking'den çıkar
```bash
# Her hassas dosya için:
git rm --cached path/to/sensitive-file
# Working tree'de dosya kalır, sadece git tracking'inden çıkarılır.
```

### Adım 4 — Doğrulama
```bash
git status   # "deleted: path/to/sensitive-file" görünür
git ls-files | grep <pattern>   # Boş dönmeli
```

### Adım 5 — Commit
```bash
git add .gitignore
git commit -m "chore(security): remove sensitive files from current tracking + harden .gitignore"
```

> ⚠️ Owner kuralı: commit/push işlemleri owner GO ile yapılır. DOCS-ONLY veya GIT-ONLY moddaysa Replit doğrudan commit etmez.

### Adım 6 — Push (owner GO ile)
```bash
git push origin main
```

---

## History Rewrite (KAPSAM DIŞI — Owner Özel Kararı)

Git history'den hassas dosyayı tamamen silmek **history rewrite** gerektirir:
- `git filter-repo` (önerilen modern araç)
- `git filter-branch` (legacy, kullanımı önerilmez)
- BFG Repo-Cleaner (jar tool)

**Riskler:**
1. **Force push gerektirir** (`git push --force-with-lease origin main`) — Replit'e Owner kuralı: force push YASAK.
2. **Tüm collaborator'lar repo'yu yeniden clone'lamak zorunda** (history değiştiği için pull yapamaz).
3. **PR'lar / branch'ler etkilenir** — açık PR'lar bozulur, fork'lar inkonsistant olur.
4. **GitHub'da history cache'i** — eski commit URL'leri bir süre erişilebilir kalır (cache temizliği için GitHub support'a başvuru gerekebilir).
5. **Ayna / fork repo'ları** — public repo ise üçüncü tarafların fork'larında hassas içerik kalmaya devam eder.

**Karar:** History rewrite **pilot süresince yapılmadı** (`DECISIONS.md` md. 18). Pilot sonrası owner özel kararıyla değerlendirilir.

**Geçici risk azaltma (history rewrite yapılana kadar):**
- Etkilenen secret'lar **rotate edilmiş** olmalı (DB password, API key, OAuth client secret).
- KVKK kapsamındaki kişisel veri için DPO ile risk değerlendirmesi.
- Public repo isimli ise → private'a alma seçeneği değerlendirilir (ama bu da history rewrite gibi force koruma riskleri taşır).

---

## Pre-Commit Hook (Önerilen, Opsiyonel)

Yerel makinede commit etmeden önce hassas pattern kontrolü:

```bash
#!/bin/bash
# .git/hooks/pre-commit

PATTERNS="\.sql\.gz$|\.xlsx$|\.bcrypt$|\.env$|backup/|dump-|COMMIT-|pin-list-"
FILES=$(git diff --cached --name-only | grep -E "$PATTERNS")

if [ -n "$FILES" ]; then
  echo "⛔ HASSAS DOSYA TESPİTİ — commit ENGELLENDI:"
  echo "$FILES"
  echo ""
  echo "Çözüm: git rm --cached <file> + .gitignore güncelle"
  exit 1
fi
```

> Bu hook her clone'da yeniden eklenmesi gereken yerel bir script. Repo-wide enforcement için GitHub Actions / pre-commit framework kullanılır.

---

## Pilot Sonrası Açık Konular

1. **History rewrite kararı** (owner GO ile değerlendirilecek).
2. **Secret rotation** (history'de tespit edilen tüm secret'lar — DB password, SMTP, API key — pilot sonrası rotate).
3. **Repo visibility** — public'ten private'a alma değerlendirmesi.
4. **GitHub Secret Scanning aktivasyonu** (CI'da otomatik secret detection).
5. **Pre-commit framework** (https://pre-commit.com/) ile zorunlu hook konfigürasyonu.

---

## Genel Akış Hatırlatma (Owner Kuralı)

| Aksiyon | Yetki |
|---|---|
| `.gitignore` güncellemesi | Replit DOCS-ONLY veya IMPLEMENTATION modda yapar |
| `git rm --cached` | Replit GIT-ONLY moddayken yapar (destructive değil) |
| `git commit` | Owner GO ile (commit mesajı dahil onaylı) |
| `git push origin main` | Owner GO ile |
| `git push --force` | **YASAK** (özel istisna olmadan) |
| `git filter-repo` / `git filter-branch` | **YASAK** (özel istisna olmadan) |

---

> Bu protokol değişikliği yalnızca owner (Aslan) tarafından yapılır. Replit ve ChatGPT bu dosyayı kendi başlarına güncellemez; ancak öneri sunabilirler.
