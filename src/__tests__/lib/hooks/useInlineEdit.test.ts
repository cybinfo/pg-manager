/**
 * Tests for useBatchInlineEdit from src/lib/hooks/useInlineEdit.ts
 *
 * Covers: pure local state management — startEditing, cancelEditing,
 * setPendingChange, savePendingChanges (no-op path), editingId, pendingChanges.
 *
 * Note: The Supabase update path (updateRow / savePendingChanges with changes)
 * is integration-level and skipped here.
 */

import { renderHook, act } from "@testing-library/react"
import { useBatchInlineEdit } from "@/lib/hooks/useInlineEdit"

// ============================================================================
// Mocks
// ============================================================================

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}))

jest.mock("@/lib/toast-helpers", () => ({
  showSuccess: jest.fn(),
  showError: jest.fn(),
}))

jest.mock("@/lib/date-helpers", () => ({
  getNowISO: jest.fn(() => "2026-01-01T00:00:00.000Z"),
}))

// ============================================================================
// Helpers
// ============================================================================

function makeHook(overrides: Partial<Parameters<typeof useBatchInlineEdit>[0]> = {}) {
  return renderHook(() =>
    useBatchInlineEdit({
      table: "tenants",
      workspaceId: "ws-123",
      ...overrides,
    })
  )
}

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
