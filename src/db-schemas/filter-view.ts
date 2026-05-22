import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export type FilterViewDisplay = {
  type: string;
  groupBy: string | null;
  orderBy: string;
  orderType: string;
  fields: string[];
};

export type FilterViewRefine = {
  op: string;
  field: string;
  value: string;
}[];

export type FilterViewDomain = "clients" | "prospects";

export const filterViews = pgTable(
  "filter_views",
  {
    createdAt: timestamp("created_at").defaultNow(),
    display: jsonb("display").$type<FilterViewDisplay>().notNull(),
    domain: text().notNull().default("clients"),
    id: text().primaryKey(),
    isSystemCreated: boolean("is_system_created").notNull().default(true),
    label: text().notNull(),
    refine: jsonb("refine").$type<FilterViewRefine>().notNull(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => [index("filter_views_domain_idx").on(table.domain)],
);
