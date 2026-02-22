/**
 * useConfirmDialog Hook
 *
 * Drop-in replacement for window.confirm() that uses the ConfirmDialog component.
 * Returns a `confirm` function and a `ConfirmDialogElement` to render in JSX.
 *
 * Usage:
 *   const { confirm, ConfirmDialogElement } = useConfirmDialog()
 *
 *   // Instead of: if (!window.confirm("Delete?")) return; doDelete()
 *   // Use:
 *   confirm({
 *     title: "Delete Item",
 *     description: "Are you sure? This cannot be undone.",
 *     onConfirm: () => doDelete(),
 *     destructive: true,
 *   })
 *
 *   // In JSX: {ConfirmDialogElement}
 */

"use client"

import { useState, useCallback } from "react"
import { ConfirmDialog } from "@/components/ui/form-dialog"

interface ConfirmOptions {
  title: string
  description: string
  onConfirm: () => Promise<void> | void
  confirmText?: string
  destructive?: boolean
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmOptions & { open: boolean }>({
    open: false,
    title: "",
    description: "",
    onConfirm: () => {},
    destructive: false,
  })

  const confirm = useCallback((options: ConfirmOptions) => {
    setState({ ...options, open: true })
  }, [])

  const ConfirmDialogElement = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState((prev) => ({ ...prev, open }))}
      title={state.title}
      description={state.description}
      onConfirm={state.onConfirm}
      confirmText={state.confirmText || (state.destructive ? "Delete" : "Confirm")}
      destructive={state.destructive}
    />
  )

  return { confirm, ConfirmDialogElement }
}
