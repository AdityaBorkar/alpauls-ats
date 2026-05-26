import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";

import type { FiltersState } from "@/components/data-table-filter/core/types";
import type { filterViews } from "@/db-schemas";
import { computeOverrides, mergeFilters } from "@/lib/filter-merge";
import { rpc } from "@/rpc/client";

type FilterViewRow = typeof filterViews.$inferSelect;

function readView(search: Record<string, unknown>): string {
  return typeof search.view === "string" ? search.view : "";
}

function readFilters(search: Record<string, unknown>): FiltersState {
  return Array.isArray(search.filters) ? (search.filters as FiltersState) : [];
}

export function useFilterViewState(domain: string) {
  const navigate = useNavigate();
  const { search } = useLocation();
  const searchRecord = search as Record<string, unknown>;

  const view = readView(searchRecord);
  const urlFilters = readFilters(searchRecord);

  const { data: filterViewsData } = useQuery({
    ...rpc.filterView.list.queryOptions({ input: { domain } }),
    enabled: !!view,
  });

  const views = (filterViewsData ?? []) as FilterViewRow[];
  const activeView = view ? views.find((v) => v.id === view) : null;
  const baseFilters = activeView?.refine ?? [];

  const effectiveFilters = view
    ? mergeFilters(baseFilters, urlFilters)
    : urlFilters;

  const updateFilters: React.Dispatch<React.SetStateAction<FiltersState>> = (
    next,
  ) => {
    const resolved = typeof next === "function" ? next(effectiveFilters) : next;

    if (view) {
      const overrides = computeOverrides(baseFilters, resolved);
      navigate({
        replace: true,
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          filters: overrides.length > 0 ? overrides : undefined,
        })) as never,
      });
    } else {
      navigate({
        replace: true,
        search: ((prev: Record<string, unknown>) => ({
          ...prev,
          filters: resolved.length > 0 ? resolved : undefined,
        })) as never,
      });
    }
  };

  return { effectiveFilters, updateFilters };
}
