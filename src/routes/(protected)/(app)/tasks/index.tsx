import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Columns3, List, Plus } from "lucide-react";
import { useCallback, useState } from "react";
import { z } from "zod";

import { TaskCalendarView } from "@/components/tasks/task-calendar-view";
import { TaskDetailPanel } from "@/components/tasks/task-detail-panel";
import { TaskKanbanView } from "@/components/tasks/task-kanban-view";
import { TaskListView } from "@/components/tasks/task-list-view";
import type { TaskItem } from "@/components/tasks/types";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  view: z.enum(["list", "kanban", "calendar"]).default("list"),
});

export const Route = createFileRoute("/(protected)/(app)/tasks/")({
  component: TasksPage,
  validateSearch: searchSchema,
});

function TasksPage() {
  const { view } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"view" | "create">("view");
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function handleTaskClick(task: TaskItem) {
    setSelectedTask(task);
    setPanelMode("view");
    setPanelOpen(true);
  }

  function handleNewTask() {
    setSelectedTask(null);
    setPanelMode("create");
    setPanelOpen(true);
  }

  function setView(v: string) {
    navigate({ search: { view: v as "list" | "kanban" | "calendar" } });
  }

  return (
    <div className="page-wrap py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display-title font-bold text-3xl">Tasks</h1>
        <div className="flex items-center gap-3">
          <Tabs onValueChange={setView} value={view}>
            <TabsList>
              <TabsTrigger value="list">
                <List className="mr-1.5 h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="kanban">
                <Columns3 className="mr-1.5 h-4 w-4" />
                Kanban
              </TabsTrigger>
              <TabsTrigger value="calendar">
                <Calendar className="mr-1.5 h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleNewTask}>
            <Plus className="mr-1.5 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      {view === "list" && (
        <TaskListView onTaskClick={handleTaskClick} refreshKey={refreshKey} />
      )}
      {view === "kanban" && (
        <TaskKanbanView onTaskClick={handleTaskClick} refreshKey={refreshKey} />
      )}
      {view === "calendar" && (
        <TaskCalendarView
          onTaskClick={handleTaskClick}
          refreshKey={refreshKey}
        />
      )}

      <TaskDetailPanel
        mode={panelMode}
        onOpenChange={setPanelOpen}
        onRefresh={onRefresh}
        open={panelOpen}
        task={selectedTask}
      />
    </div>
  );
}
