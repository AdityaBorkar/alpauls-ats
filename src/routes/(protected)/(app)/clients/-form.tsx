import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { Field, Form } from "#/forms";
import { LogoUpload } from "@/components/logo-upload";
import { Button } from "@/components/ui/button";
import { Client_FormSchema } from "@/lib/form-schemas/client";
import { slugify } from "@/lib/utils";
import { rpc } from "@/rpc/client";

type ClientFormType = z.infer<typeof Client_FormSchema>;

export function ClientForm({
  mode,
  defaultValues: defaultValuesProp,
  draftId,
  clientId,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  defaultValues?: Partial<ClientFormType>;
  draftId?: string;
  clientId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: draft } = useQuery({
    ...rpc.draft.getById.queryOptions({
      input: { id: Number(draftId) },
    }),
    enabled: !!draftId && mode === "create",
  }) as { data?: { data: Record<string, unknown> } };

  const parsed = Client_FormSchema.safeParse(draft?.data || {});
  const draftDefaults = parsed.success ? parsed.data : undefined;
  const resolvedDefaults =
    mode === "create" ? draftDefaults : defaultValuesProp;

  const { data: bd_users } = useQuery(
    rpc.users.list.queryOptions({
      input: { limit: 100, role: ["admin", "bd"] },
    }),
  );

  const createMutation = useMutation({
    mutationFn: (input: ClientFormType) => rpc.client.create.call(input),
    onSuccess: async (data) => {
      if (!data) return;
      queryClient.invalidateQueries({ queryKey: ["client"] });
      if (draftId) {
        await rpc.draft.delete.call({ id: Number(draftId) });
        queryClient.invalidateQueries({ queryKey: ["draft"] });
      }
      navigate({
        params: { clientId: String(data.id) },
        to: "/clients/$clientId",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: ClientFormType) =>
      rpc.client.update.call({
        id: clientId!,
        ...input,
      } as Parameters<typeof rpc.client.update.call>[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      onSuccess?.();
    },
  });

  const saveDraftMutation = useMutation({
    mutationFn: (input: ClientFormType) =>
      rpc.draft.create.call({
        data: input as unknown as Record<string, unknown>,
        entityType: "client",
        title: input.name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft"] });
    },
  });

  const isPending =
    mode === "create" ? createMutation.isPending : updateMutation.isPending;

  function handleSubmit(values: ClientFormType) {
    if (mode === "create") {
      createMutation.mutate(values);
    } else {
      updateMutation.mutate(values);
    }
  }

  return (
    <Form
      className="space-y-6"
      defaultValues={resolvedDefaults}
      onSubmit={handleSubmit}
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
      <ClientFormActions
        isPending={isPending}
        isSaveDraftPending={saveDraftMutation.isPending}
        mode={mode}
        onCancel={onCancel}
        onSaveDraft={
          mode === "create"
            ? (values) => saveDraftMutation.mutate(values)
            : undefined
        }
      />
    </Form>
  );
}

function SlugSync({ mode }: { mode: "create" | "edit" }) {
  const { watch, setValue } = useFormContext();

  useEffect(() => {
    if (mode === "edit") return;
    const { unsubscribe } = watch((values, { name }) => {
      if (name === "name" && typeof values.name === "string") {
        setValue("slug", slugify(values.name), { shouldValidate: true });
      }
    });
    return unsubscribe;
  }, [mode, watch, setValue]);

  return null;
}

function ClientFormActions({
  mode,
  isPending,
  onSaveDraft,
  isSaveDraftPending,
  onCancel,
}: {
  mode: "create" | "edit";
  isPending: boolean;
  onSaveDraft?: (values: ClientFormType) => void;
  isSaveDraftPending?: boolean;
  onCancel?: () => void;
}) {
  const { watch, getValues } = useFormContext<ClientFormType>();
  const name = watch("name");
  const assigneeId = watch("assigneeId");

  return (
    <div className="flex gap-3">
      <Button disabled={isPending || !name || !assigneeId} type="submit">
        {mode === "create" ? "Create Client" : "Save Changes"}
      </Button>
      {mode === "create" && onSaveDraft && (
        <Button
          disabled={isSaveDraftPending || !name}
          onClick={() => onSaveDraft(getValues())}
          type="button"
          variant="outline"
        >
          {isSaveDraftPending ? "Saving..." : "Save to Drafts"}
        </Button>
      )}
      {mode === "edit" && onCancel && (
        <Button onClick={onCancel} type="button" variant="outline">
          Cancel
        </Button>
      )}
    </div>
  );
}
