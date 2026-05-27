# Input Filters & Advanced Filters Specification (Linear.app–style)

This document details the architecture, UX patterns, and implementation guidelines for building a filtering system inspired by Linear’s issue filtering, tightly integrated with **React** + **TanStack Table** (using `@tanstack/react-table` v8) and **TanStack Virtual**. The system supports both quick, keyboard-driven input and a full combobox-based advanced filter builder, with the ability to combine any number of conditions using AND/OR logic.

---

## 1. Overview

The filtering system allows users to narrow down tabular data by applying **any number of conditions** on any column. Two interaction modes are provided:

- **Quick Filter (keyboard)**: type directly in a filter bar (activated by a shortcut) to filter across a default “search” column, or use an inline chip syntax to target specific columns.
- **Advanced Filter Builder (combobox)**: a dedicated panel/modal where users compose conditions by selecting columns, operators, and values from dropdowns. Supports nested AND/OR groups.

The filter state is fully serialisable (e.g. in URL search params) and integrates seamlessly with TanStack Table’s client-side filtering and virtualisation.

---

## 2. Core Requirements

1. **Combine any number of filters** – unlimited conditions, linked by AND/OR.
2. **Nest groups** – (e.g., `(A AND B) OR (C AND D)`) for complex logic.
3. **Two input modes**:
   - Keyboard‑first (typing in a “filter bar”, autocomplete for columns/operators/values).
   - Combobox‑first (mouse‑friendly, select column → operator → value).
4. **Column‑aware** – each column exposes its data type, available operators, and value source (static list, fetched, or free‑form).
5. **TanStack Table integration** – the filter state transforms into `columnFilters`, `globalFilter`, and custom `filterFns`.
6. **Virtualisation friendly** – filtering happens on the **data level** before rows are passed to the virtualised table.
7. **URL synchronisation** – filter state can be saved in query parameters for shareable views.
8. **Accessibility** – full keyboard navigation, ARIA labels, screen‑reader support.

---

## 3. User Interface Design

### 3.1 Quick Filter Bar (Keyboard Mode)

A minimal text input permanently visible above or integrated into the table header. Example:

```
┌──────────────────────────────────────────────────────────┐
│ 🔍  [   status:open priority:high       ]  × Clear    │
│     ┌───────────┐ ┌──────────┐ ┌──────────┐             │
│     │ status:open │ priority:high │ assignee:me │ + Add  │
│     └───────────┘ └──────────┘ └──────────┘             │
└──────────────────────────────────────────────────────────┘
```

- **Activation**: Press `/` or `Ctrl+F` to focus the input.
- **Syntax**: Users type column‑qualified tokens: `<column><operator><value>`, e.g. `status:open`, `priority>=high`. The bar provides autocomplete for columns, operators, and values based on the column type.
- **Autocomplete flow**:
  1. User starts typing → suggestions for **columns** that match.
  2. Once a column is chosen (or `:` typed), suggestions for **operators**.
  3. After operator, suggestions for **values** (e.g., distinct values from data, or free‑form).
- **Chips**: Each valid condition becomes a removable chip. A `+ Add filter` button at the end opens the Advanced Filter Builder to add more complex conditions.
- **Context**: Quick filters are implicitly **AND**ed together. For OR logic, the Advanced Builder is required.

### 3.2 Advanced Filter Builder (Combobox Mode)

Opened via a button “Advanced Filters” or the `+ Add filter` chip. Displayed as a **slide‑over panel** or **modal** (Linear uses a right‑side panel).

```
┌─────────────────────────────────────────────────────┐
│  Advanced Filters                          [× Close] │
│                                                     │
│  ● WHERE  [ All of  ▼]  (AND/OR toggle)            │
│   ┌──────────────┬──────────┬─────────────────┐   │
│   │ Column ▼     │ Operator ▼ │ Value ▼       │ × │
│   │ status       │ is         │ open           │   │
│   └──────────────┴──────────┴─────────────────┘   │
│  + Add filter                                      │
│  + Add filter group                                │
│                                                     │
│  ● AND  [ Any of  ▼]                               │
│   ┌──────────────┬──────────┬─────────────────┐   │
│   │ Column ▼     │ Operator ▼ │ Value ▼       │ × │
│   │ priority     │ >=         │ high           │   │
│   └──────────────┴──────────┴─────────────────┘   │
│   ┌──────────────┬──────────┬─────────────────┐   │
│   │ assignee     │ contains   │ me             │ × │
│   └──────────────┴──────────┴─────────────────┘   │
│  + Add filter | + Add filter group                │
│                                                     │
│  [Apply]  [Cancel]                                 │
└─────────────────────────────────────────────────────┘
```

Key elements:

