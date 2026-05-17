import { z } from "zod";

import { protectedProcedure } from "@/rpc/middleware";
import { listEvents } from "@/services/task-event-service";
import { addLink, removeLink } from "@/services/task-link-service";
import {
  archiveTask as archiveTaskService,
  createTask,
  getTask,
  getTaskStats,
  listTasks,
  updateTask,
} from "@/services/task-service";

const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

const createTaskSchema = z.object({
  assigneeId: z.string().min(1),
  deadline: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  status: taskStatusSchema.optional(),
  title: z.string().min(1),
});

const updateTaskSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.string().min(1).optional(),
  deadline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  id: z.number().int().positive(),
  startDate: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  title: z.string().min(1).optional(),
});

const listTasksSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  deadlineFrom: z.string().optional(),
  deadlineTo: z.string().optional(),
  entityId: z.string().optional(),
  entityType: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["deadline", "title", "status", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  status: z.array(taskStatusSchema).optional(),
});

const getTaskByIdSchema = z.object({
  id: z.number().int().positive(),
});

const archiveTaskSchema = z.object({
  id: z.number().int().positive(),
});

const listEventsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  taskId: z.number().int().positive(),
});

const addLinkSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.string().min(1),
  taskId: z.number().int().positive(),
});

const removeLinkSchema = z.object({
  linkId: z.number().int().positive(),
});

export const createReminderSchema = z.object({
  offsetMinutes: z.number().int().optional(),
  taskId: z.number().int().positive().optional(),
  triggerAt: z.string().min(1),
  userId: z.string().min(1),
});

export const archiveReminderSchema = z.object({
  id: z.number().int().positive(),
});

const taskStatsSchema = z.object({}).optional();

export const listRemindersSchema = z.object({
  standalone: z.boolean().optional(),
  taskId: z.number().int().positive().optional(),
  userId: z.string().optional(),
});

export const taskCreate = protectedProcedure
  .input(createTaskSchema)
  .handler(async ({ input, context }) => {
    const task = await createTask({
      ...input,
      createdBy: context.user.id,
      status: input.status ?? "todo",
    });
    return task;
  });

export const taskUpdate = protectedProcedure
  .input(updateTaskSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input;
    const userId = context.user.id;
    const task = await updateTask(id, updates, userId);
    return task;
  });

export const taskArchive = protectedProcedure
  .input(archiveTaskSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id;
    const task = await archiveTaskService(input.id, userId);
    return task;
  });

export const taskGetById = protectedProcedure
  .input(getTaskByIdSchema)
  .handler(async ({ input }) => {
    const task = await getTask(input.id);
    if (!task) throw new Error("Task not found");
    return task;
  });

export const taskList = protectedProcedure
  .input(listTasksSchema)
  .handler(async ({ input }) => {
    const result = await listTasks({
      cursor: input.cursor,
      filters: {
        archived: input.archived,
        assigneeId: input.assigneeId,
        deadlineFrom: input.deadlineFrom,
        deadlineTo: input.deadlineTo,
        entityId: input.entityId,
        entityType: input.entityType,
        search: input.search,
        status: input.status,
      },
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });
    return result;
  });

export const taskListEvents = protectedProcedure
  .input(listEventsSchema)
  .handler(async ({ input }) => {
    return listEvents(input.taskId, input.cursor, input.limit ?? 50);
  });

export const taskAddLink = protectedProcedure
  .input(addLinkSchema)
  .handler(async ({ input }) => {
    const link = await addLink(input.taskId, input.entityType, input.entityId);
    return link;
  });

export const taskRemoveLink = protectedProcedure
  .input(removeLinkSchema)
  .handler(async ({ input }) => {
    await removeLink(input.linkId);
    return { success: true };
  });

export const taskStats = protectedProcedure
  .input(taskStatsSchema)
  .handler(async () => {
    return getTaskStats();
  });
