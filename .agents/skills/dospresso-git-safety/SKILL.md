---
name: dospresso-git-safety
description: DOSPRESSO git senkronizasyon güvenlik protokolü. Main agent (Replit) ve isolated task agent (Claude/PR) paralel çalıştığında oluşan diverged main + merge conflict durumunu önler. Her Build session başında, her edit öncesi, her commit öncesi 3 katmanlı kontrol uygular.
---

# DOSPRESSO Git Safety Protocol — 5 Katmanlı Önleme

## Kök Neden (5 Mayıs 2026 Olayı)

5 Mayıs Sprint 7 sırasında main agent (Replit) ve task agent (Claude PR'ları) **aynı dosyalara paralel yazdı**:
- `server/routes/personnel-attendance-detail.ts` — Replit local commit + PR #15 (task agent)
- `server/routes/recipe-label-engine.ts` — Replit local commit + PR #17 (task agent)
- `client/src/pages/etiket-hesapla.tsx` — Replit local commit + PR #17 (task agent)

Sonuç: `main ahead 5, behind 10` — diverged state, push reject, 3 dosyada UU conflict.

**Temel ihlal:** Main agent edit öncesi `git fetch` yapmadı, remote'taki PR'ların aynı dosyaları değiştirdiğinden habersizdi.

---

## L1 — Pre-Edit Fetch (her Build session başı)

Build mode'a geçer geçmez ZORUNLU komut:

```bash
git fetch origin && git status -sb | head -1
```

Beklenen: `## main...origin/main` (behind=0, ahead=0 veya sadece ahead).

**Eğer `behind > 0`:** EDIT YASAK. Önce sync:
```bash
git pull --rebase origin main
```

Conflict çıkarsa L4'e geç (Replit Resolve UI).

---

## L2 — Dosya Sahipliği Kuralı (task agent başlatılırken)

Plan mode'da isolated task agent açıldığında, görev tanımına şunlar dahil edilir:
- **Touched paths**: agent'ın değiştireceği dosya/klasör listesi (örn. `server/routes/recipe-label-engine.ts`)
- **Lock duration**: PR merge edilene kadar main agent BU dosyaları değiştirmez

Main agent kontrol komutu (her edit öncesi, kritik dosyalar için):
```bash
# Aktif task agent var mı kontrol et
ls .local/tasks/*.md 2>/dev/null | xargs grep -l "IN_PROGRESS\|PROPOSED" | head -5
```

Aktif task agent varsa onun touched_paths'inde olan dosyalara dokunma. Eğer mecbur:
1. Task agent'ı tamamlanmasını bekle (`mark_task_complete`)
2. Veya task agent'ı iptal et, main agent ile devam et — ama İKİSİNİ AYNI ANDA yapma.

---

## L3 — Pre-Commit Sync Check

Her commit öncesi sandbox kontrolü:

```bash
git fetch origin
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
  echo "✅ Up to date — commit OK"
elif [ "$LOCAL" = "$BASE" ]; then
  echo "⚠️ behind — pull önce, commit sonra"
elif [ "$REMOTE" = "$BASE" ]; then
  echo "✅ ahead — commit + push OK"
else
  echo "🚨 DIVERGED — STOP, conflict riski. L4 protokolü uygula."
fi
```

DIVERGED görürsen: commit atma, önce L4'ü tamamla.

---

## L4 — Conflict Resolution (Replit UI > CLI)

Conflict çıktığında **CLI rebase yerine Replit'in "Resolve merge conflicts" UI'ını kullan**:

### Neden CLI değil?
- `git checkout --theirs .` toptan komutu YASAK — kör çözüm, hangi dosyada hangi versiyon doğru göremez
- `git checkout --ours/--theirs` rebase context'inde tersine çalışır (theirs = local commit, ours = upstream) — kafa karıştırıcı
- Manuel conflict marker temizleme hatalı olabilir

### Replit UI Akışı:
1. Sağ panel: **Git → Resolve merge conflicts** açılır
2. Her conflicting file için tıkla → **3-way diff** görünür: `origin/HEAD` | `→` | `main`
3. Hangi versiyonu seçeceğini belirle:
   - **Remote (origin/main) tercih:** Eğer dosya bir merged PR'da değiştirildiyse (PR review'dan geçmiş, merge edilmiş, sağlam)
   - **Local (main) tercih:** Eğer remote'ta sadece eski/duplicate versiyon varsa
   - **Manuel merge:** Her iki versiyonun da farklı parçaları gerekiyorsa
4. Her conflict ✓ olunca: bottom bar → **Commit & continue rebase** (veya merge)
5. "Include other changed files in commit" işaretli kalsın
6. Push

