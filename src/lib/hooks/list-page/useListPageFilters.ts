/**
 * useListPageFilters Hook
 *
 * Manages filter state, filter options fetching, advanced filters,
 * search with debounce, sort, and column visibility.
 */

"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { FilterGroup } from "@/types/table-features.types"
import type { FilterConfig, ListPageConfig, SortConfig } from "./types"

// ============================================
// Types
// ============================================

export interface UseListPageFiltersOptions<T> {
  config: ListPageConfig<T>
  filterConfigs: FilterConfig[]
  initialFilters: Record<string, string>
  initialSort: SortConfig[]
  initialHiddenColumns: string[]
  initialAdvancedFilters: FilterGroup
  tableKey?: string // Used for persisting column visibility to localStorage
}

export interface UseListPageFiltersReturn<T> {
  // Filters
  filters: Record<string, string>
  setFiltersState: (filters: Record<string, string>) => void
  filterOptions: Record<string, { value: string; label: string }[]>

  // Advanced Filters
  advancedFilters: FilterGroup
  setAdvancedFiltersState: (group: FilterGroup) => void
  advancedFiltersRef: React.MutableRefObject<FilterGroup>

  // Search
  searchQuery: string
  searchQueryState: string
  setSearchQueryState: (query: string) => void
  searchTimerRef: React.MutableRefObject<NodeJS.Timeout | null>

  // Sort
  sortConfig: SortConfig[]
  setSortConfig: (config: SortConfig[]) => void
  sortConfigRef: React.MutableRefObject<SortConfig[]>

  // Column Visibility
  hiddenColumns: string[]
  setHiddenColumnsState: (columns: string[]) => void

  // Refs
  configRef: React.MutableRefObject<ListPageConfig<T>>
  filterConfigsRef: React.MutableRefObject<FilterConfig[]>

  // Actions
  fetchFilterOptions: () => Promise<void>
}

// ============================================
// Hook Implementation
// ============================================

export function useListPageFilters<T>(
  options: UseListPageFiltersOptions<T>
): UseListPageFiltersReturn<T> {
  const {
    config,
    filterConfigs,
    initialFilters,
    initialSort,
    initialHiddenColumns,
    initialAdvancedFilters,
    tableKey,
  } = options

  // Filter state
  const [filters, setFiltersState] = useState<Record<string, string>>(initialFilters)
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({})

  // Advanced filters state
  const [advancedFilters, setAdvancedFiltersState] = useState<FilterGroup>(initialAdvancedFilters)
  const advancedFiltersRef = useRef(advancedFilters)

  // Search state
  const [searchQuery, setSearchQueryState] = useState("")
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Sort state
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(initialSort)
  const sortConfigRef = useRef(sortConfig)

  // Column visibility state — load from localStorage if tableKey is provided
  const [hiddenColumns, setHiddenColumnsState] = useState<string[]>(() => {
    if (tableKey && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(`column-visibility:${tableKey}`)
        if (stored) {
          return JSON.parse(stored) as string[]
        }
      } catch {
        // Ignore errors (e.g., private browsing mode)
      }
    }
    return initialHiddenColumns
  })

  // Stable refs to avoid dependency issues
  const configRef = useRef(config)
  const filterConfigsRef = useRef(filterConfigs)

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    configRef.current = config
    filterConfigsRef.current = filterConfigs
  }, [config, filterConfigs])

  // Keep advancedFilters ref in sync with state
  useEffect(() => {
    advancedFiltersRef.current = advancedFilters
  }, [advancedFilters])

  // Keep sortConfig ref in sync with state
  useEffect(() => {
    sortConfigRef.current = sortConfig
  }, [sortConfig])

  // Persist column visibility to localStorage when changed
  useEffect(() => {
    if (tableKey && typeof window !== "undefined") {
      try {
        localStorage.setItem(`column-visibility:${tableKey}`, JSON.stringify(hiddenColumns))
      } catch {
        // Ignore errors (e.g., private browsing, storage full)
      }
    }
  }, [hiddenColumns, tableKey])

  // Fetch filter options - uses ref to avoid dependency issues
  const fetchFilterOptions = useCallback(async () => {
    const currentFilterConfigs = filterConfigsRef.current
    const supabase = createClient()
    const optionsMap: Record<string, { value: string; label: string }[]> = {}

    for (const filterConfig of currentFilterConfigs) {
      if (filterConfig.options) {
        optionsMap[filterConfig.id] = filterConfig.options
      } else if (filterConfig.optionsQuery) {
        const { table, valueField, labelField, orderBy, filter } = filterConfig.optionsQuery
        let query = supabase.from(table).select(`${valueField}, ${labelField}`)

        if (orderBy) {
          query = query.order(orderBy)
        }

        if (filter) {
          for (const [key, value] of Object.entries(filter)) {
            query = query.eq(key, value)
          }
        }

        const { data: optionsData } = await query

        if (optionsData) {
          optionsMap[filterConfig.id] = (optionsData as unknown as Record<string, unknown>[]).map((item) => ({
            value: String(item[valueField]),
            label: String(item[labelField]),
          }))
        }
      }
    }

    setFilterOptions(optionsMap)
  }, []) // No dependencies - uses ref

  return {
    // Filters
    filters,
    setFiltersState,
    filterOptions,

    // Advanced Filters
    advancedFilters,
    setAdvancedFiltersState,
    advancedFiltersRef,

    // Search
    searchQuery,
    searchQueryState: searchQuery,
    setSearchQueryState,
    searchTimerRef,

    // Sort
    sortConfig,
    setSortConfig,
    sortConfigRef,

    // Column Visibility
    hiddenColumns,
    setHiddenColumnsState,

    // Refs
    configRef,
    filterConfigsRef,

    // Actions
    fetchFilterOptions,
  }
}
