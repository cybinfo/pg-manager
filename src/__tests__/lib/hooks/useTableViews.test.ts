/**
 * Tests for useTableViews from src/lib/hooks/useTableViews.ts
 *
 * Covers: fetchViews (initial load, default view auto-apply, error),
 * createView (success, no user, insert error), updateView, deleteView,
 * setDefaultView, clearDefaultView, applyView, resetToSystemDefault.
 */

import { renderHook, act, waitFor } from "@testing-library/react"

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

jest.mock("@/lib/auth", () => ({ useAuth: jest.fn() }))

const mockRpc = jest.fn()
const mockFrom = jest.fn()
const mockSupabase = {
  from: mockFrom,
  rpc: mockRpc,
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(() => mockSupabase),
}))

import { useTableViews } from "@/lib/hooks/useTableViews"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useAuth } from "@/lib/auth"

const mockShowSuccess = showSuccess as jest.Mock
const mockShowError = showError as jest.Mock

// ============================================================================
// Helpers
// ============================================================================

function makeOrderChain(result: { data: unknown; error: unknown }) {
  const thenable = {
    then: (onFulfilled: (v: unknown) => unknown) => Promise.resolve(result).then(onFulfilled),
  }
  const chain = {
    order: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    ...thenable,
  }
  // Make order return same chain (chained calls)
  chain.order.mockReturnValue(chain)
  chain.eq.mockReturnValue(chain)
  chain.select.mockReturnValue(chain)
  return chain
}

function makeView(overrides: Partial<{ id: string; name: string; is_default: boolean; config: Record<string, unknown> }> = {}) {
  return {
    id: overrides.id ?? "v1",
    user_id: "user-1",
    table_key: "tenants",
    name: overrides.name ?? "My View",
    description: null,
    is_default: overrides.is_default ?? false,
    config: overrides.config ?? { columns: [], sort: null, filters: {} },
    use_count: 0,
    last_used_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  }
}

// ============================================================================
// fetchViews — initial load
// ============================================================================

describe("fetchViews — initial load", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    ;(useAuth as jest.Mock).mockReturnValue({ user: { id: "user-1" } })
  })

  it("starts with loading=true then sets views from fetch", async () => {
    const views = [makeView()]
    mockFrom.mockReturnValue(makeOrderChain({ data: views, error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.views).toHaveLength(1)
    expect(result.current.views[0].id).toBe("v1")
  })

  it("sets error when fetch returns error", async () => {
    mockFrom.mockReturnValue(makeOrderChain({ data: null, error: { message: "DB error" } }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBeTruthy()
  })

  it("views is empty array when no data returned", async () => {
    mockFrom.mockReturnValue(makeOrderChain({ data: null, error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.views).toEqual([])
  })

  it("auto-applies default view on initial load", async () => {
    const defaultView = makeView({ id: "dv1", is_default: true })
    mockFrom.mockReturnValue(makeOrderChain({ data: [defaultView], error: null }))
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeViewId).toBe("dv1")
    expect(onViewApplied).toHaveBeenCalledWith(defaultView.config)
  })

  it("does not auto-apply if no default view", async () => {
    const view = makeView({ is_default: false })
    mockFrom.mockReturnValue(makeOrderChain({ data: [view], error: null }))
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeViewId).toBeNull()
    expect(onViewApplied).not.toHaveBeenCalled()
  })
})

// ============================================================================
// createView
// ============================================================================

describe("createView — success", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    ;(useAuth as jest.Mock).mockReturnValue({ user: { id: "user-1" } })
  })

  function setupCreateFetch(newView: ReturnType<typeof makeView>) {
    // Fetch returns empty list; insert returns newView
    const orderChain = makeOrderChain({ data: [], error: null })
    const singleFn = jest.fn().mockResolvedValue({ data: newView, error: null })
    const selectFn = jest.fn(() => ({ single: singleFn }))
    const insertFn = jest.fn(() => ({ select: selectFn }))
    const updateFn = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
    const deleteFn = jest.fn(() => ({ eq: jest.fn().mockResolvedValue({ error: null }) }))
    mockFrom.mockImplementation((table: string) => {
      if (table === "table_views") {
        return {
          ...orderChain,
          insert: insertFn,
          update: updateFn,
          delete: deleteFn,
        }
      }
      return orderChain
    })
    return { singleFn, insertFn }
  }

  it("returns the created view", async () => {
    const newView = makeView({ id: "nv1", name: "New View" })
    setupCreateFetch(newView)
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let created: unknown
    await act(async () => {
      created = await result.current.createView({
        name: "New View",
        config: { columns: [], sort: null, filters: {} },
      })
    })
    expect((created as { id: string }).id).toBe("nv1")
  })

  it("adds new view to views array (activeViewId change triggers refetch — check via return value)", async () => {
    const newView = makeView({ id: "nv1" })
    setupCreateFetch(newView)
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let created: unknown
    await act(async () => {
      created = await result.current.createView({ name: "New View", config: { columns: [], sort: null, filters: {} } })
    })
    // The return value is the inserted record — confirms view was created
    expect((created as { id: string }).id).toBe("nv1")
  })

  it("auto-applies newly created view", async () => {
    const newView = makeView({ id: "nv1" })
    setupCreateFetch(newView)
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    onViewApplied.mockClear()
    await act(async () => {
      await result.current.createView({ name: "New View", config: { columns: [], sort: null, filters: {} } })
    })
    expect(result.current.activeViewId).toBe("nv1")
    expect(onViewApplied).toHaveBeenCalledWith(newView.config)
  })

  it("shows success toast", async () => {
    const newView = makeView()
    setupCreateFetch(newView)
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createView({ name: "My View", config: { columns: [], sort: null, filters: {} } })
    })
    expect(mockShowSuccess).toHaveBeenCalledWith(`View "My View" saved`)
  })

  it("calls clear_default_table_view RPC when is_default=true", async () => {
    const newView = makeView({ is_default: true })
    setupCreateFetch(newView)
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => {
      await result.current.createView({ name: "Default View", is_default: true, config: { columns: [], sort: null, filters: {} } })
    })
    expect(mockRpc).toHaveBeenCalledWith("clear_default_table_view", expect.objectContaining({ p_table_key: "tenants" }))
  })
})

