import { Cell, Label, Pie, PieChart } from "recharts";

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

import { teamData } from "./stub-data";

const chartConfig = {
  alex: { color: "var(--chart-1)", label: "Alex M." },
  james: { color: "var(--chart-3)", label: "James L." },
  lin: { color: "var(--chart-1)", label: "Lin W." },
  omar: { color: "var(--chart-5)", label: "Omar S." },
  priya: { color: "var(--chart-4)", label: "Priya R." },
  sarah: { color: "var(--chart-2)", label: "Sarah K." },
  tasks: { label: "Tasks" },
} satisfies ChartConfig;

const totalTasks = teamData.reduce((sum, t) => sum + t.tasks, 0);

export function AnalyticsDistributionChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Distribution</CardTitle>
        <CardDescription>Tasks assigned per team member</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          className="mx-auto h-[300px] w-full"
          config={chartConfig}
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie
              data={teamData}
              dataKey="tasks"
              innerRadius={70}
              nameKey="name"
              outerRadius={110}
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
            >
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    return (
                      <text
                        dominantBaseline="middle"
                        textAnchor="middle"
                        x={viewBox.cx}
                        y={viewBox.cy}
                      >
                        <tspan
                          className="fill-foreground font-bold text-2xl"
                          x={viewBox.cx}
                          y={viewBox.cy}
                        >
                          {totalTasks.toLocaleString()}
                        </tspan>
                        <tspan
                          className="fill-muted-foreground text-xs"
                          x={viewBox.cx}
                          y={(viewBox.cy ?? 0) + 20}
                        >
                          Total
                        </tspan>
                      </text>
                    );
                  }
                }}
              />
              {teamData.map((entry) => (
                <Cell fill={entry.fill} key={entry.name} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs">
          {teamData.map((member) => (
            <div className="flex items-center gap-1.5" key={member.name}>
              <span
                className="inline-block h-2 w-2 rounded-[2px]"
                style={{
                  backgroundColor: `var(--color-${member.name.split(" ")[0].toLowerCase()})`,
                }}
              />
              <span className="text-muted-foreground">{member.name}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
