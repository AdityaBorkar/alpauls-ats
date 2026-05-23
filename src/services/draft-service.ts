import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, sql } from "drizzle-orm";

import { drafts, user } from "@/db-schemas";
import { db } from "@/lib/db/server";

export type CreateDraftInput = {
  entityType: string;
  data: Record<string, unknown>;
  title: string;
  createdBy: string;
};

export type UpdateDraftInput = {
  data?: Record<string, unknown>;
  title?: string;
};

export type ListDraftsInput = {
  entityType?: string;
  cursor?: string;
  limit?: number;
  sortBy?: "createdAt" | "updatedAt";
  sortOrder?: "asc" | "desc";
};

export async function createDraft(input: CreateDraftInput) {
  const [draft] = await db
    .insert(drafts)
    .values({
      createdBy: input.createdBy,
      data: input.data,
      entityType: input.entityType,
      title: input.title,
    })
    .returning();

  return getDraft(draft.id);
}

export async function updateDraft(id: number, input: UpdateDraftInput) {
  const updateData: Record<string, unknown> = {};
  if (input.data !== undefined) updateData.data = input.data;
  if (input.title !== undefined) updateData.title = input.title;

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(drafts).set(updateData).where(eq(drafts.id, id));
  }

  return getDraft(id);
}

export async function deleteDraft(id: number) {
  await db.delete(drafts).where(eq(drafts.id, id));
}

export async function getDraft(id: number) {
  const [draft] = await db
    .select({
      createdAt: drafts.createdAt,
      createdBy: drafts.createdBy,
      creatorImage: user.image,
      creatorName: user.name,
      data: drafts.data,
      entityType: drafts.entityType,
      id: drafts.id,
      title: drafts.title,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .leftJoin(user, eq(drafts.createdBy, user.id))
    .where(eq(drafts.id, id));

  if (!draft) return null;

  return {
    ...draft,
    creator: {
      id: draft.createdBy,
      image: draft.creatorImage,
      name: draft.creatorName,
    },
  };
}

export async function listDrafts(input: ListDraftsInput = {}) {
  const { limit = 20, sortBy = "createdAt", sortOrder = "desc" } = input;

  const conditions: SQL[] = [];

  const cursorId = input.cursor ? Number.parseInt(input.cursor, 10) : null;
  if (cursorId !== null && !Number.isNaN(cursorId)) {
    if (sortOrder === "asc") {
      conditions.push(sql`${drafts.id} > ${cursorId}`);
    } else {
      conditions.push(sql`${drafts.id} < ${cursorId}`);
    }
  }

  if (input.entityType) {
    conditions.push(eq(drafts.entityType, input.entityType));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    sortBy === "updatedAt" ? drafts.updatedAt : drafts.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const rows = await db
    .select({
      createdAt: drafts.createdAt,
      createdBy: drafts.createdBy,
      creatorImage: user.image,
      creatorName: user.name,
      data: drafts.data,
      entityType: drafts.entityType,
      id: drafts.id,
      title: drafts.title,
      updatedAt: drafts.updatedAt,
    })
    .from(drafts)
    .leftJoin(user, eq(drafts.createdBy, user.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const enriched = items.map((row) => ({
    ...row,
    creator: {
      id: row.createdBy,
      image: row.creatorImage,
      name: row.creatorName,
    },
  }));

  const nextCursor =
    hasMore && enriched.length > 0
      ? String(enriched[enriched.length - 1].id)
      : null;

  return { items: enriched, nextCursor };
}
