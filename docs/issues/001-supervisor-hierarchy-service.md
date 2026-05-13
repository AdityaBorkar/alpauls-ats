# Supervisor Hierarchy Service

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

A deep module (`supervisor-hierarchy-service`) that encapsulates all Supervisor hierarchy traversal logic. Three functions:

- **`getSubordinateIds(userId)`** — returns all descendant User IDs (direct + indirect) using a recursive CTE against the `user` table's `supervisor_id` column. Results are cached per-request via a `Map<string, string[]>` attached to the oRPC context to avoid redundant CTE calls within a single oRPC batch. The cache lives only for the duration of the handler call.

- **`getDirectSubordinateIds(userId)`** — returns only direct report User IDs (single-level query, no CTE). Used for UI affordances like "your team" counts.

- **`validateNoCircularSupervisor(userId, newSupervisorId)`** — before a Supervisor assignment is committed, walks up the chain from `newSupervisorId` to confirm `userId` is not an ancestor. Throws a structured `ORPCError` if circular. This prevents cycles at write time.

Additionally, refactor the existing `checkSupervisorCycle` function in `src/rpc/router/admin.ts` to call `validateNoCircularSupervisor` instead of duplicating the chain-walk logic. The `admin.updateUser` and `admin.createUser` procedures should use the service function.

The `supervisor_id` column and self-referential FK already exist in `src/schema/auth.ts` — no schema changes needed.

## Acceptance criteria

- [ ] `getSubordinateIds` returns correct descendant IDs for a 3-level hierarchy (e.g., A→B→C, calling for A returns [B, C])
- [ ] `getSubordinateIds` returns empty array for a leaf User (no subordinates)
- [ ] `getDirectSubordinateIds` returns only direct reports (not indirect descendants)
- [ ] `validateNoCircularSupervisor` rejects a direct circular assignment (A supervises B, then B supervises A)
- [ ] `validateNoCircularSupervisor` rejects an indirect circular assignment (A→B→C, then C supervises A)
- [ ] `validateNoCircularSupervisor` allows a valid assignment (D supervises A, where D is not in A's subtree)
- [ ] Request-level cache prevents duplicate CTE execution within a single oRPC handler call
- [ ] `admin.updateUser` and `admin.createUser` use `validateNoCircularSupervisor` from the service (no duplicated chain-walk logic in the router)
- [ ] Tests follow the pattern in `src/services/__tests__/` using Vitest + PGlite
- [ ] `seedUser` helper in `tests/db.ts` accepts optional `supervisorId` override

## Blocked by

None — can start immediately.
