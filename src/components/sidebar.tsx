import ChartAlt from "@iconify-react/lets-icons/chart-alt";
import Chat from "@iconify-react/lets-icons/chat";
import CheckRing from "@iconify-react/lets-icons/check-ring";
import Clock from "@iconify-react/lets-icons/clock";
import Cpu from "@iconify-react/lets-icons/cpu";
import EMail from "@iconify-react/lets-icons/e-mail";
import FileDock from "@iconify-react/lets-icons/file-dock";
import HappyFace from "@iconify-react/lets-icons/happy";
import Home from "@iconify-react/lets-icons/home";
import Layers from "@iconify-react/lets-icons/layers";
import LinkAlt from "@iconify-react/lets-icons/link-alt";
import Notebook from "@iconify-react/lets-icons/notebook";
import PackageBoxAlt from "@iconify-react/lets-icons/package-box-alt";
import Phone from "@iconify-react/lets-icons/phone";
import Sertificate from "@iconify-react/lets-icons/sertificate";
import UserBox from "@iconify-react/lets-icons/user-box";
import {
  IconFilePencil,
  IconLayoutSidebar,
  IconMessageChatbot,
  IconPlus,
  IconSearch,
} from "@tabler/icons-react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";

import { useSidebar } from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SITE_NAME } from "@/lib/constants";
import { cn } from "@/lib/utils";

type SidebarItem = {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
};

const SidebarItems: { items: SidebarItem[]; label: string }[] = [
  {
    items: [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
      { href: "/agents", icon: Cpu, label: "Agents" },
      { href: "/tasks", icon: CheckRing, label: "Tasks" },
      { href: "/omnichannel", icon: Layers, label: "Omnichannel" },
      { href: "/drafts", icon: IconFilePencil, label: "Drafts" },
    ],
    label: "Management",
  },
  {
    items: [
      { href: "/job-mandates", icon: PackageBoxAlt, label: "Job Mandates" },
      { href: "/prospects", icon: HappyFace, label: "Prospects" },
      { href: "/contracts", icon: Sertificate, label: "Contracts" },
      { href: "/clients", icon: UserBox, label: "Clients" },
    ],
    label: "Recruitment",
  },
  {
    items: [
      { href: "/whatsapp", icon: Chat, label: "WhatsApp" },
      { href: "/email", icon: EMail, label: "Email" },
      { href: "/voice", icon: Phone, label: "Voice" },
    ],
    label: "Channels",
  },
  {
    items: [
      { href: "/analytics", icon: ChartAlt, label: "Analytics" },
      { href: "/reports", icon: FileDock, label: "Reports" },
      { href: "/audit-log", icon: Notebook, label: "Audit Log" },
    ],
    label: "Admin",
  },
  {
    items: [
      { href: "/settings/profile", icon: UserBox, label: "Profile" },
      { href: "/settings/sla", icon: Clock, label: "SLAs" },
      { href: "/settings/connections", icon: LinkAlt, label: "Connections" },
      { href: "/settings/members", icon: UserBox, label: "Team Members" },
    ],
    label: "System",
  },
];

const menuButtonBase =
  "peer/menu-button group/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left font-medium text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding,transform] duration-150 ease-[var(--ease-out)] focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground data-open:hover:bg-sidebar-accent data-open:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&_svg]:size-4 [&_svg]:shrink-0 [@media_(hover:hover)and_(pointer:fine)]:hover:bg-sidebar-accent [@media_(hover:hover)and_(pointer:fine)]:hover:text-sidebar-accent-foreground";

const menuButtonSizeClasses: Record<string, string> = {
  default: "h-8 text-sm",
  lg: "h-12 text-sm group-data-[collapsible=icon]:p-0!",
  sm: "h-7 text-xs",
};

