/**
 * Tests for pure utility functions in src/types/table-features.types.ts
 *
 * Covers: operatorRequiresValue, operatorRequiresTwoValues, getDefaultOperators,
 *         createEmptyCondition, createEmptyFilter, createEmptyFilterGroup,
 *         hasActiveAdvancedFilters
 */

import {
  operatorRequiresValue,
  operatorRequiresTwoValues,
  getDefaultOperators,
  createEmptyCondition,
  createEmptyFilter,
  createEmptyFilterGroup,
  hasActiveAdvancedFilters,
  OPERATORS_BY_TYPE,
  FILTER_OPERATOR_LABELS,
  type FilterType,
  type FilterOperator,
  type FilterGroup,
} from "@/types/table-features.types"

// ============================================================================
// FILTER_OPERATOR_LABELS
// ============================================================================

describe("FILTER_OPERATOR_LABELS", () => {
  it("has a label for every operator", () => {
    const operators: FilterOperator[] = [
      "eq", "neq", "contains", "starts", "ends",
      "gt", "gte", "lt", "lte", "in", "not_in",
      "is_null", "is_not_null", "between",
    ]
    for (const op of operators) {
      expect(FILTER_OPERATOR_LABELS[op]).toBeTruthy()
    }
  })

  it("labels are human-readable strings", () => {
    expect(FILTER_OPERATOR_LABELS.eq).toBe("equals")
    expect(FILTER_OPERATOR_LABELS.contains).toBe("contains")
    expect(FILTER_OPERATOR_LABELS.between).toBe("is between")
    expect(FILTER_OPERATOR_LABELS.is_null).toBe("is empty")
    expect(FILTER_OPERATOR_LABELS.is_not_null).toBe("is not empty")
  })
})

// ============================================================================
// OPERATORS_BY_TYPE
// ============================================================================

describe("OPERATORS_BY_TYPE", () => {
  it("text type includes contains and starts/ends operators", () => {
    const ops = OPERATORS_BY_TYPE.text
    expect(ops).toContain("contains")
    expect(ops).toContain("starts")
    expect(ops).toContain("ends")
  })

  it("number type includes gt/gte/lt/lte and between", () => {
    const ops = OPERATORS_BY_TYPE.number
    expect(ops).toContain("gt")
    expect(ops).toContain("gte")
    expect(ops).toContain("lt")
    expect(ops).toContain("lte")
    expect(ops).toContain("between")
  })

  it("date type includes between", () => {
    expect(OPERATORS_BY_TYPE.date).toContain("between")
  })

  it("select type includes in and not_in", () => {
    const ops = OPERATORS_BY_TYPE.select
    expect(ops).toContain("in")
    expect(ops).toContain("not_in")
  })

  it("multi-select type does not include eq", () => {
    expect(OPERATORS_BY_TYPE["multi-select"]).not.toContain("eq")
  })
})

// ============================================================================
// operatorRequiresValue
// ============================================================================

describe("operatorRequiresValue", () => {
  it("returns false for is_null (no value needed)", () => {
    expect(operatorRequiresValue("is_null")).toBe(false)
  })

  it("returns false for is_not_null (no value needed)", () => {
    expect(operatorRequiresValue("is_not_null")).toBe(false)
  })

  it("returns true for eq", () => {
    expect(operatorRequiresValue("eq")).toBe(true)
  })

  it("returns true for contains", () => {
    expect(operatorRequiresValue("contains")).toBe(true)
  })

  it("returns true for between", () => {
    expect(operatorRequiresValue("between")).toBe(true)
  })

  it("returns true for all comparison operators", () => {
    const comparisonOps: FilterOperator[] = ["gt", "gte", "lt", "lte", "neq", "in", "not_in"]
    for (const op of comparisonOps) {
      expect(operatorRequiresValue(op)).toBe(true)
    }
  })
})

// ============================================================================
// operatorRequiresTwoValues
// ============================================================================

describe("operatorRequiresTwoValues", () => {
  it("returns true only for between", () => {
    expect(operatorRequiresTwoValues("between")).toBe(true)
  })

  it("returns false for all other operators", () => {
    const others: FilterOperator[] = ["eq", "neq", "contains", "gt", "lt", "in", "is_null"]
    for (const op of others) {
      expect(operatorRequiresTwoValues(op)).toBe(false)
    }
  })
})

// ============================================================================
// getDefaultOperators
// ============================================================================

describe("getDefaultOperators", () => {
  it("returns operators for text type", () => {
    const ops = getDefaultOperators("text")
    expect(ops).toEqual(OPERATORS_BY_TYPE.text)
  })

  it("returns operators for number type", () => {
    const ops = getDefaultOperators("number")
    expect(ops).toEqual(OPERATORS_BY_TYPE.number)
  })

  it("returns operators for date type", () => {
    const ops = getDefaultOperators("date")
    expect(ops).toEqual(OPERATORS_BY_TYPE.date)
  })

  it("returns operators for select type", () => {
    const ops = getDefaultOperators("select")
    expect(ops).toEqual(OPERATORS_BY_TYPE.select)
  })

  it("returns operators for multi-select type", () => {
    const ops = getDefaultOperators("multi-select")
    expect(ops).toEqual(OPERATORS_BY_TYPE["multi-select"])
  })

  it("returns non-empty array for all filter types", () => {
    const types: FilterType[] = ["text", "number", "date", "select", "multi-select"]
    for (const t of types) {
      expect(getDefaultOperators(t).length).toBeGreaterThan(0)
    }
  })
})

