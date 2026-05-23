import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import {
  createFileRoute,
  Link,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { parseAsJson, useQueryState } from "nuqs";
import { useMemo } from "react";
import { z } from "zod";

import { DataTableFilter } from "@/components/data-table-filter";
import type { FiltersState } from "@/components/data-table-filter/core/types";
import { useDataTableFilters } from "@/components/data-table-filter/hooks/use-data-table-filters";
import { FilterViewTabs } from "@/components/filter-view-tabs";
import { DataViewLayout } from "@/components/layouts/data-view-layout";
import NavLayout from "@/components/layouts/nav-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { FilterViewDisplay } from "@/db-schemas";
import {
  type ClientItem,
  clientColumnDefs,
  clientColumnsConfig,
} from "@/routes/(protected)/(app)/clients/-view-config";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
  validateSearch: z.object({
    view: z.string().optional(),
  }),
});

type FilterViewRow = {
  createdAt: Date | null;
  display: FilterViewDisplay;
  domain: string;
  id: string;
  isSystemCreated: boolean;
  label: string;
  refine: FiltersState;
  updatedAt: Date | null;
};

type ClientListInput = {
  archived?: boolean;
  assigneeId?: string[];
  cursor?: string;
  limit?: number;
  search?: string;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
};

const filtersSchema = z.custom<FiltersState>((val): val is FiltersState =>
  Array.isArray(val),
);

function filterKey(f: FiltersState[number]) {
  return `${f.columnId}::${f.operator}`;
}

function filtersEqual(a: FiltersState[number], b: FiltersState[number]) {
  return (
    a.columnId === b.columnId &&
    a.operator === b.operator &&
    a.type === b.type &&
    a.values.length === b.values.length &&
    a.values.every((v, i) => v === b.values[i])
  );
}

function mergeFilters(base: FiltersState, overrides: FiltersState) {
  const overrideMap = new Map(overrides.map((o) => [filterKey(o), o]));
  const result: FiltersState = [];

  for (const b of base) {
    const key = filterKey(b);
    if (overrideMap.has(key)) {
      const override = overrideMap.get(key);
      if (override && !filtersEqual(b, override)) {
        result.push(override);
      }
      overrideMap.delete(key);
    } else {
      result.push(b);
    }
  }

  for (const o of overrideMap.values()) {
    result.push(o);
  }

  return result;
}

function computeOverrides(base: FiltersState, effective: FiltersState) {
  const overrides: FiltersState = [];
  const baseMap = new Map(base.map((b) => [filterKey(b), b]));

  for (const f of effective) {
    const key = filterKey(f);
    const baseFilter = baseMap.get(key);
    if (!baseFilter || !filtersEqual(baseFilter, f)) {
      overrides.push(f);
    }
  }

  return overrides;
}

function filtersToBaseInput(filters: FiltersState) {
  let archived: boolean | undefined;
  let assigneeId: string[] | undefined;

  for (const f of filters) {
    if (f.columnId === "archived" && f.type === "option") {
      archived = f.values[0] === "true";
    }
    if (f.columnId === "assigneeId" && f.type === "option") {
      assigneeId = [...f.values];
    }
  }

  return { archived, assigneeId } satisfies Omit<
    ClientListInput,
    "cursor" | "limit" | "search"
  >;
}

function ClientsPage() {
  const navigate = useNavigate();
  const { view } = useSearch({ from: Route.id });

  const [urlFilters, setUrlFilters] = useQueryState<FiltersState>(
    "filters",
    parseAsJson(filtersSchema.parse).withDefault([]),
  );

  const { data: filterViewsData } = useQuery({
    ...rpc.filterView.list.queryOptions({ input: { domain: "clients" } }),
    enabled: !!view,
  });

  const filterViews = (filterViewsData ?? []) as FilterViewRow[];
  const activeView = view ? filterViews.find((v) => v.id === view) : null;
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
      setUrlFilters(overrides.length > 0 ? overrides : null);
    } else {
      setUrlFilters(resolved);
    }
  };

  const baseInput = useMemo(
    () => filtersToBaseInput(effectiveFilters),
    [effectiveFilters],
  );

  const { data: usersData } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100 } }),
  );

  const assigneeOptions = (usersData?.items ?? []).map((u) => ({
    icon: (
      <Avatar className="size-4">
        <AvatarImage src={u.image ?? undefined} />
        <AvatarFallback>{u.name?.[0] ?? "?"}</AvatarFallback>
      </Avatar>
    ),
    label: u.name ?? "Unknown",
    value: u.id,
  }));

  const archivedOptions = [
    { icon: <Archive className="size-4" />, label: "Archived", value: "true" },
    { label: "Active", value: "false" },
  ];

  const {
    columns,
    filters: filterState,
    actions,
    strategy,
  } = useDataTableFilters({
    columnsConfig: clientColumnsConfig,
    data: [] as ClientItem[],
    filters: effectiveFilters,
    onFiltersChange: updateFilters,
    options: {
      archived: archivedOptions,
      assigneeId: assigneeOptions,
    },
    strategy: "server",
  });

  return (
    <NavLayout
      baseUrl="/clients"
      label="Clients"
      leftItems={<FilterViewTabs domain="clients" />}
      rightItems={
        <Link className="flex" to="/clients/new">
          New Client
        </Link>
      }
    >
      <DataViewLayout<ClientItem, ClientListInput>
        baseInput={baseInput}
        columnDefs={clientColumnDefs}
        emptyMessage="No clients found"
        filterSlot={
          <DataTableFilter
            actions={actions}
            columns={columns}
            filters={filterState}
            locale="en"
            strategy={strategy}
          />
        }
        getRowId={(row) => String(row.id)}
        listProcedure={{
          queryOptions: (opts) =>
            rpc.client.list.queryOptions({
              input: opts.input as ClientListInput,
            }) as UseQueryOptions,
        }}
        onRowClick={(client) =>
          navigate({
            params: { clientId: String(client.id) },
            to: "/clients/$clientId",
          })
        }
        searchPlaceholder="Search clients..."
      />
    </NavLayout>
  );
}
