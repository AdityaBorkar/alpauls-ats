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

import { priorityData } from "./stub-data";

const chartConfig = {
  count: { color: "var(--chart-3)", label: "Tasks" },
  high: { color: "var(--chart-1)", label: "High" },
  low: { color: "var(--chart-4)", label: "Low" },
  medium: { color: "var(--chart-2)", label: "Medium" },
  urgent: { color: "var(--chart-5)", label: "Urgent" },
} satisfies ChartConfig;

const coloredData = priorityData.map((d) => {
  const key = d.priority.toLowerCase() as keyof typeof chartConfig;
  return { ...d, fill: `var(--color-${key})` };
});

export function AnalyticsPriorityChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks by Priority</CardTitle>
        <CardDescription>Distribution across priority levels</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <BarChart
            data={coloredData}
            layout="vertical"
            margin={{ bottom: 0, left: 10, right: 10, top: 10 }}
          >
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis
              axisLine={false}
              tickLine={false}
              tickMargin={8}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="priority"
              tickLine={false}
              type="category"
              width={60}
            />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
