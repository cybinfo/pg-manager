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

/**
 * MasonryGrid - Auto-balancing layout using CSS columns
 *
 * Uses CSS multi-column layout for automatic height balancing.
 * Items are distributed across columns to minimize empty space.
 *
 * Benefits:
 * - Best browser support
 * - Auto-balances without JavaScript
 * - Simple implementation
 * - `break-inside: avoid` keeps sections intact
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
  const columnStyles = {
    1: "columns-1",
    2: "columns-1 md:columns-2",
    3: "columns-1 md:columns-2 lg:columns-3",
  }

  return (
    <div
      className={cn(
        columnStyles[columns],
        gapStyles[gap],
        // Each child gets break-inside: avoid to stay intact
        "[&>*]:break-inside-avoid",
        "[&>*]:mb-6",
        // Inline-block ensures proper column flow
        "[&>*]:inline-block",
        "[&>*]:w-full",
        className
      )}
    >
      {children}
    </div>
  )
}
