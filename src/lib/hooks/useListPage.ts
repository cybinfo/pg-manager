/**
 * useListPage Hook
 *
 * Centralized hook for all list pages. Replaces ~1000 lines of duplicated code.
 * Handles: data fetching, filtering, grouping, metrics, and pagination.
 *
 * @example
 * const { data, loading, filters, setFilter, metrics, grouping } = useListPage({
 *   config: tenantsConfig,
 *   workspace_id: workspaceId,
 * })
 */

"use client"

import { useState, useEffect, useMemo, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin, transformArrayJoins } from "@/lib/supabase/transforms"
import { toast } from "sonner"
import { SEARCH_DEBOUNCE_MS } from "@/lib/constants"
import { applyAdvancedFilters } from "@/lib/filters/apply-advanced-filters"
import type { FilterGroup } from "@/types/table-features.types"
import { hasActiveAdvancedFilters } from "@/types/table-features.types"

// ============================================
// Types
// ============================================

export interface ListPageConfig<T> {
  table: string
  select: string
  defaultOrderBy: string
  defaultOrderDirection: "asc" | "desc"
  searchFields: (keyof T)[]
  joinFields?: (keyof T)[]
  computedFields?: (item: Record<string, unknown>) => Record<string, unknown>
  defaultFilters?: Record<string, string>
  // Pagination settings
  defaultPageSize?: number // defaults to 25
  enableServerPagination?: boolean // defaults to true
  // Soft delete settings
  includeSoftDeleted?: boolean // defaults to false - set to true to include deleted records
}

export interface FilterConfig {
  id: string
  label: string
  type: "select" | "multi-select" | "date" | "date-range" | "text" | "number-range"
  placeholder?: string
  options?: { value: string; label: string }[]
  optionsQuery?: {
    table: string
    valueField: string
    labelField: string
    orderBy?: string
    filter?: Record<string, unknown>
  }
}

export interface GroupByOption {
  value: string
  label: string
}

// Server filter operators for count-based metrics
export type ServerFilterOperator =
  | "eq"       // Equal: column = value
  | "neq"      // Not equal: column != value
  | "in"       // IN array: column IN (values)
  | "not_in"   // NOT IN array: column NOT IN (values)
  | "contains" // Array contains: column @> value
  | "gt"       // Greater than: column > value
  | "gte"      // Greater or equal: column >= value
  | "lt"       // Less than: column < value
  | "lte"      // Less or equal: column <= value
  | "is_null"  // IS NULL: column IS NULL
  | "is_not_null" // IS NOT NULL: column IS NOT NULL

// Server filter configuration
export interface ServerFilter {
  column: string
  operator: ServerFilterOperator
  value?: unknown // Optional for is_null/is_not_null
}

// Server sum configuration for aggregation metrics
export interface ServerSum {
  column: string
  filter?: ServerFilter // Optional filter before summing
}

export interface MetricConfig<T> {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  // compute receives: items (current page), total (server total), serverCounts/serverSums (keyed by metric id)
  compute: (items: T[], total: number, serverData?: Record<string, number>) => number | string
  format?: "number" | "currency" | "percentage"
  highlight?: (value: number | string, items: T[]) => boolean
  // For count-based metrics: specify a server-side filter to get accurate count across all pages
  serverFilter?: ServerFilter
  // For sum/aggregation metrics: specify column to sum with optional filter
  serverSum?: ServerSum
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// Sort configuration - supports multi-column sorting
export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

// View config type for saved views
export interface TableViewConfig {
  sort?: SortConfig[]  // Array for multi-column sorting
  filters?: Record<string, string>
  advancedFilters?: import("@/types/table-features.types").FilterGroup // Advanced filters
  groupBy?: string[]
  pageSize?: number
  hiddenColumns?: string[]
}

export interface UseListPageOptions<T> {
  config: ListPageConfig<T>
  filters?: FilterConfig[]
  groupByOptions?: GroupByOption[]
  metrics?: MetricConfig<T>[]
  initialFilters?: Record<string, string>
  initialGroups?: string[]
  initialPageSize?: number
  initialViewConfig?: TableViewConfig // Apply a saved view configuration
  enabled?: boolean
}

export interface UseListPageReturn<T> {
  // Data
  data: T[]
  filteredData: T[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>

  // Filters
  filters: Record<string, string>
  setFilter: (id: string, value: string) => void
  setFilters: (filters: Record<string, string>) => void
  clearFilters: () => void
  filterOptions: Record<string, { value: string; label: string }[]>

  // Advanced Filters
  advancedFilters: import("@/types/table-features.types").FilterGroup
  setAdvancedFilters: (group: import("@/types/table-features.types").FilterGroup) => void
  clearAdvancedFilters: () => void

  // Grouping
  selectedGroups: string[]
  setSelectedGroups: (groups: string[]) => void
  groupConfig: { key: string; label: string | undefined }[]
  groupCounts: Record<string, number> // Server-side counts for accurate group totals

  // Metrics
  metricsData: { id: string; label: string; value: number | string; icon?: React.ComponentType<{ className?: string }>; highlight?: boolean }[]

  // Search
  searchQuery: string
  setSearchQuery: (query: string) => void

  // Sorting
  sortConfig: SortConfig[]
  setSortConfig: (config: SortConfig[]) => void
  handleSortChange: (configs: SortConfig[]) => void
  clearSort: () => void

  // Pagination
  pagination: PaginationState
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void

  // Column Visibility
  hiddenColumns: string[]
  setHiddenColumns: (columns: string[]) => void
  toggleColumn: (key: string) => void
  resetColumnVisibility: () => void

  // View config (for saved views)
  getViewConfig: () => TableViewConfig
  applyViewConfig: (config: TableViewConfig | null) => void
}

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
    enabled = true,
  } = options

  // Pagination defaults
  const defaultPageSize = initialViewConfig?.pageSize || initialPageSize || config.defaultPageSize || 25
  const enableServerPagination = config.enableServerPagination !== false

  // Compute initial values from view config
  const computedInitialFilters = initialViewConfig?.filters || initialFilters
  const computedInitialGroups = initialViewConfig?.groupBy || initialGroups
  const computedInitialSort = initialViewConfig?.sort || []
  const computedInitialHiddenColumns = initialViewConfig?.hiddenColumns || []
  const computedInitialAdvancedFilters = initialViewConfig?.advancedFilters || { filters: [], combineMode: "and" as const }

  // State
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<Record<string, string>>(computedInitialFilters)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(computedInitialGroups)
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  const [searchQuery, setSearchQueryState] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(computedInitialSort)

  // Advanced filters state
  const [advancedFilters, setAdvancedFiltersState] = useState<import("@/types/table-features.types").FilterGroup>(computedInitialAdvancedFilters)

  // Column visibility state
  const [hiddenColumns, setHiddenColumnsState] = useState<string[]>(computedInitialHiddenColumns)

