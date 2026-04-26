/**
 * Tests for useUnsavedChanges from src/lib/hooks/useUnsavedChanges.ts
 *
 * The hook listens for "beforeunload" and calls event.preventDefault()
 * when hasChanges is true.
 */

import { renderHook, act } from "@testing-library/react"
import { useUnsavedChanges } from "@/lib/hooks/useUnsavedChanges"

// ============================================================================
// Helpers
// ============================================================================

function fireBeoforeUnload(): BeforeUnloadEvent {
  const event = new Event("beforeunload", { bubbles: false, cancelable: true }) as BeforeUnloadEvent
  const preventDefaultSpy = jest.spyOn(event, "preventDefault")
  window.dispatchEvent(event)
  return Object.assign(event, { preventDefaultSpy })
}

// ============================================================================
// Tests
// ============================================================================

describe("useUnsavedChanges", () => {
  it("does NOT call preventDefault when hasChanges is false", () => {
    renderHook(() => useUnsavedChanges(false))
    const event = fireBeoforeUnload()
    expect((event as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).not.toHaveBeenCalled()
  })

  it("calls preventDefault when hasChanges is true", () => {
    renderHook(() => useUnsavedChanges(true))
    const event = fireBeoforeUnload()
    expect((event as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).toHaveBeenCalled()
  })

  it("stops preventing unload after hasChanges transitions to false", () => {
    const { rerender } = renderHook(({ dirty }: { dirty: boolean }) => useUnsavedChanges(dirty), {
      initialProps: { dirty: true },
    })

    // With changes: should prevent
    const e1 = fireBeoforeUnload()
    expect((e1 as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).toHaveBeenCalled()

    // After save (dirty=false): should not prevent
    act(() => { rerender({ dirty: false }) })
    const e2 = fireBeoforeUnload()
    expect((e2 as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).not.toHaveBeenCalled()
  })

  it("removes the beforeunload listener on unmount", () => {
    const { unmount } = renderHook(() => useUnsavedChanges(true))
    unmount()
    // After unmount, no more interception
    const event = fireBeoforeUnload()
    expect((event as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).not.toHaveBeenCalled()
  })

  it("starts preventing unload when hasChanges transitions from false to true", () => {
    const { rerender } = renderHook(({ dirty }: { dirty: boolean }) => useUnsavedChanges(dirty), {
      initialProps: { dirty: false },
    })

    const e1 = fireBeoforeUnload()
    expect((e1 as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).not.toHaveBeenCalled()

    act(() => { rerender({ dirty: true }) })
    const e2 = fireBeoforeUnload()
    expect((e2 as BeforeUnloadEvent & { preventDefaultSpy: jest.SpyInstance }).preventDefaultSpy).toHaveBeenCalled()
  })
})
