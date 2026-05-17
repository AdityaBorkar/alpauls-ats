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

import { heatmapData } from "./stub-data";

const timeSlots = ["morning", "midday", "afternoon", "evening"] as const;
const timeLabels = {
  afternoon: "Afternoon",
  evening: "Evening",
  midday: "Midday",
  morning: "Morning",
};

function getHeatLevel(value: number): string {
  if (value >= 80) return "bg-chart-1";
  if (value >= 60) return "bg-chart-2";
  if (value >= 40) return "bg-chart-3";
  if (value >= 20) return "bg-chart-4";
  return "bg-chart-5/40";
}

export function AnalyticsHeatmap() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Heatmap</CardTitle>
        <CardDescription>
          Task activity intensity by day and time of day
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TooltipProvider delay={100}>
          <div className="space-y-1">
            <div className="grid grid-cols-[4rem_repeat(4,1fr)] gap-1">
              <div />
              {timeSlots.map((slot) => (
                <div
                  className="text-center font-medium text-muted-foreground text-xs"
                  key={slot}
                >
                  {timeLabels[slot]}
                </div>
              ))}
            </div>
            {heatmapData.map((row) => (
              <div
                className="grid grid-cols-[4rem_repeat(4,1fr)] gap-1"
                key={row.day}
              >
                <div className="flex items-center font-medium text-muted-foreground text-xs">
                  {row.day}
                </div>
                {timeSlots.map((slot) => (
                  <Tooltip key={slot}>
                    <TooltipTrigger>
                      <div
                        className={`h-8 w-full cursor-default rounded-sm transition-opacity hover:opacity-80 ${getHeatLevel(row[slot])}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium">
                        {row.day} {timeLabels[slot]}
                      </span>
                      : {row[slot]} tasks
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
            ))}
            <div className="flex items-center justify-end gap-1 pt-2">
              <span className="text-muted-foreground text-xs">Less</span>
              <div className="h-2.5 w-4 rounded-sm bg-chart-5/40" />
              <div className="h-2.5 w-4 rounded-sm bg-chart-4" />
              <div className="h-2.5 w-4 rounded-sm bg-chart-3" />
              <div className="h-2.5 w-4 rounded-sm bg-chart-2" />
              <div className="h-2.5 w-4 rounded-sm bg-chart-1" />
              <span className="text-muted-foreground text-xs">More</span>
            </div>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
