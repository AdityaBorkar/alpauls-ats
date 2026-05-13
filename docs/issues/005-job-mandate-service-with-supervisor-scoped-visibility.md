# Job Mandate Service with Supervisor-Scoped Visibility

## Parent

PRD: Supervisor Hierarchy & Data Scoping (`docs/prd/supervisor-hierarchy-scoping.md`)

## What to build

A full vertical slice for the Job Mandate entity: service layer, oRPC router, and scoped list visibility. The `job_mandates` table schema already exists in `src/schema/job-mandate.ts` (with `assigneeId`, `clientContractId` FK to `client_contracts`, `mandateEvents` change-record table, `mandateStatusEnum`). No schema changes needed.

**Service** (`job-mandate-service`): CRUD functions — `createMandate`, `getMandate`, `listMandates`, `updateMandate`, `archiveMandate`. The `listMandates` function accepts the requesting User's ID and role, and applies `scopeByAssigneeHierarchy` to the `jobMandates.assigneeId` column. Creating a Mandate requires a valid `clientContractId`; the Mandate is auto-assigned to the creating User. Lifecycle transitions follow the `mandateStatusEnum`: `open` → `in_progress` → `hired` → `completed` (or `cancelled`). Every edit produces a Change Record in `mandateEvents`.

**oRPC router** (`jobMandate.*`): Procedures for create, list, getById, update, archive. Protected with permission metadata (`resource: "job_mandates"`, appropriate action). The `list` procedure passes the authenticated User's ID and role for scoping.

## Acceptance criteria

- [ ] A Supervisor can list Job Mandates assigned to their Subordinates (any depth)
- [ ] A non-Supervisor User can list only their own Job Mandates
- [ ] An Admin can list all Job Mandates regardless of assignee
- [ ] A Supervisor's scoped list includes Mandates assigned directly to themselves
- [ ] Creating a Mandate requires a valid `clientContractId` and auto-assigns the creating User
- [ ] Mandate status transitions follow the defined lifecycle (`open` → `in_progress` → `hired` → `completed` / `cancelled`)
- [ ] Every Mandate edit produces an immutable Change Record in `mandateEvents`
- [ ] Archived Mandates are excluded from the default list (filterable)
- [ ] Permission checks on the oRPC router match the access control definitions for the `job_mandates` resource

## Blocked by

- #001 — Supervisor Hierarchy Service
- #002 — Scope-by-Hierarchy Helper
- #004 — Client Contract Service (Mandates reference Contracts; Contract CRUD must exist first)
