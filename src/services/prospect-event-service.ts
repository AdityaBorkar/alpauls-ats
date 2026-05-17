import { desc, eq } from "drizzle-orm";

import { prospectEvents } from "@/db-schemas";
import { db } from "@/lib/db/server";

export async function recordProspectEvent(
  prospectId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
) {
  await db.insert(prospectEvents).values({
    changedBy,
    field,
    newValue,
    oldValue,
    prospectId,
  });
}

export async function listProspectEvents(
  prospectId: number,
  _cursor?: string,
  limit = 50,
) {
  const rows = await db
    .select()
    .from(prospectEvents)
    .where(eq(prospectEvents.prospectId, prospectId))
    .orderBy(desc(prospectEvents.changedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor:
      hasMore && items.length > 0 ? String(items[items.length - 1].id) : null,
  };
}
