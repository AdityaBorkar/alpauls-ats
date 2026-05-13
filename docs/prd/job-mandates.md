# PRD: Job Mandates

## Problem Statement

The recruitment application defines Job Mandates as the core unit of recruitment work — open positions a Client wants filled, linked to a Client Contract, with an assignee, a lifecycle (`open` → `in_progress` → `hired` → `completed` / `cancelled`), and positions with headcounts per location. The database schema (`job_mandates`, `mandate_events`) already exists, but there are no services, oRPC routers, routes, or UI components. RMs cannot create mandates, TLs cannot be assigned to manage them, Callers cannot see what positions to fill, and no Change Records are produced on edits. The assignment chain (RM creates → assigns TL → TL re-assigns to Callers) and the auto-transition to `hired` when headcount is met are both unimplemented.

## Solution

Build a Job Mandate module following the deep-module pattern of task-service. The mandate-service handles CRUD, lifecycle transitions, assignment (including the RM→TL→Caller chain), archiving, field-level change detection (producing Change Records), and Supervisor-scoped list queries. The mandate's `positions` JSON column stores headcounts per location. The service auto-transitions mandate status to `hired` when the count of `hired`-stage Prospect Mandates equals the total headcount across all positions. Completed mandates are auto-archived. Exposed via oRPC with permission enforcement. The UI provides a list view, a Kanban view (columns by Mandate Status), and a slide-out detail panel showing mandate info, linked prospects with stages, and assignment details.

## User Stories

1. As an RM, I want to create a Job Mandate under a Client Contract, so that I can define the open position the client wants filled
2. As an RM, I want to set the Mandate's title, description, and positions with headcounts per location, so that the role requirements are clear
3. As an RM, I want to assign a Job Mandate to a TL, so that the TL is responsible for filling the position
4. As a TL, I want to re-assign a Job Mandate to a Caller, so that the Caller can source prospects
5. As a TL or Caller, I want to update a Mandate's title, description, or positions, so that requirements stay current
6. As a user, I want the Mandate status to default to `open` on creation, so that I don't have to set it manually
7. As an RM, I want a Mandate to transition to `in_progress` when it is assigned or when the first Prospect is linked, so that the pipeline reflects activity
8. As an RM, I want a Mandate to auto-transition to `hired` when the count of hired Prospect Mandates equals the total headcount, so that I don't have to track this manually
9. As an RM, I want a `hired` Mandate to auto-transition to `completed` and be archived, so that completed work is cleaned up
10. As an RM, I want to cancel a Mandate, so that positions that are no longer needed are marked accordingly
11. As a user, I want to view all Mandates in a sortable, filterable table, so that I can find what I need
12. As a user, I want to view Mandates grouped by status in a Kanban layout, so that I can see the pipeline at a glance
13. As a user, I want Kanban cards to show title, assignee avatar, and client badge, so that I can identify mandates quickly
14. As a Supervisor, I want to see Mandates assigned to me and my Subordinates, so that I have oversight
15. As an Admin, I want to see all Mandates regardless of assignment, so that I have full visibility
16. As a user, I want archived/completed Mandates hidden by default, so that my views stay focused
17. As a user, I want to toggle "show archived" to see completed/cancelled mandates, so that I can review past work
18. As a user, I want to click a Mandate row or card to open a detail panel, so that I can see full info without navigating away
19. As a user, I want to see linked Prospects and their stages within the Mandate detail panel, so that I can see who is in the pipeline
20. As an RM or TL, I want every field-level change to a Mandate to produce an immutable Change Record, so that there is always an audit trail
21. As an RM or TL, I want to see the Change Record history timeline for a Mandate, so that I know who changed what and when
22. As an RM, I want to verify (QC-pass) a Prospect on a Mandate, so that the Prospect transitions from applicant to candidate
23. As a QC, I want to verify a Prospect on a Mandate, so that quality-checked prospects move forward in the pipeline
24. As an RM, I want to link a Prospect to a Mandate, so that the Prospect enters the recruitment pipeline for this position
25. As an RM or TL, I want to filter Mandates by status, assignee, text search, and Client Contract, so that I can narrow results
26. As a user, I want the Mandate list response to include assignee details and client contract info, so that I don't need extra requests
27. As a user, I want cursor-based pagination on the Mandate list, so that scrolling through large datasets is stable
28. As a developer, I want the auto-transition to `hired` logic to compare flat headcount (sum of all positions) against the count of `hired`-stage Prospect Mandates, so that location-specific assignment is not enforced
29. As a developer, I want the mandate-service to follow the same deep-module pattern as task-service, so that the architecture is consistent
30. As a developer, I want oRPC procedures to enforce `job_mandates` resource permissions, so that authorization is consistent
31. As a developer, I want the `verify` action on `job_mandates` to be a distinct permission gated to the QC role, so that QC verification is separate from general mandate updates
32. As a developer, I want the `assign` action on `job_mandates` to be a distinct permission, so that the RM→TL→Caller assignment chain is permission-gated
33. As a developer, I want the `link_prospect` action on `job_mandates` to be a distinct permission, so that prospect-to-mandate linking is controlled

