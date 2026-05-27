# Data Explorer Specification

This document details the architecture, UX patterns, and implementation guidelines for building a **Data Explorer** — a full table page component that combines Linear.app–style filtering with sortable columns, virtualized rows, row selection, batch actions, and configurable display settings. Replaces the existing `DataViewLayout` and `data-table-filter` system.

---

## 1. Overview

The Data Explorer is a single component that manages:

- **Filter conditions** — any number of column conditions with per-condition AND/OR combinators
- **Filter views** — named, persisted filter + display configurations stored in the DB
- **Display settings** — sort order, column visibility, column widths, row density
- **Row selection** — checkbox-based selection with batch action bar
- **Virtualized rows** — infinite scroll with TanStack Virtual + cursor-based pagination
- **Filter panel** — a Sheet (side drawer) for structured filter editing

All filtering is **server-side**. The client sends filter conditions to the oRPC API; the server evaluates them and returns filtered, paginated results.

---

## 2. Key Design Decisions

These decisions were resolved through a grilling session and are not subject to renegotiation without an ADR.

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Replace** the existing `data-table-filter` system entirely | New architecture is incompatible with the old flat, implicitly-AND model |
| 2 | **Server-side only** — no client-side filter strategy option | Tables use cursor pagination; loading all rows client-side is a non-starter |
| 3 | **No user-nested groups** — single-level flat conditions with per-condition AND/OR combinators | Users cannot manually nest; system auto-groups from AND-precedence |
| 4 | **Auto-generated groups** from AND-over-OR precedence | `A AND B OR C` → `(A AND B) OR C`. System creates FilterGroup tree; users never see manual nesting |
| 5 | **Hybrid input** — Command popover + inline suggestions, no custom text parser | Unambiguous structured flow with the feel of "typing filters" |
| 6 | **Filter panel** (Sheet from right) editing **same state** as filter bar | Two surfaces, one state. No separate quick/advanced lists |
| 7 | **Combinator on each condition** (except first, which is ignored) | Simple ordered array model; deletion inherits previous combinator |
| 8 | **Separate `ColumnConfig` + `ColumnDef`** | Filter capabilities and rendering are different concerns |
| 9 | **Renamed types**: `string`, `number`, `date`, `boolean`, `enum`, `multiEnum` | Semantic naming; `boolean` is a dedicated type |
| 10 | **Programmatic operators** in DB/URL, **human-readable labels** in UI | `eq` stored, "is" displayed |
| 11 | **Virtual search column** `_search` with `contains`/`notContains` only | Server expands to multi-column ILIKE for columns with `searchable: true` |
| 12 | **React context** for state management (no Zustand) | Filter state is scoped to a table page; URL params handle persistence |
| 13 | **JSON URL serialization** with short keys in single `f` param | `c`=columnId, `o`=operator, `v`=value, `b`=combinator |
| 14 | **New models pushed directly to DB** — no migration (zero users) | Clean slate for `refine` and `display` JSONB columns |
| 15 | **Verbose field names in DB** `refine` column | `columnId`, `operator`, `value`, `combinator` |
| 16 | **Panel has Save View + Reset to Saved** | No "Save As" — new views created only from tab context menu |
| 17 | **Sheet from right** for filter panel | Matches existing drawer pattern; table visible underneath |
| 18 | **Start with Clients table**, then expand incrementally | Replacing existing filter system on Clients proves the architecture |
| 19 | **`Ctrl+F`** to focus filter bar | Overrides browser find (with `preventDefault`) |
| 20 | **Server-side expansion** of `_search` virtual column | Server hardcodes which columns to ILIKE per domain |
| 21 | **Shared column configs** in `src/lib/data-explorer/columns/` | Used by both frontend (UI) and server (SQL builder); string icon names + lookup map |
| 22 | **Dynamic options passed as prop** | Data-explorer doesn't own data fetching for options |
| 23 | **No `type` field on `FilterCondition`** | Server looks up columnId in config registry; avoids stale type sync |
| 24 | **Filter domains added incrementally** | Start with `clients`; add `tasks`, `prospects`, etc. as each table is built |
| 25 | **First condition always has `combinator: "and"`** | Included but ignored during evaluation |
| 26 | **`between`/`notBetween` operators** for number and date | `value` is `[min, max]` tuple |
| 27 | **`value: unknown`** with runtime Zod validation at API boundary | Too many variants for a useful union type |
| 28 | **`value: null`** for valueless operators (`isEmpty`, `isNotEmpty`) | JSON-safe; UI skips value input for these operators |
| 29 | **Row selection + bottom floating batch action bar** | Clients: Archive/Unarchive, Reassign, Export (selected rows, CSV) |
| 30 | **`onRowClick` is a configurable callback** per table | Data-explorer doesn't prescribe navigation vs. detail panel |
| 31 | **Batch action bar is a render prop** | Page controls the bar content; data-explorer provides selection state |
| 32 | **Single-column sort via Display dropdown only** | Column headers not clickable for sort; sort picker in Display dropdown |
| 33 | **Column visibility toggling in Display dropdown** | Plus sort picker + row density toggle |
| 34 | **Column resizing** by dragging column borders | Widths persisted in filter view `display` column |
| 35 | **Row density**: compact 28px, comfortable 36px (default), spacious 48px | Persisted in filter view `display` column |
| 36 | **`fields` array is ordered** but order is developer-defined (code) | Users toggle visibility only; reorder via code changes |
| 37 | **Infinite scroll** with TanStack Virtual | Scroll near bottom → auto-fetch next cursor page; spinner indicator |
| 38 | **`FilterCondition.id`**: nanoid, regenerated on parse, not serialized | IDs for React keys and mutation targeting during a session |
| 39 | **Server receives flat `FilterCondition[]`**, runs same auto-grouping | Shared grouping function in `src/lib/data-explorer/filter-grouping.ts` |
| 40 | **Combinator kept on conditions inside auto-generated tree** | Preserved for round-tripping back to flat array |

