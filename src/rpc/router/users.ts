import { and, asc, eq, ilike, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { user } from "@/db-schemas";
import { db } from "@/lib/db/server";
import { protectedProcedure } from "@/rpc/middleware";

const listUsersSchema = z.object({
  cursor: z.string().optional(),
  includeBanned: z.boolean().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  role: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export const usersList = protectedProcedure
  .meta({ permission: { action: "read", resource: "team_members" } })
  .input(listUsersSchema)
  .handler(async ({ input }) => {
    const { cursor, includeBanned = false, limit = 20, role, search } = input;

    const conditions = [];

    if (cursor) {
      conditions.push(sql`${user.id} > ${cursor}`);
    }

    if (!includeBanned) {
      conditions.push(sql`(${user.banned} IS NULL OR ${user.banned} = false)`);
    }

    if (role?.length) {
      conditions.push(inArray(user.role, role));
    }

    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        sql`(${ilike(user.name, pattern)} OR ${ilike(user.email, pattern)})`,
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const supervisor = alias(user, "supervisor");

    const rows = await db
      .select({
        banned: user.banned,
        email: user.email,
        id: user.id,
        image: user.image,
        name: user.name,
        phoneNumber: user.phoneNumber,
        role: user.role,
        supervisorId: user.supervisorId,
        supervisorName: supervisor.name,
      })
      .from(user)
      .leftJoin(supervisor, eq(user.supervisorId, supervisor.id))
      .where(whereClause)
      .orderBy(asc(user.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor =
      hasMore && items.length > 0 ? items[items.length - 1].id : null;

    return { items, nextCursor };
  });