## Implementation Decisions

### Mandate Service (`mandate-service`)

A deep module encapsulating Job Mandate business logic.

- **`createMandate(input, userId)`** — creates a Mandate under a Client Contract. Auto-sets `assigneeId` to `userId` (the creating RM). Status defaults to `open`. Validates `clientContractId` exists. Records Change Records for each non-null field.
- **`updateMandate(id, input, userId)`** — diffs fields, produces Change Records, updates the row. Allowed fields: title, description, positions. Does NOT change status directly (status transitions are explicit actions).
- **`assignMandate(id, assigneeId, userId)`** — changes `assigneeId`. This is the mechanism for the RM→TL→Caller assignment chain. Permission: `job_mandates:assign`. If the mandate is `open` and gets assigned, status transitions to `in_progress`. Records a Change Record for `assigneeId`.
- **`verifyProspectOnMandate(mandateId, prospectMandateId, userId)`** — QC verification action. Permission: `job_mandates:verify`. Delegates to the Prospect Mandate service for the actual stage transition (applicant → candidate). After the transition, checks if the mandate should auto-transition to `hired`.
- **`cancelMandate(id, userId)`** — sets status to `cancelled`. Records a Change Record. Only valid from `open` or `in_progress` status.
- **`archiveMandate(id, userId)`** — sets `archived = true`, records a Change Record. Typically called by the auto-transition logic, but can also be called manually.
- **`getMandate(id)`** — fetches a single Mandate with nested assignee, client contract (with client name), linked Prospect Mandates (with prospect details and stages).
- **`listMandates(filters, userId, role)`** — Supervisor-scoped via `scopeByAssigneeHierarchy`. Filters: status (array), assignee_id, search (ILIKE on title/description), client_contract_id, archived (default false). Cursor-based pagination. Default sort: created_at descending.
- **`listMandateEvents(mandateId, cursor, limit)`** — returns Change Records for a Mandate.

### Auto-transition logic

After any Prospect Mandate stage change that results in a `hired` stage, the mandate-service checks:
1. Sum all `headcount` values across the Mandate's `positions` JSON array → `totalHeadcount`
2. Count Prospect Mandates with `stage = 'hired'` for this mandate → `hiredCount`
3. If `hiredCount >= totalHeadcount`: transition mandate status to `hired`, record a Change Record, then auto-archive (set `archived = true`, transition to `completed`, record another Change Record)

This is a flat headcount comparison — no location-specific assignment is enforced. A hire in Dubai counts toward the total, not specifically toward the Dubai headcount.

### Status transition rules

| From | To | Trigger |
|---|---|---|
| `open` | `in_progress` | Assignment (`assignMandate`) or first Prospect linked |
| `in_progress` | `hired` | Auto-transition when hired count = total headcount |
| `hired` | `completed` | Auto-transition immediately after `hired` (archived) |
| `open` or `in_progress` | `cancelled` | Manual `cancelMandate` call |

Invalid transitions are rejected with a structured error (e.g., cannot transition from `completed` back to `in_progress`).

### oRPC Router

