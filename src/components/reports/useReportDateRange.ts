/**
 * Shared Report Date Range Hook
 * Manages date range state and provides common date period helpers
 */

"use client"

import { useState, useCallback, useMemo } from "react"
import { DateRange } from "@/components/ui/date-range-picker"
import { getDefaultDateRange } from "./report-utils"

interface ReportDateRange {
  /** Current date range selection */
  dateRange: DateRange
  /** Update the date range */
  setDateRange: (range: DateRange) => void
  /** Start of the selected period */
  startDate: Date
  /** End of the selected period */
  endDate: Date
  /** Start of last month */
  lastMonthStart: Date
  /** End of last month */
  lastMonthEnd: Date
  /** Filter items by a date field within the selected period */
  filterByPeriod: <T>(items: T[], dateField: keyof T) => T[]
  /** Filter items by a date field within last month */
  filterByLastMonth: <T>(items: T[], dateField: keyof T) => T[]
}

export function useReportDateRange(): ReportDateRange {
  const [dateRange, setDateRange] = useState<DateRange>(getDefaultDateRange)

  const startDate = dateRange.from
  const endDate = dateRange.to

  const now = new Date()
  const lastMonthStart = useMemo(
    () => new Date(now.getFullYear(), now.getMonth() - 1, 1),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getFullYear(), now.getMonth()]
  )
  const lastMonthEnd = useMemo(
    () => new Date(now.getFullYear(), now.getMonth(), 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [now.getFullYear(), now.getMonth()]
  )

  const filterByPeriod = useCallback(
    <T,>(items: T[], dateField: keyof T): T[] => {
      return items.filter((item) => {
        const date = new Date(item[dateField] as string)
        return date >= startDate && date <= endDate
      })
    },
    [startDate, endDate]
  )

  const filterByLastMonth = useCallback(
    <T,>(items: T[], dateField: keyof T): T[] => {
      return items.filter((item) => {
        const date = new Date(item[dateField] as string)
        return date >= lastMonthStart && date <= lastMonthEnd
      })
    },
    [lastMonthStart, lastMonthEnd]
  )

  return {
    dateRange,
    setDateRange,
    startDate,
    endDate,
    lastMonthStart,
    lastMonthEnd,
    filterByPeriod,
    filterByLastMonth,
  }
}
