"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MasonryGrid } from "./masonry-grid"

interface DetailPageContentProps {
  children: React.ReactNode
  /**
   * Layout mode:
   * - "grid": Traditional CSS grid (default, backwards compatible)
   * - "masonry": CSS columns for auto-balancing
   */
  layout?: "grid" | "masonry"
  /**
   * Number of columns (1, 2, or 3)
   * Default: 2
   */
  columns?: 1 | 2 | 3
  /**
   * Gap between items
   * Default: "md"
   */
  gap?: "sm" | "md" | "lg"
  className?: string
}

const gapStyles = {
  sm: "gap-4",
  md: "gap-6",
  lg: "gap-8",
}

/**
 * DetailPageContent - Wrapper for detail page content sections
 *
 * Provides backwards-compatible layout wrapper that can use either
 * traditional CSS grid or CSS columns (masonry) layout.
 *
 * @example
 * ```tsx
 * // Traditional grid (default)
 * <DetailPageContent>
 *   <DetailSection>...</DetailSection>
 *   <DetailSection>...</DetailSection>
 * </DetailPageContent>
 *
 * // Auto-balancing masonry layout
 * <DetailPageContent layout="masonry">
 *   <DetailSection>...</DetailSection>
 *   <DetailSection>...</DetailSection>
 * </DetailPageContent>
 * ```
 */
export function DetailPageContent({
  children,
  layout = "grid",
  columns = 2,
  gap = "md",
  className,
}: DetailPageContentProps) {
  if (layout === "masonry") {
    return (
      <MasonryGrid columns={columns} gap={gap} className={className}>
        {children}
      </MasonryGrid>
    )
  }

  // Default: CSS Grid layout (backwards compatible)
  const gridStyles = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
  }

  return (
    <div
      className={cn(
        "grid",
        gridStyles[columns],
        gapStyles[gap],
        className
      )}
    >
      {children}
    </div>
  )
}
