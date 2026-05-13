import { IconBellRinging } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/rpc/client";

type ReminderItem = {
  id: number;
  taskId: number | null;
  userId: string;
  triggerAt: Date;
  offsetMinutes: number | null;
  createdAt: Date | null;
};

type RemindersResponse = ReminderItem[];

export function DashboardReminders() {
  const { data, isLoading } = useQuery(
    orpc.reminder.list.queryOptions({ input: {} }),
  );

  const reminders = (data as RemindersResponse | undefined) ?? [];

  const upcoming = reminders
    .filter((r) => new Date(r.triggerAt) > new Date())
    .sort(
      (a, b) =>
        new Date(a.triggerAt).getTime() - new Date(b.triggerAt).getTime(),
    )
    .slice(0, 5);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-semibold text-sm">
          Upcoming Reminders
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DashboardRemindersContent isLoading={isLoading} reminders={upcoming} />
      </CardContent>
    </Card>
  );
}

export function DashboardRemindersContent({
  isLoading,
  reminders,
}: {
  isLoading: boolean;
  reminders: {
    id: number;
    taskId: number | null;
    userId: string;
    triggerAt: Date;
    offsetMinutes: number | null;
    createdAt: Date | null;
  }[];
}) {
  if (isLoading)
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  if (reminders.length === 0)
    return (
      <p className="text-muted-foreground text-sm">No upcoming reminders</p>
    );

  return (
    <div className="space-y-3">
      {reminders.map((reminder) => (
        <div className="flex items-center justify-between" key={reminder.id}>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <IconBellRinging className="h-4 w-4 shrink-0 text-muted-foreground" />
            {reminder.taskId ? (
              <span className="truncate text-sm">Task #{reminder.taskId}</span>
            ) : (
              <span className="truncate text-sm">Standalone reminder</span>
            )}
          </div>
          <span className="ml-2 shrink-0 text-muted-foreground text-xs">
            {formatDistanceToNow(new Date(reminder.triggerAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      ))}
    </div>
  );
}
