# Task Update/Archive Supervisor Authorization

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

The existing Task service (`task-service`) accepts a `userId` parameter on `updateTask` and `archiveTask`, but only uses it for recording Task Events — not for access control. Per the domain model, a Task can only be updated or archived by the Creator, the Assignee, or a Supervisor of the Assignee. This slice adds that authorization check.

Before allowing a Task update or archive, the service resolves the Assignee's Supervisor chain (all ancestors up the `supervisor_id` chain) and verifies the requesting User is either the Creator, the Assignee, or in the Assignee's Supervisor chain. If none match, throw a structured `ORPCError` with `FORBIDDEN` code.

Task **read** remains unscoped — all authenticated users can list and view any Task. This is consistent with the Ubiquitous Language: "All authenticated users (read); update/archive by Creator/Assignee/Assignee's Supervisor."

Note: The Supervisor chain check here walks **up** from the Assignee (ancestors), which is the inverse of `getSubordinateIds` (which walks **down**). A `getAncestorIds(userId)` function or equivalent walk-up query is needed in `supervisor-hierarchy-service`.

## Acceptance criteria

- [ ] A Task's Creator can update and archive the Task
- [ ] A Task's Assignee can update and archive the Task
- [ ] A Supervisor of the Assignee (direct or indirect) can update and archive the Task
- [ ] A User who is neither Creator, Assignee, nor Supervisor of Assignee receives `FORBIDDEN` on update/archive
- [ ] Task list and getById remain unscoped (all authenticated users can read)
- [ ] A `getAncestorIds` (or equivalent upward-chain) function exists in `supervisor-hierarchy-service`
- [ ] Tests follow the pattern in `src/services/__tests__/` using Vitest + PGlite

## Blocked by

- #001 — Supervisor Hierarchy Service (depends on ancestor-chain resolution)
