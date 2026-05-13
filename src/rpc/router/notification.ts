import { protectedProcedure } from "@/rpc/middleware";
import {
  listNotificationsSchema,
  markAllNotificationsReadSchema,
  markNotificationReadSchema,
} from "@/rpc/schema/notification";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from "@/services/notification-service";

export const notificationList = protectedProcedure
  .meta({ permission: { action: "read", resource: "notification" } })
  .input(listNotificationsSchema)
  .handler(async ({ input, context }) => {
    const [items, unreadCount] = await Promise.all([
      listNotifications({
        limit: input.limit,
        unreadOnly: input.unreadOnly,
        userId: context.user.id,
      }),
      getUnreadCount(context.user.id),
    ]);

    return { items, unreadCount };
  });

export const notificationMarkRead = protectedProcedure
  .meta({ permission: { action: "update", resource: "notification" } })
  .input(markNotificationReadSchema)
  .handler(async ({ input, context }) => {
    await markRead(input.id, context.user.id);
    return { success: true };
  });

export const notificationMarkAllRead = protectedProcedure
  .meta({ permission: { action: "update", resource: "notification" } })
  .input(markAllNotificationsReadSchema)
  .handler(async ({ context }) => {
    await markAllRead(context.user.id);
    return { success: true };
  });
