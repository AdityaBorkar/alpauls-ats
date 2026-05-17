import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { contractStatusEnum } from "@/db-schemas";
import { clientContracts, clients, contractEvents, user } from "@/db-schemas";
import { db } from "@/lib/db/server";
import { protectedProcedure } from "@/rpc/middleware";
import {
  archiveContractSchema,
  ClientContract_FormSchema,
  getContractByIdSchema,
  listContractEventsSchema,
  listContractsSchema,
  updateContractSchema,
} from "@/rpc/schema/client-contract";

export type ContractStatus = (typeof contractStatusEnum.enumValues)[number];

export type CreateContractInput = {
  title: string;
  description?: string;
  clientId: number;
  assigneeId: string;
  rmId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedDate?: string | null;
  pdfLink?: string | null;
  referenceNumber?: string | null;
  status?: ContractStatus;
};

export type UpdateContractInput = {
  title?: string;
  description?: string | null;
  clientId?: number;
  assigneeId?: string;
  rmId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  signedDate?: string | null;
  pdfLink?: string | null;
  referenceNumber?: string | null;
  status?: ContractStatus;
  archived?: boolean;
};

export type ListContractsFilters = {
  clientId?: number;
  assigneeId?: string[];
  status?: ContractStatus[];
  search?: string;
  archived?: boolean;
};

export type ListContractsInput = {
  filters?: ListContractsFilters;
  cursor?: string;
  limit?: number;
  sortBy?: "title" | "createdAt" | "startDate" | "endDate";
  sortOrder?: "asc" | "desc";
};

const COLUMN_MAP: Record<string, string> = {
  archived: "archived",
  assigneeId: "assignee_id",
  clientId: "client_id",
  description: "description",
  endDate: "end_date",
  pdfLink: "pdf_link",
  referenceNumber: "reference_number",
  rmId: "rm_id",
  signedDate: "signed_date",
  startDate: "start_date",
  status: "status",
  title: "title",
};

const UPDATABLE_FIELDS = [
  "title",
  "description",
  "clientId",
  "assigneeId",
  "rmId",
  "startDate",
  "endDate",
  "signedDate",
  "pdfLink",
  "referenceNumber",
  "status",
  "archived",
] as const;

const bdUser = alias(user, "bd_user");
const rmUser = alias(user, "rm_user");

async function recordContractEvent(
  contractId: number,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
) {
  await db.insert(contractEvents).values({
    changedBy,
    contractId,
    field,
    newValue,
    oldValue,
  });
}

function buildContractSelect() {
  return {
    archived: clientContracts.archived,
    assigneeId: clientContracts.assigneeId,
    bdImage: bdUser.image,
    bdName: bdUser.name,
    clientId: clientContracts.clientId,
    clientName: clients.name,
    createdAt: clientContracts.createdAt,
    description: clientContracts.description,
    endDate: clientContracts.endDate,
    id: clientContracts.id,
    pdfLink: clientContracts.pdfLink,
    referenceNumber: clientContracts.referenceNumber,
    rmId: clientContracts.rmId,
    rmImage: rmUser.image,
    rmName: rmUser.name,
    signedDate: clientContracts.signedDate,
    startDate: clientContracts.startDate,
    status: clientContracts.status,
    title: clientContracts.title,
    updatedAt: clientContracts.updatedAt,
  };
}

export async function createContract(
  input: CreateContractInput,
  userId: string,
) {
  const [contract] = await db
    .insert(clientContracts)
    .values({
      assigneeId: input.assigneeId,
      clientId: input.clientId,
      description: input.description ?? null,
      endDate: input.endDate ?? null,
      pdfLink: input.pdfLink ?? null,
      referenceNumber: input.referenceNumber ?? null,
      rmId: input.rmId ?? null,
      signedDate: input.signedDate ?? null,
      startDate: input.startDate ?? null,
      status: input.status ?? "active",
      title: input.title,
    })
    .returning();

  const fieldsToRecord: [string, string | null][] = [
    ["title", input.title],
    ["description", input.description ?? null],
    ["client_id", input.clientId != null ? String(input.clientId) : null],
    ["assignee_id", input.assigneeId],
    ["rm_id", input.rmId ?? null],
    ["start_date", input.startDate ?? null],
    ["end_date", input.endDate ?? null],
    ["signed_date", input.signedDate ?? null],
    ["pdf_link", input.pdfLink ?? null],
    ["reference_number", input.referenceNumber ?? null],
    ["status", input.status ?? "active"],
  ];

  for (const [field, value] of fieldsToRecord) {
    if (value !== null) {
      await recordContractEvent(contract.id, field, null, value, userId);
    }
  }

  return getContract(contract.id);
}

