/**
 * Metric Factory Functions
 *
 * Reusable factory functions for creating MetricConfig objects.
 * Eliminates repetitive inline metric definitions across 32+ list pages.
 *
 * Common patterns:
 * - createTotalMetric:    Total count using server total
 * - createStatusMetric:   Count by status column value (with serverFilter)
 * - createBooleanMetric:  Count by boolean column (is_active, etc.)
 * - createNullCheckMetric: Count by null/not-null column
 * - createSumMetric:      Sum a numeric column (with optional filter)
 * - createCountMetric:    Count with custom predicate (no server filter)
 *
 * @example
 * const metrics: MetricConfig<Record<string, unknown>>[] = [
 *   createTotalMetric({ label: "Total Tenants", icon: Users }),
 *   createStatusMetric("active", "Active", UserCheck),
 *   createSumMetric("monthly_rent", "rent", "Monthly Rent", IndianRupee, {
 *     filter: { column: "status", operator: "eq", value: "active" },
 *   }),
 * ]
 */

import { Hash } from "lucide-react"
import type { MetricConfig, ServerFilter, ServerSum } from "@/lib/hooks/list-page/types"
import { formatCurrency } from "@/lib/format"

// Re-export MetricConfig for convenience
export type { MetricConfig } from "@/lib/hooks/list-page/types"

type LucideIcon = React.ComponentType<{ className?: string }>

// ============================================
// createTotalMetric
// ============================================

/**
 * Creates a "Total" metric that displays the server-side total count.
 *
 * @example
 * createTotalMetric()
 * createTotalMetric({ label: "Total Tenants", icon: Users })
 * createTotalMetric({ label: "Transactions", icon: Receipt, format: "number" })
 */
export function createTotalMetric(options?: {
  id?: string
  label?: string
  icon?: LucideIcon
  format?: "number" | "currency" | "percentage"
}): MetricConfig<Record<string, unknown>> {
  return {
    id: options?.id ?? "total",
    label: options?.label ?? "Total",
    icon: options?.icon ?? Hash,
    compute: (_items, total) => total,
    format: options?.format,
  }
}

// ============================================
// createStatusMetric
// ============================================

/**
 * Creates a metric that counts items matching a status value.
 * Uses serverFilter for accurate cross-page counts.
 *
 * @param status  - The status value to filter by (e.g., "active", "pending")
 * @param label   - Display label for the metric
 * @param icon    - Lucide icon component
 * @param options - Additional options (column name, highlight, multi-value)
 *
 * @example
 * createStatusMetric("active", "Active", UserCheck)
 * createStatusMetric("pending", "Pending", Clock, { highlight: true })
 * createStatusMetric("open", "Open", AlertCircle, { column: "settlement_status" })
 * createStatusMetric(["in_progress", "acknowledged"], "In Progress", Wrench, { id: "in_progress" })
 */
export function createStatusMetric(
  status: string | string[],
  label: string,
  icon: LucideIcon,
  options?: {
    id?: string
    column?: string
    highlight?: boolean
    format?: "number" | "currency" | "percentage"
  }
): MetricConfig<Record<string, unknown>> {
  const column = options?.column ?? "status"
  const isArray = Array.isArray(status)
  const metricId = options?.id ?? (isArray ? (status as string[])[0] : (status as string))

  return {
    id: metricId,
    label,
    icon,
    compute: (items) => {
      if (isArray) {
        return items.filter((item) => (status as string[]).includes(item[column] as string)).length
      }
      return items.filter((item) => item[column] === status).length
    },
    highlight: options?.highlight ? (value) => (value as number) > 0 : undefined,
    format: options?.format,
    serverFilter: {
      column,
      operator: isArray ? "in" : "eq",
      value: status,
    },
  }
}

// ============================================
// createBooleanMetric
// ============================================

/**
 * Creates a metric that counts items by a boolean column.
 * Uses serverFilter for accurate cross-page counts.
 *
 * @param column  - The boolean column name (e.g., "is_active")
 * @param value   - true or false
 * @param label   - Display label for the metric
 * @param icon    - Lucide icon component
 *
 * @example
 * createBooleanMetric("is_active", true, "Active", CheckCircle)
 * createBooleanMetric("is_active", false, "Inactive", XCircle)
 */
export function createBooleanMetric(
  column: string,
  value: boolean,
  label: string,
  icon: LucideIcon,
  options?: {
    id?: string
    highlight?: boolean
    format?: "number" | "currency" | "percentage"
  }
): MetricConfig<Record<string, unknown>> {
  return {
    id: options?.id ?? (value ? column.replace("is_", "") : `not_${column.replace("is_", "")}`),
    label,
    icon,
    compute: (items) => items.filter((item) => item[column] === value).length,
    highlight: options?.highlight ? (val) => (val as number) > 0 : undefined,
    format: options?.format,
    serverFilter: {
      column,
      operator: "eq",
      value,
    },
  }
}

