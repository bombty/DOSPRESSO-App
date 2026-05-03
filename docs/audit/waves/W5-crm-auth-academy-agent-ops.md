# Wave W5 — CRM + AUTH + ACADEMY + AGENT + OPS (Task #283.5)

**Status:** PENDING
**Mode:** Build (+ kısmi Plan: CRM-İLETİŞİM 7 endpoint server impl owner kararı)
**Tahmini süre:** ~10 saat (16 path + 2 MM + 8 N)
**Risk:** YÜKSEK (CRM-İLETİŞİM tüm modülü impl eksik — N1-N7)

## Kapsam (16 path-bazlı + 2 method-mismatch + 8 audit-recovered = 26)

### CRM (5 path)
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

### N1-N8 — Audit'ten kurtarılan yeni broken (CRM-İLETİŞİM + ACADEMY)
| # | Method+Path | Use | FE dosya | Karar | Risk |
|---|---|---|---|---|---|
| N1 | `GET /api/iletisim/tickets` | 30 | `mobile/BaristaQuickActions.tsx:141,238` | **b** — server impl | YÜKSEK |
| N2 | `POST /api/iletisim/tickets` | 4 | `mobile/BaristaQuickActions.tsx:136`, `mobile/SupervisorQuickBar.tsx:129` | **b** — server impl | YÜKSEK |
| N3 | `GET /api/iletisim/dashboard` | 6 | `crm-mega.tsx:349`, `iletisim-merkezi/HqTasksTab.tsx:87` | **b** — server impl | YÜKSEK |
| N4 | `GET /api/iletisim/hq-tasks` | 3 | `iletisim-merkezi/HqTasksTab.tsx:55,86` | **b** — server impl | ORTA |
| N5 | `GET /api/iletisim/business-hours` | 3 | `iletisim-merkezi/sla-rules-panel.tsx:84,93` | **b** — server impl (SLA bağımlı) | YÜKSEK |
| N6 | `GET /api/iletisim/sla-rules` | 3 | `iletisim-merkezi/sla-rules-panel.tsx:273,284` | **b** — server impl (SLA) | YÜKSEK |
| N7 | `GET /api/iletisim/assignable-users` | 3 | `iletisim-merkezi/ticket-chat-panel.tsx:136,228` | **b** — server impl | ORTA |
| N8 | `GET /api/module-content` | 5 | `module-content-editor.tsx:22,32,41` | **b** — server impl (ACADEMY modül içerik editörü) | ORTA |

> **Not (N1-N7):** Tüm CRM-İLETİŞİM modülü server impl eksik. 7 endpoint tek bir alt-task olarak ele alınmalı (mevcut `iletisim` modülü ya yarım kalmış ya da farklı path prefix ile commitlenmiş). Owner kararı: (a) impl tamamla, veya (b) modül kaldır + FE çağrılarını sil.

## Acceptance

1. 16 path-bazlı patch.
2. 2 method-mismatch karar (MM8, MM9).
3. 7 CRM-İLETİŞİM endpoint server impl veya kaldırma kararı (N1-N7).
4. ACADEMY module-content editor server impl (N8).
5. Cowork modülü 3 b/c kalem için **owner kararı** — kapsamda mı?
6. Public guest feedback akışı smoke test.
7. Academy progress + career composite score render eder.
8. Mobile BaristaQuickActions tickets butonu çalışır (N1+N2 sonrası).

## Paralel-güvenlik

Tüm dalgalarla paralel-güvenli.
