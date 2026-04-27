/**
 * Shared Report Utilities
 * Constants, formatters, and helpers used across PG and Library reports
 */

import { DateRange } from "@/components/ui/date-range-picker"
import { showError } from "@/lib/toast-helpers"
import { DemoAction } from "@/lib/demo-mode"
import { formatCurrencyCompact } from "@/lib/format"

export const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-6))",
  "hsl(var(--chart-4))",
]

/** Payment method display labels */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
  paytm: "Paytm",
  other: "Other",
}

export { formatCurrencyCompact as formatCurrency }

/**
 * Default date range: last 6 months to now
 */
export function getDefaultDateRange(): DateRange {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth() - 6, 1)
  return { from: start, to: now, label: "Last 6 months" }
}

/**
 * Calculate percentage growth between two values
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous <= 0) return 0
  return ((current - previous) / previous) * 100
}

/**
 * Build payment method breakdown from raw payment records
 */
export function buildPaymentMethodBreakdown(
  payments: Array<{ payment_method?: string; amount: number | string }>
): Array<{ name: string; value: number; count: number }> {
  const methodCounts: Record<string, { count: number; amount: number }> = {}

  payments.forEach((p) => {
    const method = p.payment_method || "other"
    if (!methodCounts[method]) {
      methodCounts[method] = { count: 0, amount: 0 }
    }
    methodCounts[method].count++
    methodCounts[method].amount += Number(p.amount)
  })

  return Object.entries(methodCounts).map(([method, data]) => ({
    name: PAYMENT_METHOD_LABELS[method] || method,
    value: data.amount,
    count: data.count,
  }))
}

/**
 * Build monthly revenue trend data for the last N months
 */
export function buildMonthlyTrend<T>(
  months: number,
  payments: Array<{ payment_date: string; amount: number | string }>,
  extraCompute?: (monthStart: Date, monthEnd: Date) => T
): Array<{ month: string; revenue: number } & T> {
  const now = new Date()
  const result = []

  for (let i = months - 1; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
    const monthPayments = payments.filter((p) => {
      const paymentDate = new Date(p.payment_date)
      return paymentDate >= monthStart && paymentDate <= monthEnd
    })

    const base = {
      month: MONTH_NAMES[monthStart.getMonth()],
      revenue: monthPayments.reduce((sum, p) => sum + Number(p.amount), 0),
    }

    const extra = extraCompute ? extraCompute(monthStart, monthEnd) : ({} as T)
    result.push({ ...base, ...extra })
  }

  return result
}

/**
 * Generic CSV export with demo mode check
 */
export function exportCSV(
  rows: (string | number)[][],
  filename: string,
  canPerformAction: (action: DemoAction) => boolean,
  getDemoMessage: (action: DemoAction) => string
): void {
  if (!canPerformAction("export_data")) {
    showError(getDemoMessage("export_data"))
    return
  }

  const csvContent = rows.map((row) => row.join(",")).join("\n")
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const link = document.createElement("a")
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}