// ============================================
// createNullCheckMetric
// ============================================

/**
 * Creates a metric that counts items where a column is null or not null.
 * Uses serverFilter for accurate cross-page counts.
 *
 * @param column   - The column to check
 * @param isNull   - true for IS NULL, false for IS NOT NULL
 * @param label    - Display label
 * @param icon     - Lucide icon
 *
 * @example
 * createNullCheckMetric("user_id", false, "With Login", Shield)
 * createNullCheckMetric("check_out_time", true, "Currently Inside", UserCheck, { highlight: true })
 */
export function createNullCheckMetric(
  column: string,
  isNull: boolean,
  label: string,
  icon: LucideIcon,
  options?: {
    id?: string
    highlight?: boolean
  }
): MetricConfig<Record<string, unknown>> {
  return {
    id: options?.id ?? `${column}_${isNull ? "null" : "not_null"}`,
    label,
    icon,
    compute: (items) =>
      items.filter((item) => (isNull ? item[column] == null : item[column] != null)).length,
    highlight: options?.highlight ? (value) => (value as number) > 0 : undefined,
    serverFilter: {
      column,
      operator: isNull ? "is_null" : "is_not_null",
    },
  }
}

// ============================================
// createSumMetric
// ============================================

/**
 * Creates a metric that sums a numeric column, with optional filter.
 * Uses serverSum for accurate cross-page aggregation.
 *
 * @param column    - The column to sum
 * @param id        - Unique metric ID
 * @param label     - Display label
 * @param icon      - Lucide icon
 * @param options   - Format and optional filter
 *
 * @example
 * createSumMetric("amount", "all_time", "All Time", Wallet)
 * createSumMetric("total_beds", "total_beds", "Total Beds", Bed, { format: "number" })
 * createSumMetric("balance_due", "pending", "Pending", Clock, {
 *   filter: { column: "status", operator: "in", value: ["pending", "partial"] },
 *   highlight: true,
 * })
 */
export function createSumMetric(
  column: string,
  id: string,
  label: string,
  icon: LucideIcon,
  options?: {
    format?: "number" | "currency"
    filter?: ServerFilter
    highlight?: boolean | ((value: number | string) => boolean)
    fallbackCompute?: (items: Record<string, unknown>[]) => number
  }
): MetricConfig<Record<string, unknown>> {
  const format = options?.format ?? "currency"

  return {
    id,
    label,
    icon,
    compute: (items, _total, serverData) => {
      if (serverData?.[id] !== undefined) {
        return format === "currency" ? formatCurrency(serverData[id]) : serverData[id]
      }
      if (options?.fallbackCompute) {
        const value = options.fallbackCompute(items)
        return format === "currency" ? formatCurrency(value) : value
      }
      const sum = items.reduce((acc, item) => acc + (Number(item[column]) || 0), 0)
      return format === "currency" ? formatCurrency(sum) : sum
    },
    format: format === "number" ? "number" : undefined,
    highlight:
      typeof options?.highlight === "function"
        ? options.highlight
        : options?.highlight === true
          ? (value) => {
              if (format === "currency") return value !== "\u20B90" && value !== formatCurrency(0)
              return (value as number) > 0
            }
          : undefined,
    serverSum: {
      column,
      filter: options?.filter,
    } as ServerSum,
  }
}

// ============================================
// createCountMetric
// ============================================

/**
 * Creates a metric with a custom predicate for counting items.
 * Does NOT use serverFilter (for complex conditions not expressible as a single filter).
 *
 * @param id        - Unique metric ID
 * @param label     - Display label
 * @param icon      - Lucide icon
 * @param predicate - Function to filter items
 *
 * @example
 * createCountMetric("urgent", "Urgent", Clock,
 *   (item) => item.priority === "urgent" && item.status !== "resolved"
 * )
 * createCountMetric("low_hours", "Low Hours (<2h)", Clock,
 *   (item) => (item.hours_balance as number) < 2 && item.status === "active"
 * )
 */
export function createCountMetric(
  id: string,
  label: string,
  icon: LucideIcon,
  predicate: (item: Record<string, unknown>) => boolean,
  options?: {
    highlight?: boolean
    serverFilter?: ServerFilter
    format?: "number" | "currency" | "percentage"
  }
): MetricConfig<Record<string, unknown>> {
  return {
    id,
    label,
    icon,
    compute: (items) => items.filter(predicate).length,
    highlight: options?.highlight ? (value) => (value as number) > 0 : undefined,
    serverFilter: options?.serverFilter,
    format: options?.format,
  }
}
