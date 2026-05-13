import { protectedProcedure } from "@/rpc/middleware";
import {
  addLinkSchema,
  archiveTaskSchema,
  createTaskSchema,
  getTaskByIdSchema,
  listEventsSchema,
  listTasksSchema,
  removeLinkSchema,
  taskStatsSchema,
  updateTaskSchema,
} from "@/rpc/schema/task";
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
