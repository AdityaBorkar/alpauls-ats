import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";

import type { ContractItem } from "@/components/types";
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

type ContractsTableProps = {
  contracts: ContractItem[];
  isLoading: boolean;
  search: string;
};

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  active: {
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    label: "Active",
  },
  inactive: {
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
    label: "Inactive",
  },
};

function formatDate(date: string | null) {
  if (!date) return "—";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export function ContractsTable({
  contracts,
  isLoading,
  search,
}: ContractsTableProps) {
  const navigate = useNavigate();

  const filtered = search
    ? contracts.filter(
        (c) =>
          c.title.toLowerCase().includes(search.toLowerCase()) ||
          (c.referenceNumber ?? "")
            .toLowerCase()
            .includes(search.toLowerCase()) ||
          (c.client?.name ?? "").toLowerCase().includes(search.toLowerCase()),
      )
    : contracts;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference #</TableHead>
            <TableHead>Client</TableHead>
            <TableHead>BD Responsible</TableHead>
            <TableHead>RM Responsible</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>End Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows are static
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-28" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
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
                colSpan={7}
              >
                {search ? "No contracts match your search" : "No contracts yet"}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            filtered.map((contract) => {
              const status = STATUS_STYLES[contract.status ?? "active"] ?? {
                className: "",
                label: contract.status ?? "—",
              };
              return (
                <TableRow
                  className="cursor-pointer"
                  key={contract.id}
                  onClick={() =>
                    navigate({
                      params: { contractId: String(contract.id) },
                      to: "/contracts/$contractId",
                    })
                  }
                >
                  <TableCell className="font-mono text-sm">
                    {contract.referenceNumber ?? "—"}
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{contract.title}</div>
                      {contract.client?.name && (
                        <div className="text-muted-foreground text-sm">
                          {contract.client.name}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">
                    {contract.bd?.name ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">
                    {contract.rm?.name ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge className={status.className} variant="outline">
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(contract.startDate)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(contract.endDate)}
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );
}
