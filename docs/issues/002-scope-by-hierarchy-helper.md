# Scope-by-Hierarchy Helper

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

A composable helper function (`scope-by-hierarchy`) that applies the Supervisor-scoping WHERE clause to Drizzle queries. This is the single point of reuse for all services that need assignee-based hierarchy filtering.

- **`scopeByAssigneeHierarchy(assigneeColumn, userId, role)`** — returns a Drizzle SQL expression:
  - If `role === "admin"`: returns `undefined` (no filter — Admin sees all)
  - Otherwise: resolves subordinate IDs via `getSubordinateIds(userId)`, then returns `inArray(assigneeColumn, [userId, ...subordinateIds])`
  - If the User has no Subordinates, returns `eq(assigneeColumn, userId)`

This helper is imported and used inside the `list` functions of client-service, client-contract-service, and job-mandate-service.

## Acceptance criteria

- [ ] Admin role returns no filter (`undefined`)
- [ ] User with subordinates gets `inArray` filter including self + all descendant IDs
- [ ] User without subordinates gets `eq` filter for self only
- [ ] Helper delegates to `getSubordinateIds` from `supervisor-hierarchy-service` (no duplicated CTE logic)
- [ ] Tests follow the pattern in `src/services/__tests__/` using Vitest + PGlite

## Blocked by

- #001 — Supervisor Hierarchy Service (depends on `getSubordinateIds`)
