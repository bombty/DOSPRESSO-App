# Wave W0 — Audit Script Reconstruction (PARTIAL)

**Status:** ⚠️ PARTIAL (3 May 2026, Task #288 v2)
**Mode:** Build (READ-ONLY analiz)
**Gerçekleşen süre:** ~2 saat
**Risk:** DÜŞÜK (read-only)

## Honest Outcome

W0 audit'in commitlenmemiş extraction script'inin yerine geçecek bir script üretti, ancak **audit'in 118 satırlık expansion'ını birebir reproduce edemedi**. Bizim methodology daha sıkı normalize ediyor (özellikle `:param`/`${var}` collapse + querystring artifact filter) ve sonuç **51 distinct method+path broken** üretiyor.

### Reproduce edilemeyen kısım

Audit Bölüm 7.1 "118 broken API call" iddiasının 51-118 satırları erişilemiyor olduğu için doğrulanamadı. Aşağıdaki olasılıklar açıklamak için makul ama **kanıtlanamaz**:
- Audit `:param` substitute YAPMAMIŞ (her FE template literal varyantı ayrı satır).
- Audit useMutation içindeki inline mutationFn pattern'lerini ayrı saymış olabilir.
- Audit query string artifact'lerini broken olarak işaretlemiş olabilir.

Bizim raw audit-style view de 51 üretiyor (51 distinct broken çağrının her biri tek bir FE konumdan geliyor — expansion için kaynak yok). Yani audit ya gerçekten 67 ek satır görmüş (kanıt yok) ya da methodology farkı 51 → 118 multiplier oluşturmuş.

## Yapılanlar

1. **Script reconstruction:** `scripts/audit/extract-broken-apis.mjs` committed (READ-ONLY, repo'da kalıcı).
   - FE patterns: `apiRequest('METHOD', '/api/...')`, single-arg `apiRequest`, `useQuery({queryKey: ['/api/...']})`, `fetch('/api/...', {method})`.
   - Server patterns: `app.METHOD('/api/...')`, `router.METHOD('/sub')` + `app.use(prefix, router)` mount detection.
   - Path normalize: collapse-then-split sırası (template'ler `?` split'inden ÖNCE collapse), querystring artifact filter (`/api/foo${qs}` → `/api/foo` server match).
2. **Tam rapor:** `docs/audit/broken-api-full-2026-05.md` (committed, regenerate edilebilir).
3. **Sonuç:** **51 distinct method+path broken** (missing=2, mm=7, rel=42).
4. **Reconciliation:** `docs/audit/api-283-categorized-waves.md` §3.0.5 güncellendi — wave dosyalarındaki (W1-W7) önceki 88/93 sayısı v2 ile reconcile edilmedi (W0 scope DIŞINDA, low-priority follow-up).

## Acceptance — KISMEN KARŞILANDI

1. ✅ Reconstruction tamamlandı (script committed: `scripts/audit/extract-broken-apis.mjs`).
2. ⚠️ **51-118 truncate band reproduce EDİLEMEDİ** — bizim methodology 51 distinct üretiyor; 51-118 sıraları yok. Audit'in 118'i muhtemelen daha gevşek dedup'tan kaynaklanıyor.
3. ⚠️ **Wave dağıtımı KISMEN:** Yalnızca script-doğrulanmış 1 yeni kalem (NS1 `/api/inventory/by-supplier`) W7'ye eklendi. Önceki commit'lerdeki NS2-NS5 v2 filtre ile false positive çıktı (kaldırıldı).
4. ✅ Master report §3.0.5 honest reconciliation ile güncellendi.
5. ⚠️ Wave totals (W1-W7) v2 ile reconcile EDİLMEDİ — pilot için low-priority follow-up.

## Çıktılar

- `scripts/audit/extract-broken-apis.mjs` (committed, READ-ONLY, regenerate komutuyla yeniden çalıştırılabilir)
- `docs/audit/broken-api-full-2026-05.md` (auto-generated, 51 broken + raw view)
- `docs/audit/api-283-categorized-waves.md` §3.0.5 (W0 v2 honest reconciliation)
- `docs/audit/waves/W7-other.md` (NS1 eklendi, NS2-NS4 kaldırıldı)
- `docs/audit/waves/W1-factory.md` (NS5 kaldırıldı — false positive)

## Reproduce

```bash
node scripts/audit/extract-broken-apis.mjs
# 624 FE × 297 server tarama → 51 broken (missing=2, mm=7, rel=42), ~3sn
```
