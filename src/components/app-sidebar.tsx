import {
  IconBriefcase,
  IconCalendar,
  IconChartBar,
  IconClock,
  IconFileText,
  IconHome,
  IconReportAnalytics,
  IconSettings,
  IconTargetArrow,
  IconUsers,
} from "@tabler/icons-react";
import { Link, useLocation, useRouteContext } from "@tanstack/react-router";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import { SITE_NAME } from "@/lib/constants";

const navGroups = [
  {
    items: [
      { href: "/dashboard", icon: IconHome, label: "Dashboard" },
      { href: "/tasks", icon: IconCalendar, label: "Tasks" },
      { href: "/analytics", icon: IconChartBar, label: "Analytics" },
      { href: "/reports", icon: IconReportAnalytics, label: "Reports" },
    ],
    label: "Management",
  },
  {
    items: [
      { href: "/clients", icon: IconUsers, label: "Clients" },
      { href: "/contracts", icon: IconFileText, label: "Contracts" },
      { href: "/job-mandates", icon: IconBriefcase, label: "Job Mandates" },
      { href: "/prospects", icon: IconTargetArrow, label: "Prospects" },
    ],
    label: "Recruitment",
  },
  {
    items: [
      { href: "/settings", icon: IconSettings, label: "Settings" },
      { href: "/members", icon: IconUsers, label: "Members" },
      { href: "/sla", icon: IconClock, label: "SLAs" },
    ],
    label: "System",
  },
];

function NavItem({
  href,
  icon: Icon,
  label,
  isActive,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
}) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        isActive={isActive}
        render={<Link to={href} />}
        tooltip={label}
      >
        <Icon />
        <span>{label}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}

export function AppSidebar() {
  const { user } = useRouteContext({ from: "/(protected)" });
  const location = useLocation();
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

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip="Workspace">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <span className="font-semibold text-xs">W</span>
              </div>
              <div className="truncate font-semibold text-sm">{SITE_NAME}</div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <NavItem
                    href={item.href}
                    icon={item.icon}
                    isActive={isItemActive(item.href)}
                    key={item.label}
                    label={item.label}
                  />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" tooltip={user.name}>
              <Avatar className="size-8 rounded-lg">
                {user.image && <AvatarImage alt={user.name} src={user.image} />}
                <AvatarFallback className="rounded-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="truncate font-medium text-sm">
                  {user.name}
                </span>
                <span className="truncate text-xs">{user.email}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
