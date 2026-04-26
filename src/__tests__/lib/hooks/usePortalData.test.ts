/**
 * Tests for src/lib/hooks/usePortalData.ts
 *
 * Covers: not authenticated, query error, success with/without postTransform,
 * joinField transformation, exception catch path, and refresh callback.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

jest.mock("@/lib/supabase/transforms", () => ({
  transformJoin: jest.fn((val: unknown) => {
    if (Array.isArray(val)) return val[0] ?? null
    return val ?? null
  }),
}))

// ============================================================================
// Imports
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { usePortalData } from "@/lib/hooks/usePortalData"

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

const baseConfig = {
  table: "tenants",
  select: "*, room:rooms(id, room_number)",
  joinFields: ["room"],
}

// ============================================================================
// Not authenticated
// ============================================================================

describe("usePortalData — not authenticated", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("sets error when user is null (not logged in)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { result } = renderHook(() => usePortalData(baseConfig))

    // Initially loading
    expect(result.current.loading).toBe(true)

    await act(async () => {
      // wait for useEffect
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Not authenticated")
    expect(result.current.data).toBeNull()
    expect(result.current.user).toBeNull()
  })
})

// ============================================================================
// Query error / no record
// ============================================================================

describe("usePortalData — query error", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("sets data to null when query returns error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }))

    const { result } = renderHook(() => usePortalData(baseConfig))

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(result.current.rawData).toBeNull()
    expect(result.current.error).toBeNull() // no error state set on query failure
  })

  it("sets data to null when record is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }))

    const { result } = renderHook(() => usePortalData(baseConfig))

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
  })
})

// ============================================================================
// Success path
// ============================================================================

describe("usePortalData — success", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns transformed data without postTransform", async () => {
    const mockRecord = {
      id: "t1",
      name: "Alice",
      status: "active",
      room: [{ id: "r1", room_number: "101" }],
    }
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockReturnValue(makeChain({ data: mockRecord, error: null }))

    const { result } = renderHook(() => usePortalData(baseConfig))

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(result.current.user).toEqual({ id: "u1" })
    expect(result.current.data).not.toBeNull()
    // room field should be transformJoin'd (array → first element)
    expect((result.current.data as Record<string, unknown>)?.room).toEqual({ id: "r1", room_number: "101" })
    expect(result.current.rawData?.id).toBe("t1")
  })

  it("applies postTransform when provided", async () => {
    const mockRecord = { id: "t1", name: "Bob", room: { id: "r1", room_number: "202" } }
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockReturnValue(makeChain({ data: mockRecord, error: null }))

    const postTransform = jest.fn((data: Record<string, unknown>) => ({
      ...data,
      displayName: `Tenant: ${data.name}`,
    }))

    const { result } = renderHook(() =>
      usePortalData({ ...baseConfig, postTransform })
    )

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(postTransform).toHaveBeenCalledWith(expect.objectContaining({ id: "t1", name: "Bob" }))
    expect((result.current.data as Record<string, unknown>)?.displayName).toBe("Tenant: Bob")
  })

  it("uses custom statusFilter when provided", async () => {
    const mockRecord = { id: "t1", status: "active" }
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    const chain = makeChain({ data: mockRecord, error: null })
    mockFrom.mockReturnValue(chain)

    const { result } = renderHook(() =>
      usePortalData({
        ...baseConfig,
        statusFilter: { column: "status", value: "active" },
      })
    )

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.data).not.toBeNull()
  })

  it("sets user from auth getUser", async () => {
    const mockUser = { id: "user-123", email: "alice@example.com" }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })
    mockFrom.mockReturnValue(makeChain({ data: { id: "t1" }, error: null }))

    const { result } = renderHook(() => usePortalData({ ...baseConfig, joinFields: [] }))

    await act(async () => {})

    expect(result.current.user).toEqual(mockUser)
  })
})

// ============================================================================
// Exception / catch path
// ============================================================================

describe("usePortalData — exception catch", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("sets error when getUser throws", async () => {
    mockGetUser.mockRejectedValue(new Error("Network error"))

    const { result } = renderHook(() => usePortalData(baseConfig))

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Network error")
  })

  it("sets error when from().select() chain throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockImplementation(() => {
      throw new Error("Unexpected DB failure")
    })

    const { result } = renderHook(() => usePortalData(baseConfig))

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe("Unexpected DB failure")
  })
})

// ============================================================================
// Refresh callback
// ============================================================================

describe("usePortalData — refresh", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("re-fetches data when refresh is called", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } })
    mockFrom.mockReturnValue(makeChain({ data: { id: "t1", name: "Alice" }, error: null }))

    const { result } = renderHook(() => usePortalData({ ...baseConfig, joinFields: [] }))

    await act(async () => {})
    expect(result.current.data).not.toBeNull()

    // Change the data returned, then refresh
    mockFrom.mockReturnValue(makeChain({ data: { id: "t1", name: "Alice Updated" }, error: null }))

    await act(async () => {
      await result.current.refresh()
    })

    expect((result.current.data as Record<string, unknown>)?.name).toBe("Alice Updated")
  })
})
