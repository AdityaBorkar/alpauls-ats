import type { PGlite } from "@electric-sql/pglite";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { createTestDb, resetDb, seedUser, type TestDb } from "#tests/db";
import { setTestDb } from "#tests/setup";
import {
  archiveTask,
  createTask,
  getTask,
  listTasks,
  updateTask,
} from "@/services/task-service";

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

afterEach(async () => {});

describe("task-service", () => {
  describe("createTask", () => {
    it("creates a task with minimal fields, defaulting status to todo", async () => {
      await seedUser(db);
      const task = (await createTask({
        assigneeId: "user-1",
        createdBy: "user-1",
        title: "Review resumes",
      }))!;

      expect(task).toMatchObject({
        archived: false,
        assigneeId: "user-1",
        deadline: null,
        description: null,
        startDate: null,
        status: "todo",
        title: "Review resumes",
      });
      expect(task.id).toBeTypeOf("number");
    });

    it("creates a task with all optional fields", async () => {
      await seedUser(db);
      const task = (await createTask({
        assigneeId: "user-1",
        createdBy: "user-1",
        deadline: "2026-05-20",
        description: "Call the candidate",
        startDate: "2026-05-15",
        status: "in_progress",
        title: "Schedule interview",
      }))!;

      expect(task).toMatchObject({
        assigneeId: "user-1",
        deadline: "2026-05-20",
        description: "Call the candidate",
        startDate: "2026-05-15",
        status: "in_progress",
        title: "Schedule interview",
      });
    });

    it("returns nested assignee, empty links, empty reminders", async () => {
      await seedUser(db, {
        id: "user-1",
        image: "https://img.example.com/alice.png",
        name: "Alice",
      });
      const task = (await createTask({
        assigneeId: "user-1",
        createdBy: "user-1",
        title: "Test task",
      }))!;

      expect(task.assignee).toMatchObject({
        id: "user-1",
        image: "https://img.example.com/alice.png",
        name: "Alice",
      });
      expect(task.links).toEqual([]);
      expect(task.reminders).toEqual([]);
    });
  });

  describe("updateTask", () => {
    it("produces a single event when one field changes", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Old title",
      }))!;

      const updated = (await updateTask(
        task.id,
        { title: "New title" },
        user.id,
      ))!;

      expect(updated.title).toBe("New title");

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        changedBy: user.id,
        field: "title",
        newValue: "New title",
        oldValue: "Old title",
        taskId: task.id,
      });
    });

    it("produces one event per changed field when multiple fields change", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Old title",
      }))!;

      await updateTask(
        task.id,
        { deadline: "2026-06-01", status: "in_progress", title: "New title" },
        user.id,
      );

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(3);

      const fields = events.map((e: any) => e.field).sort();
      expect(fields).toEqual(["deadline", "status", "title"].sort());
    });

    it("does not produce events when values are unchanged", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Same title",
      }))!;

      await updateTask(task.id, { title: "Same title" }, user.id);

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(0);
    });

    it("triggers recompute of relative reminders when deadline changes", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        deadline: "2026-06-10",
        title: "Deadline task",
      }))!;

      const { reminders: taskReminders } = await import("@/schema");
      await db.insert(taskReminders).values({
        offsetMinutes: 1440,
        taskId: task.id,
        triggerAt: new Date("2026-06-09T12:00:00Z"),
        userId: user.id,
      });

      await updateTask(task.id, { deadline: "2026-07-15" }, user.id);

      const [updatedReminder] = await db
        .select()
        .from(taskReminders)
        .where((await import("drizzle-orm")).eq(taskReminders.taskId, task.id));

      const expectedTrigger = new Date("2026-07-14T00:00:00Z");
      expect(updatedReminder.triggerAt.getTime()).toBe(
        expectedTrigger.getTime(),
      );
    });

    it("throws when task does not exist", async () => {
      const user = await seedUser(db);

      await expect(
        updateTask(99999, { title: "Nope" }, user.id),
      ).rejects.toThrow("Task not found");
    });

    it("records archived event when archiving via updateTask", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "To archive",
      }))!;

      await updateTask(task.id, { archived: true }, user.id);

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        field: "archived",
        newValue: "true",
        oldValue: "false",
      });
    });

    it("sets description to null when null is provided", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        description: "original",
        title: "With desc",
      }))!;

      const updated = (await updateTask(
        task.id,
        { description: null },
        user.id,
      ))!;

      expect(updated.description).toBeNull();

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        field: "description",
        newValue: null,
        oldValue: "original",
      });
    });
  });

  describe("archiveTask", () => {
    it("sets archived to true and records an event", async () => {
      const user = await seedUser(db);
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Archive me",
      }))!;

      const archived = (await archiveTask(task.id, user.id))!;

      expect(archived.archived).toBe(true);

      const events = await db
        .select()
        .from((await import("@/schema")).taskEvents);
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        field: "archived",
        newValue: "true",
        oldValue: "false",
      });
    });
  });

  describe("getTask", () => {
    it("returns task with nested assignee, links, and reminders", async () => {
      const user = await seedUser(db, { name: "Bob" });
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Full task",
      }))!;

      const { taskLinks, reminders: taskReminders } = await import("@/schema");
      await db.insert(taskLinks).values({
        entityId: "cand-1",
        entityType: "prospect",
        taskId: task.id,
      });
      await db.insert(taskReminders).values({
        offsetMinutes: null,
        taskId: task.id,
        triggerAt: new Date("2026-06-01T09:00:00Z"),
        userId: user.id,
      });

      const result = await getTask(task.id);

      expect(result).not.toBeNull();
      const r = result as NonNullable<typeof result>;
      expect(r.assignee).toMatchObject({ id: user.id, name: "Bob" });
      expect(r.links).toHaveLength(1);
      expect(r.reminders).toHaveLength(1);
    });

    it("returns null for non-existent task", async () => {
      const result = await getTask(99999);
      expect(result).toBeNull();
    });
  });

  describe("listTasks", () => {
    it("excludes archived tasks by default", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Active",
      });
      const toArchive = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Archived",
      }))!;
      await archiveTask(toArchive.id, user.id);

      const result = await listTasks();

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Active");
    });

    it("filters by status array", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        status: "todo",
        title: "Todo",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        status: "in_progress",
        title: "In progress",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        status: "done",
        title: "Done",
      });

      const result = await listTasks({
        filters: { status: ["todo", "in_progress"] },
      });

      expect(result.items).toHaveLength(2);
      const titles = result.items.map((t) => t.title).sort();
      expect(titles).toEqual(["In progress", "Todo"]);
    });

    it("filters by assigneeId array", async () => {
      const user1 = await seedUser(db, { id: "u1" });
      const user2 = await seedUser(db, { email: "u2@test.com", id: "u2" });
      await createTask({
        assigneeId: user1.id,
        createdBy: user1.id,
        title: "User1 task",
      });
      await createTask({
        assigneeId: user2.id,
        createdBy: user2.id,
        title: "User2 task",
      });

      const result = await listTasks({ filters: { assigneeId: ["u1"] } });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("User1 task");
    });

    it("filters by search text (ILIKE on title and description)", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        description: "Check all candidates",
        title: "Review resumes",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        description: "Phone screening",
        title: "Schedule calls",
      });

      const result = await listTasks({ filters: { search: "candidate" } });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Review resumes");
    });

    it("filters by deadline range", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        deadline: "2026-05-10",
        title: "Early",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        deadline: "2026-08-01",
        title: "Late",
      });

      const result = await listTasks({
        filters: { deadlineFrom: "2026-06-01", deadlineTo: "2026-12-31" },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Late");
    });

    it("filters by entity link (entityType + entityId)", async () => {
      const user = await seedUser(db);
      const task1 = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Linked",
      }))!;
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Unlinked",
      });

      const { taskLinks } = await import("@/schema");
      await db.insert(taskLinks).values({
        entityId: "cand-42",
        entityType: "prospect",
        taskId: task1.id,
      });

      const result = await listTasks({
        filters: { entityId: "cand-42", entityType: "prospect" },
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Linked");
    });

    it("includes archived tasks when archived=true filter is set", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Active",
      });
      const toArchive = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Archived",
      }))!;
      await archiveTask(toArchive.id, user.id);

      const result = await listTasks({ filters: { archived: true } });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe("Archived");
    });

    it("sorts by deadline ascending with nulls last by default", async () => {
      const user = await seedUser(db);
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "No deadline",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        deadline: "2026-06-01",
        title: "June",
      });
      await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        deadline: "2026-05-01",
        title: "May",
      });

      const result = await listTasks();

      const titles = result.items.map((t) => t.title);
      expect(titles).toEqual(["May", "June", "No deadline"]);
    });

    it("paginates with cursor and limit", async () => {
      const user = await seedUser(db);
      for (let i = 1; i <= 5; i++) {
        await createTask({
          assigneeId: user.id,
          createdBy: user.id,
          deadline: `2026-05-${10 + i}`,
          title: `Task ${i}`,
        });
      }

      const page1 = await listTasks({ limit: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.nextCursor).not.toBeNull();

      const page2 = await listTasks({
        cursor: page1.nextCursor as string,
        limit: 2,
      });
      expect(page2.items).toHaveLength(2);

      const page3 = await listTasks({
        cursor: page2.nextCursor as string,
        limit: 2,
      });
      expect(page3.items).toHaveLength(1);
      expect(page3.nextCursor).toBeNull();
    });

    it("returns nested assignee, links, and reminders for each item", async () => {
      const user = await seedUser(db, { name: "Carol" });
      const task = (await createTask({
        assigneeId: user.id,
        createdBy: user.id,
        title: "Rich task",
      }))!;

      const { taskLinks, reminders: taskReminders } = await import("@/schema");
      await db.insert(taskLinks).values({
        entityId: "mandate-1",
        entityType: "job_mandate",
        taskId: task.id,
      });
      await db.insert(taskReminders).values({
        taskId: task.id,
        triggerAt: new Date("2026-06-01T09:00:00Z"),
        userId: user.id,
      });

      const result = await listTasks();

      expect(result.items).toHaveLength(1);
      const item = result.items[0];
      expect(item.assignee.name).toBe("Carol");
      expect(item.links).toHaveLength(1);
      expect(item.reminders).toHaveLength(1);
    });
  });
});
