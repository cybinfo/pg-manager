/**
 * Advanced Filter Column Builder Functions
 *
 * Factory functions for creating FilterableColumn definitions.
 * Eliminates repetitive inline filter column definitions across dashboard pages.
 */

import type { FilterableColumn } from "@/lib/hooks/useFilterBuilder"

export const textFilterColumn = (key: string, header: string, operators?: ("contains" | "eq" | "neq" | "starts" | "ends" | "is_null" | "is_not_null")[]): FilterableColumn => ({
  key, header, filterType: "text" as const,
  filterOperators: operators || ["contains", "eq", "starts"],
})

export const statusFilterColumn = (
  statusOptions: { value: string; label: string }[],
  key = "status", header = "Status"
): FilterableColumn => ({
  key, header, filterType: "select" as const,
  filterOperators: ["eq", "neq", "in", "not_in"],
  filterOptions: statusOptions,
})

export const selectFilterColumn = (
  key: string, header: string,
  options: { value: string; label: string }[],
  operators?: ("eq" | "neq" | "in" | "not_in" | "is_null" | "is_not_null")[]
): FilterableColumn => ({
  key, header, filterType: "select" as const,
  filterOperators: operators || ["eq", "neq", "in"],
  filterOptions: options,
})

export const dateFilterColumn = (key: string, header: string, extraOps?: ("is_null" | "is_not_null")[]): FilterableColumn => ({
  key, header, filterType: "date" as const,
  filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between", ...(extraOps || [])],
})

export const numberFilterColumn = (key: string, header: string): FilterableColumn => ({
  key, header, filterType: "number" as const,
  filterOperators: ["eq", "neq", "gt", "gte", "lt", "lte", "between"],
})

export const booleanFilterColumn = (key: string, header: string, labels?: { trueLabel?: string; falseLabel?: string }): FilterableColumn => ({
  key, header, filterType: "select" as const,
  filterOperators: ["eq"],
  filterOptions: [
    { value: "true", label: labels?.trueLabel || "Yes" },
    { value: "false", label: labels?.falseLabel || "No" },
  ],
})
