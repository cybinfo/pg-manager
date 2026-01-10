"use client"

import { useState, useMemo, useCallback } from "react"
import { ChevronDown, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { JourneyEvent } from "@/types/journey.types"
import { TimelineEvent } from "./TimelineEvent"
import { EmptyState } from "@/components/ui/empty-state"

// ============================================
// Timeline Component
// ============================================

interface TimelineProps {
  events: JourneyEvent[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  loadingMore?: boolean
  showCategory?: boolean
  groupByDate?: boolean
  emptyTitle?: string
  emptyDescription?: string
  className?: string
}

export function Timeline({
  events,
  loading = false,
  hasMore = false,
  onLoadMore,
  loadingMore = false,
  showCategory = true,
  groupByDate = true,
  emptyTitle = "No events yet",
  emptyDescription = "Events will appear here as the tenant's journey progresses.",
  className,
}: TimelineProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  const toggleExpanded = useCallback((eventId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev)
      if (next.has(eventId)) {
        next.delete(eventId)
      } else {
        next.add(eventId)
      }
      return next
    })
  }, [])

  // Group events by date if enabled
  const groupedEvents = useMemo(() => {
    if (!groupByDate) {
      return [{ date: null, label: null, events }]
    }

    const groups: { date: string | null; label: string | null; events: JourneyEvent[] }[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const thisWeekStart = new Date(today)
    thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay())
    const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)

    events.forEach(event => {
      const eventDate = new Date(event.timestamp)
      eventDate.setHours(0, 0, 0, 0)

      let dateKey: string
      let label: string

      if (eventDate.getTime() === today.getTime()) {
        dateKey = "today"
        label = "Today"
      } else if (eventDate.getTime() === yesterday.getTime()) {
        dateKey = "yesterday"
        label = "Yesterday"
      } else if (eventDate >= thisWeekStart) {
        dateKey = "this_week"
        label = "This Week"
      } else if (eventDate >= thisMonthStart) {
        dateKey = "this_month"
        label = "This Month"
      } else if (eventDate.getFullYear() === today.getFullYear()) {
        dateKey = `month_${eventDate.getMonth()}`
        label = eventDate.toLocaleDateString("en-IN", { month: "long" })
      } else {
        dateKey = `year_${eventDate.getFullYear()}`
        label = eventDate.getFullYear().toString()
      }

      const existingGroup = groups.find(g => g.date === dateKey)
      if (existingGroup) {
        existingGroup.events.push(event)
      } else {
        groups.push({ date: dateKey, label, events: [event] })
      }
    })

    return groups
  }, [events, groupByDate])

  // Loading state
  if (loading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map(i => (
          <TimelineEventSkeleton key={i} />
        ))}
      </div>
    )
  }

  // Empty state
  if (events.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className={className}
      />
    )
  }

  return (
    <div className={cn("relative", className)}>
      {groupedEvents.map((group, groupIndex) => (
        <div key={group.date || groupIndex}>
          {/* Group header */}
          {groupByDate && group.label && (
            <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm py-2 mb-4">
              <h3 className="text-sm font-semibold text-slate-700 pl-10">
                {group.label}
              </h3>
            </div>
          )}

          {/* Events in group */}
          <div className="space-y-0">
            {group.events.map((event, index) => (
              <TimelineEvent
                key={event.id}
                event={event}
                isExpanded={expandedIds.has(event.id)}
                onToggle={() => toggleExpanded(event.id)}
                showCategory={showCategory}
                className={cn(
                  "animate-fade-in-up",
                  // Stagger animation delay
                  index === 0 && "animation-delay-0",
                  index === 1 && "animation-delay-75",
                  index === 2 && "animation-delay-150"
                )}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Load more button */}
      {hasMore && onLoadMore && (
        <div className="pt-4 pl-10">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="w-full"
          >
            {loadingMore ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-2" />
                Load More Events
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  )
}

// ============================================
// Timeline Event Skeleton
// ============================================

function TimelineEventSkeleton() {
  return (
    <div className="relative pl-10 pb-8 animate-pulse">
      {/* Timeline connector */}
      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200" />

      {/* Icon placeholder */}
      <div className="absolute left-0 top-0">
        <div className="w-8 h-8 rounded-full bg-slate-200" />
      </div>

      {/* Card placeholder */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-16 h-4 bg-slate-200 rounded" />
          <div className="w-24 h-3 bg-slate-200 rounded" />
        </div>
        <div className="w-48 h-5 bg-slate-200 rounded mb-2" />
        <div className="w-full h-4 bg-slate-200 rounded" />
      </div>
    </div>
  )
}

// ============================================
// Mini Timeline (for sidebar/cards)
// ============================================

interface MiniTimelineProps {
  events: JourneyEvent[]
  maxEvents?: number
  onViewAll?: () => void
  className?: string
}

export function MiniTimeline({
  events,
  maxEvents = 5,
  onViewAll,
  className,
}: MiniTimelineProps) {
  const displayEvents = events.slice(0, maxEvents)
  const hasMore = events.length > maxEvents

  if (events.length === 0) {
    return (
      <p className="text-sm text-slate-500 text-center py-4">No recent events</p>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      {displayEvents.map(event => (
        <MiniTimelineEvent key={event.id} event={event} />
      ))}

      {hasMore && onViewAll && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs text-teal-600 hover:text-teal-700"
          onClick={onViewAll}
        >
          View all {events.length} events
        </Button>
      )}
    </div>
  )
}

// ============================================
// Mini Timeline Event
// ============================================

interface MiniTimelineEventProps {
  event: JourneyEvent
}

function MiniTimelineEvent({ event }: MiniTimelineEventProps) {
  const config = EVENT_CATEGORY_CONFIG[event.category]

  return (
    <div className="flex items-start gap-2 text-sm">
      <div
        className={cn(
          "w-2 h-2 rounded-full mt-1.5 shrink-0",
          config.bgClass.replace("100", "500")
        )}
      />
      <div className="flex-1 min-w-0">
        <p className="text-slate-700 truncate">{event.title}</p>
        <p className="text-xs text-slate-500">
          {new Date(event.timestamp).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </p>
      </div>
      {event.amount !== undefined && event.amount > 0 && (
        <span
          className={cn(
            "text-xs font-medium shrink-0",
            event.amount_type === "credit" ? "text-emerald-600" : "text-slate-600"
          )}
        >
          {event.amount_type === "credit" ? "+" : ""}
          {(event.amount / 1000).toFixed(0)}K
        </span>
      )}
    </div>
  )
}

// Import EVENT_CATEGORY_CONFIG for MiniTimelineEvent
import { EVENT_CATEGORY_CONFIG } from "@/types/journey.types"

export default Timeline
