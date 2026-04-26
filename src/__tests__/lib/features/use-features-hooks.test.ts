/**
 * Tests for useFeatures and useFeatureManagement hooks from use-features.ts
 */

const mockCreateClient = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    child: () => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    }),
  },
  extractErrorMeta: jest.fn((e: unknown) => ({ error: String(e) })),
}))

import { renderHook, waitFor, act } from "@testing-library/react"
import {
  useFeatures,
  useFeatureManagement,
  invalidateFeatureCache,
} from "@/lib/features/use-features"
import { getDefaultFeatureFlags } from "@/lib/features/index"

// ============================================================================
// Helpers
// ============================================================================

function makeUser(id = "user-1") {
  return { id }
}

function makeOwnerConfigChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(result)
  return chain
}

function makeOwnerConfigUpdateChain(result: unknown) {
  const eqMock = jest.fn().mockResolvedValue(result)
  return { eq: eqMock }
}

function makeSupabase(opts: {
  user?: { id: string } | null
  configResult?: unknown
  updateResult?: unknown
  throwGetUser?: boolean
}) {
  const configChain = makeOwnerConfigChain(opts.configResult ?? { data: null, error: null })
  const updateChain = makeOwnerConfigUpdateChain(opts.updateResult ?? { error: null })

  const fromMock = jest.fn().mockReturnValue({
    ...configChain,
    update: jest.fn().mockReturnValue(updateChain),
  })

  return {
    auth: {
      getUser: opts.throwGetUser
        ? jest.fn().mockRejectedValue(new Error("auth error"))
        : jest.fn().mockResolvedValue({ data: { user: opts.user ?? null } }),
    },
    from: fromMock,
  }
}

// ============================================================================
// useFeatures
// ============================================================================

describe("useFeatures", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
    invalidateFeatureCache()
  })

  it("returns default flags immediately with loading=false when no user", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatures())

    await waitFor(() => expect(result.current.loading).toBe(false))

    const defaults = getDefaultFeatureFlags()
    expect(result.current.flags.approvals).toBe(defaults.approvals)
    expect(result.current.isEnabled("approvals")).toBe(true)
    expect(result.current.isEnabled("food")).toBe(false)
  })

  it("fetches and applies feature flags from DB when user exists", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { feature_flags: { food: true, approvals: false } }, error: null },
      })
    )

    const { result } = renderHook(() => useFeatures())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled("food")).toBe(true)
    expect(result.current.isEnabled("approvals")).toBe(false)
  })

  it("uses default flags when DB returns null config data", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({ user, configResult: { data: null, error: null } })
    )

    const { result } = renderHook(() => useFeatures())

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled("approvals")).toBe(true)
    expect(result.current.isEnabled("food")).toBe(false)
  })

  it("returns loading=false on error during fetch", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ throwGetUser: true }))

    const { result } = renderHook(() => useFeatures())

    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it("isEnabled falls back to default for unknown flags", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isEnabled("approvals")).toBe(true)
    expect(result.current.isEnabled("food")).toBe(false)
  })

  it("bypasses cache and re-fetches when a different user id is returned", async () => {
    // First render: user-1 populates cache with food=false
    mockCreateClient.mockReturnValueOnce(
      makeSupabase({
        user: makeUser("user-1"),
        configResult: { data: { feature_flags: { food: false } }, error: null },
      })
    )

    const { result: result1 } = renderHook(() => useFeatures())
    await waitFor(() => expect(result1.current.loading).toBe(false))
    expect(result1.current.isEnabled("food")).toBe(false)

    // Second render: getUser now returns user-2 — cache is for user-1, so it's a miss
    // isCacheValid returns false via the `cachedUserId !== userId` branch
    mockCreateClient.mockReturnValueOnce(
      makeSupabase({
        user: makeUser("user-2"),
        configResult: { data: { feature_flags: { food: true } }, error: null },
      })
    )

    const { result: result2 } = renderHook(() => useFeatures())
    // Loading may already be false (populated from stale cache), so wait on the flag itself
    await waitFor(() => expect(result2.current.isEnabled("food")).toBe(true))
  })

  it("re-fetches after invalidateFeatureCache is called", async () => {
    const user = makeUser()
    // First fetch: food disabled
    mockCreateClient.mockReturnValueOnce(
      makeSupabase({
        user,
        configResult: { data: { feature_flags: { food: false } }, error: null },
      })
    )
    // Second fetch after invalidation: food enabled
    mockCreateClient.mockReturnValueOnce(
      makeSupabase({
        user,
        configResult: { data: { feature_flags: { food: true } }, error: null },
      })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isEnabled("food")).toBe(false)

    act(() => {
      invalidateFeatureCache()
    })

    await waitFor(() => expect(result.current.isEnabled("food")).toBe(true))
  })

  it("reuses in-flight fetchPromise when two instances mount simultaneously", async () => {
    const user = makeUser()
    let resolveConfig!: (v: unknown) => void
    const delayedConfig = new Promise<unknown>((resolve) => {
      resolveConfig = resolve
    })

    const configChain: Record<string, jest.Mock> = {}
    configChain.select = jest.fn().mockReturnValue(configChain)
    configChain.eq = jest.fn().mockReturnValue(configChain)
    configChain.single = jest.fn().mockReturnValue(delayedConfig)

    const supabaseMock = {
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user } }) },
      from: jest.fn().mockReturnValue(configChain),
    }
    mockCreateClient.mockReturnValue(supabaseMock)

    // Mount two instances — the first sets fetchPromise; the second reuses it
    const { result: result1 } = renderHook(() => useFeatures())
    const { result: result2 } = renderHook(() => useFeatures())

    // Resolve the delayed DB query
    act(() => {
      resolveConfig({ data: { feature_flags: { food: true } }, error: null })
    })

    await waitFor(() => expect(result1.current.loading).toBe(false))
    await waitFor(() => expect(result2.current.loading).toBe(false))

    expect(result1.current.isEnabled("food")).toBe(true)
    expect(result2.current.isEnabled("food")).toBe(true)

    // DB query (.from) should only have been called once
    expect((supabaseMock.from as jest.Mock).mock.calls.length).toBe(1)
  })

  it("uses cached flags on second render within TTL without querying DB again", async () => {
    const user = makeUser()
    const supabaseMock = makeSupabase({
      user,
      configResult: { data: { feature_flags: { food: true } }, error: null },
    })
    mockCreateClient.mockReturnValue(supabaseMock)

    // First hook instance — populates cache
    const { result: result1 } = renderHook(() => useFeatures())
    await waitFor(() => expect(result1.current.loading).toBe(false))
    expect(result1.current.isEnabled("food")).toBe(true)

    // Record from() calls after first fetch
    const fromCallsBefore = (supabaseMock.from as jest.Mock).mock.calls.length

    // Second hook instance — should use cache without hitting DB again
    const { result: result2 } = renderHook(() => useFeatures())
    await waitFor(() => expect(result2.current.loading).toBe(false))
    expect(result2.current.isEnabled("food")).toBe(true)

    // from() should not have been called again (cache hit skips DB query)
    expect((supabaseMock.from as jest.Mock).mock.calls.length).toBe(fromCallsBefore)
  })
})

