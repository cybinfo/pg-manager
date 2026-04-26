/**
 * Tests for metric factory functions from src/lib/columns/metrics.ts
 *
 * Tests the compute functions returned by each factory.
 * No icon components needed — passed as undefined.
 */

import {
  createTotalMetric,
  createCountMetric,
  createCountInMetric,
  createSumMetric,
  createFilteredSumMetric,
  createCustomMetric,
  MetricHighlights,
} from "@/lib/columns/metrics"

// ============================================================================
// Fixtures
// ============================================================================

type Item = Record<string, unknown>

const ITEMS: Item[] = [
  { status: "active", amount: 1000, type: "cash" },
  { status: "active", amount: 2000, type: "upi" },
  { status: "inactive", amount: 500, type: "cash" },
  { status: "overdue", amount: 3000, type: "bank" },
]

// ============================================================================
// createTotalMetric
// ============================================================================

describe("createTotalMetric", () => {
  it("returns the server total regardless of items", () => {
    const metric = createTotalMetric("total", "Total")
    expect(metric.compute(ITEMS, 999)).toBe(999)
  })

  it("has the correct id and label", () => {
    const metric = createTotalMetric("count", "Count")
    expect(metric.id).toBe("count")
    expect(metric.label).toBe("Count")
  })

  it("returns total even when items is empty", () => {
    const metric = createTotalMetric("total", "Total")
    expect(metric.compute([], 42)).toBe(42)
  })
})

// ============================================================================
// createCountMetric
// ============================================================================

describe("createCountMetric", () => {
  it("counts items matching the column/value filter", () => {
    const metric = createCountMetric<Item>("active", "Active", undefined, "status", "active")
    expect(metric.compute(ITEMS, ITEMS.length)).toBe(2)
  })

  it("returns 0 when no items match", () => {
    const metric = createCountMetric<Item>("expired", "Expired", undefined, "status", "expired")
    expect(metric.compute(ITEMS, ITEMS.length)).toBe(0)
  })

  it("includes serverFilter with correct operator", () => {
    const metric = createCountMetric<Item>("active", "Active", undefined, "status", "active")
    expect(metric.serverFilter?.operator).toBe("eq")
    expect(metric.serverFilter?.column).toBe("status")
    expect(metric.serverFilter?.value).toBe("active")
  })

  it("calls highlight function when provided", () => {
    const metric = createCountMetric<Item>(
      "overdue",
      "Overdue",
      undefined,
      "status",
      "overdue",
      { highlight: (v) => v > 0 }
    )
    const count = metric.compute(ITEMS, ITEMS.length) as number
    expect(metric.highlight?.(count)).toBe(true)
    expect(metric.highlight?.(0)).toBe(false)
  })
})

// ============================================================================
// createCountInMetric
// ============================================================================

describe("createCountInMetric", () => {
  it("counts items whose column value is in the given array", () => {
    const metric = createCountInMetric<Item>(
      "unpaid",
      "Unpaid",
      undefined,
      "status",
      ["active", "overdue"]
    )
    expect(metric.compute(ITEMS, ITEMS.length)).toBe(3)
  })

  it("returns 0 when no items match", () => {
    const metric = createCountInMetric<Item>(
      "none",
      "None",
      undefined,
      "status",
      ["pending", "draft"]
    )
    expect(metric.compute(ITEMS, ITEMS.length)).toBe(0)
  })

  it("includes serverFilter with in operator", () => {
    const metric = createCountInMetric<Item>(
      "unpaid",
      "Unpaid",
      undefined,
      "status",
      ["active", "overdue"]
    )
    expect(metric.serverFilter?.operator).toBe("in")
  })
})

// ============================================================================
// createSumMetric
// ============================================================================

describe("createSumMetric", () => {
  it("sums the column value from page items", () => {
    const metric = createSumMetric<Item>("total", "Total", undefined, "amount")
    const result = metric.compute(ITEMS, ITEMS.length)
    // All amounts: 1000 + 2000 + 500 + 3000 = 6500, formatted as ₹6,500
    expect(String(result)).toContain("6,500")
  })

  it("uses server data when available", () => {
    const metric = createSumMetric<Item>("total", "Total", undefined, "amount")
    const result = metric.compute(ITEMS, ITEMS.length, { total: 99999 })
    expect(String(result)).toContain("99,999")
  })

  it("treats missing values as 0", () => {
    const items: Item[] = [{ amount: 1000 }, { amount: undefined }]
    const metric = createSumMetric<Item>("total", "Total", undefined, "amount")
    const result = metric.compute(items, items.length)
    expect(String(result)).toContain("1,000")
  })

  it("with formatAsCurrency=false returns raw number", () => {
    const metric = createSumMetric<Item>("total", "Total", undefined, "amount", {
      formatAsCurrency: false,
    })
    const result = metric.compute(ITEMS, ITEMS.length)
    expect(result).toBe(6500)
  })
})

