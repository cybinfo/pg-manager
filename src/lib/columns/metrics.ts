/**
 * Metric Factory Functions
 *
 * Centralized metric factories to reduce duplication across list pages.
 * Each factory creates a MetricConfig<T> with common patterns.
 *
 * @example
 * import {
 *   createTotalMetric,
 *   createCountMetric,
 *   createSumMetric,
 *   createFilteredSumMetric,
 * } from "@/lib/columns/metrics"
 *
 * const metrics: MetricConfig<Bill>[] = [
 *   createTotalMetric("total", "Total Bills", FileText),
 *   createCountMetric("paid", "Paid", CheckCircle, "status", "paid"),
 *   createSumMetric("collected", "Collected", Wallet, "paid_amount"),
 *   createFilteredSumMetric("overdue", "Overdue", AlertCircle, "balance_due", {
 *     column: "status",
 *     operator: "eq",
 *     value: "overdue",
 *   }),
 * ]
 */

import type { MetricConfig, ServerFilter, ServerFilterOperator } from "@/lib/hooks/useListPage"
import { formatCurrency } from "@/lib/format"

// ============================================================================
// TYPES
// ============================================================================

type IconComponent = React.ComponentType<{ className?: string }>

// ============================================================================
// TOTAL COUNT METRIC
// ============================================================================

/**
 * Creates a metric that shows the total count of items.
 * Uses server total for accurate count across all pages.
 *
 * @example
 * createTotalMetric("total", "Total", Users)
 * // Result: { id: "total", label: "Total", icon: Users, compute: (_, total) => total }
 */
export function createTotalMetric<T>(
  id: string,
  label: string,
  icon?: IconComponent
): MetricConfig<T> {
  return {
    id,
    label,
    icon,
    compute: (_items, total) => total,
  }
}

// ============================================================================
// COUNT METRIC (with filter)
// ============================================================================

interface CountMetricOptions {
  /** Highlight condition */
  highlight?: (value: number) => boolean
  /** Alternative format for display */
  format?: "number" | "currency" | "percentage"
}

/**
 * Creates a metric that counts items matching a filter condition.
 * Uses server filter for accurate count across all pages.
 *
 * @example
 * // Count active tenants
 * createCountMetric("active", "Active", UserCheck, "status", "active")
 *
 * // Count with highlight when > 0
 * createCountMetric("overdue", "Overdue", AlertCircle, "status", "overdue", {
 *   highlight: (value) => value > 0
 * })
 */
export function createCountMetric<T>(
  id: string,
  label: string,
  icon: IconComponent | undefined,
  column: string,
  value: unknown,
  options: CountMetricOptions = {}
): MetricConfig<T> {
  const { highlight, format } = options

  return {
    id,
    label,
    icon,
    format,
    compute: (items) => {
      return (items as Record<string, unknown>[]).filter(
        (item) => item[column] === value
      ).length
    },
    highlight: highlight ? (v) => highlight(v as number) : undefined,
    serverFilter: {
      column,
      operator: "eq" as ServerFilterOperator,
      value,
    },
  }
}

/**
 * Creates a metric that counts items matching an "in" filter condition.
 * Uses server filter for accurate count across all pages.
 *
 * @example
 * // Count pending and partial bills
 * createCountInMetric("unpaid", "Unpaid", Clock, "status", ["pending", "partial"])
 */
export function createCountInMetric<T>(
  id: string,
  label: string,
  icon: IconComponent | undefined,
  column: string,
  values: unknown[],
  options: CountMetricOptions = {}
): MetricConfig<T> {
  const { highlight, format } = options

  return {
    id,
    label,
    icon,
    format,
    compute: (items) => {
      return (items as Record<string, unknown>[]).filter((item) =>
        values.includes(item[column])
      ).length
    },
    highlight: highlight ? (v) => highlight(v as number) : undefined,
    serverFilter: {
      column,
      operator: "in" as ServerFilterOperator,
      value: values,
    },
  }
}

// ============================================================================
// SUM METRIC
// ============================================================================

interface SumMetricOptions {
  /** Highlight condition */
  highlight?: (value: string) => boolean
  /** Whether to format as currency (default: true) */
  formatAsCurrency?: boolean
}

/**
 * Creates a metric that sums a numeric column.
 * Uses server sum for accurate total across all pages.
 *
 * @example
 * // Sum all payments
 * createSumMetric("total", "Total", Wallet, "amount")
 *
 * // Sum with highlight when not zero
 * createSumMetric("collected", "Collected", CheckCircle, "paid_amount", {
 *   highlight: (value) => value !== "₹0"
 * })
 */
export function createSumMetric<T>(
  id: string,
  label: string,
  icon: IconComponent | undefined,
  sumColumn: keyof T | string,
  options: SumMetricOptions = {}
): MetricConfig<T> {
  const { highlight, formatAsCurrency = true } = options

  return {
    id,
    label,
    icon,
    compute: (items, _total, serverData) => {
      // Use server sum if available
      if (serverData?.[id] !== undefined) {
        return formatAsCurrency
          ? formatCurrency(serverData[id])
          : serverData[id]
      }
      // Fall back to page data
      const sum = (items as Record<string, unknown>[]).reduce(
        (acc, item) => acc + Number(item[sumColumn as string] || 0),
        0
      )
      return formatAsCurrency ? formatCurrency(sum) : sum
    },
    highlight: highlight ? (v) => highlight(v as string) : undefined,
    serverSum: {
      column: sumColumn as string,
    },
  }
}

