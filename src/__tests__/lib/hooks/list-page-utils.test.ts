/**
 * Tests for getNestedValue, applyServerFilter, and applyBaseFiltersToQuery
 * from src/lib/hooks/list-page/utils.ts
 *
 * Covers dot-notation path resolution, server filter operator dispatch, and
 * base query filter application (soft-delete, select filters, date ranges, search).
 */

import { getNestedValue, applyServerFilter, applyBaseFiltersToQuery } from "@/lib/hooks/list-page/utils"
import type { ListPageConfig, FilterConfig } from "@/lib/hooks/list-page/types"

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

// ============================================================================
// applyBaseFiltersToQuery
// ============================================================================

describe("applyBaseFiltersToQuery", () => {
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
    Object.keys(chain).forEach((k) => (chain as Record<string, jest.Mock>)[k].mockReturnValue(chain))
    return chain
  }

  function makeConfig(overrides: Partial<ListPageConfig<Record<string, unknown>>> = {}): ListPageConfig<Record<string, unknown>> {
    return {
      table: "tenants",
      select: "*",
      defaultOrderBy: "created_at",
      defaultOrderDirection: "desc",
      searchFields: ["name"],
      ...overrides,
    }
  }

  // --------------------------------------------------------------------------
  // Soft-delete
  // --------------------------------------------------------------------------

  describe("soft-delete filter", () => {
    it("applies is(deleted_at, null) by default", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [], {}, "")
      expect(q.is).toHaveBeenCalledWith("deleted_at", null)
    })

    it("skips soft-delete filter when includeSoftDeleted=true", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ includeSoftDeleted: true }), [], {}, "")
      expect(q.is).not.toHaveBeenCalled()
    })
  })

  // --------------------------------------------------------------------------
  // Select filters — value skipping
  // --------------------------------------------------------------------------

  describe("select filter value skipping", () => {
    const filterConfig: FilterConfig = { id: "status", label: "Status", type: "select", options: [] }

    it("skips filter when value is empty string", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [filterConfig], { status: "" }, "")
      expect(q.eq).not.toHaveBeenCalledWith("status", expect.anything())
    })

    it("skips filter when value is 'all'", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [filterConfig], { status: "all" }, "")
      expect(q.eq).not.toHaveBeenCalledWith("status", expect.anything())
    })

    it("skips filter when no matching filterConfig is found", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [], { status: "active" }, "")
      expect(q.eq).not.toHaveBeenCalledWith("status", "active")
    })
  })

  // --------------------------------------------------------------------------
  // Select filters — FK mapping
  // --------------------------------------------------------------------------

  describe("select filter FK mapping", () => {
    it("maps 'property' filter to entity_id column", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "property", label: "Property", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { property: "prop-1" }, "")
      expect(q.eq).toHaveBeenCalledWith("entity_id", "prop-1")
    })

    it("maps 'tenant' filter to tenant_id column", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "tenant", label: "Tenant", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { tenant: "tenant-1" }, "")
      expect(q.eq).toHaveBeenCalledWith("tenant_id", "tenant-1")
    })

    it("maps 'room' filter to room_id column", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "room", label: "Room", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { room: "room-1" }, "")
      expect(q.eq).toHaveBeenCalledWith("room_id", "room-1")
    })

    it("maps 'tags' filter to contains(tags, [value])", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "tags", label: "Tags", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { tags: "member" }, "")
      expect(q.contains).toHaveBeenCalledWith("tags", ["member"])
    })

    it("uses .eq(filterId, value) for a standard status filter", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "status", label: "Status", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { status: "active" }, "")
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  // --------------------------------------------------------------------------
  // Select filters — people table status special case
  // --------------------------------------------------------------------------

  describe("select filter — people table virtual status", () => {
    const fc: FilterConfig = { id: "status", label: "Status", type: "select", options: [] }

    it("maps status=verified to is_verified=true on people table", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ table: "people" }), [fc], { status: "verified" }, "")
      expect(q.eq).toHaveBeenCalledWith("is_verified", true)
    })

    it("maps status=blocked to is_blocked=true on people table", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ table: "people" }), [fc], { status: "blocked" }, "")
      expect(q.eq).toHaveBeenCalledWith("is_blocked", true)
    })
  })

  describe("select filter — domain-specific column mappings", () => {
    it("maps visitor_type filter directly to visitor_type column", () => {
      const q = makeMockChain()
      const visitorFc: FilterConfig = { id: "visitor_type", label: "Type", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [visitorFc], { visitor_type: "family" }, "")
      expect(q.eq).toHaveBeenCalledWith("visitor_type", "family")
    })

    it("maps settlement_status filter directly to settlement_status column", () => {
      const q = makeMockChain()
      const settleFc: FilterConfig = { id: "settlement_status", label: "Settlement", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [settleFc], { settlement_status: "cleared" }, "")
      expect(q.eq).toHaveBeenCalledWith("settlement_status", "cleared")
    })

    it("maps refund_type filter directly to refund_type column", () => {
      const q = makeMockChain()
      const refundFc: FilterConfig = { id: "refund_type", label: "Type", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [refundFc], { refund_type: "security_deposit" }, "")
      expect(q.eq).toHaveBeenCalledWith("refund_type", "security_deposit")
    })

    it("maps meter_type filter directly to meter_type column", () => {
      const q = makeMockChain()
      const meterFc: FilterConfig = { id: "meter_type", label: "Type", type: "select", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [meterFc], { meter_type: "electricity" }, "")
      expect(q.eq).toHaveBeenCalledWith("meter_type", "electricity")
    })
  })

  // --------------------------------------------------------------------------
  // Date-type filter
  // --------------------------------------------------------------------------

  describe("date-type filter", () => {
    it("calls .eq(filterId, value) for date-type filters", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "due_date", label: "Due Date", type: "date", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { due_date: "2026-01-15" }, "")
      expect(q.eq).toHaveBeenCalledWith("due_date", "2026-01-15")
    })
  })

  // --------------------------------------------------------------------------
  // Date range filters
  // --------------------------------------------------------------------------

  describe("date range filters", () => {
    it("applies gte(dateField, date_from) using date-range filterConfig id", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "payment_date", label: "Date", type: "date-range", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { date_from: "2026-01-01" }, "")
      expect(q.gte).toHaveBeenCalledWith("payment_date", "2026-01-01")
    })

    it("applies lte(dateField, date_to) using date-range filterConfig id", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "payment_date", label: "Date", type: "date-range", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { date_to: "2026-01-31" }, "")
      expect(q.lte).toHaveBeenCalledWith("payment_date", "2026-01-31")
    })

    it("falls back to created_at when no date-range filterConfig exists", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [], { date_from: "2026-01-01" }, "")
      expect(q.gte).toHaveBeenCalledWith("created_at", "2026-01-01")
    })

    it("applies both date_from and date_to when both are present", () => {
      const q = makeMockChain()
      const fc: FilterConfig = { id: "created_at", label: "Date", type: "date-range", options: [] }
      applyBaseFiltersToQuery(q, makeConfig(), [fc], { date_from: "2026-01-01", date_to: "2026-01-31" }, "")
      expect(q.gte).toHaveBeenCalledWith("created_at", "2026-01-01")
      expect(q.lte).toHaveBeenCalledWith("created_at", "2026-01-31")
    })
  })

  // --------------------------------------------------------------------------
  // Search
  // --------------------------------------------------------------------------

  describe("search query", () => {
    it("calls .or() with ilike conditions for non-nested search fields", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ searchFields: ["name", "phone"] }), [], {}, "rajat")
      expect(q.or).toHaveBeenCalledWith("name.ilike.%rajat%,phone.ilike.%rajat%")
    })

    it("excludes nested (dot-notation) search fields from ilike query", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ searchFields: ["name", "person.email"] }), [], {}, "test")
      expect(q.or).toHaveBeenCalledWith("name.ilike.%test%")
    })

    it("does not call .or() when search query is empty", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig(), [], {}, "")
      expect(q.or).not.toHaveBeenCalled()
    })

    it("does not call .or() when all searchFields are nested", () => {
      const q = makeMockChain()
      applyBaseFiltersToQuery(q, makeConfig({ searchFields: ["person.name", "property.address"] }), [], {}, "hello")
      expect(q.or).not.toHaveBeenCalled()
    })
  })
})
