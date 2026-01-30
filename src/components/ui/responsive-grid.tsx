"use client"

/**
 * ResponsiveGrid Component
 *
 * Consistent responsive grid patterns with preset configurations.
 * Eliminates duplicate grid class strings across the codebase.
 *
 * @example
 * // Using presets
 * <ResponsiveGrid preset="metrics">
 *   <StatCard />
 *   <StatCard />
 * </ResponsiveGrid>
 *
 * // Custom columns
 * <ResponsiveGrid cols={{ sm: 1, md: 2, lg: 3 }}>
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 */

import { cn } from "@/lib/utils"

type BreakpointCols = {
  base?: 1 | 2 | 3 | 4 | 5 | 6
  sm?: 1 | 2 | 3 | 4 | 5 | 6
  md?: 1 | 2 | 3 | 4 | 5 | 6
  lg?: 1 | 2 | 3 | 4 | 5 | 6
  xl?: 1 | 2 | 3 | 4 | 5 | 6
}

type GridPreset =
  | "metrics" // 2 -> 3 -> 4 columns
  | "cards" // 1 -> 2 -> 3 columns
  | "form" // 1 -> 2 columns
  | "stats" // 2 -> 4 columns
  | "gallery" // 2 -> 3 -> 4 -> 5 columns

type GapSize = "none" | "sm" | "md" | "lg"

interface ResponsiveGridProps {
  /** Grid children */
  children: React.ReactNode
  /** Preset configuration */
  preset?: GridPreset
  /** Custom column configuration (overrides preset) */
  cols?: BreakpointCols
  /** Gap size */
  gap?: GapSize
  /** Additional CSS classes */
  className?: string
}

const presetConfigs: Record<GridPreset, string> = {
  metrics: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
  cards: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  form: "grid-cols-1 md:grid-cols-2",
  stats: "grid-cols-2 lg:grid-cols-4",
  gallery: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
}

const gapClasses: Record<GapSize, string> = {
  none: "gap-0",
  sm: "gap-2",
  md: "gap-4",
  lg: "gap-6",
}

const colsToClass = (cols: number, prefix: string = "") => {
  const classMap: Record<number, string> = {
    1: `${prefix}grid-cols-1`,
    2: `${prefix}grid-cols-2`,
    3: `${prefix}grid-cols-3`,
    4: `${prefix}grid-cols-4`,
    5: `${prefix}grid-cols-5`,
    6: `${prefix}grid-cols-6`,
  }
  return classMap[cols] || ""
}

export function ResponsiveGrid({
  children,
  preset,
  cols,
  gap = "md",
  className,
}: ResponsiveGridProps) {
  let gridClasses = ""

  if (cols) {
    // Build custom column classes
    const classes: string[] = []
    if (cols.base) classes.push(colsToClass(cols.base))
    if (cols.sm) classes.push(colsToClass(cols.sm, "sm:"))
    if (cols.md) classes.push(colsToClass(cols.md, "md:"))
    if (cols.lg) classes.push(colsToClass(cols.lg, "lg:"))
    if (cols.xl) classes.push(colsToClass(cols.xl, "xl:"))
    gridClasses = classes.join(" ")
  } else if (preset) {
    gridClasses = presetConfigs[preset]
  } else {
    // Default to cards preset
    gridClasses = presetConfigs.cards
  }

  return (
    <div className={cn("grid", gridClasses, gapClasses[gap], className)}>
      {children}
    </div>
  )
}

/**
 * GridItem Component
 *
 * Optional wrapper for grid items that need special spanning.
 *
 * @example
 * <ResponsiveGrid preset="form">
 *   <GridItem span="full">Full width field</GridItem>
 *   <Input />
 *   <Input />
 * </ResponsiveGrid>
 */
interface GridItemProps {
  children: React.ReactNode
  /** Column span */
  span?: "full" | 2 | 3 | 4
  /** Additional CSS classes */
  className?: string
}

const spanClasses: Record<string, string> = {
  full: "col-span-full",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
}

export function GridItem({ children, span, className }: GridItemProps) {
  return (
    <div className={cn(span && spanClasses[span.toString()], className)}>
      {children}
    </div>
  )
}
