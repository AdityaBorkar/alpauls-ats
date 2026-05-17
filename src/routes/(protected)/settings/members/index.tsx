import {
  IconHierarchy,
  IconPlus,
  IconSearch,
  IconTable,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { TeamHierarchyCanvas } from "@/components/team-hierarchy-canvas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { rpc } from "@/rpc/client";
import { MembersTable } from "@/templates/tables/members-table";

const searchSchema = z.object({
  view: z.enum(["table", "canvas"]).default("table"),
});

export const Route = createFileRoute("/(protected)/settings/members/")({
  component: MembersPage,
  validateSearch: searchSchema,
});

function MembersPage() {
  const navigate = Route.useNavigate();
  const { view } = Route.useSearch();
  const [search, setSearch] = useState("");

  const { data: members, isLoading } = useQuery(
    rpc.admin.listUsers.queryOptions({ input: {} }),
  );

  function setView(v: string) {
    navigate({ search: { view: v as "table" | "canvas" } });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Team Members</h2>
          <p className="text-muted-foreground text-sm">
            Manage your team members and their roles
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs onValueChange={setView} value={view}>
            <TabsList>
              <TabsTrigger value="table">
                <IconTable className="mr-1.5 h-4 w-4" />
                Table
              </TabsTrigger>
              <TabsTrigger value="canvas">
                <IconHierarchy className="mr-1.5 h-4 w-4" />
                Canvas
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => navigate({ to: "/settings/members/new" })}
            size="sm"
          >
            <IconPlus className="mr-1 h-4 w-4" />
            Add member
          </Button>
        </div>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email..."
          value={search}
        />
      </div>

      {view === "table" && (
        <MembersTable
          isLoading={isLoading}
          members={members ?? []}
          search={search}
        />
      )}
      {view === "canvas" && <TeamHierarchyCanvas members={members ?? []} />}
    </div>
  );
}
