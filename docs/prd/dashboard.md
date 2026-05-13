# PRD: Dashboard

## Problem Statement

The recruitment application has a `/dashboard` route with placeholder components (dashboard-calendar, dashboard-notifications, dashboard-recent-tasks, dashboard-reminders, dashboard-stats), but none are connected to real data. The placeholder components render static or mock content. Users land on the dashboard after login and see no meaningful information about their work, their team's pipeline, or the state of the recruitment process. There is no way to get a quick overview of task stats, the recruitment pipeline, active mandates, approaching deadlines, or recent activity.

## Solution

Rewire the existing dashboard components to fetch and display real data from the oRPC endpoints. Add new components for the recruitment pipeline, active mandates, and client activity. The dashboard aggregates data from tasks, mandates, prospects, clients, reminders, and notifications — scoped to the current user's visibility (Supervisor hierarchy for mandates/clients, personal for reminders/notifications, universal for prospects). Each component is a self-contained data-fetching widget. No new services or oRPC endpoints are needed — the dashboard consumes existing list endpoints with appropriate filters.

## User Stories

1. As a User, I want to see the total count of my active Tasks on the dashboard, so that I know my workload at a glance
2. As a User, I want to see a breakdown of my Tasks by status (todo, in_progress, done), so that I can see where my work stands
3. As a User, I want to see the count of my overdue Tasks (deadline < today, status ≠ done), so that I know what needs immediate attention
4. As a User, I want to see the recruitment pipeline summary — counts of Prospects at each stage across all Mandates I can see, so that I can gauge pipeline health
5. As a RM or TL, I want to see the count of active Mandates (open + in_progress) in my scope, so that I know the volume of open positions
6. As a User, I want to see Mandates with approaching deadlines, so that I can prioritize which mandates need attention
7. As a User, I want to see the most recent prospect→applicant and applicant→candidate transitions, so that I can track pipeline movement
8. As a BD, I want to see recently added Clients and Contracts in my scope, so that I can track new business development
9. As a User, I want to see my upcoming Reminders for the next 7 days, so that I know what's coming up
10. As a User, I want to see my unread notification count and the 5 most recent notifications, so that I can quickly catch up
11. As a User, I want to click on a dashboard stat to navigate to the relevant list view (e.g., clicking "3 overdue" goes to `/tasks` with the overdue filter), so that I can drill into the details
12. As a User, I want to see a calendar of my Tasks for the current month, so that I can see what's due when
13. As a Supervisor, I want the dashboard stats to reflect my scope (my data + my Subordinates' data), so that the dashboard matches my visibility
14. As an Admin, I want the dashboard to show system-wide stats, so that I have full oversight
15. As a User, I want the dashboard to load fast with multiple concurrent data requests, so that I don't wait for sequential fetching
16. As a User, I want the dashboard to show a "no data" state when there are no items in a section, so that the layout doesn't look broken
17. As a User, I want each dashboard section to have a "view all" link to the corresponding page, so that I can navigate to the full view
18. As a developer, I want dashboard components to use existing oRPC list endpoints (not dedicated dashboard-specific endpoints), so that no new API surface is needed
19. As a developer, I want dashboard components to fetch data independently and concurrently, so that a slow section doesn't block others

## Implementation Decisions

### Dashboard data sources

All dashboard data comes from existing oRPC endpoints. No new service methods or oRPC procedures are created for the dashboard.

| Dashboard Section | Data Source | Filters Applied |
|---|---|---|
| Task stats (total, by status, overdue) | `task.list` | `assignee_id: [currentUserId]`, `archived: false` |
| Recruitment pipeline (prospects by stage) | `prospectMandate.listByStage` (see note) | Scoped by mandate visibility |
| Active mandates count | `jobMandate.list` | `status: ["open", "in_progress"]`, `archived: false` |
| Mandates nearing deadline | `jobMandate.list` | Sort by approaching deadline (see note) |
| Recent stage transitions | `prospectMandate.listEvents` | Recent events across visible mandates |
| Client activity | `client.list` | Sort by `created_at` desc, limit 5 |
| Reminders | `reminder.list` | `user_id: currentUserId`, `trigger_at` in next 7 days |
| Notifications | `notification.list` + `notification.getUnreadCount` | Current user |
| Calendar | `task.list` | Deadline/start_date in current month, `assignee_id: [currentUserId]` |

### Note on data not directly available from existing endpoints

Some dashboard data requires aggregation or sorting that existing list endpoints don't fully support:

1. **Task stats (overdue count)**: The `task.list` endpoint doesn't have an "overdue" filter. The dashboard fetches tasks assigned to the user with `archived: false` and computes overdue client-side (deadline < today && status !== 'done'). Alternatively, the `task.list` filter contract could be extended with a `deadline_before: date` filter — this is a minor enhancement to the existing task router, not a new endpoint.

2. **Recruitment pipeline (prospects by stage)**: There is no `prospectMandate.listByStage` endpoint. The dashboard fetches all visible mandates and counts their linked Prospect Mandates by stage. This requires the mandate list response to include a summary of prospect stages per mandate. Two options: (a) the mandate `list` response includes a `prospectStageCounts` field computed server-side, or (b) the dashboard makes a separate `prospectMandate.list` call with mandate scope. Option (a) is preferred to avoid N+1 queries — the mandate-service `listMandates` response gains an optional `include_stats: boolean` flag that, when true, includes `prospectStageCounts: { prospect: N, applicant: N, candidate: N, hired: N, rejected: N }`.

3. **Mandates nearing deadline**: Job Mandates don't have a deadline field. CONTEXT.md does not define a deadline on mandates — only positions and headcounts. This section is omitted from the dashboard. If deadlines are added to mandates later, this section can be added.

4. **Recent stage transitions**: The `prospectMandate.listEvents` endpoint exists per Prospect Mandate. For a dashboard view across all visible mandates, a new endpoint or filter is needed. Option: add a `prospectMandate.listRecentEvents` procedure that accepts a `mandateIds` array and returns the N most recent events. This is a minor addition to the prospect-mandate router.

### Dashboard sections revision

Given the data availability analysis, the dashboard sections are:

1. **Task Stats**: Total active tasks, breakdown by status (todo / in_progress / done), overdue count. Computed client-side from `task.list` response for the current user. Click-through to `/tasks` with the relevant filter.

2. **Recruitment Pipeline**: Horizontal bar or stacked visualization showing counts of prospects, applicants, candidates, hired, and rejected across all visible mandates. Data from mandate list with `include_stats: true`. Click-through to `/mandates`.

3. **Active Mandates**: Count of mandates in `open` + `in_progress` status. Data from `jobMandate.list`. Click-through to `/mandates?status=open,in_progress`.

4. **Recent Stage Transitions**: Table of the 5 most recent prospect stage changes across visible mandates. Data from `prospectMandate.listRecentEvents`. Shows prospect name, mandate title, old stage → new stage, who changed it, when.

5. **Client Activity**: The 5 most recently created Clients and Contracts in the user's scope. Data from `client.list` sorted by `created_at` desc with limit 5. Shows client name, contract title (if applicable), assignee, and creation date.

6. **Upcoming Reminders**: List of the current user's reminders for the next 7 days. Data from `reminder.list` with `trigger_at` range filter. Shows reminder title (or task title if attached), trigger time.

7. **Recent Notifications**: Unread count + 5 most recent notifications. Data from `notification.getUnreadCount` + `notification.list`. Shows type icon, title, relative timestamp.

8. **Task Calendar**: Monthly calendar view showing tasks on their deadline/start dates. Data from `task.list` with date range filter for the current month. Reuses the existing `dashboard-calendar.tsx` component, rewired with real data.

### Minor oRPC enhancements

The following minor additions to existing routers support dashboard data needs:

1. **`task.list`** gains `deadline_before: date` and `deadline_after: date` filter fields (in addition to the existing `deadline_from` / `deadline_to`). These are aliases for clarity — `deadline_before` = `deadline_to`, `deadline_after` = `deadline_from`. If the existing fields already cover this, no change needed.

2. **`jobMandate.list`** gains an `include_stats: boolean` (default false) input field. When true, each mandate in the response includes `prospectStageCounts`. This is computed via a single SQL query with GROUP BY on the `prospect_mandates` table.

3. **`prospectMandate.listRecentEvents`** — a new procedure on the `prospectMandate` router. Input: `limit` (default 5). Returns the most recent `prospect_mandate_events` across all Prospect Mandates on mandates visible to the current user. This requires a join through `prospect_mandates` → `job_mandates` and applying the Supervisor scope filter on the mandate's `assignee_id`.

4. **`reminder.list`** gains `trigger_from: timestamp` and `trigger_to: timestamp` filter fields for date-range filtering on `trigger_at`.

### Frontend modules

All dashboard components are self-contained, fetch their own data via oRPC hooks (`useORPCQuery`), and render independently. They are composed in the `/dashboard` route component.

1. **dashboard-task-stats**: Card showing total active tasks, by-status counts, overdue count. Each count is a clickable link to `/tasks` with the corresponding filter pre-applied.

2. **dashboard-recruitment-pipeline**: Horizontal stacked bar or individual count badges for each stage (prospect, applicant, candidate, hired, rejected). Data aggregated from mandate list with `include_stats: true`.

3. **dashboard-active-mandates**: Card showing count of active mandates. Click-through to `/mandates`.

4. **dashboard-recent-transitions**: Table of recent prospect stage changes. Columns: prospect name, mandate, old stage → new stage, changed by, time ago.

5. **dashboard-client-activity**: Compact list of recently created clients and contracts. Shows name, assignee, relative time.

6. **dashboard-reminders**: (Existing component, rewired.) List of upcoming reminders for the next 7 days.

7. **dashboard-notifications**: (Existing component, rewired.) Unread count badge + recent notification list.

8. **dashboard-calendar**: (Existing component, rewired.) Monthly calendar with tasks on deadline/start dates.

### Layout

The dashboard uses a responsive grid layout:
- Top row: Task Stats (1/3) | Recruitment Pipeline (1/3) | Active Mandates (1/3)
- Second row: Recent Transitions (1/2) | Client Activity (1/2)
- Third row: Calendar (2/3) | Reminders + Notifications (1/3)

On mobile: single column, stacked.

### Concurrency

All dashboard data fetches are initiated concurrently using TanStack Query's parallel fetching. Each component calls its own `useORPCQuery` hook. TanStack Query deduplicates concurrent requests to the same endpoint. Suspense boundaries per section ensure one slow section doesn't block others.

### Supervisor scoping

Dashboard data respects the same visibility rules as the list views:
- Tasks: filtered by `assignee_id = currentUserId` (the user's own tasks, not all tasks)
- Mandates: scoped by Supervisor hierarchy (via `jobMandate.list` which applies `scopeByAssigneeHierarchy`)
- Clients/Contracts: scoped by Supervisor hierarchy (via `client.list`)
- Prospects: visible to all authenticated users
- Reminders: personal (current user only)
- Notifications: personal (current user only)

## Testing Decisions

No dedicated dashboard service tests are needed — the dashboard consumes existing endpoints. Testing focuses on the minor oRPC enhancements:

- **`jobMandate.list` with `include_stats: true`**: returns correct `prospectStageCounts` per mandate
- **`prospectMandate.listRecentEvents`**: returns events across visible mandates, scoped by Supervisor hierarchy
- **`reminder.list` with `trigger_from` / `trigger_to`**: returns reminders within the date range

Prior art: the project uses Vitest with PGlite. Tests follow the pattern in `src/services/__tests__/`.

## Out of Scope

- Customizable dashboard layout (drag-and-drop widget arrangement)
- Dashboard date range selector (always shows current period)
- Dashboard data export or PDF generation
- Dashboard comparison views (this week vs. last week)
- Real-time dashboard updates (WebSocket push)
- Goal/target progress bars on the dashboard
- Pie charts or advanced data visualizations (counts and simple bars only)
- Dashboard per-role (all roles see the same dashboard with scoped data)
- Keyboard navigation for dashboard
- Dashboard widget collapse/expand state persistence

## Further Notes

- The dashboard does NOT have a "mandates nearing deadline" section because Job Mandates don't have a deadline field. If a deadline is added to mandates in the future, this section can be added trivially by querying `jobMandate.list` with a deadline range filter.
- The `include_stats` flag on `jobMandate.list` is an optimization to avoid N+1 queries when the dashboard needs mandate-level prospect counts. It's optional and defaults to false so that the regular mandate list query (without stats) remains fast.
- Task stats on the dashboard are scoped to the current user's assigned tasks, not all tasks. This matches user expectations: "my dashboard shows my work." Supervisors see their subordinates' data through the mandates and clients sections, not through the task section.
- The dashboard-calendar component already exists and renders a monthly view. It needs to be rewired to fetch real task data for the visible month via `task.list` with a `deadline_from`/`deadline_to` range.
