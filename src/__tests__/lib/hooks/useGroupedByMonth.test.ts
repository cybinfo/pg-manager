/**
 * Tests for src/lib/hooks/useGroupedByMonth.ts
 *
 * Covers: useGroupedByMonth, useGroupedByMonthWithTotals, useGroupedByYear
 */

import { renderHook } from "@testing-library/react"
import {
  useGroupedByMonth,
  useGroupedByMonthWithTotals,
  useGroupedByYear,
} from "@/lib/hooks/useGroupedByMonth"

type Payment = { id: number; payment_date: string; amount: number }

function makePayments(): Payment[] {
  return [
    { id: 1, payment_date: "2026-01-10", amount: 5000 },
    { id: 2, payment_date: "2026-01-25", amount: 3000 },
    { id: 3, payment_date: "2026-02-05", amount: 7000 },
    { id: 4, payment_date: "2026-03-15", amount: 4000 },
  ]
}

// ============================================================================
// useGroupedByMonth
// ============================================================================

describe("useGroupedByMonth", () => {
  it("groups items by month key", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date")
    )
    expect(Object.keys(result.current.groupedItems)).toContain("2026-01")
    expect(Object.keys(result.current.groupedItems)).toContain("2026-02")
    expect(Object.keys(result.current.groupedItems)).toContain("2026-03")
  })

  it("places both January payments in the same group", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date")
    )
    expect(result.current.groupedItems["2026-01"]).toHaveLength(2)
  })

  it("sorts months newest-first by default", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date")
    )
    const months = result.current.months
    expect(months[0]).toBe("2026-03")
    expect(months[months.length - 1]).toBe("2026-01")
  })

  it("sorts months oldest-first when sortOrder is 'asc'", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date", "asc")
    )
    expect(result.current.months[0]).toBe("2026-01")
  })

  it("reports correct totalCount", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date")
    )
    expect(result.current.totalCount).toBe(4)
  })

  it("skips items with null/undefined date field", () => {
    const items = [
      { id: 1, payment_date: "2026-01-10", amount: 5000 },
      { id: 2, payment_date: null as unknown as string, amount: 3000 },
    ]
    const { result } = renderHook(() =>
      useGroupedByMonth(items, "payment_date")
    )
    expect(result.current.months).toHaveLength(1)
    expect(result.current.months[0]).toBe("2026-01")
  })

  it("returns empty groups for empty input", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth([], "payment_date")
    )
    expect(result.current.months).toHaveLength(0)
    expect(result.current.totalCount).toBe(0)
  })

  it("getMonthLabel returns a non-empty string for a valid month key", () => {
    const { result } = renderHook(() =>
      useGroupedByMonth(makePayments(), "payment_date")
    )
    const label = result.current.getMonthLabel("2026-01")
    expect(typeof label).toBe("string")
    expect(label.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// useGroupedByMonthWithTotals
// ============================================================================

describe("useGroupedByMonthWithTotals", () => {
  it("sums amounts per month", () => {
    const { result } = renderHook(() =>
      useGroupedByMonthWithTotals(makePayments(), "payment_date", "amount")
    )
    // January: 5000 + 3000 = 8000
    expect(result.current.monthTotals["2026-01"]).toBe(8000)
    // February: 7000
    expect(result.current.monthTotals["2026-02"]).toBe(7000)
    // March: 4000
    expect(result.current.monthTotals["2026-03"]).toBe(4000)
  })

  it("computes grand total across all months", () => {
    const { result } = renderHook(() =>
      useGroupedByMonthWithTotals(makePayments(), "payment_date", "amount")
    )
    expect(result.current.grandTotal).toBe(19000)
  })

  it("returns grandTotal of 0 for empty input", () => {
    const { result } = renderHook(() =>
      useGroupedByMonthWithTotals([], "payment_date", "amount")
    )
    expect(result.current.grandTotal).toBe(0)
  })

  it("handles non-numeric sum field gracefully (treats as 0)", () => {
    type Row = { id: number; date: string; note: string }
    const rows: Row[] = [{ id: 1, date: "2026-01-01", note: "N/A" }]
    const { result } = renderHook(() =>
      useGroupedByMonthWithTotals(rows, "date", "note")
    )
    expect(result.current.monthTotals["2026-01"]).toBe(0)
    expect(result.current.grandTotal).toBe(0)
  })

  it("groups items and reports totalCount correctly", () => {
    const { result } = renderHook(() =>
      useGroupedByMonthWithTotals(makePayments(), "payment_date", "amount")
    )
    expect(result.current.totalCount).toBe(4)
    expect(result.current.months).toHaveLength(3)
  })
})

// ============================================================================
// useGroupedByYear
// ============================================================================

describe("useGroupedByYear", () => {
  const multiYearItems = [
    { id: 1, date: "2024-06-01" },
    { id: 2, date: "2025-01-15" },
    { id: 3, date: "2025-11-30" },
    { id: 4, date: "2026-03-10" },
  ]

  it("groups items by year", () => {
    const { result } = renderHook(() =>
      useGroupedByYear(multiYearItems, "date")
    )
    expect(result.current.years).toContain("2024")
    expect(result.current.years).toContain("2025")
    expect(result.current.years).toContain("2026")
  })

  it("puts both 2025 items in the same group", () => {
    const { result } = renderHook(() =>
      useGroupedByYear(multiYearItems, "date")
    )
    expect(result.current.groupedItems["2025"]).toHaveLength(2)
  })

  it("sorts years newest-first by default", () => {
    const { result } = renderHook(() =>
      useGroupedByYear(multiYearItems, "date")
    )
    expect(result.current.years[0]).toBe("2026")
  })

  it("sorts years oldest-first when sortOrder is 'asc'", () => {
    const { result } = renderHook(() =>
      useGroupedByYear(multiYearItems, "date", "asc")
    )
    expect(result.current.years[0]).toBe("2024")
  })

  it("reports correct totalCount", () => {
    const { result } = renderHook(() =>
      useGroupedByYear(multiYearItems, "date")
    )
    expect(result.current.totalCount).toBe(4)
  })

  it("returns empty for empty input", () => {
    const { result } = renderHook(() =>
      useGroupedByYear([], "date")
    )
    expect(result.current.years).toHaveLength(0)
    expect(result.current.totalCount).toBe(0)
  })
})
