import {
  boolean,
  index,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const notificationTypeEnum = pgEnum("notification_type", [
  "task_assigned",
  "task_status_changed",
  "task_deadline_approaching",
  "reminder_triggered",
  "mandate_assigned",
  "mandate_completed",
  "mandate_stage_changed",
  "prospect_stage_changed",
  "prospect_hired",
  "client_created",
  "contract_created",
  "contract_assigned",
  "system",
]);

export const notifications = pgTable(
  "notifications",
  {
    archived: boolean("archived").notNull().default(false),
    body: text(),
    createdAt: timestamp("created_at").defaultNow(),
    entityId: text("entity_id"),
    entityType: text("entity_type"),
    id: serial().primaryKey(),
    readAt: timestamp("read_at", { withTimezone: true }),
    title: text().notNull(),
    type: notificationTypeEnum("type").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("notifications_user_id_idx").on(table.userId),
    index("notifications_read_at_idx").on(table.readAt),
    index("notifications_entity_idx").on(table.entityType, table.entityId),
  ],
);
