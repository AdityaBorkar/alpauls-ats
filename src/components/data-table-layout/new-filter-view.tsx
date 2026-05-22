import { IconEyePlus } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

import { Button } from "../ui/button";

type FilterView = {
  createdAt: Date | null;
  display: {
    fields: string[];
    groupBy: string | null;
    orderBy: string;
    orderType: string;
    type: string;
  };
  domain: string;
  id: string;
  isSystemCreated: boolean;
  label: string;
  refine: { field: string; op: string; value: string }[];
  updatedAt: Date | null;
};

const DEFAULT_DISPLAY: FilterView["display"] = {
  fields: [],
  groupBy: null,
  orderBy: "createdAt",
  orderType: "desc",
  type: "table",
};

const DEFAULT_REFINE: FilterView["refine"] = [];

export function NewFilterView() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newViewLabel, setNewViewLabel] = useState("");

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingView, setEditingView] = useState<FilterView | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const createMutation = useMutation({
    mutationFn: (input: {
      display: typeof DEFAULT_DISPLAY;
      domain: string;
      label: string;
      refine: typeof DEFAULT_REFINE;
    }) => rpc.filterView.create.call(input),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["filterView"] });
      setCreateDialogOpen(false);
      setNewViewLabel("");
      if (data?.id) {
        navigate({ search: { view: data.id }, to: "/clients" });
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; label: string }) =>
      rpc.filterView.update.call(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["filterView"] });
      setEditDialogOpen(false);
      setEditingView(null);
      setEditLabel("");
    },
  });

  function handleCreate() {
    if (!newViewLabel.trim()) return;
    createMutation.mutate({
      display: { ...DEFAULT_DISPLAY },
      domain: "clients",
      label: newViewLabel.trim(),
      refine: [...DEFAULT_REFINE],
    });
  }

  function handleEdit() {
    if (!editingView || !editLabel.trim()) return;
    updateMutation.mutate({ id: editingView.id, label: editLabel.trim() });
  }

  function handleEditOpen(view: FilterView) {
    setEditingView(view);
    setEditLabel(view.label);
    setEditDialogOpen(true);
  }

  return (
    <>
      <button
        className="flex size-7 cursor-pointer items-center rounded-full border border-neutral-400 border-dashed opacity-50 hover:opacity-100"
        onClick={() => setCreateDialogOpen(true)}
        title="Create Filter View"
        type="button"
      >
        <IconEyePlus className="mx-auto size-4.5" />
      </button>

      <Dialog onOpenChange={setCreateDialogOpen} open={createDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Filter View</DialogTitle>
            <DialogDescription>
              Add a new filter view to organize your clients.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(e) => setNewViewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
            }}
            placeholder="View name"
            value={newViewLabel}
          />
          <DialogFooter>
            <Button
              disabled={!newViewLabel.trim() || createMutation.isPending}
              onClick={handleCreate}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) {
            setEditingView(null);
            setEditLabel("");
          }
        }}
        open={editDialogOpen}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Filter View</DialogTitle>
            <DialogDescription>
              Update the name of this filter view.
            </DialogDescription>
          </DialogHeader>
          <Input
            onChange={(e) => setEditLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleEdit();
            }}
            placeholder="View name"
            value={editLabel}
          />
          <DialogFooter>
            <Button
              disabled={!editLabel.trim() || updateMutation.isPending}
              onClick={handleEdit}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
