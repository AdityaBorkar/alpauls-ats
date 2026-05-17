import type { PGlite } from "@electric-sql/pglite";
import { ORPCError } from "@orpc/server";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, resetDb, seedUser, type TestDb } from "#tests/db";
import { setTestDb } from "#tests/setup";
import {
  archiveReminder,
  createReminder,
  listReminders,
  recomputeRelativeReminders,
} from "@/services/reminder-service";

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

describe("reminder-service", () => {
  describe("createReminder", () => {
    it("creates an absolute reminder with explicit triggerAt", async () => {
      const user = await seedUser(db);
      const reminder = await createReminder({
        triggerAt: "2026-07-01T09:00:00Z",
        userId: user.id,
      });

      expect(reminder).toMatchObject({
        offsetMinutes: null,
        taskId: null,
        userId: user.id,
      });
      expect(reminder.triggerAt).toBeInstanceOf(Date);
    });

    it("creates a relative reminder on a task with a deadline", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: "2026-06-15",
          title: "Deadline task",
        })
        .returning();

      const reminder = await createReminder({
        offsetMinutes: 1440,
        taskId: task.id,
        triggerAt: "2026-06-14T00:00:00Z",
        userId: user.id,
      });

      expect(reminder.taskId).toBe(task.id);
      expect(reminder.offsetMinutes).toBe(1440);

      const expected = new Date("2026-06-14T00:00:00Z");
      expect(reminder.triggerAt.getTime()).toBe(expected.getTime());
    });

    it("rejects relative reminder on a task without a deadline", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "No deadline",
        })
        .returning();

      await expect(
        createReminder({
          offsetMinutes: 60,
          taskId: task.id,
          triggerAt: "2026-06-01T00:00:00Z",
          userId: user.id,
        }),
      ).rejects.toThrow(ORPCError);
    });

    it("rejects relative reminder without a taskId", async () => {
      const user = await seedUser(db);

      await expect(
        createReminder({
          offsetMinutes: 60,
          triggerAt: "2026-06-01T00:00:00Z",
          userId: user.id,
        }),
      ).rejects.toThrow(ORPCError);
    });

    it("creates a standalone reminder (no taskId, no offsetMinutes)", async () => {
      const user = await seedUser(db);
      const reminder = await createReminder({
        triggerAt: "2026-08-01T10:00:00Z",
        userId: user.id,
      });

      expect(reminder.taskId).toBeNull();
      expect(reminder.offsetMinutes).toBeNull();
    });

    it("throws NOT_FOUND for non-existent task", async () => {
      const user = await seedUser(db);

      await expect(
        createReminder({
          offsetMinutes: 60,
          taskId: 99999,
          triggerAt: "2026-06-01T00:00:00Z",
          userId: user.id,
        }),
      ).rejects.toThrow(ORPCError);
    });
  });

  describe("archiveReminder", () => {
    it("archives the reminder", async () => {
      const user = await seedUser(db);
      const reminder = await createReminder({
        triggerAt: "2026-07-01T09:00:00Z",
        userId: user.id,
      });

      await archiveReminder(reminder.id);

      const { reminders } = await import("@/db-schemas");
      const rows = await db.select().from(reminders);
      expect(rows).toHaveLength(1);
      expect(rows[0].archived).toBe(true);
    });
  });

  describe("listReminders", () => {
    it("lists reminders by taskId", async () => {
      const user = await seedUser(db);
      const { tasks, reminders: taskReminders } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: "2026-06-01",
          title: "Task",
        })
        .returning();

      await db.insert(taskReminders).values([
        {
          taskId: task.id,
          triggerAt: new Date("2026-05-30T09:00:00Z"),
          userId: user.id,
        },
        {
          taskId: null,
          triggerAt: new Date("2026-07-01T09:00:00Z"),
          userId: user.id,
        },
      ]);

      const result = await listReminders({ taskId: task.id });

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBe(task.id);
    });

    it("lists reminders by userId", async () => {
      const user1 = await seedUser(db, { id: "u1" });
      const user2 = await seedUser(db, { email: "u2@test.com", id: "u2" });
      const { reminders: taskReminders } = await import("@/db-schemas");

      await db.insert(taskReminders).values([
        {
          taskId: null,
          triggerAt: new Date("2026-07-01T09:00:00Z"),
          userId: user1.id,
        },
        {
          taskId: null,
          triggerAt: new Date("2026-08-01T09:00:00Z"),
          userId: user2.id,
        },
      ]);

      const result = await listReminders({ userId: "u1" });

      expect(result).toHaveLength(1);
    });

    it("lists standalone reminders only", async () => {
      const user = await seedUser(db);
      const { tasks, reminders: taskReminders } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: "2026-06-01",
          title: "Task",
        })
        .returning();

      await db.insert(taskReminders).values([
        {
          taskId: task.id,
          triggerAt: new Date("2026-05-30T09:00:00Z"),
          userId: user.id,
        },
        {
          taskId: null,
          triggerAt: new Date("2026-07-01T09:00:00Z"),
          userId: user.id,
        },
      ]);

      const result = await listReminders({ standalone: true });

      expect(result).toHaveLength(1);
      expect(result[0].taskId).toBeNull();
    });
  });

  describe("recomputeRelativeReminders", () => {
    it("updates trigger_at for all relative reminders when deadline changes", async () => {
      const user = await seedUser(db);
      const { tasks, reminders: taskReminders } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: "2026-06-10",
          title: "Task",
        })
        .returning();

      await db.insert(taskReminders).values([
        {
          offsetMinutes: 1440,
          taskId: task.id,
          triggerAt: new Date("2026-06-09T12:00:00Z"),
          userId: user.id,
        },
        {
          offsetMinutes: 60,
          taskId: task.id,
          triggerAt: new Date("2026-06-09T23:00:00Z"),
          userId: user.id,
        },
      ]);

      await db
        .update(tasks)
        .set({ deadline: "2026-07-20" })
        .where((await import("drizzle-orm")).eq(tasks.id, task.id));

      await recomputeRelativeReminders(task.id);

      const updated = await db
        .select()
        .from(taskReminders)
        .where((await import("drizzle-orm")).eq(taskReminders.taskId, task.id));

      const r1440 = updated.find(
        (r: any) => r.offsetMinutes === 1440,
      ) as (typeof updated)[number];
      const r60 = updated.find(
        (r: any) => r.offsetMinutes === 60,
      ) as (typeof updated)[number];

      expect(r1440.triggerAt.getTime()).toBe(
        new Date("2026-07-19T00:00:00Z").getTime(),
      );
      expect(r60.triggerAt.getTime()).toBe(
        new Date("2026-07-19T23:00:00Z").getTime(),
      );
    });

    it("does not modify absolute reminders", async () => {
      const user = await seedUser(db);
      const { tasks, reminders: taskReminders } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: "2026-06-10",
          title: "Task",
        })
        .returning();

      const absoluteTime = new Date("2026-06-09T09:00:00Z");
      await db.insert(taskReminders).values({
        offsetMinutes: null,
        taskId: task.id,
        triggerAt: absoluteTime,
        userId: user.id,
      });

      await db
        .update(tasks)
        .set({ deadline: "2026-08-01" })
        .where((await import("drizzle-orm")).eq(tasks.id, task.id));

      await recomputeRelativeReminders(task.id);

      const [unchanged] = await db
        .select()
        .from(taskReminders)
        .where((await import("drizzle-orm")).eq(taskReminders.taskId, task.id));

      expect(unchanged.triggerAt.getTime()).toBe(absoluteTime.getTime());
    });

    it("is a no-op when the task has no deadline", async () => {
      const user = await seedUser(db);
      const { tasks } = await import("@/db-schemas");
      const [task] = await db
        .insert(tasks)
        .values({
          assigneeId: user.id,
          createdBy: user.id,
          title: "No deadline",
        })
        .returning();

      await expect(
        recomputeRelativeReminders(task.id),
      ).resolves.toBeUndefined();
    });

    it("is a no-op when the task does not exist", async () => {
      await expect(recomputeRelativeReminders(99999)).resolves.toBeUndefined();
    });
  });
});
