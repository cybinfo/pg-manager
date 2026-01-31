/**
 * Apply Advanced Filters Utility
 *
 * Converts FilterGroup to Supabase query conditions.
 * Handles complex AND/OR logic and all filter operators.
 */

import type {
  FilterGroup,
  AdvancedFilter,
  FilterCondition,
  FilterOperator,
} from "@/types/table-features.types"
import { operatorRequiresValue, operatorRequiresTwoValues } from "@/types/table-features.types"

// ============================================
// Types
// ============================================

/**
 * Supabase filter builder type (generic to avoid dependency)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseQuery = any

// ============================================
// Main Export
// ============================================

/**
 * Apply a FilterGroup to a Supabase query.
 * Handles nested AND/OR logic.
 *
 * @param query - Supabase query builder
 * @param filterGroup - The filter group to apply
 * @returns Modified query with filters applied
 *
 * @example
 * const { data } = await applyAdvancedFilters(
 *   supabase.from("tenants").select("*"),
 *   filterGroup
 * )
 */
export function applyAdvancedFilters(
  query: SupabaseQuery,
  filterGroup: FilterGroup | undefined
): SupabaseQuery {
  if (!filterGroup || filterGroup.filters.length === 0) {
    return query
  }

  // Build filter strings for .or() or chain .and()
  const filterStrings = filterGroup.filters
    .map(filter => buildFilterString(filter))
    .filter(Boolean)

  if (filterStrings.length === 0) {
    return query
  }

  if (filterGroup.combineMode === "or") {
    // OR: Use Supabase .or() with combined filter string
    return query.or(filterStrings.join(","))
  } else {
    // AND: Chain each filter (Supabase default is AND)
    // We need to apply each filter condition to the query
    return filterGroup.filters.reduce((q, filter) => {
      return applyFilter(q, filter)
    }, query)
  }
}

// ============================================
// Filter Application
// ============================================

/**
 * Apply a single AdvancedFilter to a query
 */
function applyFilter(
  query: SupabaseQuery,
  filter: AdvancedFilter
): SupabaseQuery {
  if (filter.conditions.length === 0) {
    return query
  }

  // Single condition - apply directly
  if (filter.conditions.length === 1) {
    return applyCondition(query, filter.column, filter.conditions[0])
  }

  // Multiple conditions - combine with AND or OR
  if (filter.combineMode === "or") {
    const conditionStrings = filter.conditions
      .map(cond => buildConditionString(filter.column, cond))
      .filter(Boolean)

    if (conditionStrings.length > 0) {
      return query.or(conditionStrings.join(","))
    }
    return query
  }

  // AND: chain each condition
  return filter.conditions.reduce((q, condition) => {
    return applyCondition(q, filter.column, condition)
  }, query)
}

/**
 * Apply a single condition to a query
 */
function applyCondition(
  query: SupabaseQuery,
  column: string,
  condition: FilterCondition
): SupabaseQuery {
  const { operator, value, secondValue } = condition

  // Skip if operator requires value but none provided
  if (operatorRequiresValue(operator) && (value === null || value === undefined || value === "")) {
    return query
  }

  // Skip between if second value missing
  if (operatorRequiresTwoValues(operator) && (secondValue === null || secondValue === undefined || secondValue === "")) {
    return query
  }

  switch (operator) {
    case "eq":
      return query.eq(column, value)

    case "neq":
      return query.neq(column, value)

    case "contains":
      return query.ilike(column, `%${value}%`)

    case "starts":
      return query.ilike(column, `${value}%`)

    case "ends":
      return query.ilike(column, `%${value}`)

    case "gt":
      return query.gt(column, value)

    case "gte":
      return query.gte(column, value)

    case "lt":
      return query.lt(column, value)

    case "lte":
      return query.lte(column, value)

    case "in":
      // Value should be an array or comma-separated string
      const inValues = Array.isArray(value)
        ? value
        : String(value).split(",").map(v => v.trim())
      return query.in(column, inValues)

    case "not_in":
      // NOT IN requires special handling
      const notInValues = Array.isArray(value)
        ? value
        : String(value).split(",").map(v => v.trim())
      // Supabase: .not(column, 'in', '(val1,val2)')
      return query.not(column, "in", `(${notInValues.join(",")})`)

    case "is_null":
      return query.is(column, null)

    case "is_not_null":
      return query.not(column, "is", null)

    case "between":
      return query.gte(column, value).lte(column, secondValue)

    default:
      return query
  }
}

