# PRD: Task Management with Reminders

## Problem Statement

Users of the recruitment application have no way to track, assign, and coordinate work items. There is an existing `todos` table and a toy in-memory oRPC router, but neither connects to Postgres or supports the structure needed for real task management — ownership, deadlines, status tracking, reminders, or links to recruitment entities like candidates and job openings. Recruiters and team leads cannot answer basic questions like "what's due this week?", "who is working on what?", or "what happened to this task?".

## Solution

Replace the existing `todos` scaffolding with a full Task Management module backed by Postgres and exposed via oRPC. Tasks are general-purpose work items with an Assignee, optional start date, optional deadline, and a status lifecycle (`todo` → `in_progress` → `done`). They can be linked to any domain entity (candidate, job opening, etc.) via a `task_links` join table. Every change to a Task produces an immutable Task Event for audit. Reminders are stored in a shared `reminders` table — they can be attached to a Task (with optional relative offset before the deadline) or standalone (absolute time only). Delivery is deferred; only the data model and scheduling are built now.

Three views share a single route (`/tasks?view=list|kanban|calendar`): a sortable/filterable List table, a status-grouped Kanban board, and a Monthly + Weekly Calendar. Task creation and editing happen through a slide-out detail panel.

## User Stories

1. As a recruiter, I want to create a Task with a title and optional description, so that I can capture work items that need to be done
2. As a recruiter, I want to set a Task's status to `todo`, `in_progress`, or `done`, so that I can track where each work item stands
3. As a recruiter, I want to assign a Task to a specific user, so that it's clear who is responsible
4. As a recruiter, I want to set a deadline on a Task, so that I can prioritize by urgency
5. As a recruiter, I want to set a start date on a Task, so that I can plan when work begins
6. As a recruiter, I want to leave a Task without a deadline, so that not-yet-scheduled work is still captured
7. As a recruiter, I want to write a Task description in Markdown, so that I can include formatted notes, lists, and links
8. As a recruiter, I want to view all my team's Tasks in a sortable, filterable table, so that I can quickly scan and find what I need
9. As a recruiter, I want to filter Tasks by status, assignee, text search, deadline range, and linked entity, so that I can narrow down to what matters
10. As a recruiter, I want to view Tasks grouped by status in a Kanban layout, so that I can see the workflow pipeline at a glance
11. As a recruiter, I want to see a Task's title, assignee avatar, and deadline badge on a Kanban card, so that I can identify it without opening it
12. As a recruiter, I want to view Tasks on a monthly calendar by deadline, so that I can see what's due when
13. As a recruiter, I want to view Tasks on a weekly calendar as blocks from start date to deadline, so that I can see time commitments at a finer grain
14. As a recruiter, I want Tasks without a start date to appear as point markers on their deadline day in the weekly view, so that I still see what's due even if start dates aren't set
15. As a recruiter, I want to toggle between monthly and weekly calendar views, so that I can switch between overview and detail
16. As a recruiter, I want to switch between List, Kanban, and Calendar views via a single toggle, so that I don't have to navigate to separate pages
17. As a recruiter, I want to click a Task in any view to open a detail panel, so that I can read and edit all its fields without losing my place
18. As a recruiter, I want to edit a Task's fields in a slide-out panel, so that I can make quick changes in context
19. As a recruiter, I want to create a new Task via a "New Task" button on the tasks page, so that I can add work items easily
20. As a recruiter, I want the status field to default to `todo` when creating a Task, so that I don't have to set it every time
21. As a recruiter, I want to add a Reminder to a Task at an absolute time, so that I get notified at a specific moment (when delivery is implemented)
22. As a recruiter, I want to add a Reminder to a Task relative to its deadline (e.g., "1 hour before", "1 day before"), so that the reminder stays correct if the deadline moves
23. As a recruiter, I want to add multiple Reminders to a single Task, so that I can set both "1 day before" and "1 hour before" reminders
24. As a recruiter, I want to create a standalone Reminder (not attached to any Task) at an absolute time, so that I can set personal alerts for anything
25. As a recruiter, I want to delete a Reminder I no longer need, so that my reminder list stays clean
26. As a recruiter, I want to link a Task to a candidate or job opening, so that I can associate work with the relevant recruitment entity
27. As a recruiter, I want to remove a Task Link, so that stale associations can be cleaned up
28. As a team lead, I want to see an edit history timeline for every Task, so that I know who changed what and when
29. As a team lead, I want every field-level change to be automatically recorded as a Task Event, so that there is always an audit trail
30. As a recruiter, I want to archive a Task (regardless of its status), so that completed or irrelevant tasks don't clutter my active views
31. As a recruiter, I want archived Tasks hidden by default, so that my views stay focused on active work
32. As a recruiter, I want to toggle "show archived" in any view, so that I can recover or review archived items
33. As a recruiter, I want the List view to default to sorting by deadline ascending (soonest first, no-deadline last), so that the most urgent items are at the top
34. As a recruiter, I want the task list response to include assignee details, links, and reminders, so that I don't have to make additional requests to render each view
35. As a recruiter, I want cursor-based pagination on the task list, so that scrolling through large datasets is stable and performant
36. As a recruiter, I want to be prevented from creating a relative Reminder on a Task with no deadline, so that the system doesn't end up with invalid reminder states
37. As a recruiter, I want relative Reminders to automatically recalculate their `trigger_at` when a Task's deadline changes, so that reminders always fire at the right time

