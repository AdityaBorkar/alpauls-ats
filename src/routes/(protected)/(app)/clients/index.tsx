import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";

import type { ClientItem } from "@/components/client-list-view";
import { ClientListView } from "@/components/client-list-view";
import NavLayout from "@/components/layouts/nav-layout";

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
  validateSearch: z.object({}),
});

function ClientsPage() {
  const navigate = useNavigate();

  // TODO: Work on Filter Views

  return (
    <NavLayout
      baseUrl="/clients"
      label="Clients"
      leftItems={<div>FILTER ITEMS</div>}
      rightItems={
        <Link className="flex" to="/clients/new">
          <Plus className="mr-1.5 h-4 w-4" />
          New Client
        </Link>
      }
    >
      <ClientListView
        onItemClick={(client: ClientItem) =>
          navigate({
            params: { clientId: client.id },
            to: "/clients/$clientId",
          })
        }
      />
    </NavLayout>
  );
}
