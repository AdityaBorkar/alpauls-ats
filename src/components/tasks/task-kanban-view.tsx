import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";
import type { TaskStatus } from "@/services/task-service";

import type { TaskItem, TaskListResponse } from "./types";
import { STATUS_COLORS, STATUS_LABELS } from "./types";

type TaskKanbanViewProps = {
  onTaskClick: (task: TaskItem) => void;
  refreshKey: number;
};

const COLUMNS: TaskStatus[] = ["todo", "in_progress", "done"];

export function TaskKanbanView({
  onTaskClick,
  refreshKey,
}: TaskKanbanViewProps) {
  const [showArchived, setShowArchived] = useState(false);

  const { data: todoData } = useORPCQuery(
    () =>
      client.task.list({
        archived: showArchived ? undefined : false,
        limit: 100,
        status: ["todo"],
      }),
    [refreshKey, showArchived],
  );
  const { data: inProgressData } = useORPCQuery(
    () =>
      client.task.list({
        archived: showArchived ? undefined : false,
        limit: 100,
        status: ["in_progress"],
      }),
    [refreshKey, showArchived],
  );
  const { data: doneData } = useORPCQuery(
    () =>
      client.task.list({
        archived: showArchived ? undefined : false,
        limit: 100,
        status: ["done"],
      }),
    [refreshKey, showArchived],
  );

  const columnData: Record<TaskStatus, TaskItem[]> = {
    done: (doneData as TaskListResponse | undefined)?.items ?? [],
    in_progress: (inProgressData as TaskListResponse | undefined)?.items ?? [],
    todo: (todoData as TaskListResponse | undefined)?.items ?? [],
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={showArchived}
          id="kanban-archived"
          onCheckedChange={(v: boolean) => setShowArchived(!!v)}
        />
        <label
          className="text-muted-foreground text-sm"
          htmlFor="kanban-archived"
        >
          Show archived
        </label>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map((status) => (
          <div className="space-y-3" key={status}>
            <div className="flex items-center gap-2">
              <Badge className={STATUS_COLORS[status]} variant="outline">
                {STATUS_LABELS[status]}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {columnData[status].length}
              </span>
            </div>
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="space-y-2 pr-2">
                {columnData[status].map((task) => (
                  <Card
                    className="cursor-pointer transition-shadow hover:shadow-md"
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                  >
                    <CardContent className="p-3">
                      <div className="space-y-2">
                        <span className="font-medium text-sm">
                          {task.title}
                        </span>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={task.assignee.image ?? undefined}
                              />
                              <AvatarFallback>
                                {task.assignee.name?.[0] ?? "?"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-muted-foreground text-xs">
                              {task.assignee.name}
                            </span>
                          </div>
                          {task.deadline && (
                            <Badge className="text-xs" variant="secondary">
                              {task.deadline}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        ))}
      </div>
    </div>
  );
}
