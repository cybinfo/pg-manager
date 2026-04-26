/**
 * useDialogState Hook
 *
 * Centralized dialog state management with loading and error states.
 * Eliminates 15+ duplicate dialog state patterns.
 *
 * @example
 * const dialog = useDialogState({ name: "", description: "" })
 *
 * <Dialog open={dialog.isOpen} onOpenChange={dialog.setOpen}>
 *   <form onSubmit={dialog.handleSubmit(saveData)}>
 *     <Input
 *       value={dialog.formData.name}
 *       onChange={(e) => dialog.setField("name", e.target.value)}
 *     />
 *     <Button disabled={dialog.loading}>
 *       {dialog.loading ? "Saving..." : "Save"}
 *     </Button>
 *   </form>
 * </Dialog>
 */

"use client"

import { useState, useCallback } from "react"
import { showSuccess, showError } from "@/lib/toast-helpers"

// ============================================================================
// TYPES
// ============================================================================

interface UseDialogStateOptions {
  /** Called when dialog opens */
  onOpen?: () => void
  /** Called when dialog closes */
  onClose?: () => void
  /** Reset form data when dialog closes (default: true) */
  resetOnClose?: boolean
  /** Show error toast automatically (default: true) */
  showErrorToast?: boolean
}

interface UseDialogStateReturn<T> {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Set dialog open state */
  setOpen: (open: boolean) => void
  /** Open the dialog */
  open: () => void
  /** Close the dialog */
  close: () => void
  /** Toggle dialog open state */
  toggle: () => void
  /** Form data */
  formData: T
  /** Set entire form data */
  setFormData: React.Dispatch<React.SetStateAction<T>>
  /** Update a single field */
  setField: <K extends keyof T>(field: K, value: T[K]) => void
  /** Reset form to initial state */
  resetForm: () => void
  /** Whether an operation is in progress */
  loading: boolean
  /** Set loading state */
  setLoading: (loading: boolean) => void
  /** Error message if any */
  error: string | null
  /** Set error message */
  setError: (error: string | null) => void
  /** Clear error */
  clearError: () => void
  /** Handle form submission with loading/error management */
  handleSubmit: (
    handler: (data: T) => Promise<void>,
    options?: { successMessage?: string; errorMessage?: string }
  ) => (e?: React.FormEvent) => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing dialog state including form data, loading, and errors
 */
export function useDialogState<T extends Record<string, unknown>>(
  initialFormData: T,
  options: UseDialogStateOptions = {}
): UseDialogStateReturn<T> {
  const {
    onOpen,
    onClose,
    resetOnClose = true,
    showErrorToast = true,
  } = options

  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState<T>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = useCallback(() => {
    setFormData(initialFormData)
    setError(null)
  }, [initialFormData])

  const setOpen = useCallback(
    (open: boolean) => {
      if (open) {
        onOpen?.()
      } else {
        if (resetOnClose) {
          resetForm()
        }
        onClose?.()
      }
      setIsOpen(open)
    },
    [onOpen, onClose, resetOnClose, resetForm]
  )

  const open = useCallback(() => setOpen(true), [setOpen])
  const close = useCallback(() => setOpen(false), [setOpen])
  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen])

  const setField = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const clearError = useCallback(() => setError(null), [])

  const handleSubmit = useCallback(
    (
      handler: (data: T) => Promise<void>,
      submitOptions?: { successMessage?: string; errorMessage?: string }
    ) => {
      return async (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault()
        }

        setLoading(true)
        setError(null)

        try {
          await handler(formData)

          if (submitOptions?.successMessage) {
            showSuccess(submitOptions.successMessage)
          }

          close()
        } catch (err) {
          const errorMessage =
            err instanceof Error
              ? err.message
              : submitOptions?.errorMessage || "An error occurred"

          setError(errorMessage)

          if (showErrorToast) {
            showError(errorMessage)
          }
        } finally {
          setLoading(false)
        }
      }
    },
    [formData, close, showErrorToast]
  )

  return {
    isOpen,
    setOpen,
    open,
    close,
    toggle,
    formData,
    setFormData,
    setField,
    resetForm,
    loading,
    setLoading,
    error,
    setError,
    clearError,
    handleSubmit,
  }
}

// ============================================================================
// SIMPLIFIED VARIANTS
// ============================================================================

interface UseSimpleDialogReturn {
  /** Whether the dialog is open */
  isOpen: boolean
  /** Set dialog open state */
  setOpen: (open: boolean) => void
  /** Open the dialog */
  open: () => void
  /** Close the dialog */
  close: () => void
  /** Toggle dialog open state */
  toggle: () => void
}

/**
 * Simplified hook for dialogs without form state
 *
 * @example
 * const confirmDialog = useSimpleDialog()
 *
 * <Button onClick={confirmDialog.open}>Delete</Button>
 * <ConfirmDialog
 *   open={confirmDialog.isOpen}
 *   onOpenChange={confirmDialog.setOpen}
 *   onConfirm={handleDelete}
 * />
 */
export function useSimpleDialog(
  options: { onOpen?: () => void; onClose?: () => void } = {}
): UseSimpleDialogReturn {
  const { onOpen, onClose } = options
  const [isOpen, setIsOpen] = useState(false)

  const setOpen = useCallback(
    (open: boolean) => {
      if (open) {
        onOpen?.()
      } else {
        onClose?.()
      }
      setIsOpen(open)
    },
    [onOpen, onClose]
  )

  const open = useCallback(() => setOpen(true), [setOpen])
  const close = useCallback(() => setOpen(false), [setOpen])
  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen])

  return { isOpen, setOpen, open, close, toggle }
}

// ============================================================================
// DIALOG WITH DATA HOOK
// ============================================================================

interface UseDialogWithDataReturn<T> extends UseSimpleDialogReturn {
  /** Data associated with the dialog */
  data: T | null
  /** Open dialog with specific data */
  openWith: (data: T) => void
  /** Clear data */
  clearData: () => void
}

/**
 * Hook for dialogs that need to display/edit specific data
 *
 * @example
 * const editDialog = useDialogWithData<User>()
 *
 * // In list
 * <Button onClick={() => editDialog.openWith(user)}>Edit</Button>
 *
 * // In dialog
 * {editDialog.data && (
 *   <EditUserForm user={editDialog.data} onSave={editDialog.close} />
 * )}
 */
export function useDialogWithData<T>(
  options: { onOpen?: () => void; onClose?: () => void } = {}
): UseDialogWithDataReturn<T> {
  const { onOpen, onClose } = options
  const [isOpen, setIsOpen] = useState(false)
  const [data, setData] = useState<T | null>(null)

  const setOpen = useCallback(
    (open: boolean) => {
      if (open) {
        onOpen?.()
      } else {
        onClose?.()
        setData(null)
      }
      setIsOpen(open)
    },
    [onOpen, onClose]
  )

  const open = useCallback(() => setOpen(true), [setOpen])
  const close = useCallback(() => setOpen(false), [setOpen])
  const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen])

  const openWith = useCallback(
    (newData: T) => {
      setData(newData)
      setOpen(true)
    },
    [setOpen]
  )

  const clearData = useCallback(() => setData(null), [])

  return { isOpen, setOpen, open, close, toggle, data, openWith, clearData }
}
