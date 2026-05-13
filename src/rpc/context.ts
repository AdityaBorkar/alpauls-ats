import { os } from "@orpc/server";

import type { auth } from "@/lib/auth/server";

export type AuthContext = {
  session: typeof auth.$Infer.Session.session;
  user: typeof auth.$Infer.Session.user;
};

export const base = os.$context<{
  headers: HeadersInit | undefined;
}>();
