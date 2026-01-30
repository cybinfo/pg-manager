/**
 * useGroupedByMonth Hook
 *
 * Groups items by month/year for display in tenant portal.
 * Eliminates duplicate grouping logic in bills and payments pages.
 *
 * @example
 * const { groupedItems, months, getMonthLabel } = useGroupedByMonth(
 *   bills,
 *   "bill_date"
 * )
 *
 * {months.map(monthKey => (
 *   <div key={monthKey}>
 *     <h3>{getMonthLabel(monthKey)}</h3>
 *     {groupedItems[monthKey].map(bill => ...)}
 *   </div>
 * ))}
 */

"use client"

import { useMemo } from "react"

// ============================================================================
// TYPES
// ============================================================================

interface GroupedResult<T> {
  /** Items grouped by month key (e.g., "2025-06") */
  groupedItems: Record<string, T[]>
  /** Sorted month keys (newest first) */
  months: string[]
  /** Get display label for a month key */
  getMonthLabel: (monthKey: string) => string
  /** Total count of all items */
  totalCount: number
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Groups items by month/year based on a date field
 *
 * @param items - Array of items to group
 * @param dateField - Name of the date field to group by
 * @param sortOrder - Sort order for months (default: "desc" = newest first)
 */
export function useGroupedByMonth<T extends Record<string, unknown>>(
  items: T[],
  dateField: keyof T,
  sortOrder: "asc" | "desc" = "desc"
): GroupedResult<T> {
  return useMemo(() => {
    const grouped: Record<string, T[]> = {}

    // Group items by month
    items.forEach((item) => {
      const dateValue = item[dateField]
      if (!dateValue) return

      const date = new Date(dateValue as string)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!grouped[monthKey]) {
        grouped[monthKey] = []
      }
      grouped[monthKey].push(item)
    })

    // Sort months
    const months = Object.keys(grouped).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
    })

    // Get display label for a month key
    const getMonthLabel = (monthKey: string): string => {
      const [year, month] = monthKey.split("-")
      const date = new Date(Number(year), Number(month) - 1)
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    return {
      groupedItems: grouped,
      months,
      getMonthLabel,
      totalCount: items.length,
    }
  }, [items, dateField, sortOrder])
}

// ============================================================================
// ALTERNATIVE: HOOK WITH COMPUTED TOTALS
// ============================================================================

interface GroupedWithTotals<T> extends GroupedResult<T> {
  /** Sum of a numeric field per month */
  monthTotals: Record<string, number>
  /** Grand total across all months */
  grandTotal: number
}

/**
 * Groups items by month with sum calculations
 *
 * @param items - Array of items to group
 * @param dateField - Name of the date field to group by
 * @param sumField - Name of the numeric field to sum
 * @param sortOrder - Sort order for months
 *
 * @example
 * const { groupedItems, months, monthTotals, grandTotal } = useGroupedByMonthWithTotals(
 *   payments,
 *   "payment_date",
 *   "amount"
 * )
 */
export function useGroupedByMonthWithTotals<T extends Record<string, unknown>>(
  items: T[],
  dateField: keyof T,
  sumField: keyof T,
  sortOrder: "asc" | "desc" = "desc"
): GroupedWithTotals<T> {
  return useMemo(() => {
    const grouped: Record<string, T[]> = {}
    const totals: Record<string, number> = {}
    let grandTotal = 0

    // Group items and calculate totals
    items.forEach((item) => {
      const dateValue = item[dateField]
      if (!dateValue) return

      const date = new Date(dateValue as string)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (!grouped[monthKey]) {
        grouped[monthKey] = []
        totals[monthKey] = 0
      }

      grouped[monthKey].push(item)

      const value = item[sumField]
      const numValue = typeof value === "number" ? value : 0
      totals[monthKey] += numValue
      grandTotal += numValue
    })

    // Sort months
    const months = Object.keys(grouped).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
    })

    // Get display label
    const getMonthLabel = (monthKey: string): string => {
      const [year, month] = monthKey.split("-")
      const date = new Date(Number(year), Number(month) - 1)
      return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
    }

    return {
      groupedItems: grouped,
      months,
      getMonthLabel,
      totalCount: items.length,
      monthTotals: totals,
      grandTotal,
    }
  }, [items, dateField, sumField, sortOrder])
}

// ============================================================================
// UTILITY: GROUP BY YEAR
// ============================================================================

/**
 * Groups items by year (simpler grouping)
 *
 * @example
 * const { groupedItems, years } = useGroupedByYear(bills, "bill_date")
 */
export function useGroupedByYear<T extends Record<string, unknown>>(
  items: T[],
  dateField: keyof T,
  sortOrder: "asc" | "desc" = "desc"
): {
  groupedItems: Record<string, T[]>
  years: string[]
  totalCount: number
} {
  return useMemo(() => {
    const grouped: Record<string, T[]> = {}

    items.forEach((item) => {
      const dateValue = item[dateField]
      if (!dateValue) return

      const date = new Date(dateValue as string)
      const yearKey = date.getFullYear().toString()

      if (!grouped[yearKey]) {
        grouped[yearKey] = []
      }
      grouped[yearKey].push(item)
    })

    const years = Object.keys(grouped).sort((a, b) => {
      return sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
    })

    return {
      groupedItems: grouped,
      years,
      totalCount: items.length,
    }
  }, [items, dateField, sortOrder])
}
