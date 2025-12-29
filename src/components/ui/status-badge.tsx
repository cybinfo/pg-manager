"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
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
        success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        warning: "bg-amber-50 text-amber-700 border border-amber-200",
        error: "bg-rose-50 text-rose-700 border border-rose-200",
        info: "bg-sky-50 text-sky-700 border border-sky-200",
        muted: "bg-slate-100 text-slate-600 border border-slate-200",
        primary: "bg-teal-50 text-teal-700 border border-teal-200",
        purple: "bg-violet-50 text-violet-700 border border-violet-200",
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

  // Room statuses
  available: { variant: "success", icon: CheckCircle2, label: "Available" },
  occupied: { variant: "primary", icon: Play, label: "Occupied" },
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

  const dotColors: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    info: "bg-sky-500",
    muted: "bg-slate-400",
    primary: "bg-teal-500",
    purple: "bg-violet-500",
  }

  return (
    <span
      className={cn(statusBadgeVariants({ variant: finalVariant, size, pulse }), className)}
      {...props}
    >
      {dot && (
        <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[finalVariant])} />
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
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    muted: "bg-slate-400",
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className={cn("h-2 w-2 rounded-full", colors[status])} />
      {label && <span className="text-sm">{label}</span>}
    </div>
  )
}