- **Root group**: default AND/OR toggle at the top.
- **Condition row**: three comboboxes (Column, Operator, Value) plus a remove button.
- **Group**: a block with its own AND/OR toggle, containing child conditions or nested groups.
- **Actions**: “+ Add filter” inserts a condition; “+ Add filter group” nests a new group.
- **Value combobox** adapts: for enums it shows a selectable list; for text it allows free input with optional suggestions; for dates a date picker.
- **Keyboard navigation**: Tab between fields, Enter to select, Escape to close.

---

## 4. Filter Model & Data Types

### 4.1 Filter Condition Shape (TypeScript)

```ts
type FilterOperator =
  | "eq" | "neq"
  | "gt" | "gte" | "lt" | "lte"
  | "contains" | "notContains"
  | "startsWith" | "endsWith"
  | "isEmpty" | "isNotEmpty"
  | "in" | "notIn";

interface FilterCondition {
  id: string;          // unique identifier
  columnId: string;    // column key as defined in table
  operator: FilterOperator;
  value: unknown;      // string, number, boolean, Date, string[] (for in)
}

type FilterGroup = {
  id: string;
  type: "group";
  combinator: "and" | "or";
  conditions: (FilterCondition | FilterGroup)[];
};

type FilterState = FilterGroup; // root is always a group
```

### 4.2 Column Metadata

Each column must define filter metadata via TanStack Table’s `meta`:

```ts
interface ColumnFilterMeta {
  type: "string" | "number" | "date" | "boolean" | "enum";
  operators?: FilterOperator[]; // override default operators for type
  enumValues?: { label: string; value: string }[]; // static enum options
  valueSource?: "static" | "data-driven" | "async";
  // for async: function that returns options based on input string
  asyncSuggestions?: (query: string) => Promise<Option[]>;
}
```

### 4.3 Operators per Type (default)

| Type    | Operators                                                                 |
|---------|---------------------------------------------------------------------------|
| string  | eq, neq, contains, notContains, startsWith, endsWith, isEmpty, isNotEmpty |
| number  | eq, neq, gt, gte, lt, lte, isEmpty, isNotEmpty                            |
| date    | eq, neq, gt, gte, lt, lte, isEmpty, isNotEmpty                            |
| boolean | eq, neq                                                                   |
| enum    | eq, neq, in, notIn                                                        |

### 4.4 Combining Filters

The UI builds a tree of `FilterGroup` nodes. At evaluation time (client‑side), the tree is recursively applied:

- `and` combinator: all children must match.
- `or` combinator: at least one child matches.

---

## 5. Integration with TanStack Table

### 5.1 Defining Columns with Meta

```tsx
const columns = [
  columnHelper.accessor("status", {
    header: "Status",
    meta: {
      filter: {
        type: "enum",
        enumValues: [
          { label: "Open", value: "open" },
          { label: "Done", value: "done" },
        ],
      },
    },
  }),
  columnHelper.accessor("title", {
    header: "Title",
    meta: { filter: { type: "string" } },
  }),
  // ...
];
```

### 5.2 Converting FilterState to TanStack Filters

We cannot directly feed the hierarchical `FilterState` into TanStack’s flat `columnFilters`. Instead:

- **Global filter**: the filter bar’s “search all” text is passed to `globalFilter`.
- **Advanced filters**: a custom global filter function that recursively evaluates the `FilterState` tree. TanStack’s `filterFns` can be extended.

Option A: Use a single custom global filter function that takes the row and the `FilterState` as filter value:

```tsx
const table = useReactTable({
  data,
  columns,
  state: { globalFilter: filterState },
  globalFilterFn: advancedFilterFn,
  // ...
});
```

The `advancedFilterFn` receives `row`, `columnId` (unused), `filterValue: FilterGroup`. It evaluates the tree against each row.

Option B: Flatten the tree into an array of conditions, then use a custom `filterFn` on a pseudo‑column. This works but loses grouping logic if not careful.

**Recommended: Option A** – the global filter holds the `FilterState` object, and we implement a recursive evaluation function. This cleanly separates the filter UI state from TanStack’s column-level filtering.

### 5.3 Recursive Evaluation Function

```ts
function evaluateFilterGroup(
  row: Row<Data>,
  group: FilterGroup,
  getValue: (columnId: string) => unknown
): boolean {
  const results = group.conditions.map((cond) => {
    if (cond.type === "group") {
      return evaluateFilterGroup(row, cond, getValue);
    }
    // Evaluate condition
    const cellValue = getValue(cond.columnId);
    return evaluateCondition(cellValue, cond);
  });

  return group.combinator === "and"
    ? results.every(Boolean)
    : results.some(Boolean);
}
```

`evaluateCondition` applies the operator based on column type (e.g., `contains` for strings, `gt` for numbers/dates).

