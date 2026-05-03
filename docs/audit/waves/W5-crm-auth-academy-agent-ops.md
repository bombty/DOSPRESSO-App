# Wave W5 — CRM + AUTH + ACADEMY + AGENT + OPS (Task #283.5)

**Status:** PENDING
**Mode:** Build
**Tahmini süre:** ~7 saat (MM8/MM9 dahil)
**Risk:** ORTA

## Kapsam (16 path-bazlı + 2 method-mismatch = 18)

### CRM (5)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| C1 | `GET /api/cowork/tasks` | `:taskId` PATCH; GET yok | **a1** — `:taskId` |
| C2 | `GET /api/cowork/messages` | YOK | **owner karar** — pilot kapsamı dışı? |
| C3 | `GET /api/cowork/members` | YOK | **owner karar** |
| C4 | `GET /api/feedback/branch` | `:token` | **a1** — `:token` |
| C5 | `GET /api/feedback-form-settings/public` | YOK | **b** — server impl (public guest feedback kritik) |
| MM9 | `GET /api/feedback-custom-questions` | POST | **FE method düzelt** veya server alias |

### AUTH (3)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| AU1 | `GET /api/user` | `/permissions` | **a2** — `/permissions` veya `/api/me` |
| AU2 | `GET /api/me` | `/usage-guide` | **a2** — `/usage-guide` |
| AU3 | `GET /api/users/hq` | YOK | **a** — `/api/users?role=hq` query param |

### ACADEMY (3)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| AC1 | `GET /api/training-program` | `/:topicId/lessons` | **a1** |
| AC2 | `GET /api/career/composite-score` | `/:userId` | **a1** |
| AC3 | `GET /api/training/user-progress` | YOK | **a** — `/api/academy/*` alt path |
| MM8 | `GET /api/training/assignments` | POST | **FE method düzelt** |

### AGENT (2)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| AG1 | `GET /api/agent/insights` | `/api/reports/insights` | **a2** |
| AG2 | `GET /api/agent` | `/actions` | **a2** |

### OPS (3)
| # | Method+Path | Server | Karar |
|---|---|---|---|
| OP1 | `GET /api/project-tasks` | `:id` PATCH/DELETE; GET yok | **a1** |
| OP2 | `POST /api/checklist-completions` | `/start`, `:id`, `/my/today` | **a2** |
| OP3 | `GET /api/inventory/by-supplier` | `/:supplierId` | **a1** |

## Acceptance

1. 16 path-bazlı patch.
2. 2 method-mismatch karar.
3. Cowork modülü için **owner kararı** (3 b/c kalem) — kapsamda mı?
4. Public guest feedback akışı smoke test.
5. Academy progress + career composite score render eder.

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli.
