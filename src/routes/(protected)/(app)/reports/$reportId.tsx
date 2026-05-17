import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Eye, FileText, Hammer } from "lucide-react";
import { z } from "zod";

import { MOCK_REPORTS } from "#/reports/mock-data";
import { ReportBuilder } from "#/reports/report-builder";
import { ReportViewer } from "#/reports/report-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const searchSchema = z.object({
  tab: z.enum(["viewer", "builder"]).default("viewer"),
});

export const Route = createFileRoute("/(protected)/(app)/reports/$reportId")({
  component: ReportDetailPage,
  validateSearch: searchSchema,
});

const FREQUENCY_BADGE: Record<string, { className: string; label: string }> = {
  daily: {
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    label: "Daily",
  },
  monthly: {
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    label: "Monthly",
  },
  quarterly: {
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Quarterly",
  },
  weekly: {
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    label: "Weekly",
  },
};

function ReportDetailPage() {
  const { reportId } = Route.useParams();
  const navigate = Route.useNavigate();
  const { tab } = Route.useSearch();

  const report = MOCK_REPORTS.find((r) => r.id === reportId);

  function setTab(v: string) {
    navigate({ search: { tab: v as "viewer" | "builder" } });
  }

  if (!report) {
    return (
      <div className="space-y-6 p-6">
        <Button
          onClick={() => navigate({ to: "/reports" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Report not found</p>
      </div>
    );
  }

  const freq = FREQUENCY_BADGE[report.frequency] ?? {
    className: "",
    label: report.frequency,
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => navigate({ to: "/reports" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
            <FileText className="h-4 w-4 text-muted-foreground" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{report.name}</h2>
              <Badge className={freq.className} variant="outline">
                {freq.label}
              </Badge>
              {report.archived && <Badge variant="destructive">Archived</Badge>}
            </div>
            {report.description && (
              <p className="text-muted-foreground text-sm">
                {report.description}
              </p>
            )}
          </div>
        </div>
      </div>

      <Tabs onValueChange={setTab} value={tab}>
        <TabsList variant="line">
          <TabsTrigger value="viewer">
            <Eye className="mr-1.5 h-4 w-4" />
            Viewer
          </TabsTrigger>
          <TabsTrigger value="builder">
            <Hammer className="mr-1.5 h-4 w-4" />
            Builder
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "viewer" && <ReportViewer report={report} />}
      {tab === "builder" && <ReportBuilder reportId={report.id} />}
    </div>
  );
}
