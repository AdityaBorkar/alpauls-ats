## Parent

#7

## What to build

Row selection with checkboxes and a bottom floating batch action bar with a render prop pattern. For the Clients table: Archive/Unarchive, Reassign, and Export selected rows as CSV.

End-to-end behavior: each table row has a checkbox on the left. Clicking it toggles selection. A "select all" checkbox in the header selects/deselects all currently loaded rows. When any rows are selected, a floating bar appears at the bottom of the viewport showing the selection count and action buttons. Clicking an action performs it on all selected rows. Clicking outside or pressing Escape clears selection.

The batch action bar content is a **render prop** on DataExplorer: `(selectedIds: Set<string>, clearSelection: () => void) => ReactNode`. The Clients page provides: Archive/Unarchive (calls client.archive oRPC), Reassign (opens a reassign dialog), Export (generates CSV from selected rows and triggers download).

Components built:
- **SelectionCheckbox** — checkbox on each row + "select all" in header
- **BatchActionBar** — floating bar at bottom of viewport with selection count and render prop content

Context provider is extended with: selectedRowIds (Set<string>), toggleRowSelection, clearSelection, selectAll.

## Acceptance criteria

- [ ] Each row has a checkbox on the left side
- [ ] Header has a "select all" checkbox that selects/deselects all loaded rows
- [ ] Selecting any row shows a floating bar at the bottom of the viewport
- [ ] Floating bar shows the count of selected rows
- [ ] Floating bar content is controlled by the batchActionBar render prop
- [ ] Clients page provides: Archive/Unarchive, Reassign, Export CSV
- [ ] Archive/Unarchive toggles the archived field on selected clients via oRPC
- [ ] Reassign opens a dialog to pick a new assignee, then updates selected clients
- [ ] Export generates a CSV from the selected rows' data and triggers a browser download
- [ ] Clearing selection hides the floating bar
- [ ] After a batch action completes, selection is cleared and the table refreshes
- [ ] Selection state is local (not persisted in URL or view)
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 02-bare-data-explorer (DataExplorer component, context provider, virtual table)
