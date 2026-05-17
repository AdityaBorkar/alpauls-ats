import {
  IconAlertTriangle,
  IconChartBar,
  IconCircleCheck,
  IconClock,
} from "@tabler/icons-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { kpiData } from "./stub-data";

function Delta({ value }: { value: number }) {
  const isPositive = value > 0;
  const isNeutral = value === 0;
  const color = isNeutral
    ? "text-muted-foreground"
    : isPositive
      ? "text-emerald-600"
      : "text-rose-500";
  const arrow = isNeutral ? "" : isPositive ? "↑" : "↓";

  return (
    <span className={`font-medium text-xs ${color}`}>
      {arrow} {Math.abs(value)}%
    </span>
  );
}

const stats = [
  {
    className: "border-l-blue-500 border-l-4",
    delta: kpiData.totalTasksDelta,
    description: "vs last period",
    icon: IconChartBar,
    title: "Total Tasks",
    value: kpiData.totalTasks.toLocaleString(),
  },
  {
    className: "border-l-emerald-500 border-l-4",
    delta: kpiData.completionRateDelta,
    description: "vs last period",
    icon: IconCircleCheck,
    title: "Completion Rate",
    value: `${kpiData.completionRate}%`,
  },
  {
    className: "border-l-amber-500 border-l-4",
    delta: kpiData.avgCompletionDaysDelta,
    description: "vs last period",
    icon: IconClock,
    title: "Avg Completion Time",
    value: `${kpiData.avgCompletionDays} days`,
  },
  {
    className: "border-l-rose-500 border-l-4",
    delta: kpiData.overdueTasksDelta,
    description: "vs last period",
    icon: IconAlertTriangle,
    title: "Overdue Tasks",
    value: kpiData.overdueTasks.toString(),
  },
];

export function AnalyticsKpiCards() {
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
            <div className="flex items-center gap-1.5">
              <Delta value={stat.delta} />
              <p className="text-muted-foreground text-xs">
                {stat.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
