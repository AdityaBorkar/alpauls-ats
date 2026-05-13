# PRD: Clients & Client Contracts

## Problem Statement

The recruitment application defines Clients (companies the agency recruits for) and Client Contracts (service agreements between the agency and a Client) as core domain entities. The database schema for both — including their Change Record tables (`client_events`, `contract_events`) — already exists, but there are no services, oRPC routers, routes, or UI components to create, read, update, or archive them. BDs and RMs cannot manage client accounts or track contract terms, and no Change Records are being produced on edits.

## Solution

Build a Clients module and a Client Contracts module, each following the same deep-module pattern as the existing task-service. Client-service handles CRUD, archiving, field-level change detection (producing Change Records), and Supervisor-scoped list queries. Client-contract-service handles CRUD, archiving, change detection, and assignment to an RM. Both are exposed via oRPC procedures with permission enforcement. The UI provides a Clients list view with server-side filtering and a slide-out detail panel showing client info, contracts, and linked mandates. Client Contracts are displayed within the Client detail panel as a list, with their own detail sub-panel.

A Client is auto-assigned to the BD who creates it. A Client Contract is auto-assigned to the creating BD initially; the BD may reassign it to an RM.

## User Stories

1. As a BD, I want to create a Client with a name and optional description, so that I can record companies the agency recruits for
2. As a BD, I want a newly created Client to be automatically assigned to me, so that I am the responsible BD for the account
3. As a BD, I want to update a Client's name or description, so that client info stays current
4. As a BD, I want to archive a Client, so that inactive clients don't clutter my active views
5. As a BD, I want archived Clients hidden by default, so that my list stays focused
6. As a BD, I want to toggle "show archived" to see archived Clients, so that I can recover or review them
7. As a BD, I want to view all Clients in a sortable, filterable table, so that I can quickly find what I need
8. As a BD, I want to filter Clients by name text search, assignee, and archived status, so that I can narrow results
9. As a Supervisor, I want to see Clients assigned to me and my Subordinates, so that I have oversight of my team's accounts
10. As an Admin, I want to see all Clients regardless of assignment, so that I have full visibility
11. As a BD, I want to click a Client row to open a detail panel, so that I can see full client info without navigating away
12. As a BD, I want to see a list of Contracts within the Client detail panel, so that I can see all agreements for this client
13. As a BD, I want every field-level change to a Client to produce an immutable Change Record, so that there is always an audit trail
14. As a BD, I want to see the Change Record history timeline for a Client, so that I know who changed what and when
15. As a BD, I want to create a Client Contract under a Client, so that I can record the terms of engagement
16. As a BD, I want a newly created Client Contract to be automatically assigned to me, so that I am the initial responsible party
17. As a BD, I want to assign a Client Contract to an RM, so that the RM can manage it going forward
18. As an RM, I want to view Client Contracts assigned to me in the Client detail panel, so that I can manage my contracts
19. As a BD or RM, I want to update a Client Contract's title or description, so that contract details stay current
20. As a BD or RM, I want to archive a Client Contract, so that expired contracts don't clutter the list
21. As a BD or RM, I want every field-level change to a Client Contract to produce an immutable Change Record, so that there is always an audit trail
22. As a BD or RM, I want to see the Change Record history timeline for a Client Contract, so that I know who changed what and when
23. As a Supervisor, I want to see Client Contracts assigned to me and my Subordinates, so that I have oversight
24. As a user, I want the Client list response to include assignee details, so that I can see who is responsible without extra requests
25. As a user, I want the Client Contract list to include assignee details and client name, so that I can identify contracts easily
26. As a user, I want cursor-based pagination on the Client list, so that scrolling through large datasets is stable
27. As a BD, I want to reassign a Client to another BD, so that account ownership can be transferred
28. As a developer, I want the client-service and client-contract-service to follow the same deep-module pattern as task-service, so that the architecture is consistent
29. As a developer, I want Change Records to use the same field-level diffing approach as Task Events, so that the audit pattern is uniform
30. As a developer, I want oRPC procedures to enforce the `clients` and `client_contracts` resource permissions, so that authorization is consistent

## Implementation Decisions

### Client Service (`client-service`)

A deep module encapsulating Client business logic.

- **`createClient(input, userId)`** — creates a Client, auto-sets `assigneeId` to `userId` (the creating BD). Records a Change Record for each non-null field.
- **`updateClient(id, input, userId)`** — fetches the current Client, diffs each field, produces a Change Record for each changed field, updates the Client row. Returns the updated Client with nested assignee.
- **`archiveClient(id, userId)`** — sets `archived = true`, records a Change Record.
- **`getClient(id)`** — fetches a single Client with nested assignee, contracts, and linked mandates (via job mandates through contracts).
- **`listClients(filters, userId, role)`** — applies Supervisor-scoped visibility using `scopeByAssigneeHierarchy` from the Supervisor Hierarchy PRD. Server-side filters: name (ILIKE text search), assignee_id, archived (default false). Cursor-based pagination. Default sort: name ascending. Returns Client fields + nested assignee.
- **`listEvents(clientId, cursor, limit)`** — returns Change Records for a Client, ordered by `changed_at` desc.

### Client Contract Service (`client-contract-service`)

A deep module encapsulating Client Contract business logic.

