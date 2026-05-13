import { z } from "zod";

export const taskStatusSchema = z.enum(["todo", "in_progress", "done"]);

export const createTaskSchema = z.object({
  assigneeId: z.string().min(1),
  deadline: z.string().optional(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  status: taskStatusSchema.optional(),
  title: z.string().min(1),
});

export const updateTaskSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.string().min(1).optional(),
  deadline: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  id: z.number().int().positive(),
  startDate: z.string().nullable().optional(),
  status: taskStatusSchema.optional(),
  title: z.string().min(1).optional(),
});

export const listTasksSchema = z.object({
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

export const getTaskByIdSchema = z.object({
  id: z.number().int().positive(),
});

export const archiveTaskSchema = z.object({
  id: z.number().int().positive(),
});

export const listEventsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  taskId: z.number().int().positive(),
});

export const addLinkSchema = z.object({
  entityId: z.string().min(1),
  entityType: z.string().min(1),
  taskId: z.number().int().positive(),
});

export const removeLinkSchema = z.object({
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

export const taskStatsSchema = z.object({}).optional();

export const listRemindersSchema = z.object({
  standalone: z.boolean().optional(),
  taskId: z.number().int().positive().optional(),
  userId: z.string().optional(),
});
