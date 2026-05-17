import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ContractForm } from "@/components/forms/contract-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/contracts/new")({
  component: NewContractPage,
});

function NewContractPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: Record<string, any>) =>
      rpc.contract.create.call(input as any),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["contract"] });
      if (data) {
        navigate({
          params: { contractId: String(data.id) },
          to: "/contracts/$contractId",
        });
      }
    },
  });

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
        <div>
          <h2 className="font-semibold text-lg">New Contract</h2>
          <p className="text-muted-foreground text-sm">
            Create a new client contract
          </p>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Contract Details</CardTitle>
          <CardDescription>
            Enter the details for the new contract
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ContractForm
            isPending={createMutation.isPending}
            mode="create"
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
