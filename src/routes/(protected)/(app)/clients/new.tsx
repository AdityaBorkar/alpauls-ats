import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight } from "lucide-react";

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
      <div className="mb-6 flex h-12 flex-row items-center gap-1 border-neutral-300 border-b px-4">
        <Link to="/clients">Clients</Link>
        <ChevronRight className="mx-1 size-4.5" />
        <div>Create New</div>
        <div className="grow" />
        <p className="text-muted-foreground text-sm">
          Add a new client to the system
        </p>
      </div>

      <div className="mx-auto mt-16 max-w-2xl">
        <ClientForm
          isPending={createMutation.isPending}
          mode="create"
          onSubmit={(values) => createMutation.mutate(values)}
        />
      </div>
    </div>
  );
}
