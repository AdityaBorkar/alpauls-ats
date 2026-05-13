# PRD: Supervisor Hierarchy & Data Scoping

## Problem Statement

The recruitment application defines a Supervisor–Subordinate relationship in the domain model (a User who oversees one or more other Users), and the `user` table already has a `supervisor_id` column with a self-referential foreign key. However, no service or query logic traverses this hierarchy. As a result, scoped visibility rules defined in CONTEXT.md cannot be enforced: Clients and Client Contracts should be visible to the Assignee and their Supervisors (up the chain), and Job Mandates should be visible to the Assignee and their Supervisors. Without this, a Supervisor cannot see data belonging to their Subordinates, breaking the oversight workflow.

## Solution

Build a Supervisor Hierarchy module that resolves all descendants (Subordinates at any depth) for a given User, and an Authorization Scoping module that applies this hierarchy to list queries. The descendant resolution uses a recursive CTE for efficiency. Scoping is applied as a filter in the service layer: for entities that require Supervisor-scoped visibility (Clients, Client Contracts, Job Mandates), the list function receives the requesting User's ID, resolves the User's Subordinate IDs, and filters results where the Assignee is either the User or one of their Subordinates. Admins bypass all scoping. Prospects and Tasks are visible to all authenticated users and do not require Supervisor scoping.

The admin UI for assigning a Supervisor to a User already exists in the member edit page; no new UI is needed for this PRD.

## User Stories

1. As a Supervisor, I want to see all Clients assigned to my Subordinates, so that I can oversee the accounts my team manages
2. As a Supervisor, I want to see all Client Contracts assigned to my Subordinates, so that I can track engagement terms across my team
3. As a Supervisor, I want to see all Job Mandates assigned to my Subordinates, so that I can monitor recruitment progress across my team
4. As a Supervisor, I want to see data assigned to Subordinates at any depth in the hierarchy (not just direct reports), so that my oversight spans the full org tree
5. As a Team Leader who is also a Subordinate of an RM, I want my Supervisor to see the Mandates I manage, so that the RM has visibility into my pipeline
6. As a User who is not a Supervisor, I want to see only the entities assigned to me (plus those I create), so that my view is not cluttered by unrelated data
7. As an Admin, I want to see all entities regardless of the Supervisor hierarchy, so that I have full system visibility
8. As a User, I want the Supervisor-scoped list to include entities assigned directly to me, so that I do not lose sight of my own work
9. As an Admin, I want to assign a Supervisor to a User, so that the reporting chain is established
10. As an Admin, I want to change a User's Supervisor, so that organizational changes are reflected
11. As an Admin, I want to remove a User's Supervisor (set to null), so that a User can be detached from the hierarchy
12. As an Admin, I want to be prevented from creating a circular Supervisor chain (A supervises B, B supervises A), so that the hierarchy remains a valid tree
13. As a developer, I want a single `getSubordinateIds(userId)` function that returns all descendant User IDs, so that scoping logic is consistent across all services
14. As a developer, I want the descendant resolution to use a recursive CTE, so that deep hierarchies are resolved efficiently in a single query
15. As a developer, I want a `scopeByAssigneeHierarchy(query, userId, role)` helper that applies the correct WHERE clause to any Drizzle query, so that I do not duplicate scoping logic across services
16. As a developer, I want Admin users to bypass all scoping filters, so that admin visibility is unconditional
17. As a User, I want Prospect data to remain visible to all authenticated users regardless of Supervisor chain, so that prospect sharing is not restricted by hierarchy
18. As a User, I want Task data to remain visible to all authenticated users regardless of Supervisor chain, so that cross-team task visibility is preserved
19. As a developer, I want the `supervisor_id` column on the user table (which already exists) to be used as the single source of truth for the hierarchy, so that no additional tables or materialized paths are needed
20. As a developer, I want the Supervisor assignment to be part of the existing admin `updateUser` oRPC procedure, so that no new endpoint is needed

## Implementation Decisions

### Supervisor Hierarchy Service (`supervisor-hierarchy-service`)

A deep module that encapsulates recursive descendant resolution.

- **`getSubordinateIds(userId: string): Promise<string[]>`** — returns all descendant User IDs (direct + indirect) using a recursive CTE against the `user` table's `supervisor_id` column. Results are cached per-request (in-memory, no cross-request cache) to avoid redundant CTE calls within a single oRPC batch.

- **`getDirectSubordinateIds(userId: string): Promise<string[]>`** — returns only direct report User IDs (single-level query, no CTE). Used for UI affordances like showing "your team" counts.

- **`validateNoCircularSupervisor(userId: string, newSupervisorId: string): Promise<void>`** — before a Supervisor assignment is committed, walks up the chain from `newSupervisorId` to confirm `userId` is not an ancestor. Throws a structured error if circular. This prevents cycles at write time rather than at read time.

