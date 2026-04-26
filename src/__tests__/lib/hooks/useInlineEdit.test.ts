/**
 * Tests for useInlineEdit + useBatchInlineEdit from src/lib/hooks/useInlineEdit.ts
 *
 * Covers: useInlineEdit (happy path, no workspace, error, thrown error, toast options),
 * useBatchInlineEdit state management + updateRow + savePendingChanges.
 */

import { renderHook, act, waitFor } from "@testing-library/react"
import { useInlineEdit, useBatchInlineEdit } from "@/lib/hooks/useInlineEdit"

// ============================================================================
// Mocks
// ============================================================================

const mockCreateClient = jest.fn()
const mockShowSuccess = jest.fn()
const mockShowError = jest.fn()

jest.mock("@/lib/supabase/client", () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  showError: (...args: unknown[]) => mockShowError(...args),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-01-01T00:00:00.000Z"),
}))

// Proxy-based Supabase chain mock: any method returns proxy, await resolves to result
function makeProxy(result: unknown) {
  const handler: ProxyHandler<object> = {
    get(_target, prop) {
      if (prop === "then") return (resolve: (v: unknown) => void) => resolve(result)
      return (..._args: unknown[]) => proxy
    },
  }
  const proxy = new Proxy({}, handler)
  return proxy
}

function makeSupabase(result: unknown) {
  return { from: () => makeProxy(result) }
}

// ============================================================================
// Helpers
// ============================================================================

function makeInlineEditHook(overrides: Partial<Parameters<typeof useInlineEdit>[0]> = {}) {
  return renderHook(() =>
    useInlineEdit({
      table: "tenants",
      workspaceId: "ws-123",
      ...overrides,
    })
  )
}

function makeHook(overrides: Partial<Parameters<typeof useBatchInlineEdit>[0]> = {}) {
  return renderHook(() =>
    useBatchInlineEdit({
      table: "tenants",
      workspaceId: "ws-123",
      ...overrides,
    })
  )
}

beforeEach(() => {
  mockCreateClient.mockReset()
  mockShowSuccess.mockReset()
  mockShowError.mockReset()
})

// ============================================================================
// Initial state
// ============================================================================

describe("useBatchInlineEdit — initial state", () => {
  it("starts with editingId=null", () => {
    const { result } = makeHook()
    expect(result.current.editingId).toBeNull()
  })

  it("starts with pendingChanges={}", () => {
    const { result } = makeHook()
    expect(result.current.pendingChanges).toEqual({})
  })

  it("starts with saving=false", () => {
    const { result } = makeHook()
    expect(result.current.saving).toBe(false)
  })

  it("starts with savingId=null", () => {
    const { result } = makeHook()
    expect(result.current.savingId).toBeNull()
  })
})

// ============================================================================
// startEditing
// ============================================================================

describe("useBatchInlineEdit — startEditing", () => {
  it("sets editingId to the given id", () => {
    const { result } = makeHook()
    act(() => { result.current.startEditing("row-1") })
    expect(result.current.editingId).toBe("row-1")
  })

  it("clears any existing pendingChanges when starting a new edit", () => {
    const { result } = makeHook()
    act(() => {
      result.current.startEditing("row-1")
      result.current.setPendingChange("name", "Alice")
    })
    act(() => { result.current.startEditing("row-2") })
    expect(result.current.pendingChanges).toEqual({})
    expect(result.current.editingId).toBe("row-2")
  })
})

// ============================================================================
// cancelEditing
// ============================================================================

describe("useBatchInlineEdit — cancelEditing", () => {
  it("resets editingId to null", () => {
    const { result } = makeHook()
    act(() => { result.current.startEditing("row-1") })
    act(() => { result.current.cancelEditing() })
    expect(result.current.editingId).toBeNull()
  })

  it("clears pendingChanges", () => {
    const { result } = makeHook()
    act(() => {
      result.current.startEditing("row-1")
      result.current.setPendingChange("name", "Alice")
    })
    act(() => { result.current.cancelEditing() })
    expect(result.current.pendingChanges).toEqual({})
  })
})

