import { useQuery } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";

import NavLayout from "@/components/layouts/nav-layout";
import { LoadingPage } from "@/components/pages/loading";
import { rpc } from "@/rpc/client";

import { ClientForm } from "../-form";

export const Route = createFileRoute(
  "/(protected)/(app)/clients/$clientId/edit",
)({
  component: ClientEditPage,
});

function ClientEditPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const numericId = Number.parseInt(clientId, 10);

  const { data: client, isLoading } = useQuery(
    rpc.client.getById.queryOptions({ input: { id: numericId } }),
  );

  if (isLoading) {
    return <LoadingPage />;
  }
  if (!client) {
    throw notFound();
  }

  return (
    <NavLayout
      baseUrl="/clients"
      label="Clients"
      leftItems={
        <button
          className="font-medium hover:underline"
          onClick={() =>
            navigate({
              params: { clientId },
              to: "/clients/$clientId",
            })
          }
          type="button"
        >
          {client.name}
        </button>
      }
    >
      <ClientForm
        clientId={numericId}
        defaultValues={{
          assigneeId: client.assigneeId,
          internalNotes: client.internalNotes ?? "",
          legalName: client.legalName ?? "",
          locations: client.locations ?? [],
          logo: client.logo ?? undefined,
          name: client.name,
          slug: client.slug,
        }}
        mode="edit"
        onCancel={() =>
          navigate({
            params: { clientId },
            to: "/clients/$clientId",
          })
        }
        onSuccess={() =>
          navigate({
            params: { clientId },
            to: "/clients/$clientId",
          })
        }
      />
    </NavLayout>
  );
}
