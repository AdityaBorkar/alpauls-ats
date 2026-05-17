import { z } from "zod";

export { ClientContract_FormSchema } from "@/lib/form-schemas/client-contract";

const contractStatusSchema = z.enum(["active", "inactive"]);

export { contractStatusSchema };

export const listContractsSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.array(z.string()).optional(),
  clientId: z.number().int().positive().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["title", "createdAt", "startDate", "endDate"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
  status: z.array(contractStatusSchema).optional(),
});

export const getContractByIdSchema = z.object({
  id: z.number().int().positive(),
});

export const archiveContractSchema = z.object({
  id: z.number().int().positive(),
});

export const updateContractSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.string().optional(),
  clientId: z.number().int().positive().optional(),
  description: z.string().optional(),
  endDate: z.string().optional(),
  id: z.number().int().positive(),
  pdfLink: z.string().optional(),
  referenceNumber: z.string().optional(),
  rmId: z.string().optional(),
  signedDate: z.string().optional(),
  startDate: z.string().optional(),
  status: contractStatusSchema.optional(),
  title: z.string().optional(),
});

export const listContractEventsSchema = z.object({
  contractId: z.number().int().positive(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
