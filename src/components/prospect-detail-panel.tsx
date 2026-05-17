import { format } from "date-fns";
import { Archive, History } from "lucide-react";
import { useId, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useORPCMutation } from "@/hooks/use-orpc-mutation";
import { useORPCQuery } from "@/hooks/use-orpc-query";
import { client } from "@/rpc/client";

import type { ProspectEventItem, ProspectItem } from "./prospect.types";

type ProspectDetailPanelProps = {
  prospect: ProspectItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  mode: "view" | "create";
};

export function ProspectDetailPanel({
  prospect,
  open,
  onOpenChange,
  onRefresh,
  mode,
}: ProspectDetailPanelProps) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const nameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const descriptionId = useId();

  const createProspect = useORPCMutation(client.prospect.create, {
    onSuccess: () => {
      onRefresh();
      onOpenChange(false);
      resetForm();
    },
  });

  const updateProspect = useORPCMutation(client.prospect.update, {
    onSuccess: () => {
      onRefresh();
      setIsEditing(false);
    },
  });

  const archiveProspect = useORPCMutation(client.prospect.archive, {
    onSuccess: () => {
      onRefresh();
      onOpenChange(false);
    },
  });

  const { data: eventsData } = useORPCQuery(
    () => client.prospect.listEvents({ prospectId: prospect?.id ?? 0 }),
    [prospect?.id, open],
  );

  function resetForm() {
    setName("");
    setPhone("");
    setEmail("");
    setDescription("");
    setIsEditing(false);
  }

  function handleCreate() {
    createProspect.mutate({
      description: description || undefined,
      email: email || undefined,
      name,
      phone,
    });
  }

  function handleSave() {
    if (!prospect) return;
    updateProspect.mutate({
      description:
        description !== (prospect.description ?? "")
          ? description || null
          : undefined,
      email: email !== (prospect.email ?? "") ? email || null : undefined,
      id: prospect.id,
      name: name !== prospect.name ? name : undefined,
      phone: phone !== prospect.phone ? phone : undefined,
    });
  }

  function handleOpen() {
    if (prospect) {
      setName(prospect.name);
      setPhone(prospect.phone);
      setEmail(prospect.email ?? "");
      setDescription(prospect.description ?? "");
    } else {
      resetForm();
    }
  }

  return (
    <Drawer
      direction="right"
      onOpenChange={(v) => {
        if (v) handleOpen();
        onOpenChange(v);
      }}
      open={open}
    >
      <DrawerContent className="w-full sm:max-w-lg">
        <DrawerHeader>
          <DrawerTitle>
            {mode === "create"
              ? "New Prospect"
              : isEditing
                ? "Edit Prospect"
                : (prospect?.name ?? "")}
          </DrawerTitle>
          <DrawerDescription>
            {mode === "create"
              ? "Create a new prospect"
              : isEditing
                ? "Edit prospect details"
                : "Prospect details"}
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="space-y-6">
            {mode === "create" || isEditing ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor={nameId}>Name</Label>
                  <Input
                    id={nameId}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Prospect name"
                    value={name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={phoneId}>Phone</Label>
                  <Input
                    id={phoneId}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 234 567 8900"
                    value={phone}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={emailId}>Email</Label>
                  <Input
                    id={emailId}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    type="email"
                    value={email}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={descriptionId}>Description</Label>
                  <Textarea
                    id={descriptionId}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Notes about this prospect..."
                    rows={4}
                    value={description}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    disabled={
                      createProspect.isPending || updateProspect.isPending
                    }
                    onClick={mode === "create" ? handleCreate : handleSave}
                  >
                    {mode === "create" ? "Create" : "Save"}
                  </Button>
                  {mode !== "create" && (
                    <Button
                      onClick={() => setIsEditing(false)}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </>
            ) : prospect ? (
              <>
                {prospect.archived && <Badge variant="outline">Archived</Badge>}
                <div className="space-y-3">
                  <div>
                    <span className="text-muted-foreground text-sm">Phone</span>
                    <p className="text-sm">{prospect.phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-sm">Email</span>
                    <p className="text-sm">{prospect.email ?? "—"}</p>
                  </div>
                  {prospect.description && (
                    <div>
                      <span className="text-muted-foreground text-sm">
                        Description
                      </span>
                      <p className="text-sm">{prospect.description}</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground text-sm">
                      Created
                    </span>
                    <p className="text-sm">
                      {prospect.createdAt
                        ? format(new Date(prospect.createdAt), "PPP")
                        : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setName(prospect.name);
                      setPhone(prospect.phone);
                      setEmail(prospect.email ?? "");
                      setDescription(prospect.description ?? "");
                      setIsEditing(true);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Edit
                  </Button>
                  {!prospect.archived && (
                    <Button
                      disabled={archiveProspect.isPending}
                      onClick={() =>
                        archiveProspect.mutate({ id: prospect.id })
                      }
                      size="sm"
                      variant="outline"
                    >
                      <Archive className="mr-1 h-3.5 w-3.5" />
                      Archive
                    </Button>
                  )}
                </div>
              </>
            ) : null}

            {prospect && !isEditing && (
              <>
                <Separator />
                <div className="space-y-3">
                  <div className="flex items-center gap-2 font-medium text-sm">
                    <History className="h-4 w-4" />
                    History
                  </div>
                  {eventsData?.items.map((event: ProspectEventItem) => (
                    <div
                      className="border-muted border-l-2 py-1 pl-3 text-sm"
                      key={event.id}
                    >
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
                      <div className="text-muted-foreground text-xs">
                        {event.changedAt &&
                          format(new Date(event.changedAt), "PPP p")}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  );
}
