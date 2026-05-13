import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(protected)/settings/")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/members" });
  },
});
