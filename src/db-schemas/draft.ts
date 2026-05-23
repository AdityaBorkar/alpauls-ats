import {
  index,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

export const drafts = pgTable(
  "drafts",
  {
    createdAt: timestamp("created_at").defaultNow(),
    createdBy: text("created_by")
      .notNull()
      .references(() => user.id),
    data: jsonb("data").notNull().$type<Record<string, unknown>>(),
    entityType: text("entity_type").notNull(),
    id: serial().primaryKey(),
    title: text("title").notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("drafts_entity_type_idx").on(table.entityType),
    index("drafts_created_by_idx").on(table.createdBy),
    index("drafts_created_at_idx").on(table.createdAt),
  ],
);