**`jobMandate` router** — all procedures require authentication:
- `jobMandate.list` — `job_mandates:read` permission
- `jobMandate.create` — `job_mandates:create` permission
- `jobMandate.update` — `job_mandates:update` permission
- `jobMandate.assign` — `job_mandates:assign` permission
- `jobMandate.verify` — `job_mandates:verify` permission
- `jobMandate.archive` — `job_mandates:archive` permission
- `jobMandate.getById` — `job_mandates:read` permission
- `jobMandate.listEvents` — `job_mandates:read` permission

### Filter contract for `jobMandate.list`

- `status` (optional, array of mandate status values)
- `assignee_id` (optional, array of user IDs)
- `search` (optional, text — ILIKE search on title and description)
- `client_contract_id` (optional, integer)
- `archived` (optional, boolean — default false)
- `cursor` (optional, string)
- `limit` (optional, integer — default 20)
- `sort_by` (optional, enum — default `created_at`)
- `sort_order` (optional, `asc` | `desc` — default `desc`)

### Frontend modules

1. **mandates-route**: The `/mandates` route component. Manages the view-mode toggle (`list` | `kanban`) via URL search params. Contains the "New Mandate" button.

2. **mandate-list-view**: Sortable, filterable table. Server-side filtering via oRPC. Columns: title (text), status (option), assignee (option), client contract (option), archived (option). Clicking a row opens the detail panel.

3. **mandate-kanban-view**: Kanban columns by Mandate Status (`open`, `in_progress`, `hired`, `cancelled`). Cards display title, assignee avatar, client badge. No `completed` column (completed mandates are auto-archived). Status changes happen through the detail panel, not drag-and-drop.

4. **mandate-detail-panel**: Slide-out drawer. Sections: editable mandate fields (title, description, positions with location+headcount, assignee with assignment chain), linked Prospects section (list of Prospect Mandates with stage badges and QC verify/reject actions), Change Record history timeline.

### Existing schema

The `job_mandates` and `mandate_events` tables already exist in `src/schema/`. The `positions` column is `jsonb` typed as `MandatePosition[]` (`{ location: string; headcount: number }[]`). The `client_contract_id` FK references `client_contracts.id`. No schema changes needed.

### Visibility scoping

Mandate list queries apply Supervisor-scoped visibility via `scopeByAssigneeHierarchy`. Admin sees all. Non-admin sees mandates where `assignee_id` is themselves or one of their Subordinates.

### Relationship to Prospect Mandate service

The mandate-service's `verifyProspectOnMandate` calls into the prospect-mandate-service (defined in the Prospects PRD) to perform the stage transition. After the transition returns, the mandate-service checks the auto-transition condition. This keeps the mandate-service as the orchestrator while the prospect-mandate-service owns the stage transition logic.

## Testing Decisions

Tests should validate external behavior of the deep module.

- **mandate-service tests**:
  - `createMandate` auto-assigns the creating User and defaults status to `open`
  - `assignMandate` changes assignee and transitions `open` → `in_progress`
  - `cancelMandate` transitions `open`/`in_progress` → `cancelled`
  - `cancelMandate` rejects transition from `completed` or `hired`
  - Auto-transition: when `hiredCount === totalHeadcount`, mandate transitions to `hired` then `completed` and is archived
  - Auto-transition does NOT fire when `hiredCount < totalHeadcount`
  - `updateMandate` produces Change Records for changed fields
  - `listMandates` is scoped by Supervisor hierarchy
  - `listMandates` for Admin returns all mandates
  - Cursor-based pagination works correctly
  - Positions JSON is stored and retrieved correctly
  - Flat headcount comparison works across multiple locations

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- Drag-and-drop for Kanban columns
- Manual card reordering within Kanban columns
- Location-specific headcount tracking (flat count only, per CONTEXT.md)
- Mandate duplication / cloning
- Mandate templates
- SLA display for Mandates (static JSON config, deferred)
- Email notifications on mandate status changes (covered by Notifications PRD)
- Mandate-level comments or discussion threads
- Budget or billing fields on mandates
- Reporting / analytics on mandate fill rates
- Import/export of mandate data
- Priority field on Mandates
- Deadline or due date on Mandates (only positions and headcounts define the work)
