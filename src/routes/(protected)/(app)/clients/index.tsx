import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Archive } from "lucide-react";
import { useMemo } from "react";

import type {
  ColumnOption,
  FiltersState,
} from "@/components/data-table-filter/core/types";
import { DataViewLayout } from "@/components/layouts/data-view-layout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  type ClientItem,
  clientColumnDefs,
  clientColumnsConfig,
} from "@/routes/(protected)/(app)/clients/-view-config";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
});

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

  return { archived, assigneeId };
}

function ClientsPage() {
  const navigate = useNavigate();
  const { data } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100 } }),
  );

  const filterOptions = useMemo<Record<string, ColumnOption[] | undefined>>(
    () => ({
      archived: [
        {
          icon: <Archive className="size-4" />,
          label: "Archived",
          value: "true",
        },
        { label: "Active", value: "false" },
      ],
      assigneeId: (data?.items ?? []).map((u) => ({
        icon: (
          <Avatar className="size-4">
            <AvatarImage src={u.image ?? undefined} />
            <AvatarFallback>{u.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
        ),
        label: u.name ?? "Unknown",
        value: u.id,
      })),
    }),
    [data],
  );

  return (
    <DataViewLayout<ClientItem>
      baseUrl="/clients"
      buildQueryOptions={({ filters, cursor, limit, search }) =>
        rpc.client.list.queryOptions({
          input: {
            ...filtersToBaseInput(filters),
            cursor,
            limit,
            search,
          },
        })
      }
      columnDefs={clientColumnDefs}
      columnsConfig={clientColumnsConfig}
      domain="clients"
      filterOptions={filterOptions}
      getRowId={(row) => String(row.id)}
      label="Clients"
      onRowClick={(client) =>
        navigate({
          params: { clientId: String(client.id) },
          to: "/clients/$clientId",
        })
      }
      searchPlaceholder="Search clients..."
    />
  );
}
