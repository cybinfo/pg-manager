/**
 * Tests for useKeyboardShortcuts from src/lib/hooks/useKeyboardShortcuts.ts
 */

import { renderHook } from "@testing-library/react"
import { useKeyboardShortcuts, type KeyboardShortcut } from "@/lib/hooks/useKeyboardShortcuts"

// ============================================================================
// Helpers
// ============================================================================

function fireKey(key: string, modifiers: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  })
  window.dispatchEvent(event)
  return event
}

function shortcut(overrides: Partial<KeyboardShortcut> & Pick<KeyboardShortcut, "key" | "action">): KeyboardShortcut {
  return {
    description: "Test shortcut",
    category: "Test",
    ...overrides,
  }
}

// ============================================================================
// Basic triggering
// ============================================================================

describe("useKeyboardShortcuts", () => {
  it("calls action when the correct key is pressed", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))
    fireKey("k")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("is case-insensitive for the key match", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "K", action })]))
    fireKey("k")
    expect(action).toHaveBeenCalledTimes(1)
  })

  it("does not call action for a different key", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))
    fireKey("j")
    expect(action).not.toHaveBeenCalled()
  })

  // ============================================================================
  // Modifier keys
  // ============================================================================

  it("calls action when metaKey shortcut matches Cmd+key", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", metaKey: true, action })]))
    fireKey("k", { metaKey: true })
    expect(action).toHaveBeenCalled()
  })

  it("calls action when metaKey shortcut matches Ctrl+key (cross-platform)", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", metaKey: true, action })]))
    fireKey("k", { ctrlKey: true })
    expect(action).toHaveBeenCalled()
  })

  it("does not call action when metaKey required but not pressed", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", metaKey: true, action })]))
    fireKey("k") // no meta
    expect(action).not.toHaveBeenCalled()
  })

  it("calls action when shiftKey shortcut matches", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "?", shiftKey: true, action })]))
    fireKey("?", { shiftKey: true })
    expect(action).toHaveBeenCalled()
  })

  it("does not call action when shiftKey pressed but not required", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))
    fireKey("k", { shiftKey: true })
    // shiftMatch = !e.shiftKey = false when shift is pressed without requiring it
    expect(action).not.toHaveBeenCalled()
  })

  // ============================================================================
  // Input field suppression
  // ============================================================================

  it("does not trigger when target is INPUT", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))

    const input = document.createElement("input")
    document.body.appendChild(input)

    const event = new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true })
    Object.defineProperty(event, "target", { value: input })
    window.dispatchEvent(event)

    expect(action).not.toHaveBeenCalled()
    document.body.removeChild(input)
  })

  it("does not trigger when target is TEXTAREA", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))

    const textarea = document.createElement("textarea")
    document.body.appendChild(textarea)

    const event = new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true })
    Object.defineProperty(event, "target", { value: textarea })
    window.dispatchEvent(event)

    expect(action).not.toHaveBeenCalled()
    document.body.removeChild(textarea)
  })

  it("does not trigger when target is SELECT", () => {
    const action = jest.fn()
    renderHook(() => useKeyboardShortcuts([shortcut({ key: "k", action })]))

    const select = document.createElement("select")
    document.body.appendChild(select)

    const event = new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true })
    Object.defineProperty(event, "target", { value: select })
    window.dispatchEvent(event)

    expect(action).not.toHaveBeenCalled()
    document.body.removeChild(select)
  })


  // ============================================================================
  // Multiple shortcuts
  // ============================================================================

  it("triggers the correct shortcut among multiple", () => {
    const actionK = jest.fn()
    const actionN = jest.fn()
    renderHook(() =>
      useKeyboardShortcuts([
        shortcut({ key: "k", action: actionK }),
        shortcut({ key: "n", action: actionN }),
      ])
    )

    fireKey("n")
    expect(actionK).not.toHaveBeenCalled()
    expect(actionN).toHaveBeenCalledTimes(1)
  })

  // ============================================================================
  // Cleanup
  // ============================================================================

  it("removes listener on unmount", () => {
    const action = jest.fn()
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts([shortcut({ key: "k", action })])
    )

    unmount()
    fireKey("k")
    expect(action).not.toHaveBeenCalled()
  })

  it("updates shortcut refs without re-registering listener", () => {
    const actionV1 = jest.fn()
    const actionV2 = jest.fn()

    const { rerender } = renderHook(
      ({ action }: { action: () => void }) =>
        useKeyboardShortcuts([shortcut({ key: "k", action })]),
      { initialProps: { action: actionV1 } }
    )

    rerender({ action: actionV2 })
    fireKey("k")

    expect(actionV1).not.toHaveBeenCalled()
    expect(actionV2).toHaveBeenCalledTimes(1)
  })
})
