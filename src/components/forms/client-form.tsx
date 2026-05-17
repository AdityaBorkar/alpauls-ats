import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { Field, Form } from "#/forms";
import { LogoUpload } from "@/components/logo-upload";
import { Button } from "@/components/ui/button";
import { Client_FormSchema } from "@/lib/form-schemas/client";
import { rpc } from "@/rpc/client";

type ClientFormType = z.infer<typeof Client_FormSchema>;

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
  defaultValues,
}: {
  mode: "create" | "edit";
  onSubmit: (values: ClientFormType) => void;
  isPending: boolean;
  defaultValues?: Partial<ClientFormType>;
}) {
  const { data: bd_users } = useQuery(
    rpc.users.list.queryOptions({
      input: { limit: 100, role: ["admin", "bd"] },
    }),
  );

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      schema={Client_FormSchema}
    >
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
      <SlugSync mode={mode} />
      <Field name="slug" />
      <Field name="locations" />
      <Field name="internalNotes" />
      <Field
        config={{
          getOptionLabel: ({ name }) => name,
          getOptionValue: ({ id }) => id,
          options: bd_users?.items ?? [],
        }}
        name="assigneeId"
      />
      <ClientFormActions isPending={isPending} mode={mode} />
    </Form>
  );
}

function SlugSync({ mode }: { mode: "create" | "edit" }) {
  const { watch, setValue } = useFormContext();

  useEffect(() => {
    if (mode === "edit") return;
    const { unsubscribe } = watch((values, { name }) => {
      if (name === "name" && typeof values.name === "string") {
        setValue("slug", slugify(values.name), { shouldValidate: false });
      }
    });
    return unsubscribe;
  }, [mode, watch, setValue]);

  return null;
}

function ClientFormActions({
  mode,
  isPending,
}: {
  mode: "create" | "edit";
  isPending: boolean;
}) {
  const { watch } = useFormContext();
  const name = watch("name");
  const assigneeId = watch("assigneeId");

  return (
    <div className="flex gap-3">
      <Button disabled={isPending || !name || !assigneeId} type="submit">
        {mode === "create" ? "Create Client" : "Save Changes"}
      </Button>
    </div>
  );
}
