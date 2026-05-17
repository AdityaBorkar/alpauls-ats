import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";

import { prospects } from "@/db-schemas";
import { db } from "@/lib/db/server";

import { recordProspectEvent } from "./prospect-event-service";

export type CreateProspectInput = {
  name: string;
  phone: string;
  email?: string;
  description?: string;
  createdBy: string;
};

export type UpdateProspectInput = {
  name?: string;
  phone?: string;
  email?: string | null;
  description?: string | null;
  archived?: boolean;
};

export type ListProspectsInput = {
  filters?: {
    archived?: boolean;
    search?: string;
  };
  cursor?: string;
  limit?: number;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export async function createProspect(input: CreateProspectInput) {
  const [prospect] = await db
    .insert(prospects)
    .values({
      description: input.description ?? null,
      email: input.email ?? null,
      name: input.name,
      phone: input.phone,
    })
    .returning();

  await recordProspectEvent(
    prospect.id,
    "name",
    null,
    input.name,
    input.createdBy,
  );

  await recordProspectEvent(
    prospect.id,
    "phone",
    null,
    input.phone,
    input.createdBy,
  );

  if (input.email) {
    await recordProspectEvent(
      prospect.id,
      "email",
      null,
      input.email,
      input.createdBy,
    );
  }

  return getProspect(prospect.id);
}

export async function updateProspect(
  id: number,
  input: UpdateProspectInput,
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, id));
  if (!existing) throw new Error("Prospect not found");

  const updatableFields = [
    "name",
    "phone",
    "email",
    "description",
    "archived",
  ] as const;

  const columnMap: Record<string, string> = {
    archived: "archived",
    description: "description",
    email: "email",
    name: "name",
    phone: "phone",
  };

  const updateData: Record<string, string | boolean | Date | null> = {};

  for (const field of updatableFields) {
    if (input[field] !== undefined) {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = input[field];

      const oldStr = oldVal === null ? null : String(oldVal);
      const newStr = newVal === null ? null : String(newVal);

      if (oldStr !== newStr) {
        updateData[field] = newVal;
        await recordProspectEvent(id, columnMap[field], oldStr, newStr, userId);
      }
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(prospects).set(updateData).where(eq(prospects.id, id));
  }

  return getProspect(id);
}

export async function archiveProspect(id: number, userId: string) {
  return updateProspect(id, { archived: true }, userId);
}

export async function getProspect(id: number) {
  const [prospect] = await db
    .select()
    .from(prospects)
    .where(eq(prospects.id, id));

  return prospect ?? null;
}

export async function listProspects(input: ListProspectsInput = {}) {
  const {
    filters = {},
    limit = 20,
    sortBy = "name",
    sortOrder = "asc",
  } = input;

  const conditions: SQL[] = [];

  const { cursor } = input;
  const cursorId = cursor ? Number.parseInt(cursor, 10) : null;

  if (cursorId !== null && !Number.isNaN(cursorId)) {
    if (sortOrder === "asc") {
      conditions.push(sql`${prospects.id} > ${cursorId}`);
    } else {
      conditions.push(sql`${prospects.id} < ${cursorId}`);
    }
  }

  if (filters.archived !== undefined) {
    conditions.push(eq(prospects.archived, filters.archived));
  } else {
    conditions.push(eq(prospects.archived, false));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    const searchCondition = or(
      ilike(prospects.name, pattern),
      ilike(prospects.phone, pattern),
      ilike(prospects.email, pattern),
    );
    if (searchCondition) {
      conditions.push(searchCondition);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = sortBy === "name" ? prospects.name : prospects.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const rows = await db
    .select()
    .from(prospects)
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const nextCursor =
    hasMore && items.length > 0 ? String(items[items.length - 1].id) : null;

  return { items, nextCursor };
}
