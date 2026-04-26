/**
 * Tests for src/lib/advanced-filter-builders.ts
 *
 * Factory functions that return plain FilterableColumn objects.
 */

import {
  textFilterColumn,
  statusFilterColumn,
  selectFilterColumn,
  dateFilterColumn,
  numberFilterColumn,
  booleanFilterColumn,
} from "@/lib/advanced-filter-builders"

// ============================================================================
// textFilterColumn
// ============================================================================

describe("textFilterColumn", () => {
  it("creates a text filter column with defaults", () => {
    const col = textFilterColumn("name", "Name")
    expect(col.key).toBe("name")
    expect(col.header).toBe("Name")
    expect(col.filterType).toBe("text")
    expect(col.filterOperators).toEqual(["contains", "eq", "starts"])
  })

  it("accepts custom operators", () => {
    const col = textFilterColumn("email", "Email", ["eq", "neq"])
    expect(col.filterOperators).toEqual(["eq", "neq"])
  })

  it("all default operators are string values", () => {
    const col = textFilterColumn("x", "X")
    expect(Array.isArray(col.filterOperators)).toBe(true)
    col.filterOperators?.forEach((op) => expect(typeof op).toBe("string"))
  })
})

// ============================================================================
// statusFilterColumn
// ============================================================================

describe("statusFilterColumn", () => {
  const opts = [
    { value: "active", label: "Active" },
    { value: "inactive", label: "Inactive" },
  ]

  it("creates a status filter with default key and header", () => {
    const col = statusFilterColumn(opts)
    expect(col.key).toBe("status")
    expect(col.header).toBe("Status")
    expect(col.filterType).toBe("select")
  })

  it("includes the provided options", () => {
    const col = statusFilterColumn(opts)
    expect(col.filterOptions).toEqual(opts)
  })

  it("accepts custom key and header", () => {
    const col = statusFilterColumn(opts, "member_status", "Member Status")
    expect(col.key).toBe("member_status")
    expect(col.header).toBe("Member Status")
  })

  it("has eq, neq, in, not_in operators", () => {
    const col = statusFilterColumn(opts)
    expect(col.filterOperators).toContain("eq")
    expect(col.filterOperators).toContain("neq")
    expect(col.filterOperators).toContain("in")
    expect(col.filterOperators).toContain("not_in")
  })
})

// ============================================================================
// selectFilterColumn
// ============================================================================

describe("selectFilterColumn", () => {
  const opts = [{ value: "monthly", label: "Monthly" }]

  it("creates a select filter column", () => {
    const col = selectFilterColumn("plan_type", "Plan Type", opts)
    expect(col.key).toBe("plan_type")
    expect(col.header).toBe("Plan Type")
    expect(col.filterType).toBe("select")
    expect(col.filterOptions).toEqual(opts)
  })

  it("uses default operators when none provided", () => {
    const col = selectFilterColumn("type", "Type", opts)
    expect(col.filterOperators).toEqual(["eq", "neq", "in"])
  })

  it("accepts custom operators", () => {
    const col = selectFilterColumn("type", "Type", opts, ["eq", "is_null"])
    expect(col.filterOperators).toEqual(["eq", "is_null"])
  })
})

// ============================================================================
// dateFilterColumn
// ============================================================================

describe("dateFilterColumn", () => {
  it("creates a date filter column with standard range operators", () => {
    const col = dateFilterColumn("created_at", "Created")
    expect(col.key).toBe("created_at")
    expect(col.header).toBe("Created")
    expect(col.filterType).toBe("date")
    expect(col.filterOperators).toContain("eq")
    expect(col.filterOperators).toContain("gt")
    expect(col.filterOperators).toContain("between")
  })

  it("includes extra operators when provided", () => {
    const col = dateFilterColumn("deleted_at", "Deleted", ["is_null", "is_not_null"])
    expect(col.filterOperators).toContain("is_null")
    expect(col.filterOperators).toContain("is_not_null")
  })

  it("does not include is_null when extraOps is empty", () => {
    const col = dateFilterColumn("created_at", "Created")
    expect(col.filterOperators).not.toContain("is_null")
  })
})

// ============================================================================
// numberFilterColumn
// ============================================================================

describe("numberFilterColumn", () => {
  it("creates a number filter column", () => {
    const col = numberFilterColumn("amount", "Amount")
    expect(col.key).toBe("amount")
    expect(col.header).toBe("Amount")
    expect(col.filterType).toBe("number")
  })

  it("includes all numeric range operators including between", () => {
    const col = numberFilterColumn("amount", "Amount")
    expect(col.filterOperators).toEqual(["eq", "neq", "gt", "gte", "lt", "lte", "between"])
  })

  it("has no filterOptions", () => {
    const col = numberFilterColumn("amount", "Amount")
    expect(col.filterOptions).toBeUndefined()
  })
})

// ============================================================================
// booleanFilterColumn
// ============================================================================

describe("booleanFilterColumn", () => {
  it("creates a boolean filter with Yes/No defaults", () => {
    const col = booleanFilterColumn("is_active", "Active")
    expect(col.key).toBe("is_active")
    expect(col.filterType).toBe("select")
    expect(col.filterOptions).toEqual([
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ])
  })

  it("accepts custom true/false labels", () => {
    const col = booleanFilterColumn("is_active", "Active", { trueLabel: "Active", falseLabel: "Inactive" })
    expect(col.filterOptions?.[0].label).toBe("Active")
    expect(col.filterOptions?.[1].label).toBe("Inactive")
  })

  it("only has eq operator", () => {
    const col = booleanFilterColumn("is_active", "Active")
    expect(col.filterOperators).toEqual(["eq"])
  })

  it("option values are the strings 'true' and 'false', not booleans", () => {
    const col = booleanFilterColumn("flag", "Flag")
    expect(col.filterOptions?.[0].value).toBe("true")
    expect(col.filterOptions?.[1].value).toBe("false")
  })
})
