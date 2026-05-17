import type { SQL } from "drizzle-orm";
import { and, asc, desc, eq, ilike, inArray, sql } from "drizzle-orm";

import { clients, user } from "@/db-schemas";
import { db } from "@/lib/db/server";

import { recordClientEvent } from "./client-event-service";
import type { SubordinateCache } from "./supervisor-hierarchy-service";
import { getSubordinateIds } from "./supervisor-hierarchy-service";

export type CreateClientInput = {
  name: string;
  legalName?: string;
  logo?: string;
  slug?: string;
  locations?: { city: string; country: string }[];
  internalNotes?: string;
  assigneeId: string;
  createdBy: string;
};

export type UpdateClientInput = {
  name?: string;
  legalName?: string | null;
  logo?: string | null;
  slug?: string;
  locations?: { city: string; country: string }[] | null;
  internalNotes?: string | null;
  assigneeId?: string;
  archived?: boolean;
};

export type ListClientsInput = {
  filters?: {
    archived?: boolean;
    assigneeId?: string[];
    search?: string;
  };
  cursor?: string;
  limit?: number;
  sortBy?: "name" | "createdAt";
  sortOrder?: "asc" | "desc";
  userId?: string;
  subordinateCache?: SubordinateCache;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  let slug = base;
  let suffix = 1;

  while (await isSlugTaken(slug)) {
    suffix++;
    slug = `${base}-${suffix}`;
  }

  return slug;
}

async function isSlugTaken(slug: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.slug, slug))
    .limit(1);
  return !!existing;
}

export async function createClient(input: CreateClientInput) {
  const slug = input.slug || (await generateUniqueSlug(input.name));

  const [client] = await db
    .insert(clients)
    .values({
      assigneeId: input.assigneeId,
      internalNotes: input.internalNotes ?? null,
      legalName: input.legalName ?? null,
      locations: input.locations ?? [],
      logo: input.logo ?? null,
      name: input.name,
      slug,
    })
    .returning();

  await recordClientEvent(client.id, "name", null, input.name, input.createdBy);

  return getClient(client.id);
}

export async function updateClient(
  id: number,
  input: UpdateClientInput,
  userId: string,
) {
  const [existing] = await db.select().from(clients).where(eq(clients.id, id));
  if (!existing) throw new Error("Client not found");

  const updatableFields = [
    "name",
    "legalName",
    "logo",
    "slug",
    "locations",
    "internalNotes",
    "assigneeId",
    "archived",
  ] as const;

  const columnMap: Record<string, string> = {
    archived: "archived",
    assigneeId: "assignee_id",
    internalNotes: "internal_notes",
    legalName: "legal_name",
    locations: "locations",
    logo: "logo",
    name: "name",
    slug: "slug",
  };

  const updateData: Record<string, unknown> = {};

  for (const field of updatableFields) {
    if (input[field] !== undefined) {
      const oldVal = existing[field as keyof typeof existing];
      const newVal = input[field];

      const oldStr =
        oldVal === null
          ? null
          : Array.isArray(oldVal)
            ? JSON.stringify(oldVal)
            : String(oldVal);
      const newStr =
        newVal === null
          ? null
          : Array.isArray(newVal)
            ? JSON.stringify(newVal)
            : String(newVal);

      if (oldStr !== newStr) {
        updateData[field] = newVal;
        await recordClientEvent(id, columnMap[field], oldStr, newStr, userId);
      }
    }
  }

  if (Object.keys(updateData).length > 0) {
    updateData.updatedAt = new Date();
    await db.update(clients).set(updateData).where(eq(clients.id, id));
  }

  return getClient(id);
}

export async function archiveClient(id: number, userId: string) {
  return updateClient(id, { archived: true }, userId);
}

export async function getClient(id: number) {
  const [client] = await db
    .select({
      archived: clients.archived,
      assigneeId: clients.assigneeId,
      assigneeImage: user.image,
      assigneeName: user.name,
      createdAt: clients.createdAt,
      description: clients.description,
      id: clients.id,
      internalNotes: clients.internalNotes,
      legalName: clients.legalName,
      locations: clients.locations,
      logo: clients.logo,
      name: clients.name,
      slug: clients.slug,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .leftJoin(user, eq(clients.assigneeId, user.id))
    .where(eq(clients.id, id));

  if (!client) return null;

  return {
    ...client,
    assignee: {
      id: client.assigneeId,
      image: client.assigneeImage,
      name: client.assigneeName,
    },
  };
}

export async function listClients(input: ListClientsInput = {}) {
  const {
    filters = {},
    limit = 20,
    sortBy = "name",
    sortOrder = "asc",
  } = input;

  const conditions: SQL[] = [];

  const { cursor } = input;
  const cursorId = cursor ? Number.parseInt(cursor, 10) : null;

  if (cursorId !== null && !Number.isNaN(cursorId)) {
    if (sortOrder === "asc") {
      conditions.push(sql`${clients.id} > ${cursorId}`);
    } else {
      conditions.push(sql`${clients.id} < ${cursorId}`);
    }
  }

  if (filters.archived !== undefined) {
    conditions.push(eq(clients.archived, filters.archived));
  } else {
    conditions.push(eq(clients.archived, false));
  }

  if (filters.assigneeId?.length) {
    conditions.push(inArray(clients.assigneeId, filters.assigneeId));
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      sql`(${ilike(clients.name, pattern)} OR ${ilike(clients.legalName, pattern)} OR ${ilike(clients.slug, pattern)})`,
    );
  }

  if (input.userId) {
    const subordinateIds = await getSubordinateIds(
      input.userId,
      input.subordinateCache,
    );
    const visibleIds = [input.userId, ...subordinateIds];
    conditions.push(inArray(clients.assigneeId, visibleIds));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const sortColumn = sortBy === "name" ? clients.name : clients.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const rows = await db
    .select({
      archived: clients.archived,
      assigneeId: clients.assigneeId,
      assigneeImage: user.image,
      assigneeName: user.name,
      createdAt: clients.createdAt,
      id: clients.id,
      legalName: clients.legalName,
      logo: clients.logo,
      name: clients.name,
      slug: clients.slug,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .leftJoin(user, eq(clients.assigneeId, user.id))
    .where(whereClause)
    .orderBy(orderFn(sortColumn))
    .limit(limit + 1);

  const hasMore = rows.length > limit;
  const items = hasMore ? rows.slice(0, limit) : rows;

  const enriched = items.map((row) => ({
    ...row,
    assignee: {
      id: row.assigneeId,
      image: row.assigneeImage,
      name: row.assigneeName,
    },
  }));

  const nextCursor =
    hasMore && enriched.length > 0
      ? String(enriched[enriched.length - 1].id)
      : null;

  return { items: enriched, nextCursor };
}
