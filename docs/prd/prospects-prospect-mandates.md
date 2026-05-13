# PRD: Prospects & Prospect Mandates

## Problem Statement

The recruitment application defines Prospects as the person entity in the system, and Prospect Mandates as the relationship between a Prospect and a Job Mandate, storing the current stage (`prospect` → `applicant` → `candidate` → `hired` / `rejected`). The database schema (`prospects`, `prospect_events`, `prospect_mandates`, `prospect_mandate_events`) already exists, but there are no services, oRPC routers, routes, or UI components. SCs and Callers cannot create prospects, TLs and RMs cannot advance prospects through the pipeline, QCs cannot verify applicants, and no Prospect Mandate Events are recorded on stage changes. The core recruitment workflow — sourcing, screening, verifying, and placing candidates — has no implementation.

## Solution

Build a Prospects module and a Prospect Mandates module, each as a deep service. Prospect-service handles Prospect CRUD, archiving, field-level change detection (producing Change Records), and universal visibility (all authenticated users can read). Prospect-mandate-service handles linking/unlinking Prospects to Mandates, stage transitions with permission gating, and immutable Prospect Mandate Events. The prospect→applicant transition is gated by `prospects:update` (Caller or SC). The applicant→candidate transition is gated by `job_mandates:verify` (QC). The candidate→hired transition is gated by `job_mandates:assign` (RM). QC rejection sets stage to `rejected` with a reason. Rejected prospects can be re-linked to the same mandate with a confirmation dialog in the UI. Exposed via oRPC with permission enforcement. The UI provides a Prospects list view and a slide-out detail panel showing prospect info, linked mandates with stages, and stage transition actions.

## User Stories

1. As an SC or Caller, I want to create a Prospect with name, phone, and optional email, so that person records are captured in the system
2. As an SC or Caller, I want to update a Prospect's name, phone, email, or description, so that prospect info stays current
3. As a user, I want to view all Prospects in a sortable, filterable table, so that I can find who I need
4. As a user, I want Prospects to be visible to all authenticated users regardless of Supervisor hierarchy, so that prospect data is universally accessible
5. As an SC, I want to archive a Prospect, so that inactive person records don't clutter my views
6. As a user, I want archived Prospects hidden by default, so that my list stays focused
7. As a user, I want to toggle "show archived" to see archived Prospects, so that I can review past entries
8. As a user, I want every field-level change to a Prospect to produce an immutable Change Record, so that there is always an audit trail
9. As a user, I want to click a Prospect row to open a detail panel, so that I can see full info without navigating away
10. As an SC or Caller, I want to link a Prospect to a Job Mandate, so that the Prospect enters the recruitment pipeline for that position
11. As an SC or Caller, I want a newly linked Prospect to start at the `prospect` stage, so that the pipeline entry is consistent
12. As a Caller or SC, I want to advance a Prospect from `prospect` to `applicant` stage on a Mandate, so that I can record that the person expressed interest
13. As a QC, I want to verify a Prospect by advancing from `applicant` to `candidate` stage, so that quality-checked prospects move forward
14. As a QC, I want to reject a Prospect at the applicant stage with a reason (e.g., `internal_qc`), so that unqualified applicants are filtered out
15. As an RM, I want to advance a Prospect from `candidate` to `hired` stage, so that I can confirm placement when the client communicates the hire
16. As a user, I want a Prospect at `candidate` stage to be final — they cannot be rejected or reverted, so that verified candidates are protected
17. As a user, I want every stage change on a Prospect Mandate to produce an immutable Prospect Mandate Event, so that the full stage history is preserved
18. As a user, I want to see the Prospect Mandate Event history for a Prospect↔Mandate pair, so that I can review the stage transition timeline
19. As an SC or TL, I want to unlink a Prospect from a Mandate, so that mistaken associations can be removed
20. As a user, I want to re-link a previously rejected Prospect to the same Mandate, so that they can re-enter the pipeline
21. As a user, I want the UI to show a confirmation dialog before re-including a rejected Prospect in the flow, so that I don't accidentally re-add them
22. As an RM, I want the `candidate → hired` transition to trigger the mandate's auto-transition check (does hired count = total headcount?), so that the mandate status is kept in sync
23. As a user, I want to filter Prospects by name/phone text search, email, and archived status, so that I can narrow results
24. As a user, I want to see a Prospect's linked Mandates and their stages within the detail panel, so that I can see where this person is in the pipeline
25. As a developer, I want the prospect-service to follow the same deep-module pattern as task-service, so that the architecture is consistent
26. As a developer, I want stage transitions to be explicit service methods with permission gating, so that the correct roles enforce the correct transitions
27. As a developer, I want the same Prospect to be at different stages for different Mandates, so that the per-mandate stage model is enforced
28. As a developer, I want a Prospect with no Mandate links to have no stage attribute at all, so that "stage" is always mandate-relative
29. As a developer, I want oRPC procedures to enforce `prospects` and `job_mandates` resource permissions, so that authorization is consistent
30. As a user, I want the Prospect list response to include linked mandate count and current stages, so that I can see pipeline status at a glance
31. As a user, I want cursor-based pagination on the Prospect list, so that scrolling through large datasets is stable

