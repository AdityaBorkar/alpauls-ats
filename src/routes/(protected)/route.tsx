import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { ErrorPage } from "@/components/pages/error";
import { LoadingPage } from "@/components/pages/loading";
import { NotFoundPage } from "@/components/pages/not-found";
import { getSession } from "@/server/auth";

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
  return (
    <div>
      <Outlet />
    </div>
  );
}
