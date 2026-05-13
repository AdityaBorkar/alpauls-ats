import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { orpc } from "@/rpc/client";

import type { TaskListResponse } from "../tasks/types";
import { DashboardRecentTasksContent } from "./dashboard-recent-tasks";
import { DashboardRemindersContent } from "./dashboard-reminders";

export function DashboardTasksReminders() {
  const { data: tasksData, isLoading: tasksLoading } = useQuery(
    orpc.task.list.queryOptions({
      input: {
        archived: false,
        limit: 5,
        sortBy: "createdAt",
        sortOrder: "desc",
      },
    }),
  );

  const { data: remindersData, isLoading: remindersLoading } = useQuery(
    orpc.reminder.list.queryOptions({ input: {} }),
  );

  const tasks = (tasksData as TaskListResponse | undefined)?.items ?? [];

  const reminders = (
    (remindersData as
      | {
          id: number;
          taskId: number | null;
          userId: string;
          triggerAt: Date;
          offsetMinutes: number | null;
          createdAt: Date | null;
        }[]
      | undefined) ?? []
  )
    .filter((r) => new Date(r.triggerAt) > new Date())
    .sort(
      (a, b) =>
        new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime(),
    )
    .slice(0, 5);

  return (
    <Tabs defaultValue="tasks">
      <Card>
        <CardHeader className="pb-3">
          <TabsList>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="reminders">Reminders</TabsTrigger>
          </TabsList>
        </CardHeader>
        <TabsContent keepMounted value="tasks">
          <CardContent>
            <DashboardRecentTasksContent
              isLoading={tasksLoading}
              tasks={tasks}
            />
          </CardContent>
        </TabsContent>
        <TabsContent keepMounted value="reminders">
          <CardContent>
            <DashboardRemindersContent
              isLoading={remindersLoading}
              reminders={reminders}
            />
          </CardContent>
        </TabsContent>
      </Card>
    </Tabs>
  );
}