## Implementation Decisions

### Prospect Service (`prospect-service`)

A deep module encapsulating Prospect business logic.

- **`createProspect(input, userId)`** — creates a Prospect with name (required), phone (required), email (optional), description (optional). Records a Change Record for each non-null field.
- **`updateProspect(id, input, userId)`** — diffs fields, produces Change Records, updates the row. Permission: `prospects:update`.
- **`archiveProspect(id, userId)`** — sets `archived = true`, records a Change Record. Permission: `prospects:archive`.
- **`getProspect(id)`** — fetches a single Prospect with nested Prospect Mandates (including mandate details and stages).
- **`listProspects(filters, userId)`** — no Supervisor scoping (visible to all authenticated users). Filters: search (ILIKE on name, phone, email), archived (default false). Cursor-based pagination. Default sort: name ascending.
- **`listProspectEvents(prospectId, cursor, limit)`** — returns Change Records for a Prospect.

### Prospect Mandate Service (`prospect-mandate-service`)

A deep module encapsulating the Prospect↔Mandate relationship and stage lifecycle.

- **`linkProspect(input: { prospectId, mandateId, userId })`** — creates a Prospect Mandate record with stage `prospect`. Validates: no duplicate (prospect_id + mandate_id unique constraint). If a previously rejected record exists for this pair, the UI should confirm re-inclusion, but the service simply creates a new record (the old rejected record remains for audit). Permission: `job_mandates:link_prospect`.
- **`unlinkProspect(prospectMandateId)`** — deletes the Prospect Mandate record. Permission: `job_mandates:link_prospect`.
- **`updateStage(prospectMandateId, newStage, userId, reason?)`** — the core stage transition method. Validates the transition against the allowed transition table (see below). Records a Prospect Mandate Event (old_stage, new_stage, changed_by, changed_at). Returns the updated Prospect Mandate. If `newStage === 'hired'`, triggers the mandate auto-transition check (delegates to mandate-service).
- **`listProspectMandates(filters)`** — filters: prospectId, mandateId, stage. Returns Prospect Mandates with nested prospect and mandate details.
- **`listProspectMandateEvents(prospectMandateId, cursor, limit)`** — returns Prospect Mandate Events for a given Prospect Mandate, ordered by `changed_at` desc.

### Stage transition rules

The `updateStage` method enforces the following transition table:

