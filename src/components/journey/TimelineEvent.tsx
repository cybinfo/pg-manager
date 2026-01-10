"use client"

import { useState } from "react"
import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { JourneyEvent, EVENT_CATEGORY_CONFIG } from "@/types/journey.types"
import { EventIcon, CategoryBadge, StatusDot } from "./EventIcon"

// ============================================
// Timeline Event Component
// ============================================

interface TimelineEventProps {
  event: JourneyEvent
  isExpanded?: boolean
  onToggle?: () => void
  showCategory?: boolean
  className?: string
}

export function TimelineEvent({
  event,
  isExpanded = false,
  onToggle,
  showCategory = true,
  className,
}: TimelineEventProps) {
  const [localExpanded, setLocalExpanded] = useState(isExpanded)
  const expanded = onToggle ? isExpanded : localExpanded
  const handleToggle = onToggle || (() => setLocalExpanded(!localExpanded))

  const hasDetails = event.metadata && Object.keys(event.metadata).length > 0
  const hasQuickActions = event.quick_actions && event.quick_actions.length > 0

  return (
    <div
      className={cn(
        "relative pl-10 pb-8 last:pb-0 group",
        className
      )}
    >
      {/* Timeline connector line */}
      <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-slate-200 group-last:hidden" />

      {/* Event icon */}
      <div className="absolute left-0 top-0">
        <EventIcon category={event.category} icon={event.icon} size="md" />
      </div>

      {/* Event card */}
      <div
        className={cn(
          "bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden",
          "transition-all duration-200 hover:shadow-md",
          expanded && "ring-1 ring-teal-200"
        )}
      >
        {/* Event header */}
        <div
          className={cn(
            "px-4 py-3 cursor-pointer",
            hasDetails && "hover:bg-slate-50"
          )}
          onClick={hasDetails ? handleToggle : undefined}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Category and timestamp */}
              <div className="flex items-center gap-2 mb-1">
                {showCategory && (
                  <CategoryBadge category={event.category} size="sm" showIcon={false} />
                )}
                <span className="text-xs text-slate-500">
                  {formatEventTime(event.timestamp)}
                </span>
                {event.status && event.status_color && (
                  <StatusDot color={event.status_color} size="sm" />
                )}
              </div>

              {/* Title */}
              <h4 className="font-medium text-slate-900 truncate">
                {event.title}
              </h4>

              {/* Description */}
              <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                {event.description}
              </p>

              {/* Amount badge */}
              {event.amount !== undefined && event.amount > 0 && (
                <div className="mt-2">
                  <AmountBadge
                    amount={event.amount}
                    type={event.amount_type || "neutral"}
                  />
                </div>
              )}
            </div>

            {/* Expand/collapse button */}
            {hasDetails && (
              <Button variant="ghost" size="sm" className="shrink-0 -mr-2 -mt-1">
                {expanded ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </Button>
            )}
          </div>
        </div>

        {/* Expanded details */}
        {expanded && hasDetails && (
          <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
            <EventDetails metadata={event.metadata!} />
          </div>
        )}

        {/* Quick actions */}
        {hasQuickActions && (
          <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
            {event.quick_actions!.map(action => (
              <QuickActionButton key={action.id} action={action} />
            ))}
            {event.action_url && (
              <Link href={event.action_url}>
                <Button variant="ghost" size="sm" className="text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  View Details
                </Button>
              </Link>
            )}
          </div>
        )}

        {/* View details link (if no quick actions but has action_url) */}
        {!hasQuickActions && event.action_url && (
          <div className="px-4 py-2 border-t border-slate-100">
            <Link href={event.action_url}>
              <Button variant="ghost" size="sm" className="text-xs text-teal-600 hover:text-teal-700 p-0 h-auto">
                View Details
                <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Amount Badge
// ============================================

interface AmountBadgeProps {
  amount: number
  type: "credit" | "debit" | "neutral"
}

function AmountBadge({ amount, type }: AmountBadgeProps) {
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)

  const colorClasses = {
    credit: "bg-emerald-100 text-emerald-700",
    debit: "bg-rose-100 text-rose-700",
    neutral: "bg-slate-100 text-slate-700",
  }

  const prefix = type === "credit" ? "+" : type === "debit" ? "" : ""

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        colorClasses[type]
      )}
    >
      {prefix}{formatted}
    </span>
  )
}

