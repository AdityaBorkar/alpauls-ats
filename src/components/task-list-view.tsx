import { Archive, Search } from "lucide-react";
import { useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";
import type { TaskStatus } from "@/services/task-service";

import type { TaskItem, TaskListResponse } from "./tasks.types";
import { STATUS_COLORS, STATUS_LABELS } from "./tasks.types";

type TaskListViewProps = {
  onTaskClick: (task: TaskItem) => void;
  refreshKey: number;
};

export function TaskListView({ onTaskClick, refreshKey }: TaskListViewProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [cursor, setCursor] = useState<string | undefined>();

  const { data, isLoading } = useORPCQuery(
    () =>
      client.task.list({
        archived: showArchived ? undefined : false,
        cursor,
        limit: 20,
        search: search || undefined,
        status:
          statusFilter !== "all" ? [statusFilter as TaskStatus] : undefined,
      }),
    [refreshKey, cursor, search, statusFilter, showArchived],
  );

  const tasks = (data as TaskListResponse | undefined)?.items ?? [];
  const nextCursor = (data as TaskListResponse | undefined)?.nextCursor;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            onChange={(e) => {
              setSearch(e.target.value);
              setCursor(undefined);
            }}
            placeholder="Search tasks..."
            value={search}
          />
        </div>
        <Select
          onValueChange={(v: string | null) => {
            setStatusFilter(v ?? "");
            setCursor(undefined);
          }}
          value={statusFilter}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="todo">To Do</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="done">Done</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Checkbox
            checked={showArchived}
            id="archived"
            onCheckedChange={(v: boolean) => {
              setShowArchived(!!v);
              setCursor(undefined);
            }}
          />
          <label className="text-muted-foreground text-sm" htmlFor="archived">
            Show archived
          </label>
        </div>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>Start</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={5}
                >
                  Loading...
                </TableCell>
              </TableRow>
            )}
            {!isLoading && tasks.length === 0 && (
              <TableRow>
                <TableCell
                  className="text-center text-muted-foreground"
                  colSpan={5}
                >
                  No tasks found
                </TableCell>
              </TableRow>
            )}
            {tasks.map((task) => (
              <TableRow
                className="cursor-pointer"
                key={task.id}
                onClick={() => onTaskClick(task)}
              >
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {task.title}
                    {task.archived && (
                      <Archive className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    className={STATUS_COLORS[task.status]}
                    variant="outline"
                  >
                    {STATUS_LABELS[task.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.assignee.image ?? undefined} />
                      <AvatarFallback>
                        {task.assignee.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{task.assignee.name}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {task.deadline && (
                    <span className="text-sm">{task.deadline}</span>
                  )}
                </TableCell>
                <TableCell>
                  {task.startDate && (
                    <span className="text-sm">{task.startDate}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {nextCursor && (
        <div className="flex justify-center">
          <Button
            onClick={() => setCursor(nextCursor)}
            size="sm"
            variant="outline"
          >
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}
