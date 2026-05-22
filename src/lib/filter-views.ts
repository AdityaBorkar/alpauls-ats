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
    refine: [{ field: "status", op: "equal", value: "active" }],
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
    id: "clients-inactive",
    isSystemCreated: true,
    label: "Inactive",
    refine: [{ field: "status", op: "equal", value: "inactive" }],
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
    refine: [{ field: "status", op: "equal", value: "archived" }],
  },
];

export type FilterViewId = (typeof filterViews)[number]["id"];
