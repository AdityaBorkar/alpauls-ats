import { useQuery } from "@tanstack/react-query";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rpc } from "@/rpc/client";

import type { TaskListResponse } from "./tasks.types";
import { STATUS_COLORS, STATUS_LABELS } from "./tasks.types";

export function DashboardRecentTasks() {
  const { data, isLoading } = useQuery(
    rpc.task.list.queryOptions({
      input: {
        archived: false,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    }),
  );

  const tasks = (data as TaskListResponse | undefined)?.items ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardRecentTasksContent isLoading={isLoading} tasks={tasks} />
      </CardContent>
    </Card>
  );
}

export function DashboardRecentTasksContent({
  isLoading,
  tasks,
}: {
  isLoading: boolean;
  tasks: TaskListResponse["items"];
}) {
  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (tasks.length === 0)
    return <p className="text-muted-foreground text-sm">No tasks yet</p>;

  return (
    <div className="space-y-3">
      {tasks.map((task) => (
        <div className="flex items-center justify-between" key={task.id}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="h-5 w-5 shrink-0">
              <AvatarImage src={task.assignee.image ?? undefined} />
              <AvatarFallback className="text-[10px]">
                {task.assignee.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="truncate text-sm">{task.title}</span>
          </div>
          <div className="ml-2 flex shrink-0 items-center gap-2">
            {task.deadline && (
              <span className="text-muted-foreground text-xs">
                {task.deadline}
              </span>
            )}
            <Badge className={STATUS_COLORS[task.status]} variant="outline">
              {STATUS_LABELS[task.status]}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  );
}