// ============================================================================
// setPendingChange
// ============================================================================

describe("useBatchInlineEdit — setPendingChange", () => {
  it("adds a field to pendingChanges", () => {
    const { result } = makeHook()
    act(() => { result.current.setPendingChange("name", "Bob") })
    expect(result.current.pendingChanges).toEqual({ name: "Bob" })
  })

  it("accumulates multiple field changes", () => {
    const { result } = makeHook()
    act(() => {
      result.current.setPendingChange("name", "Carol")
      result.current.setPendingChange("status", "active")
    })
    expect(result.current.pendingChanges).toEqual({ name: "Carol", status: "active" })
  })

  it("overwrites an existing pending field value", () => {
    const { result } = makeHook()
    act(() => { result.current.setPendingChange("name", "Dan") })
    act(() => { result.current.setPendingChange("name", "Dave") })
    expect(result.current.pendingChanges.name).toBe("Dave")
  })

  it("preserves other fields when updating one", () => {
    const { result } = makeHook()
    act(() => {
      result.current.setPendingChange("name", "Eve")
      result.current.setPendingChange("status", "active")
    })
    act(() => { result.current.setPendingChange("status", "inactive") })
    expect(result.current.pendingChanges.name).toBe("Eve")
    expect(result.current.pendingChanges.status).toBe("inactive")
  })
})

// ============================================================================
// savePendingChanges — no-op paths (no Supabase needed)
// ============================================================================

describe("useBatchInlineEdit — savePendingChanges (no-op)", () => {
  it("returns true and cancels editing when there is no editingId", async () => {
    const { result } = makeHook()
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.savePendingChanges()
    })
    expect(success).toBe(true)
    expect(result.current.editingId).toBeNull()
  })

  it("returns true and cancels editing when pendingChanges is empty", async () => {
    const { result } = makeHook()
    act(() => { result.current.startEditing("row-1") })
    let success: boolean | undefined
    await act(async () => {
      success = await result.current.savePendingChanges()
    })
    expect(success).toBe(true)
    expect(result.current.editingId).toBeNull()
  })
})

// ============================================================================
// useInlineEdit — updateRow
// ============================================================================

describe("useInlineEdit — updateRow", () => {
  it("returns false and shows error when workspaceId is null", async () => {
    const { result } = makeInlineEditHook({ workspaceId: null })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("No workspace selected")
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("returns false silently when workspaceId is null and showErrorToast=false", async () => {
    const { result } = makeInlineEditHook({ workspaceId: null, showErrorToast: false })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it("returns true, shows success toast, and calls onSuccess on happy path", async () => {
    const onSuccess = jest.fn()
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeInlineEditHook({ onSuccess })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "Alice" }) })
    expect(success).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalledWith("Updated successfully")
    expect(onSuccess).toHaveBeenCalled()
  })

  it("does not show success toast when showSuccessToast=false", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeInlineEditHook({ showSuccessToast: false })
    await act(async () => { await result.current.updateRow("row-1", { name: "Alice" }) })
    expect(mockShowSuccess).not.toHaveBeenCalled()
  })

  it("uses custom successMessage when provided", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeInlineEditHook({ successMessage: "Row saved!" })
    await act(async () => { await result.current.updateRow("row-1", { name: "Alice" }) })
    expect(mockShowSuccess).toHaveBeenCalledWith("Row saved!")
  })

  it("returns false and shows error.message when supabase returns error", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "duplicate key" } }))
    const { result } = makeInlineEditHook()
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("duplicate key")
  })

  it("falls back to 'Failed to update' when error.message is empty", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "" } }))
    const { result } = makeInlineEditHook()
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(mockShowError).toHaveBeenCalledWith("Failed to update")
  })

  it("returns false and shows generic error on thrown exception", async () => {
    mockCreateClient.mockImplementation(() => { throw new Error("network timeout") })
    const { result } = makeInlineEditHook()
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("An unexpected error occurred")
  })

  it("resets saving and savingId after update completes (finally block)", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeInlineEditHook()
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(result.current.saving).toBe(false)
    expect(result.current.savingId).toBeNull()
  })

  it("does not show error toast on thrown error when showErrorToast=false", async () => {
    mockCreateClient.mockImplementation(() => { throw new Error("crash") })
    const { result } = makeInlineEditHook({ showErrorToast: false })
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(mockShowError).not.toHaveBeenCalled()
  })
})

