import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  Building2,
  Calendar,
  Fingerprint,
  UserCheck,
} from "lucide-react";

import { createColumnConfigHelper } from "@/components/data-table-filter/core/filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { client } from "@/rpc/client";

type ClientListOutput = Awaited<ReturnType<typeof client.client.list>>;
export type ClientItem = ClientListOutput["items"][number];

const dtf = createColumnConfigHelper<ClientItem>();

export const clientColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row) => row.name)
    .displayName("Name")
    .icon(Building2)
    .build(),
  dtf
    .text()
    .id("legalName")
    .accessor((row) => row.legalName ?? "")
    .displayName("Legal Name")
    .icon(Building2)
    .build(),
  dtf
    .text()
    .id("slug")
    .accessor((row) => row.slug)
    .displayName("Slug")
    .icon(Fingerprint)
    .build(),
  dtf
    .option()
    .id("assigneeId")
    .accessor((row) => row.assigneeId)
    .displayName("Assignee")
    .icon(UserCheck)
    .build(),
  dtf
    .option()
    .id("archived")
    .accessor((row) => String(row.archived))
    .displayName("Archived")
    .icon(Archive)
    .build(),
  dtf
    .date()
    .id("createdAt")
    .accessor((row) => (row.createdAt ? new Date(row.createdAt) : new Date()))
    .displayName("Created")
    .icon(Calendar)
    .build(),
] as const;

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
