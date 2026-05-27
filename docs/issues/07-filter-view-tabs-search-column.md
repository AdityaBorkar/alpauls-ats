## Parent

#7

## What to build

Wire the existing FilterViewTabs with the new Data Explorer state model, update the useFilterViewState hook for the new FilterCondition[] and FilterViewDisplay shapes, update seed data for the new refine/display formats, and add the `_search` virtual column to the server-side filter processing.

This is a HITL slice because it requires human review of the seed data structure and the interaction between view tabs and the new filter model.

End-to-end behavior: the filter view tabs (Active, Archived) above the table now load views from the DB using the new `refine` format (FilterCondition[] with verbose names) and `display` format (with columnWidths + density). Clicking a tab loads that view's base conditions into the filter bar. Modifying filters creates URL overrides. The `?view=...&f=...` URL structure works for sharing. The `_search` virtual column is fully integrated: typing in the filter bar with _search selected sends `contains` to the server, which expands it to ILIKE across name, legalName, and slug.

Updates required:
- `useFilterViewState` hook — rewrite to work with new FilterCondition[] shape and expanded FilterViewDisplay. Use updated mergeFilters/computeOverrides from slice 1.
- `filter-views.ts` seed data — update the two system views (`clients-active`, `clients-archived`) to use new refine format: `[{"columnId":"archived","operator":"eq","value":"false","combinator":"and"}]`
- `filter_views` DB schema — update the `$type<>` annotations for refine and display to match new shapes
- `filterView` oRPC procedures — ensure they handle the new shapes (the JSONB column stores whatever we put in, but Zod validation schemas need updating)
- Server-side `_search` expansion in `buildFilterWhere` — already built in slice 1, but this slice verifies the end-to-end path works from UI → URL → oRPC → SQL → results
- FilterViewTabs component — update to work with the new view state hook

## Acceptance criteria

- [ ] Filter view tabs render and switch between views correctly
- [ ] Selecting a tab loads that view's base conditions into the filter bar
- [ ] Modifying filters on top of a view creates URL overrides (not modifying the DB view)
- [ ] Sharing a URL with ?view=...&f=... restores the correct filter state
- [ ] computeOverrides correctly identifies which conditions differ from the view base
- [ ] System views (clients-active, clients-archived) use the new refine format
- [ ] Seed script (db:push) creates views with correct new format
- [ ] _search virtual column: typing "acme" in the filter bar returns clients where name, legalName, or slug contain "acme"
- [ ] _search only supports contains/notContains operators
- [ ] filterView oRPC validation schemas updated for new shapes
- [ ] FilterViewTabs context menu (edit, delete, copy link) still works
- [ ] `bun --bun run check:types` passes
- [ ] `bun --bun run check:lint` passes

## Blocked by

- 03-filter-bar (filter bar with URL sync and condition state)
- 04-filter-panel (Save View / Reset to Saved wiring)
- 05-display-dropdown (display state URL sync)
