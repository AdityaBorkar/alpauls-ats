import { createFileRoute } from "@tanstack/react-router";

import { DashboardCalendar } from "@/components/dashboard/dashboard-calendar";
import { DashboardNotifications } from "@/components/dashboard/dashboard-notifications";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { DashboardTasksReminders } from "@/components/dashboard/dashboard-tasks-reminders";

export const Route = createFileRoute("/(protected)/(app)/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="font-semibold text-xl">Dashboard</h1>
      <DashboardStats />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <DashboardCalendar />
          <DashboardTasksReminders />
        </div>
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-6">
            <DashboardNotifications />
          </div>
        </div>
      </div>
    </div>
  );
}