| Current Stage | Allowed Next Stage | Permission Required | Notes |
|---|---|---|---|
| `prospect` | `applicant` | `prospects:update` | Caller or SC advances after contact |
| `applicant` | `candidate` | `job_mandates:verify` | QC verification |
| `applicant` | `rejected` | `job_mandates:verify` | QC rejection (with reason) |
| `candidate` | `hired` | `job_mandates:assign` | RM confirms placement |
| `rejected` | — | — | Cannot transition; must re-link (creates new record) |

Invalid transitions (e.g., `prospect` → `candidate`, `candidate` → `rejected`, `rejected` → `applicant`) are rejected with a structured error.

The `candidate` stage is final — once a Prospect is a candidate, they cannot be rejected or reverted to any earlier stage.

The `rejected` stage is terminal for that record — re-inclusion requires creating a new Prospect Mandate record (the UI presents a confirmation dialog before calling `linkProspect` again).

### Re-linking rejected prospects

When `linkProspect` is called for a (prospectId, mandateId) pair that already has a `rejected` record, the service creates a new Prospect Mandate record at stage `prospect`. The old rejected record is preserved for audit (Prospect Mandate Events still reference it). The UI detects the existing rejected record and shows a confirmation dialog before proceeding.

### oRPC Router

**`prospect` router** — all procedures require authentication:
- `prospect.list` — `prospects:read` permission
- `prospect.create` — `prospects:create` permission
- `prospect.update` — `prospects:update` permission
- `prospect.archive` — `prospects:archive` permission

**`prospectMandate` router** — all procedures require authentication:
- `prospectMandate.link` — `job_mandates:link_prospect` permission
- `prospectMandate.updateStage` — permission depends on the transition (see stage transition table; checked server-side)
- `prospectMandate.unlink` — `job_mandates:link_prospect` permission
- `prospectMandate.listEvents` — `prospects:read` permission

### Filter contract for `prospect.list`

- `search` (optional, text — ILIKE search on name, phone, email)
- `archived` (optional, boolean — default false)
- `cursor` (optional, string)
- `limit` (optional, integer — default 20)
- `sort_by` (optional, enum — default `name`)
- `sort_order` (optional, `asc` | `desc` — default `asc`)

### Frontend modules

1. **prospects-route**: The `/prospects` route component. Contains the list view and the "New Prospect" button. Manages the detail panel state.

2. **prospect-list-view**: Sortable, filterable table. Server-side filtering via oRPC. Columns: name (text), phone (text), email (text), linked mandates count, archived (option). Clicking a row opens the detail panel.

3. **prospect-detail-panel**: Slide-out drawer. Sections: editable prospect fields (name, phone, email, description), linked Mandates section (list of Prospect Mandates with stage badges, stage transition actions per role, unlink action), Change Record history timeline for the Prospect.

4. **prospect-mandate-stage-actions**: Contextual action buttons within the linked Mandates section of the prospect detail panel. Actions available depend on the current stage and the user's role/permissions:
   - `prospect` → `applicant` button (visible to Callers, SCs with `prospects:update`)
   - `applicant` → `candidate` button (visible to QC with `job_mandates:verify`)
   - `applicant` → `rejected` button with reason input (visible to QC with `job_mandates:verify`)
   - `candidate` → `hired` button (visible to RM with `job_mandates:assign`)

5. **re-link-confirmation-dialog**: Modal dialog shown when a user tries to link a Prospect to a Mandate where a `rejected` record already exists. Confirms "This prospect was previously rejected for this mandate. Re-include in pipeline?"

### Existing schema

The `prospects`, `prospect_events`, `prospect_mandates`, and `prospect_mandate_events` tables already exist in `src/schema/`. The `prospectStageEnum` defines `prospect`, `applicant`, `candidate`, `hired`, `rejected`. The unique index on `(prospect_id, mandate_id)` exists. No schema changes needed.

### Visibility

Prospects are visible to all authenticated users — no Supervisor scoping. This is consistent with the domain model: prospect data is universal, while client and mandate data is hierarchy-scoped.

### Integration with Job Mandate service