  // Debounce timer for search
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Pagination state
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)

  // Server-side metric counts (for accurate counts across all pages)
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({})

  // Server-side metric sums (for accurate aggregations across all pages)
  const [serverSums, setServerSums] = useState<Record<string, number>>({})

  // Server-side group counts (for accurate group totals when paginated)
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({})

  // Track if server counts/sums are loading
  const [serverCountsLoading, setServerCountsLoading] = useState(false)

  // Use refs to store stable references - prevents infinite loops
  const configRef = useRef(config)
  const metricsRef = useRef(metrics)
  const filterConfigsRef = useRef(filterConfigs)
  const selectedGroupsRef = useRef(selectedGroups)
  const sortConfigRef = useRef(sortConfig)
  const initialFetchDone = useRef(false)

  // Refs for fetch functions - used by applyViewConfig to avoid dependency loops
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchDataRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchServerCountsRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fetchServerSumsRef = useRef<any>(null)

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    configRef.current = config
    filterConfigsRef.current = filterConfigs
    metricsRef.current = metrics
  }, [config, filterConfigs, metrics])

  // Keep selectedGroups ref in sync with state
  useEffect(() => {
    selectedGroupsRef.current = selectedGroups
  }, [selectedGroups])

  // Keep sortConfig ref in sync with state
  useEffect(() => {
    sortConfigRef.current = sortConfig
  }, [sortConfig])

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

  // Ref for advanced filters
  const advancedFiltersRef = useRef(advancedFilters)
  useEffect(() => {
    advancedFiltersRef.current = advancedFilters
  }, [advancedFilters])

  // Fetch main data - uses ref to avoid dependency issues
  // Now applies server-side filters and sorting for proper pagination
  const fetchData = useCallback(async (
    fetchPage?: number,
    fetchPageSize?: number,
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string,
    fetchSort?: SortConfig[],
    fetchAdvancedFilters?: FilterGroup
  ) => {
    if (!enabled) return

    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentPage = fetchPage ?? page
    const currentPageSize = fetchPageSize ?? pageSize
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery
    const currentSort = fetchSort ?? sortConfigRef.current
    const currentAdvancedFilters = fetchAdvancedFilters ?? advancedFiltersRef.current
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

      // Filter out soft-deleted records by default
      if (!currentConfig.includeSoftDeleted) {
        query = query.is("deleted_at", null)
      }

      // Apply server-side filters
      for (const [filterId, filterValue] of Object.entries(currentFilters)) {
        if (!filterValue || filterValue === "all") continue

        const filterConfig = currentFilterConfigs.find((f) => f.id === filterId)
        if (!filterConfig) continue

        // Handle different filter types
        if (filterConfig.type === "select") {
          // Handle FK relationships (property -> property_id)
          if (filterId === "property") {
            query = query.eq("property_id", filterValue)
          } else if (filterId === "tenant") {
            query = query.eq("tenant_id", filterValue)
          } else if (filterId === "room") {
            query = query.eq("room_id", filterValue)
          }
          // Handle array columns (tags contains value)
          else if (filterId === "tags") {
            query = query.contains("tags", [filterValue])
          }
          // Handle virtual "status" filter for People (maps to is_verified/is_blocked)
          else if (filterId === "status" && currentConfig.table === "people") {
            if (filterValue === "verified") {
              query = query.eq("is_verified", true)
            } else if (filterValue === "blocked") {
              query = query.eq("is_blocked", true)
            }
          }
          // Handle visitor_type filter
          else if (filterId === "visitor_type") {
            query = query.eq("visitor_type", filterValue)
          }
          // Handle settlement_status for exit_clearance
          else if (filterId === "settlement_status") {
            query = query.eq("settlement_status", filterValue)
          }
          // Handle refund_type
          else if (filterId === "refund_type") {
            query = query.eq("refund_type", filterValue)
          }
          // Handle meter_type
          else if (filterId === "meter_type") {
            query = query.eq("meter_type", filterValue)
          }
          // Default: direct column filter (status, type, etc.)
          else {
            query = query.eq(filterId, filterValue)
          }
        } else if (filterConfig.type === "date") {
          query = query.eq(filterId, filterValue)
        }
      }

      // Apply date range filters
      if (currentFilters.date_from) {
        const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
        query = query.gte(dateField, currentFilters.date_from)
      }
      if (currentFilters.date_to) {
        const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
        query = query.lte(dateField, currentFilters.date_to)
      }

      // Apply server-side search using ilike for text fields
      if (currentSearchQuery && currentConfig.searchFields.length > 0) {
        // Build OR conditions for search across multiple fields
        // Supabase doesn't support OR directly, so we use .or() with column filters
        const searchConditions = currentConfig.searchFields
          .filter((field) => {
            // Only search on direct columns, not nested (those need client-side filtering)
            const fieldStr = String(field)
            return !fieldStr.includes(".")
          })
          .map((field) => `${String(field)}.ilike.%${currentSearchQuery}%`)
          .join(",")

        if (searchConditions) {
          query = query.or(searchConditions)
        }
      }

      // Apply advanced filters (multiple operators, AND/OR logic)
      if (hasActiveAdvancedFilters(currentAdvancedFilters)) {
        query = applyAdvancedFilters(query, currentAdvancedFilters)
      }

      // Apply server-side pagination (works with grouping - group counts are fetched separately)
      if (enableServerPagination) {
        const from = (currentPage - 1) * currentPageSize
        const to = from + currentPageSize - 1
        query = query.range(from, to)
      }

      const { data: rawData, error: fetchError, count } = await query

      if (fetchError) {
        throw fetchError
      }

      // Update total count (now reflects filtered count)
      if (count !== null) {
        setTotal(count)
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
      console.error(`[useListPage] Error fetching ${currentConfig.table}:`, err)
      setError(err as Error)
      toast.error(`Failed to load data`)
    } finally {
      setLoading(false)
    }
  }, [enabled, enableServerPagination, page, pageSize, filters, searchQuery, selectedGroups]) // Dependencies for pagination, filtering, and grouping

  // Helper function to apply serverFilter to a query (centralized operator handling)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const applyServerFilter = (query: any, filter: ServerFilter) => {
    const { column, operator, value } = filter

    switch (operator) {
      case "eq":
        return query.eq(column, value)
      case "neq":
        return query.neq(column, value)
      case "in":
        // Supabase uses .in() for IN queries
        return query.in(column, value as unknown[])
      case "not_in":
        // For NOT IN, we need to use .not with .in
        return query.not(column, "in", `(${(value as unknown[]).join(",")})`)
      case "contains":
        return query.contains(column, value as unknown[])
      case "gt":
        return query.gt(column, value)
      case "gte":
        return query.gte(column, value)
      case "lt":
        return query.lt(column, value)
      case "lte":
        return query.lte(column, value)
      case "is_null":
        return query.is(column, null)
      case "is_not_null":
        return query.not(column, "is", null)
      default:
        return query
    }
  }

  // Fetch server-side counts for metrics with serverFilter
  const fetchServerCounts = useCallback(async (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentMetrics = metricsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery

    // Find metrics that have serverFilter defined
    const metricsWithServerFilter = currentMetrics.filter((m) => m.serverFilter)
    if (metricsWithServerFilter.length === 0) return

    setServerCountsLoading(true)

    try {
      const supabase = createClient()
      const counts: Record<string, number> = {}

      // Query each metric separately
      for (const metric of metricsWithServerFilter) {
        if (!metric.serverFilter) continue

        // Build base query with all current filters applied
        let query = supabase
          .from(currentConfig.table)
          .select("*", { count: "exact", head: true })

        // Filter out soft-deleted records by default
        if (!currentConfig.includeSoftDeleted) {
          query = query.is("deleted_at", null)
        }

        // Apply active filters (same logic as fetchData)
        for (const [filterId, filterValue] of Object.entries(currentFilters)) {
          if (!filterValue || filterValue === "all") continue

          const filterConfig = currentFilterConfigs.find((f) => f.id === filterId)
          if (!filterConfig) continue

          if (filterConfig.type === "select") {
            if (filterId === "property") {
              query = query.eq("property_id", filterValue)
            } else if (filterId === "tenant") {
              query = query.eq("tenant_id", filterValue)
            } else if (filterId === "room") {
              query = query.eq("room_id", filterValue)
            } else if (filterId === "tags") {
              query = query.contains("tags", [filterValue])
            } else if (filterId === "status" && currentConfig.table === "people") {
              if (filterValue === "verified") {
                query = query.eq("is_verified", true)
              } else if (filterValue === "blocked") {
                query = query.eq("is_blocked", true)
              }
            } else if (filterId === "visitor_type") {
              query = query.eq("visitor_type", filterValue)
            } else if (filterId === "settlement_status") {
              query = query.eq("settlement_status", filterValue)
            } else if (filterId === "refund_type") {
              query = query.eq("refund_type", filterValue)
            } else if (filterId === "meter_type") {
              query = query.eq("meter_type", filterValue)
            } else {
              query = query.eq(filterId, filterValue)
            }
          } else if (filterConfig.type === "date") {
            query = query.eq(filterId, filterValue)
          }
        }

        // Apply date range filters
        if (currentFilters.date_from) {
          const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
          query = query.gte(dateField, currentFilters.date_from)
        }
        if (currentFilters.date_to) {
          const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
          query = query.lte(dateField, currentFilters.date_to)
        }

        // Apply search filter
        if (currentSearchQuery && currentConfig.searchFields.length > 0) {
          const searchConditions = currentConfig.searchFields
            .filter((field) => !String(field).includes("."))
            .map((field) => `${String(field)}.ilike.%${currentSearchQuery}%`)
            .join(",")

          if (searchConditions) {
            query = query.or(searchConditions)
          }
        }

        // Apply the metric's specific serverFilter using centralized helper
        query = applyServerFilter(query, metric.serverFilter)

        const { count, error } = await query

        if (!error && count !== null) {
          counts[metric.id] = count
        }
      }

      setServerCounts(counts)
    } catch (err) {
      console.error("[useListPage] Error fetching server counts:", err)
    } finally {
      setServerCountsLoading(false)
    }
  }, [filters, searchQuery])

  // Fetch server-side sums for metrics with serverSum
  const fetchServerSums = useCallback(async (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentMetrics = metricsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery

    // Find metrics that have serverSum defined
    const metricsWithServerSum = currentMetrics.filter((m) => m.serverSum)
    if (metricsWithServerSum.length === 0) return

    try {
      const supabase = createClient()
      const sums: Record<string, number> = {}

      // Query each metric separately
      for (const metric of metricsWithServerSum) {
        if (!metric.serverSum) continue

        const { column, filter: sumFilter } = metric.serverSum

        // Build query to get sum - use RPC or raw select with aggregation
        // Supabase doesn't have direct .sum() on client, so we select the column and sum client-side
        // For large datasets, consider using a database function
        let query = supabase
          .from(currentConfig.table)
          .select(column)

        // Filter out soft-deleted records by default
        if (!currentConfig.includeSoftDeleted) {
          query = query.is("deleted_at", null)
        }

        // Apply active filters (same logic as fetchData)
        for (const [filterId, filterValue] of Object.entries(currentFilters)) {
          if (!filterValue || filterValue === "all") continue

          const filterConfig = currentFilterConfigs.find((f) => f.id === filterId)
          if (!filterConfig) continue

          if (filterConfig.type === "select") {
            if (filterId === "property") {
              query = query.eq("property_id", filterValue)
            } else if (filterId === "tenant") {
              query = query.eq("tenant_id", filterValue)
            } else if (filterId === "room") {
              query = query.eq("room_id", filterValue)
            } else if (filterId === "tags") {
              query = query.contains("tags", [filterValue])
            } else if (filterId === "status" && currentConfig.table === "people") {
              if (filterValue === "verified") {
                query = query.eq("is_verified", true)
              } else if (filterValue === "blocked") {
                query = query.eq("is_blocked", true)
              }
            } else if (filterId === "visitor_type") {
              query = query.eq("visitor_type", filterValue)
            } else if (filterId === "settlement_status") {
              query = query.eq("settlement_status", filterValue)
            } else if (filterId === "refund_type") {
              query = query.eq("refund_type", filterValue)
            } else if (filterId === "meter_type") {
              query = query.eq("meter_type", filterValue)
            } else {
              query = query.eq(filterId, filterValue)
            }
          } else if (filterConfig.type === "date") {
            query = query.eq(filterId, filterValue)
          }
        }

        // Apply date range filters
        if (currentFilters.date_from) {
          const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
          query = query.gte(dateField, currentFilters.date_from)
        }
        if (currentFilters.date_to) {
          const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
          query = query.lte(dateField, currentFilters.date_to)
        }

        // Apply search filter
        if (currentSearchQuery && currentConfig.searchFields.length > 0) {
          const searchConditions = currentConfig.searchFields
            .filter((field) => !String(field).includes("."))
            .map((field) => `${String(field)}.ilike.%${currentSearchQuery}%`)
            .join(",")

          if (searchConditions) {
            query = query.or(searchConditions)
          }
        }

        // Apply the metric's specific filter if defined
        if (sumFilter) {
          query = applyServerFilter(query, sumFilter)
        }

        const { data, error } = await query

        if (!error && data) {
          // Sum up the column values
          const sum = (data as Record<string, unknown>[]).reduce((acc, row) => {
            const val = row[column]
            return acc + (typeof val === "number" ? val : Number(val) || 0)
          }, 0)
          sums[metric.id] = sum
        }
      }

      setServerSums(sums)
    } catch (err) {
      console.error("[useListPage] Error fetching server sums:", err)
    }
  }, [filters, searchQuery])

  // Fetch server-side group counts for accurate group totals when paginated
  const fetchGroupCounts = useCallback(async (
    groupFields?: string[],
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery
    const groups = groupFields ?? selectedGroupsRef.current

    // No groups selected, clear counts
    if (groups.length === 0) {
      setGroupCounts({})
      return
    }

    try {
      const supabase = createClient()
      const counts: Record<string, number> = {}

      // For each group field, get counts
      // We'll select the group field and count using a workaround
      for (const groupField of groups) {
        // Determine the actual column to group by
        // For nested fields like "room.room_number", we need the FK column
        let selectColumn = groupField
        let isNestedField = groupField.includes(".")

        if (isNestedField) {
          // For "room.room_number", we group by room_id but display room_number
          // Map common patterns
          if (groupField.startsWith("room.")) selectColumn = "room_id"
          else if (groupField.startsWith("property.")) selectColumn = "property_id"
          else if (groupField.startsWith("category.")) selectColumn = "category_id"
          else if (groupField.startsWith("tenant.")) selectColumn = "tenant_id"
          else if (groupField.startsWith("product.")) selectColumn = "product_id"
          else if (groupField.startsWith("vendor.")) selectColumn = "vendor_id"
          else if (groupField.startsWith("person.")) selectColumn = "person_id"
          else {
            // Can't handle this nested field, skip
            continue
          }
        }

        // Build query to get all values of the group column
        let query = supabase
          .from(currentConfig.table)
          .select(selectColumn)

        // Filter out soft-deleted records by default
        if (!currentConfig.includeSoftDeleted) {
          query = query.is("deleted_at", null)
        }

        // Apply active filters (same logic as fetchData)
        for (const [filterId, filterValue] of Object.entries(currentFilters)) {
          if (!filterValue || filterValue === "all") continue

          const filterConfig = currentFilterConfigs.find((f) => f.id === filterId)
          if (!filterConfig) continue

          if (filterConfig.type === "select") {
            if (filterId === "property") {
              query = query.eq("property_id", filterValue)
            } else if (filterId === "tenant") {
              query = query.eq("tenant_id", filterValue)
            } else if (filterId === "room") {
              query = query.eq("room_id", filterValue)
            } else if (filterId === "tags") {
              query = query.contains("tags", [filterValue])
            } else if (filterId === "status" && currentConfig.table === "people") {
              if (filterValue === "verified") {
                query = query.eq("is_verified", true)
              } else if (filterValue === "blocked") {
                query = query.eq("is_blocked", true)
              }
            } else if (filterId === "visitor_type") {
              query = query.eq("visitor_type", filterValue)
            } else if (filterId === "settlement_status") {
              query = query.eq("settlement_status", filterValue)
            } else if (filterId === "refund_type") {
              query = query.eq("refund_type", filterValue)
            } else if (filterId === "meter_type") {
              query = query.eq("meter_type", filterValue)
            } else {
              query = query.eq(filterId, filterValue)
            }
          } else if (filterConfig.type === "date") {
            query = query.eq(filterId, filterValue)
          }
        }

        // Apply search filter
        if (currentSearchQuery && currentConfig.searchFields.length > 0) {
          const searchConditions = currentConfig.searchFields
            .filter((field) => !String(field).includes("."))
            .map((field) => `${String(field)}.ilike.%${currentSearchQuery}%`)
            .join(",")

          if (searchConditions) {
            query = query.or(searchConditions)
          }
        }

        const { data, error } = await query

        if (!error && data) {
          // Count occurrences of each value
          const valueCounts: Record<string, number> = {}
          for (const row of data as Record<string, unknown>[]) {
            const value = row[selectColumn]
            const key = value != null ? String(value) : "__null__"
            valueCounts[key] = (valueCounts[key] || 0) + 1
          }

          // Store counts with the group field as prefix for uniqueness
          for (const [value, count] of Object.entries(valueCounts)) {
            counts[`${groupField}:${value}`] = count
          }
        }
      }

      setGroupCounts(counts)
    } catch (err) {
      console.error("[useListPage] Error fetching group counts:", err)
    }
  }, [filters, searchQuery])

  // Keep fetch function refs updated (for use in applyViewConfig without dependency issues)
  useEffect(() => {
    fetchDataRef.current = fetchData
    fetchServerCountsRef.current = fetchServerCounts
    fetchServerSumsRef.current = fetchServerSums
  }, [fetchData, fetchServerCounts, fetchServerSums])

  // Fetch group counts when grouping changes
  useEffect(() => {
    if (selectedGroups.length > 0) {
      fetchGroupCounts(selectedGroups, filters, searchQuery)
    } else {
      setGroupCounts({})
    }
  }, [selectedGroups, filters, searchQuery, fetchGroupCounts])

  // Initial fetch - only run once
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true

    fetchData()
    fetchFilterOptions()
    fetchServerCounts()
    fetchServerSums()
  }, [fetchData, fetchFilterOptions, fetchServerCounts, fetchServerSums])

  // Filter setters - now trigger server-side refetch
  const setFilter = useCallback((id: string, value: string) => {
    const newFilters = { ...filters, [id]: value }
    setFiltersState(newFilters)
    setPageState(1)
    // Refetch with new filters
    fetchData(1, pageSize, newFilters, searchQuery, undefined, advancedFiltersRef.current)
    fetchServerCounts(newFilters, searchQuery)
    fetchServerSums(newFilters, searchQuery)
  }, [filters, pageSize, searchQuery, fetchData, fetchServerCounts, fetchServerSums])

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters)
    setPageState(1)
    // Refetch with new filters
    fetchData(1, pageSize, newFilters, searchQuery, undefined, advancedFiltersRef.current)
    fetchServerCounts(newFilters, searchQuery)
    fetchServerSums(newFilters, searchQuery)
  }, [pageSize, searchQuery, fetchData, fetchServerCounts, fetchServerSums])

  const clearFilters = useCallback(() => {
    const defaultFilters = configRef.current.defaultFilters || {}
    setFiltersState(defaultFilters)
    setPageState(1)
    // Refetch with cleared filters
    fetchData(1, pageSize, defaultFilters, searchQuery, undefined, advancedFiltersRef.current)
    fetchServerCounts(defaultFilters, searchQuery)
    fetchServerSums(defaultFilters, searchQuery)
  }, [pageSize, searchQuery, fetchData, fetchServerCounts, fetchServerSums])

  // Search setter with debounce for server-side search
  const setSearchQuery = useCallback((query: string) => {
    setSearchQueryState(query)

    // Clear existing timer
    if (searchTimerRef.current) {
      clearTimeout(searchTimerRef.current)
    }

    // Debounce the search to avoid too many requests
    searchTimerRef.current = setTimeout(() => {
      setPageState(1)
      fetchData(1, pageSize, filters, query, undefined, advancedFiltersRef.current)
      fetchServerCounts(filters, query)
      fetchServerSums(filters, query)
    }, SEARCH_DEBOUNCE_MS)
  }, [pageSize, filters, fetchData, fetchServerCounts, fetchServerSums])

  // Sort setters - now receives array from DataTable for multi-column sorting
  // Triggers server-side refetch with new sort applied
  const handleSortChange = useCallback((configs: SortConfig[]) => {
    setSortConfig(configs)
    sortConfigRef.current = configs // Update ref immediately
    setPageState(1) // Reset to page 1 when sort changes
    // Refetch data with new sort
    fetchData(1, pageSize, filters, searchQuery, configs, advancedFiltersRef.current)
  }, [fetchData, pageSize, filters, searchQuery])

  const clearSort = useCallback(() => {
    setSortConfig([])
  }, [])

  // Group by setter - triggers refetch because grouping affects pagination
  // When grouping is active, we fetch all data (no pagination)
  const handleSetSelectedGroups = useCallback((groups: string[]) => {
    setSelectedGroups(groups)
    selectedGroupsRef.current = groups // Update ref immediately
    setPageState(1)
    // Reset to page 1 when grouping changes
    fetchData(1, pageSize, filters, searchQuery, undefined, advancedFiltersRef.current)
  }, [fetchData, pageSize, filters, searchQuery])

  // Pagination setters - pass current filters and search
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
    fetchData(newPage, pageSize, filters, searchQuery, undefined, advancedFiltersRef.current)
  }, [fetchData, pageSize, filters, searchQuery])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPageState(1) // Reset to page 1 when page size changes
    fetchData(1, newSize, filters, searchQuery, undefined, advancedFiltersRef.current)
  }, [fetchData, filters, searchQuery])

  const nextPage = useCallback(() => {
    const totalPages = Math.ceil(total / pageSize)
    if (page < totalPages) {
      setPage(page + 1)
    }
  }, [page, pageSize, total, setPage])

  const prevPage = useCallback(() => {
    if (page > 1) {
      setPage(page - 1)
    }
  }, [page, setPage])

  // Compute pagination state
  const pagination = useMemo((): PaginationState => {
    const totalPages = Math.ceil(total / pageSize) || 1
    return {
      page,
      pageSize,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    }
  }, [page, pageSize, total])

  // Filter data - now mostly server-side, this only handles nested property searches
  // that the server can't easily handle (like searching "tenant.name" across JOINed data)
  const filteredData = useMemo(() => {
    const currentConfig = configRef.current
    let result = [...data]

    // Only apply client-side search for nested fields (fields with dots)
    // Server already handles direct field searches
    if (searchQuery && currentConfig.searchFields.length > 0) {
      const nestedSearchFields = currentConfig.searchFields.filter((field) =>
        String(field).includes(".")
      )

      // Only filter client-side if there are nested fields to search
      if (nestedSearchFields.length > 0) {
        const query = searchQuery.toLowerCase()
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
  }, [data, searchQuery])

  // Group config for DataTable
  const groupConfig = useMemo(() => {
    return selectedGroups.map((key) => ({
      key,
      label: groupByOptions.find((o) => o.value === key)?.label,
    }))
  }, [selectedGroups, groupByOptions])

  // Compute metrics - pass pagination.total, serverCounts, and serverSums for accurate values
  const metricsData = useMemo(() => {
    // Merge serverCounts and serverSums for passing to compute function
    const serverData = { ...serverCounts, ...serverSums }

    return metrics.map((metric) => {
      let value: number | string

      // For serverFilter metrics (count-based), use server count directly
      if (metric.serverFilter && serverCounts[metric.id] !== undefined) {
        value = serverCounts[metric.id]
      }
      // For serverSum metrics, always call compute to allow formatting (e.g., currency)
      // The compute function receives serverData and can access the sum via serverData[metric.id]
      else {
        // Compute function handles both regular calculation and serverSum formatting
        value = metric.compute(data, total, serverData)
      }

      return {
        id: metric.id,
        label: metric.label,
        value,
        icon: metric.icon,
        highlight: metric.highlight ? metric.highlight(value, data) : false,
      }
    })
  }, [data, total, metrics, serverCounts, serverSums])

  // Get current view configuration (for saving views)
  const getViewConfig = useCallback((): TableViewConfig => {
    const viewConfig: TableViewConfig = {}

    // Include sort configuration
    if (sortConfig.length > 0) {
      viewConfig.sort = sortConfig
    }

    // Only include non-empty filters
    const activeFilters = Object.entries(filters).reduce((acc, [key, value]) => {
      if (value && value !== "all") {
        acc[key] = value
      }
      return acc
    }, {} as Record<string, string>)

    if (Object.keys(activeFilters).length > 0) {
      viewConfig.filters = activeFilters
    }

    // Include advanced filters if any are active
    if (advancedFilters.filters.length > 0) {
      viewConfig.advancedFilters = advancedFilters
    }

    if (selectedGroups.length > 0) {
      viewConfig.groupBy = selectedGroups
    }

    if (pageSize !== (config.defaultPageSize || 25)) {
      viewConfig.pageSize = pageSize
    }

    // Include hidden columns
    if (hiddenColumns.length > 0) {
      viewConfig.hiddenColumns = hiddenColumns
    }

    return viewConfig
  }, [sortConfig, filters, advancedFilters, selectedGroups, pageSize, config.defaultPageSize, hiddenColumns])

  // Apply a view configuration (or reset to default if null)
  const applyViewConfig = useCallback((viewConfig: TableViewConfig | null) => {
    let newFilters: Record<string, string>
    let newGroups: string[]
    let newPageSize: number
    let newAdvancedFilters: FilterGroup

    if (viewConfig === null) {
      // Reset to defaults
      setSortConfig([])
      newFilters = config.defaultFilters || {}
      setFiltersState(newFilters)
      newAdvancedFilters = { filters: [], combineMode: "and" }
      setAdvancedFiltersState(newAdvancedFilters)
      advancedFiltersRef.current = newAdvancedFilters
      newGroups = []
      setSelectedGroups(newGroups)
      selectedGroupsRef.current = newGroups
      newPageSize = config.defaultPageSize || 25
      setPageSizeState(newPageSize)
      setPageState(1)
      setHiddenColumnsState([])
    } else {
      // Apply view config
      if (viewConfig.sort && viewConfig.sort.length > 0) {
        setSortConfig(viewConfig.sort)
      } else {
        setSortConfig([])
      }

      if (viewConfig.filters) {
        newFilters = viewConfig.filters
        setFiltersState(newFilters)
      } else {
        newFilters = config.defaultFilters || {}
        setFiltersState(newFilters)
      }

      // Apply advanced filters
      if (viewConfig.advancedFilters) {
        newAdvancedFilters = viewConfig.advancedFilters
        setAdvancedFiltersState(newAdvancedFilters)
        advancedFiltersRef.current = newAdvancedFilters
      } else {
        newAdvancedFilters = { filters: [], combineMode: "and" }
        setAdvancedFiltersState(newAdvancedFilters)
        advancedFiltersRef.current = newAdvancedFilters
      }

      if (viewConfig.groupBy) {
        newGroups = viewConfig.groupBy
        setSelectedGroups(newGroups)
        selectedGroupsRef.current = newGroups
      } else {
        newGroups = []
        setSelectedGroups(newGroups)
        selectedGroupsRef.current = newGroups
      }

      newPageSize = viewConfig.pageSize || config.defaultPageSize || 25
      setPageSizeState(newPageSize)

      // Apply hidden columns
      if (viewConfig.hiddenColumns) {
        setHiddenColumnsState(viewConfig.hiddenColumns)
      } else {
        setHiddenColumnsState([])
      }

      setPageState(1) // Always reset to page 1 when applying a view
    }

    // Trigger refetch with new values using refs (to avoid dependency loop)
    if (fetchDataRef.current) {
      fetchDataRef.current(1, newPageSize, newFilters, searchQuery, undefined, newAdvancedFilters)
    }
    if (fetchServerCountsRef.current) {
      fetchServerCountsRef.current(newFilters, searchQuery)
    }
    if (fetchServerSumsRef.current) {
      fetchServerSumsRef.current(newFilters, searchQuery)
    }
  }, [config.defaultFilters, config.defaultPageSize, searchQuery])

  // Advanced filters methods
  const setAdvancedFilters = useCallback((group: FilterGroup) => {
    setAdvancedFiltersState(group)
    advancedFiltersRef.current = group // Update ref immediately
    setPageState(1)
    // Refetch with the new advanced filters
    fetchData(1, pageSize, filters, searchQuery, undefined, group)
  }, [pageSize, filters, searchQuery, fetchData])

  const clearAdvancedFilters = useCallback(() => {
    const emptyGroup: FilterGroup = { filters: [], combineMode: "and" }
    setAdvancedFiltersState(emptyGroup)
    advancedFiltersRef.current = emptyGroup // Update ref immediately
    setPageState(1)
    fetchData(1, pageSize, filters, searchQuery, undefined, emptyGroup)
  }, [pageSize, filters, searchQuery, fetchData])

  // Column visibility methods
  const setHiddenColumns = useCallback((columns: string[]) => {
    setHiddenColumnsState(columns)
  }, [])

  const toggleColumn = useCallback((key: string) => {
    setHiddenColumnsState(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key)
      }
      return [...prev, key]
    })
  }, [])

  const resetColumnVisibility = useCallback(() => {
    setHiddenColumnsState([])
  }, [])

  return {
    data,
    filteredData,
    loading,
    error,
    refetch: () => fetchData(page, pageSize, filters, searchQuery, undefined, advancedFiltersRef.current),
    filters,
    setFilter,
    setFilters,
    clearFilters,
    filterOptions,
    // Advanced filters
    advancedFilters,
    setAdvancedFilters,
    clearAdvancedFilters,
    selectedGroups,
    setSelectedGroups: handleSetSelectedGroups,
    groupConfig,
    groupCounts,
    metricsData,
    searchQuery,
    setSearchQuery,  // Now triggers server-side search with debounce
    // Sorting
    sortConfig,
    setSortConfig,
    handleSortChange,
    clearSort,
    // Pagination
    pagination,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
    // Column visibility
    hiddenColumns,
    setHiddenColumns,
    toggleColumn,
    resetColumnVisibility,
    // View config (for saved views)
    getViewConfig,
    applyViewConfig,
  }
}