### 5.4 State Management

- Use `useState` or a Zustand store for `filterState: FilterGroup`.
- Sync with URL search params (e.g., `?filters=...`) via a JSON.stringify/parse round‑trip (with compression if needed).
- When filter state changes, update the TanStack table’s `globalFilter` state.

```tsx
const [filterState, setFilterState] = useState<FilterGroup>({
  id: "root",
  type: "group",
  combinator: "and",
  conditions: [],
});

useEffect(() => {
  table.setGlobalFilter(filterState);
}, [filterState, table]);
```

### 5.5 Virtualisation Compatibility

TanStack Virtual expects a flat array of rows. Because we filter at the data level before rendering the table, virtualisation works naturally:

1. Raw data → apply `filterFn` (which uses the `FilterState`) → filtered data array.
2. Pass filtered data to `table` via `data` prop.
3. The table exposes `table.getRowModel().rows`, which are already filtered and paginated if needed.
4. Virtualise those rows using `useVirtualizer`.

No special treatment needed as long as filtering is applied to `data` before it enters the table.

---

## 6. Implementation Plan (Step‑by‑Step)

### 6.1 Folder Structure

```
src/
  components/
    filters/
      FilterProvider.tsx          // context + state management
      FilterBar.tsx               // quick filter input with chips
      FilterChip.tsx              // individual removable chip
      AdvancedFilterModal.tsx     // modal/panel container
      FilterGroupComponent.tsx    // renders a group (AND/OR toggle, children)
      FilterConditionRow.tsx      // column/operator/value comboboxes
      ColumnCombobox.tsx
      OperatorCombobox.tsx
      ValueCombobox.tsx
      filterUtils.ts              // evaluation, parsing, serialisation
  hooks/
    useFilterState.ts
    useColumnFilterMeta.ts
    useFilterSuggestions.ts
```

### 6.2 Core Components

#### FilterProvider

Wraps the table page, holds `filterState` and provides update functions: `addCondition`, `removeCondition`, `updateCondition`, `addGroup`, `toggleCombinator`, `clearAll`.

#### FilterBar (Keyboard Mode)

- Input field with `onKeyDown` to handle autocomplete.
- Manages a local string that is parsed into chips.
- Autocomplete uses a headless combobox library (e.g., Downshift, or a custom hook).
- On `Enter`, if a valid condition is formed, a chip is added to the quick‑filter list. The quick‑filter list is a flat array that is ANDed together – internally mapped to a `FilterGroup` with `and` combinator.
- Chips are removable via Backspace or `×` button.
- Pressing `+ Add filter` opens the Advanced Builder, which can add to a separate advanced filter group. The final `filterState` merges quick filters and advanced filters under a top‑level AND group.

#### AdvancedFilterModal

- Renders the root `FilterGroupComponent`.
- `FilterGroupComponent` shows combinator toggle and a list of `FilterConditionRow` / nested `FilterGroupComponent`.
- Each `FilterConditionRow` contains three comboboxes. The `ValueCombobox` changes behaviour based on selected column’s metadata.

#### Combobox Pattern

All comboboxes follow a consistent pattern:

- **Trigger**: button showing current selection or placeholder.
- **Popover**: searchable list of options.
- **Keyboard**: Arrow keys to navigate, Enter to select, Escape to close.
- **Async suggestions**: for data‑driven values, fetch distinct column values (or use pre‑fetched data) filtered by search query.

Implementation can be based on Radix UI’s Popover + Command (cmdk), or a headless library like `@tanstack/react-combobox` if available. For simplicity, a controlled `input` with a dropdown list works.

### 6.3 State Machine for Keyboard Flow

Focus in filter bar → typing:

1. **Column selection**: filter bar suggests column names from `table.getAllLeafColumns()` filtered by `meta.filter`.
2. **Operator selection**: when `:` is typed or column selected, suggest operators based on column type.
3. **Value input**: after operator is chosen (or automatically `:`), free‑form text input; suggestions based on `meta.filter.enumValues` or `asyncSuggestions`.
4. **Commit**: pressing `Enter` (or `Tab`) creates the chip and clears the input for the next condition.

### 6.4 Parsing and Serialisation

- The quick‑filter bar text is parsed into an array of `FilterCondition` using a simple regex or parser (handling quoted values for spaces, e.g., `status:"in progress"`).
- Advanced filter state is serialised to/from a compact JSON string stored in URL parameter `f`.
- The two sources (quick + advanced) are combined into one `FilterGroup` with `and` at root.

---

## 7. Keyboard Shortcuts & Accessibility

