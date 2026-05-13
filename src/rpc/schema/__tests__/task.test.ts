import { describe, expect, it } from "vitest";

import {
  addLinkSchema,
  archiveReminderSchema,
  archiveTaskSchema,
  createReminderSchema,
  createTaskSchema,
  getTaskByIdSchema,
  listEventsSchema,
  listRemindersSchema,
  listTasksSchema,
  removeLinkSchema,
  updateTaskSchema,
} from "@/rpc/schema/task";

describe("task schemas", () => {
  describe("createTaskSchema", () => {
    it("accepts valid input with required fields", () => {
      const result = createTaskSchema.safeParse({
        assigneeId: "user-1",
        title: "My task",
      });
      expect(result.success).toBe(true);
    });

    it("accepts all optional fields", () => {
      const result = createTaskSchema.safeParse({
        assigneeId: "user-1",
        deadline: "2026-06-01",
        description: "desc",
        startDate: "2026-05-15",
        status: "in_progress",
        title: "My task",
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty title", () => {
      const result = createTaskSchema.safeParse({
        assigneeId: "user-1",
        title: "",
      });
      expect(result.success).toBe(false);
    });

    it("rejects missing assigneeId", () => {
      const result = createTaskSchema.safeParse({ title: "Task" });
      expect(result.success).toBe(false);
    });

    it("rejects invalid status", () => {
      const result = createTaskSchema.safeParse({
        assigneeId: "user-1",
        status: "backlog",
        title: "Task",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("updateTaskSchema", () => {
    it("accepts partial updates", () => {
      const result = updateTaskSchema.safeParse({
        id: 1,
        title: "Updated",
      });
      expect(result.success).toBe(true);
    });

    it("accepts nullable description", () => {
      const result = updateTaskSchema.safeParse({
        description: null,
        id: 1,
      });
      expect(result.success).toBe(true);
    });

    it("requires id", () => {
      const result = updateTaskSchema.safeParse({ title: "No id" });
      expect(result.success).toBe(false);
    });

    it("rejects non-positive id", () => {
      const result = updateTaskSchema.safeParse({ id: -1, title: "Bad" });
      expect(result.success).toBe(false);
    });
  });

  describe("listTasksSchema", () => {
    it("accepts empty input (all optional)", () => {
      const result = listTasksSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("rejects limit below 1", () => {
      const result = listTasksSchema.safeParse({ limit: 0 });
      expect(result.success).toBe(false);
    });

    it("rejects limit above 100", () => {
      const result = listTasksSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it("accepts valid limit range", () => {
      const result = listTasksSchema.safeParse({ limit: 50 });
      expect(result.success).toBe(true);
    });

    it("accepts valid sortBy values", () => {
      for (const sortBy of [
        "deadline",
        "title",
        "status",
        "createdAt",
      ] as const) {
        const result = listTasksSchema.safeParse({ sortBy });
        expect(result.success).toBe(true);
      }
    });

    it("rejects invalid sortBy", () => {
      const result = listTasksSchema.safeParse({ sortBy: "priority" });
      expect(result.success).toBe(false);
    });

    it("accepts status array filter", () => {
      const result = listTasksSchema.safeParse({ status: ["todo", "done"] });
      expect(result.success).toBe(true);
    });
  });

  describe("getTaskByIdSchema", () => {
    it("accepts positive integer id", () => {
      const result = getTaskByIdSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("rejects missing id", () => {
      const result = getTaskByIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe("archiveTaskSchema", () => {
    it("accepts positive integer id", () => {
      const result = archiveTaskSchema.safeParse({ id: 5 });
      expect(result.success).toBe(true);
    });
  });

  describe("listEventsSchema", () => {
    it("requires taskId", () => {
      const result = listEventsSchema.safeParse({ taskId: 1 });
      expect(result.success).toBe(true);
    });

    it("rejects limit below 1", () => {
      const result = listEventsSchema.safeParse({ limit: 0, taskId: 1 });
      expect(result.success).toBe(false);
    });
  });

  describe("addLinkSchema", () => {
    it("accepts valid input", () => {
      const result = addLinkSchema.safeParse({
        entityId: "cand-1",
        entityType: "candidate",
        taskId: 1,
      });
      expect(result.success).toBe(true);
    });

    it("rejects empty entityType", () => {
      const result = addLinkSchema.safeParse({
        entityId: "cand-1",
        entityType: "",
        taskId: 1,
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty entityId", () => {
      const result = addLinkSchema.safeParse({
        entityId: "",
        entityType: "candidate",
        taskId: 1,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("removeLinkSchema", () => {
    it("accepts positive integer id", () => {
      const result = removeLinkSchema.safeParse({ linkId: 1 });
      expect(result.success).toBe(true);
    });
  });

  describe("createReminderSchema", () => {
    it("accepts absolute reminder (no offsetMinutes)", () => {
      const result = createReminderSchema.safeParse({
        triggerAt: "2026-07-01T09:00:00Z",
        userId: "user-1",
      });
      expect(result.success).toBe(true);
    });

    it("accepts relative reminder with offsetMinutes", () => {
      const result = createReminderSchema.safeParse({
        offsetMinutes: 1440,
        taskId: 1,
        triggerAt: "2026-06-14T00:00:00Z",
        userId: "user-1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects non-integer offsetMinutes", () => {
      const result = createReminderSchema.safeParse({
        offsetMinutes: 1.5,
        taskId: 1,
        triggerAt: "2026-06-14T00:00:00Z",
        userId: "user-1",
      });
      expect(result.success).toBe(false);
    });

    it("rejects empty userId", () => {
      const result = createReminderSchema.safeParse({
        triggerAt: "2026-07-01T09:00:00Z",
        userId: "",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("archiveReminderSchema", () => {
    it("accepts positive integer id", () => {
      const result = archiveReminderSchema.safeParse({ id: 1 });
      expect(result.success).toBe(true);
    });

    it("rejects zero id", () => {
      const result = archiveReminderSchema.safeParse({ id: 0 });
      expect(result.success).toBe(false);
    });
  });

  describe("listRemindersSchema", () => {
    it("accepts empty input", () => {
      const result = listRemindersSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it("accepts taskId filter", () => {
      const result = listRemindersSchema.safeParse({ taskId: 1 });
      expect(result.success).toBe(true);
    });

    it("accepts standalone filter", () => {
      const result = listRemindersSchema.safeParse({ standalone: true });
      expect(result.success).toBe(true);
    });
  });
});
