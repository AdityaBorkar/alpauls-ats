import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
]);

export const tasks = pgTable(
  "tasks",
  {
    archived: boolean("archived").notNull().default(false),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    deadline: text("deadline"),
    description: text(),
    id: serial().primaryKey(),
    startDate: text("start_date"),
    status: taskStatusEnum("status").notNull().default("todo"),
    title: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("tasks_assignee_id_idx").on(table.assigneeId),
    index("tasks_status_idx").on(table.status),
    index("tasks_deadline_idx").on(table.deadline),
  ],
);

export const taskLinks = pgTable(
  "task_links",
  {
    entityId: text("entity_id").notNull(),
    entityType: text("entity_type").notNull(),
    id: serial().primaryKey(),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (table) => [
    uniqueIndex("task_links_unique_idx").on(
      table.taskId,
      table.entityType,
      table.entityId,
    ),
  ],
);

export const taskEvents = pgTable(
  "task_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    field: text("field").notNull(),
    id: serial().primaryKey(),
    newValue: text("new_value"),
    oldValue: text("old_value"),
    taskId: integer("task_id")
      .notNull()
      .references(() => tasks.id, { onDelete: "cascade" }),
  },
  (table) => [index("task_events_task_id_idx").on(table.taskId)],
);
