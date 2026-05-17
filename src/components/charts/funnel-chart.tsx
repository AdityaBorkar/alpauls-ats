import type { TrapezoidProps } from "recharts";
import { Funnel, FunnelChart, LabelList } from "recharts";

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

import { funnelData } from "./stub-data";

const chartConfig = {
  closed: { color: "var(--chart-5)", label: "Closed" },
  leads: { color: "var(--chart-1)", label: "Leads" },
  negotiation: { color: "var(--chart-4)", label: "Negotiation" },
  proposal: { color: "var(--chart-3)", label: "Proposal" },
  qualified: { color: "var(--chart-2)", label: "Qualified" },
} satisfies ChartConfig;

function CustomTrapezoid(
  props: TrapezoidProps & { payload?: { name: string; value: number } },
) {
  const { x, y, upperWidth, lowerWidth, height, fill } = props;
  const payload = props.payload as { name: string; value: number } | undefined;

  if (
    x === undefined ||
    y === undefined ||
    upperWidth === undefined ||
    lowerWidth === undefined ||
    height === undefined
  ) {
    return null;
  }

  const percentage = payload?.value
    ? Math.round((payload.value / funnelData[0].value) * 100)
    : 0;

  const centerX = x + upperWidth / 2;
  const lowerCenterX = x + lowerWidth / 2;

  const path = `M${x},${y}
    L${x + upperWidth},${y}
    L${lowerCenterX + lowerWidth / 2},${y + height}
    L${lowerCenterX - lowerWidth / 2},${y + height}
    Z`;

  return (
    <g>
      <path d={path} fill={fill as string} opacity={0.9} />
      <text
        fill="var(--card-foreground)"
        fontSize={13}
        fontWeight={600}
        textAnchor="middle"
        x={centerX}
        y={y + height / 2 - 6}
      >
        {payload?.name}
      </text>
      <text
        fill="var(--muted-foreground)"
        fontSize={11}
        textAnchor="middle"
        x={centerX}
        y={y + height / 2 + 10}
      >
        {payload?.value?.toLocaleString()} ({percentage}%)
      </text>
    </g>
  );
}

export function AnalyticsFunnelChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Conversion Funnel</CardTitle>
        <CardDescription>
          Pipeline progression from leads to closed
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[300px] w-full" config={chartConfig}>
          <FunnelChart>
            <ChartTooltip
              content={<ChartTooltipContent hideLabel />}
              cursor={false}
            />
            <Funnel
              animationBegin={100}
              animationDuration={800}
              data={funnelData}
              dataKey="value"
              lastShapeType="rectangle"
              nameKey="name"
              shape={<CustomTrapezoid />}
            >
              <LabelList
                dataKey="name"
                fill="transparent"
                position="right"
                stroke="none"
              />
            </Funnel>
          </FunnelChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