---

## 3. Data Model

### 3.1 FilterCondition

```ts
interface FilterCondition {
  id: string;              // nanoid, regenerated on parse, not serialized
  columnId: string;        // column key matching ColumnConfig.id
  operator: FilterOperator;// programmatic key: "eq", "contains", "gte", etc.
  value: unknown;          // string | number | boolean | Date | string[] | [number, number] | [Date, Date] | null
  combinator: "and" | "or";// connector to previous condition; first always "and" (ignored)
}
```

### 3.2 FilterGroup (auto-generated)

```ts
interface FilterGroup {
  id: string;
  combinator: "and" | "or";
  conditions: (FilterCondition | FilterGroup)[];
}
```

Produced by the auto-grouping algorithm from a flat `FilterCondition[]`. AND binds tighter than OR, matching standard boolean logic and SQL.

Example: `[A AND B OR C AND D]` produces:
```
OR
├── AND
│   ├── A
│   └── B
└── AND
    ├── C
    └── D
```

### 3.3 ColumnConfig

```ts
interface ColumnOption {
  label: string;
  value: string;
  icon?: string;  // optional icon name
}

interface ColumnConfig {
  id: string;                    // matches ColumnDef accessor key + DB column
  displayName: string;           // "Name", "Assignee", "Created"
  icon: string;                  // Tabler icon name string (resolved via lookup map)
  type: ColumnDataType;          // "string" | "number" | "date" | "boolean" | "enum" | "multiEnum"
  operators?: FilterOperator[];  // override default operators for this column
  options?: ColumnOption[];      // for enum/multiEnum: static option list
  min?: number;                  // for number: min value
  max?: number;                  // for number: max value
  searchable?: boolean;          // included in _search expansion (server-side ILIKE)
}
```

The `_search` virtual column: `id: "_search"`, `type: "string"`, `searchable: false`, operators: `contains`, `notContains`.

### 3.4 FilterViewDisplay

```ts
interface FilterViewDisplay {
  type: string;                        // table layout type (for future use)
  groupBy: string | null;             // for future use
  orderBy: string;                     // column ID for sort
  orderType: "asc" | "desc";
  fields: string[];                    // ordered list of visible column IDs
  columnWidths: Record<string, number>;// columnId → width in px (sparse, only custom widths)
  density: "compact" | "comfortable" | "spacious";
}
```

