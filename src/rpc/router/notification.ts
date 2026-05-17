import { z } from "zod";

import { protectedProcedure } from "@/rpc/middleware";
import {
  getUnreadCount,
  listNotifications,
  markAllRead,
  markRead,
} from "@/services/notification-service";

const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  unreadOnly: z.boolean().optional(),
});

const markNotificationReadSchema = z.object({
  id: z.number().int().positive(),
});

const markAllNotificationsReadSchema = z.object({});

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
