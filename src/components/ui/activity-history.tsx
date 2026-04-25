"use client"

import { History, Plus, Pencil, Trash2, User, ChevronDown, ChevronUp, LucideIcon } from "lucide-react"
import { formatDateTime, formatTimeAgo } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/loading"
import { cn } from "@/lib/utils"
import { useActivityHistory } from "@/lib/hooks/useActivityHistory"
import type { AuditEvent, ChangedField } from "@/lib/hooks/useActivityHistory"

// ── Display constants ──────────────────────────────────────────────────────

const actionIcons: Record<string, LucideIcon> = {
  insert: Plus,
  update: Pencil,
  delete: Trash2,
  status_change: Pencil,  // Status changes are a type of update
}

const actionLabels: Record<string, string> = {
  insert: "Created",
  update: "Updated",
  delete: "Deleted",
  status_change: "Status Changed",
}

const actionColors: Record<string, string> = {
  insert: "text-success bg-success/10",
  update: "text-info bg-info/10",
  delete: "text-destructive bg-destructive/10",
  status_change: "text-warning bg-warning/10",
}

// ── Shared timeline rendering ──────────────────────────────────────────────

interface TimelineProps {
  events: AuditEvent[]
  showChanges: boolean
  expanded: Set<string>
  toggleExpanded: (eventId: string) => void
  getUserDisplayName: (actorId: string | null) => string
  formatChanges: (changes: AuditEvent["changes"]) => ChangedField[] | null
  formatFieldName: (field: string) => string
  formatValue: (value: unknown) => string
}

function ActivityTimeline({
  events,
  showChanges,
  expanded,
  toggleExpanded,
  getUserDisplayName,
  formatChanges,
  formatFieldName,
  formatValue,
}: TimelineProps) {
  return (
    <div className="relative space-y-4">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

      {events.map((event) => {
        // Use fallback for unknown action types
        const Icon = actionIcons[event.action] || Pencil
        const changes = showChanges ? formatChanges(event.changes) : null
        const isExpanded = expanded.has(event.id)
        const hasChanges = changes && changes.length > 0

        return (
          <div key={event.id} className="relative flex gap-4 pl-2">
            {/* Icon */}
            <div
              className={cn(
                "relative z-10 flex h-8 w-8 items-center justify-center rounded-full",
                actionColors[event.action] || "text-foreground bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
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
                  {formatTimeAgo(event.created_at)}
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
                              <span>&rarr;</span>
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
                {formatDateTime(event.created_at)}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Loading skeleton ───────────────────────────────────────────────────────

function ActivitySkeleton() {
  return (
    <>
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </>
  )
}

// ── Public components ──────────────────────────────────────────────────────

interface ActivityHistoryProps {
  entityType: string
  entityId: string
  className?: string
  maxItems?: number
  title?: string
  showChanges?: boolean
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
  const {
    events,
    loading,
    error,
    expanded,
    toggleExpanded,
    getUserDisplayName,
    formatChanges,
    formatFieldName,
    formatValue,
  } = useActivityHistory({ entityType, entityId, maxItems, showChanges })

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
          <ActivitySkeleton />
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
        <ActivityTimeline
          events={events}
          showChanges={showChanges}
          expanded={expanded}
          toggleExpanded={toggleExpanded}
          getUserDisplayName={getUserDisplayName}
          formatChanges={formatChanges}
          formatFieldName={formatFieldName}
          formatValue={formatValue}
        />
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
  const {
    events,
    loading,
    error,
    expanded,
    toggleExpanded,
    getUserDisplayName,
    formatChanges,
    formatFieldName,
    formatValue,
  } = useActivityHistory({ entityType, entityId, maxItems, showChanges })

  if (loading) {
    return (
      <div className="space-y-4">
        <ActivitySkeleton />
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
    <ActivityTimeline
      events={events}
      showChanges={showChanges}
      expanded={expanded}
      toggleExpanded={toggleExpanded}
      getUserDisplayName={getUserDisplayName}
      formatChanges={formatChanges}
      formatFieldName={formatFieldName}
      formatValue={formatValue}
    />
  )
}
