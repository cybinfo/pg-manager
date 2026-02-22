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
import { getTodayISO } from "@/lib/date-helpers"

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

// ============================================
// createThisMonthSumMetric
// ============================================

/**
 * Creates a metric that sums a numeric field for the current month.
 * Uses dynamic date filtering (not expressible as a serverFilter).
 *
 * @param amountField - The numeric field to sum
 * @param dateField   - The date field to filter by current month
 * @param label       - Display label
 * @param icon        - Lucide icon
 *
 * @example
 * createThisMonthSumMetric("amount", "payment_date", "This Month", IndianRupee)
 * createThisMonthSumMetric("amount", "expense_date", "This Month", TrendingDown)
 */
export function createThisMonthSumMetric<T = Record<string, unknown>>(
  amountField: string,
  dateField: string,
  label: string,
  icon: LucideIcon,
  options?: { id?: string }
): MetricConfig<T> {
  return {
    id: options?.id ?? "this_month",
    label,
    icon,
    compute: (items: T[]) => {
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonthItems = items.filter(
        (item) => new Date((item as Record<string, unknown>)[dateField] as string) >= firstOfMonth
      )
      const sum = thisMonthItems.reduce(
        (acc: number, item) => acc + (Number((item as Record<string, unknown>)[amountField]) || 0), 0
      )
      return formatCurrency(sum)
    },
  }
}

// ============================================
// createThisMonthCountMetric
// ============================================

/**
 * Creates a metric that counts items for the current month.
 * Uses dynamic date filtering (not expressible as a serverFilter).
 *
 * @param dateField - The date field to filter by current month
 * @param label     - Display label
 * @param icon      - Lucide icon
 *
 * @example
 * createThisMonthCountMetric("reading_date", "This Month", Gauge)
 * createThisMonthCountMetric("created_at", "New This Month", Plus)
 */
export function createThisMonthCountMetric<T = Record<string, unknown>>(
  dateField: string,
  label: string,
  icon: LucideIcon,
  options?: { id?: string }
): MetricConfig<T> {
  return {
    id: options?.id ?? "this_month",
    label,
    icon,
    compute: (items: T[]) => {
      const now = new Date()
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return items.filter(
        (item) => new Date((item as Record<string, unknown>)[dateField] as string) >= firstOfMonth
      ).length
    },
  }
}

// ============================================
// createTodayCountMetric
// ============================================

/**
 * Creates a metric that counts items from today.
 * Uses dynamic date comparison (not expressible as a serverFilter).
 *
 * @param dateField - The date field to compare against today
 * @param label     - Display label
 * @param icon      - Lucide icon
 *
 * @example
 * createTodayCountMetric("check_in_date", "Today", CalendarDays)
 * createTodayCountMetric("payment_date", "Today", Calendar)
 */
export function createTodayCountMetric<T = Record<string, unknown>>(
  dateField: string,
  label: string,
  icon: LucideIcon,
  options?: { id?: string }
): MetricConfig<T> {
  return {
    id: options?.id ?? "today",
    label,
    icon,
    compute: (items: T[]) => {
      const today = getTodayISO()
      return items.filter((item) => {
        const value = (item as Record<string, unknown>)[dateField] as string
        // Compare ISO date prefix (YYYY-MM-DD) to handle both ISO strings and date-only strings
        return value?.startsWith(today) || value === today
      }).length
    },
  }
}

// ============================================
// createLastMonthSumMetric
// ============================================

/**
 * Creates a metric that sums a numeric field for the previous calendar month.
 * Uses dynamic date filtering (not expressible as a serverFilter).
 *
 * @param amountField - The numeric field to sum
 * @param dateField   - The date field to filter by last month
 * @param label       - Display label
 * @param icon        - Lucide icon
 *
 * @example
 * createLastMonthSumMetric("amount", "expense_date", "Last Month", Calendar)
 */
