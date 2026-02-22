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
  paid: { bgColor: "bg-emerald-50 dark:bg-emerald-950", iconColor: "text-emerald-600" },
  /** Time-based metrics - days stayed, calendar */
  time: { bgColor: "bg-sky-50 dark:bg-sky-950", iconColor: "text-sky-600" },
  /** Financial totals, credit-related */
  financial: { bgColor: "bg-violet-50 dark:bg-violet-950", iconColor: "text-violet-600" },
  /** Library / study metrics */
  library: { bgColor: "bg-purple-50 dark:bg-purple-950", iconColor: "text-purple-600" },
  /** Warnings, complaints, amber indicators */
  warning: { bgColor: "bg-amber-50 dark:bg-amber-950", iconColor: "text-amber-600" },
  /** Overdue, danger states */
  danger: { bgColor: "bg-rose-50 dark:bg-rose-950", iconColor: "text-rose-600" },
} as const

export type PortalStatColorKey = keyof typeof PORTAL_STAT_COLORS
