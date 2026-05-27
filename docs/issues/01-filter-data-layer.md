## Parent

#7

## What to build

The complete filter data layer — all pure-logic modules that have no UI dependency. This slice establishes the foundation that every other slice builds on.

Build and test:

1. **Filter types** (`types.ts`) — `FilterCondition`, `FilterGroup`, `ColumnConfig`, `ColumnOption`, `ColumnDataType`, `FilterOperator`, `FilterViewDisplay`, `DataExplorerContext` interface shape, `DataExplorerProps` interface shape.

2. **Operator registry** (`operators.ts`) — maps each `ColumnDataType` to its set of valid programmatic operators and human-readable display labels. Covers all 6 types (string, number, date, boolean, enum, multiEnum) including `between`/`notBetween` for number and date. Provides lookup: `getOperatorsForType(type)`, `getOperatorLabel(operator)`, `getDefaultOperator(type)`.

3. **Auto-grouping engine** (`filter-grouping.ts`) — `groupConditions(conditions: FilterCondition[]): FilterGroup`. Takes a flat ordered array with per-condition combinators and produces a tree where AND binds tighter than OR (standard boolean precedence). Combinator field is preserved on conditions inside the tree for round-tripping. First condition's combinator is always `"and"` (ignored during evaluation).

4. **URL serialization** (`filter-utils.ts`) — `serializeFilters(conditions)` → JSON string with short keys (`c`=columnId, `o`=operator, `v`=value, `b`=combinator). `deserializeFilters(json)` → `FilterCondition[]` with nanoid IDs regenerated. `serializeDisplay(display)` / `deserializeDisplay(params)` for display state URL params (`sort`, `dir`, `cols`, `widths`, `density`). Dates as ISO strings, `null` for valueless operators, arrays for `in`/`between`.

5. **Clients column config** (`columns/clients.ts`) — `ColumnConfig[]` for the clients domain: `_search` (string, searchable=false, contains/notContains only), `name` (string, searchable=true), `legalName` (string, searchable=true), `slug` (string, searchable=true), `assigneeId` (enum, searchable=false, options passed dynamically), `archived` (boolean), `createdAt` (date). Plus the shared `icons.ts` lookup map (Tabler icon name string → component).

6. **SQL builder** (`filter-sql.ts`) — `buildFilterWhere(conditions, domain, schema): SQL | undefined`. Validates conditions against the domain's `ColumnConfig` registry via Zod. Runs auto-grouping. Recursively builds Drizzle `SQL` WHERE clauses from the `FilterGroup` tree. Handles every operator per type. Handles `_search` virtual column by expanding to multi-column ILIKE for all columns with `searchable: true`. Handles `between`/`notBetween` with tuple values. Handles `isEmpty`/`isNotEmpty` with null check.

7. **Filter view merge** (replace `filter-merge.ts`) — Updated `mergeFilters(base, effective)` and `computeOverrides(base, effective)` for the new `FilterCondition[]` shape. `filterKey(cond)` returns `columnId + "::" + operator`. Handles display state merge/override extraction for the expanded `FilterViewDisplay` shape (including `columnWidths`, `density`).

Key type shapes from the plan (encoding decisions precisely):

```ts
interface FilterCondition {
  id: string;               // nanoid, regenerated on parse, not serialized
  columnId: string;
  operator: FilterOperator;  // programmatic: "eq", "contains", "gte", etc.
  value: unknown;            // null for isEmpty/isNotEmpty, [min,max] for between
  combinator: "and" | "or";  // connector to previous; first always "and" (ignored)
}

interface FilterGroup {
  id: string;
  combinator: "and" | "or";
  conditions: (FilterCondition | FilterGroup)[];
}

type ColumnDataType = "string" | "number" | "date" | "boolean" | "enum" | "multiEnum";

interface ColumnConfig {
  id: string;
  displayName: string;
  icon: string;               // Tabler icon name string
  type: ColumnDataType;
  operators?: FilterOperator[];
  options?: ColumnOption[];
  min?: number;
  max?: number;
  searchable?: boolean;
}

interface FilterViewDisplay {
  type: string;
  groupBy: string | null;
  orderBy: string;
  orderType: "asc" | "desc";
  fields: string[];
  columnWidths: Record<string, number>;
  density: "compact" | "comfortable" | "spacious";
}
```

## Acceptance criteria

- [ ] All types defined in types.ts match the plan shapes exactly
- [ ] Operator registry covers all 6 ColumnDataTypes with correct programmatic keys and display labels per the plan's operator table
- [ ] Auto-grouping produces correct FilterGroup trees for: empty array, single condition, all AND, all OR, mixed AND/OR (A AND B OR C), three-way (A AND B OR C AND D), OR at start, AND at end
- [ ] Auto-grouping preserves combinator field on conditions inside the tree
- [ ] URL serialization round-trips correctly: serialize → deserialize produces conditions matching original (except IDs regenerated)
- [ ] URL serialization handles: null values, date values, between tuples, string arrays for in/notIn, empty array
- [ ] Clients column config defines all 7 columns (_search, name, legalName, slug, assigneeId, archived, createdAt) with correct types and searchable flags
- [ ] Icon lookup map resolves Tabler icon name strings to components
- [ ] SQL builder produces correct WHERE clauses for each operator per type against PGlite
- [ ] SQL builder expands _search to ILIKE on name, legalName, slug
- [ ] SQL builder validates conditions via Zod: rejects unknown columns, invalid operators, wrong value types
- [ ] Filter view merge: mergeFilters and computeOverrides work correctly with new FilterCondition[] shape
- [ ] All test suites pass (auto-grouping, serialization, SQL builder, filter merge, column config validation)
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

None - can start immediately