// ============================================
// Helper Functions
// ============================================

function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

// ============================================
// Pre-built Configurations
// ============================================

export const TENANT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "tenants",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    person:people(id, name, photo_url)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email"],
  joinFields: ["property", "room", "person"],
  computedFields: (item) => {
    const date = item.check_in_date ? new Date(item.check_in_date as string) : new Date()
    return {
      checkin_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      checkin_year: date.getFullYear().toString(),
    }
  },
}

export const PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "payments",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name),
    bill:bills(id, bill_number),
    charge_type:charge_types(id, name)
  `,
  defaultOrderBy: "payment_date",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name", "receipt_number"],
  joinFields: ["tenant", "property", "bill", "charge_type"],
  computedFields: (item) => {
    const date = item.payment_date ? new Date(item.payment_date as string) : new Date()
    return {
      payment_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      payment_year: date.getFullYear().toString(),
    }
  },
}

export const BILL_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "bills",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name)
  `,
  defaultOrderBy: "bill_date",
  defaultOrderDirection: "desc",
  searchFields: ["bill_number", "tenant.name", "for_month"],
  joinFields: ["tenant", "property"],
  computedFields: (item) => {
    const date = item.bill_date ? new Date(item.bill_date as string) : new Date()
    return {
      bill_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      bill_year: date.getFullYear().toString(),
    }
  },
}

