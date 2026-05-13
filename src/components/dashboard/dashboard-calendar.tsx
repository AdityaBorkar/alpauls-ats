import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";

import type { TaskListResponse } from "../tasks/types";

export function DashboardCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);

  const rangeStart = format(calStart, "yyyy-MM-dd");
  const rangeEnd = format(calEnd, "yyyy-MM-dd");

  const { data } = useORPCQuery(
    () =>
      client.task.list({
        archived: false,
        deadlineFrom: rangeStart,
        deadlineTo: rangeEnd,
        limit: 200,
      }),
    [rangeStart, rangeEnd],
  );

  const tasks = (data as TaskListResponse | undefined)?.items ?? [];

  const tasksByDate = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      if (task.deadline) {
        map.set(task.deadline, (map.get(task.deadline) ?? 0) + 1);
      }
    }
    return map;
  }, [tasks]);

  const days = useMemo(
    () => eachDayOfInterval({ end: calEnd, start: calStart }),
    [calStart, calEnd],
  );

  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="font-semibold text-sm">
          {format(currentDate, "MMMM yyyy")}
        </CardTitle>
        <div className="flex gap-1">
          <Button
            onClick={() => setCurrentDate(subMonths(currentDate, 1))}
            size="icon"
            variant="ghost"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setCurrentDate(addMonths(currentDate, 1))}
            size="icon"
            variant="ghost"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px">
          {weekDays.map((d) => (
            <div
              className="py-1 text-center text-muted-foreground text-xs"
              key={d}
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const count = tasksByDate.get(key);
            const inMonth = isSameMonth(day, currentDate);
            const today = isToday(day);

            return (
              <div
                className={`flex flex-col items-center justify-center py-1.5 text-sm ${
                  !inMonth ? "text-muted-foreground/40" : ""
                } ${today ? "font-bold" : ""}`}
                key={key}
              >
                <span
                  className={`leading-none ${
                    today
                      ? "flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
                {count && inMonth ? (
                  <div className="mt-0.5 flex gap-0.5">
                    {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                      <span
                        className={`size-1.5 rounded-full ${
                          i === 0
                            ? "bg-blue-500"
                            : i === 1
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                        key={`${key}-${i}`}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="mt-0.5 h-3" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
