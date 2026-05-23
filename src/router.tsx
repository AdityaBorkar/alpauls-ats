import { createRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";

import { getContext } from "#/tanstack-query/root-provider";
import { ErrorPage } from "@/components/pages/error";
import { LoadingPage } from "@/components/pages/loading";
import { NotFoundPage } from "@/components/pages/not-found";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const context = getContext();

  const router = createRouter({
    context,
    defaultErrorComponent: ({ error, reset }) => (
      <ErrorPage error={error} reset={reset} />
    ),
    defaultNotFoundComponent: () => <NotFoundPage />,
    defaultPendingComponent: () => <LoadingPage />,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 0,
    routeTree,
    scrollRestoration: true,
  });

  setupRouterSsrQueryIntegration({
    queryClient: context.queryClient,
    router,
  });

  return router;
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
