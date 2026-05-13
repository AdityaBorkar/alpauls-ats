import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { PermissionSet } from "@/lib/auth/access-control";

const RESOURCES: Record<string, string[]> = {
  client_contracts: ["create", "read", "update", "archive"],
  clients: ["create", "read", "update", "archive"],
  job_mandates: ["create", "read", "update", "archive", "assign", "link_prospect", "verify"],
  notification: ["read", "update", "archive"],
  prospects: ["create", "read", "update", "archive"],
  reminders: ["create", "read", "archive"],
  tasks: ["create", "read", "update", "archive", "assign"],
  team_members: ["create", "read", "update", "archive", "manage-roles"],
};

const RESOURCE_LABELS: Record<string, string> = {
  client_contracts: "Client Contracts",
  clients: "Clients",
  job_mandates: "Job Mandates",
  notification: "Notifications",
  prospects: "Prospects",
  reminders: "Reminders",
  tasks: "Tasks",
  team_members: "Team Members",
};

const ACTION_LABELS: Record<string, string> = {
  archive: "Archive",
  assign: "Assign",
  create: "Create",
  "link_prospect": "Link Prospect",
  "manage-roles": "Manage Roles",
  read: "Read",
  update: "Update",
  verify: "Verify",
};

type PermissionsEditorProps = {
  value: PermissionSet;
  onChange: (value: PermissionSet) => void;
  disabled?: boolean;
};

export function PermissionsEditor({
  value,
  onChange,
  disabled,
}: PermissionsEditorProps) {
  function togglePermission(resource: string, action: string) {
    const current = value[resource] ?? [];
    const next = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action];

    const updated = { ...value };
    if (next.length > 0) {
      updated[resource] = next;
    } else {
      delete updated[resource];
    }
    onChange(updated);
  }

  function toggleResource(resource: string) {
    const allActions = RESOURCES[resource];
    const current = value[resource] ?? [];
    const allSelected = allActions.every((a) => current.includes(a));

    if (allSelected) {
      const next = { ...value };
      delete next[resource];
      onChange(next);
    } else {
      onChange({ ...value, [resource]: allActions });
    }
  }

  return (
    <div className="space-y-3">
      {Object.entries(RESOURCES).map(([resource, actions]) => {
        const selected = value[resource] ?? [];
        const allSelected = actions.every((a) => selected.includes(a));

        return (
          <div className="rounded-lg border p-3" key={resource}>
            <div className="mb-2 flex items-center gap-2">
              <Checkbox
                checked={allSelected}
                disabled={disabled}
                id={`resource-${resource}`}
                onCheckedChange={() => toggleResource(resource)}
              />
              <Label className="font-medium" htmlFor={`resource-${resource}`}>
                {RESOURCE_LABELS[resource] ?? resource}
              </Label>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-2 pl-6">
              {actions.map((action) => {
                const key = `${resource}-${action}`;
                return (
                  <div className="flex items-center gap-1.5" key={key}>
                    <Checkbox
                      checked={selected.includes(action)}
                      disabled={disabled}
                      id={`perm-${key}`}
                      onCheckedChange={() => togglePermission(resource, action)}
                    />
                    <Label className="text-sm" htmlFor={`perm-${key}`}>
                      {ACTION_LABELS[action] ?? action}
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
