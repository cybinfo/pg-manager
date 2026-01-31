"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MasonryGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3
  gap?: "sm" | "md" | "lg"
  className?: string
}

const columnStyles = {
  1: "columns-1",
  2: "columns-1 md:columns-2",
  3: "columns-1 md:columns-2 lg:columns-3",
}

const gapStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
}

/**
 * MasonryGrid - True masonry layout using CSS columns
 *
 * Uses CSS multi-column layout for automatic gap-free stacking.
 * Sections flow top-to-bottom in each column, filling space efficiently.
 *
 * @example
 * ```tsx
 * <MasonryGrid columns={2}>
 *   <DetailSection title="Section 1">...</DetailSection>
 *   <DetailSection title="Section 2">...</DetailSection>
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
        columnStyles[columns],
        gapStyles[gap],
        // Prevent sections from breaking across columns
        "[&>*]:break-inside-avoid",
        // Add margin between items in column
        "[&>*]:mb-6",
        className
      )}
    >
      {children}
    </div>
  )
}
