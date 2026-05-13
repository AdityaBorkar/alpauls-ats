import { z } from "zod";

export const listNotificationsSchema = z.object({
  limit: z.number().int().min(1).max(100).optional(),
  unreadOnly: z.boolean().optional(),
});

export const markNotificationReadSchema = z.object({
  id: z.number().int().positive(),
});

export const markAllNotificationsReadSchema = z.object({});