export const EXPENSE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "expenses",
  select: `
    *,
    property:properties(id, name),
    expense_type:expense_types(id, name, code)
  `,
  defaultOrderBy: "expense_date",
  defaultOrderDirection: "desc",
  searchFields: ["description", "vendor_name", "reference_number"],
  joinFields: ["property", "expense_type"],
  computedFields: (item) => {
    const date = item.expense_date ? new Date(item.expense_date as string) : new Date()
    return {
      expense_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      expense_year: date.getFullYear().toString(),
    }
  },
}

export const COMPLAINT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "complaints",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name),
    room:rooms(id, room_number)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "description", "tenant.name"],
  joinFields: ["tenant", "property", "room"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    return {
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
    }
  },
}

export const VISITOR_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "visitors",
  select: `
    *,
    tenant:tenants!tenant_id(id, name),
    property:properties(id, name),
    visitor_contact:visitor_contacts(id, name, visit_count, is_frequent, is_blocked, person_id, person:people(id, name, photo_url))
  `,
  defaultOrderBy: "check_in_time",
  defaultOrderDirection: "desc",
  searchFields: ["visitor_name", "visitor_phone", "company_name", "service_type", "tenant.name"],
  joinFields: ["tenant", "property", "visitor_contact"],
  computedFields: (item) => {
    const date = item.check_in_time ? new Date(item.check_in_time as string) : new Date()
    const contact = item.visitor_contact as { visit_count?: number; is_frequent?: boolean; is_blocked?: boolean } | null
    return {
      check_in_date: date.toISOString().split("T")[0],
      check_in_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      check_in_year: date.getFullYear().toString(),
      status: item.check_out_time ? "checked_out" : "checked_in",
      total_visits: contact?.visit_count || 1,
      is_frequent_visitor: contact?.is_frequent || false,
      is_blocked_visitor: contact?.is_blocked || false,
    }
  },
}

