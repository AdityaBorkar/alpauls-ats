import { IconPlus, IconSearch } from "@tabler/icons-react";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";

import { MOCK_REPORTS } from "#/reports/mock-data";
import { ReportsTable } from "#/reports/reports-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const searchSchema = z.object({
  search: z.string().optional(),
});

export const Route = createFileRoute("/(protected)/(app)/reports/")({
  component: ReportsPage,
  validateSearch: searchSchema,
});

function ReportsPage() {
  const navigate = Route.useNavigate();
  const { search: searchParam } = Route.useSearch();
  const [search, setSearch] = useState(searchParam ?? "");

  function handleSearchChange(value: string) {
    setSearch(value);
    navigate({ search: { search: value || undefined } });
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Reports</h2>
          <p className="text-muted-foreground text-sm">
            Manage scheduled reports and their recipients
          </p>
        </div>
        <Button size="sm">
          <IconPlus className="mr-1 h-4 w-4" />
          New report
        </Button>
      </div>

      <div className="relative max-w-sm">
        <IconSearch className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          className="pl-8"
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search reports..."
          value={search}
        />
      </div>

      <ReportsTable isLoading={false} reports={MOCK_REPORTS} search={search} />
    </div>
  );
}
