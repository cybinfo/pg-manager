/**
 * useEntityMutation Hook
 *
 * Centralized hook for all entity CRUD operations.
 * Automatically handles: audit logging, notifications, and error handling.
 *
 * @example
 * const { create, update, remove, loading } = useEntityMutation({
 *   entityType: 'tenant',
 *   table: 'tenants',
 *   onSuccess: () => refetch(),
 * })
 *
 * await create({ name: 'John', phone: '9876543210' })
 */

"use client"

import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { useAuth, useCurrentContext } from "@/lib/auth"
import {
  EntityType,
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
  NotificationPayload,
} from "@/lib/services/types"
import { logAuditEvent, createAuditEvent, diffObjects } from "@/lib/services/audit.service"
import { sendNotification } from "@/lib/services/notification.service"

// ============================================
// Types
// ============================================

export interface UseEntityMutationOptions {
  entityType: EntityType
  table: string
  onSuccess?: (data: unknown, action: "create" | "update" | "delete") => void
  onError?: (error: unknown, action: "create" | "update" | "delete") => void
  skipAudit?: boolean
  skipNotifications?: boolean
  successMessages?: {
    create?: string
    update?: string
    delete?: string
  }
  errorMessages?: {
    create?: string
    update?: string
    delete?: string
  }
}

export interface MutationOptions {
  skipAudit?: boolean
  skipNotifications?: boolean
  notifications?: NotificationPayload[]
  metadata?: Record<string, unknown>
  silent?: boolean // Don't show toast
}

export interface UseEntityMutationReturn<T> {
  create: (data: Partial<T>, options?: MutationOptions) => Promise<ServiceResult<T>>
  update: (id: string, data: Partial<T>, options?: MutationOptions) => Promise<ServiceResult<T>>
  remove: (id: string, options?: MutationOptions) => Promise<ServiceResult<void>>
  bulkCreate: (items: Partial<T>[], options?: MutationOptions) => Promise<ServiceResult<T[]>>
  bulkUpdate: (updates: { id: string; data: Partial<T> }[], options?: MutationOptions) => Promise<ServiceResult<T[]>>
  bulkDelete: (ids: string[], options?: MutationOptions) => Promise<ServiceResult<void>>
  loading: boolean
  error: Error | null
}

// ============================================
// Hook Implementation
// ============================================

