"use client"

import {
  UserPlus,
  CreditCard,
  FileText,
  ArrowRightLeft,
  AlertCircle,
  LogOut,
  Users,
  FileCheck,
  MessageSquare,
  Settings,
  CheckCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Gauge,
  Bell,
  LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { EventCategoryType, EVENT_CATEGORY_CONFIG } from "@/types/journey.types"

// ============================================
// Icon Mapping
// ============================================

const ICON_MAP: Record<string, LucideIcon> = {
  UserPlus,
  CreditCard,
  FileText,
  ArrowRightLeft,
  AlertCircle,
  LogOut,
  Users,
  FileCheck,
  MessageSquare,
  Settings,
  CheckCircle,
  CheckCircle2,
  RotateCcw,
  AlertTriangle,
  Gauge,
  Bell,
}

// ============================================
// Event Icon Component
// ============================================

interface EventIconProps {
  category: EventCategoryType
  icon?: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function EventIcon({ category, icon, size = "md", className }: EventIconProps) {
  const config = EVENT_CATEGORY_CONFIG[category]
  const iconName = icon || config.icon
  const IconComponent = ICON_MAP[iconName] || Settings

  const sizeClasses = {
    sm: "w-6 h-6 p-1",
    md: "w-8 h-8 p-1.5",
    lg: "w-10 h-10 p-2",
  }

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  }

  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center shadow-sm",
        config.bgClass,
        config.textClass,
        sizeClasses[size],
        className
      )}
    >
      <IconComponent className={iconSizes[size]} />
    </div>
  )
}

// ============================================
// Category Badge Component
// ============================================

interface CategoryBadgeProps {
  category: EventCategoryType
  showIcon?: boolean
  size?: "sm" | "md"
  className?: string
}

export function CategoryBadge({ category, showIcon = true, size = "sm", className }: CategoryBadgeProps) {
  const config = EVENT_CATEGORY_CONFIG[category]
  const IconComponent = ICON_MAP[config.icon] || Settings

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium",
        config.bgClass,
        config.textClass,
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
    >
      {showIcon && <IconComponent className={size === "sm" ? "w-3 h-3" : "w-4 h-4"} />}
      {config.label}
    </span>
  )
}

// ============================================
// Status Color Dot
// ============================================

interface StatusDotProps {
  color: "success" | "warning" | "error" | "info" | "primary" | "muted"
  size?: "sm" | "md"
  pulse?: boolean
  className?: string
}

export function StatusDot({ color, size = "sm", pulse = false, className }: StatusDotProps) {
  const colorClasses = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    info: "bg-sky-500",
    primary: "bg-teal-500",
    muted: "bg-slate-400",
  }

  const sizeClasses = {
    sm: "w-2 h-2",
    md: "w-3 h-3",
  }

  return (
    <span className={cn("relative flex", sizeClasses[size], className)}>
      {pulse && (
        <span
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
            colorClasses[color]
          )}
        />
      )}
      <span className={cn("relative inline-flex rounded-full", colorClasses[color], sizeClasses[size])} />
    </span>
  )
}

export default EventIcon
