import { z } from "zod";

const locationSchema = z.object({
  city: z.string().min(1).meta({ label: "City", placeholder: "City" }),
  country: z.string().min(1).meta({ label: "Country", placeholder: "Country" }),
});

export const clientFormSchema = z.object({
  assigneeId: z
    .string()
    .min(1)
    .meta({ component: "combobox", label: "Assignee" }),
  internalNotes: z.string().optional().meta({
    component: "textarea",
    label: "Internal Notes",
    placeholder: "Internal notes about this client...",
  }),
  legalName: z
    .string()
    .optional()
    .meta({ label: "Client Legal Name", placeholder: "Acme Corporation Ltd." }),
  locations: z.array(locationSchema).optional().meta({ label: "Locations" }),
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

export const clientUpdateFormSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z
    .string()
    .min(1)
    .optional()
    .meta({ component: "combobox", label: "Assignee" }),
  id: z.number(),
  internalNotes: z.string().optional().meta({
    component: "textarea",
    label: "Internal Notes",
    placeholder: "Internal notes about this client...",
  }),
  legalName: z
    .string()
    .optional()
    .meta({ label: "Client Legal Name", placeholder: "Acme Corporation Ltd." }),
  locations: z.array(locationSchema).optional().meta({ label: "Locations" }),
  logo: z.string().optional().meta({ label: "Logo" }),
  name: z
    .string()
    .min(1)
    .optional()
    .meta({ label: "Client Nick Name", placeholder: "Acme Corp" }),
  slug: z.string().min(1).optional().meta({
    description: "Used in URLs: /clients/{slug}",
    label: "Slug",
    placeholder: "acme-corp",
  }),
});
