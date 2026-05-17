import { z } from "zod/v4";

export const StatusSchema = z.enum(["active", "inactive", "archived"]);

export const RoleSchema = z.enum([
  "admin",
  "bd",
  "rm",
  "sc",
  "tl",
  "caller",
  "qc",
  "custom",
]);

export const AddressSchema = z.object({
  city: z.string().min(1).meta({ label: "City", placeholder: "City" }),
  country: z.string().min(1).meta({ label: "Country", placeholder: "Country" }),
});
