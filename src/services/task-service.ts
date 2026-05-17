import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, gte, ilike, inArray, lte, sql } from "drizzle-orm";

import { reminders, taskLinks, tasks, user } from "@/db-schemas";
import { db } from "@/lib/db/server";

import { recomputeRelativeReminders } from "./reminder-service";
import { recordEvent } from "./task-event-service";

export type TaskStatus = "todo" | "in_progress" | "done";

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  assigneeId: string;
  createdBy: string;
  startDate?: string;
  deadline?: string;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  assigneeId?: string;
  startDate?: string | null;
  deadline?: string | null;
  archived?: boolean;
};

export type ListTasksFilters = {
  status?: TaskStatus[];
  assigneeId?: string[];
  search?: string;
  deadlineFrom?: string;
  deadlineTo?: string;
  entityType?: string;
  entityId?: string;
  archived?: boolean;
};

export type ListTasksInput = {
  filters?: ListTasksFilters;
  cursor?: string;
  limit?: number;
  sortBy?: "deadline" | "title" | "status" | "createdAt";
  sortOrder?: "asc" | "desc";
};

export async function createTask(input: CreateTaskInput) {
  const [task] = await db
    .insert(tasks)
    .values({
      assigneeId: input.assigneeId,
      createdBy: input.createdBy,
      deadline: input.deadline ?? null,
      description: input.description ?? null,
      startDate: input.startDate ?? null,
      status: input.status ?? "todo",
      title: input.title,
    })
    .returning();

  return getTask(task.id);
}

