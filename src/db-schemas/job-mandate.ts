import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { clientContracts } from "./client-contract";

export const mandateStatusEnum = pgEnum("mandate_status", [
  "open",
  "in_progress",
  "hired",
  "completed",
  "cancelled",
]);

export type MandatePosition = {
  location: string;
  headcount: number;
};

export const jobMandates = pgTable(
  "job_mandates",
  {
    archived: boolean("archived").notNull().default(false),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => user.id),
    clientContractId: integer("client_contract_id")
      .notNull()
      .references(() => clientContracts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    description: text(),
    id: serial().primaryKey(),
    positions: jsonb("positions").$type<MandatePosition[]>(),
    status: mandateStatusEnum("status").notNull().default("open"),
    title: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("job_mandates_assignee_id_idx").on(table.assigneeId),
    index("job_mandates_client_contract_id_idx").on(table.clientContractId),
    index("job_mandates_status_idx").on(table.status),
    index("job_mandates_archived_idx").on(table.archived),
  ],
);

export const mandateEvents = pgTable(
  "mandate_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    field: text("field").notNull(),
    id: serial().primaryKey(),
    mandateId: integer("mandate_id")
      .notNull()
      .references(() => jobMandates.id, { onDelete: "cascade" }),
    newValue: text("new_value"),
    oldValue: text("old_value"),
  },
  (table) => [index("mandate_events_mandate_id_idx").on(table.mandateId)],
);
