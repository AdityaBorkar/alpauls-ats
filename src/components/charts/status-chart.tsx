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
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import { statusData } from "./stub-data";

const chartConfig = {
  archived: { color: "var(--chart-5)", label: "Archived" },
  count: { label: "Tasks" },
  done: { color: "var(--chart-4)", label: "Done" },
  inProgress: { color: "var(--chart-2)", label: "In Progress" },
  inReview: { color: "var(--chart-3)", label: "In Review" },
  todo: { color: "var(--chart-1)", label: "To Do" },
} satisfies ChartConfig;

export function AnalyticsStatusChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tasks by Status</CardTitle>
        <CardDescription>Current distribution across statuses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <BarChart
            data={statusData}
            margin={{ bottom: 0, left: 0, right: 10, top: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              axisLine={false}
              dataKey="status"
              tickLine={false}
              tickMargin={8}
            />
            <YAxis axisLine={false} tickLine={false} tickMargin={8} />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
