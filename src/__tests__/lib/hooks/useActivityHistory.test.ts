/**
 * Tests for src/lib/hooks/useActivityHistory.ts
 * Covers: useActivityHistory hook + formatFieldName, formatValue, formatChanges
 */

const mockFrom = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => ({ from: (...args: unknown[]) => mockFrom(...args) })),
}))

import { renderHook, act, waitFor } from "@testing-library/react"
import {
  useActivityHistory,
  formatFieldName,
  formatValue,
  formatChanges,
  type AuditEventRecord,
} from "@/lib/hooks/useActivityHistory"

// Build a minimal Supabase query chain mock that resolves at `.limit()` or `.in()`
function makeChain(resolved: { data: unknown; error: unknown }) {
  const q: Record<string, jest.Mock> = {}
  q.select = jest.fn().mockReturnValue(q)
  q.eq = jest.fn().mockReturnValue(q)
  q.order = jest.fn().mockReturnValue(q)
  q.limit = jest.fn().mockResolvedValue(resolved)
  q.in = jest.fn().mockResolvedValue(resolved)
  return q
}

const sampleAuditEvent: AuditEventRecord = {
  id: "evt-1",
  entity_type: "tenant",
  entity_id: "ten-1",
  action: "update",
  actor_id: "usr-1",
  actor_type: "user",
  changes: { before: { name: "Old" }, after: { name: "New" } },
  created_at: "2026-01-01T10:00:00Z",
}

// ============================================================================
// useActivityHistory hook
// ============================================================================

describe("useActivityHistory", () => {
  beforeEach(() => { mockFrom.mockReset() })

  it("loads events and resolves loading to false", async () => {
    const auditChain = makeChain({ data: [sampleAuditEvent], error: null })
    const userChain = makeChain({ data: [{ id: "usr-1", name: "Rajat", email: "r@test.com" }], error: null })
    mockFrom.mockImplementation((table: string) =>
      table === "audit_events" ? auditChain : userChain
    )

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toHaveLength(1)
    expect(result.current.error).toBeNull()
  })

  it("does not fetch when entityId is empty", async () => {
    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "" })
    )

    // loading stays true since fetchHistory is never called
    await new Promise((r) => setTimeout(r, 50))
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("sets error state when supabase throws", async () => {
    const chain = makeChain({ data: null, error: null })
    chain.limit = jest.fn().mockRejectedValue(new Error("network error"))
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Failed to load activity history")
  })

  it("skips user_profiles query when there are no actor_ids", async () => {
    const eventWithoutActor = { ...sampleAuditEvent, actor_id: null }
    const auditChain = makeChain({ data: [eventWithoutActor], error: null })
    mockFrom.mockReturnValue(auditChain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    // user_profiles was NOT queried because no actor_ids
    const calls = mockFrom.mock.calls.map((c) => c[0])
    expect(calls).not.toContain("user_profiles")
  })

  it("throws when audit_events query returns an error object (line 154)", async () => {
    const fetchError = new Error("RLS denied")
    const errorChain = makeChain({ data: null, error: fetchError })
    mockFrom.mockReturnValue(errorChain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe("Failed to load activity history")
  })

  it("handles null data with no error — setEvents falls back to [] (lines 156-159)", async () => {
    const chain = makeChain({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.events).toEqual([])
    expect(result.current.error).toBeNull()
  })

  it("handles null userData from user_profiles query (line 170)", async () => {
    const auditChain = makeChain({ data: [sampleAuditEvent], error: null })
    const userChain = makeChain({ data: null, error: null })
    mockFrom.mockImplementation((table: string) =>
      table === "audit_events" ? auditChain : userChain
    )

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    // No crash even though userData is null — users map stays empty
    expect(result.current.getUserDisplayName("usr-1")).toContain("usr-1")
  })

  it("toggleExpanded adds and removes event id from expanded set", async () => {
    const auditChain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(auditChain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => { result.current.toggleExpanded("evt-1") })
    expect(result.current.expanded.has("evt-1")).toBe(true)

    act(() => { result.current.toggleExpanded("evt-1") })
    expect(result.current.expanded.has("evt-1")).toBe(false)
  })

  it("getUserDisplayName returns 'System' for null actorId", async () => {
    const auditChain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(auditChain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getUserDisplayName(null)).toBe("System")
  })

  it("getUserDisplayName returns name when user has name", async () => {
    const auditChain = makeChain({ data: [sampleAuditEvent], error: null })
    const userChain = makeChain({ data: [{ id: "usr-1", name: "Rajat", email: "r@test.com" }], error: null })
    mockFrom.mockImplementation((table: string) =>
      table === "audit_events" ? auditChain : userChain
    )

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getUserDisplayName("usr-1")).toBe("Rajat")
  })

  it("getUserDisplayName returns email prefix when no name", async () => {
    const auditChain = makeChain({ data: [sampleAuditEvent], error: null })
    const userChain = makeChain({ data: [{ id: "usr-1", email: "rajat@test.com" }], error: null })
    mockFrom.mockImplementation((table: string) =>
      table === "audit_events" ? auditChain : userChain
    )

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.getUserDisplayName("usr-1")).toBe("rajat")
  })

  it("getUserDisplayName returns truncated id for unknown user", async () => {
    const auditChain = makeChain({ data: [], error: null })
    mockFrom.mockReturnValue(auditChain)

    const { result } = renderHook(() =>
      useActivityHistory({ entityType: "tenant", entityId: "ten-1" })
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    const name = result.current.getUserDisplayName("abcdefghijklmnop")
    expect(name).toContain("User ")
    expect(name).toContain("abcdefgh")
  })
})

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

  describe("no-op (neither before nor after)", () => {
    it("returns empty array when changes has neither before nor after (line 106 false branch)", () => {
      const changes = {} as AuditEventRecord["changes"]
      const result = formatChanges(changes)
      expect(result).toEqual([])
    })
  })
})