export const STAFF_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "staff_members",
  select: `
    *,
    roles:user_roles(
      id,
      role:roles(id, name, description),
      property:properties(id, name)
    ),
    person:people(id, name, photo_url)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "email", "phone"],
  joinFields: ["person"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const roles = (item.roles as { role: { name: string } | null }[] | null) || []
    const firstRole = roles[0]?.role
    return {
      status_label: item.is_active ? "Active" : "Inactive",
      primary_role: firstRole?.name || "No Role",
      account_status: item.user_id ? "Has Login" : "Pending Invite",
      joined_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      joined_year: date.getFullYear().toString(),
    }
  },
}

export const PROPERTY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "properties",
  select: `
    *,
    rooms(id),
    tenants(id)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "address", "city"],
  computedFields: (item) => ({
    room_count: Array.isArray(item.rooms) ? item.rooms.length : 0,
    tenant_count: Array.isArray(item.tenants) ? item.tenants.length : 0,
  }),
}

export const ROOM_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "rooms",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "room_number",
  defaultOrderDirection: "asc",
  searchFields: ["room_number"],
  joinFields: ["property"],
  computedFields: (item) => ({
    ac_label: item.has_ac ? "AC" : "Non-AC",
    bathroom_label: item.has_attached_bathroom ? "Attached Bath" : "Shared Bath",
    beds_label: `${item.total_beds} ${item.total_beds === 1 ? "Bed" : "Beds"}`,
    floor_label: item.floor === 0 ? "Ground Floor" : `Floor ${item.floor}`,
  }),
}

