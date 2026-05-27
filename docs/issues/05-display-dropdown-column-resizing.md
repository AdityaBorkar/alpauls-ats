## Parent

#7

## What to build

The Display dropdown and column resizing — sort picker, column visibility checklist, row density toggle, and drag-to-resize column borders. All display state persisted in the filter view's display JSON (via URL overrides until saved).

End-to-end behavior: click the "Display" button to open a dropdown with three sections: (1) a checklist of columns to show/hide, (2) a sort column picker with asc/desc toggle, (3) a density toggle (compact 28px / comfortable 36px / spacious 48px). Drag a column border in the table header to resize it. Column widths, visible columns, sort order, and density are all reflected immediately and serialized to URL params.

The DisplayDropdown replaces the current placeholder "Display" div in the DataExplorer header.

Column resizing uses TanStack Table's columnResize feature. Widths are stored in the `columnWidths` field of FilterViewDisplay (sparse — only columns with custom widths). The context provider's `updateDisplay` merges partial updates.

## Acceptance criteria

- [ ] "Display" button opens a dropdown with three sections
- [ ] Column visibility: checklist of all columns from ColumnConfig; toggling shows/hides the column immediately
- [ ] Sort order: dropdown to pick a column + asc/desc toggle; table re-queries with new sort
- [ ] Row density: three options (compact 28px, comfortable 36px default, spacious 48px); changing resizes all rows immediately
- [ ] Column borders are draggable to resize; width updates are immediate
- [ ] Display state (fields, orderBy, orderType, columnWidths, density) syncs to URL params
- [ ] Display state loaded from URL on page load
- [ ] Display state persisted to filter view on Save View (slice 4)
- [ ] Column headers are NOT clickable for sorting
- [ ] Comfortable (36px) is the default density
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 02-bare-data-explorer (DataExplorer component, context provider with display state)
