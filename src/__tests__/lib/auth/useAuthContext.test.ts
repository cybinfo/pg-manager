/**
 * Tests for src/lib/auth/useAuthContext.ts
 *
 * Covers: useAuthContext (combined hook), useHasAllPermissions,
 * useHasAnyPermission, useOwnerStatus, useContextIds.
 */

// Mocks must be declared before imports
jest.mock("@/lib/auth/auth-context", () => ({
  useAuth: jest.fn(),
  useCurrentContext: jest.fn(),
}))

import { renderHook } from "@testing-library/react"
import { useAuth, useCurrentContext } from "@/lib/auth/auth-context"
import {
  useAuthContext,
  useHasAllPermissions,
  useHasAnyPermission,
  useOwnerStatus,
  useContextIds,
} from "@/lib/auth/useAuthContext"

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>
const mockUseCurrentContext = useCurrentContext as jest.MockedFunction<typeof useCurrentContext>

// ============================================================================
// Helpers
// ============================================================================

function makeUser(id = "u1") {
  return { id, email: "test@example.com" } as ReturnType<typeof useAuth>["user"]
}

function makeAuthReturn(overrides: Partial<ReturnType<typeof useAuth>> = {}): ReturnType<typeof useAuth> {
  return {
    user: null,
    profile: null,
    contexts: [],
    isLoading: false,
    isAuthenticated: false,
    currentContext: null,
    hasMultipleContexts: false,
    isPlatformAdmin: false,
    hasPermission: jest.fn().mockReturnValue(false),
    hasAnyPermission: jest.fn().mockReturnValue(false),
    hasAllPermissions: jest.fn().mockReturnValue(false),
    refreshContexts: jest.fn().mockResolvedValue(undefined),
    switchContext: jest.fn().mockResolvedValue(true),
    setDefaultContext: jest.fn().mockResolvedValue(true),
    logout: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

function makeContextReturn(
  overrides: Partial<ReturnType<typeof useCurrentContext>> = {}
): ReturnType<typeof useCurrentContext> {
  return {
    context: null,
    isOwner: false,
    isStaff: false,
    isTenant: false,
    workspaceName: "",
    ...overrides,
  }
}

function makeContext(workspaceId: string, contextId = "ctx-1") {
  return {
    workspace_id: workspaceId,
    context_id: contextId,
  } as ReturnType<typeof useCurrentContext>["context"]
}

beforeEach(() => {
  mockUseAuth.mockReset()
  mockUseCurrentContext.mockReset()
  // Safe defaults
  mockUseAuth.mockReturnValue(makeAuthReturn())
  mockUseCurrentContext.mockReturnValue(makeContextReturn())
})

// ============================================================================
// useAuthContext — isAuthenticated
// ============================================================================

describe("useAuthContext — isAuthenticated", () => {
  it("is false when user is null", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ user: null }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isAuthenticated).toBe(false)
  })

  it("is true when user is present", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ user: makeUser() }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isAuthenticated).toBe(true)
  })
})

// ============================================================================
// useAuthContext — workspaceId
// ============================================================================

describe("useAuthContext — workspaceId", () => {
  it("is null when context is null", () => {
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ context: null }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.workspaceId).toBeNull()
  })

  it("returns workspace_id when context is present", () => {
    mockUseCurrentContext.mockReturnValue(
      makeContextReturn({ context: makeContext("ws-42") })
    )
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.workspaceId).toBe("ws-42")
  })
})

// ============================================================================
// useAuthContext — isOwnerOrAdmin
// ============================================================================

describe("useAuthContext — isOwnerOrAdmin", () => {
  it("is false when neither owner nor admin", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isOwnerOrAdmin).toBe(false)
  })

  it("is true when isOwner is true", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isOwnerOrAdmin).toBe(true)
  })

  it("is true when isPlatformAdmin is true", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isOwnerOrAdmin).toBe(true)
  })

  it("is true when both owner and admin", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isOwnerOrAdmin).toBe(true)
  })
})

// ============================================================================
// useAuthContext — canManageStaff
// ============================================================================

describe("useAuthContext — canManageStaff", () => {
  it("is false when no owner, no admin, no permission", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false, hasPermission }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.canManageStaff).toBe(false)
  })

  it("is true when isOwner is true", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false, hasPermission }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.canManageStaff).toBe(true)
  })

  it("is true when isPlatformAdmin is true", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true, hasPermission }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.canManageStaff).toBe(true)
  })

  it("is true when hasPermission('staff.manage') is true", () => {
    const hasPermission = jest.fn().mockImplementation((p: string) => p === "staff.manage")
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false, hasPermission }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.canManageStaff).toBe(true)
  })
})