export async function updateContract(
  id: number,
  input: UpdateContractInput,
  userId: string,
) {
  const [existing] = await db
    .select()
    .from(clientContracts)
    .where(eq(clientContracts.id, id));

  if (!existing) throw new Error("Contract not found");

  const updateData: Record<string, unknown> = {};

  for (const field of UPDATABLE_FIELDS) {
    if (input[field] !== undefined) {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = input[field];

      const oldStr = oldVal === null ? null : String(oldVal);
      const newStr = newVal === null ? null : String(newVal);

      if (oldStr !== newStr) {
        updateData[field] = newVal;
        await recordContractEvent(
          id,
          COLUMN_MAP[field],
          oldStr,
          newStr,
          userId,
        );
      }
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db
      .update(clientContracts)
      .set(updateData)
      .where(eq(clientContracts.id, id));
  }

  return getContract(id);
}

export async function archiveContract(id: number, userId: string) {
  return updateContract(id, { archived: true }, userId);
}

export async function getContract(id: number) {
  const [row] = await db
    .select(buildContractSelect())
    .from(clientContracts)
    .leftJoin(bdUser, eq(clientContracts.assigneeId, bdUser.id))
    .leftJoin(rmUser, eq(clientContracts.rmId, rmUser.id))
    .leftJoin(clients, eq(clientContracts.clientId, clients.id))
    .where(eq(clientContracts.id, id));

  if (!row) return null;

  return {
    ...row,
    bd: {
      id: row.assigneeId,
      image: row.bdImage,
      name: row.bdName,
    },
    client: {
      id: row.clientId,
      name: row.clientName,
    },
    rm: row.rmId
      ? { id: row.rmId, image: row.rmImage, name: row.rmName }
      : null,
  };
}

export async function listContracts(input: ListContractsInput = {}) {
  const {
    filters = {},
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = input;

  const conditions = [];

  if (filters.archived !== undefined) {
    conditions.push(eq(clientContracts.archived, filters.archived));
  } else {
    conditions.push(eq(clientContracts.archived, false));
  }

  if (filters.clientId !== undefined) {
    conditions.push(eq(clientContracts.clientId, filters.clientId));
  }

  if (filters.status?.length) {
    conditions.push(inArray(clientContracts.status, filters.status));
  }

  if (filters.assigneeId?.length) {
    conditions.push(inArray(clientContracts.assigneeId, filters.assigneeId));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      sql`(${ilike(clientContracts.title, pattern)} OR ${ilike(clientContracts.referenceNumber, pattern)})`,
    );
  }

  const cursorId = input.cursor ? Number.parseInt(input.cursor, 10) : null;
  if (cursorId !== null && !Number.isNaN(cursorId)) {
    if (sortOrder === "asc") {
      conditions.push(sql`${clientContracts.id} > ${cursorId}`);
    } else {
      conditions.push(sql`${clientContracts.id} < ${cursorId}`);
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn =
    sortBy === "title"
      ? clientContracts.title
      : sortBy === "startDate"
        ? clientContracts.startDate
        : sortBy === "endDate"
          ? clientContracts.endDate
          : clientContracts.createdAt;

  const orderFn = sortOrder === "asc" ? asc(sortColumn) : desc(sortColumn);

  const rows = await db
    .select(buildContractSelect())
    .from(clientContracts)
    .leftJoin(bdUser, eq(clientContracts.assigneeId, bdUser.id))
    .leftJoin(rmUser, eq(clientContracts.rmId, rmUser.id))
    .leftJoin(clients, eq(clientContracts.clientId, clients.id))
    .where(whereClause)
    .orderBy(orderFn)
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const enriched = items.map((row) => ({
    ...row,
    bd: {
      id: row.assigneeId,
      image: row.bdImage,
      name: row.bdName,
    },
    client: {
      id: row.clientId,
      name: row.clientName,
    },
    rm: row.rmId
      ? { id: row.rmId, image: row.rmImage, name: row.rmName }
      : null,
  }));

  const nextCursor =
    hasMore && enriched.length > 0
      ? String(enriched[enriched.length - 1].id)
      : null;

  return { items: enriched, nextCursor };
}

export async function listContractEvents(
  contractId: number,
  _cursor?: string,
  limit = 50,
) {
  const rows = await db
    .select()
    .from(contractEvents)
    .where(eq(contractEvents.contractId, contractId))
    .orderBy(desc(contractEvents.changedAt))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  return {
    items,
    nextCursor:
      hasMore && items.length > 0 ? String(items[items.length - 1].id) : null,
  };
}

export const contractCreate = protectedProcedure
  .meta({ permission: { action: "create", resource: "client_contracts" } })
  .input(ClientContract_FormSchema)
  .handler(async ({ context, input }) => {
    const { status, ...rest } = input;
    const contract = await createContract(
      { ...rest, status: status === "archived" ? undefined : status },
      context.user.id,
    );
    return contract;
  });

export const contractList = protectedProcedure
  .meta({ permission: { action: "read", resource: "client_contracts" } })
  .input(listContractsSchema)
  .handler(async ({ input }) => {
    return listContracts({
      cursor: input.cursor,
      filters: {
        archived: input.archived,
        assigneeId: input.assigneeId,
        clientId: input.clientId,
        search: input.search,
        status: input.status,
      },
      limit: input.limit,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    });
  });

export const contractGetById = protectedProcedure
  .meta({ permission: { action: "read", resource: "client_contracts" } })
  .input(getContractByIdSchema)
  .handler(async ({ input }) => {
    const contract = await getContract(input.id);
    if (!contract) throw new Error("Contract not found");
    return contract;
  });

export const contractUpdate = protectedProcedure
  .meta({ permission: { action: "update", resource: "client_contracts" } })
  .input(updateContractSchema)
  .handler(async ({ context, input }) => {
    const { id, ...updates } = input;
    return updateContract(id, updates, context.user.id);
  });

export const contractArchive = protectedProcedure
  .meta({ permission: { action: "archive", resource: "client_contracts" } })
  .input(archiveContractSchema)
  .handler(async ({ context, input }) => {
    return archiveContract(input.id, context.user.id);
  });

export const contractListEvents = protectedProcedure
  .meta({ permission: { action: "read", resource: "client_contracts" } })
  .input(listContractEventsSchema)
  .handler(async ({ input }) => {
    return listContractEvents(
      input.contractId,
      input.cursor,
      input.limit ?? 50,
    );
  });
