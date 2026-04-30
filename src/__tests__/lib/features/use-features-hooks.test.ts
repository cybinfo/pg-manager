/**
 * Tests for useFeatures and useFeatureManagement hooks (new module-based API)
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

jest.mock("@/lib/auth", () => ({
  useCurrentContext: jest.fn(),
}))

import { renderHook, waitFor, act } from "@testing-library/react"
import { useFeatures, useFeatureManagement, invalidateFeatureCache } from "@/lib/features/use-features"
import { useCurrentContext } from "@/lib/auth"
import type { WorkspaceModuleConfig } from "@/lib/features"

const mockUseCurrentContext = useCurrentContext as jest.Mock

// ============================================================================
// Helpers
// ============================================================================

function makeWorkspaceChain(result: unknown) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.single = jest.fn().mockResolvedValue(result)
  return chain
}

function makeSupabase(opts: {
  user?: { id: string } | null
  workspaceResult?: unknown
  workspacesListResult?: unknown
  updateResult?: unknown
}) {
  const singleChain = makeWorkspaceChain(opts.workspaceResult ?? { data: null, error: null })
  const updateChain = {
    eq: jest.fn().mockResolvedValue(opts.updateResult ?? { error: null }),
  }
  const fromMock = jest.fn().mockReturnValue({
    ...singleChain,
    update: jest.fn().mockReturnValue(updateChain),
  })

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: opts.user ?? null } }),
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

  it("returns loading=false with empty config when no workspace context", async () => {
    mockUseCurrentContext.mockReturnValue({ context: null })
    mockCreateClient.mockReturnValue(makeSupabase({ user: null }))

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isModuleEnabled("expenses")).toBe(false)
  })

  it("fetches and applies module_config from DB", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })
    const config: WorkspaceModuleConfig = {
      expenses: { enabled: true, features: {} },
      billing: { enabled: false, features: {} },
    }
    mockCreateClient.mockReturnValue(
      makeSupabase({ workspaceResult: { data: { module_config: config }, error: null } })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isModuleEnabled("expenses")).toBe(true)
    expect(result.current.isModuleEnabled("billing")).toBe(false)
  })

  it("returns false for module not in config", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })
    mockCreateClient.mockReturnValue(
      makeSupabase({ workspaceResult: { data: { module_config: {} }, error: null } })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isModuleEnabled("reports")).toBe(false)
  })

  it("returns loading=false on DB error", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })
    mockCreateClient.mockReturnValue(
      makeSupabase({ workspaceResult: { data: null, error: new Error("db error") } })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it("isEnabled shim works (maps to isModuleEnabled)", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-2" } })
    const config: WorkspaceModuleConfig = {
      expenses: { enabled: true, features: {} },
    }
    mockCreateClient.mockReturnValue(
      makeSupabase({ workspaceResult: { data: { module_config: config }, error: null } })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isEnabled("expenses")).toBe(true)
  })

  it("re-fetches after invalidateFeatureCache is called", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })
    const configV1: WorkspaceModuleConfig = { expenses: { enabled: false, features: {} } }
    const configV2: WorkspaceModuleConfig = { expenses: { enabled: true, features: {} } }

    mockCreateClient
      .mockReturnValueOnce(
        makeSupabase({ workspaceResult: { data: { module_config: configV1 }, error: null } })
      )
      .mockReturnValueOnce(
        makeSupabase({ workspaceResult: { data: { module_config: configV2 }, error: null } })
      )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isModuleEnabled("expenses")).toBe(false)

    act(() => { invalidateFeatureCache() })
    await waitFor(() => expect(result.current.isModuleEnabled("expenses")).toBe(true))
  })

  it("isFeatureEnabled requires both module enabled and feature flag", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })
    const config: WorkspaceModuleConfig = {
      billing: { enabled: true, features: { autoBilling: true } },
      expenses: { enabled: false, features: { vendorManagement: true } },
    }
    mockCreateClient.mockReturnValue(
      makeSupabase({ workspaceResult: { data: { module_config: config }, error: null } })
    )

    const { result } = renderHook(() => useFeatures())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.isFeatureEnabled("billing", "autoBilling")).toBe(true)
    expect(result.current.isFeatureEnabled("billing", "gstInvoicing")).toBe(false)
    expect(result.current.isFeatureEnabled("expenses", "vendorManagement")).toBe(false) // module disabled
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

  it("starts with loading=true then sets loading=false", async () => {
    mockUseCurrentContext.mockReturnValue({ context: null })

    const listChain: Record<string, jest.Mock> = {}
    listChain.select = jest.fn().mockReturnValue(listChain)
    listChain.eq = jest.fn().mockReturnValue(listChain)
    listChain.order = jest.fn().mockResolvedValue({ data: [], error: null })

    mockCreateClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn().mockReturnValue(listChain),
    })

    const { result } = renderHook(() => useFeatureManagement())
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.loading).toBe(false))
  })

  it("loads workspaces list", async () => {
    mockUseCurrentContext.mockReturnValue({ context: { workspace_id: "ws-1" } })

    const workspaces = [
      { id: "ws-1", name: "Green Hills PG", business_type: "pg", module_config: {} },
      { id: "ws-2", name: "PowerFit Gym",   business_type: "gym", module_config: {} },
    ]

    const listChain: Record<string, jest.Mock> = {}
    listChain.select = jest.fn().mockReturnValue(listChain)
    listChain.eq = jest.fn().mockReturnValue(listChain)
    listChain.order = jest.fn().mockResolvedValue({ data: workspaces, error: null })

    mockCreateClient.mockReturnValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) },
      from: jest.fn().mockReturnValue(listChain),
    })

    const { result } = renderHook(() => useFeatureManagement())
    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.workspaces).toHaveLength(2)
    expect(result.current.workspaces[0].name).toBe("Green Hills PG")
    expect(result.current.selectedWorkspaceId).toBe("ws-1")
  })
})
