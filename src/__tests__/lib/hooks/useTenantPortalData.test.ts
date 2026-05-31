/**
 * Tests for src/lib/hooks/useTenantPortalData.ts
 *
 * Covers: null rawData (no context), workspace resolution, context error,
 * combined loading, and config delegation to usePortalData.
 */

// ============================================================================
// Mocks
// ============================================================================

// Mock createClient for workspace query
const mockFrom = jest.fn()
const mockSupabase = { from: mockFrom }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

// Mock usePortalData — control rawData and base state
const mockRefresh = jest.fn()
const mockPortalReturn = {
  data: null as unknown,
  rawData: null as Record<string, unknown> | null,
  user: null as unknown,
  loading: false,
  error: null as string | null,
  refresh: mockRefresh,
}

jest.mock("@/lib/hooks/usePortalData", () => ({
  usePortalData: () => mockPortalReturn,
}))

// ============================================================================
// Imports
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { useTenantPortalData, TENANT_PORTAL_CONFIG } from "@/lib/hooks/useTenantPortalData"

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

const mockRawData = {
  id: "t1",
  owner_id: "owner-1",
  entity_id: "p1",
  room_id: "r1",
  property: { id: "p1", name: "Test PG", owner_id: "owner-1" },
}

// ============================================================================
// No rawData (tenant not loaded)
// ============================================================================

describe("useTenantPortalData — no rawData", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPortalReturn.rawData = null
    mockPortalReturn.data = null
    mockPortalReturn.loading = false
    mockPortalReturn.error = null
  })

  it("returns null tenantContext when rawData is null", async () => {
    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.tenantContext).toBeNull()
    expect(result.current.tenant).toBeNull()
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it("passes through error and loading from usePortalData", () => {
    mockPortalReturn.error = "Not authenticated"
    mockPortalReturn.loading = true

    const { result } = renderHook(() => useTenantPortalData())

    expect(result.current.error).toBe("Not authenticated")
    expect(result.current.loading).toBe(true)
  })

  it("passes through refresh from usePortalData", () => {
    const { result } = renderHook(() => useTenantPortalData())
    expect(result.current.refresh).toBe(mockRefresh)
  })
})

// ============================================================================
// Context resolution (rawData available)
// ============================================================================

describe("useTenantPortalData — context resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPortalReturn.rawData = mockRawData
    mockPortalReturn.data = mockRawData as unknown
    mockPortalReturn.loading = false
    mockPortalReturn.error = null
  })

  it("resolves tenantContext after workspace fetch", async () => {
    mockFrom.mockReturnValue(makeChain({ data: { id: "ws-1" }, error: null }))

    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.tenantContext).not.toBeNull()
    expect(result.current.tenantContext?.id).toBe("t1")
    expect(result.current.tenantContext?.workspace_id).toBe("ws-1")
    expect(result.current.tenantContext?.owner_id).toBe("owner-1")
    expect(result.current.tenantContext?.entity_id).toBe("p1")
    expect(result.current.tenantContext?.room_id).toBe("r1")
  })

  it("uses empty string for workspace_id when workspace query returns no data", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.tenantContext?.workspace_id).toBe("")
  })

  it("uses rawData.owner_id when property has no owner_id", async () => {
    mockPortalReturn.rawData = {
      ...mockRawData,
      property: null, // no property → fall back to rawData.owner_id
    }
    mockFrom.mockReturnValue(makeChain({ data: { id: "ws-2" }, error: null }))

    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.tenantContext?.owner_id).toBe("owner-1")
    // workspaces should still be queried with rawData.owner_id
    expect(mockFrom).toHaveBeenCalledWith("workspaces")
  })

  it("sets tenantContext to null on workspace fetch exception", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("DB connection failed")
    })

    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.tenantContext).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it("does not update context when effect is cancelled (rawData changes rapidly)", async () => {
    // This tests the `cancelled` flag in the useEffect cleanup
    let resolveWorkspace: (v: unknown) => void
    const delayedWorkspace = new Promise((res) => { resolveWorkspace = res })
    mockFrom.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      then: (onFulfilled: (v: unknown) => unknown) =>
        delayedWorkspace.then(onFulfilled),
    })

    const { result, unmount } = renderHook(() => useTenantPortalData())

    // Unmount immediately (simulates rawData change → cleanup runs → cancelled = true)
    unmount()

    // Now resolve the workspace — shouldn't update since cancelled
    resolveWorkspace!({ data: { id: "ws-late" }, error: null })

    await act(async () => {})

    // tenantContext should remain null since the effect was cancelled on unmount
    expect(result.current.tenantContext).toBeNull()
  })
})

// ============================================================================
// Combined loading
// ============================================================================

describe("useTenantPortalData — combined loading", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockPortalReturn.rawData = null
    mockPortalReturn.data = null
  })

  it("returns loading=true when base is loading", () => {
    mockPortalReturn.loading = true

    const { result } = renderHook(() => useTenantPortalData())

    expect(result.current.loading).toBe(true)
  })

  it("returns loading=false when base is not loading and rawData is null", async () => {
    mockPortalReturn.loading = false
    mockPortalReturn.rawData = null

    const { result } = renderHook(() => useTenantPortalData())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
  })
})

// ============================================================================
// TENANT_PORTAL_CONFIG.postTransform (line 112)
// ============================================================================

describe("TENANT_PORTAL_CONFIG.postTransform", () => {
  it("returns the data passed through as TenantPortalTenant", () => {
    const raw = { id: "t1", name: "Alice" } as Record<string, unknown>
    // postTransform is a pure identity/type cast
    const result = TENANT_PORTAL_CONFIG.postTransform(raw)
    expect(result).toBe(raw)
  })
})
