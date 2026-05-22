import { IconSparkles } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import type { ClientItem } from "@/components/client-list-view";
import { ClientListView } from "@/components/client-list-view";
import { NewFilterView } from "@/components/data-table-layout/new-filter-view";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import { rpc } from "@/rpc/client";

const searchSchema = z.object({
  view: z.string().default("clients-active"),
});

export const Route = createFileRoute("/(protected)/(app)/clients/")({
  component: ClientsPage,
  validateSearch: searchSchema,
});

type FilterView = {
  createdAt: Date | null;
  display: {
    fields: string[];
    groupBy: string | null;
    orderBy: string;
    orderType: string;
    type: string;
  };
  domain: string;
  id: string;
  isSystemCreated: boolean;
  label: string;
  refine: { field: string; op: string; value: string }[];
  updatedAt: Date | null;
};

function ClientsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { view: activeView } = Route.useSearch();

  const { data: filterViews } = useQuery(
    rpc.filterView.list.queryOptions({ input: { domain: "clients" } }),
  );

  const views = (filterViews ?? []) as FilterView[];

  const deleteMutation = useMutation({
    mutationFn: (input: { id: string }) => rpc.filterView.delete.call(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filterView"] });
      navigate({ search: { view: "clients-active" }, to: "/clients" });
    },
  });

  function handleDelete(view: FilterView) {
    deleteMutation.mutate({ id: view.id });
  }

  function handleCopyLink(viewId: string) {
    const url = `${window.location.origin}/clients?view=${viewId}`;
    navigator.clipboard.writeText(url);
  }

  return (
    <div className="page-wrap w-full *:px-8">
      <div className="mb-6 flex h-12 flex-row items-center gap-1 border-neutral-300 border-b px-4">
        <Link to="/clients">Clients</Link>
        <ChevronRight className="mx-1 size-4.5" />
        {views.map((view) => (
          <FilterViewButton
            isActive={view.id === activeView}
            isSystemCreated={view.isSystemCreated}
            key={view.id}
            label={view.label}
            onCopyLink={() => handleCopyLink(view.id)}
            onDelete={() => handleDelete(view)}
            onEdit={
              () => {}
              // handleEditOpen(view)
            }
            viewId={view.id}
          />
        ))}
        <NewFilterView />

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
        domain="clients"
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

function FilterViewButton({
  isActive,
  isSystemCreated,
  label,
  onCopyLink,
  onDelete,
  onEdit,
  viewId,
}: {
  isActive: boolean;
  isSystemCreated: boolean;
  label: string;
  onCopyLink: () => void;
  onDelete: () => void;
  onEdit: () => void;
  viewId: string;
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        className={cn(
          "rounded-full px-3.5 py-1.5 font-medium",
          isActive
            ? "bg-neutral-800 text-white"
            : "text-secondary-foreground hover:bg-neutral-300/80",
        )}
      >
        <Link search={{ view: viewId }} to="/clients">
          {label}
        </Link>
      </ContextMenuTrigger>
      <ContextMenuContent>
        {!isSystemCreated && (
          <>
            <ContextMenuItem onClick={onEdit}>
              <Pencil />
              Edit
            </ContextMenuItem>
            <ContextMenuItem onClick={onDelete} variant="destructive">
              <Trash2 />
              Delete
            </ContextMenuItem>
            <ContextMenuSeparator />
          </>
        )}
        <ContextMenuItem onClick={onCopyLink}>
          <Link2 />
          Copy Link
        </ContextMenuItem>
        <ContextMenuItem>
          <IconSparkles className="size-4" />
          Ask AI
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
