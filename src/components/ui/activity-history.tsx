"use client"

import { useState, useEffect } from "react"
import { format, formatDistanceToNow } from "date-fns"
import { History, Plus, Pencil, Trash2, User, ChevronDown, ChevronUp } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/loading"
import { cn } from "@/lib/utils"

interface AuditEvent {
  id: string
  entity_type: string
  entity_id: string
  action: "insert" | "update" | "delete"
  actor_id: string | null
  actor_type: string
  changes: {
    before?: Record<string, unknown>
    after?: Record<string, unknown>
  } | null
  metadata: Record<string, unknown> | null
  created_at: string
}

interface UserInfo {
  id: string
  email?: string
  name?: string
}

interface ActivityHistoryProps {
  entityType: string
  entityId: string
  className?: string
  maxItems?: number
  title?: string
  showChanges?: boolean
}

const actionIcons = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
}

const actionLabels = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
}

const actionColors = {
  insert: "text-green-600 bg-green-50",
  update: "text-blue-600 bg-blue-50",
  delete: "text-red-600 bg-red-50",
}

/**
 * ActivityHistory - Shows audit trail for a specific entity
 *
 * Displays a timeline of all changes made to a record,
 * including who made the change and what was changed.
 */
export function ActivityHistory({
  entityType,
  entityId,
  className,
  maxItems = 10,
  title = "Activity History",
  showChanges = true,
}: ActivityHistoryProps) {
  const [events, setEvents] = useState<AuditEvent[]>([])
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
          .map((e: AuditEvent) => e.actor_id)
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
        console.error("Failed to fetch activity history:", err)
        setError("Failed to load activity history")
      } finally {
        setLoading(false)
      }
    }

    if (entityId) {
      fetchHistory()
    }
  }, [entityType, entityId, maxItems])

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpanded(newExpanded)
  }

  const getUserDisplayName = (actorId: string | null) => {
    if (!actorId) return "System"
    const user = users.get(actorId)
    if (user?.name) return user.name
    if (user?.email) return user.email.split("@")[0]
    return `User ${actorId.slice(0, 8)}...`
  }

  const formatChanges = (changes: AuditEvent["changes"]) => {
    if (!changes) return null

    const changedFields: { field: string; before: unknown; after: unknown }[] = []

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

    // Filter out internal fields
    const excludedFields = ["id", "owner_id", "workspace_id", "created_at", "updated_at", "created_by", "deleted_at", "deleted_by"]
    return changedFields.filter((c) => !excludedFields.includes(c.field))
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (events.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative space-y-4">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

          {events.map((event, index) => {
            const Icon = actionIcons[event.action]
            const changes = showChanges ? formatChanges(event.changes) : null
            const isExpanded = expanded.has(event.id)
            const hasChanges = changes && changes.length > 0

            // DEBUG: Log if Icon is undefined
            if (!Icon) {
              console.error("[ActivityHistory] Unknown action type:", event.action, "for event:", event.id)
            }

            return (
              <div key={event.id} className="relative flex gap-4 pl-2">
                {/* Icon */}
                <div
                  className={cn(
                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                    actionColors[event.action]
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4">?</span>}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {actionLabels[event.action]}
                    </span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {getUserDisplayName(event.actor_id)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  {/* Show changes details */}
                  {hasChanges && (
                    <div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 mt-1"
                        onClick={() => toggleExpanded(event.id)}
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 mr-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 mr-1" />
                        )}
                        {changes.length} field{changes.length > 1 ? "s" : ""} changed
                      </Button>
                      {isExpanded && (
                        <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs space-y-2">
                          {changes.map((change, i) => (
                            <div key={i} className="flex flex-wrap gap-x-2">
                              <span className="font-medium text-muted-foreground min-w-[100px]">
                                {formatFieldName(change.field)}:
                              </span>
                              {event.action === "update" ? (
                                <>
                                  <span className="line-through text-muted-foreground">
                                    {formatValue(change.before)}
                                  </span>
                                  <span>→</span>
                                  <span className="text-foreground">
                                    {formatValue(change.after)}
                                  </span>
                                </>
                              ) : (
                                <span className="text-foreground">
                                  {formatValue(change.after || change.before)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp tooltip */}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * ActivityHistoryCompact - Smaller version for sidebars
 */
export function ActivityHistoryCompact({
  entityType,
  entityId,
  className,
}: {
  entityType: string
  entityId: string
  className?: string
}) {
  return (
    <ActivityHistory
      entityType={entityType}
      entityId={entityId}
      className={className}
      maxItems={5}
      showChanges={false}
      title="Recent Activity"
    />
  )
}

/**
 * ActivityHistoryContent - Content-only version for use inside DetailSection
 *
 * This renders the activity timeline without the Card wrapper,
 * designed to be used inside a DetailSection component for consistent UI.
 */
export function ActivityHistoryContent({
  entityType,
  entityId,
  maxItems = 10,
  showChanges = true,
}: {
  entityType: string
  entityId: string
  maxItems?: number
  showChanges?: boolean
}) {
  const [events, setEvents] = useState<AuditEvent[]>([])
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

        const { data: auditEvents, error: fetchError } = await supabase
          .from("audit_events")
          .select("*")
          .eq("entity_type", entityType)
          .eq("entity_id", entityId)
          .order("created_at", { ascending: false })
          .limit(maxItems)

        if (fetchError) throw fetchError

        setEvents(auditEvents || [])

        const allActorIds = (auditEvents || [])
          .map((e: AuditEvent) => e.actor_id)
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
        console.error("Failed to fetch activity history:", err)
        setError("Failed to load activity history")
      } finally {
        setLoading(false)
      }
    }

    if (entityId) {
      fetchHistory()
    }
  }, [entityType, entityId, maxItems])

  const toggleExpanded = (eventId: string) => {
    const newExpanded = new Set(expanded)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpanded(newExpanded)
  }

  const getUserDisplayName = (actorId: string | null) => {
    if (!actorId) return "System"
    const user = users.get(actorId)
    if (user?.name) return user.name
    if (user?.email) return user.email.split("@")[0]
    return `User ${actorId.slice(0, 8)}...`
  }

  const formatChanges = (changes: AuditEvent["changes"]) => {
    if (!changes) return null

    const changedFields: { field: string; before: unknown; after: unknown }[] = []

    if (changes.before && changes.after) {
      for (const [key, afterValue] of Object.entries(changes.after)) {
        const beforeValue = changes.before[key]
        if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
          changedFields.push({ field: key, before: beforeValue, after: afterValue })
        }
      }
    } else if (changes.after) {
      for (const [key, value] of Object.entries(changes.after)) {
        if (value !== null && value !== undefined) {
          changedFields.push({ field: key, before: null, after: value })
        }
      }
    } else if (changes.before) {
      for (const [key, value] of Object.entries(changes.before)) {
        if (value !== null && value !== undefined) {
          changedFields.push({ field: key, before: value, after: null })
        }
      }
    }

    const excludedFields = ["id", "owner_id", "workspace_id", "created_at", "updated_at", "created_by", "deleted_at", "deleted_by"]
    return changedFields.filter((c) => !excludedFields.includes(c.field))
  }

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim()
  }

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "—"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-8 w-8 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>
  }

  if (events.length === 0) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
  }

  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {events.map((event) => {
        const Icon = actionIcons[event.action]
        const changes = showChanges ? formatChanges(event.changes) : null
        const isExpanded = expanded.has(event.id)
        const hasChanges = changes && changes.length > 0

        // DEBUG: Log if Icon is undefined
        if (!Icon) {
          console.error("[ActivityHistoryContent] Unknown action type:", event.action, "for event:", event.id)
        }

        return (
          <div key={event.id} className="relative flex gap-4 pl-2">
            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                actionColors[event.action]
              )}
            >
              {Icon ? <Icon className="h-4 w-4" /> : <span className="h-4 w-4">?</span>}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {actionLabels[event.action]}
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {getUserDisplayName(event.actor_id)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(event.created_at), { addSuffix: true })}
                </span>
              </div>

              {/* Show changes details */}
              {hasChanges && (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 mt-1"
                    onClick={() => toggleExpanded(event.id)}
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3 w-3 mr-1" />
                    ) : (
                      <ChevronDown className="h-3 w-3 mr-1" />
                    )}
                    {changes.length} field{changes.length > 1 ? "s" : ""} changed
                  </Button>
                  {isExpanded && (
                    <div className="mt-2 rounded-md border bg-muted/30 p-3 text-xs space-y-2">
                      {changes.map((change, i) => (
                        <div key={i} className="flex flex-wrap gap-x-2">
                          <span className="font-medium text-muted-foreground min-w-[100px]">
                            {formatFieldName(change.field)}:
                          </span>
                          {event.action === "update" ? (
                            <>
                              <span className="line-through text-muted-foreground">
                                {formatValue(change.before)}
                              </span>
                              <span>→</span>
                              <span className="text-foreground">
                                {formatValue(change.after)}
                              </span>
                            </>
                          ) : (
                            <span className="text-foreground">
                              {formatValue(change.after || change.before)}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp tooltip */}
              <p className="text-xs text-muted-foreground mt-1">
                {format(new Date(event.created_at), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
