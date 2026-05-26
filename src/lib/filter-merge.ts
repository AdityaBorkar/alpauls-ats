import type { FiltersState } from "@/components/data-table-filter/core/types";

export function filterKey(f: FiltersState[number]) {
  return `${f.columnId}::${f.operator}`;
}

export function filtersEqual(a: FiltersState[number], b: FiltersState[number]) {
  return (
    a.columnId === b.columnId &&
    a.operator === b.operator &&
    a.type === b.type &&
    a.values.length === b.values.length &&
    a.values.every((v, i) => v === b.values[i])
  );
}

export function mergeFilters(base: FiltersState, overrides: FiltersState) {
  const overrideMap = new Map(overrides.map((o) => [filterKey(o), o]));
  const result: FiltersState = [];

  for (const b of base) {
    const key = filterKey(b);
    if (overrideMap.has(key)) {
      const override = overrideMap.get(key);
      if (override && !filtersEqual(b, override)) {
        result.push(override);
      }
      overrideMap.delete(key);
    } else {
      result.push(b);
    }
  }

  for (const o of overrideMap.values()) {
    result.push(o);
  }

  return result;
}

export function computeOverrides(base: FiltersState, effective: FiltersState) {
  const overrides: FiltersState = [];
  const baseMap = new Map(base.map((b) => [filterKey(b), b]));

  for (const f of effective) {
    const key = filterKey(f);
    const baseFilter = baseMap.get(key);
    if (!baseFilter || !filtersEqual(baseFilter, f)) {
      overrides.push(f);
    }
  }

  return overrides;
}