export const EXIT_CLEARANCE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "exit_clearance",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url, profile_photo),
    property:properties(id, name),
    room:rooms(id, room_number)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name"],
  joinFields: ["tenant", "property", "room"],
  computedFields: (item) => {
    const date = item.expected_exit_date ? new Date(item.expected_exit_date as string) : new Date()
    return {
      exit_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      exit_year: date.getFullYear().toString(),
      inspection_label: item.room_inspection_done ? "Inspected" : "Pending Inspection",
      key_label: item.key_returned ? "Returned" : "Not Returned",
    }
  },
}

export const NOTICE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "notices",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["title", "content"],
  joinFields: ["property"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const typeLabels: Record<string, string> = {
      general: "General",
      maintenance: "Maintenance",
      payment_reminder: "Payment Reminder",
      emergency: "Emergency",
    }
    const isExpired = item.expires_at ? new Date(item.expires_at as string) < new Date() : false
    return {
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
      active_label: item.is_active && !isExpired ? "Active" : "Inactive",
      type_label: typeLabels[item.type as string] || (item.type as string),
      is_expired: isExpired,
    }
  },
}

export const METER_READING_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "meter_readings",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    charge_type:charge_types(id, name),
    meter:meters(id, meter_number, meter_type)
  `,
  defaultOrderBy: "reading_date",
  defaultOrderDirection: "desc",
  searchFields: ["property.name", "room.room_number", "meter.meter_number"],
  joinFields: ["property", "room", "charge_type", "meter"],
  computedFields: (item) => {
    const date = item.reading_date ? new Date(item.reading_date as string) : new Date()
    const meter = item.meter as Record<string, unknown> | null
    return {
      reading_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      reading_year: date.getFullYear().toString(),
      meter_type: meter?.meter_type as string || ((item.charge_type as Record<string, unknown>)?.name as string)?.toLowerCase() || "electricity",
    }
  },
}

export const APPROVAL_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "approvals",
  select: `
    *,
    tenant:tenants(id, name, phone),
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["type", "tenant.name"],
  joinFields: ["tenant", "property"],
}

