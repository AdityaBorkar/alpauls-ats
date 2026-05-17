import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { Field, Form } from "#/forms";
import { PermissionsEditor } from "@/components/permissions-editor";
import { SupervisorCombobox } from "@/components/supervisor-combobox";
import { Button } from "@/components/ui/button";
import { Member_FormSchema } from "@/lib/form-schemas/auth";
import { rpc } from "@/rpc/client";

type MemberFormType = z.infer<typeof Member_FormSchema>;

export type RoleCode =
  | "admin"
  | "bd"
  | "caller"
  | "custom"
  | "qc"
  | "rm"
  | "sc"
  | "tl";

export function MemberForm({
  mode,
  onSubmit,
  isPending,
  defaultValues,
}: {
  mode: "create" | "edit";
  onSubmit: (values: MemberFormType) => void;
  isPending: boolean;
  defaultValues?: Partial<MemberFormType>;
}) {
  const { data: users } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100 } }),
  );

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      schema={Member_FormSchema}
    >
      <Field name="name" />
      <Field name="email" />
      {mode === "create" && <Field name="password" />}
      <Field name="role" />
      <MemberSupervisorField
        excludeUserId={defaultValues?.id}
        users={users?.items ?? []}
      />
      <MemberPermissionsField />
      <MemberFormActions isPending={isPending} mode={mode} />
    </Form>
  );
}

function MemberSupervisorField({
  users,
  excludeUserId,
}: {
  users: { id: string; name: string; email: string; role: string | null }[];
  excludeUserId?: string;
}) {
  const { watch } = useFormContext();
  const currentRole = watch("role");
  const isAdmin = currentRole === "admin";

  return (
    <Field
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
  );
}

function MemberPermissionsField() {
  const { watch } = useFormContext();
  const currentRole = watch("role");
  const showPermissions = currentRole === "custom";

  if (!showPermissions) return null;

  return (
    <Field
      name="permissions"
      overrides={({ field }) => (
        <PermissionsEditor
          onChange={field.onChange}
          value={field.value ?? {}}
        />
      )}
    />
  );
}

function MemberFormActions({
  mode,
  isPending,
}: {
  mode: "create" | "edit";
  isPending: boolean;
}) {
  const { watch } = useFormContext();
  const name = watch("name");
  const email = watch("email");

  return (
    <div className="flex gap-3">
      <Button disabled={isPending || !name || !email} type="submit">
        {mode === "create" ? "Add Member" : "Save Changes"}
      </Button>
    </div>
  );
}
