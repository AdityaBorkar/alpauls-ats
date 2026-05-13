import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/schema";

const SCHEMA_SQL = `
CREATE TYPE "task_status" AS ENUM ('todo', 'in_progress', 'done');

CREATE TABLE "user" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "email" text NOT NULL,
  "email_verified" boolean DEFAULT false,
  "image" text,
  "role" text DEFAULT 'user' NOT NULL,
  "banned" boolean DEFAULT false,
  "ban_reason" text,
  "ban_expires" timestamp,
  "custom_permissions" jsonb,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" "task_status" NOT NULL DEFAULT 'todo',
  "assignee_id" text NOT NULL REFERENCES "user"("id"),
  "start_date" text,
  "deadline" text,
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "task_links" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL
);

CREATE UNIQUE INDEX "task_links_unique_idx" ON "task_links" ("task_id", "entity_type", "entity_id");

CREATE TABLE "task_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer NOT NULL REFERENCES "tasks"("id") ON DELETE CASCADE,
  "field" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_by" text NOT NULL REFERENCES "user"("id"),
  "changed_at" timestamp DEFAULT now()
);

CREATE TABLE "reminders" (
  "id" serial PRIMARY KEY NOT NULL,
  "task_id" integer REFERENCES "tasks"("id") ON DELETE CASCADE,
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "trigger_at" timestamp with time zone NOT NULL,
  "offset_minutes" integer,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE "session" (
  "id" text PRIMARY KEY NOT NULL,
  "expires_at" timestamp NOT NULL,
  "token" text NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "ip_address" text,
  "user_agent" text,
  CONSTRAINT "session_token_unique" UNIQUE("token")
);

CREATE TABLE "account" (
  "id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id"),
  "account_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "access_token" text,
  "refresh_token" text,
  "access_token_expires_at" timestamp,
  "refresh_token_expires_at" timestamp,
  "scope" text,
  "id_token" text,
  "password" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "verification" (
  "id" text PRIMARY KEY NOT NULL,
  "identifier" text NOT NULL,
  "value" text NOT NULL,
  "expires_at" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE INDEX "tasks_assignee_id_idx" ON "tasks" ("assignee_id");
CREATE INDEX "tasks_status_idx" ON "tasks" ("status");
CREATE INDEX "tasks_deadline_idx" ON "tasks" ("deadline");
CREATE INDEX "task_events_task_id_idx" ON "task_events" ("task_id");
CREATE INDEX "reminders_trigger_at_idx" ON "reminders" ("trigger_at");
CREATE INDEX "reminders_task_id_idx" ON "reminders" ("task_id");
`;

const TRUNCATE_SQL = `
DELETE FROM "task_events";
DELETE FROM "reminders";
DELETE FROM "task_links";
DELETE FROM "tasks";
DELETE FROM "account";
DELETE FROM "session";
DELETE FROM "verification";
DELETE FROM "user";
`;

export type TestDb = ReturnType<typeof drizzle<typeof schema>>;

export async function createTestDb() {
  const client = new PGlite();
  await client.exec(SCHEMA_SQL);
  const db = drizzle(client, { schema });
  return { client, db };
}

export async function resetDb(client: PGlite) {
  await client.exec(TRUNCATE_SQL);
}

export async function seedUser(
  db: TestDb,
  overrides: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    image?: string;
  } = {},
) {
  const id = overrides.id ?? "user-1";
  const [user] = await db
    .insert(schema.user)
    .values({
      email: overrides.email ?? `test-${id}@example.com`,
      id,
      image: overrides.image ?? null,
      name: overrides.name ?? "Test User",
      role: overrides.role ?? "user",
    })
    .returning();
  return user;
}
