/**
 * Report Utility Functions
 *
 * Pure helpers for the Payment Report and Library Reports pages:
 * period key generation, period label formatting, and ISO week numbering.
 */

import { MONTH_NAMES } from "@/components/reports"

export type GroupByPeriod = "day" | "week" | "month" | "year"

/**
 * Return the ISO week number (1–53) for a given date.
 */
export function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/**
 * Build a human-readable period label for a date and groupBy granularity.
 * @example formatPeriodLabel(new Date("2025-03-15"), "month") => "Mar 2025"
 */
export function formatPeriodLabel(date: Date, groupBy: GroupByPeriod): string {
  switch (groupBy) {
    case "day":
      return `${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`
    case "week":
      return `W${getWeekNumber(date)} ${MONTH_NAMES[date.getMonth()]}`
    case "month":
      return `${MONTH_NAMES[date.getMonth()]} ${date.getFullYear()}`
    case "year":
      return `${date.getFullYear()}`
  }
}

/**
 * Build a sortable period key for a date and groupBy granularity.
 * @example getPeriodKey(new Date("2025-03-15"), "month") => "2025-03"
 */
export function getPeriodKey(date: Date, groupBy: GroupByPeriod): string {
  switch (groupBy) {
    case "day":
      return date.toISOString().split("T")[0]
    case "week":
      return `${date.getFullYear()}-W${getWeekNumber(date)}`
    case "month":
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
    case "year":
      return `${date.getFullYear()}`
  }
}
