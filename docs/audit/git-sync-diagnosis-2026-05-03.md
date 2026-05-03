# Git Sync Tanı Raporu — 2026-05-03 (Task #329)

> **Not:** Bu rapor sadece **read-only** git komutlarıyla üretildi. Hiçbir
> remote silinmedi, hiçbir branch silinmedi, GC çalıştırılmadı, push yapılmadı.
> Yıkıcı işlemler için aşağıdaki güvenli script'leri (sırasıyla, kullanıcı
> onayıyla) çalıştırın.

## Neden bu rapor?

Replit ↔ GitHub sync'i sessizce başarısız oluyor. Local `main` GitHub'ın
**39 commit** önünde (task'ta 38 deniyordu, bu sırada 1 commit daha eklendi),
`.git` 1.7 GB, remote sayısı 154. Task #329 kapsamında manuel `git remote
remove`, `git branch -D`, `git gc --aggressive`, `git push origin main`
çağırılması istendi — ancak:

1. Agent çalışma kuralları **`git` komutu çalıştırmayı yasaklıyor**
   (sürüm kontrolü Replit platformu tarafından yönetiliyor).
2. `subrepl-*` remote'ları ve `replit-agent` branch'i **Replit platformunun
   iç sync altyapısı**na ait. Bunları manuel silmek workspace ↔ git
   senkronizasyonunu kalıcı olarak bozabilir.
3. Task'taki bazı varsayımlar yanlış çıktı (aşağıda).

Bu yüzden agent yıkıcı işlem yapmadı; bunun yerine bu rapor + güvenli
script'ler bırakıldı. Karar ve uygulama kullanıcıdadır.

## Mevcut durum (öncesi)

| Metrik | Değer |
|---|---|
| Local `main` ↔ `origin/main` | **39 ahead, 0 behind** (fast-forward push güvenli) |
| Toplam remote | **154** (`origin`, `gitsafe-backup`, `main-repl` + 151 `subrepl-*`) |
| `.git` boyutu | **1.7 GB** |
| `.git/objects/pack` | **1.6 GB** (en büyük tek pack: 883 MB) |
| `.git/config` boyutu | **32 KB / 633 satır** |
| LFS dosya sayısı | **0** (LFS kullanımı yok) |
| GitHub auth (`git ls-remote origin`) | **OK** (anlık çalışıyor) |
| GitHub'da görünen son commit | `10bca41fc` — *docs(audit): comprehensive role × module audit (2026-05-03)* |
| Local'deki son commit | `6c8834444` — *test(bundle-7): #327 — Şube Puantaj + Fazla Mesai Onay E2E regression suite* |

### Büyük pack dosyaları (`.git/objects/pack`)

| Pack | Boyut |
|---|---|
| `pack-aa8a05143...` | 883 MB |
| `pack-1e2c5cb87...` | 192 MB |
| `pack-3782c8221...` | 157 MB |
| `pack-cfcadc174...` | 111 MB |
| `pack-c7831ecd1...` | 105 MB |
| diğerleri | ~180 MB |

En büyük blob'lar **~10 MB** civarında — büyük olasılıkla geçmişte commit
edilmiş `attached_assets/`, ekran görüntüleri veya yedek dump dosyaları.
LFS kullanılmadığı için bunlar pack'lerin içinde duruyor.

## Branch durum analizi

| Branch | Ahead | Behind | Karar |
|---|---|---|---|
| `main` | — | — | Aktif, korunacak |
| `main-repl/main` | 0 | 0 | Aktif, korunacak (Replit iç sync) |
| **`clean-pazar-2-commits`** | 1 | 286 | ✅ **Silinebilir** — tek farklı commit (`e038fe99b`, Task #117/#118) zaten main'e dahil edildi (`276916417`). `docs/replit-deep-self-analysis.md` main'de mevcut. |
| **`replit-agent`** | 0 | 4 | ✅ **Silinebilir** — main'in 4 commit eski atası, içerik zaten main'de. (Task'ta "aynı HEAD" yazıyordu — yanlış; ama silmek yine güvenli.) |
| **`backup-pazar-pre-clean`** | 32 | 8 | ⚠️ **DİKKAT** — Task #329 "son commit'i origin/main'de varsa sil" diyordu, ama 32 commit ahead. İçerik (öz-analiz, silent try/catch migrate) main'de görünüyor olsa da **manuel doğrulama olmadan silinmesin**. Bundle yedekledikten sonra bireysel commit-by-commit kontrol gerekli. |
| `subrepl-*` (151 adet) | değişken | değişken | Replit iç sync — **manuel silme önerilmez** (aşağıya bakın) |

## `subrepl-*` remote'ları hakkında uyarı

`.git/config`'in 99%'unu kaplayan `subrepl-xxxxx` remote'ları Replit
workspace ↔ git platform sync'inin iç altyapısıdır. Yapısı:

```
[remote "subrepl-XXXXX"]
    url = git+ssh://git@ssh.riker.replit.dev:/home/runner/workspace
    lfsurl = ssh://git@ssh.riker.replit.dev/home/runner/workspace
```

Hepsi aynı SSH endpoint'e bakıyor — yani fonksiyonel olarak duplicate'ler.
Birikmelerinin sebebi muhtemelen her workspace yenilemesinde yenisinin
eklenmesi. Manuel `git remote remove subrepl-*` çalıştırmak şu anda görünür
bir hasara yol açmasa da:

1. Replit platformunun bir sonraki sync döngüsü bunları yeniden ekleyebilir.
2. Eğer Replit Agent veya Replit Git UI bu remote'ların varlığına bel
   bağlıyorsa, silme sonrası push/pull başarısız olabilir.

**Önerilen yol:** Replit Support'a yazarak workspace'in `.git/config`'inin
yeniden başlatılmasını isteyin. Bu sorun platform tarafında çözülmeli.

## Önerilen aksiyon planı (kullanıcı tarafından, kademeli)

### Adım 0 — Yedek (mutlaka)

```bash
# Local main'in tam yedeği (tek bundle dosyası)
git bundle create /tmp/dospresso-main-backup-$(date +%Y%m%d).bundle main
# 32 ahead olan backup branch'in de yedeği
git bundle create /tmp/backup-pazar-pre-clean-$(date +%Y%m%d).bundle backup-pazar-pre-clean
```

### Adım 1 — En kritik iş: 39 commit'i GitHub'a push'la

Auth çalışıyor, fast-forward, LFS yok. Tek satır:

```bash
git push --dry-run origin main   # önce doğrula
git push origin main             # gerçek push
```

Push başarısız olursa **force push YAPMAYIN**. Hata mesajını paylaşın.

### Adım 2 — Güvenli branch temizliği

```bash
git branch -D clean-pazar-2-commits    # #117/#118 zaten main'de
git branch -D replit-agent             # main'in 4-commit eski atası
git remote prune origin                # silinmiş uzak ref'leri temizle
# backup-pazar-pre-clean'i ŞİMDİLİK SİLMEYİN — 32 commit ahead
```

### Adım 3 — `subrepl-*` temizliği (riskli, son çare)

`scripts/git-cleanup-subrepl-remotes.sh` script'i hazır — sadece
`subrepl-*` ile başlayanları siler, `origin`/`gitsafe-backup`/`main-repl`'a
dokunmaz. **Önce Replit Support'a sorun**, ondan sonra çalıştırın:

```bash
bash scripts/git-cleanup-subrepl-remotes.sh
```

### Adım 4 — GC (en son)

```bash
git reflog expire --expire=now --all
git gc --prune=now --aggressive
du -sh .git
```

Hedef: `.git` < 500 MB. Büyük pack'lerin kaynağı muhtemelen geçmişte
commit edilmiş binary dosyalar; gerçekten <500 MB'a inmek için
`git filter-repo` veya BFG ile history rewrite gerekebilir — bu **kapsam
dışı** (Task #329 "history rewrite yok" diyor).

## Özet tablo (önce / sonra hedefi)

| Metrik | Şu an | Adım 1-2 sonrası | Adım 3 sonrası | Adım 4 sonrası |
|---|---|---|---|---|
| Ahead/Behind | 39/0 | **0/0** | 0/0 | 0/0 |
| Remote sayısı | 154 | 154 | **3** | 3 |
| `.git/config` | 32 KB | 32 KB | **~1 KB** | ~1 KB |
| `.git` boyutu | 1.7 GB | 1.7 GB | 1.7 GB | **<500 MB hedef** |
| Stale branch | 3 | **1** (backup-pazar) | 1 | 1 |

## Risk değerlendirmesi

| Risk | Olasılık | Etki | Önlem |
|---|---|---|---|
| Push reject (auth/quota) | Düşük (auth OK, LFS=0) | Yüksek | Force push yapma, hata raporla |
| `subrepl-*` silindi → Replit sync bozuldu | Orta | Yüksek | Önce Support'a sor, bundle yedek hazır |
| `backup-pazar-pre-clean` yanlış silindi | Yüksek (32 ahead!) | Yüksek | Bundle aldıktan sonra commit-by-commit kontrol |
| GC sırasında crash | Düşük | Orta | Bundle yedek + rollback Replit checkpoint |

## Açık sorular (Replit Support'a sorulabilir)

1. `subrepl-*` remote'larını manuel silmek Replit workspace sync'i bozar mı?
2. `.git/config`'in 32 KB'a şişmesi normal mi, otomatik temizleme yok mu?
3. 1.7 GB pack'lerin çoğu eski binary commit'lerden — Replit tarafında
   `git filter-repo` ile temizleme hizmeti var mı?
4. Replit Git sync UI'ının timeout vermesinin asıl sebebi 154 remote mu,
   1.7 GB pack mi, yoksa farklı bir platform sınırı mı?

---

**Üretim:** Replit Agent (Task #329 kapsamında, read-only tanı modunda)
**Tarih:** 2026-05-03
**İlgili dosyalar:** `.git/config`, `scripts/git-cleanup-subrepl-remotes.sh`
