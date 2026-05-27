import { FilterXIcon, Search } from "lucide-react";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

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
import { cn } from "@/lib/utils";

import type {
  Column,
  ColumnDataType,
  DataTableFilterActions,
  FilterStrategy,
  FiltersState,
} from "../core/types";
import { getColumn } from "../lib/helpers";
import { type Locale, t } from "../lib/i18n";
import { FilterPill } from "./filter-pill";
import { FilterValueController } from "./filter-value";

interface FilterComboboxProps<TData> {
  columns: Column<TData>[];
  filters: FiltersState;
  actions: DataTableFilterActions;
  strategy: FilterStrategy;
  locale?: Locale;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
}

export function FilterCombobox<TData>({
  columns,
  filters,
  actions,
  strategy,
  locale = "en",
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
}: FilterComboboxProps<TData>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [focusedPillIndex, setFocusedPillIndex] = useState<number | null>(null);
  const [addFilterOpen, setAddFilterOpen] = useState(false);
  const [addFilterProperty, setAddFilterProperty] = useState<
    string | undefined
  >(undefined);
  const [inputValue, setInputValue] = useState(searchValue);
  const inputTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setInputValue(searchValue);
  }, [searchValue]);

  const activeFilters = useMemo(
    () => filters.filter((f) => f.values && f.values.length > 0),
    [filters],
  );

  const activeFilterColumns = useMemo(
    () =>
      activeFilters
        .map((f) => {
          try {
            return getColumn(columns, f.columnId);
          } catch {
            return null;
          }
        })
        .filter(Boolean) as Column<TData>[],
    [activeFilters, columns],
  );

  const selectedColumn = addFilterProperty
    ? getColumn(columns, addFilterProperty)
    : undefined;
  const selectedFilter = addFilterProperty
    ? filters.find((f) => f.columnId === addFilterProperty)
    : undefined;

  useEffect(() => {
    if (addFilterProperty && inputRef.current) {
      inputRef.current.focus();
      setInputValue("");
    }
  }, [addFilterProperty]);

  useEffect(() => {
    if (!addFilterOpen) {
      const timeout = setTimeout(() => setAddFilterProperty(undefined), 150);
      return () => clearTimeout(timeout);
    }
  }, [addFilterOpen]);

  const closeAddFilter = useCallback(() => {
    setAddFilterOpen(false);
    setAddFilterProperty(undefined);
  }, []);

  const handleInputChange = useCallback(
    (value: string) => {
      setInputValue(value);
      if (inputTimeoutRef.current) clearTimeout(inputTimeoutRef.current);
      inputTimeoutRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 150);

      if (value.trim().length > 0 && !addFilterOpen) {
        setAddFilterOpen(true);
        setAddFilterProperty(undefined);
      }
      if (value.trim().length === 0 && addFilterProperty === undefined) {
        setAddFilterOpen(false);
      }
    },
    [addFilterOpen, addFilterProperty, onSearchChange],
  );

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowLeft") {
        const target = e.currentTarget;
        if (
          target.selectionStart === 0 &&
          target.selectionEnd === 0 &&
          activeFilters.length > 0
        ) {
          e.preventDefault();
          const newIdx =
            focusedPillIndex === null
              ? activeFilters.length - 1
              : Math.max(0, focusedPillIndex - 1);
          setFocusedPillIndex(newIdx);
          return;
        }
      }

      if (e.key === "ArrowRight" && focusedPillIndex !== null) {
        e.preventDefault();
        if (focusedPillIndex < activeFilters.length - 1) {
          setFocusedPillIndex(focusedPillIndex + 1);
        } else {
          setFocusedPillIndex(null);
          inputRef.current?.focus();
        }
        return;
      }

      if (
        (e.key === "Backspace" || e.key === "Delete") &&
        focusedPillIndex !== null
      ) {
        e.preventDefault();
        const filterToRemove = activeFilters[focusedPillIndex];
        if (filterToRemove) {
          actions.removeFilter(filterToRemove.columnId);
          if (activeFilters.length <= 1) {
            setFocusedPillIndex(null);
            inputRef.current?.focus();
          } else if (focusedPillIndex >= activeFilters.length - 1) {
            setFocusedPillIndex(activeFilters.length - 2);
          }
        }
        return;
      }

      if (
        e.key === "Backspace" &&
        inputValue === "" &&
        activeFilters.length > 0
      ) {
        e.preventDefault();
        setFocusedPillIndex(activeFilters.length - 1);
        return;
      }

      if (e.key === "Enter" && focusedPillIndex !== null) {
        e.preventDefault();
        const pillEl = containerRef.current?.querySelector(
          `[data-filter-pill="${activeFilters[focusedPillIndex]?.columnId}"]`,
        );
        if (pillEl instanceof HTMLElement) pillEl.click();
        return;
      }

      if (e.key === "Escape") {
        if (addFilterOpen) {
          closeAddFilter();
          return;
        }
        setFocusedPillIndex(null);
        return;
      }

      if (focusedPillIndex !== null && e.key.length === 1) {
        setFocusedPillIndex(null);
      }
    },
    [
      activeFilters,
      focusedPillIndex,
      actions,
      inputValue,
      addFilterOpen,
      closeAddFilter,
    ],
  );

  const handlePillRemove = useCallback(() => {
    setFocusedPillIndex(null);
    inputRef.current?.focus();
  }, []);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || e.target === containerRef.current) {
      inputRef.current?.focus();
      setFocusedPillIndex(null);
    }
  }, []);

  useEffect(() => {
    if (focusedPillIndex !== null) {
      const pillEl = containerRef.current?.querySelector(
        `[data-filter-pill="${activeFilters[focusedPillIndex]?.columnId}"]`,
      );
      if (pillEl instanceof HTMLElement) pillEl.focus();
    }
  }, [focusedPillIndex, activeFilters]);

  const popoverContent = useMemo(
    () =>
      addFilterProperty && selectedColumn && selectedFilter ? (
        <FilterValueController
          actions={actions}
          column={selectedColumn as Column<TData, ColumnDataType>}
          filter={selectedFilter!}
          locale={locale}
          strategy={strategy}
        />
      ) : (
        <Command
          filter={(value, search, keywords) => {
            const extended = `${value} ${keywords?.join(" ")}`;
            return extended.toLowerCase().includes(search.toLowerCase())
              ? 1
              : 0;
          }}
          loop
        >
          <CommandInput
            onValueChange={setInputValue}
            placeholder={t("search", locale)}
            value={inputValue}
          />
          <CommandEmpty>{t("noresults", locale)}</CommandEmpty>
          <CommandList className="max-h-fit">
            <CommandGroup>
              {columns.map((column) => (
                <FilterableColumnItem
                  column={column}
                  key={column.id}
                  onSelect={setAddFilterProperty}
                />
              ))}
              <QuickSearchItems
                actions={actions}
                columns={columns}
                filters={filters}
                locale={locale}
                search={inputValue}
                strategy={strategy}
              />
            </CommandGroup>
          </CommandList>
        </Command>
      ),
    [
      addFilterProperty,
      selectedColumn,
      selectedFilter,
      actions,
      locale,
      strategy,
      inputValue,
      columns,
      filters,
    ],
  );

  return (
    <div className="relative grow">
      <div
        className={cn(
          "flex h-8 w-full min-w-0 items-center gap-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-colors",
          "focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
          "placeholder:text-muted-foreground",
          "dark:bg-input/30",
        )}
        data-slot="filter-combobox"
        onClick={handleContainerClick}
        ref={containerRef}
      >
        <Search className="size-4 shrink-0 text-muted-foreground" />

        {activeFilterColumns.map((column, index) => {
          const filter = activeFilters[index];
          return (
            <FilterPill
              actions={actions}
              column={column as Column<TData, ColumnDataType>}
              filter={filter as any}
              key={filter.columnId}
              locale={locale}
              onRemove={handlePillRemove}
              onSelect={() => setFocusedPillIndex(index)}
              selected={focusedPillIndex === index}
              strategy={strategy}
            />
          );
        })}

        <input
          className="min-w-0 grow bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setFocusedPillIndex(null);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={
            activeFilters.length > 0 ? "Filter..." : searchPlaceholder
          }
          ref={inputRef}
          value={inputValue}
        />

        {activeFilters.length > 0 && (
          <button
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              actions.removeAllFilters();
              setFocusedPillIndex(null);
              inputRef.current?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                actions.removeAllFilters();
                setFocusedPillIndex(null);
                inputRef.current?.focus();
              }
            }}
            type="button"
          >
            <FilterXIcon className="size-4" />
          </button>
        )}
      </div>

      <Popover
        onOpenChange={(open) => {
          setAddFilterOpen(open);
          if (!open) {
            setAddFilterProperty(undefined);
            if (!inputValue) onSearchChange("");
          }
        }}
        open={addFilterOpen}
      >
        <PopoverTrigger className="sr-only" ref={triggerRef} tabIndex={-1} />
        <PopoverContent
          align="start"
          className="w-fit origin-(--radix-popover-content-transform-origin) p-0"
          side="bottom"
        >
          {popoverContent}
        </PopoverContent>
      </Popover>
    </div>
  );
}