export async function updateTask(
  id: number,
  input: UpdateTaskInput,
  userId: string,
) {
  const [existing] = await db.select().from(tasks).where(eq(tasks.id, id));
  if (!existing) throw new Error("Task not found");

  const updatableFields = [
    "title",
    "description",
    "status",
    "assigneeId",
    "startDate",
    "deadline",
    "archived",
  ] as const;

  const columnMap: Record<string, string> = {
    archived: "archived",
    assigneeId: "assignee_id",
    deadline: "deadline",
    description: "description",
    startDate: "start_date",
    status: "status",
    title: "title",
  };

  let deadlineChanged = false;
  const updateData: Record<string, any> = {};

  for (const field of updatableFields) {
    if (input[field] !== undefined) {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = input[field];

      const oldStr = oldVal === null ? null : String(oldVal);
      const newStr = newVal === null ? null : String(newVal);

      if (oldStr !== newStr) {
        updateData[field] = newVal;
        await recordEvent(id, columnMap[field], oldStr, newStr, userId);

        if (field === "deadline") {
          deadlineChanged = true;
        }
      }
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(tasks).set(updateData).where(eq(tasks.id, id));
  }

  if (deadlineChanged) {
    await recomputeRelativeReminders(id);
  }

  return getTask(id);
}

export async function archiveTask(id: number, userId: string) {
  return updateTask(id, { archived: true }, userId);
}

export async function getTask(id: number) {
  const [task] = await db
    .select({
      archived: tasks.archived,
      assigneeId: tasks.assigneeId,
      assigneeImage: user.image,
      assigneeName: user.name,
      createdAt: tasks.createdAt,
      deadline: tasks.deadline,
      description: tasks.description,
      id: tasks.id,
      startDate: tasks.startDate,
      status: tasks.status,
      title: tasks.title,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(user, eq(tasks.assigneeId, user.id))
    .where(eq(tasks.id, id));

  if (!task) return null;

  const links = await db
    .select()
    .from(taskLinks)
    .where(eq(taskLinks.taskId, id));

  const taskReminders = await db
    .select()
    .from(reminders)
    .where(eq(reminders.taskId, id));

  return {
    ...task,
    assignee: {
      id: task.assigneeId,
      image: task.assigneeImage,
      name: task.assigneeName,
    },
    links,
    reminders: taskReminders,
  };
}

export async function listTasks(input: ListTasksInput = {}) {
  const {
    filters = {},
    limit = 20,
    sortBy = "deadline",
    sortOrder = "asc",
  } = input;

  const conditions: SQL[] = [];

  const { cursor } = input;
  const cursorId = cursor ? Number.parseInt(cursor, 10) : null;

  if (cursorId !== null && !Number.isNaN(cursorId)) {
    if (sortOrder === "asc") {
      conditions.push(sql`${tasks.id} > ${cursorId}`);
    } else {
      conditions.push(sql`${tasks.id} < ${cursorId}`);
    }
  }

  if (filters.archived !== undefined) {
    conditions.push(eq(tasks.archived, filters.archived));
  } else {
    conditions.push(eq(tasks.archived, false));
  }

  if (filters.status?.length) {
    conditions.push(inArray(tasks.status, filters.status));
  }

  if (filters.assigneeId?.length) {
    conditions.push(inArray(tasks.assigneeId, filters.assigneeId));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      sql`(${ilike(tasks.title, pattern)} OR ${ilike(tasks.description, pattern)})`,
    );
  }

  if (filters.deadlineFrom) {
    conditions.push(sql`${tasks.deadline} >= ${filters.deadlineFrom}`);
  }
  if (filters.deadlineTo) {
    conditions.push(sql`${tasks.deadline} <= ${filters.deadlineTo}`);
  }

  if (filters.entityType && filters.entityId) {
    const linkedTaskIds = db
      .select({ taskId: taskLinks.taskId })
      .from(taskLinks)
      .where(
        and(
          eq(taskLinks.entityType, filters.entityType),
          eq(taskLinks.entityId, filters.entityId),
        ),
      );
    conditions.push(inArray(tasks.id, linkedTaskIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    sortBy === "deadline"
      ? tasks.deadline
      : sortBy === "title"
        ? tasks.title
        : sortBy === "status"
          ? tasks.status
          : tasks.createdAt;

  const orderFn = sortOrder === "asc" ? asc : desc;

  if (sortBy === "deadline" && sortOrder === "asc") {
    const rows = await db
      .select({
        archived: tasks.archived,
        assigneeId: tasks.assigneeId,
        assigneeImage: user.image,
        assigneeName: user.name,
        createdAt: tasks.createdAt,
        deadline: tasks.deadline,
        description: tasks.description,
        id: tasks.id,
        startDate: tasks.startDate,
        status: tasks.status,
        title: tasks.title,
        updatedAt: tasks.updatedAt,
      })
      .from(tasks)
      .leftJoin(user, eq(tasks.assigneeId, user.id))
      .where(whereClause)
      .orderBy(
        sql`CASE WHEN ${tasks.deadline} IS NULL THEN 1 ELSE 0 END`,
        asc(tasks.deadline),
      )
      .limit(limit + 1);
    return buildListResponse(rows, limit);
  }

  const rows = await db
    .select({
      archived: tasks.archived,
      assigneeId: tasks.assigneeId,
      assigneeImage: user.image,
      assigneeName: user.name,
      createdAt: tasks.createdAt,
      deadline: tasks.deadline,
      description: tasks.description,
      id: tasks.id,
      startDate: tasks.startDate,
      status: tasks.status,
      title: tasks.title,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(user, eq(tasks.assigneeId, user.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit + 1);

  return buildListResponse(rows, limit);
}

async function buildListResponse(rows: any[], limit: number) {
  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const allTaskIds = items.map((r) => r.id);

  const allLinks =
    allTaskIds.length > 0
      ? await db
          .select()
          .from(taskLinks)
          .where(inArray(taskLinks.taskId, allTaskIds))
      : [];

  const allReminders =
    allTaskIds.length > 0
      ? await db
          .select()
          .from(reminders)
          .where(inArray(reminders.taskId, allTaskIds))
      : [];

  const linksByTask = new Map<number, typeof allLinks>();
  for (const link of allLinks) {
    const arr = linksByTask.get(link.taskId) ?? [];
    arr.push(link);
    linksByTask.set(link.taskId, arr);
  }

  const remindersByTask = new Map<number, typeof allReminders>();
  for (const rem of allReminders) {
    if (rem.taskId === null) continue;
    const arr = remindersByTask.get(rem.taskId) ?? [];
    arr.push(rem);
    remindersByTask.set(rem.taskId, arr);
  }

  const enriched = items.map((row) => ({
    ...row,
    assignee: {
      id: row.assigneeId,
      image: row.assigneeImage,
      name: row.assigneeName,
    },
    links: linksByTask.get(row.id) ?? [],
    reminders: remindersByTask.get(row.id) ?? [],
  }));

  const nextCursor =
    hasMore && enriched.length > 0
      ? String(enriched[enriched.length - 1].id)
      : null;

  return { items: enriched, nextCursor };
}

export type TaskStats = {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
  dueThisWeek: number;
};

export async function getTaskStats(): Promise<TaskStats> {
  const statusCounts = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
      status: tasks.status,
    })
    .from(tasks)
    .where(eq(tasks.archived, false))
    .groupBy(tasks.status);

  const byStatus = Object.fromEntries(
    statusCounts.map((r) => [r.status, r.count]),
  );

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  const dueThisWeekRows = await db
    .select({
      count: sql<number>`cast(count(*) as int)`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.archived, false),
        gte(tasks.deadline, fmt(weekStart)),
        lte(tasks.deadline, fmt(weekEnd)),
      ),
    );

  return {
    done: byStatus.done ?? 0,
    dueThisWeek: dueThisWeekRows[0]?.count ?? 0,
    inProgress: byStatus.in_progress ?? 0,
    todo: byStatus.todo ?? 0,
    total:
      (byStatus.todo ?? 0) + (byStatus.in_progress ?? 0) + (byStatus.done ?? 0),
  };
}