export const REFUND_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "refunds",
  select: `
    *,
    tenant:tenants(id, name, phone, photo_url),
    property:properties(id, name),
    exit_clearance:exit_clearance(id, expected_exit_date)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["tenant.name", "reference_number"],
  joinFields: ["tenant", "property", "exit_clearance"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const statusLabels: Record<string, string> = {
      pending: "Pending",
      processing: "Processing",
      completed: "Completed",
      failed: "Failed",
      cancelled: "Cancelled",
    }
    const typeLabels: Record<string, string> = {
      deposit_refund: "Deposit Refund",
      overpayment: "Overpayment",
      adjustment: "Adjustment",
      other: "Other",
    }
    return {
      refund_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      refund_year: date.getFullYear().toString(),
      status_label: statusLabels[item.status as string] || (item.status as string),
      type_label: typeLabels[item.refund_type as string] || (item.refund_type as string),
    }
  },
}

export const PEOPLE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "people",
  select: "*",
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "phone", "email", "aadhaar_number", "pan_number"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const tags = (item.tags as string[]) || []
    return {
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
      status_label: item.is_blocked ? "Blocked" : item.is_verified ? "Verified" : "Active",
      is_tenant: tags.includes("tenant"),
      is_staff: tags.includes("staff"),
      is_visitor: tags.includes("visitor"),
      primary_role: tags.includes("tenant") ? "Tenant" : tags.includes("staff") ? "Staff" : tags.includes("visitor") ? "Visitor" : "Other",
    }
  },
}

export const METER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "meters",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "meter_number",
  defaultOrderDirection: "asc",
  searchFields: ["meter_number", "property.name", "make", "model"],
  joinFields: ["property"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const statusLabels: Record<string, string> = {
      active: "Active",
      faulty: "Faulty",
      replaced: "Replaced",
      retired: "Retired",
    }
    const typeLabels: Record<string, string> = {
      electricity: "Electricity",
      water: "Water",
      gas: "Gas",
    }
    return {
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
      status_label: statusLabels[item.status as string] || (item.status as string),
      type_label: typeLabels[item.meter_type as string] || (item.meter_type as string),
    }
  },
}

export const INQUIRY_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "website_inquiries",
  select: `
    *,
    property:properties(id, name)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email", "message", "property.name"],
  joinFields: ["property"],
  computedFields: (item) => {
    const date = item.created_at ? new Date(item.created_at as string) : new Date()
    const statusLabels: Record<string, string> = {
      new: "New",
      contacted: "Contacted",
      converted: "Converted",
      closed: "Closed",
    }
    const sourceLabels: Record<string, string> = {
      website: "Website",
      whatsapp: "WhatsApp",
      phone: "Phone",
    }
    return {
      created_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      created_year: date.getFullYear().toString(),
      status_label: statusLabels[item.status as string] || (item.status as string),
      source_label: sourceLabels[item.source as string] || (item.source as string),
    }
  },
}

// ============================================
// ENHANCED EXPENSE MODULE CONFIGS
// ============================================