- **`createContract(input, userId)`** — creates a Client Contract under the specified `clientId`. Auto-sets `assigneeId` to `userId` (the creating BD). Records a Change Record for each non-null field.
- **`updateContract(id, input, userId)`** — diffs fields, produces Change Records, updates the row. `assigneeId` can be updated (reassignment to an RM).
- **`archiveContract(id, userId)`** — sets `archived = true`, records a Change Record.
- **`getContract(id)`** — fetches a single Client Contract with nested assignee, client, and linked mandates.
- **`listContracts(filters, userId, role)`** — Supervisor-scoped. Filters: `clientId` (required — contracts are always in the context of a client), `assignee_id`, archived (default false). Cursor-based pagination.
- **`listContractEvents(contractId, cursor, limit)`** — returns Change Records for a Contract.

### oRPC Router

Two new routers added to the root router:

**`client` router** — all procedures require authentication:
- `client.list` — `clients:read` permission
- `client.create` — `clients:create` permission
- `client.update` — `clients:update` permission
- `client.archive` — `clients:archive` permission
- `client.getById` — `clients:read` permission
- `client.listEvents` — `clients:read` permission

**`clientContract` router** — all procedures require authentication:
- `clientContract.list` — `client_contracts:read` permission
- `clientContract.create` — `client_contracts:create` permission
- `clientContract.update` — `client_contracts:update` permission
- `clientContract.archive` — `client_contracts:archive` permission
- `clientContract.getById` — `client_contracts:read` permission

### Filter contract for `client.list`

- `search` (optional, text — ILIKE search on name and description)
- `assignee_id` (optional, array of user IDs)
- `archived` (optional, boolean — default false)
- `cursor` (optional, string)
- `limit` (optional, integer — default 20)
- `sort_by` (optional, enum — default `name`)
- `sort_order` (optional, `asc` | `desc` — default `asc`)

### Filter contract for `clientContract.list`

- `client_id` (required, integer)
- `assignee_id` (optional, array of user IDs)
- `archived` (optional, boolean — default false)
- `cursor` (optional, string)
- `limit` (optional, integer — default 20)

### Frontend modules

1. **clients-route**: The `/clients` route component. Contains the list view and the "New Client" button. Manages the detail panel state (which Client is selected).

2. **client-list-view**: Sortable, filterable table. Server-side filtering via oRPC. Columns: name (text), assignee (option), archived (option). Clicking a row opens the detail panel.

3. **client-detail-panel**: Slide-out drawer. Sections: editable client fields (name, description, assignee), Contracts list (inline, expandable to contract detail), linked mandates (read-only list from job mandates linked through contracts), Change Record history timeline.

4. **client-contract-detail-panel**: Slide-out drawer (opened from within the Client detail panel). Sections: editable contract fields (title, description, assignee with RM option), linked mandates, Change Record history timeline.

### Change Record pattern

Identical to Task Events: field-level diffing on update, each changed field produces a row in `client_events` or `contract_events` with `field`, `old_value`, `new_value`, `changed_by`, `changed_at`. Immutable — no updates or deletes.

### Existing schema

The `clients`, `client_events`, `client_contracts`, and `contract_events` tables already exist in `src/schema/`. No schema changes needed. The schema already includes the `assigneeId` FK to `user.id` and the `clientId` FK on contracts.

### Visibility scoping

Client and Client Contract list queries apply Supervisor-scoped visibility via the `scopeByAssigneeHierarchy` helper from the Supervisor Hierarchy PRD. Admin sees all. Non-admin sees entities where `assignee_id` is themselves or one of their Subordinates.

## Testing Decisions

Tests should validate external behavior of the deep modules.

- **client-service tests**:
  - `createClient` auto-assigns the creating User
  - `updateClient` produces Change Records for each changed field
  - `updateClient` with no changes produces no Change Records
  - `archiveClient` sets `archived = true` and produces a Change Record
  - `listClients` returns only Clients visible to the User via Supervisor scoping
  - `listClients` with `archived=false` excludes archived Clients
  - `listClients` for Admin returns all Clients
  - Cursor-based pagination works correctly

- **client-contract-service tests**:
  - `createContract` auto-assigns the creating User
  - `updateContract` with `assigneeId` change reassigns the Contract
  - `updateContract` produces Change Records
  - `archiveContract` sets `archived = true`
  - `listContracts` is scoped by Supervisor hierarchy
  - `listContracts` requires `clientId` filter

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- SLA display for Client Contracts (SLA is a static JSON config, deferred)
- Client Contract document/file attachments
- Client status or lifecycle beyond active/archived
- Duplicate Client detection (e.g., same name)
- Bulk archive or bulk reassignment
- Client Contract value/currency fields
- Client Contract renewal workflow
- Email notifications on Client/Contract creation or changes (covered by Notifications PRD)
- Export/reporting of Client or Contract data
- Client logo or branding assets

## Further Notes

- Clients and Client Contracts share the same Change Record pattern as Tasks. The `client_events` and `contract_events` tables are already in the schema, matching the `task_events` structure exactly (field, old_value, new_value, changed_by, changed_at).
- A Client Contract's link to Job Mandates is via the `client_contract_id` FK on `job_mandates`. The Client detail panel can show linked mandates by querying mandates that reference any of the client's contracts.
- The BD→RM reassignment flow for Client Contracts is a simple `assigneeId` update — no separate "transfer" action is needed. The permission check (`client_contracts:update`) gates who can reassign.
- Prospects are visible to all authenticated users, but Clients and Contracts are Supervisor-scoped. This means a Caller can see a Prospect but not the Client the Prospect was sourced for — this is intentional (Prospect visibility is universal; Client visibility is hierarchy-based).
