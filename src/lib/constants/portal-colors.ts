/**
 * Portal Stat Color Constants
 *
 * Semantic color mappings for StatCard/StatsGrid components used in
 * tenant and member portal pages. Eliminates inline bgColor/iconColor duplication.
 */
export const PORTAL_STAT_COLORS = {
  /** Primary/default color - room, library name */
  primary: { bgColor: "bg-primary/10", iconColor: "text-primary" },
  /** Monetary amounts paid / success states */
  paid: { bgColor: "bg-success/10", iconColor: "text-success" },
  /** Time-based metrics - days stayed, calendar */
  time: { bgColor: "bg-info/10", iconColor: "text-info" },
  /** Financial totals, credit-related */
  financial: { bgColor: "bg-violet-50 dark:bg-violet-950", iconColor: "text-violet-600" },
  /** Library / study metrics */
  library: { bgColor: "bg-purple-50 dark:bg-purple-950", iconColor: "text-purple-600" },
  /** Warnings, complaints, amber indicators */
  warning: { bgColor: "bg-warning/10", iconColor: "text-warning" },
  /** Overdue, danger states */
  danger: { bgColor: "bg-destructive/10", iconColor: "text-destructive" },
} as const

export type PortalStatColorKey = keyof typeof PORTAL_STAT_COLORS
