/**
 * Tests for pure utility functions exported from domain type files.
 *
 * Covers:
 * - exit-clearance.types.ts: calculateFinalAmount, isRefundDue, getDaysStayed
 * - rooms.types.ts: getRoomStatus, getAvailableBeds
 * - journey.types.ts: createDefaultAnalytics, createDefaultFinancialSummary, createDefaultInsights
 */

import {
  calculateFinalAmount,
  isRefundDue,
  getDaysStayed,
} from "@/types/exit-clearance.types"

import {
  getRoomStatus,
  getAvailableBeds,
} from "@/types/rooms.types"

import {
  createDefaultAnalytics,
  createDefaultFinancialSummary,
  createDefaultInsights,
} from "@/types/journey.types"

// ============================================================================
// calculateFinalAmount
// ============================================================================

describe("calculateFinalAmount", () => {
  it("returns dues minus refundable when no deductions", () => {
    expect(calculateFinalAmount(10000, 5000, [])).toBe(5000)
  })

  it("adds deductions to the result", () => {
    const deductions = [
      { reason: "Damage", amount: 1000 },
      { reason: "Cleaning", amount: 500 },
    ]
    // 10000 dues - 5000 refundable + 1500 deductions = 6500
    expect(calculateFinalAmount(10000, 5000, deductions)).toBe(6500)
  })

  it("returns negative when refundable exceeds dues", () => {
    // 2000 dues - 5000 refundable = -3000 (owner owes tenant)
    expect(calculateFinalAmount(2000, 5000, [])).toBe(-3000)
  })

  it("returns 0 when dues equals refundable and no deductions", () => {
    expect(calculateFinalAmount(5000, 5000, [])).toBe(0)
  })

  it("handles zero dues and zero refundable with deductions", () => {
    expect(calculateFinalAmount(0, 0, [{ reason: "Fee", amount: 200 }])).toBe(200)
  })
})

// ============================================================================
// isRefundDue
// ============================================================================

describe("isRefundDue", () => {
  it("returns true when finalAmount is negative", () => {
    expect(isRefundDue(-1000)).toBe(true)
    expect(isRefundDue(-1)).toBe(true)
  })

  it("returns false when finalAmount is zero", () => {
    expect(isRefundDue(0)).toBe(false)
  })

  it("returns false when finalAmount is positive", () => {
    expect(isRefundDue(5000)).toBe(false)
  })
})

// ============================================================================
// getDaysStayed
// ============================================================================

describe("getDaysStayed", () => {
  it("returns 0 for same-day check-in and exit", () => {
    expect(getDaysStayed("2024-06-01", "2024-06-01")).toBe(0)
  })

  it("returns correct days for a simple range", () => {
    expect(getDaysStayed("2024-01-01", "2024-01-31")).toBe(30)
  })

  it("returns correct days across months", () => {
    expect(getDaysStayed("2024-06-01", "2024-07-01")).toBe(30)
  })

  it("returns correct days for a full year", () => {
    expect(getDaysStayed("2024-01-01", "2025-01-01")).toBe(366) // 2024 is leap year
  })

  it("returns 1 for consecutive days", () => {
    expect(getDaysStayed("2024-03-15", "2024-03-16")).toBe(1)
  })
})

// ============================================================================
// getRoomStatus
// ============================================================================

describe("getRoomStatus", () => {
  it("returns 'occupied' when occupied_beds equals total_beds", () => {
    expect(getRoomStatus({ total_beds: 2, occupied_beds: 2 } as Parameters<typeof getRoomStatus>[0])).toBe("occupied")
  })

  it("returns 'occupied' when occupied_beds > 0 but < total_beds", () => {
    // partial occupancy still returns 'occupied' per current impl
    expect(getRoomStatus({ total_beds: 4, occupied_beds: 2 } as Parameters<typeof getRoomStatus>[0])).toBe("occupied")
  })

  it("returns 'available' when occupied_beds is 0", () => {
    expect(getRoomStatus({ total_beds: 4, occupied_beds: 0 } as Parameters<typeof getRoomStatus>[0])).toBe("available")
  })

  it("returns 'occupied' when single bed room is occupied", () => {
    expect(getRoomStatus({ total_beds: 1, occupied_beds: 1 } as Parameters<typeof getRoomStatus>[0])).toBe("occupied")
  })
})

// ============================================================================
// getAvailableBeds
// ============================================================================

describe("getAvailableBeds", () => {
  it("returns total_beds when no beds are occupied", () => {
    expect(getAvailableBeds({ total_beds: 4, occupied_beds: 0 } as Parameters<typeof getAvailableBeds>[0])).toBe(4)
  })

  it("returns correct available count for partial occupancy", () => {
    expect(getAvailableBeds({ total_beds: 4, occupied_beds: 2 } as Parameters<typeof getAvailableBeds>[0])).toBe(2)
  })

  it("returns 0 when fully occupied", () => {
    expect(getAvailableBeds({ total_beds: 3, occupied_beds: 3 } as Parameters<typeof getAvailableBeds>[0])).toBe(0)
  })

  it("returns total_beds for single bed room with no occupants", () => {
    expect(getAvailableBeds({ total_beds: 1, occupied_beds: 0 } as Parameters<typeof getAvailableBeds>[0])).toBe(1)
  })
})

// ============================================================================
// createDefaultAnalytics
// ============================================================================

describe("createDefaultAnalytics", () => {
  it("returns an object with all zero numeric fields", () => {
    const a = createDefaultAnalytics()
    expect(a.total_stay_days).toBe(0)
    expect(a.total_revenue).toBe(0)
    expect(a.total_complaints).toBe(0)
    expect(a.total_payments).toBe(0)
  })

  it("returns 'pending' for police_verification_status", () => {
    expect(createDefaultAnalytics().police_verification_status).toBe("pending")
  })

  it("returns a new object each time (not shared reference)", () => {
    const a1 = createDefaultAnalytics()
    const a2 = createDefaultAnalytics()
    expect(a1).not.toBe(a2)
  })
})

// ============================================================================
// createDefaultFinancialSummary
// ============================================================================

describe("createDefaultFinancialSummary", () => {
  it("returns an object with all zero numeric fields", () => {
    const f = createDefaultFinancialSummary()
    expect(f.total_billed).toBe(0)
    expect(f.total_paid).toBe(0)
    expect(f.total_outstanding).toBe(0)
  })

  it("returns null for next_due_date", () => {
    expect(createDefaultFinancialSummary().next_due_date).toBeNull()
  })

  it("returns empty breakdown array", () => {
    expect(createDefaultFinancialSummary().breakdown).toEqual([])
  })
})

// ============================================================================
// createDefaultInsights
// ============================================================================

describe("createDefaultInsights", () => {
  it("returns score of 50 for payment_reliability_score", () => {
    expect(createDefaultInsights().payment_reliability_score).toBe(50)
  })

  it("returns 'low' churn risk", () => {
    expect(createDefaultInsights().churn_risk_level).toBe("low")
  })

  it("returns empty arrays for alerts and recommendations", () => {
    const i = createDefaultInsights()
    expect(i.active_alerts).toEqual([])
    expect(i.recommendations).toEqual([])
  })

  it("returns 'stable' as payment_reliability_trend", () => {
    expect(createDefaultInsights().payment_reliability_trend).toBe("stable")
  })
})