export function useEntityMutation<T extends Record<string, unknown>>(
  options: UseEntityMutationOptions
): UseEntityMutationReturn<T> {
  const {
    entityType,
    table,
    onSuccess,
    onError,
    skipAudit: globalSkipAudit = false,
    skipNotifications: globalSkipNotifications = false,
    successMessages = {},
    errorMessages = {},
  } = options

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Get auth context
  const { user } = useAuth()
  const { context } = useCurrentContext()

  const getActorInfo = useCallback(() => {
    return {
      actor_id: user?.id || "system",
      actor_type: (context?.context_type || "system") as "owner" | "staff" | "tenant" | "system",
      workspace_id: context?.workspace_id || "",
    }
  }, [user, context])

  // ============================================
  // CREATE
  // ============================================

  const create = useCallback(
    async (data: Partial<T>, mutationOptions?: MutationOptions): Promise<ServiceResult<T>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()

        // Add owner_id if not present
        const insertData = {
          ...data,
          owner_id: data.owner_id || actorInfo.actor_id,
          created_at: new Date().toISOString(),
        }

        const { data: result, error: insertError } = await supabase
          .from(table)
          .insert(insertData)
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        // Audit log
        if (!globalSkipAudit && !mutationOptions?.skipAudit) {
          const auditEvent = createAuditEvent(
            entityType,
            result.id,
            "create",
            actorInfo,
            { after: result, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        // Notifications
        if (!globalSkipNotifications && !mutationOptions?.skipNotifications && mutationOptions?.notifications) {
          for (const notification of mutationOptions.notifications) {
            await sendNotification(notification)
          }
        }

        // Success toast
        if (!mutationOptions?.silent) {
          toast.success(successMessages.create || `${formatEntityName(entityType)} created successfully`)
        }

        onSuccess?.(result, "create")
        return createSuccessResult(result as T)
      } catch (err) {
        console.error(`[useEntityMutation] Create ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(errorMessages.create || `Failed to create ${formatEntityName(entityType)}`)
        }

        onError?.(err, "create")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to create ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, globalSkipNotifications, successMessages, errorMessages, onSuccess, onError]
  )

  // ============================================
  // UPDATE
  // ============================================

  const update = useCallback(
    async (id: string, data: Partial<T>, mutationOptions?: MutationOptions): Promise<ServiceResult<T>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()

        // Fetch current data for diff
        const { data: before } = await supabase.from(table).select("*").eq("id", id).single()

        // Update
        const updateData = {
          ...data,
          updated_at: new Date().toISOString(),
        }

        const { data: result, error: updateError } = await supabase
          .from(table)
          .update(updateData)
          .eq("id", id)
          .select()
          .single()

        if (updateError) {
          throw updateError
        }

        // Audit log with diff
        if (!globalSkipAudit && !mutationOptions?.skipAudit && before) {
          const changes = diffObjects(before, result)
          const auditEvent = createAuditEvent(
            entityType,
            id,
            "update",
            actorInfo,
            { before: changes.before, after: changes.after, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        // Notifications
        if (!globalSkipNotifications && !mutationOptions?.skipNotifications && mutationOptions?.notifications) {
          for (const notification of mutationOptions.notifications) {
            await sendNotification(notification)
          }
        }

        // Success toast
        if (!mutationOptions?.silent) {
          toast.success(successMessages.update || `${formatEntityName(entityType)} updated successfully`)
        }

        onSuccess?.(result, "update")
        return createSuccessResult(result as T)
      } catch (err) {
        console.error(`[useEntityMutation] Update ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(errorMessages.update || `Failed to update ${formatEntityName(entityType)}`)
        }

        onError?.(err, "update")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to update ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, globalSkipNotifications, successMessages, errorMessages, onSuccess, onError]
  )

  // ============================================
  // DELETE
  // ============================================

  const remove = useCallback(
    async (id: string, mutationOptions?: MutationOptions): Promise<ServiceResult<void>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()

        // Fetch current data for audit
        const { data: before } = await supabase.from(table).select("*").eq("id", id).single()

        // Delete
        const { error: deleteError } = await supabase.from(table).delete().eq("id", id)

        if (deleteError) {
          throw deleteError
        }

        // Audit log
        if (!globalSkipAudit && !mutationOptions?.skipAudit && before) {
          const auditEvent = createAuditEvent(
            entityType,
            id,
            "delete",
            actorInfo,
            { before, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        // Success toast
        if (!mutationOptions?.silent) {
          toast.success(successMessages.delete || `${formatEntityName(entityType)} deleted successfully`)
        }

        onSuccess?.(undefined, "delete")
        return createSuccessResult(undefined)
      } catch (err) {
        console.error(`[useEntityMutation] Delete ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(errorMessages.delete || `Failed to delete ${formatEntityName(entityType)}`)
        }

        onError?.(err, "delete")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to delete ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, globalSkipNotifications, successMessages, errorMessages, onSuccess, onError]
  )

  // ============================================
  // BULK CREATE
  // ============================================

  const bulkCreate = useCallback(
    async (items: Partial<T>[], mutationOptions?: MutationOptions): Promise<ServiceResult<T[]>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()

        const insertData = items.map((item) => ({
          ...item,
          owner_id: item.owner_id || actorInfo.actor_id,
          created_at: new Date().toISOString(),
        }))

        const { data: results, error: insertError } = await supabase
          .from(table)
          .insert(insertData)
          .select()

        if (insertError) {
          throw insertError
        }

        // Audit log (bulk)
        if (!globalSkipAudit && !mutationOptions?.skipAudit) {
          const auditEvent = createAuditEvent(
            entityType,
            "bulk",
            "bulk_update",
            actorInfo,
            { after: { count: results.length, ids: results.map((r: Record<string, unknown>) => r.id) }, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        if (!mutationOptions?.silent) {
          toast.success(`${results.length} ${formatEntityName(entityType)}s created successfully`)
        }

        onSuccess?.(results, "create")
        return createSuccessResult(results as T[])
      } catch (err) {
        console.error(`[useEntityMutation] Bulk create ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(`Failed to create ${formatEntityName(entityType)}s`)
        }

        onError?.(err, "create")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to bulk create ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, onSuccess, onError]
  )

  // ============================================
  // BULK UPDATE
  // ============================================

  const bulkUpdate = useCallback(
    async (
      updates: { id: string; data: Partial<T> }[],
      mutationOptions?: MutationOptions
    ): Promise<ServiceResult<T[]>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()
        const results: T[] = []

        for (const { id, data } of updates) {
          const { data: result, error: updateError } = await supabase
            .from(table)
            .update({ ...data, updated_at: new Date().toISOString() })
            .eq("id", id)
            .select()
            .single()

          if (updateError) {
            throw updateError
          }

          results.push(result as T)
        }

        // Audit log (bulk)
        if (!globalSkipAudit && !mutationOptions?.skipAudit) {
          const auditEvent = createAuditEvent(
            entityType,
            "bulk",
            "bulk_update",
            actorInfo,
            { after: { count: results.length, ids: updates.map((u) => u.id) }, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        if (!mutationOptions?.silent) {
          toast.success(`${results.length} ${formatEntityName(entityType)}s updated successfully`)
        }

        onSuccess?.(results, "update")
        return createSuccessResult(results)
      } catch (err) {
        console.error(`[useEntityMutation] Bulk update ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(`Failed to update ${formatEntityName(entityType)}s`)
        }

        onError?.(err, "update")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to bulk update ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, onSuccess, onError]
  )

  // ============================================
  // BULK DELETE
  // ============================================

  const bulkDelete = useCallback(
    async (ids: string[], mutationOptions?: MutationOptions): Promise<ServiceResult<void>> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const actorInfo = getActorInfo()

        const { error: deleteError } = await supabase.from(table).delete().in("id", ids)

        if (deleteError) {
          throw deleteError
        }

        // Audit log (bulk)
        if (!globalSkipAudit && !mutationOptions?.skipAudit) {
          const auditEvent = createAuditEvent(
            entityType,
            "bulk",
            "bulk_update",
            actorInfo,
            { before: { count: ids.length, ids }, metadata: mutationOptions?.metadata }
          )
          await logAuditEvent(auditEvent)
        }

        if (!mutationOptions?.silent) {
          toast.success(`${ids.length} ${formatEntityName(entityType)}s deleted successfully`)
        }

        onSuccess?.(undefined, "delete")
        return createSuccessResult(undefined)
      } catch (err) {
        console.error(`[useEntityMutation] Bulk delete ${entityType} failed:`, err)
        setError(err as Error)

        if (!mutationOptions?.silent) {
          toast.error(`Failed to delete ${formatEntityName(entityType)}s`)
        }

        onError?.(err, "delete")
        return createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Failed to bulk delete ${entityType}`, undefined, err)
        )
      } finally {
        setLoading(false)
      }
    },
    [table, entityType, getActorInfo, globalSkipAudit, onSuccess, onError]
  )

  return {
    create,
    update,
    remove,
    bulkCreate,
    bulkUpdate,
    bulkDelete,
    loading,
    error,
  }
}

// ============================================
// Helpers
// ============================================

function formatEntityName(entityType: EntityType): string {
  const names: Record<EntityType, string> = {
    tenant: "Tenant",
    property: "Property",
    room: "Room",
    bill: "Bill",
    payment: "Payment",
    expense: "Expense",
    complaint: "Complaint",
    notice: "Notice",
    visitor: "Visitor",
    staff: "Staff member",
    exit_clearance: "Exit clearance",
    approval: "Approval",
    meter_reading: "Meter reading",
    charge: "Charge",
    role: "Role",
    workspace: "Workspace",
  }
  return names[entityType] || entityType
}