### Hangi versiyonu seç? — Karar Matrisi

| Senaryo | Tercih |
|---|---|
| Remote'ta task agent PR merged + local'de aynı dosya commit | **Remote** (PR review'dan geçmiş) |
| Remote'ta hotfix PR var + local commit eski | **Remote** |
| Local'de yeni feature + remote'ta eski versiyon | **Local** |
| Her iki tarafta farklı yeni iş var | **Manuel merge** |

**5 Mayıs örneği:** etiket-hesapla.tsx + personnel-attendance-detail.ts + recipe-label-engine.ts → hepsinde Remote (origin/main) tercih edilmeli (PR #15, #17 hotfix'leri içeriyor).

---

## L5 — Pre-Push Validation

Push'tan önce ne push edileceğini gör:

```bash
git log --oneline @{u}..HEAD
```

Beklenen: 1-5 commit. Eğer 10+ commit görüyorsan: yanlış branch'te olabilirsin veya rebase tamamlanmadı.

```bash
# Hangi dosyalar push edilecek?
git diff --name-only @{u}..HEAD | head -20
```

Beklenmeyen dosya varsa (örn. `.env`, `*.sql.gz`): commit'ten çıkar (`git restore --staged <file>`).

---

## YASAK Komutlar (Force / History Rewrite)

```bash
git push --force                # YASAK
git push -f                     # YASAK
git reset --hard <önceki commit> # YASAK (commit silmek için)
git filter-branch               # YASAK (history rewrite)
git rebase -i <main'den önce>   # YASAK
```

**Tek istisna:** Owner (Aslan) açıkça izin verirse + nedeni `docs/DECISIONS.md`'ye yazılırsa.

---

## Acil Durum Komutları (Conflict Çıkmazı)

### Senaryo 1: Rebase ortasında stuck
```bash
git rebase --abort           # Rebase'i iptal et, başlangıç state'ine dön
# Sonra Replit UI ile yeniden dene
```

### Senaryo 2: Local commit'lerden vazgeç (remote zaten içeriyorsa)
```bash
git fetch origin
git reset --hard origin/main   # ⚠️ Local commit'ler silinir (remote'ta zaten varsa OK)
```

### Senaryo 3: Tamamen sıfırdan başla
```bash
git fetch origin
git stash                     # Çalışmayı sakla (gerekirse)
git reset --hard origin/main
git stash pop                 # Çalışmayı geri yükle (manuel merge gerekebilir)
```

---

## Build Session Başı Checklist (10 sn)

```bash
# 1. Sync durumu
git fetch origin && git status -sb | head -1
# Beklenen: behind 0

# 2. Conflict yok mu?
git status --porcelain | grep "^UU" && echo "🚨 UNRESOLVED CONFLICT" || echo "✅ Clean"

# 3. Aktif task agent var mı?
ls .local/tasks/*.md 2>/dev/null | xargs grep -l "IN_PROGRESS" 2>/dev/null | head -3

# 4. Aktif rebase/merge ortada mı?
ls .git/rebase-merge .git/MERGE_HEAD 2>/dev/null && echo "🚨 INCOMPLETE OPERATION" || echo "✅ No pending"
```

4/4 ✅ olmadan **edit yapma**.

---

## Session Protocol Entegrasyonu

`session-protocol` skill'inin Adım 1'i (devir teslim push) bu skill'e bağımlı:

1. Önce L5 pre-push validation
2. Sonra `git push origin main`
3. Push reject olursa → L1'e dön (fetch + rebase)

`session-protocol` Adım 1 güncellemesi:
```bash
# Adım 1 — Devir Teslim Yaz + Push (GÜVENLİ)
git fetch origin                              # L1
git status -sb | head -1                      # behind=0 kontrol
git add -A
git commit -m "fix/feat/docs: [konu] — [özet]"
git log --oneline @{u}..HEAD                  # L5 — ne push edilecek?
git push origin main
```

---

## Gerçek Olay Logu (5 Mayıs 2026)

**Saat 19:30** — Replit (main agent) Sprint 7 hotfix'i local'e commit etti
**Saat 19:35** — Claude (task agent) PR #17 açtı + remote main'e merge etti
**Saat 20:29** — Aslan git pull denedi → "diverged main" hatası
**Saat 20:35** — Replit `git checkout --theirs .` ile rebase çözmeye çalıştı → 1 dosya çözüldü, 2 dosya hala UU
**Saat 20:36** — Aslan Replit Resolve merge conflicts UI'ını açtı → 3 conflicting + 12 changed file görünür

**Ders:** Bu skill yazılmadan önce yoktu. 1 saat kaybedildi. Bir daha olmaması için L1-L5 zorunlu.
