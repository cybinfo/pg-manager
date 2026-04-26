/**
 * Tests for useConfirmDialog from src/lib/hooks/useConfirmDialog.tsx
 *
 * Covers the confirm() function's state management:
 * opening the dialog, setting title/description/options, and
 * the destructive flag.
 */

import { renderHook, act } from "@testing-library/react"
import React from "react"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"

// ============================================================================
// Mock the ConfirmDialog component (renders to nothing — we test state, not UI)
// ============================================================================

jest.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, title, description, onConfirm, confirmText, destructive }: {
    open: boolean
    title: string
    description: string
    onConfirm: () => void
    confirmText: string
    destructive?: boolean
  }) =>
    React.createElement("div", {
      "data-testid": "confirm-dialog",
      "data-open": String(open),
      "data-title": title,
      "data-description": description,
      "data-confirm-text": confirmText,
      "data-destructive": String(destructive),
      onClick: onConfirm,
    }),
}))

// ============================================================================
// Tests
// ============================================================================

describe("useConfirmDialog", () => {
  it("returns confirm function and ConfirmDialogElement", () => {
    const { result } = renderHook(() => useConfirmDialog())
    expect(typeof result.current.confirm).toBe("function")
    expect(React.isValidElement(result.current.ConfirmDialogElement)).toBe(true)
  })

  it("dialog is closed by default (open=false)", () => {
    const { result } = renderHook(() => useConfirmDialog())
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.open).toBe(false)
  })

  it("confirm() opens the dialog", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Delete Item",
        description: "This cannot be undone.",
        onConfirm: () => {},
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.open).toBe(true)
  })

  it("confirm() sets title and description", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Archive Member",
        description: "This will archive the member.",
        onConfirm: () => {},
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.title).toBe("Archive Member")
    expect(el.props.description).toBe("This will archive the member.")
  })

  it("uses 'Confirm' as default confirmText when not destructive", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Save",
        description: "Save changes?",
        onConfirm: () => {},
        destructive: false,
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.confirmText).toBe("Confirm")
  })

  it("uses 'Delete' as default confirmText for destructive=true", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Delete",
        description: "Are you sure?",
        onConfirm: () => {},
        destructive: true,
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.confirmText).toBe("Delete")
  })

  it("custom confirmText overrides the default", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Archive",
        description: "Archive this?",
        onConfirm: () => {},
        confirmText: "Yes, archive it",
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.confirmText).toBe("Yes, archive it")
  })

  it("passes onConfirm callback to the dialog", () => {
    const onConfirm = jest.fn()
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({
        title: "Delete",
        description: "Are you sure?",
        onConfirm,
      })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.onConfirm).toBe(onConfirm)
  })

  it("calling confirm() again replaces the previous options", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({ title: "First", description: "D1", onConfirm: () => {} })
    })
    act(() => {
      result.current.confirm({ title: "Second", description: "D2", onConfirm: () => {} })
    })
    const el = result.current.ConfirmDialogElement as React.ReactElement
    expect(el.props.title).toBe("Second")
  })

  it("onOpenChange(false) closes the dialog (line 51)", () => {
    const { result } = renderHook(() => useConfirmDialog())
    act(() => {
      result.current.confirm({ title: "Delete", description: "Sure?", onConfirm: () => {} })
    })
    expect((result.current.ConfirmDialogElement as React.ReactElement).props.open).toBe(true)

    // Invoke the onOpenChange callback directly (simulates dialog requesting to close)
    act(() => {
      const el = result.current.ConfirmDialogElement as React.ReactElement
      el.props.onOpenChange(false)
    })

    expect((result.current.ConfirmDialogElement as React.ReactElement).props.open).toBe(false)
  })
})
