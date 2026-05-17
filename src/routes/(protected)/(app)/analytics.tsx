import { createFileRoute } from "@tanstack/react-router";

import { AnalyticsActivityChart } from "@/components/charts/activity-chart";
import { AnalyticsAlluvialDiagram } from "@/components/charts/alluvial-diagram";
import { AnalyticsDistributionChart } from "@/components/charts/distribution-chart";
import { AnalyticsDotMatrix } from "@/components/charts/dot-matrix";
import { AnalyticsFunnelChart } from "@/components/charts/funnel-chart";
import { AnalyticsHeatmap } from "@/components/charts/heatmap";
import { AnalyticsKpiCards } from "@/components/charts/kpi-cards";
import { AnalyticsPriorityChart } from "@/components/charts/priority-chart";
import { AnalyticsStatusChart } from "@/components/charts/status-chart";
import { AnalyticsTimeline } from "@/components/charts/timeline";
import { AnalyticsTrendChart } from "@/components/charts/trend-chart";

export const Route = createFileRoute("/(protected)/(app)/analytics")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="space-y-6 p-6">
      <h1 className="font-semibold text-xl">Analytics</h1>
      <AnalyticsKpiCards />
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsTrendChart />
        <AnalyticsStatusChart />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsPriorityChart />
        <AnalyticsDistributionChart />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsTimeline />
        <AnalyticsFunnelChart />
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <AnalyticsHeatmap />
        <AnalyticsDotMatrix />
      </div>
      <AnalyticsAlluvialDiagram />
      <AnalyticsActivityChart />
    </div>
  );
}
