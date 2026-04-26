/**
 * Tests for pure helper functions used by the generate-bills cron route.
 *
 * The route itself (src/app/api/cron/generate-bills/route.ts) is a single
 * large async function that orchestrates Supabase queries. The DB-touching
 * portions are not tested here. Instead, all extractable pure logic has been
 * moved to src/lib/billing/generate-bills.helpers.ts and is tested below.
 *
 * Tested helpers:
 *  - buildRentLineItem
 *  - buildChargeLineItem
 *  - shouldIncludeCharge
 *  - sumLineItems
 *  - calculatePreviousBalance
 *  - calculateDueDate
 *  - calculateBillingPeriod
 *  - shouldSkipBillingDay
 *  - alreadyGeneratedThisMonth
 */

import {
  buildRentLineItem,
  buildChargeLineItem,
  shouldIncludeCharge,
  sumLineItems,
  calculatePreviousBalance,
  calculateDueDate,
  calculateBillingPeriod,
  shouldSkipBillingDay,
  alreadyGeneratedThisMonth,
  type LineItem,
  type ChargeTypeInfo,
  type UnpaidBill,
} from "@/lib/billing/generate-bills.helpers"

// ============================================================================
// Fixtures
// ============================================================================

const CURRENT_MONTH = "April 2026"

function makeRentItem(amount = 10000): LineItem {
  return { type: "Rent", description: `Monthly Rent - ${CURRENT_MONTH}`, amount }
}

// ============================================================================
// buildRentLineItem
// ============================================================================

