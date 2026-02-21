/**
 * useFilterBuilder Hook
 *
 * Manages all filter state logic for the AdvancedFilterBuilder component.
 * Extracted from the monolithic component to separate concerns:
 * - Filter group operations (add/remove/update/clear filters, toggle combine mode)
 * - Individual filter row operations (conditions, operators, column changes)
 */

import { useCallback, useMemo } from "react"
import type {
  FilterGroup,
  AdvancedFilter,
  FilterCondition,
  FilterOperator,
  FilterSelectOption,
  FilterType,
} from "@/types/table-features.types"
import {
  OPERATORS_BY_TYPE,
  createEmptyFilter,
  createEmptyCondition,
  hasActiveAdvancedFilters,
} from "@/types/table-features.types"

// ============================================
// Types
// ============================================

export interface FilterableColumn {
  key: string
  header: string
  filterType: FilterType
  filterKey?: string
  filterOperators?: FilterOperator[]
  filterOptions?: FilterSelectOption[]
}

export interface UseFilterBuilderOptions {
  columns: FilterableColumn[]
  value: FilterGroup
  onChange: (group: FilterGroup) => void
}

export interface UseFilterBuilderReturn {
  /** Number of active filters */
  activeFilterCount: number
  /** Whether any filters are active */
  hasFilters: boolean
  /** Add a new filter for a given column */
  addFilter: (column: FilterableColumn) => void
  /** Update a filter by ID with partial updates */
  updateFilter: (filterId: string, updates: Partial<AdvancedFilter>) => void
  /** Remove a filter by ID */
  removeFilter: (filterId: string) => void
  /** Clear all filters, reset to empty AND group */
  clearAllFilters: () => void
  /** Toggle between AND/OR combine mode for the group */
  toggleCombineMode: () => void
  /** Find the column config for a given filter */
  findColumnForFilter: (filter: AdvancedFilter) => FilterableColumn | undefined
}

export interface UseFilterRowOptions {
  filter: AdvancedFilter
  column: FilterableColumn | undefined
  onUpdate: (updates: Partial<AdvancedFilter>) => void
  onRemove: () => void
}

export interface UseFilterRowReturn {
  /** Available operators for this filter type */
  availableOperators: FilterOperator[]
  /** Options for select/multi-select filters */
  filterOptions: FilterSelectOption[] | undefined
  /** Update a specific condition by index */
  updateCondition: (conditionIndex: number, updates: Partial<FilterCondition>) => void
  /** Add a new condition to this filter */
  addCondition: () => void
  /** Remove a condition by index (removes entire filter if last condition) */
  removeCondition: (conditionIndex: number) => void
  /** Change the column this filter targets */
  changeColumn: (newColumn: FilterableColumn) => void
}

// ============================================
// Group-level Hook
// ============================================

/**
 * Manages filter group state: adding, removing, updating filters
 * and toggling the group combine mode.
 */
export function useFilterBuilder({
  columns,
  value,
  onChange,
}: UseFilterBuilderOptions): UseFilterBuilderReturn {
  const activeFilterCount = useMemo(
    () => (hasActiveAdvancedFilters(value) ? value.filters.length : 0),
    [value]
  )

  const hasFilters = activeFilterCount > 0

  const addFilter = useCallback(
    (column: FilterableColumn) => {
      const newFilter = createEmptyFilter(
        column.filterKey || column.key,
        column.header,
        column.filterType
      )
      // Attach filter options for later use in value inputs
      if (column.filterOptions) {
        (newFilter as AdvancedFilter & { _options?: FilterSelectOption[] })._options =
          column.filterOptions
      }
      onChange({
        ...value,
        filters: [...value.filters, newFilter],
      })
    },
    [value, onChange]
  )

  const updateFilter = useCallback(
    (filterId: string, updates: Partial<AdvancedFilter>) => {
      onChange({
        ...value,
        filters: value.filters.map((f) =>
          f.id === filterId ? { ...f, ...updates } : f
        ),
      })
    },
    [value, onChange]
  )

  const removeFilter = useCallback(
    (filterId: string) => {
      onChange({
        ...value,
        filters: value.filters.filter((f) => f.id !== filterId),
      })
    },
    [value, onChange]
  )

  const clearAllFilters = useCallback(() => {
    onChange({
      filters: [],
      combineMode: "and",
    })
  }, [onChange])

  const toggleCombineMode = useCallback(() => {
    onChange({
      ...value,
      combineMode: value.combineMode === "and" ? "or" : "and",
    })
  }, [value, onChange])

  const findColumnForFilter = useCallback(
    (filter: AdvancedFilter) =>
      columns.find((c) => (c.filterKey || c.key) === filter.column),
    [columns]
  )

  return {
    activeFilterCount,
    hasFilters,
    addFilter,
    updateFilter,
    removeFilter,
    clearAllFilters,
    toggleCombineMode,
    findColumnForFilter,
  }
}

// ============================================
// Row-level Hook
// ============================================

/**
 * Manages individual filter row logic: condition CRUD,
 * operator resolution, and column changes.
 */
export function useFilterRow({
  filter,
  column,
  onUpdate,
  onRemove,
}: UseFilterRowOptions): UseFilterRowReturn {
  const availableOperators = useMemo(
    () => column?.filterOperators || OPERATORS_BY_TYPE[filter.filterType] || ["eq" as FilterOperator],
    [column?.filterOperators, filter.filterType]
  )

  const filterOptions = useMemo(
    () =>
      column?.filterOptions ||
      (filter as AdvancedFilter & { _options?: FilterSelectOption[] })._options,
    [column?.filterOptions, filter]
  )

  const updateCondition = useCallback(
    (conditionIndex: number, updates: Partial<FilterCondition>) => {
      onUpdate({
        conditions: filter.conditions.map((c, i) =>
          i === conditionIndex ? { ...c, ...updates } : c
        ),
      })
    },
    [filter.conditions, onUpdate]
  )

  const addCondition = useCallback(() => {
    onUpdate({
      conditions: [
        ...filter.conditions,
        createEmptyCondition(filter.filterType),
      ],
    })
  }, [filter.conditions, filter.filterType, onUpdate])

  const removeCondition = useCallback(
    (conditionIndex: number) => {
      if (filter.conditions.length <= 1) {
        onRemove()
      } else {
        onUpdate({
          conditions: filter.conditions.filter((_, i) => i !== conditionIndex),
        })
      }
    },
    [filter.conditions, onUpdate, onRemove]
  )

  const changeColumn = useCallback(
    (newColumn: FilterableColumn) => {
      onUpdate({
        column: newColumn.filterKey || newColumn.key,
        columnLabel: newColumn.header,
        filterType: newColumn.filterType,
        conditions: [createEmptyCondition(newColumn.filterType)],
      })
    },
    [onUpdate]
  )

  return {
    availableOperators,
    filterOptions,
    updateCondition,
    addCondition,
    removeCondition,
    changeColumn,
  }
}