export const PRODUCT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "products",
  select: `
    *,
    category:product_categories(id, name, name_hi)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "name_hi", "category.name"],
  joinFields: ["category"],
  computedFields: (item) => ({
    display_name: item.name_hi ? `${item.name} (${item.name_hi})` : item.name,
    status_label: item.is_active ? "Active" : "Inactive",
  }),
}

export const DAILY_SPEND_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "daily_spend",
  select: `
    *,
    property:properties(id, name),
    product:products(id, name, name_hi)
  `,
  defaultOrderBy: "spend_date",
  defaultOrderDirection: "desc",
  searchFields: ["product_name", "vendor_name", "notes", "category_name"],
  joinFields: ["property", "product"],
  computedFields: (item) => {
    const date = item.spend_date ? new Date(item.spend_date as string) : new Date()
    return {
      spend_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      spend_year: date.getFullYear().toString(),
      display_amount: `₹${(item.total as number)?.toLocaleString("en-IN")}`,
      display_qty: `${item.quantity} ${item.unit}`,
    }
  },
}

export const VENDOR_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "vendors",
  select: `
    *,
    category:bill_categories(id, name, name_hi)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "contact_name", "phone", "email", "gstin", "upi_id"],
  joinFields: ["category"],
  computedFields: (item) => ({
    status_label: item.is_active ? "Active" : "Inactive",
    has_gst: !!item.gstin,
    has_upi: !!item.upi_id,
  }),
}

export const BILL_PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "bill_payments",
  select: `
    *,
    property:properties(id, name),
    vendor:vendors(id, name, upi_id),
    category:bill_categories(id, name, name_hi)
  `,
  defaultOrderBy: "payment_date",
  defaultOrderDirection: "desc",
  searchFields: ["vendor_name", "bill_number", "notes", "category_name"],
  joinFields: ["property", "vendor", "category"],
  computedFields: (item) => {
    const paymentDate = item.payment_date ? new Date(item.payment_date as string) : null
    const dueDate = item.due_date ? new Date(item.due_date as string) : null
    const today = new Date()
    const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null

    const statusConfig: Record<string, { label: string; labelHi: string }> = {
      pending: { label: "Pending", labelHi: "बाकी" },
      partial: { label: "Partial", labelHi: "आंशिक" },
      paid: { label: "Paid", labelHi: "भुगतान" },
      overdue: { label: "Overdue", labelHi: "विलंबित" },
    }

    return {
      payment_month: paymentDate?.toLocaleDateString("en-US", { month: "long", year: "numeric" }) || "",
      payment_year: paymentDate?.getFullYear().toString() || "",
      days_until_due: daysUntilDue,
      is_overdue: dueDate && today > dueDate && item.status !== "paid",
      status_label: statusConfig[item.status as string]?.label || item.status,
      status_label_hi: statusConfig[item.status as string]?.labelHi || item.status,
      display_amount: `₹${(item.bill_amount as number)?.toLocaleString("en-IN")}`,
      balance_due: ((item.bill_amount as number) || 0) - ((item.paid_amount as number) || 0),
    }
  },
}

export const SERVICE_PROVIDER_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "service_providers",
  select: `
    *,
    category:service_categories(id, name, name_hi, default_tds_section, default_tds_rate)
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "phone", "email", "pan", "address"],
  joinFields: ["category"],
  computedFields: (item) => ({
    status_label: item.is_active ? "Active" : "Inactive",
    rating_display: item.rating ? `${item.rating}/5` : "Not rated",
    has_tds: item.tds_applicable,
    has_pan: !!item.pan,
  }),
}

export const SERVICE_PAYMENT_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "service_payments",
  select: `
    *,
    property:properties(id, name),
    room:rooms(id, room_number),
    provider:service_providers(id, name, phone, rating),
    category:service_categories(id, name, name_hi),
    complaint:complaints(id, title)
  `,
  defaultOrderBy: "service_date",
  defaultOrderDirection: "desc",
  searchFields: ["provider_name", "description", "notes", "category_name"],
  joinFields: ["property", "room", "provider", "category", "complaint"],
  computedFields: (item) => {
    const serviceDate = item.service_date ? new Date(item.service_date as string) : null
    const warrantyExpiry = item.warranty_expiry ? new Date(item.warranty_expiry as string) : null
    const today = new Date()

    let warrantyStatus: "active" | "expired" | "none" = "none"
    if (warrantyExpiry) {
      warrantyStatus = today <= warrantyExpiry ? "active" : "expired"
    }

    return {
      service_month: serviceDate?.toLocaleDateString("en-US", { month: "long", year: "numeric" }) || "",
      service_year: serviceDate?.getFullYear().toString() || "",
      warranty_status: warrantyStatus,
      display_gross: `₹${(item.gross_amount as number)?.toLocaleString("en-IN")}`,
      display_net: `₹${(item.net_amount as number)?.toLocaleString("en-IN")}`,
      display_tds: item.tds_amount ? `₹${(item.tds_amount as number)?.toLocaleString("en-IN")}` : "-",
      linked_to_complaint: !!item.complaint_id,
    }
  },
}

export const KITCHEN_WASTAGE_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "kitchen_wastage",
  select: `
    *,
    property:properties(id, name),
    product:products(id, name, name_hi)
  `,
  defaultOrderBy: "wastage_date",
  defaultOrderDirection: "desc",
  searchFields: ["product_name", "notes"],
  joinFields: ["property", "product"],
  computedFields: (item) => {
    const date = item.wastage_date ? new Date(item.wastage_date as string) : new Date()
    const reasonLabels: Record<string, { label: string; labelHi: string }> = {
      over_prepared: { label: "Over Prepared", labelHi: "ज्यादा बनाया" },
      spoiled: { label: "Spoiled", labelHi: "खराब हो गया" },
      expired: { label: "Expired", labelHi: "समाप्त हो गया" },
      damaged: { label: "Damaged", labelHi: "टूट/फूट" },
      other: { label: "Other", labelHi: "अन्य" },
    }
    return {
      wastage_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      wastage_year: date.getFullYear().toString(),
      reason_label: reasonLabels[item.reason as string]?.label || item.reason,
      reason_label_hi: reasonLabels[item.reason as string]?.labelHi || item.reason,
      display_value: `₹${(item.estimated_value as number)?.toLocaleString("en-IN")}`,
      display_qty: `${item.quantity} ${item.unit}`,
    }
  },
}

export const MISC_TRANSACTION_LIST_CONFIG: ListPageConfig<Record<string, unknown>> = {
  table: "misc_transactions",
  select: `
    *,
    category:misc_transaction_categories(id, name, name_hi, default_type),
    property:properties(id, name),
    tenant:tenants(id, name)
  `,
  defaultOrderBy: "transaction_date",
  defaultOrderDirection: "desc",
  searchFields: ["person_name", "description", "notes", "category_name"],
  joinFields: ["category", "property", "tenant"],
  computedFields: (item) => {
    const date = item.transaction_date ? new Date(item.transaction_date as string) : new Date()
    return {
      transaction_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      transaction_year: date.getFullYear().toString(),
      type_label: item.transaction_type === "in" ? "Money In" : "Money Out",
      display_amount: `₹${(item.amount as number)?.toLocaleString("en-IN")}`,
    }
  },
}
