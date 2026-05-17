import { IconEyePlus } from "@tabler/icons-react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Plus } from "lucide-react";

import type { ClientItem } from "@/components/client-list-view";
import { ClientListView } from "@/components/client-list-view";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
});

function ClientsPage() {
  const navigate = useNavigate();

  function handleClientClick(client: ClientItem) {
    navigate({
      params: { clientId: String(client.id) },
      to: "/clients/$clientId",
    });
  }

  const filterViews = [
    { label: "Clients" },
    { default: true, label: "Active" },
    { label: "Inactive" },
    { label: "Archived" },
  ];

  return (
    <div className="page-wrap w-full *:px-8">
      {/*<Header />*/}
      <div className="mb-6 flex h-12 items-center border-neutral-300 border-b px-4!">
        {/*<h1 className="display-title border-neutral-300 border-r px-4 font-bold text-xl">
          Clients
        </h1>*/}
        <div className="flex flex-row items-center gap-1 px-4">
          {filterViews.map((view) => {
            return (
              <div
                className={cn(
                  "rounded-full px-3.5 py-1.5 font-medium",
                  view.default
                    ? "bg-neutral-800 text-white"
                    : "text-secondary-foreground hover:bg-neutral-300/80",
                )}
                key={view.label}
              >
                {view.label}
              </div>
            );
          })}
          <div className="flex size-7 items-center rounded-full border border-neutral-400 border-dashed opacity-50 hover:opacity-100">
            <IconEyePlus className="mx-auto size-4.5" />
          </div>
        </div>
        <div className="grow" />
        <Button
          className="flex"
          onClick={() => navigate({ to: "/clients/new" })}
        >
          <Plus className="mr-1.5 h-4 w-4" />
          New Client
        </Button>
      </div>

      <ClientListView onClientClick={handleClientClick} refreshKey={0} />
    </div>
  );
}