// ============================================
// String Builders (for .or() usage)
// ============================================

/**
 * Build a filter string for a complete AdvancedFilter
 * Used when combining filters with OR
 */
function buildFilterString(filter: AdvancedFilter): string | null {
  if (filter.conditions.length === 0) {
    return null
  }

  const conditionStrings = filter.conditions
    .map(cond => buildConditionString(filter.column, cond))
    .filter(Boolean) as string[]

  if (conditionStrings.length === 0) {
    return null
  }

  if (conditionStrings.length === 1) {
    return conditionStrings[0]
  }

  // Multiple conditions - wrap in parentheses with AND/OR
  if (filter.combineMode === "or") {
    return `or(${conditionStrings.join(",")})`
  }

  return `and(${conditionStrings.join(",")})`
}

/**
 * Build a condition string for Supabase .or() syntax
 */
function buildConditionString(
  column: string,
  condition: FilterCondition
): string | null {
  const { operator, value, secondValue } = condition

  // Skip if operator requires value but none provided
  if (operatorRequiresValue(operator) && (value === null || value === undefined || value === "")) {
    return null
  }

  // Skip between if second value missing
  if (operatorRequiresTwoValues(operator) && (secondValue === null || secondValue === undefined || secondValue === "")) {
    return null
  }

  switch (operator) {
    case "eq":
      return `${column}.eq.${value}`

    case "neq":
      return `${column}.neq.${value}`

    case "contains":
      return `${column}.ilike.%${value}%`

    case "starts":
      return `${column}.ilike.${value}%`

    case "ends":
      return `${column}.ilike.%${value}`

    case "gt":
      return `${column}.gt.${value}`

    case "gte":
      return `${column}.gte.${value}`

    case "lt":
      return `${column}.lt.${value}`

    case "lte":
      return `${column}.lte.${value}`

    case "in":
      const inValues = Array.isArray(value)
        ? value
        : String(value).split(",").map(v => v.trim())
      return `${column}.in.(${inValues.join(",")})`

    case "not_in":
      const notInValues = Array.isArray(value)
        ? value
        : String(value).split(",").map(v => v.trim())
      return `${column}.not.in.(${notInValues.join(",")})`

    case "is_null":
      return `${column}.is.null`

    case "is_not_null":
      return `${column}.not.is.null`

    case "between":
      // Between needs to be expressed as AND(gte, lte)
      return `and(${column}.gte.${value},${column}.lte.${secondValue})`

    default:
      return null
  }
}

// ============================================
// Utility Exports
// ============================================

/**
 * Convert a simple filter record to a FilterGroup
 * Useful for migrating from simple filters to advanced
 */
export function simpleFiltersToGroup(
  simpleFilters: Record<string, string>,
  columnTypes?: Record<string, "text" | "number" | "date" | "select">
): FilterGroup {
  const filters: AdvancedFilter[] = Object.entries(simpleFilters)
    .filter(([_, value]) => value && value !== "all" && value !== "")
    .map(([column, value]) => ({
      id: crypto.randomUUID(),
      column,
      columnLabel: column,
      filterType: columnTypes?.[column] || "text",
      conditions: [{ operator: "eq" as FilterOperator, value }],
      combineMode: "and" as const,
    }))

  return {
    filters,
    combineMode: "and",
  }
}

/**
 * Convert a FilterGroup back to simple filters (for backward compat)
 * Only works for single-condition "eq" filters
 */
export function groupToSimpleFilters(group: FilterGroup): Record<string, string> {
  const result: Record<string, string> = {}

  for (const filter of group.filters) {
    // Only convert simple single-condition "eq" filters
    if (
      filter.conditions.length === 1 &&
      filter.conditions[0].operator === "eq" &&
      filter.conditions[0].value !== null &&
      filter.conditions[0].value !== undefined
    ) {
      result[filter.column] = String(filter.conditions[0].value)
    }
  }

  return result
}

/**
 * Check if a FilterGroup can be represented as simple filters
 */
export function isSimpleFilterGroup(group: FilterGroup): boolean {
  return (
    group.combineMode === "and" &&
    group.filters.every(
      filter =>
        filter.conditions.length === 1 &&
        filter.conditions[0].operator === "eq" &&
        filter.combineMode === "and"
    )
  )
}
