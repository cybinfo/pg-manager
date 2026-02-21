"use client"

/**
 * QuickStatsGrid, InlineStats, and SummaryCard Components
 *
 * These are convenience wrappers around the unified StatCard/StatsGrid system
 * with additional variant-based color support and specialized layouts.
 *
 * - QuickStatsGrid: Grid of stat cards with variant colors + size options
 * - InlineStats: Horizontal inline stats with separators
 * - SummaryCard: Large card with optional breakdown rows
 *
 * For simple stat card grids, prefer using StatsGrid from stat-card.tsx directly.
 */

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

// ============================================================================
// TYPES
// ============================================================================

type StatVariant = "default" | "success" | "warning" | "error" | "info" | "muted"

interface StatItem {
  /** Stat label */
  label: string
  /** Stat value */
  value: React.ReactNode
  /** Optional icon */
  icon?: LucideIcon
  /** Color variant */
  variant?: StatVariant
  /** Optional sublabel/description */
  sublabel?: string
  /** Click handler */
  onClick?: () => void
}

interface QuickStatsGridProps {
  /** Array of stats to display */
  stats: StatItem[]
  /** Number of columns */
  columns?: 2 | 3 | 4
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

// ============================================================================
// VARIANT STYLES
// ============================================================================

const variantClasses: Record<StatVariant, { icon: string; value: string }> = {
  default: {
    icon: "text-muted-foreground",
    value: "text-foreground",
  },
  success: {
    icon: "text-green-500",
    value: "text-green-600",
  },
  warning: {
    icon: "text-yellow-500",
    value: "text-yellow-600",
  },
  error: {
    icon: "text-red-500",
    value: "text-red-600",
  },
  info: {
    icon: "text-blue-500",
    value: "text-blue-600",
  },
  muted: {
    icon: "text-muted-foreground",
    value: "text-muted-foreground",
  },
}

const sizeClasses = {
  sm: {
    icon: "h-4 w-4",
    label: "text-xs",
    value: "text-lg",
    padding: "p-3",
  },
  md: {
    icon: "h-5 w-5",
    label: "text-sm",
    value: "text-2xl",
    padding: "p-4",
  },
  lg: {
    icon: "h-6 w-6",
    label: "text-sm",
    value: "text-3xl",
    padding: "p-5",
  },
}

const columnClasses = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-4",
}

// ============================================================================
// QUICK STATS GRID
// ============================================================================

/**
 * Grid of stat cards with semantic variant colors and configurable sizes.
 *
 * Use this when you need semantic color variants (success/warning/error)
 * or size control. For simple icon+label+value cards, prefer StatsGrid.
 */
export function QuickStatsGrid({
  stats,
  columns = 4,
  className,
  size = "md",
}: QuickStatsGridProps) {
  const sizes = sizeClasses[size]

  return (
    <div className={cn("grid gap-4", columnClasses[columns], className)}>
      {stats.map((stat, index) => {
        const variant = stat.variant || "default"
        const variantStyle = variantClasses[variant]
        const Icon = stat.icon

        return (
          <Card
            key={index}
            className={cn(
              stat.onClick && "cursor-pointer hover:bg-muted/50 transition-colors"
            )}
            onClick={stat.onClick}
          >
            <CardContent className={cn(sizes.padding, "flex flex-col")}>
              <div className="flex items-center justify-between">
                <span className={cn("text-muted-foreground", sizes.label)}>
                  {stat.label}
                </span>
                {Icon && (
                  <Icon className={cn(sizes.icon, variantStyle.icon)} />
                )}
              </div>
              <span className={cn("font-bold mt-1", sizes.value, variantStyle.value)}>
                {stat.value}
              </span>
              {stat.sublabel && (
                <span className="text-xs text-muted-foreground mt-1">
                  {stat.sublabel}
                </span>
              )}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

// ============================================================================
// INLINE STATS
// ============================================================================

interface InlineStatsProps {
  stats: StatItem[]
  className?: string
  separator?: boolean
}

/**
 * Inline stats display (horizontal, no cards).
 * Good for compact stat summaries inside other cards/sections.
 */
export function InlineStats({ stats, className, separator = true }: InlineStatsProps) {
  return (
    <div className={cn("flex items-center gap-6", className)}>
      {stats.map((stat, index) => {
        const variant = stat.variant || "default"
        const variantStyle = variantClasses[variant]

        return (
          <div
            key={index}
            className={cn(
              "flex flex-col",
              separator && index !== stats.length - 1 && "pr-6 border-r"
            )}
          >
            <span className="text-xs text-muted-foreground">{stat.label}</span>
            <span className={cn("font-semibold", variantStyle.value)}>
              {stat.value}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ============================================================================
// SUMMARY CARD
// ============================================================================

interface SummaryCardProps {
  /** Card title */
  title: string
  /** Main value */
  value: React.ReactNode
  /** Optional sublabel */
  sublabel?: string
  /** Icon */
  icon?: LucideIcon
  /** Variant */
  variant?: StatVariant
  /** Additional stats below */
  stats?: Array<{ label: string; value: React.ReactNode }>
  /** Click handler */
  onClick?: () => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Larger summary card with optional breakdown rows.
 * Good for report overview cards that show a main value + supporting stats.
 */
export function SummaryCard({
  title,
  value,
  sublabel,
  icon: Icon,
  variant = "default",
  stats,
  onClick,
  className,
}: SummaryCardProps) {
  const variantStyle = variantClasses[variant]

  return (
    <Card
      className={cn(
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-bold mt-1", variantStyle.value)}>
              {value}
            </p>
            {sublabel && (
              <p className="text-xs text-muted-foreground mt-1">{sublabel}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("p-3 rounded-lg bg-muted/50", variantStyle.icon)}>
              <Icon className="h-6 w-6" />
            </div>
          )}
        </div>

        {stats && stats.length > 0 && (
          <div className="pt-4 border-t space-y-2">
            {stats.map((stat, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{stat.label}</span>
                <span className="font-medium">{stat.value}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
