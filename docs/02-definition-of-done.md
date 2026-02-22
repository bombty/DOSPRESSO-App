# Definition of Done (DoD)

Every change must pass **all** items below before it is considered complete.

## Checklist

### Access & Security
- [ ] RBAC check added/verified — uses `shared/permissions.ts` functions
- [ ] Branch-scoped data filtered by `branchId` where applicable
- [ ] No secrets or API keys exposed in client code

### Data Integrity
- [ ] Input validated with Zod schema before database writes
- [ ] Seeds or migrations included if schema changed (`npm run db:push`)
- [ ] Audit trail added for critical actions (role change, content publish, AI decision)

### UI Quality
- [ ] Empty state handled (no data → helpful message, not blank screen)
- [ ] Loading state handled (skeleton or spinner while fetching)
- [ ] Error state handled (API failure → toast or inline error)
- [ ] `data-testid` attributes on all interactive and meaningful display elements

### Internationalization
- [ ] All user-facing strings use i18n keys — no hardcoded Turkish/English text
- [ ] New i18n keys added to all supported locale files (TR, EN, AR, DE)

### Cross-Module Impact
- [ ] Change-impact checklist completed:
  - Does this affect other roles? → Verified for all 3 view modes (coach / supervisor / employee)
  - Does this affect navigation? → Tab registry + URL map updated in `akademi-mega.tsx`
  - Does this affect permissions? → Route added to `ACADEMY_ROUTE_PERMISSIONS`
  - Does this affect shared schema? → Frontend + backend both updated

### Testing
- [ ] Minimum 3 manual test scenarios documented:
  1. Happy path (expected use)
  2. Edge case (empty data, boundary values)
  3. Permission denied (wrong role attempts access)

### Backward Compatibility
- [ ] API changes are additive (new fields optional, old fields preserved)
- [ ] No breaking changes to existing API responses without version bump
- [ ] Existing seeds and test data still work after schema changes
