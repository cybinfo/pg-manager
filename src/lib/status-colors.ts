/**
 * Shared Status Color Mappings
 *
 * Single source of truth for status dot/indicator colors.
 * Used by StatusBadge, StatusDot, and QuickStatsGrid components.
 *
 * Maps semantic status variants to Tailwind color classes.
 */

// ============================================================================
// STATUS DOT COLORS (small circular indicators)
// ============================================================================

/**
 * Dot colors for StatusDot and StatusBadge dot mode.
 * Maps status variant to background color class.
 */
export const STATUS_DOT_COLORS: Record<string, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  error: "bg-rose-500",
  info: "bg-sky-500",
  muted: "bg-slate-400",
  primary: "bg-teal-500",
  purple: "bg-violet-500",
}

// ============================================================================
// VARIANT STYLE CLASSES (for stat grids with semantic coloring)
// ============================================================================

export type StatVariant = "default" | "success" | "warning" | "error" | "info" | "muted"

/**
 * Icon and value text colors for stat cards with semantic variants.
 * Used by QuickStatsGrid and InlineStats.
 */
export const STAT_VARIANT_CLASSES: Record<StatVariant, { icon: string; value: string }> = {
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
