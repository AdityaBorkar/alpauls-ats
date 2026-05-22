import {
  Archive,
  Building2,
  Calendar,
  Fingerprint,
  UserCheck,
} from "lucide-react";

import { createColumnConfigHelper } from "@/components/data-table-filter/core/filters";

import type { ClientItem } from "../client-list-view";

const dtf = createColumnConfigHelper<ClientItem>();

export const clientColumnsConfig = [
  dtf
    .text()
    .id("name")
    .accessor((row) => row.name)
    .displayName("Name")
    .icon(Building2)
    .build(),
  dtf
    .text()
    .id("legalName")
    .accessor((row) => row.legalName ?? "")
    .displayName("Legal Name")
    .icon(Building2)
    .build(),
  dtf
    .text()
    .id("slug")
    .accessor((row) => row.slug)
    .displayName("Slug")
    .icon(Fingerprint)
    .build(),
  dtf
    .option()
    .id("assigneeId")
    .accessor((row) => row.assigneeId)
    .displayName("Assignee")
    .icon(UserCheck)
    .build(),
  dtf
    .option()
    .id("archived")
    .accessor((row) => String(row.archived))
    .displayName("Archived")
    .icon(Archive)
    .build(),
  dtf
    .date()
    .id("createdAt")
    .accessor((row) => (row.createdAt ? new Date(row.createdAt) : new Date()))
    .displayName("Created")
    .icon(Calendar)
    .build(),
] as const;
