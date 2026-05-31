/**
 * List Page Utilities
 *
 * Shared helper functions used across list page sub-hooks.
 * Extracted from useListPage.ts for modularity.
 */

import type { ServerFilter, FilterConfig, ListPageConfig } from "./types"


/**
 * Represents a Supabase/PostgREST query builder with chainable filter methods.
 */
interface PostgrestQueryChain {
  eq: (column: string, value: unknown) => PostgrestQueryChain
  neq: (column: string, value: unknown) => PostgrestQueryChain
  in: (column: string, values: unknown[]) => PostgrestQueryChain
  not: (column: string, operator: string, value: unknown) => PostgrestQueryChain
  contains: (column: string, value: unknown[]) => PostgrestQueryChain
  gt: (column: string, value: unknown) => PostgrestQueryChain
  gte: (column: string, value: unknown) => PostgrestQueryChain
  lt: (column: string, value: unknown) => PostgrestQueryChain
  lte: (column: string, value: unknown) => PostgrestQueryChain
  is: (column: string, value: null) => PostgrestQueryChain
  or: (conditions: string) => PostgrestQueryChain
  order: (column: string, options?: { ascending?: boolean }) => PostgrestQueryChain
  limit: (count: number) => PostgrestQueryChain
  range: (from: number, to: number) => PostgrestQueryChain
  select: (columns?: string) => PostgrestQueryChain
}

// ============================================
// Nested Value Access
// ============================================

/**
 * Get a nested value from an object using dot notation.
 * e.g., getNestedValue(obj, "property.name") returns obj.property.name
 */
export function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = obj

  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = (current as Record<string, unknown>)[part]
  }

  return current
}

// ============================================
// Server Filter Application
// ============================================

/**
 * Apply a server filter to a Supabase query builder.
 * Centralizes operator handling for consistent filter application.
 */
export function applyServerFilter(query: PostgrestQueryChain, filter: ServerFilter): PostgrestQueryChain {
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

// ============================================
// Base Query Filter Application
// ============================================

/**
 * Apply standard user filters to a Supabase query builder.
 * This is the shared filter logic used by fetchData, fetchServerCounts,
 * fetchServerSums, and fetchGroupCounts.
 */
export function applyBaseFiltersToQuery<T>(
    query: PostgrestQueryChain,
  config: ListPageConfig<T>,
  filterConfigs: FilterConfig[],
  currentFilters: Record<string, string>,
  currentSearchQuery: string
): PostgrestQueryChain {
  // Apply fixed server-side filters (always applied, cannot be cleared by the user)
  if (config.fixedFilters && config.fixedFilters.length > 0) {
    for (const filter of config.fixedFilters) {
      query = applyServerFilter(query, filter)
    }
  }

  // Filter out soft-deleted records by default
  if (!config.includeSoftDeleted) {
    query = query.is("deleted_at", null)
  }

  // Apply server-side filters
  for (const [filterId, filterValue] of Object.entries(currentFilters)) {
    if (!filterValue || filterValue === "all") continue

    const filterConfig = filterConfigs.find((f) => f.id === filterId)
    if (!filterConfig) continue

    // Handle different filter types
    if (filterConfig.type === "select") {
      // Handle FK relationships (property -> entity_id)
      if (filterId === "property") {
        query = query.eq("entity_id", filterValue)
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
      else if (filterId === "status" && config.table === "people") {
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
    const dateField = filterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
    query = query.gte(dateField, currentFilters.date_from)
  }
  if (currentFilters.date_to) {
    const dateField = filterConfigs.find((f) => f.type === "date-range")?.id || "created_at"
    query = query.lte(dateField, currentFilters.date_to)
  }

  // Apply server-side search using ilike for text fields
  if (currentSearchQuery && config.searchFields.length > 0) {
    const searchConditions = config.searchFields
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

  return query
}
