import type { FiltersState } from "@/components/data-table-filter/core/types";

export const filterViews = [
  {
    display: {
      fields: ["id", "status"],
      groupBy: null,
      orderBy: "createdAt",
      orderType: "desc",
      type: "list",
    },
    domain: "clients" as const,
    id: "clients-active",
    isSystemCreated: true,
    label: "Active",
    refine: [
      {
        columnId: "archived",
        operator: "is",
        type: "option",
        values: ["false"],
      },
    ] satisfies FiltersState,
  },
  {
    display: {
      fields: ["id", "status"],
      groupBy: null,
      orderBy: "createdAt",
      orderType: "desc",
      type: "list",
    },
    domain: "clients" as const,
    id: "clients-archived",
    isSystemCreated: true,
    label: "Archived",
    refine: [
      {
        columnId: "archived",
        operator: "is",
        type: "option",
        values: ["true"],
      },
    ] satisfies FiltersState,
  },
];

export type FilterViewId = (typeof filterViews)[number]["id"];
