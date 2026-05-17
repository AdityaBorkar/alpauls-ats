import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, FileText } from "lucide-react";
import { useEffect, useState } from "react";

import type { ContractFormValues, UserOption } from "@/components/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { rpc } from "@/rpc/client";
import { ContractForm } from "@/templates/forms/contract-form";

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

function formatDate(date: string | null | undefined) {
  if (!date) return "—";
  try {
    return format(new Date(date), "MMM d, yyyy");
  } catch {
    return date;
  }
}

export const Route = createFileRoute(
  "/(protected)/(app)/contracts/$contractId",
)({
  component: ContractDetailPage,
});

function ContractDetailPage() {
  const { contractId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: contract, isLoading } = useQuery(
    rpc.contract.getById.queryOptions({ input: { id: Number(contractId) } }),
  );

  const { data: users } = useQuery(
    rpc.admin.listUsers.queryOptions({ input: {} }),
  );

  const userOptions: UserOption[] = (users ?? []).map((u) => ({
    email: u.email,
    id: u.id,
    name: u.name,
    role: u.role,
  }));

  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState<ContractFormValues>({
    assigneeId: null,
    clientId: null,
    description: "",
    endDate: "",
    pdfLink: "",
    referenceNumber: "",
    rmId: null,
    signedDate: "",
    startDate: "",
    status: "active",
    title: "",
  });

  useEffect(() => {
    if (contract) {
      setFormValues({
        assigneeId: contract.assigneeId ?? null,
        clientId: contract.clientId ?? null,
        description: contract.description ?? "",
        endDate: contract.endDate ?? "",
        pdfLink: contract.pdfLink ?? "",
        referenceNumber: contract.referenceNumber ?? "",
        rmId: contract.rmId ?? null,
        signedDate: contract.signedDate ?? "",
        startDate: contract.startDate ?? "",
        status: (contract.status as "active" | "inactive") ?? "active",
        title: contract.title ?? "",
      });
    }
  }, [contract]);

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      rpc.contract.update.call({
        id: Number(contractId),
        ...input,
      } as Parameters<typeof rpc.contract.update.call>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract"] });
      setIsEditing(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => rpc.contract.archive.call({ id: Number(contractId) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contract"] });
      navigate({ to: "/contracts" });
    },
  });

  function handleSubmit() {
    updateMutation.mutate({
      assigneeId: formValues.assigneeId ?? undefined,
      clientId: formValues.clientId ?? undefined,
      description: formValues.description || null,
      endDate: formValues.endDate || null,
      pdfLink: formValues.pdfLink || null,
      referenceNumber: formValues.referenceNumber || null,
      rmId: formValues.rmId || null,
      signedDate: formValues.signedDate || null,
      startDate: formValues.startDate || null,
      status: formValues.status,
      title: formValues.title,
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-60 w-full max-w-2xl" />
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="space-y-6 p-6">
        <Button
          onClick={() => navigate({ to: "/contracts" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Contract not found</p>
      </div>
    );
  }

  const status = STATUS_STYLES[contract.status ?? "active"] ?? {
    className: "",
    label: contract.status ?? "—",
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => navigate({ to: "/contracts" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold text-lg">{contract.title}</h2>
          <Badge className={status.className} variant="outline">
            {status.label}
          </Badge>
        </div>
      </div>

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contract Details</CardTitle>
            <CardDescription>
              View and edit contract information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ContractForm
                error={updateMutation.error?.message}
                isPending={updateMutation.isPending}
                mode="edit"
                onChange={setFormValues}
                onSubmit={handleSubmit}
                users={userOptions}
                values={formValues}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Reference Number
                  </span>
                  <span className="font-medium font-mono text-sm">
                    {contract.referenceNumber ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Client</span>
                  <span className="font-medium text-sm">
                    {contract.client?.name ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    BD Responsible
                  </span>
                  <span className="font-medium text-sm">
                    {contract.bd?.name ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    RM Responsible
                  </span>
                  <span className="font-medium text-sm">
                    {contract.rm?.name ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Start Date
                  </span>
                  <span className="font-medium text-sm">
                    {formatDate(contract.startDate)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    End Date
                  </span>
                  <span className="font-medium text-sm">
                    {formatDate(contract.endDate)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Signed Date
                  </span>
                  <span className="font-medium text-sm">
                    {formatDate(contract.signedDate)}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    PDF Link
                  </span>
                  {contract.pdfLink ? (
                    <a
                      className="font-medium text-primary text-sm underline hover:no-underline"
                      href={contract.pdfLink}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      View PDF
                    </a>
                  ) : (
                    <span className="font-medium text-sm">—</span>
                  )}
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Description
                  </span>
                  <span className="max-w-xs truncate font-medium text-sm">
                    {contract.description ?? "—"}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Created</span>
                  <span className="font-medium text-sm">
                    {contract.createdAt
                      ? format(new Date(contract.createdAt), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          {!isEditing && (
            <CardFooter className="gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                Edit contract
              </Button>
              <Button
                disabled={archiveMutation.isPending}
                onClick={() => archiveMutation.mutate()}
                size="sm"
                variant="destructive"
              >
                Archive
              </Button>
            </CardFooter>
          )}
          {isEditing && (
            <CardFooter>
              <Button
                onClick={() => {
                  setIsEditing(false);
                  if (contract) {
                    setFormValues({
                      assigneeId: contract.assigneeId ?? null,
                      clientId: contract.clientId ?? null,
                      description: contract.description ?? "",
                      endDate: contract.endDate ?? "",
                      pdfLink: contract.pdfLink ?? "",
                      referenceNumber: contract.referenceNumber ?? "",
                      rmId: contract.rmId ?? null,
                      signedDate: contract.signedDate ?? "",
                      startDate: contract.startDate ?? "",
                      status:
                        (contract.status as "active" | "inactive") ?? "active",
                      title: contract.title ?? "",
                    });
                  }
                }}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}
