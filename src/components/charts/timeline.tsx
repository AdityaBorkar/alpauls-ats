import {
  CartesianGrid,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
} from "recharts";

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

import { timelineData } from "./stub-data";

const chartConfig = {
  milestone: { color: "var(--chart-1)", label: "Milestone" },
} satisfies ChartConfig;

const parsedData = timelineData.map((d) => ({
  ...d,
  ts: new Date(d.date).getTime(),
  y: 0,
}));

const minTs = parsedData[0]?.ts ?? 0;
const maxTs = parsedData[parsedData.length - 1]?.ts ?? 0;

function CustomMilestone(props: {
  cx?: number;
  cy?: number;
  payload?: { event: string; date: string };
}) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;

  return (
    <g>
      <line
        stroke="var(--color-milestone)"
        strokeDasharray="3 3"
        strokeOpacity={0.4}
        x1={cx}
        x2={cx}
        y1={cy - 60}
        y2={cy}
      />
      <circle
        cx={cx}
        cy={cy}
        fill="var(--color-milestone)"
        r={6}
        stroke="var(--card)"
        strokeWidth={2}
      />
      <text
        fill="var(--card-foreground)"
        fontSize={11}
        textAnchor="middle"
        x={cx}
        y={cy + 20}
      >
        {payload.event}
      </text>
      <text
        fill="var(--muted-foreground)"
        fontSize={10}
        textAnchor="middle"
        x={cx}
        y={cy + 34}
      >
        {new Date(payload.date).toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        })}
      </text>
    </g>
  );
}

export function AnalyticsTimeline() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Project Timeline</CardTitle>
        <CardDescription>Key milestones and events</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[280px] w-full" config={chartConfig}>
          <ScatterChart margin={{ bottom: 40, left: 20, right: 20, top: 60 }}>
            <CartesianGrid
              horizontal={false}
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="ts"
              domain={[
                minTs - (maxTs - minTs) * 0.05,
                maxTs + (maxTs - minTs) * 0.05,
              ]}
              tick={false}
              tickLine={false}
              type="number"
            />
            <ReferenceLine stroke="var(--border)" y={0} />
            <ChartTooltip
              content={<ChartTooltipContent hideLabel nameKey="event" />}
            />
            <Scatter data={parsedData} shape={<CustomMilestone />} />
          </ScatterChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
