import type { ColumnDef } from "@tanstack/react-table";
import { Archive } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { ClientItem } from "../client-list-view";

export const clientColumnDefs: ColumnDef<ClientItem>[] = [
  {
    accessorKey: "name",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        {row.original.logo && (
          <img
            alt=""
            className="h-5 w-5 rounded object-contain"
            src={row.original.logo}
          />
        )}
        <span className="font-medium">{row.original.name}</span>
        {row.original.archived && (
          <Archive className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </div>
    ),
    header: "Nick Name",
    id: "name",
  },
  {
    accessorKey: "legalName",
    cell: ({ row }) =>
      row.original.legalName ? (
        <span className="text-sm">{row.original.legalName}</span>
      ) : null,
    header: "Legal Name",
    id: "legalName",
  },
  {
    accessorKey: "slug",
    cell: ({ row }) => (
      <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
        {row.original.slug}
      </code>
    ),
    header: "Slug",
    id: "slug",
  },
  {
    accessorKey: "assigneeId",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={row.original.assignee.image ?? undefined} />
          <AvatarFallback>
            {row.original.assignee.name?.[0] ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{row.original.assignee.name}</span>
      </div>
    ),
    enableColumnFilter: true,
    header: "Assignee",
    id: "assigneeId",
  },
  {
    accessorKey: "createdAt",
    cell: ({ row }) =>
      row.original.createdAt ? (
        <span className="text-muted-foreground text-sm">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ) : null,
    header: "Created",
    id: "createdAt",
  },
];
