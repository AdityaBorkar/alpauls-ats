// import { PostHogProvider as BasePostHogProvider } from "@posthog/react";
// import posthog from "posthog-js";

// if (typeof window !== "undefined" && import.meta.env.VITE_POSTHOG_KEY) {
//   posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
//     api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
//     capture_pageview: false,
//     defaults: "2025-11-30",
//     person_profiles: "identified_only",
//   });
// }

export default function PostHogProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
  // return <BasePostHogProvider client={posthog}>{children}</BasePostHogProvider>;
}
