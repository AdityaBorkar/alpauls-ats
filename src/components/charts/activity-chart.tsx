import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

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

import { activityData } from "./stub-data";

const chartConfig = {
  assigned: { color: "var(--chart-1)", label: "Assigned" },
  completed: { color: "var(--chart-4)", label: "Completed" },
  overdue: { color: "var(--chart-5)", label: "Overdue" },
} satisfies ChartConfig;

export function AnalyticsActivityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Monthly Activity</CardTitle>
        <CardDescription>
          Breakdown of assigned, completed, and overdue tasks
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <BarChart
            data={activityData}
            margin={{ bottom: 0, left: 0, right: 10, top: 10 }}
          >
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
            <Bar
              dataKey="assigned"
              fill="var(--color-assigned)"
              radius={[0, 0, 0, 0]}
              stackId="activity"
            />
            <Bar
              dataKey="completed"
              fill="var(--color-completed)"
              radius={[0, 0, 0, 0]}
              stackId="activity"
            />
            <Bar
              dataKey="overdue"
              fill="var(--color-overdue)"
              radius={[4, 4, 0, 0]}
              stackId="activity"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
