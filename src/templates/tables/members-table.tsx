import { useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PermissionSet } from "@/lib/auth/access-control";
import { ROLE_DISPLAY_NAMES } from "@/lib/constants";

type MemberItem = {
  banExpires: Date | null;
  banned: boolean | null;
  banReason: string | null;
  createdAt: Date | null;
  permissions: PermissionSet | null;
  email: string;
  id: string;
  image: string | null;
  name: string;
  role: string | null;
  supervisorId: string | null;
  supervisorName: string | null;
};

type MembersTableProps = {
  members: MemberItem[];
  isLoading: boolean;
  search: string;
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function MembersTable({
  members,
  isLoading,
  search,
}: MembersTableProps) {
  const navigate = useNavigate();

  const filtered = search
    ? members.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.email.toLowerCase().includes(search.toLowerCase()),
      )
    : members;

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Supervisor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Added</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))}
          {!isLoading && filtered.length === 0 && (
            <TableRow>
              <TableCell
                className="text-center text-muted-foreground"
                colSpan={5}
              >
                {search ? "No members match your search" : "No members yet"}
              </TableCell>
            </TableRow>
          )}
          {!isLoading &&
            filtered.map((member) => (
              <TableRow
                className="cursor-pointer"
                key={member.id}
                onClick={() =>
                  navigate({
                    params: { memberId: member.id },
                    to: "/settings/members/$memberId",
                  })
                }
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      {member.image && (
                        <AvatarImage alt={member.name} src={member.image} />
                      )}
                      <AvatarFallback>
                        {getInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{member.name}</div>
                      <div className="text-muted-foreground text-sm">
                        {member.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {ROLE_DISPLAY_NAMES[
                      member.role as keyof typeof ROLE_DISPLAY_NAMES
                    ] ??
                      member.role ??
                      "—"}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {member.supervisorName ?? "—"}
                </TableCell>
                <TableCell>
                  {member.banned ? (
                    <Badge variant="destructive">Banned</Badge>
                  ) : (
                    <Badge
                      className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      variant="outline"
                    >
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {member.createdAt
                    ? format(new Date(member.createdAt), "MMM d, yyyy")
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { MemberItem };
