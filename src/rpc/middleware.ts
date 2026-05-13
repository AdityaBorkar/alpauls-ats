import { ORPCError } from "@orpc/server";

import type { Action, Resource } from "@/lib/auth/access-control";
import { auth } from "@/lib/auth/server";

import { type AuthContext, base } from "./context";

type PermissionMeta = {
  permission?: { resource: Resource; action: Action };
};

const baseWithMeta = base.$meta<PermissionMeta>({});

export const authMiddleware = baseWithMeta.middleware(
  async ({ context, next }) => {
    const sessionData = await auth.api.getSession({
      headers: context.headers || {},
    });

    if (!sessionData?.session || !sessionData?.user) {
      throw new ORPCError("UNAUTHORIZED", {
        message: "You must be signed in",
      });
    }

    const { session, user } = sessionData;
    return next({ context: { session, user } satisfies AuthContext });
  },
);

export const protectedProcedure = baseWithMeta
  .use(authMiddleware)
  .use(async ({ context, next, procedure }) => {
    const required = procedure["~orpc"].meta.permission;
    if (!required) return next();
    if (
      context.user.permissions.includes(
        `${required.resource}:${required.action}`,
      )
    ) {
      return next();
    }

    throw new ORPCError("FORBIDDEN", {
      data: { requiredPermission: required },
      message: `Missing permission: ${required.resource}:${required.action}`,
    });
  });
