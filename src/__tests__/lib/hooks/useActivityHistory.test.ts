/**
 * Tests for pure helper functions in src/lib/hooks/useActivityHistory.ts
 *
 * Covers: formatFieldName, formatValue, formatChanges
 * (useActivityHistory hook depends on Supabase — not tested here)
 */

import {
  formatFieldName,
  formatValue,
  formatChanges,
  type AuditEventRecord,
} from "@/lib/hooks/useActivityHistory"

// ============================================================================
// formatFieldName
// ============================================================================

describe("formatFieldName", () => {
  it("converts snake_case to title case", () => {
    expect(formatFieldName("monthly_rent")).toBe("Monthly rent")
  })

  it("capitalizes the first letter", () => {
    expect(formatFieldName("status")).toBe("Status")
  })

  it("handles camelCase fields", () => {
    expect(formatFieldName("paymentMethod")).toBe("Payment Method")
  })

  it("handles single word", () => {
    expect(formatFieldName("name")).toBe("Name")
  })

  it("trims the result", () => {
    expect(formatFieldName("amount")).toBe("Amount")
  })
})

// ============================================================================
// formatValue
// ============================================================================

describe("formatValue", () => {
  it("returns em-dash for null", () => {
    expect(formatValue(null)).toBe("—")
  })

  it("returns em-dash for undefined", () => {
    expect(formatValue(undefined)).toBe("—")
  })

  it("returns 'Yes' for boolean true", () => {
    expect(formatValue(true)).toBe("Yes")
  })

  it("returns 'No' for boolean false", () => {
    expect(formatValue(false)).toBe("No")
  })

  it("returns JSON for objects", () => {
    const result = formatValue({ key: "value" })
    expect(result).toContain("key")
    expect(result).toContain("value")
  })

  it("converts numbers to strings", () => {
    expect(formatValue(42)).toBe("42")
  })

  it("returns string values as-is", () => {
    expect(formatValue("active")).toBe("active")
  })
})

// ============================================================================
// formatChanges
// ============================================================================

describe("formatChanges", () => {
  it("returns null when changes is null", () => {
    expect(formatChanges(null)).toBeNull()
  })

  it("returns null when changes is undefined", () => {
    expect(formatChanges(undefined)).toBeNull()
  })

  describe("update (before + after)", () => {
    it("returns only fields that changed", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { name: "Old Name", status: "active" },
        after: { name: "New Name", status: "active" },
      }
      const result = formatChanges(changes)
      expect(result).toHaveLength(1)
      expect(result?.[0].field).toBe("name")
      expect(result?.[0].before).toBe("Old Name")
      expect(result?.[0].after).toBe("New Name")
    })

    it("returns empty array when no fields changed", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { status: "active" },
        after: { status: "active" },
      }
      expect(formatChanges(changes)).toHaveLength(0)
    })

    it("excludes system fields (id, created_at, etc.)", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { id: "old-id", name: "Old" },
        after: { id: "new-id", name: "New" },
      }
      const result = formatChanges(changes)
      const fields = result?.map((c) => c.field)
      expect(fields).not.toContain("id")
      expect(fields).toContain("name")
    })
  })

  describe("insert (after only)", () => {
    it("returns all non-null after fields", () => {
      const changes: AuditEventRecord["changes"] = {
        after: { name: "Ravi", phone: null, status: "active" },
      }
      const result = formatChanges(changes)
      const fields = result?.map((c) => c.field)
      expect(fields).toContain("name")
      expect(fields).toContain("status")
      expect(fields).not.toContain("phone")
    })

    it("sets before to null for all inserted fields", () => {
      const changes: AuditEventRecord["changes"] = {
        after: { name: "Ravi" },
      }
      const result = formatChanges(changes)
      expect(result?.[0].before).toBeNull()
      expect(result?.[0].after).toBe("Ravi")
    })
  })

  describe("delete (before only)", () => {
    it("returns all non-null before fields", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { name: "Ravi", status: "active" },
      }
      const result = formatChanges(changes)
      const fields = result?.map((c) => c.field)
      expect(fields).toContain("name")
      expect(fields).toContain("status")
    })

    it("sets after to null for all deleted fields", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { name: "Ravi" },
      }
      const result = formatChanges(changes)
      expect(result?.[0].before).toBe("Ravi")
      expect(result?.[0].after).toBeNull()
    })

    it("excludes null/undefined before values", () => {
      const changes: AuditEventRecord["changes"] = {
        before: { name: "Ravi", email: null },
      }
      const result = formatChanges(changes)
      const fields = result?.map((c) => c.field)
      expect(fields).not.toContain("email")
    })
  })
})
