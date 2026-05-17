import { ORPCError } from "@orpc/server";
import { eq, sql } from "drizzle-orm";

import { user } from "@/db-schemas";
import { db } from "@/lib/db/server";

export type SubordinateCache = Map<string, string[]>;

export async function getSubordinateIds(
  userId: string,
  cache?: SubordinateCache,
): Promise<string[]> {
  const cached = cache?.get(userId);
  if (cached) return cached;

  const result = await db.execute(sql`
    WITH RECURSIVE subordinates AS (
      SELECT id FROM "user" WHERE supervisor_id = ${userId}
      UNION ALL
      SELECT u.id FROM "user" u
      INNER JOIN subordinates s ON u.supervisor_id = s.id
    )
    SELECT id FROM subordinates
  `);

  const ids = result.rows.map(
    (row: Record<string, unknown>) => row.id as string,
  );

  cache?.set(userId, ids);
  return ids;
}

export async function getDirectSubordinateIds(
  userId: string,
): Promise<string[]> {
  const rows = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.supervisorId, userId));

  return rows.map((row) => row.id);
}

export async function validateNoCircularSupervisor(
  userId: string,
  newSupervisorId: string,
  cache?: SubordinateCache,
): Promise<void> {
  if (userId === newSupervisorId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "A user cannot be their own supervisor",
    });
  }

  const subordinateIds = await getSubordinateIds(userId, cache);
  if (subordinateIds.includes(newSupervisorId)) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Circular supervisor chain detected",
    });
  }
}
