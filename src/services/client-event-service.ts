import { desc, eq } from "drizzle-orm";

import { clientEvents, user } from "@/db-schemas";
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
    .select({
      changedAt: clientEvents.changedAt,
      changedBy: clientEvents.changedBy,
      changedByEmail: user.email,
      changedByImage: user.image,
      changedByName: user.name,
      changedByPhone: user.phoneNumber,
      clientId: clientEvents.clientId,
      field: clientEvents.field,
      id: clientEvents.id,
      newValue: clientEvents.newValue,
      oldValue: clientEvents.oldValue,
    })
    .from(clientEvents)
    .leftJoin(user, eq(clientEvents.changedBy, user.id))
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
