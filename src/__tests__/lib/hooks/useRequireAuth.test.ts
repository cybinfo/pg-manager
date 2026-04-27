/**
 * Tests for src/lib/hooks/useRequireAuth.ts
 *
 * Covers: initial auth load, getUser, checkAuth (authenticated + unauthenticated),
 * showToast option, custom redirectTo, and standalone requireAuth function.
 */

// ============================================================================
// Mocks
// ============================================================================

const mockGetUser = jest.fn()
const mockSupabase = { auth: { getUser: mockGetUser } }

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

const mockRouterPush = jest.fn()
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockRouterPush })),
}))

const mockShowError = jest.fn()
jest.mock("@/lib/toast-helpers", () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
}))

// ============================================================================
// Imports
// ============================================================================

import { renderHook, act } from "@testing-library/react"
import { useRequireAuth, requireAuth } from "@/lib/hooks/useRequireAuth"
import { useRouter } from "next/navigation"

// ============================================================================
// useRequireAuth — initial load
// ============================================================================

describe("useRequireAuth — initial load", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("starts loading=true and user=null", () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })
    const { result } = renderHook(() => useRequireAuth())
    expect(result.current.loading).toBe(true)
    expect(result.current.user).toBeNull()
  })

  it("sets user and loading=false after mount when authenticated", async () => {
    const mockUser = { id: "u1", email: "alice@example.com" }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toEqual(mockUser)
  })

  it("sets user=null and loading=false when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    expect(result.current.loading).toBe(false)
    expect(result.current.user).toBeNull()
  })
})

// ============================================================================
// useRequireAuth — getUser
// ============================================================================

describe("useRequireAuth — getUser", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns user when authenticated", async () => {
    const mockUser = { id: "u1" }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    let returned: unknown
    await act(async () => {
      returned = await result.current.getUser()
    })

    expect(returned).toEqual(mockUser)
    expect(result.current.user).toEqual(mockUser)
  })

  it("returns null and updates state when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    let returned: unknown
    await act(async () => {
      returned = await result.current.getUser()
    })

    expect(returned).toBeNull()
    expect(result.current.user).toBeNull()
  })
})

// ============================================================================
// useRequireAuth — checkAuth (authenticated)
// ============================================================================

describe("useRequireAuth — checkAuth authenticated", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns user without redirect when authenticated", async () => {
    const mockUser = { id: "u1" }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    let returned: unknown
    await act(async () => {
      returned = await result.current.checkAuth()
    })

    expect(returned).toEqual(mockUser)
    expect(mockRouterPush).not.toHaveBeenCalled()
    expect(mockShowError).not.toHaveBeenCalled()
  })
})

// ============================================================================
// useRequireAuth — checkAuth (not authenticated)
// ============================================================================

describe("useRequireAuth — checkAuth not authenticated", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("shows error and redirects to /login when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() => useRequireAuth())

    await act(async () => {})

    let returned: unknown
    await act(async () => {
      returned = await result.current.checkAuth()
    })

    expect(returned).toBeNull()
    expect(mockShowError).toHaveBeenCalledWith("Session expired. Please login again.")
    expect(mockRouterPush).toHaveBeenCalledWith("/login")
  })

  it("uses custom redirectTo when provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() =>
      useRequireAuth({ redirectTo: "/auth/login" })
    )

    await act(async () => {})

    await act(async () => {
      await result.current.checkAuth()
    })

    expect(mockRouterPush).toHaveBeenCalledWith("/auth/login")
  })

  it("uses custom errorMessage when provided", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() =>
      useRequireAuth({ errorMessage: "Please sign in first." })
    )

    await act(async () => {})

    await act(async () => {
      await result.current.checkAuth()
    })

    expect(mockShowError).toHaveBeenCalledWith("Please sign in first.")
  })

  it("skips showError when showToast=false", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const { result } = renderHook(() =>
      useRequireAuth({ showToast: false })
    )

    await act(async () => {})

    await act(async () => {
      await result.current.checkAuth()
    })

    expect(mockShowError).not.toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith("/login")
  })
})

// ============================================================================
// requireAuth (standalone utility function)
// ============================================================================

describe("requireAuth standalone function", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns user when authenticated", async () => {
    const mockUser = { id: "u1" }
    mockGetUser.mockResolvedValue({ data: { user: mockUser } })

    const router = (useRouter as jest.Mock)()
    const result = await requireAuth(router)

    expect(result).toEqual(mockUser)
    expect(mockRouterPush).not.toHaveBeenCalled()
  })

  it("redirects and returns null when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const router = (useRouter as jest.Mock)()
    const result = await requireAuth(router)

    expect(result).toBeNull()
    expect(mockShowError).toHaveBeenCalledWith("Session expired. Please login again.")
    expect(mockRouterPush).toHaveBeenCalledWith("/login")
  })

  it("uses custom options", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const router = (useRouter as jest.Mock)()
    await requireAuth(router, {
      redirectTo: "/sign-in",
      errorMessage: "Login required.",
      showToast: false,
    })

    expect(mockShowError).not.toHaveBeenCalled()
    expect(mockRouterPush).toHaveBeenCalledWith("/sign-in")
  })
})