When `prospectMandate.updateStage` transitions a Prospect Mandate to `hired`, it calls `mandate-service.checkAutoTransition(mandateId)` to evaluate whether the mandate should auto-transition to `hired` status. This keeps the cross-entity dependency explicit and one-directional (prospect-mandate-service → mandate-service).

## Testing Decisions

Tests should validate external behavior of the deep modules.

- **prospect-service tests**:
  - `createProspect` with required fields succeeds
  - `updateProspect` produces Change Records for changed fields
  - `archiveProspect` sets `archived = true` and produces a Change Record
  - `listProspects` returns all prospects (no scoping)
  - `listProspects` with `archived=false` excludes archived
  - Cursor-based pagination works correctly

- **prospect-mandate-service tests**:
  - `linkProspect` creates a record at `prospect` stage
  - `linkProspect` rejects duplicate (same prospect + mandate where stage is not `rejected`)
  - `linkProspect` for a previously rejected pair creates a new record
  - `updateStage` allows `prospect` → `applicant` (with `prospects:update` permission)
  - `updateStage` allows `applicant` → `candidate` (with `job_mandates:verify` permission)
  - `updateStage` allows `applicant` → `rejected` (with `job_mandates:verify` permission, records reason)
  - `updateStage` allows `candidate` → `hired` (with `job_mandates:assign` permission)
  - `updateStage` rejects `prospect` → `candidate` (invalid transition)
  - `updateStage` rejects `candidate` → `rejected` (candidate is final)
  - `updateStage` rejects `rejected` → any stage (terminal)
  - Every `updateStage` produces a Prospect Mandate Event with correct old/new stage
  - `updateStage` to `hired` triggers mandate auto-transition check
  - `unlinkProspect` removes the record

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- Prospect profile photo / avatar
- Prospect resume / CV file attachments
- Prospect communication history (calls, emails, WhatsApp messages)
- Duplicate Prospect detection (same phone or email)
- Bulk import of Prospects (CSV, Excel)
- Prospect tagging or custom fields
- Prospect search by mandate stage across mandates
- Prospect pipeline view (dedicated Kanban for prospects by stage — the stage is mandate-relative, making a global Kanban ambiguous)
- WhatsApp integration for prospect communication (stub exists in `integrations/whatsapp/`)
- Prospect consent / GDPR data handling
- Prospect source tracking (where the prospect was found)
- Prospect notes or comments separate from description

## Further Notes

- A Prospect's stage is always relative to a specific Job Mandate. A global "Prospect stage" does not exist — the same person can be a `prospect` on one mandate and a `candidate` on another. The UI reflects this by showing stages per mandate in the detail panel.
- The re-linking flow for rejected prospects creates a NEW `prospect_mandates` row. The unique index on `(prospect_id, mandate_id)` must be handled: either the old rejected row is soft-deleted (set a flag) or the unique constraint allows multiple rows per pair. The current schema has a `uniqueIndex` on `(prospect_id, mandate_id)`, which would prevent re-linking. This constraint should be changed to allow re-linking — either by removing the unique index (allowing multiple rows with different stages) or by archiving the old record before inserting the new one. The recommended approach: when re-linking, the old `rejected` record is kept but the unique constraint is relaxed by adding `stage` to the unique index (so a rejected record and a prospect record can coexist for the same pair), OR the rejected record is hard-deleted before creating the new one. The simpler approach is to hard-delete the rejected record (it already has Prospect Mandate Events preserved for audit) and create a fresh one. This PRD recommends the hard-delete-and-recreate approach.
- The `candidate` stage being final is a domain rule: once QC-verified, a Prospect cannot be "un-verified." If a mistake was made, the only recourse is to unlink and re-link (which starts at `prospect` again).
- The QC rejection reason is a free-text field stored in the `reason` column of `prospect_mandates`. It is set only when `stage = 'rejected'` and is nullable otherwise.
