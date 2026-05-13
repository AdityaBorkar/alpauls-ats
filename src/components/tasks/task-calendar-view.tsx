import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from "date-fns";
import React, { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";

import type { TaskItem, TaskListResponse } from "./types";
import { STATUS_COLORS } from "./types";

type TaskCalendarViewProps = {
  onTaskClick: (task: TaskItem) => void;
  refreshKey: number;
};

export function TaskCalendarView({
  onTaskClick,
  refreshKey,
}: TaskCalendarViewProps) {
  const [calMode, setCalMode] = useState<"month" | "week">("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showArchived, setShowArchived] = useState(false);

  const rangeStart = useMemo(() => {
    if (calMode === "month")
      return format(startOfWeek(startOfMonth(currentDate)), "yyyy-MM-dd");
    return format(startOfWeek(currentDate), "yyyy-MM-dd");
  }, [currentDate, calMode]);

  const rangeEnd = useMemo(() => {
    if (calMode === "month")
      return format(endOfWeek(endOfMonth(currentDate)), "yyyy-MM-dd");
    return format(endOfWeek(currentDate), "yyyy-MM-dd");
  }, [currentDate, calMode]);

  const { data } = useORPCQuery(
    () =>
      client.task.list({
        archived: showArchived ? undefined : false,
        deadlineFrom: rangeStart,
        deadlineTo: rangeEnd,
        limit: 200,
      }),
    [refreshKey, rangeStart, rangeEnd, showArchived],
  );

  const tasks = (data as TaskListResponse | undefined)?.items ?? [];

  const days = useMemo(() => {
    if (calMode === "month") {
      return eachDayOfInterval({
        end: endOfWeek(endOfMonth(currentDate)),
        start: startOfWeek(startOfMonth(currentDate)),
      });
    }
    return eachDayOfInterval({
      end: endOfWeek(currentDate),
      start: startOfWeek(currentDate),
    });
  }, [currentDate, calMode]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of tasks) {
      if (task.deadline) {
        const arr = map.get(task.deadline) ?? [];
        arr.push(task);
        map.set(task.deadline, arr);
      }
    }
    return map;
  }, [tasks]);

  const weekTasksByDate = useMemo(() => {
    const map = new Map<string, TaskItem[]>();
    for (const task of tasks) {
      if (task.deadline) {
        const arr = map.get(task.deadline) ?? [];
        if (!arr.includes(task)) arr.push(task);
        map.set(task.deadline, arr);
      }
      if (task.startDate && task.deadline) {
        const start = new Date(task.startDate);
        const end = new Date(task.deadline);
        const current = new Date(start);
        while (current <= end) {
          const key = format(current, "yyyy-MM-dd");
          const arr = map.get(key) ?? [];
          if (!arr.includes(task)) arr.push(task);
          map.set(key, arr);
          current.setDate(current.getDate() + 1);
        }
      }
    }
    return map;
  }, [tasks]);

  function navigate(direction: "prev" | "next") {
    if (calMode === "month") {
      setCurrentDate(
        direction === "next"
          ? addMonths(currentDate, 1)
          : subMonths(currentDate, 1),
      );
    } else {
      setCurrentDate(
        direction === "next"
          ? addWeeks(currentDate, 1)
          : subWeeks(currentDate, 1),
      );
    }
  }

  if (calMode === "week") {
    return (
      <WeekView
        calMode={calMode}
        currentDate={currentDate}
        days={days}
        onNavigate={navigate}
        onTaskClick={onTaskClick}
        setCalMode={setCalMode}
        setShowArchived={setShowArchived}
        showArchived={showArchived}
        tasksByDate={weekTasksByDate}
      />
    );
  }

  return (
    <div className="space-y-4">
      <CalendarHeader
        calMode={calMode}
        currentDate={currentDate}
        onNavigate={navigate}
        setCalMode={setCalMode}
        setShowArchived={setShowArchived}
        showArchived={showArchived}
      />
      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            className="bg-muted px-2 py-1.5 text-center font-medium text-xs"
            key={day}
          >
            {day}
          </div>
        ))}
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const dayTasks = tasksByDate.get(key) ?? [];
          const inMonth = isSameMonth(day, currentDate);
          return (
            <div
              className={`min-h-[100px] bg-card p-1.5 ${!inMonth ? "opacity-40" : ""}`}
              key={key}
            >
              <div
                className={`mb-1 text-xs ${isToday(day) ? "rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-foreground" : "text-muted-foreground"}`}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    className={`w-full truncate rounded px-1 py-0.5 text-left text-xs ${STATUS_COLORS[task.status]} cursor-pointer`}
                    key={task.id}
                    onClick={() => onTaskClick(task)}
                    type="button"
                  >
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <span className="text-muted-foreground text-xs">
                    +{dayTasks.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarHeader({
  currentDate,
  onNavigate,
  calMode,
  setCalMode,
  showArchived,
  setShowArchived,
}: {
  currentDate: Date;
  onNavigate: (d: "prev" | "next") => void;
  calMode: "month" | "week";
  setCalMode: (m: "month" | "week") => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Button onClick={() => onNavigate("prev")} size="sm" variant="outline">
          Prev
        </Button>
        <h3 className="min-w-[160px] text-center font-semibold text-sm">
          {format(
            currentDate,
            calMode === "month" ? "MMMM yyyy" : "MMM d, yyyy",
          )}
        </h3>
        <Button onClick={() => onNavigate("next")} size="sm" variant="outline">
          Next
        </Button>
      </div>
      <div className="flex items-center gap-3">
        <Select
          onValueChange={(v: string | null) =>
            setCalMode(v as "month" | "week")
          }
          value={calMode}
        >
          <SelectTrigger className="w-[100px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Monthly</SelectItem>
            <SelectItem value="week">Weekly</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showArchived}
            id="cal-archived"
            onCheckedChange={(v: boolean) => setShowArchived(!!v)}
          />
          <label
            className="text-muted-foreground text-sm"
            htmlFor="cal-archived"
          >
            Show archived
          </label>
        </div>
      </div>
    </div>
  );
}

function WeekView({
  days,
  tasksByDate,
  currentDate,
  onNavigate,
  calMode,
  setCalMode,
  showArchived,
  setShowArchived,
  onTaskClick,
}: {
  days: Date[];
  tasksByDate: Map<string, TaskItem[]>;
  currentDate: Date;
  onNavigate: (d: "prev" | "next") => void;
  calMode: "month" | "week";
  setCalMode: (m: "month" | "week") => void;
  showArchived: boolean;
  setShowArchived: (v: boolean) => void;
  onTaskClick: (task: TaskItem) => void;
}) {
  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  return (
    <div className="space-y-4">
      <CalendarHeader
        calMode={calMode}
        currentDate={currentDate}
        onNavigate={onNavigate}
        setCalMode={setCalMode}
        setShowArchived={setShowArchived}
        showArchived={showArchived}
      />
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[40px_repeat(7,1fr)] gap-px border bg-border">
            <div className="bg-muted" />
            {days.map((day) => (
              <div
                className={`bg-muted px-1 py-1.5 text-center font-medium text-xs ${isToday(day) ? "text-primary" : ""}`}
                key={day.toISOString()}
              >
                <div>{format(day, "EEE")}</div>
                <div
                  className={
                    isToday(day)
                      ? "rounded-full bg-primary px-1.5 py-0.5 font-bold text-primary-foreground"
                      : ""
                  }
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
            {hours.map((hour) => (
              <React.Fragment key={`h-${hour}`}>
                <div className="bg-card px-1 py-0.5 text-right text-muted-foreground text-xs">
                  {hour}:00
                </div>
                {days.map((day) => {
                  const key = format(day, "yyyy-MM-dd");
                  const dayTasks = tasksByDate.get(key) ?? [];
                  return (
                    <div
                      className="min-h-[32px] border-t bg-card p-0.5"
                      key={`${key}-${hour}`}
                    >
                      {hour === 9 &&
                        dayTasks
                          .filter(
                            (t) =>
                              t.startDate &&
                              t.deadline &&
                              format(new Date(t.startDate), "yyyy-MM-dd") ===
                                key,
                          )
                          .map((task) => (
                            <button
                              className={`mb-0.5 w-full truncate rounded px-1 py-0.5 text-left text-xs ${STATUS_COLORS[task.status]} cursor-pointer`}
                              key={task.id}
                              onClick={() => onTaskClick(task)}
                              type="button"
                            >
                              {task.title}
                            </button>
                          ))}
                      {hour === 9 &&
                        dayTasks
                          .filter((t) => !t.startDate && t.deadline === key)
                          .map((task) => (
                            <Badge
                              className={`text-xs ${STATUS_COLORS[task.status]} cursor-pointer`}
                              key={task.id}
                              onClick={() => onTaskClick(task)}
                              variant="outline"
                            >
                              {task.title}
                            </Badge>
                          ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
