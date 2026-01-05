/**
 * Audit Service
 *
 * Centralized audit logging for all entity operations.
 * Ensures consistent audit trail across the entire application.
 */

import { createClient } from "@/lib/supabase/client"
import {
  AuditEvent,
  AuditAction,
  EntityType,
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
} from "./types"

// ============================================
// Audit Event Creation
// ============================================

export async function logAuditEvent(event: AuditEvent): Promise<ServiceResult<string>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("audit_events")
      .insert({
        entity_type: event.entity_type,
        entity_id: event.entity_id,
        action: event.action,
        actor_id: event.actor_id,
        actor_type: event.actor_type,
        workspace_id: event.workspace_id,
        changes: event.changes || null,
        metadata: event.metadata || null,
        ip_address: event.ip_address || null,
        user_agent: event.user_agent || null,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      console.error("[AuditService] Failed to log audit event:", error)
      return createErrorResult(
        createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to log audit event", { error })
      )
    }

    return createSuccessResult(data.id)
  } catch (err) {
    console.error("[AuditService] Exception logging audit event:", err)
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Exception logging audit event", undefined, err)
    )
  }
}

// ============================================
// Batch Audit Logging
// ============================================

export async function logAuditEvents(events: AuditEvent[]): Promise<ServiceResult<string[]>> {
  if (events.length === 0) {
    return createSuccessResult([])
  }

  try {
    const supabase = createClient()

    const records = events.map((event) => ({
      entity_type: event.entity_type,
      entity_id: event.entity_id,
      action: event.action,
      actor_id: event.actor_id,
      actor_type: event.actor_type,
      workspace_id: event.workspace_id,
      changes: event.changes || null,
      metadata: event.metadata || null,
      ip_address: event.ip_address || null,
      user_agent: event.user_agent || null,
      created_at: new Date().toISOString(),
    }))

    const { data, error } = await supabase
      .from("audit_events")
      .insert(records)
      .select("id")

    if (error) {
      console.error("[AuditService] Failed to log batch audit events:", error)
      return createErrorResult(
        createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to log batch audit events", { error })
      )
    }

    return createSuccessResult(data.map((d) => d.id))
  } catch (err) {
    console.error("[AuditService] Exception logging batch audit events:", err)
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Exception logging batch audit events", undefined, err)
    )
  }
}

// ============================================
// Helper: Create Audit Event
// ============================================

export function createAuditEvent(
  entityType: EntityType,
  entityId: string,
  action: AuditAction,
  context: {
    actor_id: string
    actor_type: "owner" | "staff" | "tenant" | "system"
    workspace_id: string
  },
  options?: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
    metadata?: Record<string, unknown>
  }
): AuditEvent {
  const changes: AuditEvent["changes"] = {}

  if (options?.before) {
    changes.before = options.before
  }
  if (options?.after) {
    changes.after = options.after
  }
  if (options?.before && options?.after) {
    changes.fields_changed = Object.keys(options.after).filter(
      (key) => JSON.stringify(options.before?.[key]) !== JSON.stringify(options.after?.[key])
    )
  }

  return {
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: context.actor_id,
    actor_type: context.actor_type,
    workspace_id: context.workspace_id,
    changes: Object.keys(changes).length > 0 ? changes : undefined,
    metadata: options?.metadata,
  }
}

// ============================================
// Helper: Diff Objects for Changes
// ============================================

export function diffObjects(
  before: Record<string, unknown>,
  after: Record<string, unknown>
): { before: Record<string, unknown>; after: Record<string, unknown>; fields_changed: string[] } {
  const fields_changed: string[] = []
  const beforeDiff: Record<string, unknown> = {}
  const afterDiff: Record<string, unknown> = {}

  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)])

  for (const key of allKeys) {
    const beforeVal = JSON.stringify(before[key])
    const afterVal = JSON.stringify(after[key])

    if (beforeVal !== afterVal) {
      fields_changed.push(key)
      beforeDiff[key] = before[key]
      afterDiff[key] = after[key]
    }
  }

  return {
    before: beforeDiff,
    after: afterDiff,
    fields_changed,
  }
}

// ============================================
// Query Audit Events
// ============================================

export interface AuditQueryOptions {
  workspace_id: string
  entity_type?: EntityType
  entity_id?: string
  action?: AuditAction
  actor_id?: string
  from_date?: string
  to_date?: string
  limit?: number
  offset?: number
}

export async function queryAuditEvents(options: AuditQueryOptions): Promise<ServiceResult<AuditEvent[]>> {
  try {
    const supabase = createClient()

    let query = supabase
      .from("audit_events")
      .select("*")
      .eq("workspace_id", options.workspace_id)
      .order("created_at", { ascending: false })

    if (options.entity_type) {
      query = query.eq("entity_type", options.entity_type)
    }
    if (options.entity_id) {
      query = query.eq("entity_id", options.entity_id)
    }
    if (options.action) {
      query = query.eq("action", options.action)
    }
    if (options.actor_id) {
      query = query.eq("actor_id", options.actor_id)
    }
    if (options.from_date) {
      query = query.gte("created_at", options.from_date)
    }
    if (options.to_date) {
      query = query.lte("created_at", options.to_date)
    }
    if (options.limit) {
      query = query.limit(options.limit)
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1)
    }

    const { data, error } = await query

    if (error) {
      console.error("[AuditService] Failed to query audit events:", error)
      return createErrorResult(
        createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to query audit events", { error })
      )
    }

    return createSuccessResult(data as AuditEvent[])
  } catch (err) {
    console.error("[AuditService] Exception querying audit events:", err)
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Exception querying audit events", undefined, err)
    )
  }
}

// ============================================
// Entity History
// ============================================

export async function getEntityHistory(
  entityType: EntityType,
  entityId: string,
  workspaceId: string
): Promise<ServiceResult<AuditEvent[]>> {
  return queryAuditEvents({
    workspace_id: workspaceId,
    entity_type: entityType,
    entity_id: entityId,
    limit: 100,
  })
}
