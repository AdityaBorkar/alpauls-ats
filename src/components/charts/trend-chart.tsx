import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { trendData } from "./stub-data";

const chartConfig = {
  completed: { color: "var(--chart-2)", label: "Completed" },
  created: { color: "var(--chart-1)", label: "Created" },
} satisfies ChartConfig;

export function AnalyticsTrendChart() {
  const id = React.useId();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Trend</CardTitle>
        <CardDescription>
          Monthly task creation vs completion over the past year
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <AreaChart
            data={trendData}
            margin={{ bottom: 0, left: 0, right: 10, top: 10 }}
          >
            <defs>
              <linearGradient
                id={`${id}-fillCreated`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-created)"
                  stopOpacity={0.05}
                />
              </linearGradient>
              <linearGradient
                id={`${id}-fillCompleted`}
                x1="0"
                x2="0"
                y1="0"
                y2="1"
              >
                <stop
                  offset="5%"
                  stopColor="var(--color-completed)"
                  stopOpacity={0.3}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-completed)"
                  stopOpacity={0.05}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="month"
              tickLine={false}
              tickMargin={8}
            />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip content={<ChartTooltipContent indicator="dot" />} />
            <ChartLegend content={<ChartLegendContent />} />
            <Area
              dataKey="created"
              fill={`url(#${id}-fillCreated)`}
              stroke="var(--color-created)"
              strokeWidth={2}
              type="monotone"
            />
            <Area
              dataKey="completed"
              fill={`url(#${id}-fillCompleted)`}
              stroke="var(--color-completed)"
              strokeWidth={2}
              type="monotone"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
