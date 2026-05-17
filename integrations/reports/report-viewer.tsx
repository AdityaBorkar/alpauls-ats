import { IconClock, IconSend, IconUser } from "@tabler/icons-react";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import type { ReportFrequency, ReportItem } from "./types";

const FREQUENCY_STYLES: Record<
  ReportFrequency,
  { className: string; label: string }
> = {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type ReportViewerProps = {
  report: ReportItem;
};

export function ReportViewer({ report }: ReportViewerProps) {
  const freq = FREQUENCY_STYLES[report.frequency];

  return (
    <div className="space-y-6">
      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconClock className="h-4 w-4" />
              Schedule
            </CardTitle>
            <CardDescription>
              How often this report is generated and delivered
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Frequency</span>
                <Badge className={freq.className} variant="outline">
                  {freq.label}
                </Badge>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Status</span>
                {report.archived ? (
                  <Badge variant="destructive">Archived</Badge>
                ) : (
                  <Badge
                    className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    variant="outline"
                  >
                    Active
                  </Badge>
                )}
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">Created</span>
                <span className="font-medium text-sm">
                  {format(new Date(report.createdAt), "MMM d, yyyy")}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground text-sm">
                  Last updated
                </span>
                <span className="font-medium text-sm">
                  {format(new Date(report.updatedAt), "MMM d, yyyy")}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconSend className="h-4 w-4" />
              Recipients
            </CardTitle>
            <CardDescription>People who receive this report</CardDescription>
          </CardHeader>
          <CardContent>
            {report.recipients.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No recipients configured
              </p>
            ) : (
              <div className="space-y-3">
                {report.recipients.map((recipient, i) => (
                  <div key={recipient.id}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        {recipient.image && (
                          <AvatarImage
                            alt={recipient.name}
                            src={recipient.image}
                          />
                        )}
                        <AvatarFallback>
                          {getInitials(recipient.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {recipient.name}
                      </span>
                    </div>
                    {i < report.recipients.length - 1 && (
                      <Separator className="mt-3" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IconUser className="h-4 w-4" />
              Report Output
            </CardTitle>
            <CardDescription>Latest generated report data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed bg-muted/30">
              <div className="text-center">
                <p className="font-medium text-muted-foreground text-sm">
                  Report output will appear here
                </p>
                <p className="mt-1 text-muted-foreground/70 text-xs">
                  Configure the report builder to generate data
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
