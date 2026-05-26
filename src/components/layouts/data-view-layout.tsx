import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useState } from "react";

import { DataTableFilter } from "@/components/data-table-filter";
import type {
  ColumnConfig,
  ColumnOption,
  FiltersState,
} from "@/components/data-table-filter/core/types";
import { useDataTableFilters } from "@/components/data-table-filter/hooks/use-data-table-filters";
import { FilterViewTabs } from "@/components/filter-view-tabs";
import { useFilterViewState } from "@/hooks/use-filter-view-state";

import { Button } from "../ui/button";
import { Input } from "../ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import NavLayout from "./nav-layout";

type ListQueryResult<TItem> = {
  items: TItem[];
  nextCursor?: string | null;
};

export function DataViewLayout<TItem>({
  baseUrl,
  columnsConfig,
  domain,
  emptyMessage = "No items found",
  filterOptions,
  getRowId,
  label,
  buildQueryOptions,
  onRowClick,
  rightItems,
  searchPlaceholder = "Search...",
  columnDefs,
}: {
  baseUrl: string;
  columnDefs: ColumnDef<TItem>[];
  columnsConfig: ReadonlyArray<ColumnConfig<TItem, any, any, any>>;
  domain: string;
  emptyMessage?: string;
  filterOptions?: Record<string, ColumnOption[] | undefined>;
  getRowId: (row: TItem) => string;
  label: string;
  buildQueryOptions: (opts: {
    filters: FiltersState;
    cursor?: string;
    limit: number;
    search?: string;
  }) => UseQueryOptions<ListQueryResult<TItem>>;
  onRowClick?: (row: TItem) => void;
  rightItems?: React.ReactNode;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();

  const { effectiveFilters, updateFilters } = useFilterViewState(domain);

  const [prevFiltersKey, setPrevFiltersKey] = useState("");
  const filtersKey = JSON.stringify(effectiveFilters);
  if (prevFiltersKey !== filtersKey) {
    setPrevFiltersKey(filtersKey);
    setCursor(undefined);
  }

  const {
    columns,
    filters: filterState,
    actions,
    strategy,
  } = useDataTableFilters({
    columnsConfig,
    data: [] as TItem[],
    filters: effectiveFilters,
    onFiltersChange: updateFilters,
    options: filterOptions as any,
    strategy: "server",
  });

  const queryResult = useQuery(
    buildQueryOptions({
      cursor,
      filters: effectiveFilters,
      limit: 20,
      search: search || undefined,
    }),
  );

  const items = queryResult.data?.items ?? [];
  const nextCursor = queryResult.data?.nextCursor;

  const table = useReactTable({
    columns: columnDefs,
    data: items,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row as TItem),
  });

  return (
    <NavLayout
      baseUrl={baseUrl}
      label={label}
      leftItems={<FilterViewTabs domain={domain} />}
      rightItems={rightItems}
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2">
          <div className="relative flex-1">
            <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
            <Input
              className="pl-8"
              onChange={(e) => {
                setSearch(e.target.value);
                setCursor(undefined);
              }}
              placeholder={searchPlaceholder}
              value={search}
            />
          </div>
          <DataTableFilter
            actions={actions}
            columns={columns}
            filters={filterState}
            locale="en"
            strategy={strategy}
          />
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext(),
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {queryResult.isLoading ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={columnDefs.length}
                  >
                    Loading...
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="text-center text-muted-foreground"
                    colSpan={columnDefs.length}
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    className="cursor-pointer"
                    key={row.id}
                    onClick={() => onRowClick?.(row.original as TItem)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext(),
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {nextCursor && (
          <div className="flex justify-center">
            <Button
              onClick={() => setCursor(nextCursor)}
              size="sm"
              variant="outline"
            >
              Load more
            </Button>
          </div>
        )}
      </div>
    </NavLayout>
  );
}