export function createLastMonthSumMetric<T = Record<string, unknown>>(
  amountField: string,
  dateField: string,
  label: string,
  icon: LucideIcon,
  options?: { id?: string }
): MetricConfig<T> {
  return {
    id: options?.id ?? "last_month",
    label,
    icon,
    compute: (items: T[]) => {
      const now = new Date()
      const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
      const lastMonthItems = items.filter((item) => {
        const date = new Date((item as Record<string, unknown>)[dateField] as string)
        return date >= lastMonthStart && date <= lastMonthEnd
      })
      const sum = lastMonthItems.reduce(
        (acc: number, item) => acc + (Number((item as Record<string, unknown>)[amountField]) || 0), 0
      )
      return formatCurrency(sum)
    },
  }
}

// ============================================
// createYearToDateSumMetric
// ============================================

/**
 * Creates a metric that sums a numeric field from the start of the current year.
 * Uses dynamic date filtering (not expressible as a serverFilter).
 *
 * @param amountField - The numeric field to sum
 * @param dateField   - The date field to filter by year-to-date
 * @param label       - Display label
 * @param icon        - Lucide icon
 *
 * @example
 * createYearToDateSumMetric("amount", "expense_date", "Year to Date", BarChart3)
 */
export function createYearToDateSumMetric<T = Record<string, unknown>>(
  amountField: string,
  dateField: string,
  label: string,
  icon: LucideIcon,
  options?: { id?: string }
): MetricConfig<T> {
  return {
    id: options?.id ?? "ytd",
    label,
    icon,
    compute: (items: T[]) => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const ytdItems = items.filter(
        (item) => new Date((item as Record<string, unknown>)[dateField] as string) >= yearStart
      )
      const sum = ytdItems.reduce(
        (acc: number, item) => acc + (Number((item as Record<string, unknown>)[amountField]) || 0), 0
      )
      return formatCurrency(sum)
    },
  }
}

// ============================================
// createAverageMetric
// ============================================

/**
 * Creates a metric that computes the average of a numeric field.
 * Optionally filters out items where the field is null/0 before averaging.
 *
 * @param field   - The numeric field to average
 * @param id      - Unique metric ID
 * @param label   - Display label
 * @param icon    - Lucide icon
 * @param options - suffix (e.g., "h", " days"), filterNulls to exclude null/0 values
 *
 * @example
 * createAverageMetric("hours_included", "avg_hours", "Avg Hours", Clock, { suffix: "h", filterNulls: true })
 * createAverageMetric("validity_days", "avg_validity", "Avg Validity", Calendar, { suffix: " days" })
 */
export function createAverageMetric<T = Record<string, unknown>>(
  field: string,
  id: string,
  label: string,
  icon: LucideIcon,
  options?: {
    suffix?: string
    filterNulls?: boolean
    emptyValue?: string
  }
): MetricConfig<T> {
  const suffix = options?.suffix ?? ""
  const filterNulls = options?.filterNulls ?? false
  const emptyValue = options?.emptyValue ?? "\u2014"

  return {
    id,
    label,
    icon,
    compute: (items: T[]) => {
      const eligible = filterNulls
        ? items.filter((item) => (item as Record<string, unknown>)[field] != null && Number((item as Record<string, unknown>)[field]) !== 0)
        : items
      if (eligible.length === 0) return emptyValue
      const avg = eligible.reduce(
        (sum: number, item) => sum + (Number((item as Record<string, unknown>)[field]) || 0), 0
      ) / eligible.length
      return `${avg.toFixed(0)}${suffix}`
    },
  }
}

// ============================================
// createTopValueMetric
// ============================================

/**
 * Creates a metric that finds the most common value in a field.
 * Optionally maps the value through a label dictionary.
 *
 * @param field    - The field to count occurrences of
 * @param id       - Unique metric ID
 * @param label    - Display label
 * @param icon     - Lucide icon
 * @param options  - labelMap for display names, emptyValue for no-data fallback
 *
 * @example
 * createTopValueMetric("payment_method", "top_method", "Top Method", Banknote, {
 *   labelMap: PAYMENT_METHODS
 * })
 */
