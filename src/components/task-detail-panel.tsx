import { format } from "date-fns";
import { Archive, Bell, History, Link2, Plus, X } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useORPCMutation } from "@/hooks/use-orpc-mutation";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";
import type { TaskStatus } from "@/services/task-service";

import type { TaskItem } from "./tasks.types";
import { STATUS_COLORS, STATUS_LABELS } from "./tasks.types";

type TaskDetailPanelProps = {
  task: TaskItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  mode: "view" | "create";
};

export function TaskDetailPanel({
  task,
  open,
  onOpenChange,
  onRefresh,
  mode,
}: TaskDetailPanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [assigneeId, setAssigneeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const [newReminderType, setNewReminderType] = useState<
    "absolute" | "relative"
  >("absolute");
  const [newReminderTriggerAt, setNewReminderTriggerAt] = useState("");
  const [newReminderOffset, setNewReminderOffset] = useState(60);
  const [newLinkEntityType, setNewLinkEntityType] = useState("");
  const [newLinkEntityId, setNewLinkEntityId] = useState("");

  const createTask = useORPCMutation(client.task.create, {
    onSuccess: () => {
      onRefresh();
      onOpenChange(false);
      resetForm();
    },
  });

  const updateTask = useORPCMutation(client.task.update, {
    onSuccess: () => {
      onRefresh();
      setIsEditing(false);
    },
  });

  const archiveTask = useORPCMutation(client.task.archive, {
    onSuccess: () => {
      onRefresh();
      onOpenChange(false);
    },
  });

  const createReminder = useORPCMutation(client.reminder.create, {
    onSuccess: () => {
      onRefresh();
      setNewReminderTriggerAt("");
      setNewReminderOffset(60);
    },
  });

  const archiveReminder = useORPCMutation(client.reminder.archive, {
    onSuccess: () => {
      onRefresh();
    },
  });

  const addLink = useORPCMutation(client.task.addLink, {
    onSuccess: () => {
      onRefresh();
      setNewLinkEntityType("");
      setNewLinkEntityId("");
    },
  });

  const removeLink = useORPCMutation(client.task.removeLink, {
    onSuccess: () => {
      onRefresh();
    },
  });

  const { data: eventsData } = useORPCQuery(
    () => client.task.listEvents({ taskId: task?.id ?? 0 }),
    [task?.id, open],
  );

  function resetForm() {
    setTitle("");
    setDescription("");
    setStatus("todo");
    setAssigneeId("");
    setStartDate("");
    setDeadline("");
    setIsEditing(false);
  }

  function handleCreate() {
    createTask.mutate({
      assigneeId,
      deadline: deadline || undefined,
      description: description || undefined,
      startDate: startDate || undefined,
      status,
      title,
    });
  }

  function handleSave() {
    if (!task) return;
    updateTask.mutate({
      assigneeId: assigneeId !== task.assigneeId ? assigneeId : undefined,
      deadline:
        deadline !== (task.deadline ?? "") ? deadline || null : undefined,
      description:
        description !== (task.description ?? "")
          ? description || null
          : undefined,
      id: task.id,
      startDate:
        startDate !== (task.startDate ?? "") ? startDate || null : undefined,
      status: status !== task.status ? status : undefined,
      title: title !== task.title ? title : undefined,
    });
  }

  function handleOpen() {
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? "");
      setStatus(task.status);
      setAssigneeId(task.assigneeId);
      setStartDate(task.startDate ?? "");
      setDeadline(task.deadline ?? "");
    } else {
      resetForm();
    }
  }

  function formatOffset(minutes: number): string {
    if (minutes < 60) return `${minutes}m before`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h before`;
    return `${Math.floor(minutes / 1440)}d before`;
  }

  return (
    <Drawer
      direction="right"
      onOpenChange={(v) => {
        if (v) handleOpen();
        onOpenChange(v);
      }}
      open={open}
    >
      <DrawerContent className="w-full sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>
            {mode === "create"
              ? "New Task"
              : isEditing
                ? "Edit Task"
                : (task?.title ?? "")}
          </DrawerTitle>
          <DrawerDescription>
            {mode === "create"
              ? "Create a new task"
              : isEditing
                ? "Edit task details"
                : "Task details"}
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-6">
            {mode === "create" || isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Task title"
                    value={title}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Markdown description..."
                    rows={4}
                    value={description}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    onValueChange={(v: string | null) =>
                      setStatus(v as TaskStatus)
                    }
                    value={status}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="assigneeId">Assignee ID</Label>
                  <Input
                    id="assigneeId"
                    onChange={(e) => setAssigneeId(e.target.value)}
                    placeholder="User ID"
                    value={assigneeId}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      onChange={(e) => setStartDate(e.target.value)}
                      type="date"
                      value={startDate}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input
                      id="deadline"
                      onChange={(e) => setDeadline(e.target.value)}
                      type="date"
                      value={deadline}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={createTask.isPending || updateTask.isPending}
                    onClick={mode === "create" ? handleCreate : handleSave}
                  >
                    {mode === "create" ? "Create" : "Save"}
                  </Button>
                  {mode !== "create" && (
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            ) : task ? (
              <>
                <div className="flex items-center gap-2">
                  <Badge className={STATUS_COLORS[task.status]}>
                    {STATUS_LABELS[task.status]}
                  </Badge>
                  {task.archived && <Badge variant="outline">Archived</Badge>}
                </div>
                {task.description && (
                  <div className="prose prose-sm max-w-none">
                    {task.description}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={task.assignee.image ?? undefined} />
                    <AvatarFallback>
                      {task.assignee.name?.[0] ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm">{task.assignee.name}</span>
                </div>
                <div className="flex gap-4 text-muted-foreground text-sm">
                  {task.startDate && <span>Start: {task.startDate}</span>}
                  {task.deadline && <span>Deadline: {task.deadline}</span>}
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setTitle(task.title);
                      setDescription(task.description ?? "");
                      setStatus(task.status);
                      setAssigneeId(task.assigneeId);
                      setStartDate(task.startDate ?? "");
                      setDeadline(task.deadline ?? "");
                      setIsEditing(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                  {!task.archived && (
                    <Button
                      disabled={archiveTask.isPending}
                      onClick={() => archiveTask.mutate({ id: task.id })}
                      size="sm"
                      variant="outline"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </>
            ) : null}

            {task && !isEditing && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Bell className="h-4 w-4" />
                    Reminders
                  </div>
                  {task.reminders.map((r) => (
                    <div
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      key={r.id}
                    >
                      <span>
                        {r.offsetMinutes !== null
                          ? formatOffset(r.offsetMinutes)
                          : format(new Date(r.triggerAt), "PPPp")}
                      </span>
                      <Button
                        onClick={() => archiveReminder.mutate({ id: r.id })}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="space-y-2">
                    <Select
                      onValueChange={(v: string | null) =>
                        setNewReminderType(v as "absolute" | "relative")
                      }
                      value={newReminderType}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absolute">
                          At specific time
                        </SelectItem>
                        <SelectItem value="relative">
                          Before deadline
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {newReminderType === "absolute" ? (
                      <Input
                        className="h-8"
                        onChange={(e) =>
                          setNewReminderTriggerAt(e.target.value)
                        }
                        type="datetime-local"
                        value={newReminderTriggerAt}
                      />
                    ) : (
                      <Select
                        onValueChange={(v: string | null) =>
                          setNewReminderOffset(Number(v))
                        }
                        value={String(newReminderOffset)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 min before</SelectItem>
                          <SelectItem value="30">30 min before</SelectItem>
                          <SelectItem value="60">1 hour before</SelectItem>
                          <SelectItem value="1440">1 day before</SelectItem>
                          <SelectItem value="2880">2 days before</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    <Button
                      disabled={
                        createReminder.isPending ||
                        (newReminderType === "absolute" &&
                          !newReminderTriggerAt)
                      }
                      onClick={() => {
                        if (newReminderType === "absolute") {
                          createReminder.mutate({
                            taskId: task.id,
                            triggerAt: newReminderTriggerAt,
                            userId: "",
                          });
                        } else {
                          createReminder.mutate({
                            offsetMinutes: newReminderOffset,
                            taskId: task.id,
                            triggerAt: new Date().toISOString(),
                            userId: "",
                          });
                        }
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="mr-1 h-3.5 w-3.5" />
                      Add Reminder
                    </Button>
                  </div>
                </div>

                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <Link2 className="h-4 w-4" />
                    Links
                  </div>
                  {task.links.map((l) => (
                    <div
                      className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      key={l.id}
                    >
                      <span>
                        {l.entityType}: {l.entityId}
                      </span>
                      <Button
                        onClick={() => removeLink.mutate({ linkId: l.id })}
                        size="sm"
                        variant="ghost"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      className="h-8"
                      onChange={(e) => setNewLinkEntityType(e.target.value)}
                      placeholder="Entity type"
                      value={newLinkEntityType}
                    />
                    <Input
                      className="h-8"
                      onChange={(e) => setNewLinkEntityId(e.target.value)}
                      placeholder="Entity ID"
                      value={newLinkEntityId}
                    />
                    <Button
                      disabled={
                        addLink.isPending ||
                        !newLinkEntityType ||
                        !newLinkEntityId
                      }
                      onClick={() =>
                        addLink.mutate({
                          entityId: newLinkEntityId,
                          entityType: newLinkEntityType,
                          taskId: task.id,
                        })
                      }
                      size="sm"
                      variant="outline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <History className="h-4 w-4" />
                    History
                  </div>
                  {eventsData?.items.map((event: any) => (
                    <div
                      className="border-muted border-l-2 py-1 pl-3 text-sm"
                      key={event.id}
                    >
                      <span className="font-medium">{event.field}</span>
                      {event.oldValue && (
                        <span className="text-muted-foreground">
                          {" "}
                          from "{event.oldValue}"
                        </span>
                      )}
                      {event.newValue && (
                        <span className="text-muted-foreground">
                          {" "}
                          to "{event.newValue}"
                        </span>
                      )}
                      <div className="text-muted-foreground text-xs">
                        {event.changedAt &&
                          format(new Date(event.changedAt), "PPP p")}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
