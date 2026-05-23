import type { UseQueryOptions } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search } from "lucide-react";
import { useRef, useState } from "react";

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

export function DataViewLayout<TItem, TInput extends Record<string, unknown>>({
  baseInput,
  columnDefs,
  emptyMessage = "No items found",
  filterSlot,
  getRowId,
  listProcedure,
  onRowClick,
  searchPlaceholder = "Search...",
}: {
  baseInput: Omit<TInput, "cursor" | "limit" | "search">;
  columnDefs: ColumnDef<TItem>[];
  emptyMessage?: string;
  filterSlot?: React.ReactNode;
  getRowId: (row: TItem) => string;
  listProcedure: {
    queryOptions: (opts: { input: TInput }) => UseQueryOptions;
  };
  onRowClick?: (row: TItem) => void;
  searchPlaceholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState<string | undefined>();

  const prevBaseInput = useRef(baseInput);
  if (prevBaseInput.current !== baseInput) {
    setCursor(undefined);
    prevBaseInput.current = baseInput;
  }

  const queryResult = useQuery(
    listProcedure.queryOptions({
      input: {
        ...baseInput,
        cursor,
        limit: 20,
        search: search || undefined,
      } as unknown as TInput,
    }) as UseQueryOptions<{
      items: TItem[];
      nextCursor?: string;
    }>,
  );

  const data = queryResult.data;
  const isLoading = queryResult.isLoading;

  const items = data?.items ?? [];
  const nextCursor = data?.nextCursor;

  const table = useReactTable({
    columns: columnDefs,
    data: items,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => getRowId(row as TItem),
  });

  return (
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
        {filterSlot}
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
  );
}
