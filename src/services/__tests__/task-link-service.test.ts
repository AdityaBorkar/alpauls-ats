import type { PGlite } from "@electric-sql/pglite";
import { ORPCError } from "@orpc/server";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, resetDb, seedUser, type TestDb } from "#tests/db";
import { setTestDb } from "#tests/setup";
import { addLink, removeLink } from "@/services/task-link-service";

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

describe("task-link-service", () => {
  describe("addLink", () => {
    it("adds a link with correct taskId, entityType, entityId", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({ assigneeId: user.id, createdBy: user.id, title: "Link task" })
        .returning();

      const link = await addLink(task.id, "prospect", "cand-1");

      expect(link).toMatchObject({
        entityId: "cand-1",
        entityType: "prospect",
        taskId: task.id,
      });
    });

    it("rejects duplicate link (same taskId + entityType + entityId)", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({ assigneeId: user.id, createdBy: user.id, title: "Dup task" })
        .returning();

      await addLink(task.id, "prospect", "cand-1");

      await expect(addLink(task.id, "prospect", "cand-1")).rejects.toThrow(
        ORPCError,
      );
    });

    it("allows same entityId with different entityType on the same task", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "Multi link task",
        })
        .returning();

      const link1 = await addLink(task.id, "prospect", "shared-id");
      const link2 = await addLink(task.id, "job_mandate", "shared-id");

      expect(link1.entityType).toBe("prospect");
      expect(link2.entityType).toBe("job_mandate");
    });
  });

  describe("removeLink", () => {
    it("removes the link from the database", async () => {
      const user = await seedUser(db);
      const { tasks, taskLinks } = await import("@/schema");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "Remove link task",
        })
        .returning();

      const link = await addLink(task.id, "prospect", "cand-1");

      await removeLink(link.id);

      const rows = await db
        .select()
        .from(taskLinks)
        .where((await import("drizzle-orm")).eq(taskLinks.taskId, task.id));

      expect(rows).toHaveLength(0);
    });
  });
});
