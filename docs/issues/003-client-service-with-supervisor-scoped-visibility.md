# Client Service with Supervisor-Scoped Visibility

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

A full vertical slice for the Client entity: service layer, oRPC router, and scoped list visibility. The `clients` table schema already exists in `src/schema/client.ts` (with `assigneeId`, `clientEvents` change-record table). No schema changes needed.

**Service** (`client-service`): CRUD functions — `createClient`, `getClient`, `listClients`, `updateClient`, `archiveClient`. The `listClients` function accepts the requesting User's ID and role, and applies `scopeByAssigneeHierarchy` to the `clients.assigneeId` column so that a Supervisor sees Clients assigned to themselves or their Subordinates. Admin bypasses all scoping. Every edit produces a Change Record in `clientEvents`.

**oRPC router** (`client.*`): Procedures for create, list, getById, update, archive. Protected with permission metadata (`resource: "clients"`, appropriate action). The `list` procedure passes the authenticated User's ID and role to `listClients` for scoping.

## Acceptance criteria

- [ ] A Supervisor can list Clients assigned to their direct Subordinates
- [ ] A Supervisor can list Clients assigned to Subordinates at any depth in the hierarchy
- [ ] A User who is not a Supervisor can list only their own Clients
- [ ] An Admin can list all Clients regardless of assignee
- [ ] A Supervisor's scoped list includes Clients assigned directly to themselves
- [ ] Creating a Client auto-assigns the creating User as the Assignee
- [ ] Every Client edit produces an immutable Change Record in `clientEvents`
- [ ] Archived Clients are excluded from the default list (filterable)
- [ ] Permission checks on the oRPC router match the access control definitions for the `clients` resource
- [ ] Tests follow the pattern in `src/services/__tests__/` using Vitest + PGlite

## Blocked by

- #001 — Supervisor Hierarchy Service
- #002 — Scope-by-Hierarchy Helper
