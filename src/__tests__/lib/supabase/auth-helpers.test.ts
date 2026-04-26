/**
 * Tests for src/lib/supabase/auth-helpers.ts
 *
 * Covers: getCurrentUser, getCurrentUserWithError, requireUser,
 * requireUserWithClient, requireAdminClient, checkStaffPermission,
 * getCurrentUserId, isCurrentUser.
 */

const mockCreateClient = jest.fn()
const mockCreateBrowserClient = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@supabase/supabase-js", () => ({
  createClient: (...args: unknown[]) => mockCreateBrowserClient(...args),
}))

import {
  getCurrentUser,
  getCurrentUserWithError,
  requireUser,
  requireUserWithClient,
  requireAdminClient,
  checkStaffPermission,
  getCurrentUserId,
  isCurrentUser,
} from "@/lib/supabase/auth-helpers"

// ============================================================================
// Helpers
// ============================================================================

function makeUser(id = "user-1") {
  return {
    id,
    email: "test@example.com",
    aud: "authenticated",
    role: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
    app_metadata: {},
    user_metadata: {},
  }
}

function makeAuthSupabase(user: ReturnType<typeof makeUser> | null, throwError?: boolean) {
  return {
    auth: {
      getUser: throwError
        ? jest.fn().mockRejectedValue(new Error("auth error"))
        : jest.fn().mockResolvedValue({ data: { user }, error: user ? null : { message: "No user" } }),
    },
  }
}

beforeEach(() => {
  mockCreateClient.mockReset()
  mockCreateBrowserClient.mockReset()
  delete process.env.NEXT_PUBLIC_SUPABASE_URL
  delete process.env.SUPABASE_SERVICE_ROLE_KEY
})

// ============================================================================
// getCurrentUser
// ============================================================================

describe("getCurrentUser", () => {
  it("returns user when authenticated", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    const result = await getCurrentUser()
    expect(result).toBe(user)
  })

  it("returns null when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    const result = await getCurrentUser()
    expect(result).toBeNull()
  })
})

// ============================================================================
// getCurrentUserWithError
// ============================================================================

describe("getCurrentUserWithError", () => {
  it("returns user and null error when authenticated", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user }, error: null }),
      },
    })

    const result = await getCurrentUserWithError()
    expect(result.user).toBe(user)
    expect(result.error).toBeNull()
  })

  it("returns null user with error when not authenticated", async () => {
    const err = { message: "JWT expired" }
    mockCreateClient.mockReturnValue({
      auth: {
        getUser: jest
          .fn()
          .mockResolvedValue({ data: { user: null }, error: err }),
      },
    })

    const result = await getCurrentUserWithError()
    expect(result.user).toBeNull()
    expect(result.error).toBe(err)
  })
})

// ============================================================================
// requireUser
// ============================================================================

describe("requireUser", () => {
  it("returns user and null response when authenticated", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    const result = await requireUser()
    expect(result.user).toBe(user)
    expect(result.response).toBeNull()
  })

  it("returns null user and unauthorized response when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    const result = await requireUser()
    expect(result.user).toBeNull()
    expect(result.response).not.toBeNull()
    expect(result.response!.status).toBe(401)
  })
})

// ============================================================================
// requireUserWithClient
// ============================================================================

describe("requireUserWithClient", () => {
  it("returns user, supabase, and null response when authenticated", async () => {
    const user = makeUser()
    const supabaseMock = makeAuthSupabase(user)
    mockCreateClient.mockReturnValue(supabaseMock)

    const result = await requireUserWithClient()
    expect(result.user).toBe(user)
    expect(result.supabase).toBe(supabaseMock)
    expect(result.response).toBeNull()
  })

  it("returns null user and null supabase with unauthorized response when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    const result = await requireUserWithClient()
    expect(result.user).toBeNull()
    expect(result.supabase).toBeNull()
    expect(result.response).not.toBeNull()
    expect(result.response!.status).toBe(401)
  })
})

// ============================================================================
// requireAdminClient
// ============================================================================