// ============================================================================
// createEmptyCondition
// ============================================================================

describe("createEmptyCondition", () => {
  it("creates condition with null value", () => {
    const cond = createEmptyCondition("text")
    expect(cond.value).toBeNull()
  })

  it("creates condition with default operator for text", () => {
    const cond = createEmptyCondition("text")
    expect(OPERATORS_BY_TYPE.text).toContain(cond.operator)
  })

  it("creates condition with default operator for number", () => {
    const cond = createEmptyCondition("number")
    expect(OPERATORS_BY_TYPE.number).toContain(cond.operator)
  })

  it("uses the first operator from OPERATORS_BY_TYPE for each type", () => {
    const types: FilterType[] = ["text", "number", "date", "select", "multi-select"]
    for (const t of types) {
      const cond = createEmptyCondition(t)
      expect(cond.operator).toBe(OPERATORS_BY_TYPE[t][0])
    }
  })
})

// ============================================================================
// createEmptyFilter
// ============================================================================

describe("createEmptyFilter", () => {
  it("creates filter with the given column and label", () => {
    const filter = createEmptyFilter("status", "Status", "select")
    expect(filter.column).toBe("status")
    expect(filter.columnLabel).toBe("Status")
  })

  it("creates filter with the given filterType", () => {
    const filter = createEmptyFilter("amount", "Amount", "number")
    expect(filter.filterType).toBe("number")
  })

  it("creates filter with a unique ID", () => {
    const a = createEmptyFilter("name", "Name", "text")
    const b = createEmptyFilter("name", "Name", "text")
    expect(a.id).toBeTruthy()
    expect(b.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })

  it("creates filter with one empty condition", () => {
    const filter = createEmptyFilter("name", "Name", "text")
    expect(filter.conditions).toHaveLength(1)
    expect(filter.conditions[0].value).toBeNull()
  })

  it("defaults combine mode to AND", () => {
    const filter = createEmptyFilter("name", "Name", "text")
    expect(filter.combineMode).toBe("and")
  })
})

// ============================================================================
// createEmptyFilterGroup
// ============================================================================

describe("createEmptyFilterGroup", () => {
  it("creates group with no filters", () => {
    const group = createEmptyFilterGroup()
    expect(group.filters).toHaveLength(0)
  })

  it("defaults combine mode to AND", () => {
    const group = createEmptyFilterGroup()
    expect(group.combineMode).toBe("and")
  })
})

// ============================================================================
// hasActiveAdvancedFilters
// ============================================================================

describe("hasActiveAdvancedFilters", () => {
  it("returns false for undefined", () => {
    expect(hasActiveAdvancedFilters(undefined)).toBe(false)
  })

  it("returns false for empty filter group", () => {
    expect(hasActiveAdvancedFilters({ filters: [], combineMode: "and" })).toBe(false)
  })

  it("returns false when all conditions have null value", () => {
    const group: FilterGroup = {
      filters: [createEmptyFilter("name", "Name", "text")],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(false)
  })

  it("returns false when all conditions have empty string value", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("name", "Name", "text"),
          conditions: [{ operator: "contains", value: "" }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(false)
  })

  it("returns true when a condition has a non-empty value", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("name", "Name", "text"),
          conditions: [{ operator: "contains", value: "Rajat" }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(true)
  })

  it("returns true for is_null operator (no value needed)", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("email", "Email", "text"),
          conditions: [{ operator: "is_null" }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(true)
  })

  it("returns true for is_not_null operator (no value needed)", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("phone", "Phone", "text"),
          conditions: [{ operator: "is_not_null" }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(true)
  })

  it("returns false for between when secondValue is missing", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("amount", "Amount", "number"),
          conditions: [{ operator: "between", value: 1000, secondValue: null }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(false)
  })

  it("returns true for between when both values are set", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("amount", "Amount", "number"),
          conditions: [{ operator: "between", value: 1000, secondValue: 5000 }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(true)
  })

  it("returns true when at least one filter has an active condition (others empty)", () => {
    const group: FilterGroup = {
      filters: [
        {
          ...createEmptyFilter("status", "Status", "select"),
          conditions: [{ operator: "eq", value: null }],
        },
        {
          ...createEmptyFilter("name", "Name", "text"),
          conditions: [{ operator: "contains", value: "Rajat" }],
        },
      ],
      combineMode: "and",
    }
    expect(hasActiveAdvancedFilters(group)).toBe(true)
  })
})
