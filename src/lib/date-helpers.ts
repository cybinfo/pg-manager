/**
 * Date Helpers
 *
 * Centralized date calculation utilities for billing and cron jobs.
 * Eliminates duplicate date range calculations across cron jobs.
 *
 * @example
 * import {
 *   getMonthRange,
 *   getCurrentBillingPeriod,
 *   getTodayISO,
 * } from "@/lib/date-helpers"
 *
 * const { start, end } = getMonthRange()
 * const { periodStart, periodEnd, month } = getCurrentBillingPeriod()
 */

import { formatTimeAgo } from "@/lib/format"

// ============================================================================
// BASIC DATE HELPERS
// ============================================================================

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 * Used for form default values
 *
 * @example
 * const formData = { date: getTodayISO() }
 */
export function getTodayISO(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get current timestamp as ISO string
 *
 * @example
 * const createdAt = getNowISO()
 */
export function getNowISO(): string {
  return new Date().toISOString()
}

// ============================================================================
// MONTH RANGE HELPERS
// ============================================================================

interface MonthRange {
  /** First day of the month at 00:00:00 */
  start: Date
  /** Last day of the month at 23:59:59.999 */
  end: Date
}

/**
 * Get the start and end dates of a month
 *
 * @param date - Reference date (defaults to current date)
 * @returns Start and end of the month
 *
 * @example
 * // Current month
 * const { start, end } = getMonthRange()
 *
 * // Specific month
 * const { start, end } = getMonthRange(new Date("2025-06-15"))
 */
export function getMonthRange(date: Date = new Date()): MonthRange {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

/**
 * Get the previous month's date range
 *
 * @param date - Reference date (defaults to current date)
 * @returns Start and end of the previous month
 */
export function getPreviousMonthRange(date: Date = new Date()): MonthRange {
  const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return getMonthRange(previousMonth)
}

/**
 * Get the next month's date range
 *
 * @param date - Reference date (defaults to current date)
 * @returns Start and end of the next month
 */
export function getNextMonthRange(date: Date = new Date()): MonthRange {
  const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)
  return getMonthRange(nextMonth)
}

// ============================================================================
// BILLING PERIOD HELPERS
// ============================================================================

interface BillingPeriod {
  /** First day of the billing period */
  periodStart: Date
  /** Last day of the billing period */
  periodEnd: Date
  /** Month string (e.g., "January 2025") */
  month: string
  /** Year as number */
  year: number
  /** Month as number (1-12) */
  monthNumber: number
}

/**
 * Get the current billing period information
 *
 * @example
 * const { periodStart, periodEnd, month } = getCurrentBillingPeriod()
 * // month = "January 2025"
 */
export function getCurrentBillingPeriod(date: Date = new Date()): BillingPeriod {
  const { start, end } = getMonthRange(date)

  return {
    periodStart: start,
    periodEnd: end,
    month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    year: date.getFullYear(),
    monthNumber: date.getMonth() + 1,
  }
}

/**
 * Get billing period for a specific month/year
 *
 * @example
 * const period = getBillingPeriod(2025, 6) // June 2025
 */
export function getBillingPeriod(year: number, month: number): BillingPeriod {
  const date = new Date(year, month - 1, 1) // month is 1-indexed
  return getCurrentBillingPeriod(date)
}

// ============================================================================
// DUE DATE HELPERS
// ============================================================================

/**
 * Calculate days until a specific day of the month
 *
 * @param dueDay - Day of month when rent is due (1-31)
 * @param fromDate - Reference date (defaults to today)
 * @returns Number of days until due date (negative if overdue)
 *
 * @example
 * const daysRemaining = getDaysUntilDue(5) // Days until 5th of month
 */
export function getDaysUntilDue(dueDay: number, fromDate: Date = new Date()): number {
  const today = new Date(fromDate)
  today.setHours(0, 0, 0, 0)

  // Due date for current month
  let dueDate = new Date(today.getFullYear(), today.getMonth(), dueDay)
  dueDate.setHours(0, 0, 0, 0)

  // If due date has passed, use next month
  if (dueDate < today) {
    dueDate = new Date(today.getFullYear(), today.getMonth() + 1, dueDay)
  }

  const diffTime = dueDate.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Calculate days overdue
 *
 * @param dueDate - The due date
 * @param fromDate - Reference date (defaults to today)
 * @returns Number of days overdue (0 if not overdue)
 */
export function getDaysOverdue(dueDate: Date, fromDate: Date = new Date()): number {
  const today = new Date(fromDate)
  today.setHours(0, 0, 0, 0)

  const due = new Date(dueDate)
  due.setHours(0, 0, 0, 0)

  if (today <= due) {
    return 0
  }

  const diffTime = today.getTime() - due.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if a date is overdue
 */
export function isOverdue(dueDate: Date, fromDate: Date = new Date()): boolean {
  return getDaysOverdue(dueDate, fromDate) > 0
}

// ============================================================================
// DATE COMPARISON HELPERS
// ============================================================================

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date())
}

/**
 * Check if a date is within a range (inclusive)
 */
export function isWithinRange(date: Date, start: Date, end: Date): boolean {
  const d = date.getTime()
  return d >= start.getTime() && d <= end.getTime()
}

// ============================================================================
// MONTH/YEAR EXTRACTION FOR GROUPING
// ============================================================================

/**
 * Extract month and year for grouping purposes
 *
 * @param dateString - ISO date string or Date object
 * @returns Object with formatted month and year strings
 *
 * @example
 * const { month, year } = extractMonthYear("2025-06-15")
 * // month = "June 2025", year = "2025"
 */
export function extractMonthYear(dateString: string | Date): {
  month: string
  year: string
} {
  const date = typeof dateString === "string" ? new Date(dateString) : dateString

  return {
    month: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    year: date.getFullYear().toString(),
  }
}

/**
 * Create a month/year computed fields factory for useListPage
 *
 * @param dateField - Name of the date field to extract from
 * @param prefix - Prefix for the computed fields (e.g., "bill" -> "bill_month")
 *
 * @example
 * computedFields: createMonthYearComputed("bill_date", "bill")
 * // Returns: { bill_month: "June 2025", bill_year: "2025" }
 */
export function createMonthYearComputed<T extends Record<string, unknown>>(
  dateField: keyof T,
  prefix: string
): (item: T) => Record<string, string> {
  return (item: T) => {
    const dateValue = item[dateField]
    const date = dateValue ? new Date(dateValue as string) : new Date()

    return {
      [`${prefix}_month`]: date.toLocaleDateString("en-US", { month: "long", year: "numeric" }),
      [`${prefix}_year`]: date.getFullYear().toString(),
    }
  }
}

// ============================================================================
// DATE FORMATTING FOR DISPLAY
// ============================================================================

/**
 * Format a date for display in Indian format
 *
 * @example
 * formatDateIndian(new Date()) // "15 June 2025"
 */
export function formatDateIndian(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/**
 * Get relative time description
 *
 * DEPRECATED: Use `formatTimeAgo` from `@/lib/format` instead.
 * This is a backward-compatible alias that delegates to the canonical implementation.
 *
 * @example
 * getRelativeTime(new Date(Date.now() - 3600000)) // "1h ago"
 */
export const getRelativeTime = formatTimeAgo
