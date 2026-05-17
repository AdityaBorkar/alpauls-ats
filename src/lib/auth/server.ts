import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { admin, customSession, phoneNumber } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { eq } from "drizzle-orm";

import * as schema from "@/db-schemas";
import {
  ac,
  type RoleCode,
  resolvePermissions,
  roles,
} from "@/lib/auth/access-control";
import { db } from "@/lib/db/server";

const options = {
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (_user, ctx) => {
          const path = ctx?.path ?? "";
          if (path === "/admin/create-user") return;
          throw new APIError("BAD_REQUEST", {
            message: "Signups are disabled",
          });
        },
      },
    },
  },
  emailAndPassword: {
    enabled: false,
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber: phone, code }) => {
        const [existingUser] = await db
          .select()
          .from(schema.user)
          .where(eq(schema.user.phoneNumber, phone));

        if (!existingUser) {
          throw new APIError("BAD_REQUEST", { message: "No account found" });
        }
        if (existingUser.banned) {
          throw new APIError("FORBIDDEN", { message: "Account is suspended" });
        }
        console.log(`[OTP] Phone: ${phone} | Code: ${code}`);
      },
    }),
    admin({ ac, roles }),
    tanstackStartCookies(),
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30,
  },
  user: {
    additionalFields: {
      permissions: {
        defaultValue: null,
        input: false,
        required: false,
        type: "json",
      },
      supervisorId: {
        defaultValue: null,
        input: false,
        required: false,
        type: "string",
      },
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...options,
  plugins: [
    customSession(async ({ user, session }) => {
      const role = (user.role ?? "custom") as RoleCode;
      const permissions = resolvePermissions({
        permissions: user.permissions,
        role,
      });
      return { session, user: { ...user, permissions, role } };
    }, options),
    ...(options.plugins ?? []),
  ],
});
