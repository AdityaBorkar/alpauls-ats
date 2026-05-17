import { IconPlus, IconSearch } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { rpc } from "@/rpc/client";
import { ContractsTable } from "@/templates/tables/contracts-table";

export const Route = createFileRoute("/(protected)/(app)/contracts/")({
  component: ContractsPage,
});

function ContractsPage() {
  const navigate = Route.useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery(
    rpc.contract.list.queryOptions({ input: {} }),
  );

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Contracts</h2>
          <p className="text-muted-foreground text-sm">
            Manage client contracts and agreements
          </p>
        </div>
        <Button onClick={() => navigate({ to: "/contracts/new" })} size="sm">
          <IconPlus className="mr-1 h-4 w-4" />
          New Contract
        </Button>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, reference, or client..."
          value={search}
        />
      </div>

      <ContractsTable
        contracts={data?.items ?? []}
        isLoading={isLoading}
        search={search}
      />
    </div>
  );
}
