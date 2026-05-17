import type { PgliteDatabase } from "drizzle-orm/pglite";
import { vi } from "vitest";

import type * as schema from "@/db-schemas";

vi.mock("@/lib/db/server", () => ({
  get db() {
    return _testDb;
  },
}));

let _testDb: PgliteDatabase<typeof schema>;

export function setTestDb(db: PgliteDatabase<typeof schema>) {
  _testDb = db;
}