### 3.5 ColumnDataType

```ts
type ColumnDataType =
  | "string"
  | "number"
  | "date"
  | "boolean"
  | "enum"
  | "multiEnum";
```

### 3.6 FilterOperator (programmatic keys)

| Type | Operators | Display Labels |
|------|-----------|---------------|
| `string` | `eq`, `neq`, `contains`, `notContains`, `startsWith`, `endsWith`, `isEmpty`, `isNotEmpty` | is, is not, contains, does not contain, starts with, ends with, is empty, is not empty |
| `number` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `notBetween`, `isEmpty`, `isNotEmpty` | is, is not, is greater than, is greater than or equal to, is less than, is less than or equal to, is between, is not between, is empty, is not empty |
| `date` | `eq`, `neq`, `gt`, `gte`, `lt`, `lte`, `between`, `notBetween`, `isEmpty`, `isNotEmpty` | is, is not, is after, is on or after, is before, is on or before, is between, is not between, is empty, is not empty |
| `boolean` | `eq`, `neq` | is, is not |
| `enum` | `eq`, `neq`, `in`, `notIn` | is, is not, is any of, is none of |
| `multiEnum` | `include`, `exclude`, `includeAny`, `includeAll`, `excludeAny`, `excludeAll` | includes, excludes, includes any of, includes all of, excludes if any of, excludes if all |

Value shapes per operator:
- Single value: `string | number | boolean | Date`
- `in`/`notIn` on enum: `string[]`
- `between`/`notBetween` on number: `[number, number]`
- `between`/`notBetween` on date: `[Date, Date]`
- `isEmpty`/`isNotEmpty`: `null`
- Dates serialized as ISO 8601 strings in URL and DB

---

## 4. URL Serialization

Filter conditions are stored in a single `f` URL param as a JSON array with short keys:

```
?f=[{"c":"status","o":"eq","v":"open","b":"and"},{"c":"priority","o":"gte","v":"high","b":"or"}]
```

| Short key | Full key | Description |
|-----------|----------|-------------|
| `c` | `columnId` | Column key |
| `o` | `operator` | Programmatic operator key |
| `v` | `value` | Filter value (ISO dates, arrays for `in`/`between`) |
| `b` | `combinator` | `"and"` or `"or"` |

- `id` is **not** serialized — regenerated on parse via nanoid
- Dates serialized as ISO 8601 strings
- `null` values serialized as JSON `null`
- Display state overrides in separate URL params: `sort`, `dir`, `cols`, `widths`, `density`

---

## 5. DB Persistence

### 5.1 `filter_views.refine` (verbose format)

```json
[
  {
    "columnId": "status",
    "operator": "eq",
    "value": "open",
    "combinator": "and"
  },
  {
    "columnId": "priority",
    "operator": "gte",
    "value": "high",
    "combinator": "or"
  }
]
```

### 5.2 `filter_views.display`

```json
{
  "type": "table",
  "groupBy": null,
  "orderBy": "createdAt",
  "orderType": "desc",
  "fields": ["name", "legalName", "slug", "assigneeId", "archived", "createdAt"],
  "columnWidths": { "name": 200, "legalName": 180 },
  "density": "comfortable"
}
```

### 5.3 View merge logic

Base filters from the DB view are merged with URL overrides. `computeOverrides(base, effective)` extracts which filters/display differ from the base. Same pattern as current system, updated for new shapes.

---

## 6. Server-Side Filter Processing

### 6.1 Flow

1. **Receive** `FilterCondition[]` from client
2. **Validate** each condition against the domain's `ColumnConfig` registry (column exists, operator valid for type, value shape correct) via Zod
3. **Auto-group** the flat conditions into a `FilterGroup` tree using the shared grouping function
4. **Build SQL** by recursively traversing the tree, generating Drizzle `WHERE` clauses
5. **Handle `_search`** — server recognizes `columnId: "_search"` and expands to multi-column ILIKE across all columns with `searchable: true`

### 6.2 Shared SQL builder

