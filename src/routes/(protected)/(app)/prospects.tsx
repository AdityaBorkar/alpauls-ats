import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useCallback, useState } from "react";

import type { ProspectItem } from "@/components/prospect.types";
import { ProspectDetailPanel } from "@/components/prospect-detail-panel";
import { ProspectListView } from "@/components/prospect-list-view";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/(protected)/(app)/prospects")({
  component: ProspectsPage,
});

function ProspectsPage() {
  const [selectedProspect, setSelectedProspect] = useState<ProspectItem | null>(
    null,
  );
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"view" | "create">("view");
  const [refreshKey, setRefreshKey] = useState(0);
  const onRefresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  function handleProspectClick(prospect: ProspectItem) {
    setSelectedProspect(prospect);
    setPanelMode("view");
    setPanelOpen(true);
  }

  function handleNewProspect() {
    setSelectedProspect(null);
    setPanelMode("create");
    setPanelOpen(true);
  }

  return (
    <div className="page-wrap py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="display-title font-bold text-3xl">Prospects</h1>
        <Button onClick={handleNewProspect}>
          <Plus className="mr-1.5 h-4 w-4" />
          New Prospect
        </Button>
      </div>

      <ProspectListView
        onProspectClick={handleProspectClick}
        refreshKey={refreshKey}
      />

      <ProspectDetailPanel
        mode={panelMode}
        onOpenChange={setPanelOpen}
        onRefresh={onRefresh}
        open={panelOpen}
        prospect={selectedProspect}
      />
    </div>
  );
}
