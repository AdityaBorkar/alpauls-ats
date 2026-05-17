import { getPresignedUploadUrl, getR2PublicUrl } from "@/lib/storage";
import { protectedProcedure } from "@/rpc/middleware";
import {
  archiveClientSchema,
  createClientSchema,
  getClientByIdSchema,
  getUploadUrlSchema,
  listClientEventsSchema,
  listClientsSchema,
  updateClientSchema,
} from "@/rpc/schema/client";
import { listClientEvents } from "@/services/client-event-service";
import {
  archiveClient as archiveClientService,
  createClient,
  getClient,
  listClients,
  updateClient,
} from "@/services/client-service";

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
