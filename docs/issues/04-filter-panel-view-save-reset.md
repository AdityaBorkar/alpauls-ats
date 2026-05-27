## Parent

#7

## What to build

The filter panel — a Sheet (side drawer) from the right that provides a structured editing surface for the same filter conditions shown in the filter bar. Plus the Save View and Reset to Saved actions.

End-to-end behavior: click the "Filter" button in the filter bar to open a Sheet sliding from the right. The sheet shows all current filter conditions as structured rows (column selector → operator selector → value input → AND/OR toggle → remove button). Add new conditions with "+ Add filter". Save View updates the active filter view's refine + display in the DB. Reset to Saved reverts to the stored view, discarding URL overrides.

The panel edits the **same state** as the filter bar — there is one FilterCondition[] array. Changes in the panel are reflected in the bar immediately and vice versa. No separate quick/advanced lists.

Components built:
- **FilterPanel** — Sheet from right with header (title + close button), condition rows, add button, and Save/Reset footer
- **FilterConditionRow** — horizontal row with ColumnSelector, OperatorSelector, ValueInput, FilterCombinatorToggle, and remove button
- Reuses ColumnSelector, OperatorSelector, ValueInput, FilterCombinatorToggle from slice 3

The panel's Save View action calls `filterView.update` oRPC endpoint with the current conditions (serialized to verbose DB format) and display state. Reset to Saved navigates back to the view's base state by clearing URL overrides.

## Acceptance criteria

- [ ] "Filter" button in filter bar opens a Sheet sliding from the right
- [ ] Sheet shows all current filter conditions as structured rows
- [ ] Each row has: column selector, operator selector, value input, AND/OR toggle, remove button
- [ ] "+ Add filter" button adds a new empty condition row
- [ ] Changes in the panel immediately reflect in the filter bar (same state)
- [ ] Changes in the filter bar immediately reflect in the panel (same state)
- [ ] Save View button (only visible when a view is active) persists current conditions + display to the DB
- [ ] Reset to Saved button reverts to the stored view, discarding URL overrides
- [ ] Sheet has role="dialog" with aria-labelledby
- [ ] Escape closes the panel
- [ ] Table is visible underneath the panel (dimmed overlay)
- [ ] No "Save As" button — new views created only from tab context menu
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 03-filter-bar (filter bar with chips, context provider with filter state, column/operator/value selectors)