`src/lib/data-explorer/filter-sql.ts` — a utility function:

```ts
function buildFilterWhere(
  conditions: FilterCondition[],
  domain: string,
  schema: typeof clientsTable,
): SQL | undefined
```

Called by each oRPC list endpoint. Validates, auto-groups, and produces a Drizzle `SQL` fragment.

### 6.3 oRPC procedure input

The `buildQueryOptions` callback receives the effective filters and display state. The oRPC procedure validates via Zod and passes to `buildFilterWhere`.

---

## 7. User Interface

### 7.1 Layout

```
┌──────────────────────────────────────────────────────────┐
│ Nav bar: breadcrumb + filter view tabs + right items     │
├──────────────────────────────────────────────────────────┤
│ Filter bar: [chips...] [input] [×Clear] [Filter ▼][Display ▼] │
├──────────────────────────────────────────────────────────┤
│ Table header (sticky)                                    │
│ ─────────────────────────────────────────────────────── │
│ Virtualized table rows (infinite scroll)                 │
│ ...                                                      │
│ Spinner (when loading next page)                         │
└──────────────────────────────────────────────────────────┘
│ Bottom floating batch action bar (when rows selected)    │
```

### 7.2 Filter Bar

- **Input field** with hybrid interaction: typing shows Command popover with column suggestions + quick-value matches. Selecting a column opens operator/value flow. No custom text parser.
- **Chips**: each committed condition shows as a removable chip with column, operator label, value, and AND/OR combinator toggle between chips.
- **Keyboard**: `Ctrl+F` focuses the input. `Backspace` on empty input removes last chip. `Escape` blurs. Arrow keys navigate chips.
- **`+ Add filter` button**: opens the Command popover for column selection (same as typing).
- **`Filter` button**: opens the Filter Panel (Sheet).
- **`× Clear`**: removes all conditions.
- **Combinator display**: between chips, a small toggle shows AND/OR. Changing it restructures auto-groups.
- **Auto-bracketing**: the bar renders visual brackets around auto-generated AND groups. `(status:open AND priority:high) OR assignee:me`.

### 7.3 Filter Panel (Sheet from right)

- Opens via the `Filter` button in the bar.
- Shows the **same** filter conditions as the bar, in a structured layout.
- Each condition row: column selector → operator selector → value input → AND/OR toggle → remove button.
- `+ Add filter` button to add new condition rows.
- **Save View**: updates current view's `refine` + `display` in DB (only when a view is active).
- **Reset to Saved**: reverts to the saved view, discarding URL overrides.
- No "Save As" — new views created only from filter view tab context menu.

### 7.4 Display Dropdown

- **Column visibility**: checklist of columns to show/hide.
- **Sort order**: column picker + asc/desc toggle.
- **Row density**: compact (28px) / comfortable (36px) / spacious (48px).

### 7.5 Virtual Table

- TanStack Virtual for row virtualization.
- TanStack Table for column rendering with `getCoreRowModel()`.
- Infinite scroll: scroll near bottom → auto-fetch next cursor page → spinner → rows append.
- Column headers: **not clickable** for sorting. Resize by dragging column borders.
- Row selection checkboxes on the left.
- `onRowClick`: configurable callback per table (navigate, open sheet, modal, etc.).

### 7.6 Batch Action Bar

- Floating bar at the bottom of the viewport when rows are selected.
- Shows selection count.
- Content is a **render prop** — each table page provides its own action buttons.
- Clients: Archive/Unarchive, Reassign, Export (selected rows as CSV).

---

## 8. State Management

### 8.1 DataExplorerContext

A React context provider wrapping the table page:

```ts
interface DataExplorerContext<TItem> {
  // Filter state
  conditions: FilterCondition[];
  addCondition: (condition: FilterCondition) => void;
  removeCondition: (id: string) => void;
  updateCondition: (id: string, updates: Partial<FilterCondition>) => void;
  clearAllConditions: () => void;

  // Display state
  display: FilterViewDisplay;
  updateDisplay: (updates: Partial<FilterViewDisplay>) => void;

  // View state
  activeViewId: string | null;
  saveView: () => void;
  resetToSaved: () => void;

  // Selection state
  selectedRowIds: Set<string>;
  toggleRowSelection: (id: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Column metadata
  columnsConfig: ColumnConfig[];
  columnOptions: Record<string, ColumnOption[] | undefined>;
}
```

