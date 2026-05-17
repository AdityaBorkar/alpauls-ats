import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  Archive,
  ArrowLeft,
  Building2,
  Clock,
  Edit,
  MapPin,
} from "lucide-react";
import { useState } from "react";

import { ClientForm } from "@/components/forms/client-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { rpc } from "@/rpc/client";

export const Route = createFileRoute("/(protected)/(app)/clients/$clientId")({
  component: ClientDetailPage,
});

type ClientData = {
  id: number;
  name: string;
  legalName: string | null;
  logo: string | null;
  slug: string;
  locations: { city: string; country: string }[] | null;
  internalNotes: string | null;
  archived: boolean;
  assigneeId: string;
  assignee: {
    id: string;
    name: string | null;
    image: string | null;
  };
  createdAt: Date | null;
  updatedAt: Date | null;
};

type ClientEvent = {
  id: number;
  clientId: number;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedBy: string;
  changedAt: Date | null;
};

function ClientDetailPage() {
  const { clientId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const numericId = Number.parseInt(clientId, 10);

  const { data: clientData, isLoading } = useQuery(
    rpc.client.getById.queryOptions({ input: { id: numericId } }),
  );

  const client = clientData as ClientData | undefined;

  const { data: eventsData } = useQuery(
    rpc.client.listEvents.queryOptions({
      input: { clientId: numericId },
    }),
  );

  const events =
    (eventsData as { items: ClientEvent[] } | undefined)?.items ?? [];

  const [isEditing, setIsEditing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (input: Record<string, unknown>) =>
      rpc.client.update.call({ id: numericId, ...input } as Parameters<
        typeof rpc.client.update.call
      >[0]),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      setIsEditing(false);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: () => rpc.client.archive.call({ id: numericId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client"] });
      navigate({ to: "/clients" });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-40 w-full max-w-2xl" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-6 p-6">
        <Button
          onClick={() => navigate({ to: "/clients" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <p className="text-muted-foreground">Client not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Button
          onClick={() => navigate({ to: "/clients" })}
          size="icon-sm"
          variant="ghost"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          {client.logo && (
            <img
              alt=""
              className="h-10 w-10 rounded-lg border object-contain p-0.5"
              src={client.logo}
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-lg">{client.name}</h2>
              {client.archived && (
                <Badge className="text-muted-foreground" variant="outline">
                  Archived
                </Badge>
              )}
            </div>
            {client.legalName && (
              <p className="text-muted-foreground text-sm">
                {client.legalName}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid max-w-2xl gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Client Information
            </CardTitle>
            <CardDescription>Details about this client</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <ClientForm
                defaultValues={{
                  assigneeId: client.assigneeId,
                  internalNotes: client.internalNotes ?? "",
                  legalName: client.legalName ?? "",
                  locations: client.locations ?? [],
                  logo: client.logo ?? undefined,
                  name: client.name,
                  slug: client.slug,
                }}
                isPending={updateMutation.isPending}
                mode="edit"
                onSubmit={(values) => updateMutation.mutate(values)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Nick Name
                  </span>
                  <span className="font-medium text-sm">{client.name}</span>
                </div>
                <Separator />
                {client.legalName && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">
                        Legal Name
                      </span>
                      <span className="font-medium text-sm">
                        {client.legalName}
                      </span>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Slug</span>
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                    {client.slug}
                  </code>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">
                    Assignee
                  </span>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={client.assignee.image ?? undefined} />
                      <AvatarFallback>
                        {client.assignee.name?.[0] ?? "?"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">
                      {client.assignee.name}
                    </span>
                  </div>
                </div>
                <Separator />
                {client.locations && client.locations.length > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="flex items-center gap-1 text-muted-foreground text-sm">
                        <MapPin className="h-3.5 w-3.5" />
                        Locations
                      </span>
                      <div className="flex flex-wrap justify-end gap-1">
                        {client.locations.map((loc) => (
                          <Badge
                            key={`${loc.city}-${loc.country}`}
                            variant="secondary"
                          >
                            {loc.city}, {loc.country}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Separator />
                  </>
                )}
                {client.internalNotes && (
                  <>
                    <div className="flex flex-col gap-1">
                      <span className="text-muted-foreground text-sm">
                        Internal Notes
                      </span>
                      <p className="text-sm">{client.internalNotes}</p>
                    </div>
                    <Separator />
                  </>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">Created</span>
                  <span className="font-medium text-sm">
                    {client.createdAt
                      ? format(new Date(client.createdAt), "MMM d, yyyy")
                      : "—"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
          {!isEditing && (
            <CardFooter className="flex gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                size="sm"
                variant="outline"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit client
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
            </CardFooter>
          )}
          {isEditing && (
            <CardFooter className="flex gap-2">
              <Button
                onClick={() => setIsEditing(false)}
                size="sm"
                variant="outline"
              >
                Cancel
              </Button>
            </CardFooter>
          )}
        </Card>

        {events.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Change Records
              </CardTitle>
              <CardDescription>
                History of changes made to this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {events.map((event) => (
                  <div className="flex items-start gap-3" key={event.id}>
                    <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">
                        <span className="font-medium">{event.field}</span>
                        {event.oldValue && (
                          <span className="text-muted-foreground">
                            {" "}
                            from "{event.oldValue}"
                          </span>
                        )}
                        {event.newValue && (
                          <span className="text-muted-foreground">
                            {" "}
                            to "{event.newValue}"
                          </span>
                        )}
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {event.changedAt
                          ? format(
                              new Date(event.changedAt),
                              "MMM d, yyyy h:mm a",
                            )
                          : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
