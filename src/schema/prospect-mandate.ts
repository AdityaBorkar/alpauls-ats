import {
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
import { jobMandates } from "./job-mandate";
import { prospects } from "./prospect";

export const prospectStageEnum = pgEnum("prospect_stage", [
  "prospect",
  "applicant",
  "candidate",
  "hired",
  "rejected",
]);

export const prospectMandates = pgTable(
  "prospect_mandates",
  {
    createdAt: timestamp("created_at").defaultNow(),
    id: serial().primaryKey(),
    mandateId: integer("mandate_id")
      .notNull()
      .references(() => jobMandates.id, { onDelete: "cascade" }),
    prospectId: integer("prospect_id")
      .notNull()
      .references(() => prospects.id, { onDelete: "cascade" }),
    reason: text(),
    stage: prospectStageEnum("stage").notNull().default("prospect"),
  },
  (table) => [
    uniqueIndex("prospect_mandates_unique_idx").on(
      table.prospectId,
      table.mandateId,
    ),
    index("prospect_mandates_mandate_id_idx").on(table.mandateId),
    index("prospect_mandates_stage_idx").on(table.stage),
  ],
);

export const prospectMandateEvents = pgTable(
  "prospect_mandate_events",
  {
    changedAt: timestamp("changed_at").defaultNow(),
    changedBy: text("changed_by")
      .notNull()
      .references(() => user.id),
    id: serial().primaryKey(),
    newStage: prospectStageEnum("new_stage").notNull(),
    oldStage: prospectStageEnum("old_stage"),
    prospectMandateId: integer("prospect_mandate_id")
      .notNull()
      .references(() => prospectMandates.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("prospect_mandate_events_pm_id_idx").on(table.prospectMandateId),
  ],
);