// ============================================================================
// createFilteredSumMetric — defaultLocalFilter operators
// ============================================================================

describe("createFilteredSumMetric", () => {
  describe("eq operator", () => {
    it("sums only items where column equals value", () => {
      const metric = createFilteredSumMetric<Item>(
        "cash",
        "Cash",
        undefined,
        "amount",
        { column: "type", operator: "eq", value: "cash" }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // cash items: 1000 + 500 = 1500
      expect(String(result)).toContain("1,500")
    })
  })

  describe("neq operator", () => {
    it("sums only items where column does not equal value", () => {
      const metric = createFilteredSumMetric<Item>(
        "noncash",
        "Non-Cash",
        undefined,
        "amount",
        { column: "type", operator: "neq", value: "cash" }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // non-cash: 2000 + 3000 = 5000
      expect(String(result)).toContain("5,000")
    })
  })

  describe("in operator", () => {
    it("sums items where column is in the given array", () => {
      const metric = createFilteredSumMetric<Item>(
        "cashOrUpi",
        "Cash or UPI",
        undefined,
        "amount",
        { column: "type", operator: "in", value: ["cash", "upi"] }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // cash+upi: 1000 + 2000 + 500 = 3500
      expect(String(result)).toContain("3,500")
    })
  })

  describe("not_in operator", () => {
    it("sums items where column is not in the given array", () => {
      const metric = createFilteredSumMetric<Item>(
        "bank",
        "Bank",
        undefined,
        "amount",
        { column: "type", operator: "not_in", value: ["cash", "upi"] }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // bank only: 3000
      expect(String(result)).toContain("3,000")
    })
  })

  describe("gt/gte/lt/lte operators", () => {
    it("gt: sums items where column > value", () => {
      const metric = createFilteredSumMetric<Item>(
        "large",
        "Large",
        undefined,
        "amount",
        { column: "amount", operator: "gt", value: 1000 }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // amounts > 1000: 2000 + 3000 = 5000
      expect(String(result)).toContain("5,000")
    })

    it("gte: sums items where column >= value", () => {
      const metric = createFilteredSumMetric<Item>(
        "gte",
        "GTE",
        undefined,
        "amount",
        { column: "amount", operator: "gte", value: 1000 }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // amounts >= 1000: 1000 + 2000 + 3000 = 6000
      expect(String(result)).toContain("6,000")
    })

    it("lt: sums items where column < value", () => {
      const metric = createFilteredSumMetric<Item>(
        "small",
        "Small",
        undefined,
        "amount",
        { column: "amount", operator: "lt", value: 1000 }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // amounts < 1000: 500
      expect(String(result)).toContain("500")
    })

    it("lte: sums items where column <= value", () => {
      const metric = createFilteredSumMetric<Item>(
        "lte",
        "LTE",
        undefined,
        "amount",
        { column: "amount", operator: "lte", value: 1000 }
      )
      const result = metric.compute(ITEMS, ITEMS.length)
      // amounts <= 1000: 1000 + 500 = 1500
      expect(String(result)).toContain("1,500")
    })
  })

  describe("is_null / is_not_null operators", () => {
    const itemsWithNull: Item[] = [
      { amount: 1000, email: null },
      { amount: 2000, email: "test@example.com" },
      { amount: 500, email: undefined },
    ]

    it("is_null: sums items where column is null or undefined", () => {
      const metric = createFilteredSumMetric<Item>(
        "noEmail",
        "No Email",
        undefined,
        "amount",
        { column: "email", operator: "is_null", value: null }
      )
      const result = metric.compute(itemsWithNull, itemsWithNull.length)
      // null+undefined: 1000 + 500 = 1500
      expect(String(result)).toContain("1,500")
    })

    it("is_not_null: sums items where column is not null", () => {
      const metric = createFilteredSumMetric<Item>(
        "withEmail",
        "With Email",
        undefined,
        "amount",
        { column: "email", operator: "is_not_null", value: null }
      )
      const result = metric.compute(itemsWithNull, itemsWithNull.length)
      // not null: 2000
      expect(String(result)).toContain("2,000")
    })
  })

  it("uses server data when available", () => {
    const metric = createFilteredSumMetric<Item>(
      "cash",
      "Cash",
      undefined,
      "amount",
      { column: "type", operator: "eq", value: "cash" }
    )
    const result = metric.compute(ITEMS, ITEMS.length, { cash: 50000 })
    expect(String(result)).toContain("50,000")
  })

  it("uses custom localFilter when provided", () => {
    const metric = createFilteredSumMetric<Item>(
      "custom",
      "Custom",
      undefined,
      "amount",
      { column: "status", operator: "eq", value: "active" },
      { localFilter: (item) => (item as Item).amount === 1000 }
    )
    const result = metric.compute(ITEMS, ITEMS.length)
    expect(String(result)).toContain("1,000")
  })
})

// ============================================================================
// MetricHighlights
// ============================================================================

describe("MetricHighlights", () => {
  describe("whenPositive", () => {
    it("returns true for positive numbers", () => {
      expect(MetricHighlights.whenPositive(1)).toBe(true)
      expect(MetricHighlights.whenPositive(100)).toBe(true)
    })

    it("returns false for zero", () => {
      expect(MetricHighlights.whenPositive(0)).toBe(false)
    })

    it("returns false for negative numbers", () => {
      expect(MetricHighlights.whenPositive(-1)).toBe(false)
    })

    it("parses formatted currency strings", () => {
      expect(MetricHighlights.whenPositive("₹1,500")).toBe(true)
      expect(MetricHighlights.whenPositive("₹0")).toBe(false)
    })
  })

  describe("whenNotZero", () => {
    it("returns true for non-zero numbers", () => {
      expect(MetricHighlights.whenNotZero(5)).toBe(true)
    })

    it("returns false for zero", () => {
      expect(MetricHighlights.whenNotZero(0)).toBe(false)
    })

    it("returns false for '₹0' string", () => {
      expect(MetricHighlights.whenNotZero("₹0")).toBe(false)
    })

    it("returns false for '0' string", () => {
      expect(MetricHighlights.whenNotZero("0")).toBe(false)
    })

    it("returns true for non-zero string", () => {
      expect(MetricHighlights.whenNotZero("₹5,000")).toBe(true)
    })
  })

  describe("whenAbove", () => {
    it("returns true when value >= threshold", () => {
      const check = MetricHighlights.whenAbove(10)
      expect(check(10)).toBe(true)
      expect(check(11)).toBe(true)
    })

    it("returns false when value < threshold", () => {
      const check = MetricHighlights.whenAbove(10)
      expect(check(9)).toBe(false)
    })

    it("parses formatted strings", () => {
      const check = MetricHighlights.whenAbove(1000)
      expect(check("₹1,500")).toBe(true)
      expect(check("₹500")).toBe(false)
    })
  })

  describe("always / never", () => {
    it("always returns true", () => {
      expect(MetricHighlights.always()).toBe(true)
    })

    it("never returns false", () => {
      expect(MetricHighlights.never()).toBe(false)
    })
  })
})

// ============================================================================
// createCustomMetric
// ============================================================================

describe("createCustomMetric", () => {
  it("calls the provided compute function with items and total", () => {
    const computeFn = jest.fn().mockReturnValue(42)
    const metric = createCustomMetric<Item>("custom", "Custom", undefined, computeFn)
    const result = metric.compute(ITEMS, 10)
    expect(result).toBe(42)
    expect(computeFn).toHaveBeenCalledWith(ITEMS, 10)
  })

  it("has the correct id and label", () => {
    const metric = createCustomMetric<Item>("myId", "My Label", undefined, () => 0)
    expect(metric.id).toBe("myId")
    expect(metric.label).toBe("My Label")
  })

  it("passes serverData to compute", () => {
    const computeFn = jest.fn().mockReturnValue("result")
    const metric = createCustomMetric<Item>("x", "X", undefined, computeFn)
    metric.compute([], 0, { x: 99 })
    expect(computeFn).toHaveBeenCalledWith([], 0, { x: 99 })
  })
})
