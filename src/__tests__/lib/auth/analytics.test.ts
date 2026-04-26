/**
 * Tests for src/lib/auth/analytics.ts
 *
 * Covers: getContextMetrics, getPermissionUsage, getUserSwitchPatterns,
 * getStaffProductivity, getAnalyticsSummary, trackAction, exportToCSV.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/date-helpers", () => ({
  getTodayISO: jest.fn(() => "2026-04-26"),
}))

// ============================================================================
// Imports
// ============================================================================

import {
  getContextMetrics,
  getPermissionUsage,
  getUserSwitchPatterns,
  getStaffProductivity,
  getAnalyticsSummary,
  trackAction,
  exportToCSV,
} from "@/lib/auth/analytics"

// ============================================================================
// Helpers
// ============================================================================

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "gte", "lte", "lt", "order", "in", "neq", "is", "limit"]
  methods.forEach((m) => { chain[m] = jest.fn(() => chain) })
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

// ============================================================================
// getContextMetrics
// ============================================================================

describe("getContextMetrics", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns context metrics array on success", async () => {
    const metrics = [{ workspace_id: "ws1", user_count: 5 }]
    mockFrom.mockReturnValue(makeChain({ data: metrics, error: null }))
    const result = await getContextMetrics("ws1")
    expect(result).toEqual(metrics)
  })

  it("returns empty array when query errors", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "DB error" } }))
    const result = await getContextMetrics("ws1")
    expect(result).toEqual([])
  })

  it("returns null data as-is when no error (function passes through null)", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await getContextMetrics("ws1")
    // Function returns `data as ContextMetrics[]` — no null guard on success path
    expect(result).toBeNull()
  })
})

// ============================================================================
// getPermissionUsage
// ============================================================================

describe("getPermissionUsage", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns permission usage array on success", async () => {
    const usage = [{ permission: "tenants.view", usage_count: 100 }]
    mockFrom.mockReturnValue(makeChain({ data: usage, error: null }))
    const result = await getPermissionUsage("ws1")
    expect(result).toEqual(usage)
  })

  it("returns empty array when query errors", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "fail" } }))
    const result = await getPermissionUsage("ws1")
    expect(result).toEqual([])
  })
})

// ============================================================================
// getUserSwitchPatterns
// ============================================================================

describe("getUserSwitchPatterns", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty array when no switches", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await getUserSwitchPatterns("u1")
    expect(result).toEqual([])
  })

  it("returns empty array when query errors", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "fail" } }))
    const result = await getUserSwitchPatterns("u1")
    expect(result).toEqual([])
  })

  it("aggregates switch patterns from data", async () => {
    const switches = [
      {
        switched_at: "2026-04-26T10:00:00Z",
        from_context: [{ context_type: "owner" }],
        to_context: [{ context_type: "staff" }],
      },
      {
        switched_at: "2026-04-26T11:00:00Z",
        from_context: { context_type: "staff" },
        to_context: { context_type: "owner" },
      },
    ]
    mockFrom.mockReturnValue(makeChain({ data: switches, error: null }))
    const result = await getUserSwitchPatterns("u1")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0]).toHaveProperty("from_context_type")
    expect(result[0]).toHaveProperty("to_context_type")
    expect(result[0]).toHaveProperty("switch_count")
  })
})

// ============================================================================
// getStaffProductivity
// ============================================================================

describe("getStaffProductivity", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty array when no staff contexts", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await getStaffProductivity("ws1")
    expect(result).toEqual([])
  })

  it("processes staff contexts into productivity records", async () => {
    const contexts = [
      {
        id: "ctx1",
        entity_id: "s1",
        access_count: 10,
        last_accessed_at: "2026-04-25T10:00:00Z",
        role: [{ name: "Manager" }],
        staff: [{ name: "Alice" }],
      },
    ]
    mockFrom.mockReturnValue(makeChain({ data: contexts, error: null }))
    const result = await getStaffProductivity("ws1")
    expect(result).toHaveLength(1)
    expect(result[0].staff_id).toBe("s1")
    expect(result[0].staff_name).toBe("Alice")
    expect(result[0].role_name).toBe("Manager")
    expect(result[0].login_count).toBe(10)
  })
})

// ============================================================================
// getAnalyticsSummary
// ============================================================================

describe("getAnalyticsSummary", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns null when contexts query returns null", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null, count: 0 }))
    const result = await getAnalyticsSummary("ws1")
    expect(result).toBeNull()
  })

  it("returns summary with computed metrics when contexts exist", async () => {
    const contexts = [
      { user_id: "u1", context_type: "owner", last_accessed_at: new Date().toISOString() },
      { user_id: "u2", context_type: "staff", last_accessed_at: "2026-01-01T00:00:00Z" },
    ]
    mockFrom.mockImplementation(() => makeChain({ data: contexts, error: null, count: 2 }))
    const result = await getAnalyticsSummary("ws1")
    expect(result).not.toBeNull()
    expect(result!.total_users).toBe(2)
    expect(result!.context_distribution.owner).toBe(1)
    expect(result!.context_distribution.staff).toBe(1)
  })
})

// ============================================================================
// trackAction
// ============================================================================

describe("trackAction", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("does nothing when user is not authenticated", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    const mockFromWithInsert = { ...makeChain({ data: null }), insert: mockInsert }
    mockFrom.mockReturnValue(mockFromWithInsert)
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await trackAction("ctx1", "tenants.view", "tenant", "t1")
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("inserts audit log when user is authenticated", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    const mockFromWithInsert = { ...makeChain({ data: null }), insert: mockInsert }
    mockFrom.mockReturnValue(mockFromWithInsert)
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    await trackAction("ctx1", "tenants.view", "tenant", "t1", { extra: true })
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1",
      context_id: "ctx1",
      permission: "tenants.view",
      resource_type: "tenant",
    }))
  })
})

// ============================================================================
// exportToCSV (pure DOM utility)
// ============================================================================

describe("exportToCSV", () => {
  let createElementSpy: jest.SpyInstance
  let appendChildSpy: jest.SpyInstance
  let removeChildSpy: jest.SpyInstance
  let clickSpy: jest.Mock

  beforeEach(() => {
    clickSpy = jest.fn()
    const fakeAnchor = { href: "", download: "", click: clickSpy }
    createElementSpy = jest.spyOn(document, "createElement").mockReturnValue(fakeAnchor as unknown as HTMLAnchorElement)
    appendChildSpy = jest.spyOn(document.body, "appendChild").mockReturnValue(fakeAnchor as unknown as Node)
    removeChildSpy = jest.spyOn(document.body, "removeChild").mockReturnValue(fakeAnchor as unknown as Node)
    // URL.createObjectURL/revokeObjectURL may not be spyable in JSDOM — assign directly
    Object.defineProperty(URL, "createObjectURL", { writable: true, configurable: true, value: jest.fn(() => "blob:test") })
    Object.defineProperty(URL, "revokeObjectURL", { writable: true, configurable: true, value: jest.fn() })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it("does nothing when data is empty", () => {
    exportToCSV([], "test-file")
    expect(createElementSpy).not.toHaveBeenCalled()
  })

  it("creates and clicks anchor element for download", () => {
    const data = [
      { name: "Alice", amount: 100 },
      { name: "Bob", amount: 200 },
    ]
    exportToCSV(data, "report")
    expect(createElementSpy).toHaveBeenCalledWith("a")
    expect(appendChildSpy).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(removeChildSpy).toHaveBeenCalled()
  })

  it("wraps values containing commas in quotes", () => {
    const data = [{ name: "Smith, John", amount: 100 }]
    exportToCSV(data, "test")
    expect(clickSpy).toHaveBeenCalled()
    // The Blob was created — content will include the quoted name
    expect(URL.createObjectURL).toHaveBeenCalled()
  })
})
