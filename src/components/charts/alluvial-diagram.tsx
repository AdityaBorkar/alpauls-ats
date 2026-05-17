import type {
  SankeyLinkProps,
  SankeyNodeOptions,
  SankeyNodeProps,
} from "recharts";
import { Sankey } from "recharts";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { alluvialData } from "./stub-data";

const sourceColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];
const targetColors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-5)",
];

const CustomNode = ((props: SankeyNodeProps) => {
  const { x, y, width, height, index, payload } = props;
  const isSource = index < 4;
  const color = isSource ? sourceColors[index] : targetColors[index - 4];

  return (
    <g>
      <rect
        fill={color}
        height={height}
        opacity={0.9}
        rx={4}
        ry={4}
        width={width}
        x={x}
        y={y}
      />
      <text
        fill="var(--card-foreground)"
        fontSize={12}
        fontWeight={500}
        textAnchor={isSource ? "end" : "start"}
        x={isSource ? x - 6 : x + width + 6}
        y={y + height / 2 + 4}
      >
        {payload.name}
      </text>
    </g>
  );
}) as SankeyNodeOptions;

const CustomLink = ((props: SankeyLinkProps) => {
  const { sourceX, targetX, sourceY, targetY, payload } = props;
  const { source, target } = payload;

  const midX = (sourceX + targetX) / 2;
  const color = sourceColors[source.depth % sourceColors.length];

  const sourceBottom = sourceY + source.dy;
  const targetBottom = targetY + target.dy;

  return (
    <path
      d={`M${sourceX},${sourceY}
          C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}
          L${targetX},${targetBottom}
          C${midX},${targetBottom} ${midX},${sourceBottom} ${sourceX},${sourceBottom}
          Z`}
      fill={color}
      opacity={0.2}
    />
  );
  // biome-ignore lint/suspicious/noExplicitAny: SankeyLinkOptions not exported from recharts
}) as any;

export function AnalyticsAlluvialDiagram() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Source-to-Status Flow</CardTitle>
        <CardDescription>
          How tasks from each source channel distribute across statuses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-center">
          <Sankey
            data={alluvialData}
            height={300}
            link={CustomLink}
            linkCurvature={0.5}
            margin={{ bottom: 0, left: 80, right: 80, top: 0 }}
            node={CustomNode}
            nodePadding={20}
            nodeWidth={16}
            width={700}
          />
        </div>
      </CardContent>
    </Card>
  );
}
