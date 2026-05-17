import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { dotMatrixData } from "./stub-data";

const DOTS_PER_UNIT = 10;
const COLS = 25;

const allDots = dotMatrixData.flatMap((category) => {
  const dotCount = Math.ceil(category.count / DOTS_PER_UNIT);
  return Array.from({ length: dotCount }, (_, i) => ({
    category: category.category,
    fill: category.fill,
    id: `${category.category}-${i}`,
    partialCount:
      i === dotCount - 1
        ? category.count % DOTS_PER_UNIT || DOTS_PER_UNIT
        : DOTS_PER_UNIT,
    total: category.count,
  }));
});

const totalSlots = Math.ceil(allDots.length / COLS) * COLS;
const emptySlots = totalSlots - allDots.length;

export function AnalyticsDotMatrix() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Task Composition</CardTitle>
        <CardDescription>
          Each dot represents {DOTS_PER_UNIT} tasks, colored by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={100}>
          <div
            className="grid gap-1.5"
            style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          >
            {allDots.map((dot) => (
              <Tooltip key={dot.id}>
                <TooltipTrigger>
                  <span
                    className="block aspect-square rounded-full transition-opacity hover:opacity-80"
                    style={{
                      backgroundColor: dot.fill,
                      width: "100%",
                    }}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="font-medium">{dot.category}</span>:{" "}
                  {dot.partialCount} tasks
                </TooltipContent>
              </Tooltip>
            ))}
            {Array.from({ length: emptySlots }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: static spacer divs, no reordering
              <div key={`empty-${i}`} />
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-4 text-xs">
            {dotMatrixData.map((category) => (
              <div
                className="flex items-center gap-1.5"
                key={category.category}
              >
                <span
                  className="inline-block h-2 w-2 rounded-[2px]"
                  style={{ backgroundColor: category.fill }}
                />
                <span className="text-muted-foreground">
                  {category.category} ({category.count})
                </span>
              </div>
            ))}
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
