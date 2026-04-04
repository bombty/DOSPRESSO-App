# DOSPRESSO — API Endpoint Katalogu
**Route dosyaları ve temel endpoint grupları**

---

## Route Dosyaları (42 dosya)

| Dosya | Satır | Temel Endpoint'ler |
|-------|-------|-------------------|
| branches.ts | 5300+ | /api/projects, /api/branches, /api/hq-users, /api/milestones |
| operations.ts | 5800+ | /api/audit-templates, /api/audits, /api/checklists |
| audit-v2.ts | 800+ | /api/v2/audit-templates, /api/v2/audits, /api/v2/audit-actions |
| admin.ts | 3000+ | /api/admin/*, /api/audit-logs, /api/users |
| hr.ts | 2000+ | /api/hr/*, /api/payroll, /api/leaves |
| shifts.ts | 1500+ | /api/shifts, /api/shift-attendance |
| factory.ts | 1500+ | /api/factory/*, /api/production |
| equipment.ts | 1000+ | /api/equipment, /api/faults |
| academy-v3.ts | 1000+ | /api/v3/academy/*, /api/training |
| crm-routes.ts | 800+ | /api/crm/*, /api/feedback |
| satinalma-routes.ts | 600+ | /api/satinalma/*, /api/purchase-orders |
| inspection-routes.ts | 500+ | /api/branch-inspections, /api/inspection-categories |

## Endpoint Prefix Rehberi
```
/api/v2/*          → Denetim sistemi v2 (yeni)
/api/v3/academy/*  → Akademi v3
/api/admin/*       → Admin panel
/api/hr/*          → İK modülü
/api/factory/*     → Fabrika
/api/crm/*         → CRM
/api/satinalma/*   → Satınalma
/api/agent/*       → Dobody agent
```

## Sık Kullanılan Endpoint'ler

### Kullanıcı & Auth
```
POST /api/login
POST /api/logout
GET  /api/user (mevcut kullanıcı)
GET  /api/hq-users (HQ personeli)
GET  /api/project-eligible-users (tüm aktif kullanıcılar, gruplu)
```

### Şubeler
```
GET  /api/branches
GET  /api/branches/:id
GET  /api/branches/:id/staff-scores
```

### Projeler
```
GET/POST    /api/projects
GET/PATCH   /api/projects/:id
POST/DELETE /api/projects/:id/members
POST        /api/projects/:id/tasks
PATCH       /api/project-tasks/:id
POST        /api/projects/:id/comments
GET/POST    /api/projects/:id/milestones
PATCH/DELETE /api/milestones/:id
```

### Denetim v2
```
GET/POST       /api/v2/audit-templates
GET/PATCH/DEL  /api/v2/audit-templates/:id
POST           /api/v2/audit-templates/:id/categories
PATCH/DELETE   /api/v2/audit-categories/:id
POST           /api/v2/audit-categories/:id/questions
PATCH/DELETE   /api/v2/audit-questions/:id
GET/POST       /api/v2/audits
GET            /api/v2/audits/:id
POST           /api/v2/audits/:id/responses
POST           /api/v2/audits/:id/personnel
PATCH          /api/v2/audits/:id/complete
PATCH          /api/v2/audits/:id/close
POST           /api/v2/audits/:id/actions
PATCH          /api/v2/audit-actions/:id
GET/POST       /api/v2/audit-actions/:id/comments
GET            /api/v2/branch-audit-history/:branchId
GET            /api/v2/branch-on-shift/:branchId
```

### Vardiya & PDKS
```
GET/POST /api/shifts
PATCH    /api/shifts/:id
POST     /api/kiosk/check-in
GET      /api/pdks-records
```

## Response Format Dikkat
```
Çoğu endpoint → direkt array [...]
/api/faults → {data: [...]}
/api/agent/actions → {actions: [...]}
/api/v2/branch-audit-history → {audits: [...], total: N}

Frontend: Array.isArray(data) ? data : (data?.data || [])
```
