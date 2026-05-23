import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { filterViews } from "@/db-schemas";
import { db } from "@/lib/db/server";
import { protectedProcedure } from "@/rpc/middleware";

const listFilterViewsSchema = z.object({
  domain: z.string(),
});

const filterModelSchema = z.object({
  columnId: z.string(),
  operator: z.string(),
  type: z.enum(["text", "number", "date", "option", "multiOption"]),
  values: z.array(z.any()),
});

const createFilterViewSchema = z.object({
  display: z.object({
    fields: z.array(z.string()),
    groupBy: z.string().nullable(),
    orderBy: z.string(),
    orderType: z.string(),
    type: z.string(),
  }),
  domain: z.string(),
  label: z.string().min(1),
  refine: z.array(filterModelSchema),
});

const updateFilterViewSchema = z.object({
  display: z
    .object({
      fields: z.array(z.string()),
      groupBy: z.string().nullable(),
      orderBy: z.string(),
      orderType: z.string(),
      type: z.string(),
    })
    .optional(),
  id: z.string(),
  label: z.string().min(1).optional(),
  refine: z.array(filterModelSchema).optional(),
});

const deleteFilterViewSchema = z.object({
  id: z.string(),
});

export const filterViewList = protectedProcedure
  .meta({ permission: { action: "read", resource: "filter_views" } })
  .input(listFilterViewsSchema)
  .handler(async ({ input }) => {
    return db
      .select()
      .from(filterViews)
      .where(eq(filterViews.domain, input.domain));
  });

export const filterViewCreate = protectedProcedure
  .meta({ permission: { action: "create", resource: "filter_views" } })
  .input(createFilterViewSchema)
  .handler(async ({ input }) => {
    const id = crypto.randomUUID();
    const [row] = await db
      .insert(filterViews)
      .values({
        display: input.display,
        domain: input.domain,
        id,
        isSystemCreated: false,
        label: input.label,
        refine: input.refine,
      })
      .returning();
    return row;
  });

export const filterViewUpdate = protectedProcedure
  .meta({ permission: { action: "update", resource: "filter_views" } })
  .input(updateFilterViewSchema)
  .handler(async ({ input }) => {
    const [existing] = await db
      .select({ isSystemCreated: filterViews.isSystemCreated })
      .from(filterViews)
      .where(eq(filterViews.id, input.id));

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Filter view not found" });
    }

    if (existing.isSystemCreated) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot edit system-created filter views",
      });
    }

    const updates: Partial<typeof filterViews.$inferInsert> = {};
    if (input.label !== undefined) updates.label = input.label;
    if (input.refine !== undefined) updates.refine = input.refine;
    if (input.display !== undefined) updates.display = input.display;

    const [row] = await db
      .update(filterViews)
      .set(updates)
      .where(eq(filterViews.id, input.id))
      .returning();
    return row;
  });

export const filterViewDelete = protectedProcedure
  .meta({ permission: { action: "delete", resource: "filter_views" } })
  .input(deleteFilterViewSchema)
  .handler(async ({ input }) => {
    const [existing] = await db
      .select({ isSystemCreated: filterViews.isSystemCreated })
      .from(filterViews)
      .where(eq(filterViews.id, input.id));

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Filter view not found" });
    }

    if (existing.isSystemCreated) {
      throw new ORPCError("FORBIDDEN", {
        message: "Cannot delete system-created filter views",
      });
    }

    await db
      .delete(filterViews)
      .where(
        and(
          eq(filterViews.id, input.id),
          eq(filterViews.isSystemCreated, false),
        ),
      );
  });
