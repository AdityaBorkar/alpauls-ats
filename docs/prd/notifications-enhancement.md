# PRD: Notifications Enhancement

## Problem Statement

The recruitment application has a basic notification-service with CRUD operations (create, list, mark read, archive) and a `notifications` table with types like `task_assigned`, `task_status_changed`, `task_deadline_approaching`, `reminder_triggered`, and `system`. However, the notification system is not integrated with the new domain entities (Clients, Client Contracts, Job Mandates, Prospects, Prospect Mandates). The notification types defined in CONTEXT.md include `mandate_assigned`, `mandate_completed`, `mandate_stage_changed`, `prospect_stage_changed`, `prospect_hired`, `client_created`, `contract_created`, and `contract_assigned` — none of which are supported. There is no notification bell UI, no unread badge, and no notification generation from service events. Notifications are personal but have no way to reach the user.

## Solution

Extend the notification system with the missing notification types, add notification generation hooks in each service (so that domain events automatically produce notifications for the relevant Users), and build a notification bell UI in the app header with an unread count badge, a dropdown panel listing recent notifications, and mark-read functionality. The notification-service gains new types and a `createNotification` call is added to each service at the point where a domain event occurs. Notifications reference entities polymorphically via `entity_type` + `entity_id`.

## User Stories

1. As a User, I want to see an unread notification count badge on the notification bell in the app header, so that I know I have new notifications
2. As a User, I want to click the notification bell to see a dropdown panel listing my recent notifications, so that I can see what happened
3. As a User, I want each notification to show its type icon, title, body, and timestamp, so that I can understand what happened at a glance
4. As a User, I want to mark a single notification as read, so that it no longer appears as unread
5. As a User, I want to mark all notifications as read at once, so that I can clear my unread count quickly
6. As a User, I want to archive a notification, so that it is removed from my active list
7. As a User, I want notifications to reference the relevant entity (task, mandate, prospect, etc.), so that I can navigate to it from the notification
8. As an Assignee, I want to receive a notification when a Task is assigned to me, so that I know I have new work
9. As a User, I want to receive a notification when a Task I am assigned to changes status, so that I am aware of progress
10. As a User, I want to receive a notification when a Task deadline is approaching, so that I can prioritize
11. As a User, I want to receive a notification when a Reminder fires, so that I am alerted at the right time
12. As a TL, I want to receive a notification when a Job Mandate is assigned to me, so that I know I am responsible for filling it
13. As an RM or TL, I want to receive a notification when a Mandate is completed, so that I know the position is filled
14. As a TL or SC, I want to receive a notification when a Prospect's stage changes on a Mandate I manage, so that I can track pipeline progress
15. As an RM, I want to receive a notification when a Prospect is hired on a Mandate I manage, so that I can confirm placement
16. As a BD, I want to receive a notification when a Client is created, so that I am aware of new accounts
17. As a BD, I want to receive a notification when a Client Contract is created, so that I am aware of new agreements
18. As an RM, I want to receive a notification when a Client Contract is assigned to me, so that I know I am now managing it
19. As a User, I want notifications to be personal — I see only my own, so that my view is not cluttered by others' notifications
20. As a User, I want new notifications to appear in real-time (or near-real-time via polling), so that I don't have to refresh the page
21. As a User, I want the notification dropdown to show a "view all" link to a full notifications page, so that I can browse my complete history
22. As a User, I want clicking a notification to navigate me to the relevant entity, so that I can take action immediately
23. As an Admin, I want to send a system notification to all users or specific users, so that I can broadcast announcements
24. As a developer, I want notification generation to be a side-effect in each service, so that business logic and notification logic stay decoupled
25. As a developer, I want the notification-service `createNotification` to be the single entry point for all notification creation, so that the data model is consistent
26. As a developer, I want notification types to be an enum in the database, so that only valid types are stored
27. As a developer, I want the notification bell to poll for unread count at a reasonable interval, so that the badge stays current without excessive requests

## Implementation Decisions

### New notification types

The `notificationTypeEnum` in the schema is extended with the following types (some already exist):