### 8.2 URL sync

- Filter conditions → `f` URL param (short keys)
- Display overrides → `sort`, `dir`, `cols`, `widths`, `density` URL params
- Active view → `view` URL param
- `useFilterViewState(domain)` hook reads/merges base view + URL overrides (updated for new shapes)

---

## 9. File Structure

```
src/components/data-explorer/
  DataExplorer.tsx              // Main component (replaces DataViewLayout)
  FilterBar.tsx                 // Quick filter input with chips
  FilterChip.tsx                // Individual removable chip
  FilterPanel.tsx               // Sheet panel for structured filter editing
  FilterConditionRow.tsx        // Column/operator/value row in panel
  FilterCombinatorToggle.tsx   // AND/OR toggle between conditions
  ColumnSelector.tsx            // Command popover for column selection
  OperatorSelector.tsx          // Operator dropdown
  ValueInput.tsx                // Value input (adapts per type)
  DisplayDropdown.tsx           // Column visibility, sort, density
  BatchActionBar.tsx            // Bottom floating bar for batch actions
  SelectionCheckbox.tsx         // Row selection checkbox
  VirtualTable.tsx              // Virtualized table with TanStack Virtual

src/lib/data-explorer/
  types.ts                      // FilterCondition, FilterGroup, ColumnConfig, ColumnDataType, FilterOperator, etc.
  operators.ts                  // Operator definitions per type + display label map
  filter-grouping.ts            // Auto-grouping logic (shared client/server)
  filter-utils.ts               // URL serialization/deserialization, nanoid generation
  filter-sql.ts                 // Drizzle WHERE clause builder (server)
  icons.ts                      // Icon name → Tabler component lookup map
  columns/                      // Per-domain column configs (shared frontend/server)
    clients.ts
    (tasks.ts)                   // Added incrementally
    (prospects.ts)
    (audit-log.ts)
    (job-mandates.ts)
```

---

## 10. DataExplorer Component Props

```ts
interface DataExplorerProps<TItem> {
  domain: string;
  label: string;
  columnDefs: ColumnDef<TItem>[];
  columnsConfig: ColumnConfig[];
  buildQueryOptions: (opts: {
    filters: FilterCondition[];
    cursor?: string;
    limit: number;
    orderBy: { columnId: string; direction: "asc" | "desc" };
    display: FilterViewDisplay;
  }) => UseQueryOptions<ListQueryResult<TItem>>;
  getRowId: (row: TItem) => string;
  onRowClick?: (row: TItem) => void;
  emptyMessage?: string;
  baseUrl: string;
  rightItems?: React.ReactNode;
  columnOptions?: Record<string, ColumnOption[] | undefined>;
  batchActionBar?: (selectedIds: Set<string>, clearSelection: () => void) => React.ReactNode;
}
```

---

## 11. Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+F` | Focus filter bar |
| `Escape` | Blur filter bar / close filter panel |
| `Backspace` | When input empty, remove last chip |
| `Tab`/`Shift+Tab` | Navigate between chips and input |
| `Enter` | Commit current condition / apply |

- All comboboxes follow WAI-ARIA 1.2 patterns for combobox with listbox popup.
- Chips announced as "filter: [column] [operator label] [value]. Press delete to remove."
- Filter panel Sheet has `role="dialog"` with `aria-labelledby`.

---

## 12. Rollout Plan

1. **Clients** — first table. Replace existing `DataViewLayout` + `data-table-filter` usage. Prove the architecture.
2. **Tasks** — add `tasks` domain, column config, oRPC integration.
3. **Prospects** — add `prospects` domain.
4. **Audit Log** — add `audit_log` domain.
5. **Job Mandates** — add `job_mandates` domain.

The old `src/components/data-table-filter/` directory is kept for reference during development. New code lives in `src/components/data-explorer/` and `src/lib/data-explorer/`. Once all tables are migrated, the old directory can be removed.
