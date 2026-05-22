import { IconSearch } from "@tabler/icons-react";
import { useNavigate, useRouteContext } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  type CommandAction,
  type CommandPaletteMode,
  type GlobalAction,
  globalActions,
  type NavAction,
  type NewAction,
  navActions,
  newActions,
} from "@/lib/app-actions";

type CommandPaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: CommandPaletteMode;
  onAction?: (actionId: string) => void;
};

function filterByPermission<T extends { permission?: string }>(
  items: T[],
  permissions: string[],
): T[] {
  return items.filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  });
}

export function CommandPalette({
  open,
  onOpenChange,
  mode,
  onAction,
}: CommandPaletteProps) {
  const { user } = useRouteContext({ from: "/(protected)" });
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const permissions = user.permissions ?? [];

  const visibleNewActions = filterByPermission(newActions, permissions);
  const visibleNavActions = mode === "new" ? [] : navActions;
  const visibleGlobalActions = mode === "new" ? [] : globalActions;

  useEffect(() => {
    if (!open) {
      setSearch("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (action: CommandAction) => {
      onOpenChange(false);

      if (action.group === "navigation") {
        const nav = action as NavAction;
        navigate({ to: nav.href as Parameters<typeof navigate>[0]["to"] });
      } else if (action.group === "new") {
        const newAction = action as NewAction;
        navigate({
          to: newAction.href as Parameters<typeof navigate>[0]["to"],
        });
      } else if (action.group === "actions") {
        const globalAction = action as GlobalAction;
        onAction?.(globalAction.actionId);
      }
    },
    [navigate, onOpenChange, onAction],
  );

  const placeholder =
    mode === "new" ? "Create new..." : "Search pages, actions...";

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="overflow-hidden p-0 shadow-2xl sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search and navigate to pages or trigger actions
        </DialogDescription>
        <Command className="rounded-none border-0" shouldFilter={false}>
          <div
            className="flex items-center border-b px-3"
            data-slot="command-input-wrapper"
          >
            <IconSearch className="mr-2 size-4 shrink-0 text-muted-foreground" />
            <CommandInput
              className="h-10 border-0"
              onValueChange={setSearch}
              placeholder={placeholder}
              ref={inputRef}
              value={search}
            />
          </div>
          <CommandList className="max-h-80">
            <CommandEmpty className="py-6 text-center text-sm">
              No results found.
            </CommandEmpty>

            {visibleNewActions.length > 0 && (
              <CommandGroup heading="New">
                {visibleNewActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    value={`${action.label} ${action.keywords.join(" ")}`}
                  >
                    <span className="text-muted-foreground text-xs">+</span>
                    <span>{action.label.replace("New ", "")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {visibleNewActions.length > 0 && visibleNavActions.length > 0 && (
              <CommandSeparator />
            )}

            {visibleNavActions.length > 0 && (
              <CommandGroup heading="Pages">
                {visibleNavActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    value={`${action.label} ${action.keywords.join(" ")}`}
                  >
                    <span className="text-muted-foreground text-xs">→</span>
                    <span>{action.label.replace("Go to ", "")}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {visibleNavActions.length > 0 &&
              visibleGlobalActions.length > 0 && <CommandSeparator />}

            {visibleGlobalActions.length > 0 && (
              <CommandGroup heading="Actions">
                {visibleGlobalActions.map((action) => (
                  <CommandItem
                    key={action.id}
                    onSelect={() => handleSelect(action)}
                    value={`${action.label} ${action.keywords.join(" ")}`}
                  >
                    <span className="text-muted-foreground text-xs">⌘</span>
                    <span>{action.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
