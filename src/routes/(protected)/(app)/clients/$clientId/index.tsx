import PackageBoxAlt from "@iconify-react/lets-icons/package-box-alt";
import Sertificate from "@iconify-react/lets-icons/sertificate";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, notFound, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Archive,
  Edit,
  FileText,
  Hash,
  MapPin,
  StickyNote,
} from "lucide-react";

import AuditLogs, { type AuditLogEntry } from "@/components/audit-logs";
import NavLayout from "@/components/layouts/nav-layout";
import { LoadingPage } from "@/components/pages/loading";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/clients/$clientId/")({
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericId = Number.parseInt(clientId, 10);

  const { data: client, isLoading } = useQuery(
    rpc.client.getById.queryOptions({ input: { id: numericId } }),
  );

  const { data: eventsData } = useQuery(
    rpc.client.listEvents.queryOptions({
      input: { clientId: numericId },
    }),
  );

  const events =
    (eventsData as { items: AuditLogEntry[] } | undefined)?.items ?? [];

  const archiveMutation = useMutation({
    mutationFn: () => rpc.client.archive.call({ id: numericId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      navigate({ to: "/clients" });
    },
  });

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
      leftItems={<span className="font-medium">{client.name}</span>}
      rightItems={
        <div className="flex items-center gap-1.5">
          <Button
            onClick={() =>
              navigate({
                params: { clientId },
                to: "/clients/$clientId/edit",
              })
            }
            size="sm"
            variant="outline"
          >
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
          {!client.archived && (
            <Button
              disabled={archiveMutation.isPending}
              onClick={() => archiveMutation.mutate()}
              size="sm"
              variant="outline"
            >
              <Archive className="h-3.5 w-3.5" />
              Archive
            </Button>
          )}
        </div>
      }
    >
      <div className="space-y-8">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="font-semibold text-xl">{client.name}</h1>
            {client.archived && <Badge variant="destructive">Archived</Badge>}
          </div>
          {client.legalName && (
            <p className="text-muted-foreground text-sm">{client.legalName}</p>
          )}
          <div className="flex items-center gap-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={client.assignee.image ?? undefined} />
              <AvatarFallback>
                {client.assignee.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{client.assignee.name}</span>
          </div>
          <div className="text-muted-foreground text-xs">
            Created{" "}
            {client.createdAt
              ? format(new Date(client.createdAt), "MMM d, yyyy")
              : "—"}
            {client.updatedAt && (
              <>
                {" · "}Updated{" "}
                {format(new Date(client.updatedAt), "MMM d, yyyy")}
              </>
            )}
          </div>
        </div>

        <Separator />

        <dl className="grid grid-cols-[auto_1fr] gap-x-12 gap-y-3">
          <dt className="flex items-center gap-1.5 text-muted-foreground text-sm">
            <Hash className="h-3.5 w-3.5" />
            ID
          </dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {client.id}
            </code>
          </dd>

          <dt className="text-muted-foreground text-sm">Nickname</dt>
          <dd className="font-medium text-sm">{client.name}</dd>

          {client.legalName && (
            <>
              <dt className="text-muted-foreground text-sm">Legal Name</dt>
              <dd className="font-medium text-sm">{client.legalName}</dd>
            </>
          )}

          <dt className="text-muted-foreground text-sm">Slug</dt>
          <dd>
            <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
              {client.slug}
            </code>
          </dd>

          <dt className="text-muted-foreground text-sm">Assignee</dt>
          <dd className="flex items-center gap-2 font-medium text-sm">
            <Avatar className="h-5 w-5">
              <AvatarImage src={client.assignee.image ?? undefined} />
              <AvatarFallback>
                {client.assignee.name?.[0] ?? "?"}
              </AvatarFallback>
            </Avatar>
            {client.assignee.name}
          </dd>
        </dl>

        <Separator />

        {client.description && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <FileText className="h-4 w-4" />
              Description
            </div>
            <p className="text-sm leading-relaxed">{client.description}</p>
          </div>
        )}

        {client.locations && client.locations.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <MapPin className="h-4 w-4" />
              Locations
            </div>
            <div className="flex flex-wrap gap-1.5">
              {client.locations.map((loc) => (
                <Badge key={`${loc.city}-${loc.country}`} variant="secondary">
                  {loc.city}, {loc.country}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {client.internalNotes && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 font-medium text-sm">
              <StickyNote className="h-4 w-4" />
              Internal Notes
            </div>
            <p className="text-sm leading-relaxed">{client.internalNotes}</p>
          </div>
        )}

        <Separator />

        <Button
          onClick={() =>
            navigate({
              search: { clientId: client.id, clientName: client.name },
              to: "/job-mandates",
            })
          }
          size="sm"
          variant="outline"
        >
          <PackageBoxAlt className="h-3.5 w-3.5" />
          Job Mandates
        </Button>
        <Button
          onClick={() =>
            navigate({
              search: { clientId: client.id, clientName: client.name },
              to: "/contracts",
            })
          }
          size="sm"
          variant="outline"
        >
          <Sertificate className="h-3.5 w-3.5" />
          Contracts
        </Button>

        <Separator />

        <AuditLogs domainName="client" entries={events} />
      </div>
    </NavLayout>
  );
}
