import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";

import { ClientForm } from "@/components/forms/client-form";
import NavLayout from "@/components/layouts/nav-layout";

export const Route = createFileRoute("/(protected)/(app)/clients/new")({
  component: NewClientPage,
  validateSearch: z.object({
    draftId: z.string().optional(),
  }),
});

function NewClientPage() {
  const { draftId } = useSearch({ from: Route.id });

  return (
    <NavLayout
      baseUrl="/clients"
      label="Clients"
      leftItems={<div>Create New</div>}
      rightItems={
        <p className="text-muted-foreground text-sm">
          Add a new client to the system
        </p>
      }
    >
      <div className="mx-auto my-16 max-w-xl">
        <ClientForm draftId={draftId} mode="create" />
      </div>
    </NavLayout>
  );
}
