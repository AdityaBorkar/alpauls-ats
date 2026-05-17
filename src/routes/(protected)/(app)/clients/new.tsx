import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { ClientForm } from "@/components/forms/client-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/clients/new")({
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (input: Record<string, any>) =>
      rpc.client.create.call(input as any),
    onSuccess: (data) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: ["client"] });
      navigate({
        params: { clientId: String(data.id) },
        to: "/clients/$clientId",
      });
    },
  });

  return (
    <div className="page-wrap w-full space-y-6 *:px-8">
      <div className="mb-6 flex h-12 items-center border-neutral-300 border-b px-4!">
        <Button
          onClick={() => navigate({ to: "/clients" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="display-title px-4 font-medium">Create Client</h1>
        <div className="grow" />
        <p className="text-muted-foreground text-sm">
          Add a new client to the system
        </p>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Client Details</CardTitle>
          <CardDescription>
            Enter the details for the new client
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ClientForm
            isPending={createMutation.isPending}
            mode="create"
            onSubmit={(values) => createMutation.mutate(values)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
