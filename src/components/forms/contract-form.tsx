import { useQuery } from "@tanstack/react-query";
import { useFormContext } from "react-hook-form";
import type { z } from "zod";

import { Field, Form } from "#/forms";
import { Button } from "@/components/ui/button";
import { ClientContract_FormSchema } from "@/lib/form-schemas/client-contract";
import { rpc } from "@/rpc/client";

type ClientContractType = z.infer<typeof ClientContract_FormSchema>;

export function ContractForm({
  mode,
  onSubmit,
  isPending,
  defaultValues,
}: {
  mode: "create" | "edit";
  onSubmit: (values: ClientContractType) => void;
  isPending: boolean;
  defaultValues?: Partial<ClientContractType>;
}) {
  const { data: clients } = useQuery(
    rpc.client.list.queryOptions({ input: { limit: 100 } }),
  );

  const { data: bd_users } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100, role: ["bd"] } }),
  );

  const { data: rm_users } = useQuery(
    rpc.users.list.queryOptions({ input: { limit: 100, role: ["rm"] } }),
  );

  return (
    <Form
      className="space-y-6"
      defaultValues={defaultValues}
      onSubmit={onSubmit}
      schema={ClientContract_FormSchema}
    >
      <Field name="title" />
      <Field name="referenceNumber" />
      <Field name="description" />
      <Field
        config={{
          getOptionLabel: ({ name }) => name,
          getOptionValue: ({ id }) => id,
          options: clients?.items || [],
          // placeholder: "Search clients...",
        }}
        name="clientId"
      />
      <Field
        config={{
          getOptionLabel: ({ name }) => name,
          getOptionValue: ({ id }) => id,
          options: bd_users?.items,
          // placeholder: "Search BD users...",
        }}
        name="assigneeId"
      />
      <Field
        config={{
          getOptionLabel: ({ name }) => name,
          getOptionValue: ({ id }) => id,
          options: rm_users?.items,
          // placeholder: "Search RM users...",
        }}
        name="rmId"
      />
      <div className="grid grid-cols-3 gap-4">
        <Field name="startDate" />
        <Field name="endDate" />
        <Field name="signedDate" />
      </div>
      <Field name="pdfLink" />
      <Field name="status" />
      <ContractFormActions isPending={isPending} mode={mode} />
    </Form>
  );
}

function ContractFormActions({
  mode,
  isPending,
}: {
  mode: "create" | "edit";
  isPending: boolean;
}) {
  const { watch } = useFormContext();
  const title = watch("title");
  const clientId = watch("clientId");
  const assigneeId = watch("assigneeId");

  return (
    <div className="flex gap-3">
      <Button
        disabled={isPending || !title || !clientId || !assigneeId}
        type="submit"
      >
        {mode === "create" ? "Create Contract" : "Save Changes"}
      </Button>
    </div>
  );
}
