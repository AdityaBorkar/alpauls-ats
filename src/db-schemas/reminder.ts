import {
  boolean,
  index,
  integer,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { tasks } from "./task";

export const reminders = pgTable(
  "reminders",
  {
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    id: serial().primaryKey(),
    offsetMinutes: integer("offset_minutes"),
    taskId: integer("task_id").references(() => tasks.id, {
      onDelete: "cascade",
    }),
    triggerAt: timestamp("trigger_at", {
      withTimezone: true,
    }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id),
  },
  (table) => [
    index("reminders_trigger_at_idx").on(table.triggerAt),
    index("reminders_task_id_idx").on(table.taskId),
  ],
);
