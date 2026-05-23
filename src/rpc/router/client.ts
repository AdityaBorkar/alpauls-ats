import { z } from "zod";

import {
  Client_FormSchema as createClientSchema,
  Client_FormSchema as updateClientSchema,
} from "@/lib/form-schemas/client";
import { getPresignedUploadUrl, getR2PublicUrl } from "@/lib/storage/server";
import { protectedProcedure } from "@/rpc/middleware";
import { listClientEvents } from "@/services/client-event-service";
import {
  archiveClient as archiveClientService,
  createClient,
  getClient,
  listClients,
  updateClient,
} from "@/services/client-service";

const listClientsSchema = z.object({
  archived: z.boolean().optional(),
  assigneeId: z.array(z.string()).optional(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
  search: z.string().optional(),
  sortBy: z.enum(["name", "createdAt"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

const getClientByIdSchema = z.object({
  id: z.number().int().positive(),
});

const archiveClientSchema = z.object({
  id: z.number().int().positive(),
});

const listClientEventsSchema = z.object({
  clientId: z.number().int().positive(),
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const getUploadUrlSchema = z.object({
  contentType: z.string().min(1),
  filename: z.string().min(1),
});

export const clientCreate = protectedProcedure
  .meta({ permission: { action: "create", resource: "clients" } })
  .input(createClientSchema)
  .handler(async ({ input, context }) => {
    const client = await createClient({
      ...input,
      createdBy: context.user.id,
    });
    return client;
  });

export const clientUpdate = protectedProcedure
  .meta({ permission: { action: "update", resource: "clients" } })
  .input(updateClientSchema)
  .handler(async ({ input, context }) => {
    const { id, ...updates } = input;
    if (!id) throw new Error("id is required for update");
    const userId = context.user.id;
    const client = await updateClient(id, updates, userId);
    return client;
  });

export const clientArchive = protectedProcedure
  .meta({ permission: { action: "archive", resource: "clients" } })
  .input(archiveClientSchema)
  .handler(async ({ input, context }) => {
    const userId = context.user.id;
    const client = await archiveClientService(input.id, userId);
    return client;
  });

export const clientGetById = protectedProcedure
  .meta({ permission: { action: "read", resource: "clients" } })
  .input(getClientByIdSchema)
  .handler(async ({ input }) => {
    const client = await getClient(input.id);
    if (!client) throw new Error("Client not found");
    return client;
  });

export const clientList = protectedProcedure
  .meta({ permission: { action: "read", resource: "clients" } })
  .input(listClientsSchema)
  .handler(async ({ input, context }) => {
    const result = await listClients({
      cursor: input.cursor,
      filters: {
        archived: input.archived,
        assigneeId: input.assigneeId,
        search: input.search,
      },
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
      subordinateCache: context.subordinateCache,
      userId: context.user.id,
    });
    return result;
  });

export const clientListEvents = protectedProcedure
  .meta({ permission: { action: "read", resource: "clients" } })
  .input(listClientEventsSchema)
  .handler(async ({ input }) => {
    return listClientEvents(input.clientId, input.cursor, input.limit ?? 50);
  });

export const clientGetUploadUrl = protectedProcedure
  .meta({ permission: { action: "create", resource: "clients" } })
  .input(getUploadUrlSchema)
  .handler(async ({ input }) => {
    const key = `clients/${crypto.randomUUID()}/${input.filename}`;
    const url = await getPresignedUploadUrl(key, input.contentType);
    return { key, publicUrl: getR2PublicUrl(key), url };
  });
