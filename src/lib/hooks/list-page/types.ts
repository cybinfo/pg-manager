/**
 * List Page Types
 *
 * All shared types/interfaces for the useListPage hook system.
 * Extracted from useListPage.ts for modularity.
 */

import type { FilterGroup } from "@/types/table-features.types"

// ============================================
// Configuration Types
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
  // Fixed server-side filters that are always applied and cannot be cleared by the user.
  // Use for sub-list pages that must be scoped to a parent entity (e.g. tenant_id, property_id).
  fixedFilters?: ServerFilter[]
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

// ============================================
// Server Filter Types
// ============================================

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

// ============================================
// Metric Types
// ============================================

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

// ============================================
// Pagination Types
// ============================================

export interface PaginationState {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPrevPage: boolean
}

// ============================================
// Sort Types
// ============================================

// Sort configuration - supports multi-column sorting
export interface SortConfig {
  key: string
  direction: "asc" | "desc"
}

// ============================================
// View Config Types
// ============================================

// View config type for saved views
export interface TableViewConfig {
  sort?: SortConfig[]  // Array for multi-column sorting
  filters?: Record<string, string>
  advancedFilters?: FilterGroup // Advanced filters
  groupBy?: string[]
  pageSize?: number
  hiddenColumns?: string[]
}

// ============================================
// Hook Options & Return Types
// ============================================

export interface UseListPageOptions<T> {
  config: ListPageConfig<T>
  filters?: FilterConfig[]
  groupByOptions?: GroupByOption[]
  metrics?: MetricConfig<T>[]
  initialFilters?: Record<string, string>
  initialGroups?: string[]
  initialPageSize?: number
  initialViewConfig?: TableViewConfig // Apply a saved view configuration
  defaultHiddenColumns?: string[] // Columns hidden by default (derived from column.defaultVisible === false)
  enabled?: boolean
  tableKey?: string // Used for persisting column visibility to localStorage
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
  advancedFilters: FilterGroup
  setAdvancedFilters: (group: FilterGroup) => void
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