function FilterableColumnItem<TData>({
  column,
  onSelect,
}: {
  column: Column<TData>;
  onSelect: (id: string) => void;
}) {
  return (
    <CommandItem
      className="group"
      keywords={[column.displayName]}
      onSelect={() => onSelect(column.id)}
      value={column.id}
    >
      <div className="flex w-full items-center justify-between">
        <div className="inline-flex items-center gap-1.5">
          {<column.icon className="size-4" strokeWidth={2.25} />}
          <span>{column.displayName}</span>
        </div>
      </div>
    </CommandItem>
  );
}

function QuickSearchItems<TData>({
  search,
  filters,
  columns,
  actions,
}: {
  search?: string;
  filters: FiltersState;
  columns: Column<TData>[];
  actions: DataTableFilterActions;
  strategy?: FilterStrategy;
  locale?: Locale;
}) {
  if (!search || search.trim().length < 2) return null;

  const optionColumns = columns.filter(
    (c) => c.type === "option" || c.type === "multiOption",
  );

  return (
    <>
      {optionColumns.map((column) => {
        const filter = filters.find((f) => f.columnId === column.id);
        const options = column.getOptions();
        const counts = column.getFacetedUniqueValues();

        return (
          <React.Fragment key={column.id}>
            {options.map((v) => {
              const checked = Boolean(filter?.values.includes(v.value));
              const count = counts?.get(v.value) ?? 0;

              if (
                !v.label.toLowerCase().includes(search.toLowerCase()) &&
                !v.value.toLowerCase().includes(search.toLowerCase())
              ) {
                return null;
              }

              return (
                <CommandItem
                  className="group"
                  key={v.value}
                  keywords={[v.label, v.value]}
                  onSelect={() => {
                    if (checked) actions.removeFilterValue(column, [v.value]);
                    else actions.addFilterValue(column, [v.value]);
                  }}
                  value={v.value}
                >
                  <div className="group flex items-center gap-1.5">
                    <div className="flex items-center gap-0.5">
                      <span className="text-muted-foreground">
                        {column.displayName}
                      </span>
                      <span className="text-muted-foreground/75">&rarr;</span>
                      <span>{v.label}</span>
                      <sup
                        className={cn(
                          !counts && "hidden",
                          "ml-0.5 text-muted-foreground tabular-nums tracking-tight",
                        )}
                      >
                        {count < 100 ? count : "100+"}
                      </sup>
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </React.Fragment>
        );
      })}
    </>
  );
}
