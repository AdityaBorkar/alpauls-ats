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

export const clients = pgTable(
  "clients",
  {
    archived: boolean("archived").notNull().default(false),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => user.id),
    createdAt: timestamp("created_at").defaultNow(),
    description: text(),
    id: serial().primaryKey(),
    name: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("clients_assignee_id_idx").on(table.assigneeId),
    index("clients_archived_idx").on(table.archived),
  ],
);

export const clientEvents = pgTable(
  "client_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    id: serial().primaryKey(),
    newValue: text("new_value"),
    oldValue: text("old_value"),
  },
  (table) => [index("client_events_client_id_idx").on(table.clientId)],
);
