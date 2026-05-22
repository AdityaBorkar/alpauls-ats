import { createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { NuqsAdapter } from "nuqs/adapters/tanstack-router";

import PostHogProvider from "#/posthog/provider";
import { Devtools } from "@/components/devtools";
import { TooltipProvider } from "@/components/ui/tooltip";

import css from "./styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    links: [{ href: css, rel: "stylesheet" }],
    meta: [
      { charSet: "utf-8" },
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      { title: "Alpauls Recruitment" },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-sidebar">
        <NuqsAdapter>
          <PostHogProvider>
            <TooltipProvider>{children}</TooltipProvider>
            <Devtools />
          </PostHogProvider>
        </NuqsAdapter>
        <Scripts />
      </body>
    </html>
  );
}
