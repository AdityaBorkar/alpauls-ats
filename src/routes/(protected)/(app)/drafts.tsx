import { IconFilePencil, IconTrash } from "@tabler/icons-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useRouteContext,
} from "@tanstack/react-router";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rpc } from "@/rpc/client";

type DraftItem = {
  createdAt: Date | null;
  createdBy: string;
  creator: { id: string; image: string | null; name: string | null };
  data: Record<string, unknown>;
  entityType: string;
  id: number;
  title: string;
  updatedAt: Date | null;
};

const ENTITY_TYPE_STYLES: Record<string, { className: string; label: string }> =
  {
    client: {
      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      label: "Client",
    },
  };

const DEFAULT_ENTITY_STYLE = {
  className: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  label: "Unknown",
};

function entityTypeStyle(type: string) {
  return ENTITY_TYPE_STYLES[type] ?? DEFAULT_ENTITY_STYLE;
}

const RESUME_PATHS: Record<string, string> = {
  client: "/clients/new",
};

export const Route = createFileRoute("/(protected)/(app)/drafts")({
  component: DraftsPage,
});

function DraftsPage() {
  const queryClient = useQueryClient();
  const { user } = useRouteContext({ from: "/(protected)" });
  const navigate = useNavigate();

  const { data, isLoading } = useQuery(
    rpc.draft.list.queryOptions({ input: { limit: 50, sortOrder: "desc" } }),
  );

  const deleteMutation = useMutation({
    mutationFn: (id: number) => rpc.draft.delete.call({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["draft"] });
    },
  });

  const drafts = (data?.items ?? []) as DraftItem[];

  function handleResume(draft: DraftItem) {
    const basePath = RESUME_PATHS[draft.entityType] ?? "/";
    navigate({ to: `${basePath}?draftId=${draft.id}` });
  }

  function handleDelete(id: number) {
    deleteMutation.mutate(id);
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-lg">Drafts</h2>
          <p className="text-muted-foreground text-sm">
            Resume unfinished work or clean up old drafts
          </p>
        </div>
      </div>

      {isLoading ? (
        <ExportedDraftsSkeleton />
      ) : drafts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <IconFilePencil className="mb-3 size-10 text-muted-foreground/40" />
          <p className="text-muted-foreground text-sm">No drafts yet</p>
          <p className="text-muted-foreground/70 text-xs">
            Save a form as draft to continue later
          </p>
        </div>
      ) : (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Created By</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {drafts.map((draft) => {
                const style = entityTypeStyle(draft.entityType);
                const canDelete =
                  draft.createdBy === user.id || user.role === "admin";

                return (
                  <TableRow key={draft.id}>
                    <TableCell className="font-medium">{draft.title}</TableCell>
                    <TableCell>
                      <Badge className={style.className} variant="outline">
                        {style.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {draft.creator?.image && (
                          <img
                            alt={draft.creator.name ?? ""}
                            className="size-5 rounded-full object-cover"
                            src={draft.creator.image}
                          />
                        )}
                        <span className="text-sm">
                          {draft.creator?.name ?? "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatRelativeTime(draft.updatedAt ?? draft.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          onClick={() => handleResume(draft)}
                          size="sm"
                          variant="outline"
                        >
                          Resume
                        </Button>
                        {canDelete && (
                          <Button
                            disabled={deleteMutation.isPending}
                            onClick={() => handleDelete(draft.id)}
                            size="icon"
                            variant="ghost"
                          >
                            <IconTrash className="size-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export function ExportedDraftsSkeleton() {
  const rows = [
    { classes: "h-4 w-32" },
    { classes: "h-5 w-16" },
    { classes: "h-4 w-24" },
    { classes: "h-4 w-20" },
    { classes: "ml-auto h-8 w-20" },
  ];

  return (
    <div className="rounded-lg border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Created By</TableHead>
            <TableHead>Last Updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={`skel-${r.classes}`}>
              <TableCell>
                <Skeleton className={r.classes} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function formatRelativeTime(date: Date | null | undefined): string {
  if (!date) return "";
  const now = new Date();
  const d = date instanceof Date ? date : new Date(date);
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}