describe("requireAdminClient", () => {
  it("returns null user + unauthorized when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    const result = await requireAdminClient()
    expect(result.user).toBeNull()
    expect(result.supabase).toBeNull()
    expect(result.response!.status).toBe(401)
  })

  it("returns null + internalError when env vars are missing", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))
    // Env vars not set → createAdminClient returns null

    const result = await requireAdminClient()
    expect(result.user).toBeNull()
    expect(result.supabase).toBeNull()
    expect(result.response!.status).toBe(500)
  })

  it("returns user + admin client when authenticated and env vars are set", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key"

    const adminClient = { from: jest.fn() }
    mockCreateBrowserClient.mockReturnValue(adminClient)

    const result = await requireAdminClient()
    expect(result.user).toBe(user)
    expect(result.supabase).toBe(adminClient)
    expect(result.response).toBeNull()
  })
})

// ============================================================================
// checkStaffPermission
// ============================================================================

describe("checkStaffPermission", () => {
  function makeSupabase(contextResult: unknown, rpcResult: unknown) {
    const contextChain: Record<string, jest.Mock> = {}
    contextChain.select = jest.fn().mockReturnValue(contextChain)
    contextChain.eq = jest.fn().mockReturnValue(contextChain)
    contextChain.single = jest.fn().mockResolvedValue(contextResult)

    const mockRpc = jest.fn().mockResolvedValue(rpcResult)

    return {
      from: jest.fn().mockReturnValue(contextChain),
      rpc: mockRpc,
    }
  }

  it("returns false when user context is not staff", async () => {
    const supabase = makeSupabase(
      { data: { id: "ctx-1", context_type: "tenant" }, error: null },
      { data: ["tenants.view"], error: null }
    )

    const result = await checkStaffPermission(
      supabase as never,
      "user-1",
      "ws-1",
      "tenants.view"
    )
    expect(result).toBe(false)
  })

  it("returns false when user context is null (not found)", async () => {
    const supabase = makeSupabase(
      { data: null, error: { message: "not found" } },
      { data: [], error: null }
    )

    const result = await checkStaffPermission(
      supabase as never,
      "user-1",
      "ws-1",
      "tenants.view"
    )
    expect(result).toBe(false)
  })

  it("returns true when staff has the required permission", async () => {
    const supabase = makeSupabase(
      { data: { id: "ctx-1", context_type: "staff" }, error: null },
      { data: ["tenants.view", "tenants.create"], error: null }
    )

    const result = await checkStaffPermission(
      supabase as never,
      "user-1",
      "ws-1",
      "tenants.view"
    )
    expect(result).toBe(true)
  })

  it("returns false when staff does not have the required permission", async () => {
    const supabase = makeSupabase(
      { data: { id: "ctx-1", context_type: "staff" }, error: null },
      { data: ["tenants.view"], error: null }
    )

    const result = await checkStaffPermission(
      supabase as never,
      "user-1",
      "ws-1",
      "tenants.delete"
    )
    expect(result).toBe(false)
  })

  it("returns false when rpc returns non-array", async () => {
    const supabase = makeSupabase(
      { data: { id: "ctx-1", context_type: "staff" }, error: null },
      { data: null, error: { message: "rpc error" } }
    )

    const result = await checkStaffPermission(
      supabase as never,
      "user-1",
      "ws-1",
      "tenants.view"
    )
    expect(result).toBe(false)
  })
})

// ============================================================================
// getCurrentUserId
// ============================================================================

describe("getCurrentUserId", () => {
  it("returns user id when authenticated", async () => {
    const user = makeUser("abc-123")
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    const result = await getCurrentUserId()
    expect(result).toBe("abc-123")
  })

  it("returns null when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    const result = await getCurrentUserId()
    expect(result).toBeNull()
  })
})

// ============================================================================
// isCurrentUser
// ============================================================================

describe("isCurrentUser", () => {
  it("returns true when userId matches current user", async () => {
    const user = makeUser("user-42")
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    expect(await isCurrentUser("user-42")).toBe(true)
  })

  it("returns false when userId does not match current user", async () => {
    const user = makeUser("user-42")
    mockCreateClient.mockReturnValue(makeAuthSupabase(user))

    expect(await isCurrentUser("different-user")).toBe(false)
  })

  it("returns false when not authenticated", async () => {
    mockCreateClient.mockReturnValue(makeAuthSupabase(null))

    expect(await isCurrentUser("user-42")).toBe(false)
  })
})
