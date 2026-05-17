import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";

import * as schema from "@/db-schemas";

const SCHEMA_SQL = `
CREATE TYPE "task_status" AS ENUM ('todo', 'in_progress', 'done');
CREATE TYPE "contract_status" AS ENUM ('active', 'inactive');
CREATE TYPE "prospect_stage" AS ENUM ('prospect', 'applicant', 'candidate', 'hired', 'rejected');
CREATE TYPE "mandate_status" AS ENUM ('open', 'in_progress', 'hired', 'completed', 'cancelled');
CREATE TYPE "notification_type" AS ENUM (
  'task_assigned',
  'task_status_changed',
  'task_deadline_approaching',
  'reminder_triggered',
  'mandate_assigned',
  'mandate_completed',
  'mandate_stage_changed',
  'prospect_stage_changed',
  'prospect_hired',
  'client_created',
  'contract_created',
  'contract_assigned',
  'system'
);

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
  "permissions" jsonb,
  "phone_number" text,
  "phone_number_verified" boolean,
  "supervisor_id" text REFERENCES "user"("id") ON DELETE SET NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "user_email_unique" UNIQUE("email")
);

CREATE TABLE "clients" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "assignee_id" text NOT NULL REFERENCES "user"("id"),
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "client_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "client_id" integer NOT NULL REFERENCES "clients"("id") ON DELETE CASCADE,
  "field" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_by" text NOT NULL REFERENCES "user"("id"),
  "changed_at" timestamp DEFAULT now()
);

CREATE TABLE "client_contracts" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "client_id" integer REFERENCES "clients"("id"),
  "assignee_id" text NOT NULL REFERENCES "user"("id"),
  "rm_id" text REFERENCES "user"("id"),
  "start_date" text,
  "end_date" text,
  "signed_date" text,
  "pdf_link" text,
  "reference_number" text,
  "status" "contract_status" NOT NULL DEFAULT 'active',
  "archived" boolean NOT NULL DEFAULT false,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE "contract_events" (
  "id" serial PRIMARY KEY NOT NULL,
  "contract_id" integer NOT NULL REFERENCES "client_contracts"("id") ON DELETE CASCADE,
  "field" text NOT NULL,
  "old_value" text,
  "new_value" text,
  "changed_by" text NOT NULL REFERENCES "user"("id"),
  "changed_at" timestamp DEFAULT now()
);

CREATE TABLE "tasks" (
  "id" serial PRIMARY KEY NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "status" "task_status" NOT NULL DEFAULT 'todo',
  "assignee_id" text NOT NULL REFERENCES "user"("id"),
  "created_by" text NOT NULL REFERENCES "user"("id"),
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
  "archived" boolean NOT NULL DEFAULT false,
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
CREATE INDEX "client_contracts_client_id_idx" ON "client_contracts" ("client_id");
CREATE INDEX "client_contracts_assignee_id_idx" ON "client_contracts" ("assignee_id");
CREATE INDEX "client_contracts_rm_id_idx" ON "client_contracts" ("rm_id");
CREATE INDEX "client_contracts_archived_idx" ON "client_contracts" ("archived");
CREATE INDEX "client_contracts_status_idx" ON "client_contracts" ("status");
CREATE INDEX "contract_events_contract_id_idx" ON "contract_events" ("contract_id");
CREATE INDEX "clients_assignee_id_idx" ON "clients" ("assignee_id");
CREATE INDEX "clients_archived_idx" ON "clients" ("archived");
CREATE INDEX "client_events_client_id_idx" ON "client_events" ("client_id");
`;

const TRUNCATE_SQL = `
DELETE FROM "contract_events";
DELETE FROM "client_events";
DELETE FROM "client_contracts";
DELETE FROM "clients";
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
    supervisorId?: string | null;
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
      supervisorId: overrides.supervisorId ?? null,
    })
    .returning();
  return user;
}
