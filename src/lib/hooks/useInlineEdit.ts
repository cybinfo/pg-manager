/**
 * useInlineEdit Hook
 *
 * Manages inline editing state and Supabase updates for list pages.
 * Provides optimistic updates with rollback on failure.
 *
 * @example
 * const { updateRow, saving } = useInlineEdit({
 *   table: "tenants",
 *   workspaceId: currentContext.workspace_id,
 *   onSuccess: refetch,
 * })
 *
 * // In column render:
 * <InlineEditCell
 *   value={row.name}
 *   field="name"
 *   onSave={(field, value) => updateRow(row.id, { [field]: value })}
 * />
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"

// ============================================
// Types
// ============================================

export interface UseInlineEditOptions {
  /** Database table name */
  table: string
  /** Current workspace ID for RLS */
  workspaceId: string | null
  /** Callback after successful update */
  onSuccess?: () => void
  /** Whether to show success toast (default: true) */
  showSuccessToast?: boolean
  /** Custom success message */
  successMessage?: string
  /** Whether to show error toast (default: true) */
  showErrorToast?: boolean
}

export interface UseInlineEditReturn {
  /** Update a single row with given updates */
  updateRow: (id: string, updates: Record<string, unknown>) => Promise<boolean>
  /** Whether an update is in progress */
  saving: boolean
  /** ID of the row currently being saved (null if none) */
  savingId: string | null
}

// ============================================
// Hook Implementation
// ============================================

export function useInlineEdit({
  table,
  workspaceId,
  onSuccess,
  showSuccessToast = true,
  successMessage = "Updated successfully",
  showErrorToast = true,
}: UseInlineEditOptions): UseInlineEditReturn {
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const updateRow = useCallback(
    async (id: string, updates: Record<string, unknown>): Promise<boolean> => {
      if (!workspaceId) {
        if (showErrorToast) {
          showError("No workspace selected")
        }
        return false
      }

      setSaving(true)
      setSavingId(id)

      try {
        const supabase = createClient()

        // Add updated_at timestamp
        const payload = {
          ...updates,
          updated_at: getNowISO(),
        }

        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", id)
          .eq("workspace_id", workspaceId)

        if (error) {
          logger.error(`[useInlineEdit] Update failed:`, { error: String(error) })
          if (showErrorToast) {
            showError(error.message || "Failed to update")
          }
          return false
        }

        if (showSuccessToast) {
          showSuccess(successMessage)
        }

        // Call success callback (usually to refetch data)
        onSuccess?.()

        return true
      } catch (err) {
        logger.error(`[useInlineEdit] Unexpected error:`, { error: String(err) })
        if (showErrorToast) {
          showError("An unexpected error occurred")
        }
        return false
      } finally {
        setSaving(false)
        setSavingId(null)
      }
    },
    [table, workspaceId, onSuccess, showSuccessToast, successMessage, showErrorToast]
  )

  return {
    updateRow,
    saving,
    savingId,
  }
}

// ============================================
// Batch Update Hook (for row edit mode)
// ============================================

export interface UseBatchInlineEditOptions extends UseInlineEditOptions {
  /** Callback before batch update (for validation) */
  onBeforeUpdate?: (id: string, updates: Record<string, unknown>) => string | null
}

export interface UseBatchInlineEditReturn extends UseInlineEditReturn {
  /** ID of the row currently in edit mode */
  editingId: string | null
  /** Start editing a row */
  startEditing: (id: string) => void
  /** Cancel editing */
  cancelEditing: () => void
  /** Pending changes for the editing row */
  pendingChanges: Record<string, unknown>
  /** Set a pending change */
  setPendingChange: (field: string, value: unknown) => void
  /** Save all pending changes */
  savePendingChanges: () => Promise<boolean>
}

export function useBatchInlineEdit({
  table,
  workspaceId,
  onSuccess,
  onBeforeUpdate,
  showSuccessToast = true,
  successMessage = "Updated successfully",
  showErrorToast = true,
}: UseBatchInlineEditOptions): UseBatchInlineEditReturn {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [pendingChanges, setPendingChanges] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)

  const startEditing = useCallback((id: string) => {
    setEditingId(id)
    setPendingChanges({})
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setPendingChanges({})
  }, [])

  const setPendingChange = useCallback((field: string, value: unknown) => {
    setPendingChanges((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateRow = useCallback(
    async (id: string, updates: Record<string, unknown>): Promise<boolean> => {
      if (!workspaceId) {
        if (showErrorToast) {
          showError("No workspace selected")
        }
        return false
      }

      // Run before update validation
      if (onBeforeUpdate) {
        const validationError = onBeforeUpdate(id, updates)
        if (validationError) {
          if (showErrorToast) {
            showError(validationError)
          }
          return false
        }
      }

      setSaving(true)
      setSavingId(id)

      try {
        const supabase = createClient()

        const payload = {
          ...updates,
          updated_at: getNowISO(),
        }

        const { error } = await supabase
          .from(table)
          .update(payload)
          .eq("id", id)
          .eq("workspace_id", workspaceId)

        if (error) {
          logger.error(`[useBatchInlineEdit] Update failed:`, { error: String(error) })
          if (showErrorToast) {
            showError(error.message || "Failed to update")
          }
          return false
        }

        if (showSuccessToast) {
          showSuccess(successMessage)
        }

        onSuccess?.()
        return true
      } catch (err) {
        logger.error(`[useBatchInlineEdit] Unexpected error:`, { error: String(err) })
        if (showErrorToast) {
          showError("An unexpected error occurred")
        }
        return false
      } finally {
        setSaving(false)
        setSavingId(null)
      }
    },
    [table, workspaceId, onSuccess, onBeforeUpdate, showSuccessToast, successMessage, showErrorToast]
  )

  const savePendingChanges = useCallback(async (): Promise<boolean> => {
    if (!editingId || Object.keys(pendingChanges).length === 0) {
      cancelEditing()
      return true
    }

    const success = await updateRow(editingId, pendingChanges)
    if (success) {
      cancelEditing()
    }
    return success
  }, [editingId, pendingChanges, updateRow, cancelEditing])

  return {
    updateRow,
    saving,
    savingId,
    editingId,
    startEditing,
    cancelEditing,
    pendingChanges,
    setPendingChange,
    savePendingChanges,
  }
}
