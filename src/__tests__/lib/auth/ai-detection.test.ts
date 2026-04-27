/**
 * Tests for src/lib/auth/ai-detection.ts
 *
 * Covers: detectIdentityConflicts, findExistingUser, checkContextAnomalies,
 * logPermissionCheck, getSuggestionsForIdentity, validateInvitation.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = jest.fn()
const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = {
  from: mockFrom,
  auth: { getUser: mockGetUser },
  rpc: mockRpc as unknown as typeof mockRpc,
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-04-26T00:00:00Z"),
}))

// ============================================================================
// Imports
// ============================================================================

import {
  detectIdentityConflicts,
  findExistingUser,
  checkContextAnomalies,
  logPermissionCheck,
  getSuggestionsForIdentity,
  validateInvitation,
} from "@/lib/auth/ai-detection"

// ============================================================================
// Helpers
// ============================================================================

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "gte", "lte", "order", "in", "or", "single", "is"]
  methods.forEach((m) => { chain[m] = jest.fn(() => chain) })
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

// ============================================================================
// detectIdentityConflicts
// ============================================================================

describe("detectIdentityConflicts", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty array when no email and no phone provided", async () => {
    const result = await detectIdentityConflicts()
    expect(result).toEqual([])
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("returns conflicts when RPC succeeds with data", async () => {
    const conflicts = [{ source_id: "s1", source_type: "staff", workspace_name: "Test PG" }]
    // mockRpc is the supabase.rpc method — but in ai-detection.ts, it casts supabase.rpc
    // The function actually calls: (supabase.rpc as unknown as fn)('detect_identity_conflicts', args)
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: conflicts, error: null })
    const result = await detectIdentityConflicts("a@b.com")
    expect(result).toEqual(conflicts)
  })

  it("returns empty array when RPC returns error", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: null, error: { message: "RPC failed" } })
    const result = await detectIdentityConflicts("a@b.com")
    expect(result).toEqual([])
  })

  it("returns empty array when RPC returns null data", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: null, error: null })
    const result = await detectIdentityConflicts("a@b.com")
    expect(result).toEqual([])
  })

  it("works with phone only", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null })
    const result = await detectIdentityConflicts(undefined, "9876543210")
    expect(result).toEqual([])
  })
})

// ============================================================================
// findExistingUser
// ============================================================================

describe("findExistingUser", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns null when no email and no phone", async () => {
    const result = await findExistingUser()
    expect(result).toBeNull()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it("returns user when RPC returns rows", async () => {
    const user = { user_id: "u1", name: "Alice", email: "a@b.com", phone: null, has_contexts: true }
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [user], error: null })
    const result = await findExistingUser("a@b.com")
    expect(result).toEqual(user)
  })

  it("returns null when RPC returns empty rows", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null })
    const result = await findExistingUser("a@b.com")
    expect(result).toBeNull()
  })

  it("returns null when RPC returns error", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: null, error: { message: "fail" } })
    const result = await findExistingUser("a@b.com")
    expect(result).toBeNull()
  })
})

// ============================================================================
// checkContextAnomalies
// ============================================================================

describe("checkContextAnomalies", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns empty array when no contexts found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await checkContextAnomalies("u1")
    expect(result).toEqual([])
  })

  it("returns empty array when contexts is empty", async () => {
    mockFrom.mockReturnValue(makeChain({ data: [], error: null }))
    const result = await checkContextAnomalies("u1")
    expect(result).toEqual([])
  })

  it("detects staff_and_tenant_same_workspace anomaly", async () => {
    const contexts = [
      { workspace_id: "ws1", context_type: "staff", workspace: { name: "Test PG" } },
      { workspace_id: "ws1", context_type: "tenant", workspace: { name: "Test PG" } },
    ]
    // First call (user_contexts) returns contexts, second (context_switches) returns empty
    mockFrom
      .mockReturnValueOnce(makeChain({ data: contexts, error: null }))
      .mockReturnValue(makeChain({ data: [], error: null }))
    const result = await checkContextAnomalies("u1")
    expect(result.length).toBeGreaterThan(0)
    expect(result[0].type).toBe("staff_and_tenant_same_workspace")
    expect(result[0].severity).toBe("medium")
  })

  it("detects rapid_context_switching when many switches in last minute", async () => {
    const contexts = [
      { workspace_id: "ws1", context_type: "owner", workspace: { name: "Test PG" } },
    ]
    const switches = Array(11).fill({
      switched_at: new Date().toISOString(),
    })
    mockFrom
      .mockReturnValueOnce(makeChain({ data: contexts, error: null }))
      .mockReturnValue(makeChain({ data: switches, error: null }))
    const result = await checkContextAnomalies("u1")
    const rapidSwitch = result.find((a) => a.type === "rapid_context_switching")
    expect(rapidSwitch).toBeDefined()
    expect(rapidSwitch!.severity).toBe("high")
  })

  it("workspace can be an array (array join pattern)", async () => {
    const contexts = [
      { workspace_id: "ws1", context_type: "staff", workspace: [{ name: "Array PG" }] },
      { workspace_id: "ws1", context_type: "tenant", workspace: [{ name: "Array PG" }] },
    ]
    mockFrom
      .mockReturnValueOnce(makeChain({ data: contexts, error: null }))
      .mockReturnValue(makeChain({ data: [], error: null }))
    const result = await checkContextAnomalies("u1")
    expect(result.some((a) => a.type === "staff_and_tenant_same_workspace")).toBe(true)
    expect(result[0].message).toContain("Array PG")
  })
})

// ============================================================================
// logPermissionCheck
// ============================================================================

describe("logPermissionCheck", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns early when user is not authenticated", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ ...makeChain(null), insert: mockInsert })
    mockGetUser.mockResolvedValue({ data: { user: null } })
    await logPermissionCheck("ctx1", "tenants.view", "tenant", null, "granted")
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it("inserts audit log when user is authenticated", async () => {
    const mockInsert = jest.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ ...makeChain(null), insert: mockInsert })
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    await logPermissionCheck("ctx1", "tenants.view", "tenant", "t1", "denied")
    expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
      user_id: "u1",
      context_id: "ctx1",
      permission: "tenants.view",
      action: "denied",
    }))
  })
})

// ============================================================================
// getSuggestionsForIdentity
// ============================================================================

describe("getSuggestionsForIdentity", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("suggests create_new when no user and no conflicts found", async () => {
    // findExistingUser returns null (empty rows), detectIdentityConflicts returns []
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null })
    const result = await getSuggestionsForIdentity("new@user.com")
    expect(result.length).toBe(1)
    expect(result[0].type).toBe("create_new")
    expect(result[0].confidence).toBe(1)
  })

  it("suggests link_existing_user when matching user found", async () => {
    const user = { user_id: "u1", name: "Alice", email: "a@b.com", phone: null, has_contexts: true }
    // First RPC call (findExistingUser) returns user
    // Second RPC call (detectIdentityConflicts) returns empty
    ;(mockSupabase.rpc as unknown as jest.Mock)
      .mockResolvedValueOnce({ data: [user], error: null })
      .mockResolvedValue({ data: [], error: null })
    const result = await getSuggestionsForIdentity("a@b.com")
    expect(result.some((s) => s.type === "link_existing_user")).toBe(true)
    expect(result.find((s) => s.type === "link_existing_user")?.confidence).toBe(0.95)
  })

  it("suggests link for staff conflict", async () => {
    const conflict = { source_id: "s1", source_type: "staff", workspace_name: "My PG", has_user_id: false }
    // findExistingUser → no user
    ;(mockSupabase.rpc as unknown as jest.Mock)
      .mockResolvedValueOnce({ data: [], error: null })  // findExistingUser
      .mockResolvedValue({ data: [conflict], error: null })  // detectIdentityConflicts
    const result = await getSuggestionsForIdentity("a@b.com")
    expect(result.some((s) => s.action.type === "link_staff")).toBe(true)
  })

  it("returns create_new when no email and no phone", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null })
    const result = await getSuggestionsForIdentity()
    // Both inner calls return null/empty — suggests create_new
    expect(result[0].type).toBe("create_new")
  })

  it("suggests link_tenant when conflict source_type is tenant", async () => {
    const conflict = { source_id: "t1", source_type: "tenant", workspace_name: "PG House", has_user_id: false }
    ;(mockSupabase.rpc as unknown as jest.Mock)
      .mockResolvedValueOnce({ data: [], error: null })  // findExistingUser
      .mockResolvedValue({ data: [conflict], error: null })  // detectIdentityConflicts
    const result = await getSuggestionsForIdentity("a@b.com")
    expect(result.some((s) => s.action.type === "link_tenant")).toBe(true)
  })

  it("suggests accept_invitation when conflict source_type is invitation", async () => {
    const conflict = { source_id: "inv1", source_type: "invitation", workspace_name: "Library", has_user_id: false }
    ;(mockSupabase.rpc as unknown as jest.Mock)
      .mockResolvedValueOnce({ data: [], error: null })  // findExistingUser
      .mockResolvedValue({ data: [conflict], error: null })  // detectIdentityConflicts
    const result = await getSuggestionsForIdentity("a@b.com")
    expect(result.some((s) => s.action.type === "accept_invitation")).toBe(true)
  })

  it("returns create_new when conflicts exist but none match known types", async () => {
    const conflict = { source_id: "x1", source_type: "unknown_type", workspace_name: "WS", has_user_id: false }
    ;(mockSupabase.rpc as unknown as jest.Mock)
      .mockResolvedValueOnce({ data: [], error: null })  // findExistingUser
      .mockResolvedValue({ data: [conflict], error: null })  // detectIdentityConflicts
    const result = await getSuggestionsForIdentity("a@b.com")
    // No matching handler — falls through to create_new
    expect(result.some((s) => s.type === "create_new")).toBe(true)
  })
})

// ============================================================================
// validateInvitation
// ============================================================================

describe("validateInvitation", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns error when no email and no phone", async () => {
    const result = await validateInvitation("ws1")
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain("Email or phone is required")
  })

  it("returns valid when no user found and no pending invite", async () => {
    // findExistingUser → empty
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null })
    // pending invite query → null
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))
    const result = await validateInvitation("ws1", "new@user.com", undefined, "staff")
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it("returns error when user already has same context type in workspace", async () => {
    const user = { user_id: "u1", name: "Alice", email: "a@b.com", phone: null, has_contexts: true }
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [user], error: null })
    // existing context query returns data
    mockFrom.mockReturnValue(makeChain({ data: { id: "ctx1" }, error: null }))
    const result = await validateInvitation("ws1", "a@b.com", undefined, "staff")
    expect(result.isValid).toBe(false)
    expect(result.errors[0]).toContain("already has staff access")
  })

  it("adds warning when staff user also has tenant context", async () => {
    const user = { user_id: "u1", name: "Alice", email: "a@b.com", phone: null, has_contexts: true }
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [user], error: null })
    let callCount = 0
    mockFrom.mockImplementation(() => {
      callCount++
      // First: user_contexts for staff (no existing staff context) → null
      // Second: user_contexts for tenant → has tenant context
      if (callCount === 1) return makeChain({ data: null, error: null }) // no existing staff context
      if (callCount === 2) return makeChain({ data: { id: "ctx2" }, error: null }) // has tenant context
      return makeChain({ data: null, error: null })
    })
    const result = await validateInvitation("ws1", "a@b.com", undefined, "staff")
    expect(result.isValid).toBe(true)
    expect(result.warnings.some((w) => w.includes("both staff and tenant access"))).toBe(true)
  })

  it("adds warning when pending invitation found for email/phone", async () => {
    ;(mockSupabase.rpc as unknown as jest.Mock).mockResolvedValue({ data: [], error: null }) // no existing user
    mockFrom.mockReturnValue(makeChain({ data: { id: "inv1", status: "pending" }, error: null }))
    const result = await validateInvitation("ws1", "new@user.com", undefined, "tenant")
    expect(result.isValid).toBe(true)
    expect(result.warnings.some((w) => w.includes("pending invitation"))).toBe(true)
  })
})
