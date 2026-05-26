import type { ColumnDef } from "@tanstack/react-table";
import { Calendar, FileText, List, User } from "lucide-react";

import { createColumnConfigHelper } from "@/components/data-table-filter/core/filters";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatRelativeTime } from "@/lib/utils";
import type { client } from "@/rpc/client";

type AuditLogListOutput = Awaited<ReturnType<typeof client.auditLog.list>>;
export type AuditLogItem = AuditLogListOutput["items"][number];

const dtf = createColumnConfigHelper<AuditLogItem>();

export const auditLogColumnsConfig = [
  dtf
    .date()
    .id("changedAt")
    .accessor((row) => (row.changedAt ? new Date(row.changedAt) : new Date()))
    .displayName("Date")
    .icon(Calendar)
    .build(),
  dtf
    .option()
    .id("entityType")
    .accessor((row) => row.entityType)
    .displayName("Entity Type")
    .icon(List)
    .build(),
  dtf
    .text()
    .id("field")
    .accessor((row) => row.field)
    .displayName("Field")
    .icon(FileText)
    .build(),
  dtf
    .text()
    .id("changedByName")
    .accessor((row) => row.changedByName ?? "")
    .displayName("Changed By")
    .icon(User)
    .build(),
] as const;

const entityTypeLabels: Record<string, string> = {
  client: "Client",
  contract: "Contract",
  prospect: "Prospect",
  task: "Task",
};

export const auditLogColumnDefs: ColumnDef<AuditLogItem>[] = [
  {
    accessorKey: "changedAt",
    cell: ({ row }) =>
      row.original.changedAt ? (
        <TooltipProvider delay={200}>
          <Tooltip>
            <TooltipTrigger className="cursor-default text-muted-foreground text-sm">
              {formatRelativeTime(row.original.changedAt)}
            </TooltipTrigger>
            <TooltipContent>
              {new Date(row.original.changedAt).toLocaleString()}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : null,
    header: "Date",
    id: "changedAt",
  },
  {
    accessorKey: "changedByName",
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <Avatar className="h-5 w-5">
          <AvatarImage src={row.original.changedByImage ?? undefined} />
          <AvatarFallback>
            {row.original.changedByName?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm">{row.original.changedByName}</span>
      </div>
    ),
    header: "Changed By",
    id: "changedByName",
  },
  {
    accessorKey: "entityType",
    cell: ({ row }) => (
      <Badge variant="outline">
        {entityTypeLabels[row.original.entityType] ?? row.original.entityType}
      </Badge>
    ),
    header: "Entity Type",
    id: "entityType",
  },
  {
    accessorKey: "entityId",
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground text-xs">
        #{row.original.entityId}
      </span>
    ),
    header: "Entity ID",
    id: "entityId",
  },
  {
    accessorKey: "field",
    cell: ({ row }) => (
      <span className="font-medium text-sm">{row.original.field}</span>
    ),
    header: "Field",
    id: "field",
  },
  {
    accessorKey: "oldValue",
    cell: ({ row }) =>
      row.original.oldValue ? (
        <span className="max-w-40 truncate text-muted-foreground text-sm">
          {row.original.oldValue}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">&mdash;</span>
      ),
    header: "Old Value",
    id: "oldValue",
  },
  {
    accessorKey: "newValue",
    cell: ({ row }) =>
      row.original.newValue ? (
        <span className="max-w-40 truncate text-sm">
          {row.original.newValue}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">&mdash;</span>
      ),
    header: "New Value",
    id: "newValue",
  },
];

export const entityTypeOptions = [
  { label: "Task", value: "task" },
  { label: "Client", value: "client" },
  { label: "Contract", value: "contract" },
  { label: "Prospect", value: "prospect" },
];
