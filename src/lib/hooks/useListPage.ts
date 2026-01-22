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

export interface MetricConfig<T> {
  id: string
  label: string
  icon?: React.ComponentType<{ className?: string }>
  // compute receives: items (current page), total (server total), serverCounts (keyed by metric id)
  compute: (items: T[], total: number, serverCounts?: Record<string, number>) => number | string
  format?: "number" | "currency" | "percentage"
  highlight?: (value: number | string, items: T[]) => boolean
  // Optional: specify a server-side filter to get accurate count across all pages
  // This runs a separate count query with this filter condition
  serverFilter?: {
    column: string
    operator: "eq" | "contains" | "gt" | "gte" | "lt" | "lte"
    value: unknown
  }
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

  // Grouping
  selectedGroups: string[]
  setSelectedGroups: (groups: string[]) => void
  groupConfig: { key: string; label: string | undefined }[]

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

  // State
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<Record<string, string>>(computedInitialFilters)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(computedInitialGroups)
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  const [searchQuery, setSearchQueryState] = useState("")
  const [sortConfig, setSortConfig] = useState<SortConfig[]>(computedInitialSort)

  // Debounce timer for search
  const searchTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Pagination state
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)

  // Server-side metric counts (for accurate counts across all pages)
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({})

  // Track if server counts are loading
  const [serverCountsLoading, setServerCountsLoading] = useState(false)

  // Use refs to store stable references - prevents infinite loops
  const configRef = useRef(config)
  const metricsRef = useRef(metrics)
  const filterConfigsRef = useRef(filterConfigs)
  const initialFetchDone = useRef(false)

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    configRef.current = config
    filterConfigsRef.current = filterConfigs
    metricsRef.current = metrics
  }, [config, filterConfigs, metrics])

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

  // Fetch main data - uses ref to avoid dependency issues
  // Now applies server-side filters for proper pagination
  const fetchData = useCallback(async (
    fetchPage?: number,
    fetchPageSize?: number,
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    if (!enabled) return

    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentPage = fetchPage ?? page
    const currentPageSize = fetchPageSize ?? pageSize
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from(currentConfig.table)
        .select(currentConfig.select, { count: "exact" })
        .order(currentConfig.defaultOrderBy, { ascending: currentConfig.defaultOrderDirection === "asc" })

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

      // Apply server-side pagination if enabled
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
  }, [enabled, enableServerPagination, page, pageSize, filters, searchQuery]) // Dependencies for pagination and filtering

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

        // Apply the metric's specific serverFilter
        const { column, operator, value } = metric.serverFilter
        if (operator === "eq") {
          query = query.eq(column, value)
        } else if (operator === "contains") {
          query = query.contains(column, value as unknown[])
        } else if (operator === "gt") {
          query = query.gt(column, value as number)
        } else if (operator === "gte") {
          query = query.gte(column, value as number)
        } else if (operator === "lt") {
          query = query.lt(column, value as number)
        } else if (operator === "lte") {
          query = query.lte(column, value as number)
        }

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

  // Initial fetch - only run once
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true

    fetchData()
    fetchFilterOptions()
    fetchServerCounts()
  }, [fetchData, fetchFilterOptions, fetchServerCounts])

  // Filter setters - now trigger server-side refetch
  const setFilter = useCallback((id: string, value: string) => {
    const newFilters = { ...filters, [id]: value }
    setFiltersState(newFilters)
    setPageState(1)
    // Refetch with new filters
    fetchData(1, pageSize, newFilters, searchQuery)
    fetchServerCounts(newFilters, searchQuery)
  }, [filters, pageSize, searchQuery, fetchData, fetchServerCounts])

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters)
    setPageState(1)
    // Refetch with new filters
    fetchData(1, pageSize, newFilters, searchQuery)
    fetchServerCounts(newFilters, searchQuery)
  }, [pageSize, searchQuery, fetchData, fetchServerCounts])

  const clearFilters = useCallback(() => {
    const defaultFilters = configRef.current.defaultFilters || {}
    setFiltersState(defaultFilters)
    setPageState(1)
    // Refetch with cleared filters
    fetchData(1, pageSize, defaultFilters, searchQuery)
    fetchServerCounts(defaultFilters, searchQuery)
  }, [pageSize, searchQuery, fetchData, fetchServerCounts])

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
      fetchData(1, pageSize, filters, query)
      fetchServerCounts(filters, query)
    }, 300) // 300ms debounce
  }, [pageSize, filters, fetchData, fetchServerCounts])

  // Sort setters - now receives array from DataTable for multi-column sorting
  const handleSortChange = useCallback((configs: SortConfig[]) => {
    setSortConfig(configs)
  }, [])

  const clearSort = useCallback(() => {
    setSortConfig([])
  }, [])

  // Pagination setters - pass current filters and search
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
    fetchData(newPage, pageSize, filters, searchQuery)
  }, [fetchData, pageSize, filters, searchQuery])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPageState(1) // Reset to page 1 when page size changes
    fetchData(1, newSize, filters, searchQuery)
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
        result = result.filter((item) =>
          nestedSearchFields.some((field) => {
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

  // Compute metrics - pass pagination.total and serverCounts for accurate counts
  const metricsData = useMemo(() => {
    return metrics.map((metric) => {
      // If metric has serverFilter and we have a server count for it, use that
      // Otherwise fall back to the compute function
      let value: number | string

      if (metric.serverFilter && serverCounts[metric.id] !== undefined) {
        // Use server count for metrics with serverFilter
        value = serverCounts[metric.id]
      } else {
        // Fall back to compute function (which may still use total for "total" metric)
        value = metric.compute(data, total, serverCounts)
      }

      return {
        id: metric.id,
        label: metric.label,
        value,
        icon: metric.icon,
        highlight: metric.highlight ? metric.highlight(value, data) : false,
      }
    })
  }, [data, total, metrics, serverCounts])

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

    if (selectedGroups.length > 0) {
      viewConfig.groupBy = selectedGroups
    }

    if (pageSize !== (config.defaultPageSize || 25)) {
      viewConfig.pageSize = pageSize
    }

    return viewConfig
  }, [sortConfig, filters, selectedGroups, pageSize, config.defaultPageSize])

  // Apply a view configuration (or reset to default if null)
  const applyViewConfig = useCallback((viewConfig: TableViewConfig | null) => {
    if (viewConfig === null) {
      // Reset to defaults
      setSortConfig([])
      setFiltersState(config.defaultFilters || {})
      setSelectedGroups([])
      setPageSizeState(config.defaultPageSize || 25)
      setPageState(1)
    } else {
      // Apply view config
      if (viewConfig.sort && viewConfig.sort.length > 0) {
        setSortConfig(viewConfig.sort)
      } else {
        setSortConfig([])
      }

      if (viewConfig.filters) {
        setFiltersState(viewConfig.filters)
      } else {
        setFiltersState(config.defaultFilters || {})
      }

      if (viewConfig.groupBy) {
        setSelectedGroups(viewConfig.groupBy)
      } else {
        setSelectedGroups([])
      }

      if (viewConfig.pageSize) {
        setPageSizeState(viewConfig.pageSize)
      }

      setPageState(1) // Always reset to page 1 when applying a view
    }
  }, [config.defaultFilters, config.defaultPageSize])

  return {
    data,
    filteredData,
    loading,
    error,
    refetch: () => fetchData(page, pageSize, filters, searchQuery),
    filters,
    setFilter,
    setFilters,
    clearFilters,
    filterOptions,
    selectedGroups,
    setSelectedGroups,
    groupConfig,
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
    room:rooms(id, room_number)
  `,
  defaultOrderBy: "created_at",
  defaultOrderDirection: "desc",
  searchFields: ["name", "phone", "email"],
  joinFields: ["property", "room"],
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
    visitor_contact:visitor_contacts(id, name, visit_count, is_frequent, is_blocked)
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
    )
  `,
  defaultOrderBy: "name",
  defaultOrderDirection: "asc",
  searchFields: ["name", "email", "phone"],
  joinFields: [],
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
