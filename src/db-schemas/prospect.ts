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

export const prospects = pgTable(
  "prospects",
  {
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow(),
    description: text(),
    email: text(),
    id: serial().primaryKey(),
    name: text().notNull(),
    phone: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("prospects_phone_idx").on(table.phone),
    index("prospects_archived_idx").on(table.archived),
  ],
);

export const prospectEvents = pgTable(
  "prospect_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    field: text("field").notNull(),
    id: serial().primaryKey(),
    newValue: text("new_value"),
    oldValue: text("old_value"),
    prospectId: integer("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
  },
  (table) => [index("prospect_events_prospect_id_idx").on(table.prospectId)],
);
