import { Archive, Search } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";

import type { ProspectItem, ProspectListResponse } from "./prospect.types";

type ProspectListViewProps = {
  onProspectClick: (prospect: ProspectItem) => void;
  refreshKey: number;
};

export function ProspectListView({
  onProspectClick,
  refreshKey,
}: ProspectListViewProps) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const archivedId = useId();

  const { data, isLoading } = useORPCQuery(
    () =>
      client.prospect.list({
        archived: showArchived ? undefined : false,
        cursor,
        limit: 20,
        search: search || undefined,
      }),
    [refreshKey, cursor, search, showArchived],
  );

  const prospects = (data as ProspectListResponse | undefined)?.items ?? [];
  const nextCursor = (data as ProspectListResponse | undefined)?.nextCursor;

  function formatDate(date: Date | null): string {
    if (!date) return "—";
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            placeholder="Search prospects..."
            value={search}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showArchived}
            id={archivedId}
            onCheckedChange={(v: boolean) => {
              setShowArchived(!!v);
              setCursor(undefined);
            }}
          />
          <label className="text-muted-foreground text-sm" htmlFor={archivedId}>
            Show archived
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={5}
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && prospects.length === 0 && (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={5}
                >
                  No prospects found
                </TableCell>
              </TableRow>
            )}
            {prospects.map((prospect) => (
              <TableRow
                className="cursor-pointer"
                key={prospect.id}
                onClick={() => onProspectClick(prospect)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {prospect.name}
                    {prospect.archived && (
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{prospect.phone}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{prospect.email ?? "—"}</span>
                </TableCell>
                <TableCell>
                  {prospect.description ? (
                    <span className="line-clamp-1 max-w-[200px] text-sm">
                      {prospect.description}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-sm">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-sm">
                    {formatDate(prospect.createdAt)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
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
