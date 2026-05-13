import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PermissionSet } from "@/lib/auth/access-control";
import { ROLE_DISPLAY_NAMES } from "@/lib/constants";

import { PermissionsEditor } from "./permissions-editor";
import { SupervisorCombobox } from "./supervisor-combobox";

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

type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

type MemberFormValues = {
  permissions: PermissionSet;
  email: string;
  name: string;
  password: string;
  role: RoleCode;
  supervisorId: string | null;
};

type MemberFormProps = {
  mode: "create" | "edit";
  values: MemberFormValues;
  onChange: (values: MemberFormValues) => void;
  onSubmit: () => void;
  isPending: boolean;
  error?: string | null;
  users?: UserOption[];
  excludeUserId?: string;
};

export function MemberForm({
  mode,
  values,
  onChange,
  onSubmit,
  isPending,
  error,
  users = [],
  excludeUserId,
}: MemberFormProps) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit();
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          onChange={(e) => onChange({ ...values, name: e.target.value })}
          placeholder="Full name"
          required
          value={values.name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          autoComplete="email"
          id="email"
          onChange={(e) => onChange({ ...values, email: e.target.value })}
          placeholder="email@example.com"
          required
          type="email"
          value={values.email}
        />
      </div>

      {mode === "create" && (
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            autoComplete="new-password"
            id="password"
            minLength={8}
            onChange={(e) => onChange({ ...values, password: e.target.value })}
            placeholder="Minimum 8 characters"
            required
            type="password"
            value={values.password}
          />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <Select
          onValueChange={(v) => {
            const newRole = v as RoleCode;
            onChange({
              ...values,
              role: newRole,
              supervisorId: newRole === "admin" ? null : values.supervisorId,
            });
          }}
          value={values.role}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a role" />
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

      <div className="space-y-2">
        <Label>Supervisor{values.role !== "admin" && " *"}</Label>
        <SupervisorCombobox
          disabled={values.role === "admin"}
          excludeUserId={excludeUserId}
          onChange={(supervisorId) => onChange({ ...values, supervisorId })}
          required={values.role !== "admin"}
          users={users}
          value={values.supervisorId}
        />
        {values.role !== "admin" && !values.supervisorId && (
          <p className="text-destructive text-xs">
            Non-admin users must have a supervisor
          </p>
        )}
      </div>

      {values.role === "custom" && (
        <div className="space-y-2">
          <Label>Custom Permissions</Label>
          <PermissionsEditor
            onChange={(permissions) => onChange({ ...values, permissions })}
            value={values.permissions}
          />
        </div>
      )}

      <div className="flex gap-3">
        <Button disabled={isPending} type="submit">
          {mode === "create" ? "Add Member" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}

export type { MemberFormValues, RoleCode, UserOption };