### Authorization Scoping Helper (`scope-by-hierarchy`)

A composable helper function that applies the Supervisor-scoping WHERE clause to Drizzle queries.

- **`scopeByAssigneeHierarchy(assigneeColumn, userId: string, role: RoleCode): Promise<SQL>`** — returns a Drizzle SQL expression:
  - If `role === "admin"`: returns `undefined` (no filter applied — admin sees all)
  - Otherwise: resolves subordinate IDs via `getSubordinateIds(userId)`, then returns `inArray(assigneeColumn, [userId, ...subordinateIds])`
  - If the User has no Subordinates, returns `eq(assigneeColumn, userId)`

This helper is imported and used inside the `list` functions of client-service, client-contract-service, and job-mandate-service.

### Integration into existing admin updateUser

The existing `admin.updateUser` oRPC procedure gains an optional `supervisorId` field in its input schema. When provided:
- If `supervisorId` is `null`, the User's `supervisor_id` is set to null
- If `supervisorId` is a string, `validateNoCircularSupervisor` is called before updating
- The Supervisor must be an existing, non-banned User

No new oRPC endpoint is created. The existing member edit UI (`$memberId.tsx`) already has a Supervisor select dropdown; the backend now validates and persists it.

### Request-level caching

Since multiple services in a single request may need the same User's subordinate list, a simple `Map<string, string[]>` is created per request (attached to the oRPC context or passed through service function arguments). `getSubordinateIds` checks this map before executing the CTE. The map lives for the duration of the oRPC handler call only — no cross-request persistence.

### No new database schema changes

The `supervisor_id` column and self-referential FK already exist in `src/schema/auth.ts`. No migration needed. The recursive CTE queries against this column directly.

### Entities that use Supervisor scoping

| Entity | Scoping Rule |
|---|---|
| Clients | Assignee = self ∪ descendants |
| Client Contracts | Assignee = self ∪ descendants |
| Job Mandates | Assignee = self ∪ descendants |
| Prospects | No scoping — visible to all authenticated users |
| Tasks | No scoping — visible to all authenticated users; edit/archive gated by Creator/Assignee/Supervisor of Assignee (existing logic) |
| Reminders | No scoping — owned by User |
| Notifications | No scoping — personal, User sees own only |

### Task update/archive Supervisor check enhancement

The existing Task scoping rule (update/archive by Creator, Assignee, or Supervisor of Assignee) currently has no implementation for the Supervisor check. This PRD adds that check: before allowing a Task update or archive, the service resolves the Assignee's Supervisor chain and verifies the requesting User is in it.

## Testing Decisions

Tests should validate external behavior of the deep modules, not implementation details.

- **supervisor-hierarchy-service tests**:
  - `getSubordinateIds` returns correct descendants for a 3-level hierarchy
  - `getSubordinateIds` returns empty array for a leaf User (no subordinates)
  - `getDirectSubordinateIds` returns only direct reports
  - `validateNoCircularSupervisor` rejects a direct circular assignment (A→B→A)
  - `validateNoCircularSupervisor` rejects an indirect circular assignment (A→B→C→A)
  - `validateNoCircularSupervisor` allows a valid assignment (D supervises A, where D is not in A's subtree)

- **scope-by-hierarchy tests**:
  - Admin role returns no filter (undefined)
  - User with subordinates gets `inArray` filter including self + descendants
  - User without subordinates gets `eq` filter for self only

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- Materialized path or nested set optimization for the hierarchy (recursive CTE is sufficient for expected org depth)
- Cross-request caching of the hierarchy (e.g., Redis)
- UI for visualizing the org chart / Supervisor tree
- Bulk Supervisor assignment (reassigning a whole team at once)
- Supervisor delegation (a Subordinate acting on behalf of a Supervisor)
- Role-based restrictions on who can be a Supervisor (any User can be assigned as one)
- History/audit trail of Supervisor changes (Change Records for User entity edits)
- Client-side hierarchy resolution (all scoping happens server-side)

## Further Notes

- The recursive CTE approach is optimal for org trees with depth ≤ 10, which covers recruitment agencies. If depth grows beyond ~50 levels, a materialized path column should be considered.
- The `validateNoCircularSupervisor` function is a runtime guard. The database FK constraint does not prevent cycles because the FK is from `supervisor_id` to `id` on the same table — Postgres allows cycles in self-referential FKs as long as the referenced row exists.
- Request-level caching of subordinate IDs prevents N+1 queries when multiple services in the same request need the same User's hierarchy.
- The Task Supervisor check (Creator/Assignee/Supervisor of Assignee) is the only place where the hierarchy is used for write access rather than read access. All other uses are read scoping.