// ============================================================================
// FILTERED SUM METRIC
// ============================================================================

interface FilteredSumMetricOptions extends SumMetricOptions {
  /** Local filter function (for page data fallback) */
  localFilter?: (item: unknown) => boolean
}

/**
 * Creates a metric that sums a numeric column with a filter.
 * Uses server sum with filter for accurate total across all pages.
 *
 * @example
 * // Sum balance_due for overdue bills
 * createFilteredSumMetric("overdue", "Overdue", AlertCircle, "balance_due", {
 *   column: "status",
 *   operator: "eq",
 *   value: "overdue"
 * })
 *
 * // Sum with multiple status values
 * createFilteredSumMetric("pending", "Pending", Clock, "balance_due", {
 *   column: "status",
 *   operator: "in",
 *   value: ["pending", "partial"]
 * }, {
 *   localFilter: (item) => ["pending", "partial"].includes((item as any).status)
 * })
 */
export function createFilteredSumMetric<T>(
  id: string,
  label: string,
  icon: IconComponent | undefined,
  sumColumn: keyof T | string,
  filter: ServerFilter,
  options: FilteredSumMetricOptions = {}
): MetricConfig<T> {
  const { highlight, formatAsCurrency = true, localFilter } = options

  // Create default local filter based on server filter
  const defaultLocalFilter = (item: unknown): boolean => {
    const record = item as Record<string, unknown>
    const columnValue = record[filter.column]

    switch (filter.operator) {
      case "eq":
        return columnValue === filter.value
      case "neq":
        return columnValue !== filter.value
      case "in":
        return (filter.value as unknown[]).includes(columnValue)
      case "not_in":
        return !(filter.value as unknown[]).includes(columnValue)
      case "gt":
        return Number(columnValue) > Number(filter.value)
      case "gte":
        return Number(columnValue) >= Number(filter.value)
      case "lt":
        return Number(columnValue) < Number(filter.value)
      case "lte":
        return Number(columnValue) <= Number(filter.value)
      case "is_null":
        return columnValue === null || columnValue === undefined
      case "is_not_null":
        return columnValue !== null && columnValue !== undefined
      default:
        return true
    }
  }

  const filterFn = localFilter || defaultLocalFilter

  return {
    id,
    label,
    icon,
    compute: (items, _total, serverData) => {
      // Use server sum if available
      if (serverData?.[id] !== undefined) {
        return formatAsCurrency
          ? formatCurrency(serverData[id])
          : serverData[id]
      }
      // Fall back to page data with local filter
      const filteredItems = items.filter(filterFn)
      const sum = (filteredItems as Record<string, unknown>[]).reduce(
        (acc, item) => acc + Number(item[sumColumn as string] || 0),
        0
      )
      return formatAsCurrency ? formatCurrency(sum) : sum
    },
    highlight: highlight ? (v) => highlight(v as string) : undefined,
    serverSum: {
      column: sumColumn as string,
      filter,
    },
  }
}

// ============================================================================
// CUSTOM COMPUTE METRIC
// ============================================================================

interface CustomMetricOptions<T> {
  /** Highlight condition */
  highlight?: (value: number | string, items: T[]) => boolean
  /** Format type */
  format?: "number" | "currency" | "percentage"
  /** Server filter for count-based metrics */
  serverFilter?: ServerFilter
  /** Server sum for aggregation metrics */
  serverSum?: {
    column: string
    filter?: ServerFilter
  }
}

/**
 * Creates a metric with custom compute logic.
 * Use this for complex metrics that don't fit the standard patterns.
 *
 * @example
 * // Top payment method
 * createCustomMetric("top_method", "Top Method", Banknote, (items) => {
 *   const counts = items.reduce((acc, p) => {
 *     acc[p.payment_method] = (acc[p.payment_method] || 0) + 1
 *     return acc
 *   }, {} as Record<string, number>)
 *   const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
 *   return top ? PAYMENT_METHODS[top[0]] || top[0] : "—"
 * })
 */
export function createCustomMetric<T>(
  id: string,
  label: string,
  icon: IconComponent | undefined,
  compute: (items: T[], total: number, serverData?: Record<string, number>) => number | string,
  options: CustomMetricOptions<T> = {}
): MetricConfig<T> {
  const { highlight, format, serverFilter, serverSum } = options

  return {
    id,
    label,
    icon,
    compute,
    format,
    highlight,
    serverFilter,
    serverSum,
  }
}

// ============================================================================
// HIGHLIGHT HELPERS
// ============================================================================

/**
 * Common highlight functions for metrics
 */
export const MetricHighlights = {
  /** Highlight when value > 0 */
  whenPositive: (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value
    return num > 0
  },

  /** Highlight when value !== 0 or "₹0" */
  whenNotZero: (value: number | string) => {
    if (typeof value === "string") {
      return value !== "₹0" && value !== "0"
    }
    return value !== 0
  },

  /** Highlight when value >= threshold */
  whenAbove: (threshold: number) => (value: number | string) => {
    const num = typeof value === "string" ? parseFloat(value.replace(/[^0-9.-]/g, "")) : value
    return num >= threshold
  },

  /** Highlight always */
  always: () => true,

  /** Never highlight */
  never: () => false,
}
