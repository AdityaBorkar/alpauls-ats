import { ORPCError } from "@orpc/server";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { account, session, user } from "@/db-schemas";
import { listPredefinedRoles } from "@/lib/auth/access-control";
import { db } from "@/lib/db/server";
import { Member_FormSchema as createUserSchema } from "@/lib/form-schemas/auth";
import { protectedProcedure } from "@/rpc/middleware";
import { validateNoCircularSupervisor } from "@/services/supervisor-hierarchy-service";

const updateUserSchema = z.object({
  banExpires: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  banned: z.boolean().optional(),
  banReason: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())).optional(),
  role: z
    .enum(["admin", "bd", "rm", "sc", "tl", "caller", "qc", "custom"])
    .optional(),
  supervisorId: z.string().optional(),
  userId: z.string(),
});

const archiveUserSchema = z.object({
  userId: z.string(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  userId: z.string(),
});

export const createUser = protectedProcedure
  .meta({
    permission: {
      action: "manage-roles" as const,
      resource: "team_members" as const,
    },
  })
  .input(createUserSchema)
  .handler(async ({ context, input }) => {
    if (input.role === "custom") {
      if (!input.permissions || Object.keys(input.permissions).length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "permissions must be non-empty when role is 'custom'",
        });
      }
    }

    if (input.role !== "admin" && !input.supervisorId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Non-admin users must have a supervisor",
      });
    }

    if (input.role === "admin") {
      input.supervisorId = undefined;
    }

    const normalizedEmail = input.email.toLowerCase();

    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, normalizedEmail));

    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "A user with this email already exists",
      });
    }

    const id = crypto.randomUUID();

    if (input.supervisorId) {
      const [supervisor] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, input.supervisorId));

      if (!supervisor) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Supervisor not found",
        });
      }

      await validateNoCircularSupervisor(
        id,
        input.supervisorId,
        context.subordinateCache,
      );
    }

    await db.insert(user).values({
      email: normalizedEmail,
      id,
      name: input.name,
      permissions: input.role === "custom" ? input.permissions : null,
      role: input.role,
      supervisorId: input.supervisorId ?? null,
    });

    const hashedPassword = await hashPassword(input.password);
    await db.insert(account).values({
      accountId: id,
      id: crypto.randomUUID(),
      password: hashedPassword,
      providerId: "credential",
      userId: id,
    });

    return { id };
  });

export const updateUser = protectedProcedure
  .meta({
    permission: {
      action: "manage-roles" as const,
      resource: "team_members" as const,
    },
  })
  .input(updateUserSchema)
  .handler(async ({ context, input }) => {
    const {
      userId,
      role,
      permissions,
      banned,
      banReason,
      banExpires,
      name,
      email,
      supervisorId,
    } = input;

    if (role === "custom") {
      if (!permissions || Object.keys(permissions).length === 0) {
        throw new ORPCError("BAD_REQUEST", {
          message: "permissions must be non-empty when role is 'custom'",
        });
      }
    }

    const [existing] = await db
      .select({ role: user.role, supervisorId: user.supervisorId })
      .from(user)
      .where(eq(user.id, userId));

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "User not found" });
    }

    const effectiveRole = role ?? existing.role;
    const effectiveSupervisorId =
      supervisorId !== undefined ? supervisorId : existing.supervisorId;

    if (effectiveRole !== "admin" && !effectiveSupervisorId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Non-admin users must have a supervisor",
      });
    }

    if (supervisorId) {
      const [supervisor] = await db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.id, supervisorId));

      if (!supervisor) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Supervisor not found",
        });
      }

      await validateNoCircularSupervisor(
        userId,
        supervisorId,
        context.subordinateCache,
      );
    }

    const updateData: Partial<typeof user.$inferInsert> = {};

    if (role !== undefined) {
      updateData.role = role;
    }

    if (banned === true) {
      updateData.banned = true;
      updateData.banReason = banReason ?? null;
      updateData.banExpires = banExpires ?? null;
    } else if (banned === false) {
      updateData.banned = false;
      updateData.banReason = null;
      updateData.banExpires = null;
    }

    if (permissions !== undefined) {
      updateData.permissions =
        role === "custom" || (role === undefined && permissions)
          ? permissions
          : null;
    }
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;

    if (supervisorId !== undefined) {
      updateData.supervisorId = supervisorId;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(user).set(updateData).where(eq(user.id, userId));
    }

    if (banned === true) {
      await db.delete(session).where(eq(session.userId, userId));
    }

    if (role !== undefined || permissions !== undefined) {
      await db.delete(session).where(eq(session.userId, userId));
    }

    return { success: true };
  });

export const listUsers = protectedProcedure
  .meta({
    permission: {
      action: "manage-roles" as const,
      resource: "team_members" as const,
    },
  })
  .handler(async () => {
    const supervisor = alias(user, "supervisor");

    const users = await db
      .select({
        banExpires: user.banExpires,
        banned: user.banned,
        banReason: user.banReason,
        createdAt: user.createdAt,
        email: user.email,
        id: user.id,
        image: user.image,
        name: user.name,
        permissions: user.permissions,
        phoneNumber: user.phoneNumber,
        role: user.role,
        supervisorId: user.supervisorId,
        supervisorName: supervisor.name,
      })
      .from(user)
      .leftJoin(supervisor, eq(user.supervisorId, supervisor.id));

    return users;
  });

export const archiveUser = protectedProcedure
  .meta({
    permission: {
      action: "archive" as const,
      resource: "team_members" as const,
    },
  })
  .input(archiveUserSchema)
  .handler(async ({ input }) => {
    await db
      .update(user)
      .set({ banned: true, banReason: "Archived by admin" })
      .where(eq(user.id, input.userId));
    return { success: true };
  });

export const listRoles = protectedProcedure
  .meta({
    permission: {
      action: "manage-roles" as const,
      resource: "team_members" as const,
    },
  })
  .handler(async () => {
    return listPredefinedRoles();
  });

export const resetPassword = protectedProcedure
  .meta({
    permission: {
      action: "manage-roles" as const,
      resource: "team_members" as const,
    },
  })
  .input(resetPasswordSchema)
  .handler(async ({ input }) => {
    const hashedPassword = await hashPassword(input.newPassword);
    await db
      .update(account)
      .set({ password: hashedPassword })
      .where(
        and(
          eq(account.userId, input.userId),
          eq(account.providerId, "credential"),
        ),
      );
    return { success: true };
  });
