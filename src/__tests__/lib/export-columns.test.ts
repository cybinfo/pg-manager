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
  nestedColumn,
  dateExportColumn,
  dateTimeExportColumn,
  currencyExportColumn,
  labelMapColumn,
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

// ============================================================================
// nestedColumn
// ============================================================================

describe("nestedColumn", () => {
  type Row = { person: { name: string; phone?: string }; amount: number }

  it("resolves a nested path and stringifies the value", () => {
    const col = nestedColumn<Row>("person_name", "Name", "person.name")
    const result = col.format!(undefined, { person: { name: "Rajat" }, amount: 0 })
    expect(result).toBe("Rajat")
  })

  it("returns empty string when nested path is missing", () => {
    const col = nestedColumn<Row>("person_phone", "Phone", "person.phone")
    const result = col.format!(undefined, { person: { name: "Rajat" }, amount: 0 })
    expect(result).toBe("")
  })

  it("applies a custom format function when provided", () => {
    const col = nestedColumn<Row>(
      "person_name",
      "Name (Upper)",
      "person.name",
      (val) => String(val).toUpperCase()
    )
    const result = col.format!(undefined, { person: { name: "rajat" }, amount: 0 })
    expect(result).toBe("RAJAT")
  })

  it("sets key and header correctly", () => {
    const col = nestedColumn<Row>("person_name", "Person Name", "person.name")
    expect(col.key).toBe("person_name")
    expect(col.header).toBe("Person Name")
  })
})

// ============================================================================
// dateExportColumn
// ============================================================================

describe("dateExportColumn", () => {
  type Row = { created_at: string }

  it("formats the field value as DD/MM/YYYY", () => {
    const col = dateExportColumn<Row>("created_at", "Created At")
    const result = col.format!("2024-06-15", { created_at: "2024-06-15" })
    expect(result).toBe("15/06/2024")
  })

  it("returns empty string for null value", () => {
    const col = dateExportColumn<Row>("created_at", "Created At")
    const result = col.format!(null, { created_at: "" })
    expect(result).toBe("")
  })

  it("sets key and header correctly", () => {
    const col = dateExportColumn<Row>("created_at", "Date")
    expect(col.key).toBe("created_at")
    expect(col.header).toBe("Date")
  })
})

// ============================================================================
// dateTimeExportColumn
// ============================================================================

describe("dateTimeExportColumn", () => {
  type Row = { updated_at: string }

  it("formats the field value with date and time", () => {
    const col = dateTimeExportColumn<Row>("updated_at", "Updated At")
    const result = col.format!("2024-06-15T10:30:00Z", { updated_at: "2024-06-15T10:30:00Z" })
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })

  it("returns empty string for null value", () => {
    const col = dateTimeExportColumn<Row>("updated_at", "Updated At")
    const result = col.format!(null, { updated_at: "" })
    expect(result).toBe("")
  })
})

// ============================================================================
// currencyExportColumn
// ============================================================================

describe("currencyExportColumn", () => {
  type Row = { amount: number }

  it("formats the value with ₹ prefix", () => {
    const col = currencyExportColumn<Row>("amount", "Amount")
    const result = col.format!(5000, { amount: 5000 })
    expect(result).toContain("₹")
    expect(result).toContain("5,000")
  })

  it("returns empty string for null value", () => {
    const col = currencyExportColumn<Row>("amount", "Amount")
    const result = col.format!(null, { amount: 0 })
    expect(result).toBe("")
  })

  it("sets key and header correctly", () => {
    const col = currencyExportColumn<Row>("amount", "Payment Amount")
    expect(col.key).toBe("amount")
    expect(col.header).toBe("Payment Amount")
  })
})

// ============================================================================
// labelMapColumn
// ============================================================================

describe("labelMapColumn", () => {
  type Row = { status: string }
  const STATUS_LABELS = { active: "Active", checked_out: "Checked Out", notice_period: "Notice Period" }

  it("maps a known key to its label", () => {
    const col = labelMapColumn<Row>("status", "Status", STATUS_LABELS)
    const result = col.format!("active", { status: "active" })
    expect(result).toBe("Active")
  })

  it("falls back to the raw value for unknown keys", () => {
    const col = labelMapColumn<Row>("status", "Status", STATUS_LABELS)
    const result = col.format!("unknown_status", { status: "unknown_status" })
    expect(result).toBe("unknown_status")
  })

  it("returns empty string for null value", () => {
    const col = labelMapColumn<Row>("status", "Status", STATUS_LABELS)
    const result = col.format!(null, { status: "" })
    expect(result).toBe("")
  })

  it("sets key and header correctly", () => {
    const col = labelMapColumn<Row>("status", "Status", STATUS_LABELS)
    expect(col.key).toBe("status")
    expect(col.header).toBe("Status")
  })
})
