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
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
  muted: "bg-muted-foreground",
  primary: "bg-primary",
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
    icon: "text-success",
    value: "text-success",
  },
  warning: {
    icon: "text-warning",
    value: "text-warning",
  },
  error: {
    icon: "text-destructive",
    value: "text-destructive",
  },
  info: {
    icon: "text-info",
    value: "text-info",
  },
  muted: {
    icon: "text-muted-foreground",
    value: "text-muted-foreground",
  },
}
