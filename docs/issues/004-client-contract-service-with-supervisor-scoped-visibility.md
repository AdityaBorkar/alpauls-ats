# Client Contract Service with Supervisor-Scoped Visibility

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

A full vertical slice for the Client Contract entity: service layer, oRPC router, and scoped list visibility. The `client_contracts` table schema already exists in `src/schema/client-contract.ts` (with `assigneeId`, `clientId` FK to `clients`, `contractEvents` change-record table). No schema changes needed.

**Service** (`client-contract-service`): CRUD functions — `createContract`, `getContract`, `listContracts`, `updateContract`, `archiveContract`. The `listContracts` function accepts the requesting User's ID and role, and applies `scopeByAssigneeHierarchy` to the `clientContracts.assigneeId` column. Creating a Contract requires a valid `clientId`; the Contract is auto-assigned to the creating User. Every edit produces a Change Record in `contractEvents`.

**oRPC router** (`clientContract.*`): Procedures for create, list, getById, update, archive. Protected with permission metadata (`resource: "client_contracts"`, appropriate action). The `list` procedure passes the authenticated User's ID and role for scoping.

## Acceptance criteria

- [ ] A Supervisor can list Client Contracts assigned to their Subordinates (any depth)
- [ ] A non-Supervisor User can list only their own Client Contracts
- [ ] An Admin can list all Client Contracts regardless of assignee
- [ ] A Supervisor's scoped list includes Contracts assigned directly to themselves
- [ ] Creating a Contract requires a valid `clientId` and auto-assigns the creating User
- [ ] Every Contract edit produces an immutable Change Record in `contractEvents`
- [ ] Archived Contracts are excluded from the default list (filterable)
- [ ] Permission checks on the oRPC router match the access control definitions for the `client_contracts` resource

## Blocked by

- #001 — Supervisor Hierarchy Service
- #002 — Scope-by-Hierarchy Helper
- #003 — Client Service (Contracts reference Clients; Client CRUD must exist first)
