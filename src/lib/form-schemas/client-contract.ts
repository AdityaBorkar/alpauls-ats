import { z } from "zod";

import { StatusSchema } from "./~utils";

export const ClientContract_FormSchema = z.object({
  assigneeId: z
    .string()
    .min(1)
    .meta({ component: "combobox", label: "BD Responsible" }),
  clientId: z
    .number()
    .int()
    .positive()
    .meta({ component: "combobox", label: "Client" }),
  description: z
    .string()
    .optional()
    .meta({ label: "Description", placeholder: "Optional description" }),
  endDate: z.string().optional().meta({ label: "End Date" }),
  id: z.number(),
  pdfLink: z
    .string()
    .optional()
    .meta({ label: "PDF Link", placeholder: "https://..." }),
  referenceNumber: z
    .string()
    .optional()
    .meta({ label: "Reference Number", placeholder: "CTR-2024-001" }),
  rmId: z
    .string()
    .optional()
    .meta({ component: "combobox", label: "RM Responsible" }),
  signedDate: z.string().optional().meta({ label: "Signed Date" }),
  startDate: z.string().optional().meta({ label: "Start Date" }),
  status: StatusSchema.optional().meta({ label: "Status" }),
  title: z
    .string()
    .min(1)
    .meta({ label: "Title", placeholder: "Contract title" }),
});