| Shortcut           | Action                                   |
| ------------------ | ---------------------------------------- |
| `/` or `Ctrl+F`    | Focus filter bar                         |
| `Escape`           | Blur filter bar / close advanced modal   |
| `Ctrl+Shift+F`     | Open advanced filter modal               |
| `Backspace`        | When input empty, remove last chip       |
| `Tab`/`Shift+Tab`  | Navigate between chips and input         |
| `Enter`            | Commit current input / apply advanced    |

- All comboboxes must follow WAI‑ARIA 1.2 patterns for combobox with listbox popup.
- Chips are announced as “filter: [column] [operator] [value]. Press delete to remove”.
- Advanced modal has `role="dialog"` with `aria-labelledby`.

---

## 8. Performance Considerations with TanStack Virtual

- **Filter evaluation cost**: For client‑side filtering, the recursive `evaluateFilterGroup` is called for every row on every filter change. With virtualisation, only visible rows are rendered, but **filtering still runs on the entire dataset**. For large datasets (>10k rows), consider:
  - Memoising the filtered result with `useMemo` based on raw data and filter state.
  - Using Web Workers to evaluate filters off the main thread.
  - Moving filtering to the server (server‑side filtering) – the `filterState` is sent to the API.
- **Value suggestions**: For data‑driven value lists, pre‑compute distinct values once on data load, or fetch them lazily when a column is selected to avoid blocking the UI.
- **Avoid unnecessary re‑renders**: Use `React.memo` on condition rows and comboboxes. Keep filter state in a separate context provider (or Zustand) so that the table does not re‑render on every keystroke in the filter bar unless the committed filter state changes.

---

## 9. Example Code Snippets

### 9.1 Custom Global Filter Function

```ts
// filterUtils.ts
export const advancedFilterFn: FilterFn<Data> = (
  row,
  columnId,
  filterValue: FilterGroup
) => {
  return evaluateFilterGroup(row, filterValue, (colId) => row.getValue(colId));
};

function evaluateFilterGroup(
  row: Row<Data>,
  group: FilterGroup,
  getValue: (colId: string) => unknown
): boolean {
  for (const condition of group.conditions) {
    if (condition.type === "group") {
      const result = evaluateFilterGroup(row, condition, getValue);
      if (group.combinator === "or" && result) return true;
      if (group.combinator === "and" && !result) return false;
    } else {
      const cellValue = getValue(condition.columnId);
      const result = evaluateCondition(cellValue, condition);
      if (group.combinator === "or" && result) return true;
      if (group.combinator === "and" && !result) return false;
    }
  }
  return group.combinator === "and";
}

function evaluateCondition(
  value: unknown,
  cond: FilterCondition
): boolean {
  // ... implement operator logic based on column meta type
  // use column metadata if needed (passed via condition or looked up)
}
```

### 9.2 Filter State Hook (Zustand example)

```ts
import { create } from "zustand";

interface FilterStore {
  advancedFilter: FilterGroup;
  quickConditions: FilterCondition[];
  setAdvancedFilter: (group: FilterGroup) => void;
  addQuickCondition: (cond: FilterCondition) => void;
  removeQuickCondition: (id: string) => void;
  clearAll: () => void;
  // Computed: merge into a single FilterGroup
  mergedFilter: () => FilterGroup;
}

export const useFilterStore = create<FilterStore>((set, get) => ({
  advancedFilter: { id: "advanced", type: "group", combinator: "and", conditions: [] },
  quickConditions: [],
  // ... implementations
  mergedFilter: () => {
    const { quickConditions, advancedFilter } = get();
    // Root AND: quickConditions (as and-group) AND advancedFilter
    const quickGroup: FilterGroup = {
      id: "quick",
      type: "group",
      combinator: "and",
      conditions: quickConditions.map((c) => ({ ...c, type: "condition" })),
    };
    return {
      id: "root",
      type: "group",
      combinator: "and",
      conditions: [quickGroup, advancedFilter],
    };
  },
}));
```

### 9.3 Integrating with TanStack Table

```tsx
function TableView() {
  const mergedFilter = useFilterStore((s) => s.mergedFilter());

  const table = useReactTable({
    data: rawData, // may already be filtered externally if server-side
    columns,
    state: { globalFilter: mergedFilter },
    globalFilterFn: advancedFilterFn,
    getCoreRowModel: getCoreRowModel(),
    // ...
  });

  const { rows } = table.getRowModel();

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 40,
  });

  // Render virtualised rows
}
```

---

## 10. Summary

This specification delivers a comprehensive, Linear‑style filtering experience for a React + TanStack Table application. By separating the filter UI into a keyboard‑driven quick bar and a combobox‑based advanced builder, users gain both speed and power. The hierarchical filter model maps cleanly to a custom global filter function, preserving TanStack Table’s virtualisation and performance characteristics. The design ensures extensibility, accessibility, and seamless integration with URL state.
