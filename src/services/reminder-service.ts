import { ORPCError } from "@orpc/server";
import { and, eq, isNotNull, sql } from "drizzle-orm";

import { db } from "@/lib/db/server";
import { reminders, tasks } from "@/schema";

export type CreateReminderInput = {
  taskId?: number;
  userId: string;
  triggerAt: string;
  offsetMinutes?: number;
};

export async function createReminder(input: CreateReminderInput) {
  if (input.offsetMinutes !== undefined && input.offsetMinutes !== null) {
    if (!input.taskId) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Relative reminders (with offsetMinutes) must be attached to a task",
      });
    }

    const [task] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, input.taskId));

    if (!task) {
      throw new ORPCError("NOT_FOUND", { message: "Task not found" });
    }

    if (!task.deadline) {
      throw new ORPCError("BAD_REQUEST", {
        message:
          "Cannot create a relative reminder on a task without a deadline",
      });
    }

    const deadlineDate = new Date(`${task.deadline}T00:00:00Z`);
    const triggerAt = new Date(
      deadlineDate.getTime() - input.offsetMinutes * 60 * 1000,
    );

    const [reminder] = await db
      .insert(reminders)
      .values({
        offsetMinutes: input.offsetMinutes,
        taskId: input.taskId,
        triggerAt,
        userId: input.userId,
      })
      .returning();

    return reminder;
  }

  const [reminder] = await db
    .insert(reminders)
    .values({
      offsetMinutes: null,
      taskId: input.taskId ?? null,
      triggerAt: new Date(input.triggerAt),
      userId: input.userId,
    })
    .returning();

  return reminder;
}

export async function archiveReminder(id: number) {
  await db
    .update(reminders)
    .set({ archived: true })
    .where(eq(reminders.id, id));
}

export type ListRemindersFilter = {
  taskId?: number;
  userId?: string;
  standalone?: boolean;
};

export async function listReminders(filter: ListRemindersFilter = {}) {
  const conditions = [];

  if (filter.taskId !== undefined) {
    conditions.push(eq(reminders.taskId, filter.taskId));
  }

  if (filter.userId !== undefined) {
    conditions.push(eq(reminders.userId, filter.userId));
  }

  if (filter.standalone) {
    conditions.push(sql`${reminders.taskId} IS NULL`);
  }

  const rows = await db
    .select()
    .from(reminders)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reminders.triggerAt);

  return rows;
}

export async function recomputeRelativeReminders(taskId: number) {
  const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
  if (!task?.deadline) return;

  const deadlineDate = new Date(`${task.deadline}T00:00:00Z`);

  const relativeReminders = await db
    .select()
    .from(reminders)
    .where(
      and(eq(reminders.taskId, taskId), isNotNull(reminders.offsetMinutes)),
    );

  for (const reminder of relativeReminders) {
    const newTriggerAt = new Date(
      deadlineDate.getTime() - (reminder.offsetMinutes ?? 0) * 60 * 1000,
    );
    await db
      .update(reminders)
      .set({ triggerAt: newTriggerAt })
      .where(eq(reminders.id, reminder.id));
  }
}
