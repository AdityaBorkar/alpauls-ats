import {
  adminClient,
  customSessionClient,
  phoneNumberClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac, roles } from "@/lib/auth/access-control";
import type { auth } from "@/lib/auth/server";

export const authClient = createAuthClient({
  plugins: [
    phoneNumberClient(),
    adminClient({ ac, roles }),
    customSessionClient<typeof auth>(),
  ],
});

export type Session = typeof authClient.$Infer.Session;