// ============================================================================
// useAuthContext — passthrough fields
// ============================================================================

describe("useAuthContext — passthrough fields", () => {
  it("exposes isLoading from useAuth", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isLoading: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isLoading).toBe(true)
  })

  it("exposes isPlatformAdmin from useAuth", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isPlatformAdmin).toBe(true)
  })

  it("exposes isOwner from useCurrentContext", () => {
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isOwner).toBe(true)
  })

  it("exposes isStaff from useCurrentContext", () => {
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isStaff: true }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.isStaff).toBe(true)
  })

  it("exposes currentContext from useCurrentContext", () => {
    const ctx = makeContext("ws-1")
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ context: ctx }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.currentContext).toBe(ctx)
  })

  it("exposes workspaceName from useCurrentContext", () => {
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ workspaceName: "Test PG" }))
    const { result } = renderHook(() => useAuthContext())
    expect(result.current.workspaceName).toBe("Test PG")
  })
})

// ============================================================================
// useHasAllPermissions
// ============================================================================

describe("useHasAllPermissions", () => {
  it("returns true when all permissions pass", () => {
    const hasPermission = jest.fn().mockReturnValue(true)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAllPermissions(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(true)
    expect(hasPermission).toHaveBeenCalledWith("tenants.view")
    expect(hasPermission).toHaveBeenCalledWith("bills.view")
  })

  it("returns false when one permission fails", () => {
    const hasPermission = jest.fn().mockImplementation((p: string) => p === "tenants.view")
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAllPermissions(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(false)
  })

  it("returns false when all permissions fail", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAllPermissions(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(false)
  })

  it("returns true for empty array (vacuous truth)", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() => useHasAllPermissions([]))
    expect(result.current).toBe(true)
  })
})

// ============================================================================
// useHasAnyPermission
// ============================================================================

describe("useHasAnyPermission", () => {
  it("returns true when at least one permission passes", () => {
    const hasPermission = jest.fn().mockImplementation((p: string) => p === "bills.view")
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAnyPermission(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(true)
  })

  it("returns false when all permissions fail", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAnyPermission(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(false)
  })

  it("returns true when all permissions pass", () => {
    const hasPermission = jest.fn().mockReturnValue(true)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() =>
      useHasAnyPermission(["tenants.view", "bills.view"])
    )
    expect(result.current).toBe(true)
  })

  it("returns false for empty array", () => {
    const hasPermission = jest.fn().mockReturnValue(false)
    mockUseAuth.mockReturnValue(makeAuthReturn({ hasPermission }))
    const { result } = renderHook(() => useHasAnyPermission([]))
    expect(result.current).toBe(false)
  })
})

// ============================================================================
// useOwnerStatus
// ============================================================================

describe("useOwnerStatus", () => {
  it("isOwnerOrAdmin is false when owner=false and admin=false", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useOwnerStatus())
    expect(result.current.isOwnerOrAdmin).toBe(false)
    expect(result.current.isOwner).toBe(false)
    expect(result.current.isAdmin).toBe(false)
  })

  it("isOwnerOrAdmin is true when isOwner=true", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: false }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: true }))
    const { result } = renderHook(() => useOwnerStatus())
    expect(result.current.isOwnerOrAdmin).toBe(true)
    expect(result.current.isOwner).toBe(true)
  })

  it("isOwnerOrAdmin is true when isPlatformAdmin=true", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true }))
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ isOwner: false }))
    const { result } = renderHook(() => useOwnerStatus())
    expect(result.current.isOwnerOrAdmin).toBe(true)
    expect(result.current.isAdmin).toBe(true)
  })

  it("maps isPlatformAdmin to isAdmin field", () => {
    mockUseAuth.mockReturnValue(makeAuthReturn({ isPlatformAdmin: true }))
    const { result } = renderHook(() => useOwnerStatus())
    expect(result.current.isAdmin).toBe(true)
  })
})

// ============================================================================
// useContextIds
// ============================================================================

describe("useContextIds", () => {
  it("returns null workspaceId and contextId when context is null", () => {
    mockUseCurrentContext.mockReturnValue(makeContextReturn({ context: null }))
    const { result } = renderHook(() => useContextIds())
    expect(result.current.workspaceId).toBeNull()
    expect(result.current.contextId).toBeNull()
  })

  it("returns workspace_id and context_id from context", () => {
    mockUseCurrentContext.mockReturnValue(
      makeContextReturn({ context: makeContext("ws-99", "ctx-99") })
    )
    const { result } = renderHook(() => useContextIds())
    expect(result.current.workspaceId).toBe("ws-99")
    expect(result.current.contextId).toBe("ctx-99")
  })
})
