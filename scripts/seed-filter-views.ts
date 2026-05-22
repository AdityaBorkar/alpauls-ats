import { config } from "dotenv";

config({ path: [".env.local", ".env"] });

import { eq, inArray, sql } from "drizzle-orm";

import { filterViews as filterViewsTable } from "@/db-schemas";
import { db } from "@/lib/db/server";
import { filterViews } from "@/lib/filter-views";

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== "object" || typeof b !== "object") return false;
  const aKeys = Object.keys(a as Record<string, unknown>);
  const bKeys = Object.keys(b as Record<string, unknown>);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    if (!bKeys.includes(key)) return false;
    if (
      !deepEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      )
    )
      return false;
  }
  return true;
}

async function main() {
  const codeIds = filterViews.map((v) => v.id);
  const dbRows = await db.select().from(filterViewsTable);

  const dbIds = dbRows.map((r) => r.id);
  const dbMap = new Map(dbRows.map((r) => [r.id, r]));

  const toCreate = filterViews.filter((v) => !dbIds.includes(v.id));
  const toDelete = dbRows.filter(
    (r) => r.isSystemCreated && !codeIds.includes(r.id),
  );
  const toUpdate = filterViews.filter((v) => {
    const existing = dbMap.get(v.id);
    if (!existing) return false;
    return (
      existing.label !== v.label ||
      existing.domain !== v.domain ||
      !deepEqual(existing.display, v.display) ||
      !deepEqual(existing.refine, v.refine)
    );
  });

  if (toCreate.length > 0) {
    await db.insert(filterViewsTable).values(
      toCreate.map((v) => ({
        display: v.display,
        domain: v.domain,
        id: v.id,
        isSystemCreated: v.isSystemCreated,
        label: v.label,
        refine: v.refine,
      })),
    );
    console.log(
      `Created ${toCreate.length} filter view(s): ${toCreate.map((v) => v.id).join(", ")}`,
    );
  }

  if (toUpdate.length > 0) {
    for (const v of toUpdate) {
      await db
        .update(filterViewsTable)
        .set({
          display: v.display,
          domain: v.domain,
          label: v.label,
          refine: v.refine,
          updatedAt: sql`now()`,
        })
        .where(eq(filterViewsTable.id, v.id));
    }
    console.log(
      `Updated ${toUpdate.length} filter view(s): ${toUpdate.map((v) => v.id).join(", ")}`,
    );
  }

  if (toDelete.length > 0) {
    await db.delete(filterViewsTable).where(
      inArray(
        filterViewsTable.id,
        toDelete.map((r) => r.id),
      ),
    );
    console.log(
      `Deleted ${toDelete.length} filter view(s): ${toDelete.map((r) => r.id).join(", ")}`,
    );
  }

  if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
    console.log("Filter views already in sync. No changes.");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
