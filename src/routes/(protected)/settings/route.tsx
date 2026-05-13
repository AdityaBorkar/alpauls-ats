import {
  createFileRoute,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";

export const Route = createFileRoute("/(protected)/settings")({
  component: SettingsLayout,
});

function SettingsLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathname = location.pathname;
  const activeTab = pathname.includes("/settings/roles") ? "roles" : "members";

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator className="mr-2 h-4" orientation="vertical" />
            <h1 className="font-semibold text-lg">Settings</h1>
          </header>
          <div className="border-b px-6">
            <Tabs
              onValueChange={(v) => {
                if (v === "members") {
                  navigate({ to: "/settings/members" });
                }
              }}
              value={activeTab}
            >
              <TabsList>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger disabled value="roles">
                  Roles
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Outlet />
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  );
}
