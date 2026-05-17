import { desc, eq } from "drizzle-orm";

import { clientEvents } from "@/db-schemas";
import { db } from "@/lib/db/server";

export async function recordClientEvent(
  clientId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
) {
  await db.insert(clientEvents).values({
    changedBy,
    clientId,
    field,
    newValue,
    oldValue,
  });
}

export async function listClientEvents(
  clientId: number,
  _cursor?: string,
  limit = 50,
) {
  const rows = await db
    .select()
    .from(clientEvents)
    .where(eq(clientEvents.clientId, clientId))
    .orderBy(desc(clientEvents.changedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor:
      hasMore && items.length > 0 ? String(items[items.length - 1].id) : null,
  };
}
