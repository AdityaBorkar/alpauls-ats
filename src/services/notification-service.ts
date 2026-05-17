import { and, desc, eq, isNull, sql } from "drizzle-orm";

import { notifications } from "@/db-schemas";
import { db } from "@/lib/db/server";

export type CreateNotificationInput = {
  body?: string;
  entityId?: string;
  entityType?: string;
  title: string;
  type: (typeof notifications.$inferInsert)["type"];
  userId: string;
};

export async function createNotification(input: CreateNotificationInput) {
  const [notification] = await db
    .insert(notifications)
    .values({
      body: input.body ?? null,
      entityId: input.entityId ?? null,
      entityType: input.entityType ?? null,
      title: input.title,
      type: input.type,
      userId: input.userId,
    })
    .returning();

  return notification;
}

export type ListNotificationsFilter = {
  limit?: number;
  unreadOnly?: boolean;
  userId: string;
};

export async function listNotifications(filter: ListNotificationsFilter) {
  const conditions = [eq(notifications.userId, filter.userId)];

  if (filter.unreadOnly) {
    conditions.push(isNull(notifications.readAt));
  }

  const rows = await db
    .select()
    .from(notifications)
    .where(and(...conditions))
    .orderBy(desc(notifications.createdAt))
    .limit(filter.limit ?? 50);

  return rows;
}

export async function getUnreadCount(userId: string) {
  const [result] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));

  return result?.count ?? 0;
}

export async function markRead(id: number, userId: string) {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db
    .update(notifications)
    .set({ readAt: sql`now()` })
    .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
}

export async function archiveNotification(id: number, userId: string) {
  await db
    .update(notifications)
    .set({ archived: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}
