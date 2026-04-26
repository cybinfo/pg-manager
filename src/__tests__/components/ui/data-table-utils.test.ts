/**
 * Tests for utility functions in src/components/ui/data-table/types.ts
 *
 * Covers: getColumnFr, buildGridTemplate, getNestedValue
 */

import {
  getColumnFr,
  buildGridTemplate,
  getNestedValue,
  columnWidths,
} from "@/components/ui/data-table/types"

// ============================================================================
// getColumnFr
// ============================================================================

describe("getColumnFr", () => {
  it("returns the numeric value directly when width is a number", () => {
    expect(getColumnFr(2.5)).toBe(2.5)
    expect(getColumnFr(0)).toBe(0)
  })

  it("returns the correct fr value for known width keys", () => {
    expect(getColumnFr("primary")).toBe(columnWidths.primary)
    expect(getColumnFr("secondary")).toBe(columnWidths.secondary)
    expect(getColumnFr("status")).toBe(columnWidths.status)
    expect(getColumnFr("date")).toBe(columnWidths.date)
    expect(getColumnFr("amount")).toBe(columnWidths.amount)
  })

  it("falls back to tertiary for undefined", () => {
    expect(getColumnFr(undefined)).toBe(columnWidths.tertiary)
  })

  it("falls back to tertiary for unknown string key", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getColumnFr("unknown_key" as any)).toBe(columnWidths.tertiary)
  })
})

// ============================================================================
// buildGridTemplate
// ============================================================================

describe("buildGridTemplate", () => {
  const col = (width?: string | number) => ({ key: "x", header: "X", width } as Parameters<typeof buildGridTemplate>[0][0])

  it("builds grid template with fr units for each column", () => {
    const columns = [col("primary"), col("status")]
    const result = buildGridTemplate(columns, false)
    expect(result).toBe(`${columnWidths.primary}fr ${columnWidths.status}fr`)
  })

  it("appends menu column when isClickable is true", () => {
    const columns = [col("primary")]
    const result = buildGridTemplate(columns, true)
    expect(result).toContain(`${columnWidths.menu}fr`)
    expect(result.endsWith(`${columnWidths.menu}fr`)).toBe(true)
  })

  it("does not append menu column when isClickable is false", () => {
    const columns = [col("primary")]
    const result = buildGridTemplate(columns, false)
    expect(result).not.toContain(`${columnWidths.menu}fr`)
  })

  it("prepends auto for selectable columns", () => {
    const columns = [col("primary")]
    const result = buildGridTemplate(columns, false, true)
    expect(result.startsWith("auto ")).toBe(true)
  })

  it("does not prepend auto when selectable is false", () => {
    const columns = [col("primary")]
    const result = buildGridTemplate(columns, false, false)
    expect(result.startsWith("auto ")).toBe(false)
  })

  it("uses numeric column width directly", () => {
    const columns = [col(4)]
    const result = buildGridTemplate(columns, false)
    expect(result).toBe("4fr")
  })
})

// ============================================================================
// getNestedValue (data-table version)
// ============================================================================

describe("getNestedValue (data-table)", () => {
  it("returns a top-level property", () => {
    expect(getNestedValue({ name: "Rajat" }, "name")).toBe("Rajat")
  })

  it("resolves a nested path", () => {
    expect(getNestedValue({ person: { name: "Rajat" } }, "person.name")).toBe("Rajat")
  })

  it("returns undefined for missing nested path", () => {
    expect(getNestedValue({ person: null }, "person.name")).toBeUndefined()
  })

  it("returns undefined for fully missing path", () => {
    expect(getNestedValue({ name: "Rajat" }, "email")).toBeUndefined()
  })
})
