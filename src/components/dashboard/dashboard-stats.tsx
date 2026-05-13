import {
  IconCircleCheck,
  IconClock,
  IconLoader2,
  IconTargetArrow,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { orpc } from "@/rpc/client";

export function DashboardStats() {
  const { data, isLoading } = useQuery(
    orpc.task.stats.queryOptions({ input: {} }),
  );

  const stats = [
    {
      className: "border-l-blue-500 border-l-4",
      description: "Total non-archived tasks",
      icon: IconTargetArrow,
      title: "Active Tasks",
      value: isLoading ? "…" : (data?.total ?? 0),
    },
    {
      className: "border-l-slate-400 border-l-4",
      description: "Tasks not yet started",
      icon: IconClock,
      title: "To Do",
      value: isLoading ? "…" : (data?.todo ?? 0),
    },
    {
      className: "border-l-amber-500 border-l-4",
      description: "Tasks currently being worked on",
      icon: IconLoader2,
      title: "In Progress",
      value: isLoading ? "…" : (data?.inProgress ?? 0),
    },
    {
      className: "border-l-emerald-500 border-l-4",
      description: "Deadlines within this week",
      icon: IconCircleCheck,
      title: "Due This Week",
      value: isLoading ? "…" : (data?.dueThisWeek ?? 0),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card className={stat.className} key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-sm">{stat.title}</CardTitle>
            <stat.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stat.value}</div>
            <p className="text-muted-foreground text-xs">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
