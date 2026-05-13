import type { PGlite } from "@electric-sql/pglite";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, resetDb, seedUser, type TestDb } from "#tests/db";
import { setTestDb } from "#tests/setup";
import { listEvents, recordEvent } from "@/services/task-event-service";

let db: TestDb;
let client: PGlite;

beforeAll(async () => {
  const test = await createTestDb();
  db = test.db;
  client = test.client;
  setTestDb(db);
});

beforeEach(async () => {
  await resetDb(client);
});

describe("task-event-service", () => {
  describe("recordEvent", () => {
    it("inserts an event row with correct fields", async () => {
      const user = await seedUser(db);
      const { tasks, taskEvents } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "Event task",
        })
        .returning();

      await recordEvent(task.id, "title", "Old title", "New title", user.id);

      const events = await db.select().from(taskEvents);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        changedBy: user.id,
        field: "title",
        newValue: "New title",
        oldValue: "Old title",
        taskId: task.id,
      });
    });
  });

  describe("listEvents", () => {
    it("returns events for a task ordered by changedAt desc", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({ assigneeId: user.id, createdBy: user.id, title: "Task" })
        .returning();

      await recordEvent(task.id, "title", null, "Initial", user.id);
      await recordEvent(task.id, "status", "todo", "in_progress", user.id);

      const result = await listEvents(task.id);

      expect(result.items).toHaveLength(2);
      expect(result.items[0].field).toBe("status");
      expect(result.items[1].field).toBe("title");
    });

    it("returns empty items for a task with no events", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({ assigneeId: user.id, createdBy: user.id, title: "No events" })
        .returning();

      const result = await listEvents(task.id);

      expect(result.items).toHaveLength(0);
      expect(result.nextCursor).toBeNull();
    });

    it("paginates with cursor and limit", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "Many events",
        })
        .returning();

      for (let i = 0; i < 5; i++) {
        await recordEvent(task.id, "title", `Old ${i}`, `New ${i}`, user.id);
      }

      const page1 = await listEvents(task.id, undefined, 2);
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await listEvents(task.id, page1.nextCursor as string, 2);
      expect(page2.items).toHaveLength(2);
    });
  });
});
