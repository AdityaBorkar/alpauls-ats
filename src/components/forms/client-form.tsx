import { useState } from "react";
import type { z } from "zod";

import { Field, Form } from "#/forms";
import { Button } from "@/components/ui/button";
import {
  clientFormSchema,
  clientUpdateFormSchema,
} from "@/lib/form-schemas/client";

import { LogoUpload } from "../../components/logo-upload";

type UserOption = {
  id: string;
  name: string;
  role: string | null;
};

type CreateValues = z.infer<typeof clientFormSchema>;
type UpdateValues = z.infer<typeof clientUpdateFormSchema>;

type ClientFormProps = {
  mode: "create" | "edit";
  onSubmit: (values: CreateValues | UpdateValues) => void;
  isPending: boolean;
  users?: UserOption[];
  defaultValues?: Partial<CreateValues> | Partial<UpdateValues>;
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ClientForm({
  mode,
  onSubmit,
  isPending,
  users = [],
  defaultValues,
}: ClientFormProps) {
  const [slugManuallyEdited] = useState(mode === "edit");
  const schema = mode === "create" ? clientFormSchema : clientUpdateFormSchema;

  function handleSubmit(values: CreateValues | UpdateValues) {
    const submitted =
      slugManuallyEdited || !("name" in values && values.name)
        ? values
        : { ...values, slug: slugify(values.name) };
    onSubmit(submitted);
  }

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      schema={schema}
    >
      {({ watch, setValue }) => {
        const currentName = watch("name");
        if (!slugManuallyEdited && currentName !== undefined) {
          setValue("slug", slugify(currentName), { shouldValidate: false });
        }

        return (
          <>
            <Field name="name" />
            <Field name="legalName" />
            <Field
              name="logo"
              overrides={({ field }) => (
                <LogoUpload
                  onChange={(url: string | null) => field.onChange(url)}
                  value={field.value}
                />
              )}
            />
            <Field name="slug" />
            <Field name="locations" />
            <Field name="internalNotes" />
            {users.length > 0 && (
              <Field
                config={{
                  getOptionLabel: ({ name }) => name,
                  getOptionValue: ({ id }) => id,
                  options: users,
                  searchPlaceholder: "Search users...",
                }}
                name="assigneeId"
              />
            )}
            <div className="flex gap-3">
              <Button disabled={isPending} type="submit">
                {mode === "create" ? "Create Client" : "Save Changes"}
              </Button>
            </div>
          </>
        );
      }}
    </Form>
  );
}

export type { ClientFormProps, UserOption };
