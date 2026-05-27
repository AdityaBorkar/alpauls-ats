## Parent

#7

## What to build

The full filter bar with per-condition AND/OR combinators, auto-bracket rendering, hybrid input (Command popover + inline suggestions), chips, URL synchronization, and Ctrl+F keyboard shortcut. This slice makes the DataExplorer actually filterable.

End-to-end behavior: press Ctrl+F to focus the filter bar, type to see column suggestions in a Command popover, select a column to enter operator/value flow, commit a condition which becomes a removable chip. Toggle AND/OR between chips. See auto-bracket grouping around AND conditions: `(status:open AND priority:high) OR assignee:me`. Clear all with × button. Filter conditions serialize to the `f` URL param and sync with the table query. The server receives FilterCondition[] and returns filtered results.

Components built:
- **FilterBar** — container with input, chips, buttons (Add filter, Filter, Clear)
- **FilterChip** — individual removable chip showing column icon, column name, operator label, value
- **FilterCombinatorToggle** — small AND/OR toggle between chips; changing it restructures auto-groups and updates URL
- **ColumnSelector** — Command popover listing columns from ColumnConfig with icons, plus quick-value matches for enum columns (typing "open" shows "Status → Open")
- **OperatorSelector** — dropdown showing valid operators for the selected column's type with human-readable labels
- **ValueInput** — adapts per column type: free text for string, number input for number, date picker for date, toggle for boolean, checkbox list for enum/multiEnum, range inputs for between/notBetween. Hides entirely for isEmpty/isNotEmpty.

The filter bar sits in the header row below NavLayout, same position as the current FilterCombobox. The "Display" button placeholder is replaced with the DisplayDropdown (built in slice 5 — for now, a non-functional placeholder remains).

Context provider is extended with filter state: conditions array, addCondition, removeCondition, updateCondition, clearAllConditions. Filter state syncs to URL via the `f` param using serializeFilters/deserializeFilters from slice 1.

## Acceptance criteria

- [ ] Ctrl+F focuses the filter bar input (with preventDefault on browser find)
- [ ] Typing in the filter bar opens a Command popover with column suggestions (icon + displayName)
- [ ] Selecting a column opens operator selection, then value input based on column type
- [ ] Committing a condition (Enter) creates a chip and clears the input
- [ ] Chips are removable via × button or Backspace on empty input
- [ ] Arrow keys navigate between chips
- [ ] AND/OR toggle between chips; changing it updates the condition's combinator
- [ ] Auto-bracket rendering: AND-grouped conditions wrapped in visual brackets
- [ ] × Clear button removes all conditions
- [ ] Filter conditions serialize to the `f` URL param on every change
- [ ] Navigating to a URL with `?f=...` deserializes and applies the filters
- [ ] ValueInput adapts per column type (string=free text, number=number input, date=calendar, boolean=toggle, enum=checkbox list, multiEnum=checkbox list, between=two inputs)
- [ ] ValueInput is hidden for isEmpty/isNotEmpty operators
- [ ] Table re-queries with updated filter conditions; server returns filtered results
- [ ] Virtual search column _search appears in column suggestions; typing queries it with contains operator only
- [ ] FilterCombobox from old data-table-filter is no longer used by the Clients page
- [ ] All comboboxes follow WAI-ARIA 1.2 patterns (role, aria- labels)
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 01-filter-data-layer (types, operators, serialization, SQL builder, column config, grouping)
- 02-bare-data-explorer (DataExplorer component, context provider, clients page)
