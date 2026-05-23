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
  draftId,
}: {
  mode: "create" | "edit";
  draftId?: string;
}) {
  const { data: bd_users } = useQuery(
    rpc.users.list.queryOptions({
      input: { limit: 100, role: ["admin", "bd"] },
    }) as any,
  ) as { data?: { items: { id: string; name: string }[] } };

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: draft } = useQuery({
    ...(rpc.draft.getById.queryOptions({
      input: { id: Number(draftId!) },
    }) as any),
    enabled: !!draftId,
  }) as { data?: { data: Record<string, unknown> } };

  const createMutation = useMutation({
    mutationFn: (input: Record<string, any>) =>
      rpc.client.create.call(input as any),
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

  const saveDraftMutation = useMutation({
    mutationFn: (input: Record<string, any>) =>
      rpc.draft.create.call({
        data: input as Record<string, unknown>,
        entityType: "client",
        title: input.name,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft"] });
    },
  });

  const defaultValues = draft // TODO: VALIDATE DRAFT AND REFINE IT AND PASS IT ON
    ? // TODO: PRINT ERRORS ON VALIDATION FAILURE
      {
        assigneeId: (draft.data.assigneeId as string) ?? "",
        internalNotes: (draft.data.internalNotes as string) ?? undefined,
        legalName: (draft.data.legalName as string) ?? undefined,
        locations: draft.data.locations as
          | { city: string; country: string }[]
          | undefined,
        logo: (draft.data.logo as string) ?? undefined,
        name: (draft.data.name as string) ?? "",
        slug: (draft.data.slug as string) ?? undefined,
      }
    : undefined;

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={(values) => createMutation.mutate(values)}
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
        isPending={createMutation.isPending}
        isSaveDraftPending={saveDraftMutation.isPending}
        mode={mode}
        onSaveDraft={(values) => saveDraftMutation.mutate(values)}
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
}: {
  mode: "create" | "edit";
  isPending: boolean;
  onSaveDraft?: (values: ClientFormType) => void;
  isSaveDraftPending?: boolean;
}) {
  const { watch, getValues } = useFormContext<ClientFormType>();
  const name = watch("name");
  const assigneeId = watch("assigneeId");

  function handleSaveDraft() {
    if (onSaveDraft) {
      onSaveDraft(getValues());
    }
  }

  return (
    <div className="flex gap-3">
      <Button disabled={isPending || !name || !assigneeId} type="submit">
        {mode === "create" ? "Create Client" : "Save Changes"}
      </Button>
      {mode === "create" && onSaveDraft && (
        <Button
          disabled={isSaveDraftPending || !name}
          onClick={handleSaveDraft}
          type="button"
          variant="outline"
        >
          {isSaveDraftPending ? "Saving..." : "Save to Drafts"}
        </Button>
      )}
    </div>
  );
}
