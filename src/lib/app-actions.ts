import type { Action, Resource } from "@/lib/auth/access-control";

export type CommandAction = NavAction | NewAction | GlobalAction;

export type NavAction = {
  group: "navigation";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords: string[];
};

export type NewAction = {
  group: "new";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  keywords: string[];
  permission: `${Resource}:${Action<Resource>}`;
};

export type GlobalAction = {
  group: "actions";
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  actionId: string;
};

export type CommandPaletteMode = "all" | "new";

export const navActions: NavAction[] = [
  {
    group: "navigation",
    href: "/dashboard",
    icon: () => null,
    id: "nav-dashboard",
    keywords: ["home", "overview"],
    label: "Go to Dashboard",
  },
  {
    group: "navigation",
    href: "/tasks",
    icon: () => null,
    id: "nav-tasks",
    keywords: ["tasks", "todos", "checklist"],
    label: "Go to Tasks",
  },
  {
    group: "navigation",
    href: "/agents",
    icon: () => null,
    id: "nav-agents",
    keywords: ["agents", "ai"],
    label: "Go to Agents",
  },
  {
    group: "navigation",
    href: "/omnichannel",
    icon: () => null,
    id: "nav-omnichannel",
    keywords: ["omnichannel", "channels", "unified"],
    label: "Go to Omnichannel",
  },
  {
    group: "navigation",
    href: "/job-mandates",
    icon: () => null,
    id: "nav-job-mandates",
    keywords: ["job", "mandates", "positions", "openings"],
    label: "Go to Job Mandates",
  },
  {
    group: "navigation",
    href: "/prospects",
    icon: () => null,
    id: "nav-prospects",
    keywords: ["prospects", "candidates", "leads"],
    label: "Go to Prospects",
  },
  {
    group: "navigation",
    href: "/contracts",
    icon: () => null,
    id: "nav-contracts",
    keywords: ["contracts", "agreements", "deals"],
    label: "Go to Contracts",
  },
  {
    group: "navigation",
    href: "/clients",
    icon: () => null,
    id: "nav-clients",
    keywords: ["clients", "customers", "accounts"],
    label: "Go to Clients",
  },
  {
    group: "navigation",
    href: "/whatsapp",
    icon: () => null,
    id: "nav-whatsapp",
    keywords: ["whatsapp", "chat", "messaging"],
    label: "Go to WhatsApp",
  },
  {
    group: "navigation",
    href: "/emails",
    icon: () => null,
    id: "nav-email",
    keywords: ["email", "mail", "inbox"],
    label: "Go to Email",
  },
  {
    group: "navigation",
    href: "/voice",
    icon: () => null,
    id: "nav-voice",
    keywords: ["voice", "calls", "phone"],
    label: "Go to Voice",
  },
  {
    group: "navigation",
    href: "/analytics",
    icon: () => null,
    id: "nav-analytics",
    keywords: ["analytics", "metrics", "stats", "charts"],
    label: "Go to Analytics",
  },
  {
    group: "navigation",
    href: "/reports",
    icon: () => null,
    id: "nav-reports",
    keywords: ["reports", "documents", "exports"],
    label: "Go to Reports",
  },
  {
    group: "navigation",
    href: "/audit-log",
    icon: () => null,
    id: "nav-audit-log",
    keywords: ["audit", "log", "history"],
    label: "Go to Audit Log",
  },
  {
    group: "navigation",
    href: "/settings/profile",
    icon: () => null,
    id: "nav-profile",
    keywords: ["profile", "settings", "account"],
    label: "Go to Profile",
  },
  {
    group: "navigation",
    href: "/settings/sla",
    icon: () => null,
    id: "nav-sla",
    keywords: ["sla", "service", "level", "agreement"],
    label: "Go to SLAs",
  },
  {
    group: "navigation",
    href: "/settings/connections",
    icon: () => null,
    id: "nav-connections",
    keywords: ["connections", "integrations", "api"],
    label: "Go to Connections",
  },
  {
    group: "navigation",
    href: "/settings/members",
    icon: () => null,
    id: "nav-members",
    keywords: ["members", "team", "users", "staff"],
    label: "Go to Team Members",
  },
];

export const newActions: NewAction[] = [
  {
    group: "new",
    href: "/tasks",
    icon: () => null,
    id: "new-task",
    keywords: ["task", "create", "add", "todo"],
    label: "New Task",
    permission: "tasks:create",
  },
  {
    group: "new",
    href: "/prospects",
    icon: () => null,
    id: "new-prospect",
    keywords: ["prospect", "candidate", "lead", "create", "add"],
    label: "New Prospect",
    permission: "prospects:create",
  },
  {
    group: "new",
    href: "/clients",
    icon: () => null,
    id: "new-client",
    keywords: ["client", "customer", "account", "create", "add"],
    label: "New Client",
    permission: "clients:create",
  },
  {
    group: "new",
    href: "/contracts",
    icon: () => null,
    id: "new-contract",
    keywords: ["contract", "agreement", "deal", "create", "add"],
    label: "New Contract",
    permission: "client_contracts:create",
  },
  {
    group: "new",
    href: "/job-mandates",
    icon: () => null,
    id: "new-job-mandate",
    keywords: ["job", "mandate", "position", "opening", "create", "add"],
    label: "New Job Mandate",
    permission: "job_mandates:create",
  },
  {
    group: "new",
    href: "/settings/members/new",
    icon: () => null,
    id: "new-member",
    keywords: ["member", "team", "user", "staff", "create", "add"],
    label: "New Team Member",
    permission: "team_members:create",
  },
];

export const globalActions: GlobalAction[] = [
  {
    actionId: "toggleSidebar",
    group: "actions",
    icon: () => null,
    id: "toggle-sidebar",
    keywords: ["sidebar", "collapse", "expand", "toggle"],
    label: "Toggle Sidebar",
  },
  {
    actionId: "toggleChat",
    group: "actions",
    icon: () => null,
    id: "toggle-chat",
    keywords: ["chat", "ai", "assistant", "toggle"],
    label: "Toggle Agentic Chat",
  },
];
