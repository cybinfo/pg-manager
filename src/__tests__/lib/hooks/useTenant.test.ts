/**
 * Tests for src/lib/hooks/useTenant.ts
 *
 * Covers: useTenant (not authenticated, PGRST116 error, generic error,
 * no data, success with workspace, success without ownerId)
 * and useTenantId (derived hook).
 */

// ============================================================================
// Mocks
// ============================================================================

const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockUseAuth = jest.fn()
jest.mock("@/lib/auth", () => ({
  useAuth: () => mockUseAuth(),
  useCurrentContext: jest.fn(() => ({})),
}))

// ============================================================================
// Imports
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { useTenant, useTenantId } from "@/lib/hooks/useTenant"

// ============================================================================
// Helpers
// ============================================================================

function makeChain(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ["select", "eq", "single"]
  methods.forEach((m) => { chain[m] = jest.fn(() => chain) })
  chain.then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(result).then(onFulfilled)
  return chain
}

const mockTenant = {
  id: "t1",
  name: "Alice",
  email: "alice@example.com",
  status: "active",
  owner_id: "owner-1",
  entity_id: "p1",
  room_id: "r1",
  user_id: "u1",
  person_id: null,
  property: { id: "p1", name: "Test PG", owner_id: "owner-1" },
  room: { id: "r1", room_number: "101" },
}

// ============================================================================
// Not authenticated
// ============================================================================

describe("useTenant — not authenticated", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("sets error when user is null", async () => {
    mockUseAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Not authenticated")
    expect(result.current.tenant).toBeNull()
  })

  it("sets error when user has no id", async () => {
    mockUseAuth.mockReturnValue({ user: {} })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Not authenticated")
  })
})

// ============================================================================
// Tenant query errors
// ============================================================================

describe("useTenant — tenant query errors", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "u1" } })
  })

  it("sets 'No active tenant account found' on PGRST116 error", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { code: "PGRST116", message: "no rows" } }))

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("No active tenant account found")
    expect(result.current.tenant).toBeNull()
  })

  it("sets fallback error on non-PGRST116 query error (thrown plain object)", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: { code: "500", message: "Internal server error" } }))

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    // thrown plain object is not instanceof Error → fallback message used
    expect(result.current.error).toBe("Failed to load tenant data")
  })

  it("sets 'No active tenant account found' when tenantData is null", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.error).toBe("No active tenant account found")
    expect(result.current.tenant).toBeNull()
  })
})

// ============================================================================
// Success path
// ============================================================================

describe("useTenant — success", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "u1" } })
  })

  it("returns tenant and workspace when both are found", async () => {
    const mockWorkspace = { id: "ws1", owner_id: "owner-1" }
    const callCounts: Record<string, number> = {}
    mockFrom.mockImplementation((table: string) => {
      callCounts[table] = (callCounts[table] || 0) + 1
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "workspaces") return makeChain({ data: mockWorkspace, error: null })
      return makeChain({ data: null, error: null })
    })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.tenant?.id).toBe("t1")
    expect(result.current.tenant?.name).toBe("Alice")
    expect(result.current.workspace?.id).toBe("ws1")
    expect(result.current.ownerId).toBe("owner-1")
  })

  it("transforms array-format property join", async () => {
    const tenantWithArrayJoins = {
      ...mockTenant,
      property: [{ id: "p1", name: "Array PG", owner_id: "owner-1" }],
      room: [{ id: "r1", room_number: "101" }],
    }
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: tenantWithArrayJoins, error: null })
      if (table === "workspaces") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.tenant?.property?.name).toBe("Array PG")
    expect(result.current.tenant?.room?.room_number).toBe("101")
  })

  it("skips workspace fetch when no ownerId", async () => {
    const tenantNoOwner = { ...mockTenant, property: null, owner_id: "" }
    mockFrom.mockReturnValue(makeChain({ data: tenantNoOwner, error: null }))

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.tenant).not.toBeNull()
    expect(result.current.workspace).toBeNull()
    expect(mockFrom).not.toHaveBeenCalledWith("workspaces")
  })

  it("leaves workspace null when workspaces query returns no data", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "workspaces") return makeChain({ data: null, error: null })
      return makeChain({ data: null, error: null })
    })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    expect(result.current.tenant).not.toBeNull()
    expect(result.current.workspace).toBeNull()
  })
})

// ============================================================================
// refresh
// ============================================================================

describe("useTenant — refresh", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "u1" } })
  })

  it("re-fetches data when refresh is called", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "workspaces") return makeChain({ data: { id: "ws1", owner_id: "owner-1" }, error: null })
      return makeChain({ data: null, error: null })
    })

    const { result } = renderHook(() => useTenant())

    await act(async () => {})

    const callsBefore = (mockFrom as jest.Mock).mock.calls.length

    await act(async () => {
      await result.current.refresh()
    })

    expect((mockFrom as jest.Mock).mock.calls.length).toBeGreaterThan(callsBefore)
  })
})

// ============================================================================
// useTenantId (derived hook)
// ============================================================================

describe("useTenantId", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseAuth.mockReturnValue({ user: { id: "u1" } })
  })

  it("returns tenantId, ownerId, propertyId derived from useTenant", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "tenants") return makeChain({ data: mockTenant, error: null })
      if (table === "workspaces") return makeChain({ data: { id: "ws1", owner_id: "owner-1" }, error: null })
      return makeChain({ data: null, error: null })
    })

    const { result } = renderHook(() => useTenantId())

    await act(async () => {})

    expect(result.current.tenantId).toBe("t1")
    expect(result.current.ownerId).toBe("owner-1")
    expect(result.current.propertyId).toBe("p1")
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it("returns null values when tenant is null", async () => {
    mockUseAuth.mockReturnValue({ user: null })

    const { result } = renderHook(() => useTenantId())

    await act(async () => {})

    expect(result.current.tenantId).toBeNull()
    expect(result.current.ownerId).toBeNull()
    expect(result.current.propertyId).toBeNull()
  })
})