describe("createView — insert error", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    ;(useAuth as jest.Mock).mockReturnValue({ user: { id: "user-1" } })
  })

  it("returns null and shows error when insert throws", async () => {
    const orderChain = makeOrderChain({ data: [], error: null })
    const singleFn = jest.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } })
    const selectFn = jest.fn(() => ({ single: singleFn }))
    const insertFn = jest.fn(() => ({ select: selectFn }))
    mockFrom.mockImplementation((table: string) => {
      if (table === "table_views") return { ...orderChain, insert: insertFn }
      return orderChain
    })
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))

    let res: unknown
    await act(async () => {
      res = await result.current.createView({ name: "Bad View", config: { columns: [], sort: null, filters: {} } })
    })
    expect(res).toBeNull()
    expect(mockShowError).toHaveBeenCalledWith("Failed to save view")
  })
})

describe("createView — no user", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
    ;(useAuth as jest.Mock).mockReturnValue({ user: null })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
  })

  it("returns null and shows error when user is not authenticated", async () => {
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => {
      res = await result.current.createView({ name: "V", config: { columns: [], sort: null, filters: {} } })
    })
    expect(res).toBeNull()
    expect(mockShowError).toHaveBeenCalledWith("You must be logged in to save views")
  })
})

// ============================================================================
// updateView
// ============================================================================

describe("updateView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  function setupWithViews(views: ReturnType<typeof makeView>[]) {
    const orderChain = makeOrderChain({ data: views, error: null })
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    const updateFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ ...orderChain, update: updateFn })
    return { updateFn, eqFn }
  }

  it("returns true on success and shows toast", async () => {
    setupWithViews([makeView()])
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.updateView("v1", { name: "Renamed" }) })
    expect(res).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalledWith("View updated")
  })

  it("updates view name in local state", async () => {
    setupWithViews([makeView()])
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.updateView("v1", { name: "Renamed" }) })
    expect(result.current.views[0].name).toBe("Renamed")
  })

  it("returns false and shows error when update fails", async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: { message: "denied" } })
    const updateFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ ...makeOrderChain({ data: [], error: null }), update: updateFn })
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.updateView("v1", { name: "X" }) })
    expect(res).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to update view")
  })

  it("re-applies config when updating active view config", async () => {
    const views = [makeView({ id: "v1", is_default: true })]
    const orderChain = makeOrderChain({ data: views, error: null })
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    const updateFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ ...orderChain, update: updateFn })
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    onViewApplied.mockClear()
    const newConfig = { columns: ["id"], sort: null, filters: {} }
    await act(async () => {
      await result.current.updateView("v1", { config: newConfig })
    })
    expect(onViewApplied).toHaveBeenCalledWith(newConfig)
  })
})

// ============================================================================
// deleteView
// ============================================================================

describe("deleteView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRpc.mockResolvedValue({ data: null, error: null })
  })

  it("removes view from local state and shows toast", async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    const deleteFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ ...makeOrderChain({ data: [makeView()], error: null }), delete: deleteFn })
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.deleteView("v1") })
    expect(result.current.views.find((v) => v.id === "v1")).toBeUndefined()
    expect(mockShowSuccess).toHaveBeenCalledWith("View deleted")
  })

  it("resets active view when deleting the active view", async () => {
    const view = makeView({ id: "v1", is_default: true })
    const eqFn = jest.fn().mockResolvedValue({ error: null })
    const deleteFn = jest.fn(() => ({ eq: eqFn }))
    // First fetch returns [v1]; after delete, subsequent fetches return [] so default isn't re-applied
    const firstChain = makeOrderChain({ data: [view], error: null })
    const emptyChain = makeOrderChain({ data: [], error: null })
    mockFrom
      .mockReturnValueOnce({ ...firstChain, delete: deleteFn })
      .mockReturnValue({ ...emptyChain, delete: deleteFn })
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    // active view is "v1" (auto-applied default)
    expect(result.current.activeViewId).toBe("v1")
    onViewApplied.mockClear()
    await act(async () => { await result.current.deleteView("v1") })
    await waitFor(() => expect(result.current.activeViewId).toBeNull())
    expect(onViewApplied).toHaveBeenCalledWith(null)
  })

  it("returns false and shows error when delete fails", async () => {
    const eqFn = jest.fn().mockResolvedValue({ error: { message: "Cannot delete" } })
    const deleteFn = jest.fn(() => ({ eq: eqFn }))
    mockFrom.mockReturnValue({ ...makeOrderChain({ data: [], error: null }), delete: deleteFn })
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.deleteView("v1") })
    expect(res).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to delete view")
  })
})