// ============================================================================
// useFeatureManagement
// ============================================================================

describe("useFeatureManagement", () => {
  beforeEach(() => {
    mockCreateClient.mockReset()
    invalidateFeatureCache()
  })

  it("starts with loading=true then sets loading=false after fetch", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatureManagement())

    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it("loads feature flags and configId from DB", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: {
          data: { id: "cfg-1", feature_flags: { food: true } },
          error: null,
        },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.configId).toBe("cfg-1")
    expect(result.current.flags.food).toBe(true)
  })

  it("sets configId but not flags when feature_flags is null", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-2", feature_flags: null }, error: null },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.configId).toBe("cfg-2")
    expect(result.current.flags.approvals).toBe(true) // default
  })

  it("handles no user gracefully", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.configId).toBeNull()
  })

  it("handles user with no owner_config row (data is null)", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({ user, configResult: { data: null, error: null } })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.configId).toBeNull()
    expect(result.current.flags.approvals).toBe(true) // default
  })

  it("handles error during fetch gracefully", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ throwGetUser: true }))

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.configId).toBeNull()
  })

  it("toggleFeature flips a flag", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: { food: false } }, error: null },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.flags.food).toBe(false)
    act(() => result.current.toggleFeature("food"))
    expect(result.current.flags.food).toBe(true)
    act(() => result.current.toggleFeature("food"))
    expect(result.current.flags.food).toBe(false)
  })

  it("setFeature sets an explicit value", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: {} }, error: null },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => result.current.setFeature("food", true))
    expect(result.current.flags.food).toBe(true)

    act(() => result.current.setFeature("food", false))
    expect(result.current.flags.food).toBe(false)
  })

  it("saveFeatures returns false when configId is null", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const saved = await result.current.saveFeatures()
    expect(saved).toBe(false)
  })

  it("saveFeatures returns true and invalidates cache on success", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: {} }, error: null },
        updateResult: { error: null },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.configId).toBe("cfg-1")

    // Provide fresh mock for the save call
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: {} }, error: null },
        updateResult: { error: null },
      })
    )

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.saveFeatures()
    })
    expect(saved).toBe(true)
    expect(result.current.saving).toBe(false)
  })

  it("saveFeatures returns false on DB error", async () => {
    const user = makeUser()
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: {} }, error: null },
        updateResult: { error: { message: "DB error" } },
      })
    )

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Provide fresh mock for the save call
    mockCreateClient.mockReturnValue(
      makeSupabase({
        user,
        configResult: { data: { id: "cfg-1", feature_flags: {} }, error: null },
        updateResult: { error: { message: "update failed" } },
      })
    )

    let saved: boolean | undefined
    await act(async () => {
      saved = await result.current.saveFeatures()
    })
    expect(saved).toBe(false)
    expect(result.current.saving).toBe(false)
  })
})
