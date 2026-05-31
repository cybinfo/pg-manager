/**
 * useListPage Hook
 *
 * Centralized hook for all list pages. Replaces ~1000 lines of duplicated code.
 * Handles: data fetching, filtering, grouping, metrics, and pagination.
 *
 * This file composes several sub-hooks from ./list-page/ and maintains
 * backward compatibility with all existing imports.
 *
 * @example
 * const { data, loading, filters, setFilter, metrics, grouping } = useListPage({
 *   config: tenantsConfig,
 *   workspace_id: workspaceId,
 * })
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins } from "@/lib/supabase/transforms"
import { showError } from "@/lib/toast-helpers"
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants"
import { applyAdvancedFilters } from "@/lib/filters/apply-advanced-filters"
import type { FilterGroup } from "@/types/table-features.types"
import { hasActiveAdvancedFilters } from "@/types/table-features.types"

// Import sub-hooks and utilities
import { useListPageFilters } from "./list-page/useListPageFilters"
import { useListPageMetrics } from "./list-page/useListPageMetrics"
import { useListPageGrouping } from "./list-page/useListPageGrouping"
import { useListPagePagination } from "./list-page/useListPagePagination"
import { getNestedValue, applyBaseFiltersToQuery } from "./list-page/utils"

// Re-export ALL types for backward compatibility
export type {
  ListPageConfig,
  FilterConfig,
  GroupByOption,
  ServerFilterOperator,
  ServerFilter,
  ServerSum,
  MetricConfig,
  PaginationState,
  SortConfig,
  TableViewConfig,
  UseListPageOptions,
  UseListPageReturn,
} from "./list-page/types"

// Re-export ALL configs for backward compatibility
export {
  TENANT_LIST_CONFIG,
  PAYMENT_LIST_CONFIG,
  BILL_LIST_CONFIG,
  EXPENSE_LIST_CONFIG,
  COMPLAINT_LIST_CONFIG,
  VISITOR_LIST_CONFIG,
  STAFF_LIST_CONFIG,
  PROPERTY_LIST_CONFIG,
  ROOM_LIST_CONFIG,
  EXIT_CLEARANCE_LIST_CONFIG,
  NOTICE_LIST_CONFIG,
  METER_READING_LIST_CONFIG,
  APPROVAL_LIST_CONFIG,
  REFUND_LIST_CONFIG,
  PEOPLE_LIST_CONFIG,
  METER_LIST_CONFIG,
  INQUIRY_LIST_CONFIG,
  PRODUCT_LIST_CONFIG,
  DAILY_SPEND_LIST_CONFIG,
  VENDOR_LIST_CONFIG,
  BILL_PAYMENT_LIST_CONFIG,
  SERVICE_PROVIDER_LIST_CONFIG,
  SERVICE_PAYMENT_LIST_CONFIG,
  KITCHEN_WASTAGE_LIST_CONFIG,
  MISC_TRANSACTION_LIST_CONFIG,
  LIBRARY_LIST_CONFIG,
  LIBRARY_SECTION_LIST_CONFIG,
  LIBRARY_SEAT_LIST_CONFIG,
  LIBRARY_MEMBER_LIST_CONFIG,
  LIBRARY_MEMBERSHIP_LIST_CONFIG,
  LIBRARY_ATTENDANCE_LIST_CONFIG,
  LIBRARY_LOCKER_LIST_CONFIG,
  LIBRARY_PAYMENT_LIST_CONFIG,
  LIBRARY_PLAN_LIST_CONFIG,
  LIBRARY_WAITLIST_LIST_CONFIG,
  APPROVALS_LIST_CONFIG,
  AUDIT_EVENT_LIST_CONFIG,
  BUSINESS_LIST_CONFIG,
  LOCATION_LIST_CONFIG,
} from "./list-page/configs"

// Import types for use in this file
import type { UseListPageOptions, UseListPageReturn, SortConfig } from "./list-page/types"

// ============================================
// Hook Implementation
// ============================================

export function useListPage<T extends object>(
  options: UseListPageOptions<T>
): UseListPageReturn<T> {
  const {
    config,
    filters: filterConfigs = [],
    groupByOptions = [],
    metrics = [],
    initialFilters = {},
    initialGroups = [],
    initialPageSize,
    initialViewConfig,
    defaultHiddenColumns = [],
    enabled = true,
    tableKey,
  } = options

  // Pagination defaults
  const defaultPageSize = initialViewConfig?.pageSize || initialPageSize || config.defaultPageSize || 25
  const enableServerPagination = config.enableServerPagination !== false

  // Compute initial values from view config
  const computedInitialFilters = initialViewConfig?.filters || initialFilters
  const computedInitialGroups = initialViewConfig?.groupBy || initialGroups
  const computedInitialSort = initialViewConfig?.sort || []
  const computedInitialHiddenColumns = initialViewConfig?.hiddenColumns || defaultHiddenColumns
  const computedInitialAdvancedFilters = initialViewConfig?.advancedFilters || { filters: [], combineMode: "and" as const }

  // ============================================
  // Compose Sub-Hooks
  // ============================================

  // Filters, search, sort, column visibility
  const filtersHook = useListPageFilters<T>({
    config,
    filterConfigs,
    initialFilters: computedInitialFilters,
    initialSort: computedInitialSort,
    initialHiddenColumns: computedInitialHiddenColumns,
    initialAdvancedFilters: computedInitialAdvancedFilters,
    tableKey,
  })

  // Pagination
  const paginationHook = useListPagePagination({
    defaultPageSize,
  })

  // Metrics ref (needs to be created before passing to metrics hook)
  const metricsRef = useRef(metrics)
  useEffect(() => {
    metricsRef.current = metrics
  }, [metrics])

  // Metrics (server counts, sums, computation)
  const metricsHook = useListPageMetrics<T>(
    {
      metrics,
      configRef: filtersHook.configRef,
      filterConfigsRef: filtersHook.filterConfigsRef,
      metricsRef,
    },
    filtersHook.filters,
    filtersHook.searchQuery
  )

  // Grouping
  const groupingHook = useListPageGrouping<T>(
    {
      groupByOptions,
      initialGroups: computedInitialGroups,
      configRef: filtersHook.configRef,
      filterConfigsRef: filtersHook.filterConfigsRef,
    },
    filtersHook.filters,
    filtersHook.searchQuery
  )

  // ============================================
  // Data State
  // ============================================

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const initialFetchDone = useRef(false)

  // Refs for fetch functions - used by applyViewConfig to avoid dependency loops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchDataRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchServerCountsRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchServerSumsRef = useRef<any>(null)
  // Request deduplication counter — stale requests bail out
  const fetchIdRef = useRef(0)

  // ============================================
  // Data Fetching
  // ============================================

  const fetchData = useCallback(async (
    fetchPage?: number,
    fetchPageSize?: number,
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string,
    fetchSort?: SortConfig[],
    fetchAdvancedFilters?: FilterGroup
  ) => {
    if (!enabled) return

    const currentConfig = filtersHook.configRef.current
    const currentFilterConfigs = filtersHook.filterConfigsRef.current
    const currentPage = fetchPage ?? paginationHook.page
    const currentPageSize = fetchPageSize ?? paginationHook.pageSize
    const currentFilters = fetchFilters ?? filtersHook.filters
    const currentSearchQuery = fetchSearchQuery ?? filtersHook.searchQuery
    const currentSort = fetchSort ?? filtersHook.sortConfigRef.current
    const currentAdvancedFilters = fetchAdvancedFilters ?? filtersHook.advancedFiltersRef.current

    // Request deduplication: newer requests supersede older ones
    const currentFetchId = ++fetchIdRef.current

    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from(currentConfig.table)
        .select(currentConfig.select, { count: "exact" })

      // Apply user sort if specified, otherwise use default
      if (currentSort.length > 0) {
        for (const sort of currentSort) {
          // Handle nested sort keys (e.g., "category.name" -> just "category")
          // For now, we only support direct column sorting server-side
          const sortColumn = sort.key.includes(".") ? sort.key.split(".")[0] : sort.key
          query = query.order(sortColumn, { ascending: sort.direction === "asc" })
        }
      } else {
        query = query.order(currentConfig.defaultOrderBy, { ascending: currentConfig.defaultOrderDirection === "asc" })
      }

      // Apply standard filters (soft delete, user filters, date range, search)
      query = applyBaseFiltersToQuery(
        query, currentConfig, currentFilterConfigs,
        currentFilters, currentSearchQuery
      )

      // Apply advanced filters (multiple operators, AND/OR logic)
      if (hasActiveAdvancedFilters(currentAdvancedFilters)) {
        query = applyAdvancedFilters(query, currentAdvancedFilters)
      }

      // Apply server-side pagination
      // Skip pagination when grouping is active to keep groups complete
      const hasActiveGrouping = groupingHook.selectedGroupsRef.current.length > 0
      if (enableServerPagination && !hasActiveGrouping) {
        const from = (currentPage - 1) * currentPageSize
        const to = from + currentPageSize - 1
        query = query.range(from, to)
      }

      const { data: rawData, error: fetchError, count } = await query

      // Bail out if a newer request has been started (deduplication)
      if (currentFetchId !== fetchIdRef.current) return

      if (fetchError) {
        throw fetchError
      }

      // Update total count (now reflects filtered count)
      if (count !== null) {
        paginationHook.setTotal(count)
      }

      // Transform JOIN fields
      let transformedData: Record<string, unknown>[] = (rawData || []) as unknown as Record<string, unknown>[]
      if (currentConfig.joinFields && currentConfig.joinFields.length > 0) {
        transformedData = transformArrayJoins(transformedData, currentConfig.joinFields as string[])
      }

      // Apply computed fields
      if (currentConfig.computedFields) {
        transformedData = transformedData.map((item) => ({
          ...item,
          ...currentConfig.computedFields!(item),
        }))
      }

      setData(transformedData as unknown as T[])
    } catch (err) {
      logger.error(`[useListPage] Error fetching ${currentConfig.table}:`, { error: String(err) })
      setError(err as Error)
      showError(`Failed to load data`)
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, enableServerPagination, paginationHook.page, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, groupingHook.selectedGroups]) // Dependencies for pagination, filtering, and grouping

  // Keep fetch function refs updated (for use in applyViewConfig without dependency issues)
  useEffect(() => {
    fetchDataRef.current = fetchData
    fetchServerCountsRef.current = metricsHook.fetchServerCounts
    fetchServerSumsRef.current = metricsHook.fetchServerSums
  }, [fetchData, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  // Initial fetch - only run once
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true

    fetchData()
    filtersHook.fetchFilterOptions()
    metricsHook.fetchServerCounts()
    metricsHook.fetchServerSums()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, filtersHook.fetchFilterOptions, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  // ============================================
  // Action Handlers (compose sub-hook state with fetching)
  // ============================================

  // Filter setters - now trigger server-side refetch
  const setFilter = useCallback((id: string, value: string) => {
    const newFilters = { ...filtersHook.filters, [id]: value }
    filtersHook.setFiltersState(newFilters)
    paginationHook.setPageState(1)
    // Refetch with new filters
    fetchData(1, paginationHook.pageSize, newFilters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
    metricsHook.fetchServerCounts(newFilters, filtersHook.searchQuery)
    metricsHook.fetchServerSums(newFilters, filtersHook.searchQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersHook.filters, paginationHook.pageSize, filtersHook.searchQuery, fetchData, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    filtersHook.setFiltersState(newFilters)
    paginationHook.setPageState(1)
    // Refetch with new filters
    fetchData(1, paginationHook.pageSize, newFilters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
    metricsHook.fetchServerCounts(newFilters, filtersHook.searchQuery)
    metricsHook.fetchServerSums(newFilters, filtersHook.searchQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationHook.pageSize, filtersHook.searchQuery, fetchData, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  const clearFilters = useCallback(() => {
    const defaultFilters = filtersHook.configRef.current.defaultFilters || {}
    filtersHook.setFiltersState(defaultFilters)
    paginationHook.setPageState(1)
    // Refetch with cleared filters
    fetchData(1, paginationHook.pageSize, defaultFilters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
    metricsHook.fetchServerCounts(defaultFilters, filtersHook.searchQuery)
    metricsHook.fetchServerSums(defaultFilters, filtersHook.searchQuery)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationHook.pageSize, filtersHook.searchQuery, fetchData, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  // Search setter with debounce for server-side search
  const setSearchQuery = useCallback((query: string) => {
    filtersHook.setSearchQueryState(query)

    // Clear existing timer
    if (filtersHook.searchTimerRef.current) {
      clearTimeout(filtersHook.searchTimerRef.current)
    }

    // Debounce the search to avoid too many requests
    filtersHook.searchTimerRef.current = setTimeout(() => {
      paginationHook.setPageState(1)
      fetchData(1, paginationHook.pageSize, filtersHook.filters, query, undefined, filtersHook.advancedFiltersRef.current)
      metricsHook.fetchServerCounts(filtersHook.filters, query)
      metricsHook.fetchServerSums(filtersHook.filters, query)
    }, SEARCH_DEBOUNCE_MS)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationHook.pageSize, filtersHook.filters, fetchData, metricsHook.fetchServerCounts, metricsHook.fetchServerSums])

  // Sort setters - triggers server-side refetch
  const handleSortChange = useCallback((configs: SortConfig[]) => {
    filtersHook.setSortConfig(configs)
    filtersHook.sortConfigRef.current = configs // Update ref immediately
    paginationHook.setPageState(1) // Reset to page 1 when sort changes
    // Refetch data with new sort
    fetchData(1, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, configs, filtersHook.advancedFiltersRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery])

  const clearSort = useCallback(() => {
    filtersHook.setSortConfig([])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Group by setter - triggers refetch because grouping affects pagination
  const handleSetSelectedGroups = useCallback((groups: string[]) => {
    groupingHook.setSelectedGroups(groups)
    groupingHook.selectedGroupsRef.current = groups // Update ref immediately
    paginationHook.setPageState(1)
    // Reset to page 1 when grouping changes
    fetchData(1, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery])

  // Pagination setters - pass current filters and search
  const setPage = useCallback((newPage: number) => {
    paginationHook.setPageState(newPage)
    fetchData(newPage, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery])

  const setPageSize = useCallback((newSize: number) => {
    paginationHook.setPageSizeState(newSize)
    paginationHook.setPageState(1) // Reset to page 1 when page size changes
    fetchData(1, newSize, filtersHook.filters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, filtersHook.filters, filtersHook.searchQuery])

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil(paginationHook.total / paginationHook.pageSize)
    if (paginationHook.page < totalPages) {
      setPage(paginationHook.page + 1)
    }
  }, [paginationHook.page, paginationHook.pageSize, paginationHook.total, setPage])

  const prevPage = useCallback(() => {
    if (paginationHook.page > 1) {
      setPage(paginationHook.page - 1)
    }
  }, [paginationHook.page, setPage])

  // ============================================
  // Filtered Data (client-side nested field search)
  // ============================================

  const filteredData = useMemo(() => {
    const currentConfig = filtersHook.configRef.current
    let result = [...data]

    // Only apply client-side search for nested fields (fields with dots)
    // Server already handles direct field searches
    if (filtersHook.searchQuery && currentConfig.searchFields.length > 0) {
      const nestedSearchFields = currentConfig.searchFields.filter((field) =>
        String(field).includes(".")
      )

      // Only filter client-side if there are nested fields to search
      if (nestedSearchFields.length > 0) {
        const query = filtersHook.searchQuery.toLowerCase()
        // Check ALL search fields (direct + nested) to avoid incorrectly removing
        // items that matched on direct fields but not nested ones
        const allSearchFields = currentConfig.searchFields
        result = result.filter((item) =>
          allSearchFields.some((field) => {
            const value = getNestedValue(item as unknown as Record<string, unknown>, field as string)
            return value && String(value).toLowerCase().includes(query)
          })
        )
      }
    }

    return result
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filtersHook.searchQuery])

  // ============================================
  // Metrics Computation
  // ============================================

  const metricsData = useMemo(() => {
    return metricsHook.computeMetrics(data, paginationHook.total, metrics)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, paginationHook.total, metrics, metricsHook.computeMetrics])

  // ============================================
  // View Config (for saved views)
  // ============================================

  const getViewConfig = useCallback(() => {
    const viewConfig: import("./list-page/types").TableViewConfig = {}

    // Include sort configuration
    if (filtersHook.sortConfig.length > 0) {
      viewConfig.sort = filtersHook.sortConfig
    }

    // Only include non-empty filters
    const activeFilters = Object.entries(filtersHook.filters).reduce((acc, [key, value]) => {
      if (value && value !== "all") {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)

    if (Object.keys(activeFilters).length > 0) {
      viewConfig.filters = activeFilters
    }

    // Include advanced filters if any are active
    if (filtersHook.advancedFilters.filters.length > 0) {
      viewConfig.advancedFilters = filtersHook.advancedFilters
    }

    if (groupingHook.selectedGroups.length > 0) {
      viewConfig.groupBy = groupingHook.selectedGroups
    }

    if (paginationHook.pageSize !== (config.defaultPageSize || 25)) {
      viewConfig.pageSize = paginationHook.pageSize
    }

    // Include hidden columns
    if (filtersHook.hiddenColumns.length > 0) {
      viewConfig.hiddenColumns = filtersHook.hiddenColumns
    }

    return viewConfig
  }, [filtersHook.sortConfig, filtersHook.filters, filtersHook.advancedFilters, groupingHook.selectedGroups, paginationHook.pageSize, config.defaultPageSize, filtersHook.hiddenColumns])

  // Apply a view configuration (or reset to default if null)
  const applyViewConfig = useCallback((viewConfig: import("./list-page/types").TableViewConfig | null) => {
    let newFilters: Record<string, string>
    let newGroups: string[]
    let newPageSize: number
    let newAdvancedFilters: FilterGroup

    if (viewConfig === null) {
      // Reset to defaults
      filtersHook.setSortConfig([])
      newFilters = config.defaultFilters || {}
      filtersHook.setFiltersState(newFilters)
      newAdvancedFilters = { filters: [], combineMode: "and" }
      filtersHook.setAdvancedFiltersState(newAdvancedFilters)
      filtersHook.advancedFiltersRef.current = newAdvancedFilters
      newGroups = []
      groupingHook.setSelectedGroups(newGroups)
      groupingHook.selectedGroupsRef.current = newGroups
      newPageSize = config.defaultPageSize || 25
      paginationHook.setPageSizeState(newPageSize)
      paginationHook.setPageState(1)
      filtersHook.setHiddenColumnsState(defaultHiddenColumns)
    } else {
      // Apply view config
      if (viewConfig.sort && viewConfig.sort.length > 0) {
        filtersHook.setSortConfig(viewConfig.sort)
      } else {
        filtersHook.setSortConfig([])
      }

      if (viewConfig.filters) {
        newFilters = viewConfig.filters
        filtersHook.setFiltersState(newFilters)
      } else {
        newFilters = config.defaultFilters || {}
        filtersHook.setFiltersState(newFilters)
      }

      // Apply advanced filters
      if (viewConfig.advancedFilters) {
        newAdvancedFilters = viewConfig.advancedFilters
        filtersHook.setAdvancedFiltersState(newAdvancedFilters)
        filtersHook.advancedFiltersRef.current = newAdvancedFilters
      } else {
        newAdvancedFilters = { filters: [], combineMode: "and" }
        filtersHook.setAdvancedFiltersState(newAdvancedFilters)
        filtersHook.advancedFiltersRef.current = newAdvancedFilters
      }

      if (viewConfig.groupBy) {
        newGroups = viewConfig.groupBy
        groupingHook.setSelectedGroups(newGroups)
        groupingHook.selectedGroupsRef.current = newGroups
      } else {
        newGroups = []
        groupingHook.setSelectedGroups(newGroups)
        groupingHook.selectedGroupsRef.current = newGroups
      }

      newPageSize = viewConfig.pageSize || config.defaultPageSize || 25
      paginationHook.setPageSizeState(newPageSize)

      // Apply hidden columns
      if (viewConfig.hiddenColumns) {
        filtersHook.setHiddenColumnsState(viewConfig.hiddenColumns)
      } else {
        filtersHook.setHiddenColumnsState([])
      }

      paginationHook.setPageState(1) // Always reset to page 1 when applying a view
    }

    // Trigger refetch with new values using refs (to avoid dependency loop)
    if (fetchDataRef.current) {
      fetchDataRef.current(1, newPageSize, newFilters, filtersHook.searchQuery, undefined, newAdvancedFilters)
    }
    if (fetchServerCountsRef.current) {
      fetchServerCountsRef.current(newFilters, filtersHook.searchQuery)
    }
    if (fetchServerSumsRef.current) {
      fetchServerSumsRef.current(newFilters, filtersHook.searchQuery)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.defaultFilters, config.defaultPageSize, filtersHook.searchQuery])

  // Advanced filters methods
  const setAdvancedFilters = useCallback((group: FilterGroup) => {
    filtersHook.setAdvancedFiltersState(group)
    filtersHook.advancedFiltersRef.current = group // Update ref immediately
    paginationHook.setPageState(1)
    // Refetch with the new advanced filters
    fetchData(1, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, undefined, group)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, fetchData])

  const clearAdvancedFilters = useCallback(() => {
    const emptyGroup: FilterGroup = { filters: [], combineMode: "and" }
    filtersHook.setAdvancedFiltersState(emptyGroup)
    filtersHook.advancedFiltersRef.current = emptyGroup // Update ref immediately
    paginationHook.setPageState(1)
    fetchData(1, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, undefined, emptyGroup)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, fetchData])

  // Column visibility methods
  const setHiddenColumns = useCallback((columns: string[]) => {
    filtersHook.setHiddenColumnsState(columns)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const toggleColumn = useCallback((key: string) => {
    filtersHook.setHiddenColumnsState(
      filtersHook.hiddenColumns.includes(key)
        ? filtersHook.hiddenColumns.filter(k => k !== key)
        : [...filtersHook.hiddenColumns, key]
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtersHook.hiddenColumns])

  const resetColumnVisibility = useCallback(() => {
    filtersHook.setHiddenColumnsState(defaultHiddenColumns)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ============================================
  // Return
  // ============================================

  return {
    data,
    filteredData,
    loading,
    error,
    refetch: () => fetchData(paginationHook.page, paginationHook.pageSize, filtersHook.filters, filtersHook.searchQuery, undefined, filtersHook.advancedFiltersRef.current),
    filters: filtersHook.filters,
    setFilter,
    setFilters,
    clearFilters,
    filterOptions: filtersHook.filterOptions,
    // Advanced filters
    advancedFilters: filtersHook.advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters,
    selectedGroups: groupingHook.selectedGroups,
    setSelectedGroups: handleSetSelectedGroups,
    groupConfig: groupingHook.groupConfig,
    groupCounts: groupingHook.groupCounts,
    metricsData,
    searchQuery: filtersHook.searchQuery,
    setSearchQuery,  // Now triggers server-side search with debounce
    // Sorting
    sortConfig: filtersHook.sortConfig,
    setSortConfig: filtersHook.setSortConfig,
    handleSortChange,
    clearSort,
    // Pagination
    pagination: paginationHook.pagination,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    // Column visibility
    hiddenColumns: filtersHook.hiddenColumns,
    setHiddenColumns,
    toggleColumn,
    resetColumnVisibility,
    // View config (for saved views)
    getViewConfig,
    applyViewConfig,
  }
}
