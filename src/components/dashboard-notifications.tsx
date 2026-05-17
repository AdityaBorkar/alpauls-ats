import {
  IconAlertCircle,
  IconBell,
  IconCircleCheck,
  IconClock,
  IconUser,
} from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rpc } from "@/rpc/client";

const typeIconMap = {
  reminder_triggered: IconClock,
  system: IconAlertCircle,
  task_assigned: IconUser,
  task_deadline_approaching: IconClock,
  task_status_changed: IconCircleCheck,
} as const;

type NotificationItem = {
  id: number;
  userId: string;
  type: keyof typeof typeIconMap;
  title: string;
  body: string | null;
  taskId: number | null;
  readAt: Date | null;
  createdAt: Date | null;
};

type NotificationsResponse = {
  items: NotificationItem[];
  unreadCount: number;
};

export function DashboardNotifications() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    rpc.notification.list.queryOptions({ input: { limit: 5 } }),
  );

  const result = (data as NotificationsResponse | undefined) ?? {
    items: [],
    unreadCount: 0,
  };

  const markAllReadMutation = useMutation(
    rpc.notification.markAllRead.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: rpc.notification.list.queryOptions({ input: {} }).queryKey,
        });
      },
    }),
  );

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div className="flex items-center gap-2">
          <IconBell className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="font-semibold text-sm">Notifications</CardTitle>
          {result.unreadCount > 0 && (
            <Badge className="h-5 px-1.5 text-xs" variant="default">
              {result.unreadCount}
            </Badge>
          )}
        </div>
        {result.unreadCount > 0 && (
          <Button
            className="h-6 px-2 text-xs"
            disabled={markAllReadMutation.isPending}
            onClick={handleMarkAllRead}
            size="sm"
            variant="ghost"
          >
            Mark all read
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading && <p className="text-muted-foreground text-sm">Loading…</p>}
        {!isLoading && result.items.length === 0 && (
          <p className="text-muted-foreground text-sm">No notifications</p>
        )}
        <div className="space-y-3">
          {result.items.map((notification) => {
            const Icon = typeIconMap[notification.type] ?? IconBell;
            const isUnread = !notification.readAt;

            return (
              <div
                className="flex items-center justify-between"
                key={notification.id}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="relative">
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {isUnread && (
                      <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span
                    className={`truncate text-sm ${isUnread ? "font-medium" : "text-muted-foreground"}`}
                  >
                    {notification.title}
                  </span>
                </div>
                <span className="ml-2 shrink-0 text-muted-foreground text-xs">
                  {notification.createdAt
                    ? formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
