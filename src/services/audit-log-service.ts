import { and, desc, eq, gte, ilike, lt, lte, or, sql } from "drizzle-orm";

import { user } from "@/db-schemas/auth";
import { clientEvents } from "@/db-schemas/client";
import { contractEvents } from "@/db-schemas/client-contract";
import { prospectEvents } from "@/db-schemas/prospect";
import { taskEvents } from "@/db-schemas/task";
import { db } from "@/lib/db/server";

export type AuditLogEntry = {
  changedAt: Date | null;
  changedBy: string | null;
  changedByEmail: string | null;
  changedByImage: string | null;
  changedByName: string | null;
  changedByPhone: string | null;
  entityId: string;
  entityType: "client" | "contract" | "prospect" | "task";
  field: string;
  id: number;
  newValue: string | null;
  oldValue: string | null;
};

type ListAuditLogsInput = {
  changedBy?: string;
  cursor?: string;
  dateFrom?: Date;
  dateTo?: Date;
  entityType?: "client" | "contract" | "prospect" | "task";
  field?: string;
  limit?: number;
  search?: string;
};

type EventTable =
  | typeof taskEvents
  | typeof clientEvents
  | typeof prospectEvents
  | typeof contractEvents;

function buildWhereClause(
  table: EventTable,
  input: ListAuditLogsInput,
  entityType: string,
  cursor?: string,
) {
  const conditions = [];

  if (input.changedBy) {
    conditions.push(eq(table.changedBy, input.changedBy));
  }
  if (input.field) {
    conditions.push(eq(table.field, input.field));
  }
  if (input.dateFrom) {
    conditions.push(gte(table.changedAt, input.dateFrom));
  }
  if (input.dateTo) {
    conditions.push(lte(table.changedAt, input.dateTo));
  }
  if (input.search) {
    const searchFilter = or(
      ilike(user.name, `%${input.search}%`),
      ilike(table.field, `%${input.search}%`),
    );
    if (searchFilter) conditions.push(searchFilter);
  }

  if (cursor) {
    try {
      const [timestampStr, idStr, cursorEntityType] = cursor.split("::");
      const cursorTime = new Date(timestampStr);
      const cursorId = Number.parseInt(idStr, 10);
      if (
        !Number.isNaN(cursorId) &&
        !Number.isNaN(cursorTime.getTime()) &&
        cursorEntityType === entityType
      ) {
        const cursorFilter = or(
          lt(table.changedAt, cursorTime),
          and(eq(table.changedAt, cursorTime), lt(table.id, cursorId)),
        );
        if (cursorFilter) conditions.push(cursorFilter);
      }
    } catch {
      // Invalid cursor format, skip cursor filter
    }
  }

  return conditions.length > 0 ? and(...conditions) : undefined;
}

export async function listAuditLogs(input: ListAuditLogsInput) {
  const { cursor, entityType, limit = 50 } = input;

  const eventTypes = entityType
    ? [entityType]
    : (["task", "client", "prospect", "contract"] as const);

  const allRows: AuditLogEntry[] = [];

  for (const type of eventTypes) {
    const table: EventTable =
      type === "task"
        ? taskEvents
        : type === "client"
          ? clientEvents
          : type === "prospect"
            ? prospectEvents
            : contractEvents;

    const entityIdExpr =
      type === "task"
        ? sql<string>`${taskEvents.taskId}::text`
        : type === "client"
          ? sql<string>`${clientEvents.clientId}::text`
          : type === "prospect"
            ? sql<string>`${prospectEvents.prospectId}::text`
            : sql<string>`${contractEvents.contractId}::text`;

    const whereClause = buildWhereClause(table, input, type, cursor);

    const rows = await db
      .select({
        changedAt: table.changedAt,
        changedBy: table.changedBy,
        changedByEmail: user.email,
        changedByImage: user.image,
        changedByName: user.name,
        changedByPhone: user.phoneNumber,
        entityId: entityIdExpr,
        field: table.field,
        id: table.id,
        newValue: table.newValue,
        oldValue: table.oldValue,
      })
      .from(table)
      .leftJoin(user, eq(table.changedBy, user.id))
      .where(whereClause)
      .orderBy(desc(table.changedAt), desc(table.id))
      .limit(limit + 1);

    for (const row of rows) {
      allRows.push({
        ...row,
        entityType: type,
      });
    }
  }

  allRows.sort((a, b) => {
    const aTime = a.changedAt?.getTime() ?? 0;
    const bTime = b.changedAt?.getTime() ?? 0;
    if (bTime !== aTime) return bTime - aTime;
    return b.id - a.id;
  });

  const sliced = allRows.slice(0, limit + 1);
  const hasMore = sliced.length > limit;
  const items = hasMore ? sliced.slice(0, limit) : sliced;

  const lastItem = items[items.length - 1];
  const nextCursor =
    hasMore && lastItem?.changedAt && lastItem?.id != null
      ? `${new Date(lastItem.changedAt).toISOString()}::${lastItem.id}::${lastItem.entityType}`
      : null;

  return {
    items,
    nextCursor,
  };
}
