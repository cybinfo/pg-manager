/**
 * Tests for src/lib/filters/apply-advanced-filters.ts
 *
 * Tests applyAdvancedFilters using a spy-based mock query object,
 * and the pure utility functions directly.
 */

import {
  applyAdvancedFilters,
  simpleFiltersToGroup,
  groupToSimpleFilters,
  isSimpleFilterGroup,
} from "@/lib/filters/apply-advanced-filters"
import type { FilterGroup, AdvancedFilter } from "@/types/table-features.types"

// ============================================================================
// Mock query builder
// ============================================================================

function makeMockQuery() {
  const q: Record<string, jest.Mock> = {}
  const methods = ["eq", "neq", "ilike", "gt", "gte", "lt", "lte", "in", "not", "is", "or", "and"]
  for (const m of methods) {
    q[m] = jest.fn(() => q) // each method returns the same mock (chaining)
  }
  return q
}

function makeFilter(overrides: Partial<AdvancedFilter> = {}): AdvancedFilter {
  return {
    id: "f1",
    column: "status",
    columnLabel: "Status",
    filterType: "select",
    conditions: [{ operator: "eq", value: "active" }],
    combineMode: "and",
    ...overrides,
  }
}

function makeGroup(overrides: Partial<FilterGroup> = {}): FilterGroup {
  return {
    filters: [makeFilter()],
    combineMode: "and",
    ...overrides,
  }
}

// ============================================================================
// applyAdvancedFilters — passthrough cases
// ============================================================================