| Type | Description | Trigger |
|---|---|---|
| `task_assigned` | Task assigned to you | `task-service.createTask` or `task-service.updateTask` when `assigneeId` changes |
| `task_status_changed` | A task you're assigned to changed status | `task-service.updateTask` when `status` changes |
| `task_deadline_approaching` | A task deadline is within 24 hours | Scheduled check (deferred — no scheduler yet) |
| `reminder_triggered` | A reminder fired | Scheduler (deferred — no scheduler yet) |
| `mandate_assigned` | A mandate is assigned to you | `mandate-service.assignMandate` |
| `mandate_completed` | A mandate you're assigned to is completed | `mandate-service` auto-transition to `completed` |
| `mandate_stage_changed` | A prospect's stage changed on a mandate you manage | `prospect-mandate-service.updateStage` (notify mandate assignee) |
| `prospect_stage_changed` | A prospect you created changed stage | `prospect-mandate-service.updateStage` (notify prospect creator) |
| `prospect_hired` | A prospect was hired on a mandate you manage | `prospect-mandate-service.updateStage` to `hired` |
| `client_created` | A new client was created | `client-service.createClient` (notify BD's supervisor) |
| `contract_created` | A new contract was created | `client-contract-service.createContract` (notify BD's supervisor) |
| `contract_assigned` | A contract was assigned to you | `client-contract-service.updateContract` when `assigneeId` changes |
| `system` | System announcement | Admin action (manual) |

### Notification generation hooks

Each service calls `notification-service.createNotification` at the point of a domain event. The notification includes `userId` (the recipient), `type`, `title`, `body`, `entityType`, and `entityId`.

Notification recipients are determined by the business context:
- **Task assigned**: recipient = new assignee
- **Task status changed**: recipient = assignee
- **Mandate assigned**: recipient = new assignee
- **Mandate completed**: recipient = mandate assignee
- **Prospect stage changed on mandate**: recipient = mandate assignee (TL/RM who manages the mandate)
- **Prospect hired**: recipient = mandate assignee
- **Client created**: recipient = creating BD's supervisor (if any)
- **Contract created**: recipient = creating BD's supervisor (if any)
- **Contract assigned**: recipient = new assignee (the RM)

These calls happen inside the service layer, after the database transaction commits (or as part of the same transaction). They do not block the service response.

### Notification bell UI

A notification bell icon in the app sidebar header (or top bar, matching the existing layout). Clicking it opens a dropdown panel:
- Shows unread count badge (red circle with number)
- Dropdown lists the 10 most recent notifications (unread first, then read)
- Each notification row shows: type icon, title, body preview (truncated), timestamp (relative: "5 min ago", "2 hours ago")
- Unread notifications have a visual indicator (blue dot or bold text)
- Clicking a notification: marks it as read, closes the dropdown, navigates to the entity (using `entityType` + `entityId` to determine the route)
- "Mark all as read" button at the top of the dropdown
- "View all" link at the bottom navigates to `/notifications` page

### Full notifications page

A `/notifications` route showing all notifications in a paginated list. Filters: read/unread, type, date range. This is a secondary feature — the dropdown is the primary interface.

### Polling strategy

The notification bell polls the unread count endpoint every 30 seconds when the page is active. The dropdown content is fetched on open (not pre-fetched). No WebSocket or SSE — polling is sufficient for the expected notification volume.

### Existing schema changes

The `notificationTypeEnum` needs new enum values added. The existing `notifications` table schema already has `entity_type` (text) and `entity_id` (integer) columns for polymorphic entity references. No structural changes needed — only new enum values.

### oRPC Router

The existing `notification` router gains one new procedure:
- `notification.getUnreadCount` — returns the unread count for the current user

Existing procedures remain:
- `notification.list` — `notification:read` permission
- `notification.markRead` — `notification:update` permission
- `notification.markAllRead` — `notification:update` permission
- `notification.archive` — `notification:archive` permission

### System notifications (Admin)

An `admin.sendNotification` procedure is added to the admin router:
- Input: `userId` (optional — if absent, sends to all users), `title`, `body`
- Permission: `admin` role only
- Creates a `system` type notification

## Testing Decisions

Tests should validate notification creation side-effects in service tests and notification-service behavior.

- **Notification creation tests** (integrated with service tests):
  - `task-service.createTask` produces a `task_assigned` notification for the assignee
  - `task-service.updateTask` with status change produces a `task_status_changed` notification
  - `mandate-service.assignMandate` produces a `mandate_assigned` notification for the new assignee
  - `prospect-mandate-service.updateStage` to `hired` produces a `prospect_hired` notification for the mandate assignee
  - `client-service.createClient` produces a `client_created` notification for the BD's supervisor (if exists)
  - `client-contract-service.updateContract` with assigneeId change produces a `contract_assigned` notification

- **Notification-service tests**:
  - `listNotifications` returns only the user's own notifications
  - `markRead` sets `read_at` timestamp
  - `markAllRead` marks all unread as read
  - `archiveNotification` removes from active list
  - `getUnreadCount` returns correct count

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- Real-time push via WebSocket or Server-Sent Events
- Email delivery of notifications
- Push notification delivery (mobile/desktop)
- Reminder firing scheduler (separate concern — no background job system yet)
- `task_deadline_approaching` and `reminder_triggered` notification generation (requires a scheduler)
- Notification preferences (per-user opt-in/out by type)
- Notification grouping or threading (e.g., "3 tasks assigned to you today")
- Notification sound or browser notification API integration
- Bulk notification actions (archive all, archive by type)
- Notification search
- Notification retention policy (auto-delete after N days)

## Further Notes

- Notification generation is a side-effect, not a transaction dependency. If notification creation fails (e.g., DB constraint violation), the primary service operation should still succeed. This can be achieved by wrapping notification creation in a try/catch within the service, or by using a queue (deferred — no queue system yet). For now, notification creation is best-effort within the same transaction.
- The `entity_type` + `entity_id` polymorphic reference on notifications enables "click to navigate" in the UI. The client-side maps `entity_type` to a route pattern: `task` → `/tasks?selected=taskId`, `job_mandate` → `/mandates?selected=mandateId`, etc.
- The unread count polling interval (30s) is a reasonable default. If the user base grows and notification volume is high, consider moving to SSE or reducing the polling interval for active users.
- System notifications from Admin are a simple broadcast mechanism. If `userId` is omitted, the procedure creates a notification for every user in the system. For large user counts, this should be done in batches.
- The `task_deadline_approaching` notification type is defined but its generation is deferred to a future scheduler implementation. The type exists in the enum so that the UI can render it when such notifications eventually appear.
