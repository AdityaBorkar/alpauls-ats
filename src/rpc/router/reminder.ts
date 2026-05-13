import { protectedProcedure } from "@/rpc/middleware";
import {
  archiveReminderSchema,
  createReminderSchema,
  listRemindersSchema,
} from "@/rpc/schema/task";
import {
  archiveReminder,
  createReminder,
  listReminders,
} from "@/services/reminder-service";

export const reminderCreate = protectedProcedure
  .input(createReminderSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id;
    const reminder = await createReminder({
      ...input,
      userId,
    });
    return reminder;
  });

export const reminderArchive = protectedProcedure
  .input(archiveReminderSchema)
  .handler(async ({ input }) => {
    await archiveReminder(input.id);
    return { success: true };
  });

export const reminderList = protectedProcedure
  .input(listRemindersSchema)
  .handler(async ({ input }) => {
    const reminders = await listReminders({
      standalone: input.standalone,
      taskId: input.taskId,
      userId: input.userId,
    });
    return reminders;
  });