## Implementation Decisions

### Database schema (replaces existing `todos` table)

- **`tasks` table**: `id` (serial PK), `title` (text, not null), `description` (text, nullable, Markdown), `status` (Postgres enum: `todo` | `in_progress` | `done`, not null, default `todo`), `assignee_id` (FK to `user.id`, not null), `start_date` (date, nullable), `deadline` (date, nullable), `archived` (boolean, not null, default false), `created_at` (timestamp, default now), `updated_at` (timestamp, default now)
- **`task_links` table**: `id` (serial PK), `task_id` (FK to `tasks.id`, cascade delete), `entity_type` (text, not null, open string — no enum enforcement), `entity_id` (text, not null). Unique constraint on `(task_id, entity_type, entity_id)`.
- **`task_events` table**: `id` (serial PK), `task_id` (FK to `tasks.id`, cascade delete), `field` (text, not null — the field name that changed), `old_value` (text, nullable), `new_value` (text, nullable), `changed_by` (FK to `user.id`, not null), `changed_at` (timestamp, default now). Immutable — no updates or deletes.
- **`reminders` table**: `id` (serial PK), `task_id` (FK to `tasks.id`, nullable, cascade delete — null means standalone), `user_id` (FK to `user.id`, not null — who owns the reminder), `trigger_at` (timestamp, not null — the concrete firing time), `offset_minutes` (integer, nullable — non-null means relative reminder, null means absolute), `created_at` (timestamp, default now). Index on `trigger_at` for scheduler queries. Index on `(task_id)` for task-attached reminder lookups.

### Deep modules

1. **task-service**: Core business logic for Task CRUD, archiving, and field-level change detection. Encapsulates:
   - Creating a Task (defaults status to `todo`)
   - Updating a Task (diffs old vs. new values, produces Task Events for each changed field, triggers reminder recomputation for relative reminders)
   - Archiving a Task (sets `archived = true`, records a Task Event)
   - Fetching a Task by ID with nested assignee, links, reminders
   - Listing Tasks with server-side filters (status, assignee, text search on title/description, deadline range, entity type/id, archived flag), cursor-based pagination, default sort by deadline ascending
   - Interface: `createTask(input)`, `updateTask(id, input, userId)`, `archiveTask(id, userId)`, `getTask(id)`, `listTasks(filters, cursor, limit)`

2. **reminder-service**: Business logic for Reminder CRUD and relative reminder recomputation. Encapsulates:
   - Creating a Reminder (validates: relative reminders require a task with a deadline; computes `trigger_at = deadline - offset_minutes` for relative ones)
   - Deleting a Reminder
   - Listing Reminders (by task_id, or standalone for a user)
   - Recomputing `trigger_at` for all relative reminders attached to a task when its deadline changes
   - Interface: `createReminder(input)`, `deleteReminder(id)`, `listReminders(filter)`, `recomputeRelativeReminders(taskId)`

3. **task-event-service**: Immutable append-only log. Encapsulates:
   - Recording a field-level change event
   - Listing events for a task (ordered by `changed_at` desc)
   - Interface: `recordEvent(taskId, field, oldValue, newValue, changedBy)`, `listEvents(taskId, cursor, limit)`

4. **task-link-service**: CRUD for Task Links. Encapsulates:
   - Adding a link (validates no duplicate on `task_id + entity_type + entity_id`)
   - Removing a link
   - Interface: `addLink(taskId, entityType, entityId)`, `removeLink(linkId)`

### oRPC router changes

The existing `todos` router (`src/orpc/router/todos.ts`) is replaced with two routers:

- **`task` router**: `task.list`, `task.create`, `task.update`, `task.archive`, `task.getById`, `task.listEvents`, `task.addLink`, `task.removeLink`
- **`reminder` router**: `reminder.create`, `reminder.delete`, `reminder.list`