describe("buildRentLineItem", () => {
  describe("happy path", () => {
    it("returns a Rent line item for a valid positive number", () => {
      const item = buildRentLineItem(10000, CURRENT_MONTH)
      expect(item).toEqual({
        type: "Rent",
        description: `Monthly Rent - ${CURRENT_MONTH}`,
        amount: 10000,
      })
    })

    it("accepts a numeric string", () => {
      const item = buildRentLineItem("7500", CURRENT_MONTH)
      expect(item).not.toBeNull()
      expect(item!.amount).toBe(7500)
    })

    it("accepts a decimal rent amount", () => {
      const item = buildRentLineItem(9999.5, CURRENT_MONTH)
      expect(item).not.toBeNull()
      expect(item!.amount).toBe(9999.5)
    })

    it("includes the current month in the description", () => {
      const item = buildRentLineItem(5000, "March 2026")
      expect(item!.description).toBe("Monthly Rent - March 2026")
    })
  })

  describe("edge cases — invalid rent", () => {
    it("returns null for zero", () => {
      expect(buildRentLineItem(0, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for a negative number", () => {
      expect(buildRentLineItem(-500, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for null", () => {
      expect(buildRentLineItem(null, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for undefined", () => {
      expect(buildRentLineItem(undefined, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for a non-numeric string", () => {
      expect(buildRentLineItem("abc", CURRENT_MONTH)).toBeNull()
    })

    it("returns null for an empty string", () => {
      expect(buildRentLineItem("", CURRENT_MONTH)).toBeNull()
    })

    it("returns null for NaN", () => {
      expect(buildRentLineItem(NaN, CURRENT_MONTH)).toBeNull()
    })
  })
})

// ============================================================================
// buildChargeLineItem
// ============================================================================

describe("buildChargeLineItem", () => {
  const chargeType: ChargeTypeInfo = { name: "Electricity", code: "electricity" }

  describe("happy path", () => {
    it("builds a charge line item with charge type name and for_period", () => {
      const item = buildChargeLineItem(2000, chargeType, "March 2026", CURRENT_MONTH)
      expect(item).toEqual({
        type: "Electricity",
        description: "March 2026",
        amount: 2000,
      })
    })

    it("falls back to currentMonth when for_period is null", () => {
      const item = buildChargeLineItem(1500, chargeType, null, CURRENT_MONTH)
      expect(item!.description).toBe(CURRENT_MONTH)
    })

    it("falls back to currentMonth when for_period is undefined", () => {
      const item = buildChargeLineItem(1500, chargeType, undefined, CURRENT_MONTH)
      expect(item!.description).toBe(CURRENT_MONTH)
    })

    it("falls back to 'Charge' type when chargeType is null", () => {
      const item = buildChargeLineItem(500, null, null, CURRENT_MONTH)
      expect(item!.type).toBe("Charge")
    })

    it("falls back to 'Charge' type when chargeType has no name", () => {
      const item = buildChargeLineItem(500, { code: "misc" }, null, CURRENT_MONTH)
      expect(item!.type).toBe("Charge")
    })
  })

  describe("edge cases — invalid amounts", () => {
    it("returns null for zero amount", () => {
      expect(buildChargeLineItem(0, chargeType, null, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for negative amount", () => {
      expect(buildChargeLineItem(-100, chargeType, null, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for null amount", () => {
      expect(buildChargeLineItem(null, chargeType, null, CURRENT_MONTH)).toBeNull()
    })

    it("returns null for non-numeric string amount", () => {
      expect(buildChargeLineItem("n/a", chargeType, null, CURRENT_MONTH)).toBeNull()
    })

    it("accepts a string amount that represents a valid positive number", () => {
      const item = buildChargeLineItem("300", chargeType, null, CURRENT_MONTH)
      expect(item).not.toBeNull()
      expect(item!.amount).toBe(300)
    })
  })
})

// ============================================================================
// shouldIncludeCharge
// ============================================================================

describe("shouldIncludeCharge", () => {
  const electricityType: ChargeTypeInfo = { name: "Electricity", code: "electricity" }
  const waterType: ChargeTypeInfo = { name: "Water", code: "water" }
  const noCodeType: ChargeTypeInfo = { name: "Misc" }

  describe("no restriction map — always include", () => {
    it("includes when includedChargeTypes is undefined", () => {
      expect(shouldIncludeCharge(electricityType, undefined)).toBe(true)
    })

    it("includes when includedChargeTypes is null", () => {
      expect(shouldIncludeCharge(electricityType, null)).toBe(true)
    })
  })

  describe("restriction map present", () => {
    it("includes a charge type explicitly set to true", () => {
      expect(shouldIncludeCharge(electricityType, { electricity: true, water: false })).toBe(true)
    })

    it("excludes a charge type explicitly set to false", () => {
      expect(shouldIncludeCharge(electricityType, { electricity: false })).toBe(false)
    })

    it("includes a charge type not mentioned in the map (undefined = include)", () => {
      expect(shouldIncludeCharge(waterType, { electricity: false })).toBe(true)
    })

    it("includes a charge type with no code even when map has entries", () => {
      expect(shouldIncludeCharge(noCodeType, { electricity: false })).toBe(true)
    })

    it("includes when chargeType is null", () => {
      expect(shouldIncludeCharge(null, { electricity: false })).toBe(true)
    })

    it("includes when chargeType code is empty string", () => {
      expect(shouldIncludeCharge({ code: "" }, { electricity: false })).toBe(true)
    })
  })
})

// ============================================================================
// sumLineItems
// ============================================================================

describe("sumLineItems", () => {
  it("returns 0 for an empty array", () => {
    expect(sumLineItems([])).toBe(0)
  })

  it("sums a single item", () => {
    expect(sumLineItems([makeRentItem(10000)])).toBe(10000)
  })

  it("sums multiple items correctly", () => {
    const items: LineItem[] = [
      makeRentItem(10000),
      { type: "Electricity", description: "March 2026", amount: 1500 },
      { type: "Water", description: "March 2026", amount: 500 },
    ]
    expect(sumLineItems(items)).toBe(12000)
  })

  it("handles decimal amounts without rounding errors for common values", () => {
    const items: LineItem[] = [
      { type: "A", description: "x", amount: 100.5 },
      { type: "B", description: "x", amount: 200.5 },
    ]
    expect(sumLineItems(items)).toBeCloseTo(301)
  })

  it("returns 0 when all items have 0 amount (edge case: should not occur in practice)", () => {
    const items: LineItem[] = [
      { type: "A", description: "x", amount: 0 },
      { type: "B", description: "x", amount: 0 },
    ]
    expect(sumLineItems(items)).toBe(0)
  })
})

// ============================================================================
// calculatePreviousBalance
// ============================================================================

describe("calculatePreviousBalance", () => {
  it("returns 0 for an empty array", () => {
    expect(calculatePreviousBalance([])).toBe(0)
  })

  it("sums positive balances from multiple bills", () => {
    const bills: UnpaidBill[] = [{ balance_due: 5000 }, { balance_due: 3000 }, { balance_due: 2000 }]
    expect(calculatePreviousBalance(bills)).toBe(10000)
  })

  it("skips null balance_due values safely (treats as 0)", () => {
    const bills: UnpaidBill[] = [{ balance_due: 4000 }, { balance_due: null }]
    expect(calculatePreviousBalance(bills)).toBe(4000)
  })

  it("skips zero balance_due (parsePositiveNumber returns null for 0)", () => {
    const bills: UnpaidBill[] = [{ balance_due: 5000 }, { balance_due: 0 }]
    expect(calculatePreviousBalance(bills)).toBe(5000)
  })

  it("handles string balance_due values (returned by Supabase as numeric strings)", () => {
    const bills: UnpaidBill[] = [{ balance_due: "2500" }, { balance_due: "1500" }]
    expect(calculatePreviousBalance(bills)).toBe(4000)
  })

  it("skips negative balance_due values defensively", () => {
    const bills: UnpaidBill[] = [{ balance_due: 3000 }, { balance_due: -500 }]
    expect(calculatePreviousBalance(bills)).toBe(3000)
  })
})

// ============================================================================
// calculateDueDate
// ============================================================================

describe("calculateDueDate", () => {
  describe("happy path", () => {
    it("adds the offset days to today's date", () => {
      const today = new Date("2026-04-01")
      expect(calculateDueDate(today, 10)).toBe("2026-04-11")
    })

    it("handles zero offset (due on same day)", () => {
      const today = new Date("2026-04-15")
      expect(calculateDueDate(today, 0)).toBe("2026-04-15")
    })

    it("crosses a month boundary correctly", () => {
      const today = new Date("2026-04-25")
      expect(calculateDueDate(today, 10)).toBe("2026-05-05")
    })

    it("crosses a year boundary correctly", () => {
      const today = new Date("2025-12-28")
      expect(calculateDueDate(today, 7)).toBe("2026-01-04")
    })
  })

  describe("February edge cases", () => {
    it("lands on the last day of February in a non-leap year", () => {
      const today = new Date("2025-02-20")
      expect(calculateDueDate(today, 8)).toBe("2025-02-28")
    })

    it("crosses into March from February in a non-leap year", () => {
      const today = new Date("2025-02-25")
      expect(calculateDueDate(today, 5)).toBe("2025-03-02")
    })

    it("handles leap year February correctly", () => {
      const today = new Date("2024-02-27")
      expect(calculateDueDate(today, 2)).toBe("2024-02-29")
    })
  })

  describe("does not mutate the input date", () => {
    it("leaves the original today Date unchanged", () => {
      const today = new Date("2026-04-01")
      const originalTime = today.getTime()
      calculateDueDate(today, 15)
      expect(today.getTime()).toBe(originalTime)
    })
  })
})

// ============================================================================
// calculateBillingPeriod
// ============================================================================

describe("calculateBillingPeriod", () => {
  describe("happy path", () => {
    it("returns first and last day of the current month", () => {
      const today = new Date("2026-04-15")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-04-01")
      expect(periodEnd).toBe("2026-04-30")
    })

    it("calculates January correctly (31 days)", () => {
      const today = new Date("2026-01-10")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-01-01")
      expect(periodEnd).toBe("2026-01-31")
    })

    it("calculates February in a non-leap year (28 days)", () => {
      const today = new Date("2025-02-14")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2025-02-01")
      expect(periodEnd).toBe("2025-02-28")
    })

    it("calculates February in a leap year (29 days)", () => {
      const today = new Date("2024-02-20")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2024-02-01")
      expect(periodEnd).toBe("2024-02-29")
    })

    it("calculates March correctly (31 days)", () => {
      const today = new Date("2026-03-01")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-03-01")
      expect(periodEnd).toBe("2026-03-31")
    })

    it("calculates December correctly — year boundary", () => {
      const today = new Date("2025-12-15")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2025-12-01")
      expect(periodEnd).toBe("2025-12-31")
    })

    it("calculates a 30-day month (June)", () => {
      const today = new Date("2026-06-10")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-06-01")
      expect(periodEnd).toBe("2026-06-30")
    })
  })

  describe("billing day is the first of the month", () => {
    it("period start and end are correct when billing runs on the 1st", () => {
      const today = new Date("2026-05-01")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-05-01")
      expect(periodEnd).toBe("2026-05-31")
    })
  })

  describe("billing day is the last of the month", () => {
    it("period start and end are correct when billing runs on the 31st", () => {
      const today = new Date("2026-03-31")
      const { periodStart, periodEnd } = calculateBillingPeriod(today)
      expect(periodStart).toBe("2026-03-01")
      expect(periodEnd).toBe("2026-03-31")
    })
  })
})

// ============================================================================
// shouldSkipBillingDay
// ============================================================================

describe("shouldSkipBillingDay", () => {
  it("returns false (do NOT skip) when today matches the billing day", () => {
    expect(shouldSkipBillingDay(5, 5)).toBe(false)
  })

  it("returns true (skip) when today is before the billing day", () => {
    expect(shouldSkipBillingDay(3, 5)).toBe(true)
  })

  it("returns true (skip) when today is after the billing day", () => {
    expect(shouldSkipBillingDay(10, 5)).toBe(true)
  })

  it("returns false when billing day is 1 and today is 1st", () => {
    expect(shouldSkipBillingDay(1, 1)).toBe(false)
  })

  it("returns false when billing day is 28 and today is 28th", () => {
    expect(shouldSkipBillingDay(28, 28)).toBe(false)
  })

  it("returns true when billing day is 31 but today is 30", () => {
    expect(shouldSkipBillingDay(30, 31)).toBe(true)
  })
})

// ============================================================================
// alreadyGeneratedThisMonth
// ============================================================================

describe("alreadyGeneratedThisMonth", () => {
  it("returns true when lastGeneratedMonth equals currentMonth", () => {
    expect(alreadyGeneratedThisMonth("April 2026", "April 2026")).toBe(true)
  })

  it("returns false when lastGeneratedMonth is a previous month", () => {
    expect(alreadyGeneratedThisMonth("March 2026", "April 2026")).toBe(false)
  })

  it("returns false when lastGeneratedMonth is null (never generated)", () => {
    expect(alreadyGeneratedThisMonth(null, "April 2026")).toBe(false)
  })

  it("returns false when lastGeneratedMonth is empty string", () => {
    expect(alreadyGeneratedThisMonth("" as unknown as null, "April 2026")).toBe(false)
  })

  it("returns false when lastGeneratedMonth is a future month (anomalous case)", () => {
    expect(alreadyGeneratedThisMonth("May 2026", "April 2026")).toBe(false)
  })

  it("returns true for a mid-year month (idempotency guard)", () => {
    expect(alreadyGeneratedThisMonth("August 2025", "August 2025")).toBe(true)
  })
})

// ============================================================================
// Integration-style: full line-item assembly pipeline
// ============================================================================

describe("bill line-item assembly pipeline", () => {
  it("correctly builds and sums items for a tenant with rent and extra charges", () => {
    const rentItem = buildRentLineItem(12000, CURRENT_MONTH)!
    const elecItem = buildChargeLineItem(
      1800,
      { name: "Electricity", code: "electricity" },
      "March 2026",
      CURRENT_MONTH
    )!
    const waterItem = buildChargeLineItem(
      400,
      { name: "Water", code: "water" },
      null,
      CURRENT_MONTH
    )!

    expect(rentItem).not.toBeNull()
    expect(elecItem).not.toBeNull()
    expect(waterItem).not.toBeNull()

    const lineItems: LineItem[] = [rentItem, elecItem, waterItem]
    expect(sumLineItems(lineItems)).toBe(14200)
  })

  it("totalAmountDue = subtotal + previousBalance", () => {
    const lineItems: LineItem[] = [
      makeRentItem(10000),
      { type: "Electricity", description: CURRENT_MONTH, amount: 1000 },
    ]
    const subtotal = sumLineItems(lineItems) // 11000
    const previousBalance = calculatePreviousBalance([
      { balance_due: 5000 },
      { balance_due: 2000 },
    ]) // 7000
    expect(subtotal + previousBalance).toBe(18000)
  })

  it("skips excluded charge types before adding to line items", () => {
    const charges = [
      { amount: 1800, type: { name: "Electricity", code: "electricity" } },
      { amount: 400, type: { name: "Water", code: "water" } },
    ]
    const includedChargeTypes: Record<string, boolean> = { electricity: true, water: false }
    const lineItems: LineItem[] = [makeRentItem(10000)]

    for (const charge of charges) {
      if (!shouldIncludeCharge(charge.type, includedChargeTypes)) continue
      const item = buildChargeLineItem(charge.amount, charge.type, null, CURRENT_MONTH)
      if (item) lineItems.push(item)
    }

    // Only rent + electricity, water is excluded
    expect(lineItems).toHaveLength(2)
    expect(sumLineItems(lineItems)).toBe(11800)
  })

  it("zero-charge tenant: only rent item, no previous balance", () => {
    const lineItems: LineItem[] = [makeRentItem(8000)]
    const subtotal = sumLineItems(lineItems)
    const previousBalance = calculatePreviousBalance([])
    expect(subtotal + previousBalance).toBe(8000)
  })
})
