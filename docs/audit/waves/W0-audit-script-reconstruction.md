# Wave W0 — Audit Script Reconstruction (needs-investigation, ≤25 truncate satır)

**Status:** PENDING (opsiyonel — owner kararı)
**Mode:** Build (script + analiz)
**Tahmini süre:** ~2 saat
**Risk:** DÜŞÜK (read-only)

## Amaç

APP_AUDIT_REPORT_2026-05.md Bölüm 7.1 "118 broken API call" sayısının truncate olan **51-118 satırları** (≤68 satır, içinden ~25 distinct method+path tahmini, gerisi düşük-use kalemler) listelenmemiş. Audit'in extraction script'i repo'da commitlenmemiş → birebir reproduce imkansız.

Bu wave audit'in tam listesini geri kazandırır ve bulunan her ek satırı W1-W7 dosyalarına dağıtır.

## Yaklaşım

1. **Owner'dan iste:** APP_AUDIT'i üreten ham extraction script (varsa eski commit, gist, log).
2. **Yoksa script reconstruction:** Mevcut `extract2.mjs` + `extract3-method.mjs` + `extract4-expand.mjs`'in audit ile birebir yöntem uyumlu hale getir:
   - Audit muhtemelen `:param` substitution + path normalize farklı yapıyor.
   - Audit muhtemelen `apiRequest`'in 2. argümanını farklı parse ediyor.
   - Audit muhtemelen `useQuery` haricinde `useMutation` + `useInfiniteQuery` paternlerini de kapsamış olabilir.
3. **Ek 51-118 satırları çıkar:** Her birini W1-W7 dosyalarına ekle (modül-bazlı).
4. **Hi-confidence sayısını güncelle:** 88 + (W0 bulguları) = nihai toplam.

## Acceptance

1. Owner'dan audit script alındı VEYA reconstruction tamamlandı.
2. 51-118 satırları (≤25 distinct kalem tahmini) çıkarıldı.
3. Her ek satır W1-W7 dosyalarına dağıtıldı (FE dosya + server route + risk + kategori).
4. Master report Bölüm 3.0.5 reconciliation güncellendi.
5. Wave totals + replit.md senkron.

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli (sadece dosya-level update, runtime değişiklik yok).

## Bağımlılık

Yok. Diğer dalgalar W0 olmadan da başlatılabilir; W0 sonradan ek kalemleri ilgili wave'e ekler.
