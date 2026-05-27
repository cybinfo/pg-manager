/**
 * useDetailPageMutations Hook
 *
 * Handles create, update, delete (soft delete), and cascade delete operations
 * for detail pages. This is an internal sub-hook composed by the main useDetailPage.
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { softDelete, cascadeSoftDelete, isSoftDeletableTable } from "@/lib/audit"
import type { SoftDeletableTable } from "@/types/audit.types"
import type { DetailPageConfig } from "./types"

interface UseDetailPageMutationsOptions<T> {
  config: DetailPageConfig<T>
  id: string | string[] | undefined
  data: T | null
  setData: React.Dispatch<React.SetStateAction<T | null>>
}

interface UseDetailPageMutationsReturn {
  updateField: (field: string, value: unknown) => Promise<boolean>
  updateFields: (updates: Record<string, unknown>) => Promise<boolean>
  deleteRecord: (options?: { confirm?: boolean; cascadeDeletes?: { table: string; foreignKey: string }[] }) => Promise<boolean>
  isDeleting: boolean
  isSaving: boolean
}

export function useDetailPageMutations<T extends object>(
  options: UseDetailPageMutationsOptions<T>
): UseDetailPageMutationsReturn {
  const { config, id, data, setData } = options

  const router = useRouter()
  const { user } = useAuth()
  const [isDeleting, setIsDeleting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // Refs to prevent stale closures
  const configRef = useRef(config)

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Update single field (optimistic with rollback)
  const updateField = useCallback(
    async (field: string, value: unknown): Promise<boolean> => {
      if (!data || !id) return false

      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id

      // Save snapshot for rollback
      const snapshot = { ...data }

      // Optimistic: update UI immediately
      setData((prev) => (prev ? { ...prev, [field]: value } : null))
      setIsSaving(true)

      try {
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from(currentConfig.table)
          .update({ [field]: value })
          .eq("id", entityId)

        if (updateError) {
          throw updateError
        }

        showSuccess("Updated successfully")
        return true
      } catch (err) {
        // Rollback to snapshot on failure
        setData(snapshot)
        logger.error(`[useDetailPage] Error updating ${field}:`, { error: String(err) })
        showError("Failed to update — changes reverted")
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [data, id, setData]
  )

  // Update multiple fields (optimistic with rollback)
  const updateFields = useCallback(
    async (updates: Record<string, unknown>): Promise<boolean> => {
      if (!data || !id) return false

      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id

      // Save snapshot for rollback
      const snapshot = { ...data }

      // Optimistic: update UI immediately
      setData((prev) => (prev ? { ...prev, ...updates } : null))
      setIsSaving(true)

      try {
        const supabase = createClient()

        const { error: updateError } = await supabase
          .from(currentConfig.table)
          .update(updates)
          .eq("id", entityId)

        if (updateError) {
          throw updateError
        }

        showSuccess("Updated successfully")
        return true
      } catch (err) {
        // Rollback to snapshot on failure
        setData(snapshot)
        logger.error(`[useDetailPage] Error updating fields:`, { error: String(err) })
        showError("Failed to update — changes reverted")
        return false
      } finally {
        setIsSaving(false)
      }
    },
    [data, id, setData]
  )

  // Delete record (soft delete)
  const deleteRecord = useCallback(
    async (deleteOptions?: {
      confirm?: boolean
      cascadeDeletes?: { table: string; foreignKey: string }[]
    }): Promise<boolean> => {
      if (!data || !id) return false

      const { confirm = true, cascadeDeletes = [] } = deleteOptions || {}
      const currentConfig = configRef.current
      const entityId = Array.isArray(id) ? id[0] : id

      // Show confirmation if needed
      if (confirm) {
        const confirmed = window.confirm(
          "Are you sure you want to delete this item? This action will archive the record."
        )
        if (!confirmed) return false
      }

      setIsDeleting(true)

      try {
        const supabase = createClient()

        if (!user) {
          showError("Session expired. Please log in again.")
          return false
        }

        // Soft delete cascade records first (if they support it)
        // Note: user_roles is a join table and should be hard deleted
        const softDeletableCascades = cascadeDeletes.filter(
          (c) => isSoftDeletableTable(c.table)
        )
        const hardDeleteCascades = cascadeDeletes.filter(
          (c) => !isSoftDeletableTable(c.table)
        )

        // Cascade soft delete for supported tables
        if (softDeletableCascades.length > 0) {
          const cascadeConfigs = softDeletableCascades.map((c) => ({
            table: c.table as SoftDeletableTable,
            foreignKey: c.foreignKey,
          }))
          const { errors } = await cascadeSoftDelete(entityId, user.id, cascadeConfigs)
          if (errors.length > 0) {
            logger.error("[useDetailPage] Cascade soft delete errors:", { error: String(errors) })
          }
        }

        // Hard delete for join tables that don't support soft delete
        for (const cascade of hardDeleteCascades) {
          await supabase.from(cascade.table).delete().eq(cascade.foreignKey, entityId)
        }

        // Check if main table supports soft delete
        if (isSoftDeletableTable(currentConfig.table)) {
          // Soft delete main record
          const { error } = await softDelete(
            currentConfig.table,
            entityId,
            user.id
          )

          if (error) {
            throw error
          }
        } else {
          // Fall back to hard delete for tables that don't support soft delete
          const { error: deleteError } = await supabase
            .from(currentConfig.table)
            .delete()
            .eq("id", entityId)

          if (deleteError) {
            throw deleteError
          }
        }

        showSuccess("Deleted successfully")

        // Redirect after deletion
        if (currentConfig.redirectOnNotFound) {
          router.push(currentConfig.redirectOnNotFound)
        }

        return true
      } catch (err) {
        logger.error(`[useDetailPage] Error deleting:`, { error: String(err) })
        showError("Failed to delete")
        return false
      } finally {
        setIsDeleting(false)
      }
    },
    [data, id, router]
  )

  return {
    updateField,
    updateFields,
    deleteRecord,
    isDeleting,
    isSaving,
  }
}
