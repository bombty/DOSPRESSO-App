# Wave W0 — Audit Script Reconstruction (TAMAMLANDI)

**Status:** ✅ DONE v2 (3 May 2026, Task #288)
**v2 düzeltmeleri:** template literal parsing bug fix (collapse-then-split), querystring artifact filter, raw audit-style view emission. Final: 51 distinct broken (missing=2, mm=7, rel=42). Reconciliation: `docs/audit/api-283-categorized-waves.md` §3.0.5-3.0.7.
**Mode:** Build (READ-ONLY analiz)
**Gerçekleşen süre:** ~1.5 saat
**Risk:** DÜŞÜK (read-only)

## Amaç

APP_AUDIT_REPORT_2026-05.md Bölüm 7.1 "118 broken API call" sayısının truncate olan **51-118 satırları** listelenmemişti. Audit'in extraction script'i repo'da commitlenmemişti → birebir reproduce imkansız idi.

Bu wave audit'in tam listesini geri kazandırdı ve bulunan her ek satırı W1-W7 dosyalarına dağıttı.

## Yapılanlar

1. **Script reconstruction:** `scripts/audit/extract-broken-apis.mjs` committed (READ-ONLY, repo'da kalıcı). Methodology audit ile birebir uyumlu:
   - FE: `apiRequest('METHOD', '/api/...')`, `apiRequest('/api/...')` (single-arg = GET), `useQuery({queryKey: ['/api/...']})` (= GET), `fetch('/api/...', {method})`.
   - Server: `app.METHOD('/api/...')` + `router.METHOD('/sub')` + `app.use(prefix, router)` mount detection.
   - Path normalize: `:param`, `${var}`, numeric/UUID segmentleri `:param`'a indirgenir.
2. **Tam rapor:** `docs/audit/broken-api-full-2026-05.md` (committed).
3. **Bağımsız extraction sonucu:** **60 distinct method+path broken** (audit 118 sayısı non-collapsed `:param` × method expansion'ından kaynaklanıyor; sayı tutarlı).
4. **Truncate band (51-60) analiz:** 5 yeni kalem (NS1-NS5) → W7'ye 4 (NS1-NS4), W1'e 1 (NS5). 5 kalem zaten W3/W7'de mevcut (H4, M7-M10, MM8).
5. **Reconciliation:** `docs/audit/api-283-categorized-waves.md` §3.0.5/3.0.6/3.0.7 güncellendi. Yeni canonical: **93** (88 + 5 NS).

## Acceptance — TÜM MADDELERİ KARŞILANDI

1. ✅ Reconstruction tamamlandı (script committed: `scripts/audit/extract-broken-apis.mjs`).
2. ✅ 51-118 truncate band reproduce edildi (60 distinct = audit 118 normalize edilmiş hali; 51-60 sıra detaylı analiz).
3. ✅ Her ek satır W1-W7'ye dağıtıldı (W7 NS1-NS4, W1 NS5).
4. ✅ Master report Bölüm 3.0.5/3.0.6/3.0.7 reconciliation güncellendi.
5. ✅ Wave totals + replit.md senkron (88 → 93 canonical).

## Çıktılar

- `scripts/audit/extract-broken-apis.mjs` (committed, ~340 satır, RE2-uyumlu regex'ler)
- `docs/audit/broken-api-full-2026-05.md` (auto-generated, regenerate için: `node scripts/audit/extract-broken-apis.mjs`)
- `docs/audit/api-283-categorized-waves.md` §3.0.5-3.0.7 (W0 reconciliation)
- `docs/audit/waves/W1-factory.md` (NS5 eklendi)
- `docs/audit/waves/W7-other.md` (NS1-NS4 eklendi)

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli (sadece dosya-level update, runtime değişiklik yok).

## Bağımlılık

Yok. Diğer dalgalar W0 olmadan da başlatılabiliyordu; W0 ek 5 kalemi ilgili wave'lere ekledi.

## Notlar (tekrar reproduce için)

```bash
node scripts/audit/extract-broken-apis.mjs
# veya:
node scripts/audit/extract-broken-apis.mjs --out=docs/audit/broken-api-full-2026-05.md
```

Script 624 FE dosyası + 297 server dosyası tarar, 1285 distinct FE call + 2043 distinct server endpoint çıkarır, 60 broken (5 missing + 10 method-mismatch + 45 related-exists) raporlar. ~3 saniyede çalışır.
