import { X } from "lucide-react";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterModel,
  FilterStrategy,
} from "../core/types";
import { type Locale } from "../lib/i18n";
import { FilterOperator, FilterOperatorDisplay } from "./filter-operator";
import { FilterValueController, FilterValueDisplay } from "./filter-value";

interface FilterPillProps<TData, TType extends ColumnDataType> {
  column: Column<TData, TType>;
  filter: FilterModel<TType>;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
  selected?: boolean;
  onSelect?: () => void;
  onRemove?: () => void;
}

export function FilterPill<TData, TType extends ColumnDataType>({
  column,
  filter,
  actions,
  strategy,
  locale = "en",
  selected,
  onSelect,
  onRemove,
}: FilterPillProps<TData, TType>) {
  const [editOpen, setEditOpen] = useState(false);

  const handleRemove = useCallback(
    (e: React.MouseEvent | React.KeyboardEvent) => {
      e.stopPropagation();
      actions.removeFilter(filter.columnId);
      onRemove?.();
    },
    [actions, filter.columnId, onRemove],
  );

  return (
    <Popover
      onOpenChange={(open) => {
        setEditOpen(open);
        if (open) onSelect?.();
      }}
      open={editOpen}
    >
      <PopoverTrigger
        className={cn(
          "inline-flex h-5 items-center gap-0.5 rounded-md border px-1.5 text-xs transition-colors",
          selected
            ? "border-ring bg-accent text-accent-foreground"
            : "border-border bg-background text-foreground",
        )}
        data-filter-pill={filter.columnId}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            setEditOpen(true);
          }
          if (e.key === "Backspace" || e.key === "Delete") {
            e.preventDefault();
            actions.removeFilter(filter.columnId);
            onRemove?.();
          }
        }}
      >
        {column.icon && (
          <column.icon className="size-3 shrink-0 stroke-[2.25px]" />
        )}
        <span className="font-medium">{column.displayName}</span>
        <Separator
          className="mx-0.5 data-vertical:h-3!"
          orientation="vertical"
        />
        <FilterOperatorDisplay
          columnType={column.type}
          filter={filter}
          locale={locale}
        />
        <Separator
          className="mx-0.5 data-vertical:h-3!"
          orientation="vertical"
        />
        <FilterValueDisplay
          actions={actions}
          column={column}
          filter={filter}
          locale={locale}
        />
        <Button
          className="ml-0.5 size-4 shrink-0 rounded-sm p-0"
          onClick={handleRemove}
          onKeyDown={handleRemove}
          variant="ghost"
        >
          <X className="size-2.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-fit origin-(--radix-popover-content-transform-origin) p-0"
        side="bottom"
      >
        <div className="flex flex-col gap-1 p-1">
          <FilterOperator
            actions={actions}
            column={column}
            filter={filter}
            locale={locale}
          />
          <Separator />
          <FilterValueController
            actions={actions}
            column={column}
            filter={filter}
            locale={locale}
            strategy={strategy}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
