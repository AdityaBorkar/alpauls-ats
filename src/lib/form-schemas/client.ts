import { z } from "zod";

import { AddressSchema } from "./~utils";

export const Client_FormSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z
    .string()
    .min(1)
    .meta({ component: "combobox", label: "Assignee" }),
  id: z.number().optional(),
  internalNotes: z.string().optional().meta({
    component: "textarea",
    label: "Internal Notes",
    placeholder: "Internal notes about this client...",
  }),
  legalName: z
    .string()
    .optional()
    .meta({ label: "Client Legal Name", placeholder: "Acme Corporation Ltd." }),
  locations: z.array(AddressSchema).optional().meta({ label: "Locations" }),
  logo: z.string().optional().meta({ label: "Logo" }),
  name: z
    .string()
    .min(1)
    .meta({ label: "Client Nick Name", placeholder: "Acme Corp" }),
  slug: z.string().optional().meta({
    description: "Used in URLs: /clients/{slug}",
    label: "Slug",
    placeholder: "acme-corp",
  }),
});
