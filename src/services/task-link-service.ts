import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { taskLinks } from "@/db-schemas";
import { db } from "@/lib/db/server";

export async function addLink(
  taskId: number,
  entityType: string,
  entityId: string,
) {
  const existing = await db
    .select()
    .from(taskLinks)
    .where(
      and(
        eq(taskLinks.taskId, taskId),
        eq(taskLinks.entityType, entityType),
        eq(taskLinks.entityId, entityId),
      ),
    );

  if (existing.length > 0) {
    throw new ORPCError("CONFLICT", {
      message: "This link already exists",
    });
  }

  const [link] = await db
    .insert(taskLinks)
    .values({ entityId, entityType, taskId })
    .returning();

  return link;
}

export async function removeLink(linkId: number) {
  await db.delete(taskLinks).where(eq(taskLinks.id, linkId));
}
