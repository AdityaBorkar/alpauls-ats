import { z } from "zod";

import { RoleSchema } from "./~utils";

export const Member_FormSchema = z.object({
  banned: z.boolean().optional(),
  banReason: z.string().optional().meta({ label: "Ban Reason" }),
  email: z.email().meta({ label: "Email", placeholder: "email@example.com" }),
  id: z.string(),
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
  role: RoleSchema.meta({ label: "Role" }),
  supervisorId: z
    .string()
    .optional()
    .meta({ component: "combobox", label: "Supervisor" }),
});
