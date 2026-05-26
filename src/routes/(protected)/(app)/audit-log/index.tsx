import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";

import type { FiltersState } from "@/components/data-table-filter/core/types";
import { DataViewLayout } from "@/components/layouts/data-view-layout";
import {
  type AuditLogItem,
  auditLogColumnDefs,
  auditLogColumnsConfig,
  entityTypeOptions,
} from "@/routes/(protected)/(app)/audit-log/-view-config";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/audit-log/")({
  component: AuditLogPage,
});

function filtersToInput(filters: FiltersState) {
  let entityType: "client" | "contract" | "prospect" | "task" | undefined;
  let dateFrom: Date | undefined;
  let dateTo: Date | undefined;

  for (const f of filters) {
    if (f.columnId === "entityType" && f.type === "option") {
      const val = f.values[0];
      if (
        val === "client" ||
        val === "contract" ||
        val === "prospect" ||
        val === "task"
      ) {
        entityType = val;
      }
    }
    if (f.columnId === "changedAt" && f.type === "date") {
      if (f.operator === "is on or after" && f.values[0])
        dateFrom = new Date(f.values[0]);
      if (f.operator === "is on or before" && f.values[0])
        dateTo = new Date(f.values[0]);
    }
  }

  return { dateFrom, dateTo, entityType };
}

function AuditLogPage() {
  const navigate = useNavigate();

  const filterOptions = useMemo(
    () => ({
      entityType: entityTypeOptions,
    }),
    [],
  );

  return (
    <DataViewLayout<AuditLogItem>
      baseUrl="/audit-log"
      buildQueryOptions={({ filters, cursor, limit, search }) =>
        rpc.auditLog.list.queryOptions({
          input: {
            ...filtersToInput(filters),
            cursor,
            limit,
            search,
          },
        })
      }
      columnDefs={auditLogColumnDefs}
      columnsConfig={auditLogColumnsConfig}
      domain="audit_log"
      emptyMessage="No audit logs found"
      filterOptions={filterOptions}
      getRowId={(row) => `${row.entityType}-${row.id}`}
      label="Audit Log"
      onRowClick={(row) => {
        switch (row.entityType) {
          case "task":
            navigate({ to: "/tasks" });
            break;
          case "client":
            navigate({
              params: { clientId: row.entityId },
              to: "/clients/$clientId",
            });
            break;
          case "contract":
            navigate({
              params: { contractId: row.entityId },
              to: "/contracts/$contractId",
            });
            break;
          case "prospect":
            navigate({ to: "/prospects" });
            break;
        }
      }}
      searchPlaceholder="Search by user or field..."
    />
  );
}