export function createTopValueMetric<T = Record<string, unknown>>(
  field: string,
  id: string,
  label: string,
  icon: LucideIcon,
  options?: {
    labelMap?: Record<string, string>
    emptyValue?: string
  }
): MetricConfig<T> {
  const labelMap = options?.labelMap
  const emptyValue = options?.emptyValue ?? "\u2014"

  return {
    id,
    label,
    icon,
    compute: (items: T[]) => {
      const counts = items.reduce((acc: Record<string, number>, item) => {
        const value = (item as Record<string, unknown>)[field] as string
        if (value) {
          acc[value] = (acc[value] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>)
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
      if (!top) return emptyValue
      return labelMap ? (labelMap[top[0]] || top[0]) : top[0]
    },
  }
}

// ============================================
// createTopValueByAmountMetric
// ============================================

/**
 * Creates a metric that finds the value with the highest total of a numeric field.
 * Useful for "top category by spend" type metrics.
 * Optionally scoped to the current month.
 *
 * @param groupField  - The field to group by (e.g., nested "expense_type.name")
 * @param amountField - The numeric field to sum per group
 * @param id          - Unique metric ID
 * @param label       - Display label
 * @param icon        - Lucide icon
 * @param options     - dateField to scope to current month, emptyValue fallback
 *
 * @example
 * createTopValueByAmountMetric("expense_type.name", "amount", "top_category", "Top Category", Wallet, {
 *   dateField: "expense_date"
 * })
 */
export function createTopValueByAmountMetric<T = Record<string, unknown>>(
  groupField: string,
  amountField: string,
  id: string,
  label: string,
  icon: LucideIcon,
  options?: {
    dateField?: string
    emptyValue?: string
  }
): MetricConfig<T> {
  const emptyValue = options?.emptyValue ?? "\u2014"

  return {
    id,
    label,
    icon,
    compute: (items: T[]) => {
      let filtered = items
      // Optionally scope to current month
      if (options?.dateField) {
        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        filtered = items.filter(
          (item) => new Date((item as Record<string, unknown>)[options.dateField!] as string) >= thisMonthStart
        )
      }

      const totals: Record<string, { name: string; total: number }> = {}
      filtered.forEach((item) => {
        // Support nested fields like "expense_type.name"
        const parts = groupField.split(".")
        let value: unknown = item
        for (const part of parts) {
          value = value != null ? (value as Record<string, unknown>)[part] : undefined
        }
        const name = (value as string) || "Unknown"
        if (!totals[name]) {
          totals[name] = { name, total: 0 }
        }
        totals[name].total += Number((item as Record<string, unknown>)[amountField]) || 0
      })

      const top = Object.values(totals).sort((a, b) => b.total - a.total)[0]
      return top?.name || emptyValue
    },
  }
}

// ============================================
// createExpiringMetric
// ============================================

/**
 * Creates a metric that counts items expiring within N days.
 * Only counts active items (via activeField) with a non-null expiry date.
 *
 * @param expiryField  - The date field indicating when the item expires
 * @param withinDays   - Number of days from now to consider "expiring soon"
 * @param label        - Display label
 * @param icon         - Lucide icon
 * @param options      - id, activeField to filter only active items
 *
 * @example
 * createExpiringMetric("expires_at", 3, "Expiring Soon", Clock, { activeField: "is_active" })
 */
export function createExpiringMetric<T = Record<string, unknown>>(
  expiryField: string,
  withinDays: number,
  label: string,
  icon: LucideIcon,
  options?: {
    id?: string
    activeField?: string
  }
): MetricConfig<T> {
  const threshold = withinDays * 24 * 60 * 60 * 1000

  return {
    id: options?.id ?? "expiring",
    label,
    icon,
    compute: (items: T[]) => {
      const now = new Date().getTime()
      return items.filter((item) => {
        const record = item as Record<string, unknown>
        if (!record[expiryField]) return false
        if (options?.activeField && !record[options.activeField]) return false
        const expiresAt = new Date(record[expiryField] as string).getTime()
        return expiresAt > now && expiresAt - now < threshold
      }).length
    },
  }
}
