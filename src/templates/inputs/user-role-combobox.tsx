import { IconChevronDown } from "@tabler/icons-react";
import { useState } from "react";

import type { UserOption } from "@/components/types";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ROLE_DISPLAY_NAMES } from "@/lib/constants";

type UserRoleComboboxProps = {
  users: UserOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  roles?: string[];
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  excludeUserId?: string;
};

export function UserRoleCombobox({
  users,
  value,
  onChange,
  roles,
  disabled,
  required,
  placeholder = "Select user",
  excludeUserId,
}: UserRoleComboboxProps) {
  const [open, setOpen] = useState(false);

  const filteredUsers = users
    .filter((u) => u.id !== excludeUserId)
    .filter((u) => !roles || roles.includes(u.role ?? ""));

  const selected = filteredUsers.find((u) => u.id === value);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button
            className="w-full justify-between font-normal"
            disabled={disabled}
            role="combobox"
            variant="outline"
          />
        }
      >
        {selected ? (
          <span className="truncate">
            {selected.name}{" "}
            <span className="text-muted-foreground">
              (
              {ROLE_DISPLAY_NAMES[
                selected.role as keyof typeof ROLE_DISPLAY_NAMES
              ] ??
                selected.role ??
                "—"}
              )
            </span>
          </span>
        ) : (
          <span className="font-normal text-muted-foreground">
            {placeholder}
            {required ? " *" : ""}
          </span>
        )}
        <IconChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0" sideOffset={4}>
        <Command>
          <CommandInput placeholder="Search by name or email..." />
          <CommandList>
            <CommandEmpty>No users found</CommandEmpty>
            <CommandGroup>
              {!required && (
                <CommandItem
                  onSelect={() => {
                    onChange(null);
                    setOpen(false);
                  }}
                  value="__none__"
                >
                  <span className="text-muted-foreground">None</span>
                </CommandItem>
              )}
              {filteredUsers.map((u) => (
                <CommandItem
                  key={u.id}
                  onSelect={() => {
                    onChange(u.id);
                    setOpen(false);
                  }}
                  value={`${u.name} ${u.email}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{u.name}</span>
                    <span className="text-muted-foreground text-xs">
                      {ROLE_DISPLAY_NAMES[
                        u.role as keyof typeof ROLE_DISPLAY_NAMES
                      ] ??
                        u.role ??
                        "—"}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
