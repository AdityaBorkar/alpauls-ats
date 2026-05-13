import { z } from "zod";

export const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
  role: z.enum(["admin", "bd", "rm", "sc", "tl", "caller", "qc", "custom"]),
  supervisorId: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  banExpires: z
    .string()
    .datetime()
    .nullable()
    .optional()
    .transform((v) => (v ? new Date(v) : null)),
  banned: z.boolean().optional(),
  banReason: z.string().nullable().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  permissions: z.record(z.string(), z.array(z.string())).nullable().optional(),
  role: z
    .enum(["admin", "bd", "rm", "sc", "tl", "caller", "qc", "custom"])
    .optional(),
  supervisorId: z.string().nullable().optional(),
  userId: z.string(),
});

export const archiveUserSchema = z.object({
  userId: z.string(),
});

export const resetPasswordSchema = z.object({
  newPassword: z.string().min(8),
  userId: z.string(),
});