// ============================================
// Event Details
// ============================================

interface EventDetailsProps {
  metadata: Record<string, unknown>
}

function EventDetails({ metadata }: EventDetailsProps) {
  const formatValue = (key: string, value: unknown): string => {
    if (value === null || value === undefined) return "-"
    if (typeof value === "boolean") return value ? "Yes" : "No"
    if (typeof value === "number") {
      if (key.includes("amount") || key.includes("rent") || key.includes("deposit") || key.includes("fee")) {
        return new Intl.NumberFormat("en-IN", {
          style: "currency",
          currency: "INR",
          maximumFractionDigits: 0,
        }).format(value)
      }
      return value.toString()
    }
    if (typeof value === "string") {
      // Check if it's a date
      if (key.includes("date") || key.includes("_at")) {
        try {
          const date = new Date(value)
          if (!isNaN(date.getTime())) {
            return date.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })
          }
        } catch {
          // Not a date, return as is
        }
      }
      return value
    }
    if (Array.isArray(value)) {
      return `${value.length} items`
    }
    if (typeof value === "object") {
      return JSON.stringify(value)
    }
    return String(value)
  }

  const formatLabel = (key: string): string => {
    return key
      .replace(/_/g, " ")
      .replace(/\b\w/g, l => l.toUpperCase())
  }

  // Filter out internal fields
  const displayFields = Object.entries(metadata).filter(
    ([key]) => !key.startsWith("_") && key !== "line_items"
  )

  if (displayFields.length === 0) return null

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
      {displayFields.map(([key, value]) => (
        <div key={key}>
          <dt className="text-slate-500 text-xs">{formatLabel(key)}</dt>
          <dd className="text-slate-900 font-medium truncate">
            {formatValue(key, value)}
          </dd>
        </div>
      ))}
    </dl>
  )
}

// ============================================
// Quick Action Button
// ============================================

import { QuickAction } from "@/types/journey.types"

interface QuickActionButtonProps {
  action: QuickAction
}

function QuickActionButton({ action }: QuickActionButtonProps) {
  const button = (
    <Button
      variant={action.variant === "gradient" ? "default" : "outline"}
      size="sm"
      className={cn(
        "text-xs",
        action.variant === "gradient" && "bg-gradient-to-r from-teal-500 to-cyan-500"
      )}
    >
      {action.label}
    </Button>
  )

  if (action.href) {
    return <Link href={action.href}>{button}</Link>
  }

  return button
}

// ============================================
// Helper Functions
// ============================================

function formatEventTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 1) {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  if (diffDays < 7) {
    return `${formatDistanceToNow(date, { addSuffix: true })} • ${date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    })}`
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  })
}

// ============================================
// Compact Timeline Event (for lists)
// ============================================

interface CompactTimelineEventProps {
  event: JourneyEvent
  onClick?: () => void
  className?: string
}

export function CompactTimelineEvent({ event, onClick, className }: CompactTimelineEventProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors",
        className
      )}
      onClick={onClick}
    >
      <EventIcon category={event.category} icon={event.icon} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
        <p className="text-xs text-slate-500 truncate">{event.description}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-slate-500">{formatEventTime(event.timestamp)}</p>
        {event.amount !== undefined && event.amount > 0 && (
          <p
            className={cn(
              "text-xs font-medium",
              event.amount_type === "credit" ? "text-emerald-600" : "text-slate-600"
            )}
          >
            {event.amount_type === "credit" ? "+" : ""}
            {new Intl.NumberFormat("en-IN", {
              style: "currency",
              currency: "INR",
              maximumFractionDigits: 0,
            }).format(event.amount)}
          </p>
        )}
      </div>
    </div>
  )
}

export default TimelineEvent
