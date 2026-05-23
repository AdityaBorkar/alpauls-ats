import { desc, eq } from "drizzle-orm";

import { taskEvents, tasks, user } from "@/db-schemas";
import { db } from "@/lib/db/server";
import { createNotification } from "@/services/notification-service";

export async function recordEvent(
  taskId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
) {
  await db.insert(taskEvents).values({
    changedBy,
    field,
    newValue,
    oldValue,
    taskId,
  });

  if (field === "status" && newValue) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (task && task.assigneeId !== changedBy) {
      await createNotification({
        body: `Status changed from "${oldValue ?? "none"}" to "${newValue}"`,
        entityId: String(taskId),
        entityType: "task",
        title: `Task "${task.title}" status updated`,
        type: "task_status_changed",
        userId: task.assigneeId,
      });
    }
  }

  if (field === "assigneeId" && newValue) {
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));

    if (task) {
      await createNotification({
        body: `You have been assigned "${task.title}"`,
        entityId: String(taskId),
        entityType: "task",
        title: "Task assigned to you",
        type: "task_assigned",
        userId: newValue,
      });
    }
  }
}

export async function listEvents(taskId: number, _cursor?: string, limit = 50) {
  const rows = await db
    .select({
      changedAt: taskEvents.changedAt,
      changedBy: taskEvents.changedBy,
      changedByEmail: user.email,
      changedByImage: user.image,
      changedByName: user.name,
      changedByPhone: user.phoneNumber,
      field: taskEvents.field,
      id: taskEvents.id,
      newValue: taskEvents.newValue,
      oldValue: taskEvents.oldValue,
      taskId: taskEvents.taskId,
    })
    .from(taskEvents)
    .leftJoin(user, eq(taskEvents.changedBy, user.id))
    .where(eq(taskEvents.taskId, taskId))
    .orderBy(desc(taskEvents.changedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor:
      hasMore && items.length > 0 ? String(items[items.length - 1].id) : null,
  };
}
