/**
 * Tests for src/lib/export-columns.ts
 *
 * Pure format functions and column builders.
 */

import {
  formatDateForExport,
  formatDateTimeForExport,
  formatTimeForExport,
  formatCurrencyForExport,
  formatDecimalForExport,
  resolveNestedValue,
} from "@/lib/export-columns"

// ============================================================================
// formatDateForExport
// ============================================================================

describe("formatDateForExport", () => {
  it("formats a date string as DD/MM/YYYY", () => {
    // Use a UTC date string and check just the format pattern
    const result = formatDateForExport("2026-04-15T12:00:00.000Z")
    // Format should match DD/MM/YYYY
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
    expect(result).toContain("/2026")
  })

  it("returns empty string for null", () => {
    expect(formatDateForExport(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(formatDateForExport(undefined)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatDateForExport("")).toBe("")
  })

  it("returns original value for invalid date string", () => {
    expect(formatDateForExport("not-a-date")).toBe("not-a-date")
  })

  it("zero-pads day and month", () => {
    // Pass a date where day and month are single digits
    const result = formatDateForExport("2026-01-05T12:00:00.000Z")
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}$/)
  })
})

// ============================================================================
// formatDateTimeForExport
// ============================================================================

describe("formatDateTimeForExport", () => {
  it("formats as DD/MM/YYYY HH:MM", () => {
    const result = formatDateTimeForExport("2026-04-15T12:30:00.000Z")
    expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/)
  })

  it("returns empty string for null", () => {
    expect(formatDateTimeForExport(null)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatDateTimeForExport("")).toBe("")
  })

  it("returns original value for invalid date", () => {
    expect(formatDateTimeForExport("garbage")).toBe("garbage")
  })
})

// ============================================================================
// formatTimeForExport
// ============================================================================

describe("formatTimeForExport", () => {
  it("returns a non-empty time string for a valid datetime", () => {
    const result = formatTimeForExport("2026-04-15T14:30:00.000Z")
    expect(typeof result).toBe("string")
    expect(result.length).toBeGreaterThan(0)
  })

  it("returns empty string for null", () => {
    expect(formatTimeForExport(null)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatTimeForExport("")).toBe("")
  })

  it("returns original value for invalid datetime", () => {
    expect(formatTimeForExport("invalid-time")).toBe("invalid-time")
  })
})

// ============================================================================
// formatCurrencyForExport
// ============================================================================

describe("formatCurrencyForExport", () => {
  it("formats a number with ₹ prefix", () => {
    const result = formatCurrencyForExport(8500)
    expect(result).toContain("₹")
    expect(result).toContain("8")
  })

  it("formats zero as ₹0", () => {
    expect(formatCurrencyForExport(0)).toContain("₹")
  })

  it("uses Indian number formatting (commas)", () => {
    const result = formatCurrencyForExport(100000)
    expect(result).toContain("₹")
    // Indian format: 1,00,000
    expect(result).toContain(",")
  })

  it("accepts numeric strings", () => {
    const result = formatCurrencyForExport("5000")
    expect(result).toContain("₹")
  })

  it("returns empty string for null", () => {
    expect(formatCurrencyForExport(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(formatCurrencyForExport(undefined)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatCurrencyForExport("")).toBe("")
  })

  it("returns original string for non-numeric input", () => {
    expect(formatCurrencyForExport("abc")).toBe("abc")
  })
})

// ============================================================================
// formatDecimalForExport
// ============================================================================

describe("formatDecimalForExport", () => {
  it("formats a float to 1 decimal place", () => {
    expect(formatDecimalForExport(3.14159)).toBe("3.1")
  })

  it("formats an integer as X.0", () => {
    expect(formatDecimalForExport(5)).toBe("5.0")
  })

  it("returns empty string for null", () => {
    expect(formatDecimalForExport(null)).toBe("")
  })

  it("returns empty string for undefined", () => {
    expect(formatDecimalForExport(undefined)).toBe("")
  })

  it("returns empty string for empty string", () => {
    expect(formatDecimalForExport("")).toBe("")
  })

  it("returns original string for non-numeric input", () => {
    expect(formatDecimalForExport("abc")).toBe("abc")
  })

  it("formats zero as '0.0'", () => {
    expect(formatDecimalForExport(0)).toBe("0.0")
  })
})

// ============================================================================
// resolveNestedValue
// ============================================================================

describe("resolveNestedValue", () => {
  it("resolves a top-level key", () => {
    const row = { name: "Ravi", age: 25 }
    expect(resolveNestedValue(row, "name")).toBe("Ravi")
  })

  it("resolves a nested path with dot notation", () => {
    const row = { person: { name: "Priya", phone: "9876543210" } }
    expect(resolveNestedValue(row, "person.name")).toBe("Priya")
  })

  it("resolves deeply nested path", () => {
    const row = { a: { b: { c: "deep" } } }
    expect(resolveNestedValue(row, "a.b.c")).toBe("deep")
  })

  it("returns empty string when intermediate key is null", () => {
    const row = { person: null }
    expect(resolveNestedValue(row as Record<string, unknown>, "person.name")).toBe("")
  })

  it("returns empty string when intermediate key is undefined", () => {
    const row = { person: undefined }
    expect(resolveNestedValue(row as Record<string, unknown>, "person.name")).toBe("")
  })

  it("returns empty string when leaf value is null", () => {
    const row = { name: null }
    expect(resolveNestedValue(row as Record<string, unknown>, "name")).toBe("")
  })

  it("returns empty string when top-level key does not exist", () => {
    const row = {}
    expect(resolveNestedValue(row, "missing")).toBe("")
  })

  it("returns numeric values as-is", () => {
    const row = { stats: { count: 42 } }
    expect(resolveNestedValue(row, "stats.count")).toBe(42)
  })
})
