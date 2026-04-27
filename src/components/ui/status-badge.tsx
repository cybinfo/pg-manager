"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { STATUS_DOT_COLORS } from "@/lib/status-colors"
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  AlertTriangle,
  Ban,
  Pause,
  Play,
  LucideIcon
} from "lucide-react"

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200",
  {
    variants: {
      variant: {
        success: "bg-success/10 text-success border border-success/20",
        warning: "bg-warning/10 text-warning border border-warning/20",
        error: "bg-destructive/10 text-destructive border border-destructive/20",
        info: "bg-info/10 text-info border border-info/20",
        muted: "bg-muted text-muted-foreground border border-border",
        primary: "bg-primary/10 text-primary border border-primary/20",
        purple: "bg-violet-50 dark:bg-violet-950 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800",
      },
      size: {
        sm: "px-2 py-0.5 text-[10px]",
        default: "px-2.5 py-1 text-xs",
        lg: "px-3 py-1.5 text-sm",
      },
      pulse: {
        true: "animate-pulse",
        false: "",
      }
    },
    defaultVariants: {
      variant: "muted",
      size: "default",
      pulse: false,
    },
  }
)

// Pre-defined status configurations
const statusConfig: Record<string, { variant: "success" | "warning" | "error" | "info" | "muted" | "primary" | "purple"; icon: LucideIcon; label: string }> = {
  // Tenant statuses
  active: { variant: "success", icon: CheckCircle2, label: "Active" },
  inactive: { variant: "muted", icon: Pause, label: "Inactive" },
  moved_out: { variant: "muted", icon: XCircle, label: "Moved Out" },
  notice_period: { variant: "warning", icon: Clock, label: "Notice Period" },

  // Payment/Bill statuses
  paid: { variant: "success", icon: CheckCircle2, label: "Paid" },
  pending: { variant: "warning", icon: Clock, label: "Pending" },
  partial: { variant: "info", icon: AlertCircle, label: "Partial" },
  overdue: { variant: "error", icon: AlertTriangle, label: "Overdue" },

  // Complaint statuses
  open: { variant: "error", icon: AlertCircle, label: "Open" },
  acknowledged: { variant: "warning", icon: Clock, label: "Acknowledged" },
  in_progress: { variant: "info", icon: Loader2, label: "In Progress" },
  resolved: { variant: "success", icon: CheckCircle2, label: "Resolved" },
  closed: { variant: "muted", icon: XCircle, label: "Closed" },

  // Priority levels
  low: { variant: "muted", icon: CheckCircle2, label: "Low" },
  medium: { variant: "info", icon: AlertCircle, label: "Medium" },
  high: { variant: "warning", icon: AlertTriangle, label: "High" },
  urgent: { variant: "error", icon: AlertCircle, label: "Urgent" },

  // Generic
  enabled: { variant: "success", icon: CheckCircle2, label: "Enabled" },
  disabled: { variant: "muted", icon: Ban, label: "Disabled" },
  verified: { variant: "success", icon: CheckCircle2, label: "Verified" },
  unverified: { variant: "warning", icon: Clock, label: "Unverified" },

  // Room statuses (UI-007: Added partially_occupied)
  available: { variant: "success", icon: CheckCircle2, label: "Available" },
  occupied: { variant: "primary", icon: Play, label: "Occupied" },
  partially_occupied: { variant: "info", icon: AlertCircle, label: "Partially Occupied" },
  maintenance: { variant: "warning", icon: AlertTriangle, label: "Maintenance" },
}

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  status?: keyof typeof statusConfig
  label?: string
  icon?: LucideIcon
  showIcon?: boolean
  dot?: boolean
}

export function StatusBadge({
  className,
  variant,
  size,
  pulse,
  status,
  label,
  icon: CustomIcon,
  showIcon = true,
  dot = false,
  children,
  ...props
}: StatusBadgeProps) {
  // Get config from status if provided
  const config = status ? statusConfig[status] : null
  const finalVariant = variant || config?.variant || "muted"
  const Icon = CustomIcon || config?.icon
  const displayLabel = label || config?.label || children

  return (
    <span
      className={cn(statusBadgeVariants({ variant: finalVariant, size, pulse }), className)}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT_COLORS[finalVariant])} />
      )}
      {showIcon && Icon && !dot && (
        <Icon className={cn("h-3 w-3", status === "in_progress" && "animate-spin")} />
      )}
      {displayLabel}
    </span>
  )
}

// Priority badge variant
export function PriorityBadge({
  priority,
  className
}: {
  priority: "low" | "medium" | "high" | "urgent"
  className?: string
}) {
  return <StatusBadge status={priority} className={className} />
}

// Simple dot indicator for tables (more compact)
export function StatusIndicator({
  status,
  label,
  className
}: {
  status: "success" | "warning" | "error" | "muted"
  label?: string
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full", STATUS_DOT_COLORS[status])} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
