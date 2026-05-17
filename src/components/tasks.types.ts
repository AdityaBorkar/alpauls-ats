import type { TaskStatus } from "@/services/task-service";

export type TaskItem = {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  assigneeId: string;
  startDate: string | null;
  deadline: string | null;
  archived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  };
  links: {
    id: number;
    taskId: number;
    entityType: string;
    entityId: string;
  }[];
  reminders: {
    id: number;
    taskId: number | null;
    userId: string;
    triggerAt: Date;
    offsetMinutes: number | null;
    createdAt: Date | null;
  }[];
};

export type TaskListResponse = {
  items: TaskItem[];
  nextCursor: string | null;
};

export type TaskEventItem = {
  id: number;
  taskId: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: Date | null;
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  done: "Done",
  in_progress: "In Progress",
  todo: "To Do",
};

export const STATUS_COLORS: Record<TaskStatus, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  todo: "bg-slate-100 text-slate-700 border-slate-200",
};
