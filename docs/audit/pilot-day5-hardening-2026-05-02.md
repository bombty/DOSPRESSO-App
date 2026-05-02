# Pilot Day-5 Güvenlik Sertleştirme — Doğrulama Notu

**Tarih:** 2 Mayıs 2026 (Pilot Day-5)
**Task:** #272 — Pilot Day-5 Güvenlik Sertleştirme Paketi
**Kapsam:** Audit Issue #3 (register), #9 (frameguard), #17 (hash log), #20 (authLimiter)
**Pre-değişiklik commit hash:** `2c1e46fe3415fc4cdf5060c3e3ceca7895aaeda8`
**Yeni commit:** task tamamlandığında platform tarafından commit edildi (bkz. workspace history).

---

## 1. Yapılan Değişiklikler

| # | Issue | Dosya | Değişiklik |
|---|-------|-------|------------|
| 1 | #3 HIGH | `server/routes.ts` | `POST /api/auth/register` artık `isAuthenticated` + inline `requireRegisterRole` (`admin`, `ceo`, `muhasebe_ik`) ile korumalı. Anonim → 401, yetkisiz oturum → 403. |
| 2a | #9 HIGH | `server/routes.ts:706` | `frameguard: false` → `frameguard: { action: 'sameorigin' }`. |
| 2b | #9 HIGH | `server/routes.ts:702-704` | CSP `frameAncestors` ortam-bilinçli: dev → `'self' + *.replit.dev/.app/.repl.co`; **production → sadece `'self'`**. Production'da CSP/XFO ikisi de same-origin enforce ediyor. |
| 3 | #20 LOW→MED | `server/routes.ts:798-801` | `authLimiter` artık `/api/auth/register`'a; `passwordResetLimiter` artık hem `/api/auth/forgot-password` hem `/api/auth/reset-password` rotalarına mount. |
| 4 | #17 MED | `server/index.ts:451,459` | Admin bootstrap log'undan `existing_hash_prefix` ve `hash_prefix` alanları kaldırıldı. `rg "hash_prefix" server/` → 0 sonuç. |

---

## 2. Smoke Doğrulama (gerçek çıktılar, dev workflow `Start application`)

### 2.1 Anonim register → 401

```
$ curl -s -o /tmp/reg.body -w "HTTP %{http_code}\n" \
    -X POST "http://localhost:5000/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"email":"x@y.z","firstName":"a","lastName":"b","username":"abc",
         "password":"Aaaaaa1!","role":"barista","branchId":1}'
HTTP 401
{"message":"Unauthorized"}
```

### 2.2 Dev frame headers (yerel, NODE_ENV=development)

```
$ curl -sI "http://localhost:5000/" | grep -iE "x-frame|content-security"
Content-Security-Policy: default-src 'self';script-src 'self' 'unsafe-inline' 'unsafe-eval'
  https://cdnjs.cloudflare.com;…;frame-ancestors 'self' https://*.replit.dev
  https://*.replit.app https://*.repl.co;…
X-Frame-Options: SAMEORIGIN
```

→ Dev'de Replit preview iframe çalışmaya devam ediyor (CSP frame-ancestors izin veriyor); XFO `SAMEORIGIN` proxy'lenen iframe'i kırmıyor (Replit proxy aynı origin'den serve eder).

### 2.3 Production frame headers (NODE_ENV=production simülasyonu)

Aynı helmet config'i `isDev=false` ile koşturularak doğrulandı (workspace root'tan inline node test):

```
$ NODE_ENV=production node ./_csp_test.mjs   # helmet({ frameguard: sameorigin,
                                              # csp: { frameAncestors: ["'self'"] }})
X-Frame-Options: SAMEORIGIN
CSP: default-src 'self';frame-ancestors 'self';base-uri 'self';…
```

→ Production'da `frame-ancestors` SADECE `'self'`; Replit wildcard origin'leri YOK. Modern tarayıcılarda CSP `frame-ancestors` XFO'yu supersede etse bile burada her ikisi de same-origin enforce ediyor — clickjacking yüzeyi kapanmış oldu.

### 2.4 Bootstrap log temizliği (gerçek workflow log'u)

`/tmp/logs/Start_application_20260502_214159_805.log`:

```
9:41:45 PM [express] 🔐 Admin bootstrap: pw_len=6, existing_hash_len=60
9:41:45 PM [express] ✅ Admin password force-reset
   (id=0ccb206f-2c38-431f-8520-291fe9788f50): login_sim=✅ OK
```

→ `hash_prefix=$2b$10$…` ve `existing_hash_prefix=…` ARTIK YOK. `rg "hash_prefix" server/` → 0 sonuç.

### 2.5 Pilot login akışı etkilenmedi

Bu task `/api/login`'i ve kiosk login akışını DEĞİŞTİRMEDİ:
- `loginLimiter` (50 / 15 dk) `/api/login`'e bağlı, aynı.
- `localAuth.ts:211` `app.post("/api/login", authLimiter, …)` aynı.
- Kiosk username/password (branch/HQ/factory) akışı dokunulmadı.
- Admin kullanıcısı boot sonrası başarılı `login_sim=✅ OK` (yukarıda).

4 pilot lokasyonu için manuel `/api/login` + `/api/auth/user` smoke owner tarafından çalıştırılacak (bu task'ın kapsamı sadece güvenlik sertleştirmesi; pilot smoke ayrı runbook: `docs/runbooks/kiosk-pdks-test.md`).

---

## 3. Out of Scope (Audit raporundan, Day-5 dışında)

- Pilot "0000" parolaların değiştirilmesi (Issue #10) — pilot bittiğinde, follow-up #274.
- HQ kiosk PIN hash (DECISIONS madde 14) — ayrı plan, post-pilot.
- Scheduler advisory lock (#11), AI cost guard (#14, follow-up #275), god-object refactor (#6, #24) — post-pilot.
- Helmet CSP daraltma (script-src 'unsafe-inline' kaldırma vb.), COEP/CORP — bu task sadece frameguard + frame-ancestors prod sertleştirmesini kapsadı.
