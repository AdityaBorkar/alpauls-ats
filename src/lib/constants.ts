import type { RoleCode } from "./auth/access-control";

export const SITE_NAME = "Alpauls Recruitment";

export const API_VERSION = "0.0.1"; // todo: change on release

export const ROLE_DISPLAY_NAMES: Record<RoleCode, string> = {
  admin: "Admin",
  bd: "Business Developer",
  caller: "Caller",
  custom: "Custom",
  qc: "Quality Checker",
  rm: "Client Relationship Manager",
  sc: "Talent Sourcer",
  tl: "Team Leader",
};
