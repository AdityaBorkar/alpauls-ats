import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import * as React from "react";

import { ChatPanel } from "@/components/agents/chat";
import { CommandPalette } from "@/components/command-palette";
import { ErrorPage } from "@/components/pages/error";
import { LoadingPage } from "@/components/pages/loading";
import { NotFoundPage } from "@/components/pages/not-found";
import { AppSidebar } from "@/components/sidebar";
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar";
import type { CommandPaletteMode } from "@/lib/actions";

import { getSession } from "../api/auth";

export const Route = createFileRoute("/(protected)")({
  beforeLoad: async () => {
    const session = await getSession();
    if (!session) {
      throw redirect({ to: "/" });
    }
    return session;
  },
  component: RouteComponent,
  errorComponent: ErrorPage,
  notFoundComponent: NotFoundPage,
  pendingComponent: LoadingPage,
});

function RouteComponent() {
  const [chatOpen, setChatOpen] = React.useState(false);
  const sidebarWidth = chatOpen ? "12.8rem" : "16rem";

  return (
    <SidebarProvider
      style={{ "--sidebar-width": sidebarWidth } as React.CSSProperties}
    >
      <ProtectedLayoutInner
        chatOpen={chatOpen}
        onChatOpenChange={setChatOpen}
      />
    </SidebarProvider>
  );
}

function ProtectedLayoutInner({
  chatOpen,
  onChatOpenChange,
}: {
  chatOpen: boolean;
  onChatOpenChange: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  const [paletteOpen, setPaletteOpen] = React.useState(false);
  const [paletteMode, setPaletteMode] =
    React.useState<CommandPaletteMode>("all");

  const { toggleSidebar } = useSidebar();

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteMode("all");
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleNewAction() {
    setPaletteMode("new");
    setPaletteOpen(true);
  }

  function handleGlobalAction(actionId: string) {
    if (actionId === "toggleSidebar") {
      toggleSidebar();
    } else if (actionId === "toggleChat") {
      onChatOpenChange((o) => !o);
    }
  }

  return (
    <div className="flex h-screen w-screen flex-row gap-2 overflow-auto bg-sidebar">
      <AppSidebar
        chatOpen={chatOpen}
        onChatToggle={() => onChatOpenChange((o) => !o)}
        onNewAction={handleNewAction}
      />
      <div className="my-2 flex w-full grow rounded-xl bg-background">
        <Outlet />
      </div>
      <ChatPanel onOpenChange={onChatOpenChange} open={chatOpen} />
      <CommandPalette
        mode={paletteMode}
        onAction={handleGlobalAction}
        onOpenChange={setPaletteOpen}
        open={paletteOpen}
      />
    </div>
  );
}