// ============================================================================
// useBatchInlineEdit — updateRow
// ============================================================================

describe("useBatchInlineEdit — updateRow", () => {
  it("returns false when workspaceId is null", async () => {
    const { result } = makeHook({ workspaceId: null })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("No workspace selected")
  })

  it("calls onBeforeUpdate and returns false when it returns a validation error", async () => {
    const onBeforeUpdate = jest.fn().mockReturnValue("Name is required")
    const { result } = makeHook({ onBeforeUpdate })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", {}) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("Name is required")
    expect(mockCreateClient).not.toHaveBeenCalled()
  })

  it("proceeds when onBeforeUpdate returns null", async () => {
    const onBeforeUpdate = jest.fn().mockReturnValue(null)
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeHook({ onBeforeUpdate })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(true)
  })

  it("returns true on happy path and shows success toast", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const onSuccess = jest.fn()
    const { result } = makeHook({ onSuccess })
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(true)
    expect(mockShowSuccess).toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalled()
  })

  it("returns false on supabase error", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "conflict" } }))
    const { result } = makeHook()
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("conflict")
  })

  it("returns false on thrown error", async () => {
    mockCreateClient.mockImplementation(() => { throw new Error("crash") })
    const { result } = makeHook()
    let success: boolean | undefined
    await act(async () => { success = await result.current.updateRow("row-1", { name: "X" }) })
    expect(success).toBe(false)
    expect(mockShowError).toHaveBeenCalledWith("An unexpected error occurred")
  })

  it("does not show error toast on supabase error when showErrorToast=false", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "conflict" } }))
    const { result } = makeHook({ showErrorToast: false })
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(mockShowError).not.toHaveBeenCalled()
  })

  it("falls back to 'Failed to update' when error.message is empty", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "" } }))
    const { result } = makeHook()
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(mockShowError).toHaveBeenCalledWith("Failed to update")
  })

  it("does not show error toast on thrown error when showErrorToast=false", async () => {
    mockCreateClient.mockImplementation(() => { throw new Error("crash") })
    const { result } = makeHook({ showErrorToast: false })
    await act(async () => { await result.current.updateRow("row-1", { name: "X" }) })
    expect(mockShowError).not.toHaveBeenCalled()
  })
})

// ============================================================================
// useBatchInlineEdit — savePendingChanges (with actual changes)
// ============================================================================

describe("useBatchInlineEdit — savePendingChanges (with changes)", () => {
  it("calls updateRow with editingId and pendingChanges, cancels editing on success", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: null }))
    const { result } = makeHook()

    act(() => {
      result.current.startEditing("row-1")
      result.current.setPendingChange("name", "Updated")
    })

    let success: boolean | undefined
    await act(async () => { success = await result.current.savePendingChanges() })

    expect(success).toBe(true)
    await waitFor(() => expect(result.current.editingId).toBeNull())
  })

  it("returns false and keeps editingId when updateRow fails", async () => {
    mockCreateClient.mockReturnValue(makeSupabase({ error: { message: "db error" } }))
    const { result } = makeHook()

    act(() => {
      result.current.startEditing("row-2")
      result.current.setPendingChange("status", "inactive")
    })

    let success: boolean | undefined
    await act(async () => { success = await result.current.savePendingChanges() })

    expect(success).toBe(false)
    expect(result.current.editingId).toBe("row-2")
  })
})
