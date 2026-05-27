"use client"

import { logger } from "@/lib/logger"
import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { formatFieldName, formatAuditValue } from "@/lib/format"

// ── Types ──────────────────────────────────────────────────────────────────

export interface AuditEventRecord {
  id: string
  entity_type: string
  entity_id: string
  action: "insert" | "update" | "delete" | "status_change"
  actor_id: string | null
  actor_type: string
  changes: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  } | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface UserInfo {
  id: string
  email?: string
  name?: string
}

export interface ChangedField {
  field: string
  before: unknown
  after: unknown
}

export interface UseActivityHistoryOptions {
  entityType: string
  entityId: string
  maxItems?: number
  showChanges?: boolean
}

export interface UseActivityHistoryReturn {
  events: AuditEventRecord[]
  loading: boolean
  error: string | null
  expanded: Set<string>
  toggleExpanded: (eventId: string) => void
  getUserDisplayName: (actorId: string | null) => string
  formatChanges: (changes: AuditEventRecord["changes"]) => ChangedField[] | null
  formatFieldName: (field: string) => string
  formatValue: (value: unknown) => string
}

// ── Constants ──────────────────────────────────────────────────────────────

const EXCLUDED_FIELDS = [
  "id",
  "owner_id",
  "workspace_id",
  "created_at",
  "updated_at",
  "created_by",
  "deleted_at",
  "deleted_by",
]

export { formatFieldName }
export const formatValue = formatAuditValue

export function formatChanges(
  changes: AuditEventRecord["changes"]
): ChangedField[] | null {
  if (!changes) return null

  const changedFields: ChangedField[] = []

  if (changes.before && changes.after) {
    // Update - show what changed
    for (const [key, afterValue] of Object.entries(changes.after)) {
      const beforeValue = changes.before[key]
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        changedFields.push({ field: key, before: beforeValue, after: afterValue })
      }
    }
  } else if (changes.after) {
    // Insert - show all fields
    for (const [key, value] of Object.entries(changes.after)) {
      if (value !== null && value !== undefined) {
        changedFields.push({ field: key, before: null, after: value })
      }
    }
  } else if (changes.before) {
    // Delete - show what was deleted
    for (const [key, value] of Object.entries(changes.before)) {
      if (value !== null && value !== undefined) {
        changedFields.push({ field: key, before: value, after: null })
      }
    }
  }

  return changedFields.filter((c) => !EXCLUDED_FIELDS.includes(c.field))
}

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * useActivityHistory - Fetches and manages audit trail data for a specific entity.
 *
 * Handles Supabase queries for audit_events and user_profiles,
 * plus expand/collapse state and formatting helpers.
 */
export function useActivityHistory({
  entityType,
  entityId,
  maxItems = 10,
}: UseActivityHistoryOptions): UseActivityHistoryReturn {
  const [events, setEvents] = useState<AuditEventRecord[]>([])
  const [users, setUsers] = useState<Map<string, UserInfo>>(new Map())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchHistory() {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()

        // Fetch audit events for this entity
        const { data: auditEvents, error: fetchError } = await supabase
          .from("audit_events")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false })
          .limit(maxItems)

        if (fetchError) throw fetchError

        setEvents(auditEvents || [])

        // Fetch user info for all actors
        const allActorIds = (auditEvents || [])
          .map((e: AuditEventRecord) => e.actor_id)
          .filter((id: string | null): id is string => id !== null)
        const actorIds = Array.from(new Set(allActorIds))

        if (actorIds.length > 0) {
          const { data: userData } = await supabase
            .from("user_profiles")
            .select("id, email, name")
            .in("id", actorIds)

          if (userData) {
            setUsers(new Map(userData.map((u: UserInfo) => [u.id, u])))
          }
        }
      } catch (err) {
        logger.error("Failed to fetch activity history:", { error: String(err) })
        setError("Failed to load activity history")
      } finally {
        setLoading(false)
      }
    }

    if (entityId) {
      fetchHistory()
    }
  }, [entityType, entityId, maxItems])

  const toggleExpanded = useCallback((eventId: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  const getUserDisplayName = useCallback(
    (actorId: string | null): string => {
      if (!actorId) return "System"
      const user = users.get(actorId)
      if (user?.name) return user.name
      if (user?.email) return user.email.split("@")[0]
      return `User ${actorId.slice(0, 8)}...`
    },
    [users]
  )

  return {
    events,
    loading,
    error,
    expanded,
    toggleExpanded,
    getUserDisplayName,
    formatChanges,
    formatFieldName,
    formatValue,
  }
}
