import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";

import type { ClientItem } from "@/components/client-list-view";
import { ClientListView } from "@/components/client-list-view";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
  validateSearch: z.object({}),
});

function ClientsPage() {
  const navigate = useNavigate();

  return (
    <div className="page-wrap w-full *:px-8">
      <div className="mb-6 flex h-12 flex-row items-center gap-1 border-neutral-300 border-b px-4">
        <Link to="/clients">Clients</Link>

        <div className="grow" />
        <Button
          className="flex"
          onClick={() => navigate({ to: "/clients/new" })}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Client
        </Button>
      </div>

      <ClientListView
        onClientClick={(client: ClientItem) =>
          navigate({
            params: { clientId: String(client.id) },
            to: "/clients/$clientId",
          })
        }
      />
    </div>
  );
}
