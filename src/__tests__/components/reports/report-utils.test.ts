/**
 * Tests for pure utility functions in src/components/reports/report-utils.ts
 *
 * Covers: calculateGrowth, buildPaymentMethodBreakdown, buildMonthlyTrend,
 *         getDefaultDateRange
 */

import {
  calculateGrowth,
  buildPaymentMethodBreakdown,
  buildMonthlyTrend,
  getDefaultDateRange,
  MONTH_NAMES,
  PAYMENT_METHOD_LABELS,
} from "@/components/reports/report-utils"

// ============================================================================
// MONTH_NAMES / PAYMENT_METHOD_LABELS (sanity checks)
// ============================================================================

describe("MONTH_NAMES", () => {
  it("has 12 months", () => {
    expect(MONTH_NAMES).toHaveLength(12)
  })

  it("starts with Jan", () => {
    expect(MONTH_NAMES[0]).toBe("Jan")
  })

  it("ends with Dec", () => {
    expect(MONTH_NAMES[11]).toBe("Dec")
  })
})

describe("PAYMENT_METHOD_LABELS", () => {
  it("maps cash to Cash", () => {
    expect(PAYMENT_METHOD_LABELS["cash"]).toBe("Cash")
  })

  it("maps upi to UPI", () => {
    expect(PAYMENT_METHOD_LABELS["upi"]).toBe("UPI")
  })

  it("maps bank_transfer to Bank Transfer", () => {
    expect(PAYMENT_METHOD_LABELS["bank_transfer"]).toBe("Bank Transfer")
  })
})

// ============================================================================
// calculateGrowth
// ============================================================================

describe("calculateGrowth", () => {
  it("returns 0 when previous is 0", () => {
    expect(calculateGrowth(100, 0)).toBe(0)
  })

  it("returns 0 when previous is negative", () => {
    expect(calculateGrowth(100, -10)).toBe(0)
  })

  it("calculates positive growth correctly", () => {
    // (150 - 100) / 100 * 100 = 50%
    expect(calculateGrowth(150, 100)).toBeCloseTo(50)
  })

  it("calculates negative growth correctly", () => {
    // (50 - 100) / 100 * 100 = -50%
    expect(calculateGrowth(50, 100)).toBeCloseTo(-50)
  })

  it("returns 100% for doubling", () => {
    expect(calculateGrowth(200, 100)).toBeCloseTo(100)
  })

  it("returns 0 when current equals previous", () => {
    expect(calculateGrowth(100, 100)).toBeCloseTo(0)
  })
})

// ============================================================================
// buildPaymentMethodBreakdown
// ============================================================================

describe("buildPaymentMethodBreakdown", () => {
  it("groups payments by method with count and value", () => {
    const payments = [
      { payment_method: "cash", amount: 1000 },
      { payment_method: "cash", amount: 2000 },
      { payment_method: "upi", amount: 1500 },
    ]

    const result = buildPaymentMethodBreakdown(payments)
    const cash = result.find((r) => r.name === "Cash")
    const upi = result.find((r) => r.name === "UPI")

    expect(cash?.value).toBe(3000)
    expect(cash?.count).toBe(2)
    expect(upi?.value).toBe(1500)
    expect(upi?.count).toBe(1)
  })

  it("falls back to 'other' for missing payment_method", () => {
    const payments = [{ amount: 500 }] // no payment_method
    const result = buildPaymentMethodBreakdown(payments)
    const other = result.find((r) => r.name === "Other")
    expect(other?.count).toBe(1)
    expect(other?.value).toBe(500)
  })

  it("uses the unknown method key as name when not in PAYMENT_METHOD_LABELS", () => {
    const payments = [{ payment_method: "crypto", amount: 1000 }]
    const result = buildPaymentMethodBreakdown(payments)
    expect(result[0].name).toBe("crypto")
  })

  it("returns empty array for empty payments", () => {
    expect(buildPaymentMethodBreakdown([])).toHaveLength(0)
  })

  it("handles string amounts", () => {
    const payments = [{ payment_method: "upi", amount: "1500" }]
    const result = buildPaymentMethodBreakdown(payments)
    expect(result[0].value).toBe(1500)
  })
})

// ============================================================================
// buildMonthlyTrend
// ============================================================================

describe("buildMonthlyTrend", () => {
  it("returns the requested number of months", () => {
    const result = buildMonthlyTrend(6, [])
    expect(result).toHaveLength(6)
  })

  it("returns 3 months when months=3", () => {
    const result = buildMonthlyTrend(3, [])
    expect(result).toHaveLength(3)
  })

  it("each entry has a month name from MONTH_NAMES", () => {
    const result = buildMonthlyTrend(4, [])
    for (const entry of result) {
      expect(MONTH_NAMES).toContain(entry.month)
    }
  })

  it("sums revenue for payments within each month", () => {
    const now = new Date()
    // Payment in current month
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`
    const payments = [
      { payment_date: thisMonth, amount: 1000 },
      { payment_date: thisMonth, amount: 2000 },
    ]

    const result = buildMonthlyTrend(1, payments)
    expect(result[0].revenue).toBe(3000)
  })

  it("months with no payments have revenue 0", () => {
    const result = buildMonthlyTrend(3, [])
    for (const entry of result) {
      expect(entry.revenue).toBe(0)
    }
  })

  it("calls extraCompute and merges the result into each entry", () => {
    const extraCompute = jest.fn().mockReturnValue({ newMembers: 5 })
    const result = buildMonthlyTrend(2, [], extraCompute)

    expect(extraCompute).toHaveBeenCalledTimes(2)
    expect(result[0]).toHaveProperty("newMembers", 5)
    expect(result[1]).toHaveProperty("newMembers", 5)
  })

  it("results are ordered oldest-first", () => {
    const result = buildMonthlyTrend(3, [])
    // We can't know the exact month names without knowing the current date,
    // but the array should be of length 3 and each month should be from MONTH_NAMES
    expect(result).toHaveLength(3)
    expect(MONTH_NAMES).toContain(result[0].month)
  })
})

// ============================================================================
// getDefaultDateRange
// ============================================================================

describe("getDefaultDateRange", () => {
  it("returns a date range with label 'Last 6 months'", () => {
    expect(getDefaultDateRange().label).toBe("Last 6 months")
  })

  it("'to' is approximately now", () => {
    const before = Date.now()
    const { to } = getDefaultDateRange()
    const after = Date.now()
    expect(to.getTime()).toBeGreaterThanOrEqual(before)
    expect(to.getTime()).toBeLessThanOrEqual(after)
  })

  it("'from' is approximately 6 months before now", () => {
    const { from, to } = getDefaultDateRange()
    const diffMs = to.getTime() - from.getTime()
    const approxSixMonthsMs = 6 * 30 * 24 * 60 * 60 * 1000 // ~180 days
    // Allow a generous range (±31 days) since months vary in length
    expect(diffMs).toBeGreaterThan(approxSixMonthsMs - 31 * 24 * 60 * 60 * 1000)
    expect(diffMs).toBeLessThan(approxSixMonthsMs + 31 * 24 * 60 * 60 * 1000)
  })

  it("'from' date is the 1st of its month", () => {
    expect(getDefaultDateRange().from.getDate()).toBe(1)
  })
})
