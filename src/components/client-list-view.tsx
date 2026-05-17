import { Archive, Search } from "lucide-react";
import { useId, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

export type ClientItem = {
  id: number;
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
  onClientClick: (client: ClientItem) => void;
  refreshKey: number;
};

export function ClientListView({
  onClientClick,
  refreshKey,
}: ClientListViewProps) {
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();
  const archivedId = useId();

  const { data, isLoading } = useORPCQuery(
    () =>
      client.client.list({
        archived: showArchived ? undefined : false,
        cursor,
        limit: 20,
        search: search || undefined,
      }),
    [refreshKey, cursor, search, showArchived],
  );

  const clients = (data as ClientListResponse | undefined)?.items ?? [];
  const nextCursor = (data as ClientListResponse | undefined)?.nextCursor;

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
            placeholder="Search clients..."
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
              <TableHead>Nick Name</TableHead>
              <TableHead>Legal Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Assignee</TableHead>
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
            {!isLoading && clients.length === 0 && (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={5}
                >
                  No clients found
                </TableCell>
              </TableRow>
            )}
            {clients.map((c) => (
              <TableRow
                className="cursor-pointer"
                key={c.id}
                onClick={() => onClientClick(c)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {c.logo && (
                      <img
                        alt=""
                        className="h-5 w-5 rounded object-contain"
                        src={c.logo}
                      />
                    )}
                    {c.name}
                    {c.archived && (
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {c.legalName && (
                    <span className="text-sm">{c.legalName}</span>
                  )}
                </TableCell>
                <TableCell>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {c.slug}
                  </code>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={c.assignee.image ?? undefined} />
                      <AvatarFallback>
                        {c.assignee.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{c.assignee.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {c.createdAt && (
                    <span className="text-muted-foreground text-sm">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  )}
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
