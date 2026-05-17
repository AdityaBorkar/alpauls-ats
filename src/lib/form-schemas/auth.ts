import { z } from "zod";

const roleSchema = z.enum([
  "admin",
  "bd",
  "rm",
  "sc",
  "tl",
  "caller",
  "qc",
  "custom",
]);

export const memberFormSchema = z.object({
  email: z
    .string()
    .email()
    .meta({ label: "Email", placeholder: "email@example.com" }),
  name: z.string().min(1).meta({ label: "Name", placeholder: "Full name" }),
  password: z.string().min(8).meta({
    component: "password",
    label: "Password",
    placeholder: "Minimum 8 characters",
  }),
  permissions: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .meta({ label: "Custom Permissions" }),
  role: roleSchema.meta({ label: "Role" }),
  supervisorId: z
    .string()
    .optional()
    .meta({ component: "combobox", label: "Supervisor" }),
});

export const memberUpdateFormSchema = z.object({
  banned: z.boolean().optional(),
  banReason: z.string().optional().meta({ label: "Ban Reason" }),
  email: z
    .string()
    .email()
    .optional()
    .meta({ label: "Email", placeholder: "email@example.com" }),
  id: z.string(),
  name: z.string().optional().meta({ label: "Name", placeholder: "Full name" }),
  permissions: z
    .record(z.string(), z.array(z.string()))
    .optional()
    .meta({ label: "Custom Permissions" }),
  role: roleSchema.optional().meta({ label: "Role" }),
  supervisorId: z
    .string()
    .optional()
    .meta({ component: "combobox", label: "Supervisor" }),
});
