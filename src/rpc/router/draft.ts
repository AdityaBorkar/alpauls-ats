import { z } from "zod";

import { protectedProcedure } from "@/rpc/middleware";
import {
  createDraft,
  deleteDraft,
  getDraft,
  listDrafts,
  updateDraft,
} from "@/services/draft-service";

const createDraftSchema = z.object({
  data: z.record(z.string(), z.unknown()),
  entityType: z.string().min(1),
  title: z.string().min(1),
});

const updateDraftSchema = z.object({
  data: z.record(z.string(), z.unknown()).optional(),
  id: z.number().int().positive(),
  title: z.string().min(1).optional(),
});

const deleteDraftSchema = z.object({
  id: z.number().int().positive(),
});

const getDraftByIdSchema = z.object({
  id: z.number().int().positive(),
});

const listDraftsSchema = z.object({
  cursor: z.string().optional(),
  entityType: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  sortBy: z.enum(["createdAt", "updatedAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const draftCreate = protectedProcedure
  .meta({ permission: { action: "create", resource: "drafts" } })
  .input(createDraftSchema)
  .handler(async ({ input, context }) => {
    const draft = await createDraft({
      ...input,
      createdBy: context.user.id,
    });
    return draft;
  });

export const draftUpdate = protectedProcedure
  .meta({ permission: { action: "update", resource: "drafts" } })
  .input(updateDraftSchema)
  .handler(async ({ input }) => {
    const { id, ...updates } = input;
    const draft = await updateDraft(id, updates);
    return draft;
  });

export const draftDelete = protectedProcedure
  .meta({ permission: { action: "delete", resource: "drafts" } })
  .input(deleteDraftSchema)
  .handler(async ({ input, context: ctx }) => {
    const draft = await getDraft(input.id);
    if (!draft) throw new Error("Draft not found");
    if (draft.createdBy !== ctx.user.id && ctx.user.role !== "admin") {
      throw new Error("You can only delete your own drafts");
    }
    await deleteDraft(input.id);
    return { success: true };
  });

export const draftGetById = protectedProcedure
  .meta({ permission: { action: "read", resource: "drafts" } })
  .input(getDraftByIdSchema)
  .handler(async ({ input }) => {
    const draft = await getDraft(input.id);
    if (!draft) throw new Error("Draft not found");
    return draft;
  });

export const draftList = protectedProcedure
  .meta({ permission: { action: "read", resource: "drafts" } })
  .input(listDraftsSchema)
  .handler(async ({ input }) => {
    const result = await listDrafts({
      cursor: input.cursor,
      entityType: input.entityType,
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });
    return result;
  });
