import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { ReportFrequency, ReportItem } from "./types";

type ReportsTableProps = {
  isLoading: boolean;
  reports: ReportItem[];
  search: string;
};

const FREQUENCY_STYLES: Record<
  ReportFrequency,
  { label: string; className: string }
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

export function ReportsTable({
  isLoading,
  reports,
  search,
}: ReportsTableProps) {
  const navigate = useNavigate();

  const filtered = search
    ? reports.filter(
        (r) =>
          r.name.toLowerCase().includes(search.toLowerCase()) ||
          (r.description ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : reports;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Frequency</TableHead>
            <TableHead>Recipients</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Last updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static and never reordered
              <TableRow key={`report-skeleton-${i}`}>
                <TableCell>
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-56" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    <Skeleton className="h-6 w-6 rounded-full" />
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && filtered.length === 0 && (
            <TableRow>
              <TableCell
                className="text-center text-muted-foreground"
                colSpan={5}
              >
                {search ? "No reports match your search" : "No reports yet"}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            filtered.map((report) => {
              const freq = FREQUENCY_STYLES[report.frequency];
              return (
                <TableRow
                  className="cursor-pointer"
                  key={report.id}
                  onClick={() =>
                    navigate({
                      params: { reportId: report.id },
                      to: "/reports/$reportId",
                    })
                  }
                >
                  <TableCell>
                    <div>
                      <div className="font-medium">{report.name}</div>
                      {report.description && (
                        <div className="max-w-xs truncate text-muted-foreground text-sm">
                          {report.description}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={freq.className} variant="outline">
                      {freq.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {report.recipients.slice(0, 3).map((r) => (
                        <Avatar
                          className="h-6 w-6 border-2 border-background"
                          key={r.id}
                        >
                          {r.image && (
                            <AvatarImage alt={r.name} src={r.image} />
                          )}
                          <AvatarFallback className="text-[10px]">
                            {getInitials(r.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                      {report.recipients.length > 3 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted font-medium text-[10px] text-muted-foreground">
                          +{report.recipients.length - 3}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(report.updatedAt), "MMM d, yyyy")}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
