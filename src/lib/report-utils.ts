/**
 * Report Utility Functions
 *
 * Pure helpers for the Payment Report and Library Reports pages:
 * period key generation, period label formatting, ISO week numbering,
 * and paginated Supabase row fetching.
 */

import { MONTH_NAMES } from "@/components/reports"

export type GroupByPeriod = "day" | "week" | "month" | "year"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QueryWithRange = { range: (from: number, to: number) => any }

/**
 * Paginate through a Supabase query to bypass the default 1000-row response limit.
 * Pass a fully-configured query (without `.range()`) and the function will fetch
 * all pages and return the concatenated result.
 */
export async function fetchAllRows(
  query: QueryWithRange,
  pageSize = 1000
): Promise<{ data: Record<string, unknown>[]; error: Error | null }> {
  const allData: Record<string, unknown>[] = []
  let from = 0
  let hasMore = true
  let lastError: Error | null = null
  while (hasMore) {
    const { data, error } = (await query.range(from, from + pageSize - 1)) as {
      data: Record<string, unknown>[] | null
      error: Error | null
    }
    if (error) { lastError = error; break }
    if (!data || data.length === 0) { hasMore = false; break }
    allData.push(...data)
    if (data.length < pageSize) { hasMore = false; break }
    from += pageSize
  }
  return { data: allData, error: lastError }
}

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
