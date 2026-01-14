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
  compute: (items: T[]) => number | string
  format?: "number" | "currency" | "percentage"
  highlight?: (value: number | string, items: T[]) => boolean
}

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

export interface UseListPageOptions<T> {
  config: ListPageConfig<T>
  filters?: FilterConfig[]
  groupByOptions?: GroupByOption[]
  metrics?: MetricConfig<T>[]
  initialFilters?: Record<string, string>
  initialGroups?: string[]
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

  // Pagination
  pagination: PaginationState
  setPage: (page: number) => void
  setPageSize: (size: number) => void
  nextPage: () => void
  prevPage: () => void
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
    enabled = true,
  } = options

  // Pagination defaults
  const defaultPageSize = config.defaultPageSize || 25
  const enableServerPagination = config.enableServerPagination !== false

  // State
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [filters, setFiltersState] = useState<Record<string, string>>(initialFilters)
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialGroups)
  const [filterOptions, setFilterOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  const [searchQuery, setSearchQuery] = useState("")

  // Pagination state
  const [page, setPageState] = useState(1)
  const [pageSize, setPageSizeState] = useState(defaultPageSize)
  const [total, setTotal] = useState(0)

  // Use refs to store stable references - prevents infinite loops
  const configRef = useRef(config)
  const filterConfigsRef = useRef(filterConfigs)
  const initialFetchDone = useRef(false)

  // Update refs when props change (but don't trigger re-renders)
  useEffect(() => {
    configRef.current = config
    filterConfigsRef.current = filterConfigs
  }, [config, filterConfigs])

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
  const fetchData = useCallback(async (fetchPage?: number, fetchPageSize?: number) => {
    if (!enabled) return

    const currentConfig = configRef.current
    const currentPage = fetchPage ?? page
    const currentPageSize = fetchPageSize ?? pageSize
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build query
      let query = supabase
        .from(currentConfig.table)
        .select(currentConfig.select, { count: "exact" })
        .order(currentConfig.defaultOrderBy, { ascending: currentConfig.defaultOrderDirection === "asc" })

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

      // Update total count
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
  }, [enabled, enableServerPagination, page, pageSize]) // Dependencies for pagination

  // Initial fetch - only run once
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true

    fetchData()
    fetchFilterOptions()
  }, [fetchData, fetchFilterOptions])

  // Filter setters
  const setFilter = useCallback((id: string, value: string) => {
    setFiltersState((prev) => ({ ...prev, [id]: value }))
    // Reset to page 1 when filter changes
    setPageState(1)
  }, [])

  const setFilters = useCallback((newFilters: Record<string, string>) => {
    setFiltersState(newFilters)
    // Reset to page 1 when filters change
    setPageState(1)
  }, [])

  const clearFilters = useCallback(() => {
    setFiltersState(configRef.current.defaultFilters || {})
    setPageState(1)
  }, []) // Uses ref

  // Pagination setters
  const setPage = useCallback((newPage: number) => {
    setPageState(newPage)
    fetchData(newPage, pageSize)
  }, [fetchData, pageSize])

  const setPageSize = useCallback((newSize: number) => {
    setPageSizeState(newSize)
    setPageState(1) // Reset to page 1 when page size changes
    fetchData(1, newSize)
  }, [fetchData])

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

  // Filter data - uses refs for stable config references
  const filteredData = useMemo(() => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    let result = [...data]

    // Apply filters
    for (const [filterId, filterValue] of Object.entries(filters)) {
      if (!filterValue || filterValue === "all") continue

      const filterConfig = currentFilterConfigs.find((f) => f.id === filterId)
      if (!filterConfig) continue

      switch (filterConfig.type) {
        case "select":
          result = result.filter((item) => {
            // Handle nested properties like "property.id"
            const value = getNestedValue(item as unknown as Record<string, unknown>, filterId)
            return value === filterValue
          })
          break

        case "date":
          result = result.filter((item) => {
            const value = getNestedValue(item as unknown as Record<string, unknown>, filterId)
            if (!value) return false
            return new Date(value as string).toDateString() === new Date(filterValue).toDateString()
          })
          break

        case "date-range":
          // Handled by date_from and date_to filters
          break

        case "text":
          result = result.filter((item) => {
            const value = getNestedValue(item as unknown as Record<string, unknown>, filterId)
            return String(value).toLowerCase().includes(filterValue.toLowerCase())
          })
          break
      }
    }

    // Handle date range filters
    if (filters.date_from) {
      const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
      result = result.filter((item) => {
        const value = getNestedValue(item as unknown as Record<string, unknown>, dateField)
        if (!value) return false
        return new Date(value as string) >= new Date(filters.date_from)
      })
    }

    if (filters.date_to) {
      const dateField = currentFilterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
      result = result.filter((item) => {
        const value = getNestedValue(item as unknown as Record<string, unknown>, dateField)
        if (!value) return false
        return new Date(value as string) <= new Date(filters.date_to)
      })
    }

    // Apply search
    if (searchQuery && currentConfig.searchFields.length > 0) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) =>
        currentConfig.searchFields.some((field) => {
          const value = getNestedValue(item as unknown as Record<string, unknown>, field as string)
          return value && String(value).toLowerCase().includes(query)
        })
      )
    }

    return result
  }, [data, filters, searchQuery]) // Removed unstable dependencies, uses refs

  // Group config for DataTable
  const groupConfig = useMemo(() => {
    return selectedGroups.map((key) => ({
      key,
      label: groupByOptions.find((o) => o.value === key)?.label,
    }))
  }, [selectedGroups, groupByOptions])

  // Compute metrics
  const metricsData = useMemo(() => {
    return metrics.map((metric) => {
      const value = metric.compute(data) // Use all data, not filtered
      return {
        id: metric.id,
        label: metric.label,
        value,
        icon: metric.icon,
        highlight: metric.highlight ? metric.highlight(value, data) : false,
      }
    })
  }, [data, metrics])

  return {
    data,
    filteredData,
    loading,
    error,
    refetch: () => fetchData(),
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
    setSearchQuery,
    // Pagination
    pagination,
    setPage,
    setPageSize,
    nextPage,
    prevPage,
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
    tenant:tenants(id, name),
    property:properties(id, name)
  `,
  defaultOrderBy: "check_in_time",
  defaultOrderDirection: "desc",
  searchFields: ["visitor_name", "visitor_phone", "company_name", "service_type", "tenant.name"],
  joinFields: ["tenant", "property"],
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
    charge_type:charge_types(id, name)
  `,
  defaultOrderBy: "reading_date",
  defaultOrderDirection: "desc",
  searchFields: ["property.name", "room.room_number"],
  joinFields: ["property", "room", "charge_type"],
  computedFields: (item) => {
    const date = item.reading_date ? new Date(item.reading_date as string) : new Date()
    return {
      reading_month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      reading_year: date.getFullYear().toString(),
      meter_type: ((item.charge_type as Record<string, unknown>)?.name as string)?.toLowerCase() || "electricity",
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
