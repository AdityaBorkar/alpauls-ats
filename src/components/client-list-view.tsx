import { useQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Archive, Search } from "lucide-react";
import { parseAsJson, useQueryState } from "nuqs";
import { useState } from "react";
import { z } from "zod";

import { DataTableFilter } from "@/components/data-table-filter";
import type { FiltersState } from "@/components/data-table-filter/core/types";
import { useDataTableFilters } from "@/components/data-table-filter/hooks/use-data-table-filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rpc } from "@/rpc/client";

import { clientColumnDefs } from "./client-list-view/columns";
import { clientColumnsConfig } from "./client-list-view/filters";

export type ClientItem = {
  id: string;
  name: string;
  legalName: string | null;
  slug: string;
  logo: string | null;
  archived: boolean;
  assigneeId: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date | null;
  updatedAt: Date | null;
};

type ClientListResponse = {
  items: ClientItem[];
  nextCursor: string | null;
};

type ClientListViewProps = {
  onItemClick: (client: ClientItem) => void;
};

const filtersSchema = z.custom<FiltersState>();

function filtersToRpcParams(filters: FiltersState) {
  let search: string | undefined;
  let archived: boolean | undefined;
  let assigneeId: string[] | undefined;

  for (const f of filters) {
    if (f.columnId === "name" && f.type === "text") {
      search = f.values[0];
    }
    if (f.columnId === "archived" && f.type === "option") {
      archived = f.values[0] === "true";
    }
    if (f.columnId === "assigneeId" && f.type === "option") {
      assigneeId = [...f.values];
    }
  }

  return { archived, assigneeId, search };
}

function getSearchValue(filters: FiltersState): string {
  for (const f of filters) {
    if (f.columnId === "name" && f.type === "text") return f.values[0] ?? "";
  }
  return "";
}

function setSearchFilter(filters: FiltersState, value: string): FiltersState {
  const rest = filters.filter((f) => f.columnId !== "name");
  if (!value) return rest;
  return [
    ...rest,
    {
      columnId: "name",
      operator: "contains",
      type: "text" as const,
      values: [value],
    },
  ];
}

export function ClientListView({
  onItemClick: onClientClick,
}: ClientListViewProps) {
  const [filters, setFilters] = useQueryState<FiltersState>(
    "filters",
    parseAsJson(filtersSchema.parse).withDefault([]),
  );

  const [cursor, setCursor] = useState<string | undefined>();

  const rpcParams = filtersToRpcParams(filters);

  const { data: clientsData, isLoading } = useQuery(
    rpc.client.list.queryOptions({
      input: {
        archived: rpcParams.archived,
        assigneeId: rpcParams.assigneeId,
        cursor,
        limit: 20,
        search: rpcParams.search,
      },
    }) as any,
  );

  const { data: usersData } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100 } }) as any,
  );

  const clients = (clientsData as ClientListResponse | undefined)?.items ?? [];
  const nextCursor = (clientsData as ClientListResponse | undefined)
    ?.nextCursor;

  const assigneeOptions = ((usersData as any)?.items ?? []).map((u: any) => ({
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
    data: clients,
    filters,
    onFiltersChange: (next) => {
      setFilters(next);
      setCursor(undefined);
    },
    options: {
      archived: archivedOptions,
      assigneeId: assigneeOptions,
    },
    strategy: "server",
  });

  const table = useReactTable({
    columns: clientColumnDefs,
    data: clients,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => String(row.id),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => {
              setFilters(setSearchFilter(filters, e.target.value));
              setCursor(undefined);
            }}
            placeholder="Search clients..."
            value={getSearchValue(filters)}
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
            {isLoading ? (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={clientColumnDefs.length}
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={clientColumnDefs.length}
                >
                  No clients found
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  className="cursor-pointer"
                  key={row.id}
                  onClick={() => onClientClick(row.original)}
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
  );
}
