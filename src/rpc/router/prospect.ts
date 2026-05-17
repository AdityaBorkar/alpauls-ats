import { z } from "zod";

import { protectedProcedure } from "@/rpc/middleware";
import { listProspectEvents } from "@/services/prospect-event-service";
import {
  archiveProspect as archiveProspectService,
  createProspect,
  getProspect,
  listProspects,
  updateProspect,
} from "@/services/prospect-service";

const createProspectSchema = z.object({
  description: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  name: z.string().min(1),
  phone: z.string().min(1),
});

const updateProspectSchema = z.object({
  archived: z.boolean().optional(),
  description: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  id: z.number().int().positive(),
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
});

const listProspectsSchema = z.object({
  archived: z.boolean().optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const getProspectByIdSchema = z.object({
  id: z.number().int().positive(),
});

const archiveProspectSchema = z.object({
  id: z.number().int().positive(),
});

const listProspectEventsSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  prospectId: z.number().int().positive(),
});

export const prospectCreate = protectedProcedure
  .meta({ permission: { action: "create", resource: "prospects" } })
  .input(createProspectSchema)
  .handler(async ({ input, context }) => {
    const prospect = await createProspect({
      ...input,
      createdBy: context.user.id,
    });
    return prospect;
  });

export const prospectUpdate = protectedProcedure
  .meta({ permission: { action: "update", resource: "prospects" } })
  .input(updateProspectSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input;
    const userId = context.user.id;
    const prospect = await updateProspect(id, updates, userId);
    return prospect;
  });

export const prospectArchive = protectedProcedure
  .meta({ permission: { action: "archive", resource: "prospects" } })
  .input(archiveProspectSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id;
    const prospect = await archiveProspectService(input.id, userId);
    return prospect;
  });

export const prospectGetById = protectedProcedure
  .meta({ permission: { action: "read", resource: "prospects" } })
  .input(getProspectByIdSchema)
  .handler(async ({ input }) => {
    const prospect = await getProspect(input.id);
    if (!prospect) throw new Error("Prospect not found");
    return prospect;
  });

export const prospectList = protectedProcedure
  .meta({ permission: { action: "read", resource: "prospects" } })
  .input(listProspectsSchema)
  .handler(async ({ input }) => {
    const result = await listProspects({
      cursor: input.cursor,
      filters: {
        archived: input.archived,
        search: input.search,
      },
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });
    return result;
  });

export const prospectListEvents = protectedProcedure
  .meta({ permission: { action: "read", resource: "prospects" } })
  .input(listProspectEventsSchema)
  .handler(async ({ input }) => {
    return listProspectEvents(
      input.prospectId,
      input.cursor,
      input.limit ?? 50,
    );
  });
