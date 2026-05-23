"use client";

import {
  IconCopy,
  IconPencil,
  IconSparkles,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { parseAsJson, parseAsString, useQueryState } from "nuqs";
import { useState } from "react";
import { z } from "zod";

import type { FiltersState } from "@/components/data-table-filter/core/types";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { rpc } from "@/rpc/client";

type FilterViewTab = {
  display: unknown;
  domain: string;
  id: string;
  isSystemCreated: boolean;
  label: string;
  refine: FiltersState;
};

type FilterViewTabsProps = {
  domain: string;
};

const filtersSchema = z.custom<FiltersState>((val): val is FiltersState =>
  Array.isArray(val),
);

export function FilterViewTabs({ domain }: FilterViewTabsProps) {
  const [view, setView] = useQueryState("view", parseAsString.withDefault(""));
  const [, setFilters] = useQueryState<FiltersState>(
    "filters",
    parseAsJson(filtersSchema.parse).withDefault([]),
  );

  const queryClient = useQueryClient();

  const { data: filterViews } = useQuery({
    ...rpc.filterView.list.queryOptions({ input: { domain } }),
    select: (data) => data as FilterViewTab[],
  });

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<FilterViewTab | null>(null);
  const [deletingView, setDeletingView] = useState<FilterViewTab | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const views = filterViews ?? [];

  function handleTabClick(fv: FilterViewTab) {
    setView(fv.id);
    setFilters(null);
  }

  function handleEdit(fv: FilterViewTab) {
    setEditingView(fv);
    setEditLabel(fv.label);
    setEditDialogOpen(true);
  }

  async function handleEditSubmit() {
    if (!editingView || !editLabel.trim()) return;
    await rpc.filterView.update.call({
      id: editingView.id,
      label: editLabel.trim(),
    });
    queryClient.invalidateQueries(
      rpc.filterView.list.queryOptions({ input: { domain } }),
    );
    setEditDialogOpen(false);
    setEditingView(null);
  }

  function handleCopyLink(fv: FilterViewTab) {
    const url = new URL(window.location.href);
    url.searchParams.set("view", fv.id);
    navigator.clipboard.writeText(url.toString());
  }

  function handleDelete(fv: FilterViewTab) {
    setDeletingView(fv);
    setDeleteDialogOpen(true);
  }

  async function handleDeleteConfirm() {
    if (!deletingView) return;
    await rpc.filterView.delete.call({ id: deletingView.id });
    queryClient.invalidateQueries(
      rpc.filterView.list.queryOptions({ input: { domain } }),
    );
    if (view === deletingView.id) {
      setView(null);
      setFilters(null);
    }
    setDeleteDialogOpen(false);
    setDeletingView(null);
  }

  return (
    <>
      <div className="flex items-center gap-1">
        {views.map((fv) => {
          const isActive = view === fv.id;
          return (
            <ContextMenu key={fv.id}>
              <ContextMenuTrigger>
                <button
                  className={`inline-flex h-7 items-center rounded-md px-2.5 font-medium text-sm transition-colors ${
                    isActive
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => handleTabClick(fv)}
                  type="button"
                >
                  {fv.label}
                </button>
              </ContextMenuTrigger>
              <ContextMenuContent>
                {!fv.isSystemCreated && (
                  <>
                    <ContextMenuItem onClick={() => handleEdit(fv)}>
                      <IconPencil className="size-4" />
                      Edit
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                  </>
                )}
                <ContextMenuItem onClick={() => handleCopyLink(fv)}>
                  <IconCopy className="size-4" />
                  Copy link
                </ContextMenuItem>
                {!fv.isSystemCreated && (
                  <>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDelete(fv)}
                      variant="destructive"
                    >
                      <IconTrash className="size-4" />
                      Delete
                    </ContextMenuItem>
                  </>
                )}
                <ContextMenuSeparator />
                <ContextMenuItem disabled>
                  <IconSparkles className="size-4" />
                  Ask AI
                </ContextMenuItem>
              </ContextMenuContent>
            </ContextMenu>
          );
        })}
      </div>

      <Dialog onOpenChange={setEditDialogOpen} open={editDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit filter view</DialogTitle>
            <DialogDescription>
              Rename this filter view. The filters themselves won&apos;t change.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEditSubmit();
            }}
            value={editLabel}
          />
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button disabled={!editLabel.trim()} onClick={handleEditSubmit}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete filter view</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deletingView?.label}
              &rdquo;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>
              Cancel
            </DialogClose>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
