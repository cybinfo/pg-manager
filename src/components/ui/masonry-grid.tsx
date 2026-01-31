"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MasonryGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  gap?: "sm" | "md" | "lg"
  className?: string
}

const gapStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
}

const gridStyles = {
  1: "grid-cols-1",
  2: "grid-cols-1 md:grid-cols-2",
  3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
}

/**
 * MasonryGrid - Responsive grid layout with natural section sizing
 *
 * Uses CSS Grid with `items-start` alignment so sections naturally size
 * to their content while maintaining consistent left-to-right ordering.
 * This creates a clean 2-column layout without vertical imbalance.
 *
 * @example
 * ```tsx
 * <MasonryGrid columns={2}>
 *   <DetailSection title="Section 1">...</DetailSection>
 *   <DetailSection title="Section 2">...</DetailSection>
 *   <DetailSection title="Section 3">...</DetailSection>
 * </MasonryGrid>
 * ```
 */
export function MasonryGrid({
  children,
  columns = 2,
  gap = "md",
  className,
}: MasonryGridProps) {
  return (
    <div
      className={cn(
        "grid",
        gridStyles[columns],
        gapStyles[gap],
        // items-start: each section sizes to its content, no stretch
        "items-start",
        className
      )}
    >
      {children}
    </div>
  )
}
