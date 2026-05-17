import { z } from "zod/v4";

export const StatusSchema = z.enum(["active", "inactive", "archived"]);
