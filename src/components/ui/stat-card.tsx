"use client"

/**
 * Stats Display System — Decision Tree
 *
 * The codebase has 4 stats components. Choose based on context:
 *
 * ┌─ List page header KPIs?
 * │  → MetricsBar (metrics-bar.tsx)
 * │    Horizontal strip, auto-filters on click, used by ListPageTemplate
 * │
 * ├─ Detail page info cards?
 * │  → InfoCard (detail-components.tsx)
 * │    Colored border variants (success/warning/error), optional link
 * │
 * ├─ Need semantic color variants (success/warning/error) or size control?
 * │  → QuickStatsGrid (quick-stats-grid.tsx)
 * │    Also exports InlineStats (horizontal, no cards) and SummaryCard (large with breakdown)
 * │
 * └─ Default: simple icon + label + value grid
 *    → StatCard / StatsGrid (this file)
 *      Named color palette (blue/green/red/amber/purple/teal/orange/rose/slate)
 *      Also exports StatItem (inline, no card wrapper)
 */

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { GRID_COLUMN_CLASSES } from "@/components/ui/responsive-grid"

// ============================================================================
// COLOR SYSTEM
// ============================================================================

export type StatColorVariant =
  | "blue"
  | "green"
  | "red"
  | "amber"
  | "purple"
  | "teal"
  | "orange"
  | "rose"
  | "slate"

/**
 * UI-007: Unified color classes for stat cards.
 * Uses consistent color naming aligned with status-badge.tsx:
 * - blue -> sky (matches info)
 * - green -> emerald (matches success)
 * - purple -> violet (matches purple semantic)
 * - red -> rose (matches error)
 */
const colorClasses: Record<StatColorVariant, { bg: string; text: string }> = {
  blue: { bg: "bg-sky-100", text: "text-sky-600" },
  green: { bg: "bg-emerald-100", text: "text-emerald-600" },
  red: { bg: "bg-rose-100", text: "text-rose-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-violet-100", text: "text-violet-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-600" },
}

/** Resolve icon colors from either a named variant or custom bg/iconColor strings */
function resolveColors(props: {
  color?: StatColorVariant
  bgColor?: string
  iconColor?: string
}): { bg: string; text: string } {
  if (props.bgColor && props.iconColor) {
    return { bg: props.bgColor, text: props.iconColor }
  }
  return colorClasses[props.color || "blue"]
}

// ============================================================================
// STAT CARD
// ============================================================================

export interface StatCardProps {
  /** Icon to display */
  icon: LucideIcon
  /** Label/title for the stat */
  label: string
  /** Value to display */
  value: React.ReactNode
  /** Named color variant (use this OR bgColor+iconColor) */
  color?: StatColorVariant
  /** Custom Tailwind bg class for the icon container, e.g. "bg-primary/10" */
  bgColor?: string
  /** Custom Tailwind text color class for the icon, e.g. "text-primary" */
  iconColor?: string
  /** Additional className for the card */
  className?: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Click handler */
  onClick?: () => void
}

/**
 * Unified stat card component.
 *
 * Supports two color modes:
 * 1. Named variant: `color="green"` (maps to predefined bg/text classes)
 * 2. Custom colors: `bgColor="bg-emerald-50" iconColor="text-emerald-600"`
 *
 * @example
 * // Named color
 * <StatCard icon={Users} label="Total" value={42} color="blue" />
 *
 * // Custom colors (portal style)
 * <StatCard icon={Users} label="Total" value={42} bgColor="bg-primary/10" iconColor="text-primary" />
 */
export function StatCard({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  iconColor,
  className,
  subtitle,
  onClick,
}: StatCardProps) {
  const colors = resolveColors({ color, bgColor, iconColor })

  return (
    <Card
      className={cn(
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// STAT ITEM (inline, no card wrapper)
// ============================================================================

export interface StatItemProps {
  icon: LucideIcon
  label: string
  value: React.ReactNode
  color?: StatColorVariant
  bgColor?: string
  iconColor?: string
  className?: string
}

/** Inline stat without card wrapper - for use inside existing cards */
export function StatItem({
  icon: Icon,
  label,
  value,
  color,
  bgColor,
  iconColor,
  className,
}: StatItemProps) {
  const colors = resolveColors({ color, bgColor, iconColor })

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <Icon className={cn("h-5 w-5", colors.text)} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}

// ============================================================================
// STATS GRID (consistent grid layout for stat cards)
// ============================================================================

export interface StatsGridProps {
  /** StatCard items to render in the grid */
  stats: StatCardProps[]
  /** Number of columns at md breakpoint (default: 4) */
  columns?: 2 | 3 | 4
  /** Additional CSS classes */
  className?: string
}

/**
 * Grid wrapper for rendering multiple StatCards in a responsive layout.
 *
 * @example
 * <StatsGrid
 *   stats={[
 *     { icon: Users, label: "Total", value: 42, color: "blue" },
 *     { icon: Check, label: "Active", value: 38, color: "green" },
 *   ]}
 * />
 */
export function StatsGrid({ stats, columns = 4, className }: StatsGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLUMN_CLASSES[columns], className)}>
      {stats.map((stat, index) => (
        <StatCard key={index} {...stat} />
      ))}
    </div>
  )
}
