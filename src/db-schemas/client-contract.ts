import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

import { user } from "./auth";
import { clients } from "./client";

export const contractStatusEnum = pgEnum("contract_status", [
  "active",
  "inactive",
]);

export const clientContracts = pgTable(
  "client_contracts",
  {
    archived: boolean("archived").notNull().default(false),
    assigneeId: text("assignee_id")
      .notNull()
      .references(() => user.id),
    clientId: integer("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
    description: text(),
    endDate: text("end_date"),
    id: serial().primaryKey(),
    pdfLink: text("pdf_link"),
    referenceNumber: text("reference_number"),
    rmId: text("rm_id").references(() => user.id),
    signedDate: text("signed_date"),
    startDate: text("start_date"),
    status: contractStatusEnum("status").notNull().default("active"),
    title: text().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [
    index("client_contracts_client_id_idx").on(table.clientId),
    index("client_contracts_assignee_id_idx").on(table.assigneeId),
    index("client_contracts_rm_id_idx").on(table.rmId),
    index("client_contracts_archived_idx").on(table.archived),
    index("client_contracts_status_idx").on(table.status),
  ],
);

export const contractEvents = pgTable(
  "contract_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    contractId: integer("contract_id")
      .notNull()
      .references(() => clientContracts.id, { onDelete: "cascade" }),
    field: text("field").notNull(),
    id: serial().primaryKey(),
    newValue: text("new_value"),
    oldValue: text("old_value"),
  },
  (table) => [index("contract_events_contract_id_idx").on(table.contractId)],
);
