# Dobody Security & Scope Spec v1.0

## 1. Identity & Role Context

Mr. Dobody is DOSPRESSO's AI assistant powered by OpenAI LLM. It uses `gatherAIAssistantContext()` to build role-scoped system prompts before sending to OpenAI.

### Endpoints (Dobody Data Access Map)

| Endpoint | Allowed Roles | Scoping Rule | Tables Used | Auth | PII Redacted |
|---|---|---|---|---|---|
| `POST /api/ai/chat` | All authenticated | Role-based context via `gatherAIAssistantContext()` | branches, users, equipmentFaults, tasks, customerFeedback, leaveRequests, quizzes, checklistCompletions, productComplaints, employeePerformanceScores, shifts, recipes, equipment, purchaseOrders, inventory, suppliers, productionBatches, auditInstances, trainingCompletions | `isAuthenticated` | Yes (v1.0) |
| `POST /api/ceo/ai-assistant` | ceo, admin | Full company data | branches, users, equipmentFaults, customerFeedback | `isAuthenticated` + role check | N/A (aggregate only) |
| `POST /api/cgo/ai-assistant` | ceo, admin, cgo | Full company data | branches, users, equipmentFaults, equipment | `isAuthenticated` + role check | N/A (aggregate only) |
| `POST /api/academy/ai-assistant` | All authenticated | Own user data only (server-side userId) | userCareerProgress, userBadges, quizResults | `isAuthenticated` | Yes (v1.0) |

## 2. Allowed Data by Group

### branch_floor (barista, bar_buddy, stajyer)
- Own tasks only (filtered by assignedToId + branchId)
- Own training/checklist status
- Branch name only
- **Cannot see**: Other employees, other branches, financials, factory data

### branch_mgmt (supervisor, supervisor_buddy, manager)
- Own branch personnel (initials only, no PII)
- Own branch faults, tasks, checklists, shifts, equipment
- Own branch performance scores (aggregated, names redacted)
- **Cannot see**: Other branches, factory data, procurement prices, supplier contracts

### factory (fabrika, fabrika_mudur, fabrika_sorumlu, fabrika_teknisyen, fabrika_personel)
- Factory equipment, faults, production batches
- **Cannot see**: Branch personnel, HR data, procurement pricing, supplier contracts

### kalite_kontrol
- Product complaints, production batch quality, fault data
- **Cannot see**: HR data, procurement pricing, individual personnel data

### executive (ceo, cgo, admin)
- All data across all branches (aggregate + redacted names)
- Personnel performance (initials only)
- Financial summaries

### support_roles (satinalma, muhasebe, teknik, coach, trainer)
- Role-specific data as defined in `gatherAIAssistantContext()`
- Personnel names redacted to initials in LLM prompts

## 3. Prohibited Data Examples

| Data Type | Never Revealed To |
|---|---|
| Phone, email, TC kimlik, address | Any role via AI chat |
| Purchase prices, supplier contracts | Branch floor/mgmt, factory floor |
| Production batch details | Branch personnel |
| Other employee's personal salary | Any role (not in system) |
| Recipe cost/margin data | Branch floor employees |

## 4. Logging & PII

- `ai_agent_logs` table tracks AI operations with PII-redacted `inputSummary` and `outputSummary`
- LLM prompts use `redactName()` helper: full names → initials (e.g., "A.Y.")
- User's firstName is sent for personalized greetings (acceptable, not considered sensitive PII)
- No lastName sent to LLM in system prompt
- No phone/email/TC/address ever included in context

## 5. Failure Behavior

- **Unauthorized scope request**: LLM instructed to reply "{firstName}, bu bilgiye erisim yetkin bulunmuyor"
- **OpenAI API failure**: Returns error message, no sensitive fallback data
- **CGO endpoint**: Has deterministic fallback (aggregate stats, no AI)
- **Missing API key**: Returns 500 with generic message

## 6. Security Fixes Applied (v1.0)

1. **Academy AI userId fix**: `userId` now taken from `req.user.id` (server-side), not from client body
2. **PII redaction**: All full names in LLM prompts replaced with `redactName()` (initials only)
3. **Explicit restrictions**: System prompt now includes explicit prohibitions for PII, procurement data, and factory data
4. **API key standardization**: CEO endpoint now uses `AI_INTEGRATIONS_OPENAI_API_KEY` fallback pattern

## 7. Remaining Considerations

- LLM prompt injection remains a theoretical risk (mitigated by scoped context + system prompt restrictions)
- Rate limiting on AI endpoints recommended for production
- Future: Add `ai_agent_logs` entries for all Dobody chat interactions