function SidebarTooltip({
  children,
  label,
}: {
  children: React.ReactElement;
  label: string;
}) {
  const { isMobile, state } = useSidebar();

  if (state !== "collapsed" || isMobile) {
    return children;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent align="center" side="right">
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: SidebarItem & { isActive: boolean }) {
  return (
    <li className="group/menu-item relative">
      <SidebarTooltip label={label}>
        <Link
          className={cn(
            menuButtonBase,
            menuButtonSizeClasses.default,
            "h-7! gap-1.5 py-0!",
          )}
          data-active={isActive || undefined}
          to={href}
        >
          <Icon className="size-4.5!" />
          <span>{label}</span>
        </Link>
      </SidebarTooltip>
    </li>
  );
}

function SidebarMenuButtonInternal({
  isActive = false,
  size = "default",
  tooltip,
  className,
  children,
  ...props
}: {
  isActive?: boolean;
  size?: "default" | "lg" | "sm";
  tooltip?: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ComponentProps<"button">, "children">) {
  const button = (
    <button
      className={cn(menuButtonBase, menuButtonSizeClasses[size], className)}
      data-active={isActive || undefined}
      type="button"
      {...props}
    >
      {children}
    </button>
  );

  if (!tooltip) return button;

  return <SidebarTooltip label={tooltip}>{button}</SidebarTooltip>;
}

export function AppSidebar({
  chatOpen,
  onChatToggle,
  onNewAction,
}: {
  chatOpen: boolean;
  onChatToggle: () => void;
  onNewAction: () => void;
}) {
  const { user } = useRouteContext({ from: "/(protected)" });
  const location = useLocation();
  const { isMobile, state, setOpenMobile, toggleSidebar } = useSidebar();

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  function isItemActive(href: string) {
    return (
      location.pathname === href || location.pathname.startsWith(`${href}/`)
    );
  }

  if (isMobile) {
    return (
      <div
        className="fixed inset-y-0 right-0 left-0 z-50 flex h-svh w-full flex-col bg-sidebar text-sidebar-foreground"
        data-mobile="true"
        data-sidebar="sidebar"
        data-slot="sidebar"
      >
        <div className="flex h-full w-full flex-col">
          <SidebarInner
            chatOpen={chatOpen}
            initials={initials}
            isItemActive={isItemActive}
            onChatToggle={onChatToggle}
            onNewAction={onNewAction}
            toggleSidebar={() => setOpenMobile(false)}
            user={user}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className="group peer hidden text-sidebar-foreground md:block"
      data-collapsible={state === "collapsed" ? "icon" : ""}
      data-side="left"
      data-slot="sidebar"
      data-state={state}
      data-variant="sidebar"
    >
      <div
        className="relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-[var(--ease-out)] group-data-[collapsible=icon]:w-(--sidebar-width-icon)"
        data-slot="sidebar-gap"
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-[var(--ease-out)] md:flex",
          "group-data-[collapsible=icon]:w-(--sidebar-width-icon)",
        )}
        data-side="left"
        data-slot="sidebar-container"
      >
        <div
          className="flex size-full flex-col bg-sidebar"
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
        >
          <SidebarInner
            chatOpen={chatOpen}
            initials={initials}
            isItemActive={isItemActive}
            onChatToggle={onChatToggle}
            onNewAction={onNewAction}
            onSearchAction={onNewAction}
            toggleSidebar={toggleSidebar}
            user={user}
          />
        </div>
      </div>

      <button
        aria-label="Toggle Sidebar"
        className="absolute inset-y-0 -right-4 z-20 hidden w-4 -translate-x-1/2 cursor-w-resize transition-[width,opacity] duration-150 ease-[var(--ease-out)] after:absolute after:inset-y-0 after:start-1/2 after:w-[2px] hover:after:bg-sidebar-border group-data-[collapsible=offcanvas]:translate-x-0 hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:after:left-full sm:flex [[data-side=left][data-collapsible=offcanvas]_&]:-right-2 [[data-side=left][data-state=collapsed]_&]:cursor-e-resize"
        data-sidebar="rail"
        data-slot="sidebar-rail"
        onClick={toggleSidebar}
        tabIndex={-1}
        title="Toggle Sidebar"
        type="button"
      />
    </div>
  );
}

function SidebarInner({
  chatOpen,
  initials,
  isItemActive,
  onChatToggle,
  onSearchAction,
  onNewAction,
  toggleSidebar,
  user,
}: {
  chatOpen: boolean;
  initials: string;
  isItemActive: (href: string) => boolean;
  onChatToggle: () => void;
  onSearchAction: () => void;
  onNewAction: () => void;
  toggleSidebar: () => void;
  user: { name: string; email: string; image?: string | null | undefined };
}) {
  return (
    <>
      <div className="flex flex-col p-2" data-slot="sidebar-header">
        <ul className="mb-4 flex w-full min-w-0 flex-col gap-0">
          <li className="group/menu-item relative">
            <SidebarMenuButtonInternal
              className="h-10 rounded-xl px-1"
              size="lg"
              tooltip="Workspace"
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="font-semibold text-xs">A</span>
              </div>
              <div className="truncate font-semibold text-sm">{SITE_NAME}</div>
            </SidebarMenuButtonInternal>
          </li>
        </ul>

        <SidebarMenuButtonInternal
          className="gap-1.5 rounded-lg"
          onClick={onNewAction}
          tooltip="New"
        >
          <IconPlus className="size-4.5!" />
          <span>New</span>
        </SidebarMenuButtonInternal>
        <SidebarMenuButtonInternal
          className="gap-1.5 rounded-lg"
          onClick={onSearchAction}
          tooltip="Search"
        >
          <IconSearch className="size-4.5!" />
          <span>Search</span>
        </SidebarMenuButtonInternal>
      </div>

      <div
        className="no-scrollbar flex min-h-0 flex-1 flex-col gap-0 overflow-auto group-data-[collapsible=icon]:overflow-hidden"
        data-slot="sidebar-content"
      >
        {SidebarItems.map((group) => (
          <div
            className="relative flex w-full min-w-0 flex-col p-2"
            data-slot="sidebar-group"
            key={group.label}
          >
            <div
              className="flex h-8 shrink-0 items-center rounded-md px-2 font-medium text-sidebar-foreground/70 text-xs outline-hidden ring-sidebar-ring transition-[margin,opacity] duration-200 ease-[var(--ease-out)] focus-visible:ring-2 group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0 [&>svg]:size-4 [&>svg]:shrink-0"
              data-slot="sidebar-group-label"
            >
              {group.label}
            </div>
            <div className="w-full text-sm" data-slot="sidebar-group-content">
              <ul className="flex w-full min-w-0 flex-col gap-px">
                {group.items.map((item) => (
                  <NavItem
                    href={item.href}
                    icon={item.icon}
                    isActive={isItemActive(item.href)}
                    key={item.label}
                    label={item.label}
                  />
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-2 p-2" data-slot="sidebar-footer">
        <ul className="flex w-full min-w-0 flex-col gap-0">
          <li className="group/menu-item relative">
            <SidebarMenuButtonInternal
              isActive={chatOpen}
              onClick={onChatToggle}
              tooltip="Agentic Chat"
            >
              <IconMessageChatbot className="size-4.5!" />
              <span>Agentic Chat</span>
            </SidebarMenuButtonInternal>
          </li>
          <li className="group/menu-item relative">
            <SidebarMenuButtonInternal
              className="w-full"
              data-sidebar="trigger"
              data-slot="sidebar-trigger"
              onClick={toggleSidebar}
              tooltip="Toggle Sidebar"
            >
              <IconLayoutSidebar />
              <span className="sr-only">Toggle Sidebar</span>
            </SidebarMenuButtonInternal>
          </li>
          <li className="group/menu-item relative">
            <SidebarMenuButtonInternal
              className="rounded-xl px-1"
              size="lg"
              tooltip={user.name}
            >
              <span
                className="relative flex size-10 shrink-0 select-none overflow-hidden rounded-lg after:absolute after:inset-0 after:rounded-lg after:border after:border-border after:mix-blend-darken dark:after:mix-blend-lighten"
                data-slot="avatar"
              >
                {user.image && (
                  <img
                    alt={user.name}
                    className="aspect-square size-full rounded-lg object-cover"
                    data-slot="avatar-image"
                    src={user.image}
                  />
                )}
                <span
                  className="flex size-full items-center justify-center rounded-lg bg-muted text-muted-foreground text-sm"
                  data-slot="avatar-fallback"
                >
                  {initials}
                </span>
              </span>
              <div>
                <div className="truncate font-medium text-sm">{user.name}</div>
                <div className="truncate text-xs capitalize">{user.role}</div>
              </div>
            </SidebarMenuButtonInternal>
          </li>
        </ul>
      </div>
    </>
  );
}
