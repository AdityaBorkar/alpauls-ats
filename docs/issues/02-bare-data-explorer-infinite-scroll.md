## Parent

#7

## What to build

The bare DataExplorer component — context provider (data loading only, no filter state yet), VirtualTable with TanStack Virtual, infinite scroll with auto-fetch, and the Clients page migrated off DataViewLayout onto the new DataExplorer.

This slice delivers a working, browsable clients table with infinite scroll but no filtering UI. It establishes the component structure, context provider, data flow, and TanStack Virtual integration that subsequent slices build on.

End-to-end behavior: navigate to `/clients`, see a virtual table that loads 20 rows initially, scroll to the bottom and more rows auto-fetch with a spinner indicator. Clicking a row triggers the configurable `onRowClick` callback (currently opens the client detail drawer). No filter bar, no chips, no filter panel — just the table with infinite scroll.

The DataExplorer component accepts the props from the plan:

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

The context provider manages display state (sort, column visibility, density, widths) and passes effective filters/display to `buildQueryOptions`. For this slice, filters are always empty and display uses defaults.

Includes: sticky table header, existing column definitions (using the current client ColumnDef rendering), and NavLayout with filter view tabs (still using the old filter system for view tabs only — filter bar integration comes in slice 3).

Installs `@tanstack/react-virtual` as a new dependency.

## Acceptance criteria

- [ ] DataExplorer component renders a virtual table with TanStack Virtual
- [ ] Infinite scroll: scrolling near bottom auto-fetches next cursor page with spinner indicator
- [ ] Table header is sticky within scroll container
- [ ] onRowClick callback fires when a row is clicked (opens client detail drawer)
- [ ] NavLayout with filter view tabs renders above the table
- [ ] Clients page uses DataExplorer instead of DataViewLayout
- [ ] Empty state shows configurable emptyMessage
- [ ] Display state (sort, column visibility, density, widths) managed in context with defaults
- [ ] buildQueryOptions receives effective filters (empty) and display state
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 01-filter-data-layer (needs types, ColumnConfig, FilterViewDisplay, filter view merge)