describe("applyAdvancedFilters", () => {
  describe("passthrough (no changes)", () => {
    it("returns query unchanged when filterGroup is undefined", () => {
      const q = makeMockQuery()
      const result = applyAdvancedFilters(q, undefined)
      expect(result).toBe(q)
      expect(q.eq).not.toHaveBeenCalled()
    })

    it("returns query unchanged when filters array is empty", () => {
      const q = makeMockQuery()
      const result = applyAdvancedFilters(q, { filters: [], combineMode: "and" })
      expect(result).toBe(q)
      expect(q.eq).not.toHaveBeenCalled()
    })

    it("returns query unchanged when filter has no conditions", () => {
      const q = makeMockQuery()
      const group = makeGroup({ filters: [makeFilter({ conditions: [] })] })
      applyAdvancedFilters(q, group)
      expect(q.eq).not.toHaveBeenCalled()
    })

    it("skips condition where value is missing for operators that require it", () => {
      const q = makeMockQuery()
      const group = makeGroup({
        filters: [makeFilter({ conditions: [{ operator: "eq", value: "" }] })],
      })
      applyAdvancedFilters(q, group)
      expect(q.eq).not.toHaveBeenCalled()
    })
  })

  describe("AND mode — individual condition operators", () => {
    it("applies eq", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(q, makeGroup())
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })

    it("applies neq", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "neq", value: "inactive" }] })] })
      )
      expect(q.neq).toHaveBeenCalledWith("status", "inactive")
    })

    it("applies contains → ilike with %value%", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "contains", value: "foo" }] })] })
      )
      expect(q.ilike).toHaveBeenCalledWith("status", "%foo%")
    })

    it("applies starts → ilike with value%", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "starts", value: "abc" }] })] })
      )
      expect(q.ilike).toHaveBeenCalledWith("status", "abc%")
    })

    it("applies ends → ilike with %value", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "ends", value: "xyz" }] })] })
      )
      expect(q.ilike).toHaveBeenCalledWith("status", "%xyz")
    })

    it("applies gt", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "gt", value: "5000" }] })] })
      )
      expect(q.gt).toHaveBeenCalledWith("status", "5000")
    })

    it("applies gte", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "gte", value: "5000" }] })] })
      )
      expect(q.gte).toHaveBeenCalledWith("status", "5000")
    })

    it("applies lt", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "lt", value: "100" }] })] })
      )
      expect(q.lt).toHaveBeenCalledWith("status", "100")
    })

    it("applies lte", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "lte", value: "100" }] })] })
      )
      expect(q.lte).toHaveBeenCalledWith("status", "100")
    })

    it("applies in with comma-separated string", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "in", value: "active,inactive" }] })] })
      )
      expect(q.in).toHaveBeenCalledWith("status", ["active", "inactive"])
    })

    it("applies in with array value directly (line 161 Array.isArray true branch)", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "in", value: ["active", "inactive"] }] })] })
      )
      expect(q.in).toHaveBeenCalledWith("status", ["active", "inactive"])
    })

    it("applies is_null", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "is_null", value: null }] })] })
      )
      expect(q.is).toHaveBeenCalledWith("status", null)
    })

    it("applies is_not_null", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "is_not_null", value: null }] })] })
      )
      expect(q.not).toHaveBeenCalledWith("status", "is", null)
    })

    it("applies between via gte+lte chain", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({
          filters: [
            makeFilter({
              conditions: [{ operator: "between", value: "100", secondValue: "500" }],
            }),
          ],
        })
      )
      expect(q.gte).toHaveBeenCalledWith("status", "100")
      expect(q.lte).toHaveBeenCalledWith("status", "500")
    })

    it("skips between when secondValue is missing", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({
          filters: [makeFilter({ conditions: [{ operator: "between", value: "100", secondValue: "" }] })],
        })
      )
      expect(q.gte).not.toHaveBeenCalled()
    })
  })

  describe("OR combineMode at group level", () => {
    it("calls .or() with combined filter strings", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "or",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({ id: "f2", column: "status", conditions: [{ operator: "eq", value: "pending" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.or).toHaveBeenCalledWith("status.eq.active,status.eq.pending")
    })
  })

  describe("multiple filters in AND mode", () => {
    it("chains multiple conditions", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({
            id: "f2",
            column: "amount",
            conditions: [{ operator: "gte", value: "5000" }],
          }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.eq).toHaveBeenCalledWith("status", "active")
      expect(q.gte).toHaveBeenCalledWith("amount", "5000")
    })
  })

  describe("not_in operator", () => {
    it("applies not_in with comma-separated string via query.not()", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "not_in", value: "active,pending" }] })] })
      )
      expect(q.not).toHaveBeenCalledWith("status", "in", "(active,pending)")
    })

    it("applies not_in with array value", () => {
      const q = makeMockQuery()
      applyAdvancedFilters(
        q,
        makeGroup({ filters: [makeFilter({ conditions: [{ operator: "not_in", value: ["x", "y"] }] })] })
      )
      expect(q.not).toHaveBeenCalledWith("status", "in", "(x,y)")
    })
  })

  describe("OR combineMode within a single filter (multiple conditions)", () => {
    it("calls .or() combining conditions from a single filter with combineMode=or", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          {
            id: "f1",
            column: "status",
            combineMode: "or",
            conditions: [
              { operator: "eq", value: "active" },
              { operator: "eq", value: "pending" },
            ],
          },
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.or).toHaveBeenCalledWith("status.eq.active,status.eq.pending")
    })
  })

  describe("OR group with not_in condition (buildConditionString)", () => {
    it("builds correct not_in string in OR mode", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "or",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "not_in", value: "a,b" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.or).toHaveBeenCalledWith(expect.stringContaining("status.not.in.(a,b)"))
    })
  })

  describe("OR group with in operator and array value (line 269 Array.isArray true branch)", () => {
    it("builds correct in string in OR mode when value is already an array", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "or",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "in", value: ["a", "b"] }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.or).toHaveBeenCalledWith(expect.stringContaining("status.in.(a,b)"))
    })
  })

  describe("applyFilter — OR filter where all condition strings are empty (line 102)", () => {
    it("returns query unchanged when OR filter has multiple conditions all with empty values", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          {
            id: "f2",
            column: "type",
            combineMode: "or",
            conditions: [
              { operator: "eq", value: "" },
              { operator: "eq", value: "" },
            ],
          },
        ],
      }
      applyAdvancedFilters(q, group)
      // OR filter with empty conditions does nothing — line 102 returns query
      expect(q.or).not.toHaveBeenCalled()
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  describe("applyFilter — AND multiple conditions per filter (lines 102-107)", () => {
    it("chains AND conditions for a filter with combineMode=and and 2+ conditions", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [{
          id: "f1",
          column: "amount",
          combineMode: "and",
          conditions: [
            { operator: "gte", value: "100" },
            { operator: "lte", value: "5000" },
          ],
        }],
      }
      applyAdvancedFilters(q, group)
      expect(q.gte).toHaveBeenCalledWith("amount", "100")
      expect(q.lte).toHaveBeenCalledWith("amount", "5000")
    })
  })

  describe("applyFilter — empty conditions when another valid filter exists (line 85)", () => {
    it("skips filter with empty conditions without crashing in AND reduce", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({ id: "f2", column: "type", conditions: [] }),
        ],
      }
      applyAdvancedFilters(q, group)
      // Only the valid filter fires — no error from empty-conditions filter
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  describe("applyCondition — returns query when value is empty (line 123)", () => {
    it("skips condition with empty value when a valid filter also exists", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({ id: "f2", column: "type", conditions: [{ operator: "eq", value: "" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      // eq called once (status), NOT a second time (type had empty value)
      expect(q.eq).toHaveBeenCalledTimes(1)
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  describe("applyCondition — returns query when between secondValue is empty (line 128)", () => {
    it("skips between condition when secondValue is empty and another valid filter exists", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({ id: "f2", column: "amount", conditions: [{ operator: "between", value: "100", secondValue: "" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.gte).not.toHaveBeenCalled()
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  describe("applyCondition — default case for unknown operator (line 184)", () => {
    it("returns query unchanged for unknown operator when another valid filter exists", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "and",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
          makeFilter({ id: "f2", column: "type", conditions: [{ operator: "custom_op" as "eq", value: "x" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      expect(q.eq).toHaveBeenCalledWith("status", "active")
    })
  })

  describe("buildFilterString — returns and(...) for multiple AND conditions (line 218)", () => {
    it("OR group with a filter that has multiple AND conditions calls .or() with and(...) string", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "or",
        filters: [{
          id: "f1",
          column: "amount",
          combineMode: "and",
          conditions: [
            { operator: "gte", value: "100" },
            { operator: "lte", value: "5000" },
          ],
        }],
      }
      applyAdvancedFilters(q, group)
      expect(q.or).toHaveBeenCalledWith(expect.stringContaining("and(amount.gte.100,amount.lte.5000)"))
    })
  })

  describe("buildConditionString — default case for unknown operator (line 291)", () => {
    it("OR group with unknown operator returns null from buildConditionString — query unchanged", () => {
      const q = makeMockQuery()
      const group: FilterGroup = {
        combineMode: "or",
        filters: [
          makeFilter({ column: "status", conditions: [{ operator: "custom_op" as "eq", value: "x" }] }),
        ],
      }
      applyAdvancedFilters(q, group)
      // buildConditionString returns null → filterStrings is empty → early return
      expect(q.or).not.toHaveBeenCalled()
    })
  })
})

// ============================================================================
// simpleFiltersToGroup
// ============================================================================

describe("simpleFiltersToGroup", () => {
  it("converts a simple record to a FilterGroup", () => {
    const group = simpleFiltersToGroup({ status: "active", type: "monthly" })
    expect(group.combineMode).toBe("and")
    expect(group.filters).toHaveLength(2)

    const statusFilter = group.filters.find(f => f.column === "status")
    expect(statusFilter?.conditions[0].operator).toBe("eq")
    expect(statusFilter?.conditions[0].value).toBe("active")
  })

  it("excludes entries with value 'all'", () => {
    const group = simpleFiltersToGroup({ status: "all", type: "monthly" })
    expect(group.filters).toHaveLength(1)
    expect(group.filters[0].column).toBe("type")
  })

  it("excludes entries with empty string", () => {
    const group = simpleFiltersToGroup({ status: "", type: "monthly" })
    expect(group.filters).toHaveLength(1)
  })

  it("respects columnTypes hint for filterType", () => {
    const group = simpleFiltersToGroup(
      { amount: "5000" },
      { amount: "number" }
    )
    expect(group.filters[0].filterType).toBe("number")
  })

  it("defaults filterType to 'text' when no columnTypes provided", () => {
    const group = simpleFiltersToGroup({ name: "Rajat" })
    expect(group.filters[0].filterType).toBe("text")
  })

  it("returns empty filters array for empty input", () => {
    const group = simpleFiltersToGroup({})
    expect(group.filters).toHaveLength(0)
  })
})

// ============================================================================
// groupToSimpleFilters
// ============================================================================

describe("groupToSimpleFilters", () => {
  it("converts single-condition eq filters back to simple record", () => {
    const group: FilterGroup = {
      combineMode: "and",
      filters: [
        makeFilter({ column: "status", conditions: [{ operator: "eq", value: "active" }] }),
        makeFilter({
          id: "f2",
          column: "type",
          conditions: [{ operator: "eq", value: "monthly" }],
        }),
      ],
    }
    const result = groupToSimpleFilters(group)
    expect(result).toEqual({ status: "active", type: "monthly" })
  })

  it("skips filters with non-eq operators", () => {
    const group: FilterGroup = {
      combineMode: "and",
      filters: [
        makeFilter({ column: "amount", conditions: [{ operator: "gte", value: "5000" }] }),
      ],
    }
    expect(groupToSimpleFilters(group)).toEqual({})
  })

  it("skips filters with multiple conditions", () => {
    const group: FilterGroup = {
      combineMode: "and",
      filters: [
        makeFilter({
          column: "status",
          conditions: [
            { operator: "eq", value: "active" },
            { operator: "eq", value: "pending" },
          ],
        }),
      ],
    }
    expect(groupToSimpleFilters(group)).toEqual({})
  })

  it("stringifies non-string values", () => {
    const group: FilterGroup = {
      combineMode: "and",
      filters: [makeFilter({ column: "count", conditions: [{ operator: "eq", value: 42 }] })],
    }
    expect(groupToSimpleFilters(group)).toEqual({ count: "42" })
  })
})

// ============================================================================
// isSimpleFilterGroup
// ============================================================================

describe("isSimpleFilterGroup", () => {
  it("returns true for a group of single-condition eq filters in AND mode", () => {
    expect(isSimpleFilterGroup(makeGroup())).toBe(true)
  })

  it("returns false when combineMode is 'or'", () => {
    expect(isSimpleFilterGroup(makeGroup({ combineMode: "or" }))).toBe(false)
  })

  it("returns false when a filter has multiple conditions", () => {
    const group = makeGroup({
      filters: [
        makeFilter({
          conditions: [
            { operator: "eq", value: "active" },
            { operator: "eq", value: "pending" },
          ],
        }),
      ],
    })
    expect(isSimpleFilterGroup(group)).toBe(false)
  })

  it("returns false when a filter uses a non-eq operator", () => {
    const group = makeGroup({
      filters: [makeFilter({ conditions: [{ operator: "gte", value: "5000" }] })],
    })
    expect(isSimpleFilterGroup(group)).toBe(false)
  })

  it("returns true for empty filters list", () => {
    expect(isSimpleFilterGroup({ filters: [], combineMode: "and" })).toBe(true)
  })
})
