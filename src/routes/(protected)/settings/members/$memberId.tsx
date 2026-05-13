import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import { ArrowLeft, Shield, Trash2, User } from "lucide-react";
import { useEffect, useState } from "react";

import { PermissionsEditor } from "@/components/members/permissions-editor";
import { SupervisorCombobox } from "@/components/members/supervisor-combobox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import type { PermissionSet } from "@/lib/auth/access-control";
import { ROLE_DISPLAY_NAMES } from "@/lib/constants";
import { orpc } from "@/rpc/client";

type RoleCode =
  | "admin"
  | "bd"
  | "caller"
  | "custom"
  | "qc"
  | "rm"
  | "sc"
  | "tl";

const ROLE_CODES: RoleCode[] = [
  "admin",
  "bd",
  "caller",
  "qc",
  "rm",
  "sc",
  "tl",
  "custom",
];

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export const Route = createFileRoute("/(protected)/settings/members/$memberId")(
  {
    component: MemberDetailPage,
  },
);

function MemberDetailPage() {
  const { memberId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery(
    orpc.admin.listUsers.queryOptions({ input: {} }),
  );

  const member = users?.find((u) => u.id === memberId);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profileSupervisorId, setProfileSupervisorId] = useState<string | null>(
    null,
  );

  const [isEditingRole, setIsEditingRole] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleCode>("tl");
  const [permissions, setpermissions] = useState<PermissionSet>({});

  const [isBanned, setIsBanned] = useState(false);
  const [banReason, setBanReason] = useState("");
  const [banExpires, setBanExpires] = useState("");

  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    if (member) {
      setProfileName(member.name);
      setProfileEmail(member.email);
      setProfileSupervisorId(member.supervisorId ?? null);
      setSelectedRole((member.role ?? "custom") as RoleCode);
      setpermissions(member.permissions ?? {});
      setIsBanned(!!member.banned);
      setBanReason(member.banReason ?? "");
      setBanExpires(
        member.banExpires
          ? format(new Date(member.banExpires), "yyyy-MM-dd")
          : "",
      );
    }
  }, [member]);

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      orpc.admin.updateUser.call({ userId: memberId, ...input } as Parameters<
        typeof orpc.admin.updateUser.call
      >[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      setIsEditingProfile(false);
      setIsEditingRole(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => orpc.admin.archiveUser.call({ userId: memberId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin"] });
      navigate({ to: "/settings/members" });
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (input: { newPassword: string; userId: string }) =>
      orpc.admin.resetPassword.call(input),
    onSuccess: () => {
      setShowPasswordReset(false);
      setNewPassword("");
    },
  });

  function handleSaveProfile() {
    const update: Record<string, unknown> = {};
    if (profileName !== member?.name) update.name = profileName;
    if (profileEmail !== member?.email) update.email = profileEmail;
    if (profileSupervisorId !== (member?.supervisorId ?? null)) {
      update.supervisorId = profileSupervisorId;
    }
    updateMutation.mutate(update);
  }

  function handleSaveRole() {
    updateMutation.mutate({
      permissions: selectedRole === "custom" ? permissions : null,
      role: selectedRole !== member?.role ? selectedRole : undefined,
    });
  }

  function handleBanToggle() {
    if (isBanned && !member?.banned) {
      updateMutation.mutate({
        banExpires: banExpires
          ? new Date(`${banExpires}T23:59:59`).toISOString()
          : null,
        banned: true,
        banReason: banReason || null,
      });
    } else if (!isBanned && member?.banned) {
      updateMutation.mutate({ banned: false });
    }
  }

  function handleResetPassword() {
    resetPasswordMutation.mutate({
      newPassword,
      userId: memberId,
    });
  }

  function handleDelete() {
    if (deleteConfirmText === member?.name) {
      archiveMutation.mutate();
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-40 w-full max-w-2xl" />
        <Skeleton className="h-40 w-full max-w-2xl" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="space-y-6 p-6">
        <Button
          onClick={() => navigate({ to: "/settings/members" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Member not found</p>
      </div>
    );
  }

  const roleCode = (member.role ?? "custom") as RoleCode;

  const userOptions = (users ?? [])
    .filter((u) => u.id !== memberId)
    .map((u) => ({
      email: u.email,
      id: u.id,
      name: u.name,
      role: u.role,
    }));

  const supervisorName = member.supervisorName ?? "—";

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => navigate({ to: "/settings/members" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {member.image && (
              <AvatarImage alt={member.name} src={member.image} />
            )}
            <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{member.name}</h2>
              <Badge variant="outline">
                {ROLE_DISPLAY_NAMES[roleCode] ?? member.role ?? "Unknown"}
              </Badge>
              {member.banned && <Badge variant="destructive">Banned</Badge>}
            </div>
            <p className="text-muted-foreground text-sm">{member.email}</p>
          </div>
        </div>
      </div>

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </CardTitle>
            <CardDescription>
              Basic information about this team member
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingProfile ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Name</Label>
                  <Input
                    id="edit-name"
                    onChange={(e) => setProfileName(e.target.value)}
                    value={profileName}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    onChange={(e) => setProfileEmail(e.target.value)}
                    type="email"
                    value={profileEmail}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Supervisor{roleCode !== "admin" && " *"}</Label>
                  <SupervisorCombobox
                    excludeUserId={memberId}
                    onChange={setProfileSupervisorId}
                    required={roleCode !== "admin"}
                    users={userOptions}
                    value={profileSupervisorId}
                  />
                  {roleCode !== "admin" && !profileSupervisorId && (
                    <p className="text-destructive text-xs">
                      Non-admin users must have a supervisor
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      updateMutation.isPending ||
                      (roleCode !== "admin" && !profileSupervisorId)
                    }
                    onClick={handleSaveProfile}
                    size="sm"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingProfile(false);
                      setProfileName(member.name);
                      setProfileEmail(member.email);
                      setProfileSupervisorId(member.supervisorId ?? null);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                {updateMutation.error && (
                  <p className="text-destructive text-sm">
                    {updateMutation.error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Name</span>
                  <span className="font-medium text-sm">{member.name}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Email</span>
                  <span className="font-medium text-sm">{member.email}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Supervisor
                  </span>
                  <span className="font-medium text-sm">{supervisorName}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Added</span>
                  <span className="font-medium text-sm">
                    {member.createdAt
                      ? format(new Date(member.createdAt), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          {!isEditingProfile && (
            <CardFooter>
              <Button
                onClick={() => setIsEditingProfile(true)}
                size="sm"
                variant="outline"
              >
                Edit profile
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role & Permissions
            </CardTitle>
            <CardDescription>
              Control what this member can access and do
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isEditingRole ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    onValueChange={(v) => setSelectedRole(v as RoleCode)}
                    value={selectedRole}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_CODES.map((code) => (
                        <SelectItem key={code} value={code}>
                          {ROLE_DISPLAY_NAMES[code]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedRole === "custom" && (
                  <div className="space-y-2">
                    <Label>Custom Permissions</Label>
                    <PermissionsEditor
                      onChange={setpermissions}
                      value={permissions}
                    />
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={handleSaveRole}
                    size="sm"
                  >
                    Save
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditingRole(false);
                      setSelectedRole(roleCode);
                      setpermissions(member.permissions ?? {});
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                {updateMutation.error && (
                  <p className="text-destructive text-sm">
                    {updateMutation.error.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Role</span>
                  <Badge variant="outline">
                    {ROLE_DISPLAY_NAMES[roleCode] ?? member.role ?? "Unknown"}
                  </Badge>
                </div>
                {roleCode === "custom" && member.permissions && (
                  <>
                    <Separator />
                    <div className="space-y-1">
                      <span className="text-muted-foreground text-sm">
                        Permissions
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {(
                          Object.entries(member.permissions ?? {}) as [
                            string,
                            string[],
                          ][]
                        ).flatMap(([resource, actions]) =>
                          actions.map((action) => (
                            <Badge
                              key={`${resource}-${action}`}
                              variant="secondary"
                            >
                              {resource}:{action}
                            </Badge>
                          )),
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </CardContent>
          {!isEditingRole && (
            <CardFooter>
              <Button
                onClick={() => setIsEditingRole(true)}
                size="sm"
                variant="outline"
              >
                Edit role
              </Button>
            </CardFooter>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>
              Restrict or revoke this member&apos;s access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Ban member</Label>
                  <p className="text-muted-foreground text-xs">
                    Banning will immediately sign out this member and prevent
                    future sign-ins
                  </p>
                </div>
                <Switch
                  checked={isBanned}
                  onCheckedChange={(checked) => {
                    setIsBanned(checked);
                    if (!checked) {
                      updateMutation.mutate({ banned: false });
                    }
                  }}
                />
              </div>
              {isBanned && !member.banned && (
                <div className="space-y-3 rounded-md border p-3">
                  <div className="space-y-2">
                    <Label htmlFor="ban-reason">Reason</Label>
                    <Input
                      id="ban-reason"
                      onChange={(e) => setBanReason(e.target.value)}
                      placeholder="Reason for ban (optional)"
                      value={banReason}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ban-expires">Expiry date</Label>
                    <Input
                      id="ban-expires"
                      onChange={(e) => setBanExpires(e.target.value)}
                      type="date"
                      value={banExpires}
                    />
                  </div>
                  <Button
                    disabled={updateMutation.isPending}
                    onClick={handleBanToggle}
                    size="sm"
                    variant="destructive"
                  >
                    Confirm ban
                  </Button>
                </div>
              )}
              {member.banned && (
                <div className="rounded-md border border-destructive/50 bg-destructive/5 p-3 text-sm">
                  {member.banReason && <p>Reason: {member.banReason}</p>}
                  {member.banExpires && (
                    <p>
                      Expires:{" "}
                      {format(new Date(member.banExpires), "MMM d, yyyy")}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Reset this member&apos;s password</CardDescription>
          </CardHeader>
          <CardContent>
            {!showPasswordReset ? (
              <Button
                onClick={() => setShowPasswordReset(true)}
                size="sm"
                variant="outline"
              >
                Reset password
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input
                    id="new-password"
                    minLength={8}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    type="password"
                    value={newPassword}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      resetPasswordMutation.isPending || newPassword.length < 8
                    }
                    onClick={handleResetPassword}
                    size="sm"
                  >
                    Reset password
                  </Button>
                  <Button
                    onClick={() => {
                      setShowPasswordReset(false);
                      setNewPassword("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                {resetPasswordMutation.error && (
                  <p className="text-destructive text-sm">
                    {resetPasswordMutation.error.message}
                  </p>
                )}
                {resetPasswordMutation.isSuccess && (
                  <p className="text-emerald-600 text-sm">
                    Password has been reset successfully
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>
              Permanently remove this team member and all their data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                size="sm"
                variant="destructive"
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Delete member
              </Button>
            ) : (
              <div className="space-y-3 rounded-md border border-destructive/50 bg-destructive/5 p-3">
                <p className="text-sm">
                  Type <strong>{member.name}</strong> to confirm deletion
                </p>
                <Input
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={`Type "${member.name}" to confirm`}
                  value={deleteConfirmText}
                />
                <div className="flex gap-2">
                  <Button
                    disabled={
                      archiveMutation.isPending ||
                      deleteConfirmText !== member.name
                    }
                    onClick={handleDelete}
                    size="sm"
                    variant="destructive"
                  >
                    {archiveMutation.isPending
                      ? "Deleting..."
                      : "Confirm delete"}
                  </Button>
                  <Button
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText("");
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </div>
                {archiveMutation.error && (
                  <p className="text-destructive text-sm">
                    {archiveMutation.error.message}
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
