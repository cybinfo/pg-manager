/**
 * Tests for useReportDateRange from src/components/reports/useReportDateRange.ts
 *
 * Covers: default date range, filterByPeriod, filterByLastMonth,
 * lastMonthStart/End computation, setDateRange.
 */

import { renderHook, act } from "@testing-library/react"
import { useReportDateRange } from "@/components/reports/useReportDateRange"

// ============================================================================
// Helpers
// ============================================================================

interface Item {
  id: number
  payment_date: string
}

function makeItem(id: number, date: string): Item {
  return { id, payment_date: date }
}

// ============================================================================
// Default date range
// ============================================================================

describe("useReportDateRange — default range", () => {
  it("has 'from' date equal to 6 months ago (1st of the month)", () => {
    const { result } = renderHook(() => useReportDateRange())
    expect(result.current.startDate.getDate()).toBe(1)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    expect(result.current.startDate.getMonth()).toBe(sixMonthsAgo.getMonth())
  })

  it("has 'to' date approximately equal to now", () => {
    const before = new Date()
    const { result } = renderHook(() => useReportDateRange())
    const after = new Date()
    expect(result.current.endDate.getTime()).toBeGreaterThanOrEqual(before.getTime())
    expect(result.current.endDate.getTime()).toBeLessThanOrEqual(after.getTime())
  })
})

// ============================================================================
// filterByPeriod
// ============================================================================

describe("useReportDateRange — filterByPeriod", () => {
  it("returns items within the selected range", () => {
    const { result } = renderHook(() => useReportDateRange())

    // Set a specific range: June 1 – June 30, 2024
    act(() => {
      result.current.setDateRange({
        from: new Date("2024-06-01"),
        to: new Date("2024-06-30"),
      })
    })

    const items: Item[] = [
      makeItem(1, "2024-06-15"), // inside
      makeItem(2, "2024-05-31"), // before
      makeItem(3, "2024-07-01"), // after
      makeItem(4, "2024-06-01"), // on start (inclusive)
      makeItem(5, "2024-06-30"), // on end (inclusive)
    ]

    const filtered = result.current.filterByPeriod(items, "payment_date")
    expect(filtered.map((i) => i.id)).toEqual([1, 4, 5])
  })

  it("returns empty array when no items are in range", () => {
    const { result } = renderHook(() => useReportDateRange())
    act(() => {
      result.current.setDateRange({
        from: new Date("2024-01-01"),
        to: new Date("2024-01-31"),
      })
    })

    const items: Item[] = [
      makeItem(1, "2024-06-15"),
      makeItem(2, "2023-12-31"),
    ]

    expect(result.current.filterByPeriod(items, "payment_date")).toHaveLength(0)
  })

  it("returns all items when all are in range", () => {
    const { result } = renderHook(() => useReportDateRange())
    act(() => {
      result.current.setDateRange({
        from: new Date("2024-01-01"),
        to: new Date("2024-12-31"),
      })
    })

    const items: Item[] = [
      makeItem(1, "2024-03-15"),
      makeItem(2, "2024-07-20"),
    ]

    expect(result.current.filterByPeriod(items, "payment_date")).toHaveLength(2)
  })
})

// ============================================================================
// filterByLastMonth
// ============================================================================

describe("useReportDateRange — filterByLastMonth", () => {
  it("returns only items in last month", () => {
    const { result } = renderHook(() => useReportDateRange())

    // Build items: one in last month, one in current month, one in previous
    const now = new Date()
    const lastMonth = now.getMonth() - 1
    const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
    const actualLastMonth = lastMonth < 0 ? 11 : lastMonth

    const lastMonthDate = `${lastMonthYear}-${String(actualLastMonth + 1).padStart(2, "0")}-15`
    const currentMonthDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-05`

    const items: Item[] = [
      makeItem(1, lastMonthDate),    // last month
      makeItem(2, currentMonthDate), // current month (outside)
    ]

    const filtered = result.current.filterByLastMonth(items, "payment_date")
    expect(filtered.map((i) => i.id)).toContain(1)
    expect(filtered.map((i) => i.id)).not.toContain(2)
  })
})

// ============================================================================
// lastMonthStart / lastMonthEnd
// ============================================================================

describe("useReportDateRange — lastMonthStart/End", () => {
  it("lastMonthStart is the 1st of last month", () => {
    const { result } = renderHook(() => useReportDateRange())
    expect(result.current.lastMonthStart.getDate()).toBe(1)
    const expectedMonth = new Date()
    expectedMonth.setMonth(expectedMonth.getMonth() - 1)
    expect(result.current.lastMonthStart.getMonth()).toBe(expectedMonth.getMonth())
  })

  it("lastMonthEnd is the last day of last month", () => {
    const { result } = renderHook(() => useReportDateRange())
    const now = new Date()
    // Last day of last month = day 0 of current month
    const expected = new Date(now.getFullYear(), now.getMonth(), 0)
    expect(result.current.lastMonthEnd.getDate()).toBe(expected.getDate())
  })
})

// ============================================================================
// setDateRange
// ============================================================================

describe("useReportDateRange — setDateRange", () => {
  it("updates the start and end dates", () => {
    const { result } = renderHook(() => useReportDateRange())
    act(() => {
      result.current.setDateRange({
        from: new Date("2023-01-01"),
        to: new Date("2023-12-31"),
      })
    })
    expect(result.current.startDate).toEqual(new Date("2023-01-01"))
    expect(result.current.endDate).toEqual(new Date("2023-12-31"))
  })
})