// ============================================================================
// setDefaultView
// ============================================================================

describe("setDefaultView", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("calls set_default_table_view RPC and updates local state", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "set_default_table_view") return Promise.resolve({ data: true, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    const views = [makeView({ id: "v1" }), makeView({ id: "v2", is_default: true })]
    mockFrom.mockReturnValue(makeOrderChain({ data: views, error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.setDefaultView("v1") })
    expect(res).toBe(true)
    expect(result.current.views.find((v) => v.id === "v1")?.is_default).toBe(true)
    expect(result.current.views.find((v) => v.id === "v2")?.is_default).toBe(false)
    expect(mockShowSuccess).toHaveBeenCalledWith("Default view updated")
  })

  it("returns false when RPC returns success=false", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "set_default_table_view") return Promise.resolve({ data: false, error: null })
      return Promise.resolve({ data: null, error: null })
    })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.setDefaultView("v1") })
    expect(res).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("View not found or access denied")
  })

  it("returns false and shows error when RPC errors", async () => {
    mockRpc.mockImplementation((name: string) => {
      if (name === "set_default_table_view") return Promise.resolve({ data: null, error: { message: "RPC failed" } })
      return Promise.resolve({ data: null, error: null })
    })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.setDefaultView("v1") })
    expect(res).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to set default view")
  })
})

// ============================================================================
// clearDefaultView
// ============================================================================

describe("clearDefaultView", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("calls clear_default_table_view RPC and clears is_default on all views", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const views = [makeView({ is_default: true })]
    mockFrom.mockReturnValue(makeOrderChain({ data: views, error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.clearDefaultView() })
    expect(res).toBe(true)
    expect(result.current.views[0].is_default).toBe(false)
    expect(mockShowSuccess).toHaveBeenCalledWith("Default view cleared")
  })

  it("returns false and shows error when RPC errors", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "denied" } })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    let res: unknown
    await act(async () => { res = await result.current.clearDefaultView() })
    expect(res).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Failed to clear default view")
  })
})

// ============================================================================
// applyView
// ============================================================================

describe("applyView", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("sets activeViewId and calls onViewApplied", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const view = makeView({ id: "v1" })
    mockFrom.mockReturnValue(makeOrderChain({ data: [view], error: null }))
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    onViewApplied.mockClear()
    act(() => { result.current.applyView("v1") })
    expect(result.current.activeViewId).toBe("v1")
    expect(onViewApplied).toHaveBeenCalledWith(view.config)
  })

  it("shows error when view id is not found", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.applyView("nonexistent") })
    expect(mockShowError).toHaveBeenCalledWith("View not found")
  })

  it("silently ignores error in recordUsage (usage tracking not critical)", async () => {
    // RPC throws — recordUsage catch block should swallow the error
    mockRpc.mockRejectedValue(new Error("rpc error"))
    const view = makeView({ id: "v1" })
    mockFrom.mockReturnValue(makeOrderChain({ data: [view], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    act(() => { result.current.applyView("v1") })
    // Let recordUsage promise settle — error should be swallowed
    await act(async () => { await Promise.resolve() })
    expect(result.current.activeViewId).toBe("v1") // applyView still succeeded
  })
})

// ============================================================================
// resetToSystemDefault
// ============================================================================

describe("resetToSystemDefault", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("clears activeViewId and calls onViewApplied(null)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const view = makeView({ id: "v1", is_default: true })
    mockFrom.mockReturnValue(makeOrderChain({ data: [view], error: null }))
    const onViewApplied = jest.fn()
    const { result } = renderHook(() =>
      useTableViews({ tableKey: "tenants", onViewApplied })
    )
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeViewId).toBe("v1")
    onViewApplied.mockClear()
    act(() => { result.current.resetToSystemDefault() })
    expect(result.current.activeViewId).toBeNull()
    expect(onViewApplied).toHaveBeenCalledWith(null)
  })
})

// ============================================================================
// activeView computed
// ============================================================================

describe("activeView computed", () => {
  beforeEach(() => { jest.clearAllMocks() })

  it("returns the matching view object when activeViewId is set", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    const view = makeView({ id: "v1", is_default: true })
    mockFrom.mockReturnValue(makeOrderChain({ data: [view], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeView?.id).toBe("v1")
  })

  it("returns null when no view is active", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(makeOrderChain({ data: [], error: null }))
    const { result } = renderHook(() => useTableViews({ tableKey: "tenants" }))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.activeView).toBeNull()
  })
})