The root router (`src/orpc/router/index.ts`) re-exports both. All endpoints require authentication. The `task.update` handler calls the task-service, which handles field-level diffing, Task Event creation, and reminder recomputation internally.

### Filter contract for `task.list`

Server-side filtering. The input schema accepts:

- `status` (optional, array of status values)
- `assignee_id` (optional, array of user IDs)
- `search` (optional, text — ILIKE search on title and description)
- `deadline_from` / `deadline_to` (optional, date range)
- `entity_type` / `entity_id` (optional, filter by linked entity)
- `archived` (optional, boolean — default false)
- `cursor` (optional, string — cursor from previous page)
- `limit` (optional, integer — default 20)
- `sort_by` (optional, enum — default `deadline`)
- `sort_order` (optional, `asc` | `desc` — default `asc`)

Response includes: task fields, nested assignee (id, name, avatar), nested links array, nested reminders array, pagination cursor.

### Frontend modules

5. **tasks-route**: The `/tasks` route component. Manages the view-mode toggle (`list` | `kanban` | `calendar`) via URL search params. Delegates to the appropriate view component. Contains the "New Task" button.

6. **task-list-view**: The List view. Uses bazza/ui data-table-filter + TanStack Table integration with server-side filtering strategy. Column configurations: title (text), status (option), assignee (option), deadline (date), start_date (date), archived (option). Sends filter state to `task.list` oRPC endpoint.

7. **task-kanban-view**: The Kanban view. Three columns (`todo`, `in_progress`, `done`). Fetches tasks grouped by status. Cards display title, assignee avatar, deadline badge. Status changes happen through the detail panel, not drag-and-drop.

8. **task-calendar-view**: The Calendar view. Monthly + weekly toggle. Monthly renders tasks as entries on their deadline day. Weekly renders tasks as blocks spanning start_date to deadline (or as point markers if no start date). Fetches tasks with deadline filter for the visible date range.

9. **task-detail-panel**: Slide-out drawer. Sections: editable task fields (title, description with Markdown editor, status, assignee, start_date, deadline), Reminders section (list + add/remove), Task Links section (list + add/remove), Task Event history timeline (field-level changes with who/when/old/new). Used for both viewing/editing existing tasks and creating new tasks.

### Data flow on Task update

1. Client calls `task.update` with changed fields only
2. Server fetches current task from DB
3. Server diffs each field (old vs. new)
4. For each changed field: insert a `task_events` row
5. If `deadline` changed: call `reminder-service.recomputeRelativeReminders(taskId)` — updates all relative reminders' `trigger_at`
6. Update the task row
7. Return updated task with nested relations

### Existing code to remove

- `todos` table in `src/db/schema/index.ts`
- `src/orpc/router/todos.ts` (in-memory array router)
- `src/orpc/schema.ts` (`TodoSchema`)
- References in `src/orpc/router/index.ts`

## Testing Decisions

No tests will be written as part of this PRD. Tests will be added in a follow-up.

When tests are written, they should:
- Test external behavior of deep modules (task-service, reminder-service, task-event-service, task-link-service) — not implementation details
- Validate that `task-service.updateTask` produces the correct Task Events for each changed field
- Validate that relative reminders recompute `trigger_at` when the deadline changes
- Validate that relative reminder creation is rejected for tasks without a deadline
- Validate that duplicate Task Links are rejected
- Validate cursor-based pagination stability

Prior art: the project uses Vitest with `@testing-library/react` + `jsdom`.

## Out of Scope

- Reminder delivery mechanism (email, in-app notifications, push)
- Standalone reminder UI (creation/management interface for reminders not attached to a Task)
- Background job / scheduler for firing reminders
- Drag-and-drop for Kanban columns
- Manual card reordering within Kanban columns
- Priority field on Tasks
- Comments or discussion threads on Tasks
- Task assignments to teams/groups (single assignee only)
- Hard delete of Tasks
- Keyboard shortcuts for Task creation
- Global "New Task" button outside the `/tasks` page
- Referential integrity enforcement on Task Link `entity_type`/`entity_id` (open string, no FK validation)
- Mobile-specific layouts

## Further Notes

- The existing `todos` scaffolding is replaced entirely — it was never connected to Postgres and used in-memory arrays.
- Task Links use an open string `entity_type` with no enum enforcement. This is intentional flexibility for linking to any domain entity without schema coupling. The trade-off is that typos can create orphaned links — data hygiene is the application's responsibility.
- The `archived` column is a boolean rather than a timestamp. The archive timestamp is recoverable from Task Events.
- Standalone reminders use the same `reminders` table with a nullable `task_id`. This avoids a future migration when standalone reminder UI is built.
- Description is Markdown stored as plain text — no WYSIWYG editor needed.
