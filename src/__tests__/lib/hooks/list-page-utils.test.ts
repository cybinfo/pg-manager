/**
 * Tests for getNestedValue and applyServerFilter from src/lib/hooks/list-page/utils.ts
 *
 * Covers dot-notation path resolution on nested objects and
 * server filter operator dispatch to the Supabase query chain.
 */

import { getNestedValue, applyServerFilter } from "@/lib/hooks/list-page/utils"

describe("getNestedValue", () => {
  describe("flat paths", () => {
    it("returns top-level value", () => {
      const obj = { name: "Rajat", status: "active" }
      expect(getNestedValue(obj, "name")).toBe("Rajat")
    })

    it("returns undefined for missing key", () => {
      const obj = { name: "Rajat" }
      expect(getNestedValue(obj, "email")).toBeUndefined()
    })
  })

  describe("dot-notation paths", () => {
    it("resolves one level deep", () => {
      const obj = { person: { name: "Rajat" } }
      expect(getNestedValue(obj, "person.name")).toBe("Rajat")
    })

    it("resolves two levels deep", () => {
      const obj = { property: { address: { city: "Mumbai" } } }
      expect(getNestedValue(obj, "property.address.city")).toBe("Mumbai")
    })

    it("returns undefined when intermediate key is missing", () => {
      const obj = { person: null }
      expect(getNestedValue(obj, "person.name")).toBeUndefined()
    })

    it("returns undefined when intermediate key is undefined", () => {
      const obj = { person: undefined }
      expect(getNestedValue(obj, "person.name")).toBeUndefined()
    })

    it("handles arrays at a leaf", () => {
      const obj = { tags: ["a", "b"] }
      expect(getNestedValue(obj, "tags")).toEqual(["a", "b"])
    })
  })

  describe("null / undefined safety", () => {
    it("returns undefined when traversal hits null", () => {
      const obj = { a: { b: null } }
      expect(getNestedValue(obj, "a.b.c")).toBeUndefined()
    })

    it("returns null when value itself is null", () => {
      const obj = { email: null }
      expect(getNestedValue(obj, "email")).toBeNull()
    })

    it("returns 0 for zero-value numbers", () => {
      const obj = { count: 0 }
      expect(getNestedValue(obj, "count")).toBe(0)
    })

    it("returns false for boolean false", () => {
      const obj = { active: false }
      expect(getNestedValue(obj, "active")).toBe(false)
    })
  })
})

// ============================================================================
// applyServerFilter
// ============================================================================

describe("applyServerFilter", () => {
  function makeMockChain() {
    const chain = {
      eq: jest.fn(),
      neq: jest.fn(),
      in: jest.fn(),
      not: jest.fn(),
      contains: jest.fn(),
      gt: jest.fn(),
      gte: jest.fn(),
      lt: jest.fn(),
      lte: jest.fn(),
      is: jest.fn(),
      or: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      range: jest.fn(),
      select: jest.fn(),
    }
    // Each method returns the same chain (for chaining assertions)
    Object.keys(chain).forEach((k) => (chain as Record<string, jest.Mock>)[k].mockReturnValue(chain))
    return chain
  }

  it("calls .eq for 'eq' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "status", operator: "eq", value: "active" })
    expect(q.eq).toHaveBeenCalledWith("status", "active")
  })

  it("calls .neq for 'neq' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "status", operator: "neq", value: "cancelled" })
    expect(q.neq).toHaveBeenCalledWith("status", "cancelled")
  })

  it("calls .in for 'in' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "type", operator: "in", value: ["a", "b"] })
    expect(q.in).toHaveBeenCalledWith("type", ["a", "b"])
  })

  it("calls .not with 'in' for 'not_in' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "type", operator: "not_in", value: ["x", "y"] })
    expect(q.not).toHaveBeenCalledWith("type", "in", "(x,y)")
  })

  it("calls .contains for 'contains' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "tags", operator: "contains", value: ["member"] })
    expect(q.contains).toHaveBeenCalledWith("tags", ["member"])
  })

  it("calls .gt for 'gt' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "amount", operator: "gt", value: 1000 })
    expect(q.gt).toHaveBeenCalledWith("amount", 1000)
  })

  it("calls .gte for 'gte' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "amount", operator: "gte", value: 500 })
    expect(q.gte).toHaveBeenCalledWith("amount", 500)
  })

  it("calls .lt for 'lt' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "amount", operator: "lt", value: 2000 })
    expect(q.lt).toHaveBeenCalledWith("amount", 2000)
  })

  it("calls .lte for 'lte' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "amount", operator: "lte", value: 1500 })
    expect(q.lte).toHaveBeenCalledWith("amount", 1500)
  })

  it("calls .is(column, null) for 'is_null' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "deleted_at", operator: "is_null", value: undefined })
    expect(q.is).toHaveBeenCalledWith("deleted_at", null)
  })

  it("calls .not(column, 'is', null) for 'is_not_null' operator", () => {
    const q = makeMockChain()
    applyServerFilter(q, { column: "photo_url", operator: "is_not_null", value: undefined })
    expect(q.not).toHaveBeenCalledWith("photo_url", "is", null)
  })

  it("returns the query unchanged for unknown operator", () => {
    const q = makeMockChain()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = applyServerFilter(q, { column: "x", operator: "unknown" as any, value: "y" })
    expect(result).toBe(q)
    expect(q.eq).not.toHaveBeenCalled()
  })
})
