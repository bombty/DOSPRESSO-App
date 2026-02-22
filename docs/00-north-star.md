# DOSPRESSO North Star

## Mission
Standardize and optimize coffee franchise operations through a single, role-aware platform that every branch can trust for consistency, transparency, and efficiency.

## 6 Non-Negotiables

Every change to the codebase **must** satisfy all six rules below. If a change violates any rule, it is blocked until resolved.

### 1. RBAC / Policy-First
- No endpoint or UI component renders data without checking the user's role and permissions.
- Source of truth: `shared/permissions.ts` + `hasPermission()` from `shared/schema.ts`.
- Admin bypasses are explicit (`role === ADMIN`) — never implicit.

### 2. Tenant Isolation
- Branch-scoped data is **always** filtered by `branchId`.
- Supervisors see only their branch. Coaches see all branches. Employees see only their own records.
- Cross-branch data leaks are treated as P0 bugs.

### 3. Single Source of Truth
- Role definitions, permission modules, and route guards live in **one place** (`shared/permissions.ts`, `shared/schema.ts`).
- No duplicate permission checks scattered across components. Import from shared.
- If a business rule exists in code, it must not be contradicted by another file.

### 4. Global Consistency Gate
- Changes must apply globally (all roles, all branches, all languages) unless explicitly scoped.
- No role-specific one-off fixes. If a fix applies to one role, verify it doesn't break others.
- Checklist: RBAC + i18n + navigation registry + schema must all be updated together.

### 5. Deterministic Validation Before Writes
- Every write endpoint validates input with Zod schemas **before** touching the database.
- No implicit defaults — if a field is required, reject the request without it.
- Validation schemas are shared between frontend forms and backend routes.

### 6. Observability / Audit for Critical Flows
- Critical actions (role changes, permission updates, content publishing, AI decisions) must produce an audit trail.
- Audit records include: who, what, when, and the before/after state where applicable.
- AI agent runs are logged to `ai_agent_logs` with input/output summaries.
