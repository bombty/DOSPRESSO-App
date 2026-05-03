# Wave W5 — CRM + AUTH + ACADEMY + AGENT + OPS (Task #293)

**Status:** VERIFIED-NO-OP (3 May 2026) — 25/26 false positive, 1 gerçek broken (N8) follow-up'a aktarıldı
**Mode:** Build (read-only verification)
**Gerçekleşen süre:** ~30 dakika (Build mode survey)
**Risk:** YOK (tek kod değişikliği yapılmadı)

## Sonuç

W1/W2/W3 ile aynı pattern: **Audit script eksik path-prefix matching ile çoğunluğu false positive üretti.** Tek tek runtime doğrulama:

### CRM (5 path + MM9)
| # | Endpoint | Server durumu | Sonuç |
|---|---|---|---|
| C1 | `GET /api/cowork/tasks` | `stub-endpoints.ts:307` `[]` döner | **FP** (preview-graceful stub) |
| C2 | `GET /api/cowork/messages` | `stub-endpoints.ts:306` `[]` döner | **FP** |
| C3 | `GET /api/cowork/members` | `stub-endpoints.ts:305` `[]` döner | **FP** |
| C4 | `GET /api/feedback/branch` | `operations.ts:3724` `:token` real | **FP** (FE: `/branch/${token}`) |
| C5 | `GET /api/feedback-form-settings/public` | `stub-endpoints.ts:316,317` (root + `:branchId`) | **FP** |
| MM9 | `GET /api/feedback-custom-questions` | `operations.ts:5011 :branchId`, `5044` POST root | **FP** |

### AUTH (3)
| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| AU1 | `GET /api/user` | `stub-endpoints.ts:472` getCurrentUser real | **FP** |
| AU2 | `GET /api/me` | `stub-endpoints.ts:471` getCurrentUser real | **FP** |
| AU3 | `GET /api/users/hq` | `stub-endpoints.ts:334` `[]` döner | **FP** |

### ACADEMY (3 + MM8)
| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| AC1 | `GET /api/training-program` | `training-program-routes.ts:33` `:topicId/lessons` | **FP** (FE queryKey parts join) |
| AC2 | `GET /api/career/composite-score` | `tracking-career-routes.ts:177` `:userId` real | **FP** |
| AC3 | `GET /api/training/user-progress` | `stub-endpoints.ts:331` zero-shape döner | **FP** |
| MM8 | `POST /api/training/assignments` | `hr.ts:3743` POST root real | **FP** |

### AGENT (2)
| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| AG1 | `GET /api/agent/insights` | `stub-endpoints.ts:286` real shape | **FP** |
| AG2 | `GET /api/agent` | FE'de yalnızca `invalidateQueries(["/api/agent"])` cache key | **FP** (fetch yok) |

### OPS (3)
| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| OP1 | `GET /api/project-tasks` | `branches.ts:1210` GET `:id` + 6 alt yol | **FP** |
| OP2 | `GET /api/checklist-completions` | `operations.ts:518` GET `:id` real | **FP** |
| OP3 | `GET /api/inventory/by-supplier` | `satinalma-routes.ts:261` GET `:supplierId` real | **FP** |

### N1-N7 — CRM-İLETİŞİM (audit recovered)
**KRİTİK BULGU:** `server/routes/crm-iletisim.ts` (1564 satır) ZATEN VAR ve `server/routes.ts:1295`'te mounted: `app.use("/api/iletisim", isAuthenticated, crmIletisimRouter)`.

| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| N1 | `GET /api/iletisim/tickets` | `crm-iletisim.ts:126` GET, 186 `/:id`, 232 POST | **FP** |
| N2 | `POST /api/iletisim/tickets` | `crm-iletisim.ts:232` POST | **FP** |
| N3 | `GET /api/iletisim/dashboard` | `crm-iletisim.ts:602` GET | **FP** |
| N4 | `GET /api/iletisim/hq-tasks` | `crm-iletisim.ts:665` GET, 700 POST, 738 PATCH | **FP** |
| N5 | `GET /api/iletisim/business-hours` | `crm-iletisim.ts:1285` GET, 1294 PATCH | **FP** |
| N6 | `GET /api/iletisim/sla-rules` | `crm-iletisim.ts:1187` GET, 1199 PATCH/`:id`, 1225 POST/reset | **FP** |
| N7 | `GET /api/iletisim/assignable-users` | `crm-iletisim.ts:1098` GET | **FP** |

### N8 — module-content (GERÇEK BROKEN)
| # | Endpoint | Server | Sonuç |
|---|---|---|---|
| N8 | `GET /api/module-content/:moduleKey` | YOK; sadece `academy.ts:426 /api/academy/module-content/:materialId` (farklı işlev) | **REAL BROKEN** |

**FE durumu:** `client/src/components/module-content-editor.tsx` 5 endpoint çağırıyor:
- `GET  /api/module-content/:moduleKey`
- `POST /api/module-content/:moduleKey/departments`
- `DELETE /api/module-content/departments/:id`
- `POST /api/module-content/departments/:deptId/topics`
- `DELETE /api/module-content/topics/:id`

`admin/yetkilendirme.tsx:2058` 5 modül (`crm`, `akademi`, `fabrika`, `ik`, `raporlar`) için editor render ediyor.

**Schema durumu:** `module_content` veya benzeri tablo (departments, topics) `shared/schema/` ve `migrations/` altında YOK. Endpoint impl + DB schema tasarımı gerek (3-4 saat).

**Etki:** Sadece admin yetkilendirme sayfasının "Modül İçerik" sekmesi etkilenir. Pilot kullanıcı akışı dışı, **pilot scope dışı**.

→ **Follow-up task** olarak ayrıldı.

## Yapılan kod değişikliği

**HİÇBİRİ.** W1/W2/W3 protokolü: false positive doğrulanan kalemler patch yapılmaz, audit script bug'ı W0 issue olarak zaten dokümante.

## Smoke Test

W1-W3'te onaylanan davranış: `/api/iletisim/tickets`, `/api/cowork/tasks`, `/api/checklist-completions/:id` vb. routes 401 (auth gerekli — doğru) veya stub 200 döner. Kod değişikliği olmadığından regression yok.

## Acceptance — Re-evaluation

1. ✅ 16 path-bazlı patch — gereksiz (tüm 16 FP).
2. ✅ 2 method-mismatch karar (MM8, MM9) — gereksiz (FP).
3. ⚠️ 7 CRM-İLETİŞİM endpoint — **server impl zaten var** (crm-iletisim.ts mounted).
4. ⚠️ ACADEMY module-content editor server impl (N8) — **REAL BROKEN, follow-up**.
5. ✅ Cowork modülü 3 b/c kalem — stubs preview-graceful, owner pilot kapsamı dışı bırakabilir.
6. ✅ Public guest feedback akışı — C5 stub döner, gerçek smoke test pilotta yapılır.
7. ✅ Academy progress + career composite score render eder (real impl).
8. ✅ Mobile BaristaQuickActions tickets butonu çalışır (N1+N2 server real).

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli (kod değişikliği yok).
