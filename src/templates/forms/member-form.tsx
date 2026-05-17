import type { z } from "zod";

import { Field, Form } from "@/components/forms";
import { PermissionsEditor } from "@/components/permissions-editor";
import { Button } from "@/components/ui/button";
import {
  memberFormSchema,
  memberUpdateFormSchema,
} from "@/lib/form-schemas/auth";

import { SupervisorCombobox } from "../inputs/supervisor-combobox";

type CreateValues = z.infer<typeof memberFormSchema>;
type UpdateValues = z.infer<typeof memberUpdateFormSchema>;

export type RoleCode =
  | "admin"
  | "bd"
  | "caller"
  | "custom"
  | "qc"
  | "rm"
  | "sc"
  | "tl";

export type UserOption = {
  id: string;
  name: string;
  email: string;
  role: string | null;
};

export type MemberFormProps = {
  mode: "create" | "edit";
  onSubmit: (values: CreateValues | UpdateValues) => void;
  isPending: boolean;
  users?: UserOption[];
  excludeUserId?: string;
  defaultValues?: Partial<CreateValues> | Partial<UpdateValues>;
};

export function MemberForm({
  mode,
  onSubmit,
  isPending,
  users = [],
  excludeUserId,
  defaultValues,
}: MemberFormProps) {
  const schema = mode === "create" ? memberFormSchema : memberUpdateFormSchema;

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      schema={schema}
    >
      {({ watch }) => {
        const currentRole = watch("role");
        const showPassword = mode === "create";
        const showPermissions = currentRole === "custom";
        const isAdmin = currentRole === "admin";

        return (
          <>
            <Field name="name" />
            <Field name="email" />
            {showPassword && <Field name="password" />}
            <Field name="role" />
            <Field
              config={{
                getOptionLabel: ({ name }) => name,
                getOptionValue: ({ id }) => id,
                options: users,
                searchPlaceholder: "Search users...",
              }}
              disabled={isAdmin}
              name="supervisorId"
              overrides={({ field, disabled: fieldDisabled }) => (
                <SupervisorCombobox
                  disabled={fieldDisabled}
                  excludeUserId={excludeUserId}
                  onChange={field.onChange}
                  required={!isAdmin}
                  users={users}
                  value={field.value}
                />
              )}
            />
            {showPermissions && (
              <Field
                name="permissions"
                overrides={({ field }) => (
                  <PermissionsEditor
                    onChange={field.onChange}
                    value={field.value ?? {}}
                  />
                )}
              />
            )}
            <div className="flex gap-3">
              <Button disabled={isPending} type="submit">
                {mode === "create" ? "Add Member" : "Save Changes"}
              </Button>
            </div>
          </>
        );
      }}
    </Form>
  );
}
