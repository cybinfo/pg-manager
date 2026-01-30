/**
 * useDeleteConfirmation Hook
 *
 * Centralized delete confirmation with loading state management.
 * Eliminates 10+ duplicate delete confirmation patterns.
 *
 * @example
 * const { deleting, confirmDelete, handleDelete } = useDeleteConfirmation({
 *   onDelete: async (id) => {
 *     await supabase.from("tenants").delete().eq("id", id)
 *   },
 *   successMessage: "Tenant deleted",
 *   errorMessage: "Failed to delete tenant",
 *   onSuccess: () => router.refresh(),
 * })
 *
 * <Button onClick={() => confirmDelete(tenant.id)}>Delete</Button>
 */

"use client"

import { useState, useCallback } from "react"
import { toast } from "sonner"

// ============================================================================
// TYPES
// ============================================================================

interface UseDeleteConfirmationOptions<T = string> {
  /** Function to execute the delete operation */
  onDelete: (id: T) => Promise<void>
  /** Success toast message */
  successMessage?: string
  /** Error toast message (or function to generate from error) */
  errorMessage?: string | ((error: Error) => string)
  /** Callback after successful deletion */
  onSuccess?: () => void
  /** Callback on error */
  onError?: (error: Error) => void
  /** Show native confirm dialog (default: false) */
  useNativeConfirm?: boolean
  /** Native confirm message */
  confirmMessage?: string
}

interface UseDeleteConfirmationReturn<T = string> {
  /** Whether delete is in progress */
  deleting: boolean
  /** ID of item currently being deleted */
  deletingId: T | null
  /** Check if a specific item is being deleted */
  isDeleting: (id: T) => boolean
  /** Trigger delete with optional confirmation */
  confirmDelete: (id: T) => Promise<boolean>
  /** Direct delete handler (no confirmation) */
  handleDelete: (id: T) => Promise<boolean>
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * Hook for managing delete operations with loading states
 */
export function useDeleteConfirmation<T = string>(
  options: UseDeleteConfirmationOptions<T>
): UseDeleteConfirmationReturn<T> {
  const {
    onDelete,
    successMessage = "Deleted successfully",
    errorMessage = "Failed to delete",
    onSuccess,
    onError,
    useNativeConfirm = false,
    confirmMessage = "Are you sure you want to delete this item?",
  } = options

  const [deleting, setDeleting] = useState(false)
  const [deletingId, setDeletingId] = useState<T | null>(null)

  const isDeleting = useCallback(
    (id: T) => {
      return deleting && deletingId === id
    },
    [deleting, deletingId]
  )

  const handleDelete = useCallback(
    async (id: T): Promise<boolean> => {
      setDeleting(true)
      setDeletingId(id)

      try {
        await onDelete(id)

        toast.success(successMessage)
        onSuccess?.()

        return true
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        const message =
          typeof errorMessage === "function"
            ? errorMessage(error)
            : errorMessage

        toast.error(message)
        onError?.(error)

        return false
      } finally {
        setDeleting(false)
        setDeletingId(null)
      }
    },
    [onDelete, successMessage, errorMessage, onSuccess, onError]
  )

  const confirmDelete = useCallback(
    async (id: T): Promise<boolean> => {
      if (useNativeConfirm) {
        const confirmed = window.confirm(confirmMessage)
        if (!confirmed) {
          return false
        }
      }

      return handleDelete(id)
    },
    [useNativeConfirm, confirmMessage, handleDelete]
  )

  return {
    deleting,
    deletingId,
    isDeleting,
    confirmDelete,
    handleDelete,
  }
}

// ============================================================================
// MULTI-DELETE VARIANT
// ============================================================================

interface UseMultiDeleteOptions<T = string> {
  /** Function to delete multiple items */
  onDelete: (ids: T[]) => Promise<void>
  /** Success message (can use count) */
  successMessage?: string | ((count: number) => string)
  /** Error message */
  errorMessage?: string
  /** Callback after successful deletion */
  onSuccess?: () => void
  /** Confirm message for bulk delete */
  confirmMessage?: string | ((count: number) => string)
}

interface UseMultiDeleteReturn<T = string> {
  /** Whether delete is in progress */
  deleting: boolean
  /** Currently selected items */
  selectedIds: T[]
  /** Toggle item selection */
  toggleSelect: (id: T) => void
  /** Select all items */
  selectAll: (ids: T[]) => void
  /** Clear selection */
  clearSelection: () => void
  /** Check if item is selected */
  isSelected: (id: T) => boolean
  /** Delete selected items */
  deleteSelected: () => Promise<boolean>
  /** Number of selected items */
  selectedCount: number
}

/**
 * Hook for managing bulk delete operations with selection state
 *
 * @example
 * const bulk = useMultiDelete({
 *   onDelete: async (ids) => {
 *     await supabase.from("items").delete().in("id", ids)
 *   },
 *   successMessage: (count) => `${count} items deleted`,
 * })
 *
 * // In table
 * <Checkbox checked={bulk.isSelected(item.id)} onChange={() => bulk.toggleSelect(item.id)} />
 *
 * // Delete button
 * <Button onClick={bulk.deleteSelected} disabled={bulk.selectedCount === 0}>
 *   Delete ({bulk.selectedCount})
 * </Button>
 */
export function useMultiDelete<T = string>(
  options: UseMultiDeleteOptions<T>
): UseMultiDeleteReturn<T> {
  const {
    onDelete,
    successMessage = (count: number) => `${count} items deleted`,
    errorMessage = "Failed to delete items",
    onSuccess,
    confirmMessage = (count: number) =>
      `Are you sure you want to delete ${count} items?`,
  } = options

  const [deleting, setDeleting] = useState(false)
  const [selectedIds, setSelectedIds] = useState<T[]>([])

  const toggleSelect = useCallback((id: T) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }, [])

  const selectAll = useCallback((ids: T[]) => {
    setSelectedIds(ids)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedIds([])
  }, [])

  const isSelected = useCallback(
    (id: T) => {
      return selectedIds.includes(id)
    },
    [selectedIds]
  )

  const deleteSelected = useCallback(async (): Promise<boolean> => {
    if (selectedIds.length === 0) {
      return false
    }

    const message =
      typeof confirmMessage === "function"
        ? confirmMessage(selectedIds.length)
        : confirmMessage

    const confirmed = window.confirm(message)
    if (!confirmed) {
      return false
    }

    setDeleting(true)

    try {
      await onDelete(selectedIds)

      const msg =
        typeof successMessage === "function"
          ? successMessage(selectedIds.length)
          : successMessage

      toast.success(msg)
      clearSelection()
      onSuccess?.()

      return true
    } catch (err) {
      toast.error(errorMessage)
      return false
    } finally {
      setDeleting(false)
    }
  }, [
    selectedIds,
    onDelete,
    successMessage,
    errorMessage,
    confirmMessage,
    clearSelection,
    onSuccess,
  ])

  return {
    deleting,
    selectedIds,
    toggleSelect,
    selectAll,
    clearSelection,
    isSelected,
    deleteSelected,
    selectedCount: selectedIds.length,
  }
}
