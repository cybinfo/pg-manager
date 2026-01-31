"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { MasonryGrid } from "./masonry-grid"
import { DraggableGrid, GridItem } from "./draggable-grid"

interface DetailPageContentProps {
  children: React.ReactNode
  /**
   * Layout mode:
   * - "grid": Traditional CSS grid (default, backwards compatible)
   * - "masonry": CSS columns for auto-balancing
   * - "draggable": Drag-and-drop grid with user customization
   */
  layout?: "grid" | "masonry" | "draggable"
  /**
   * Unique key for storing layout preferences (required for draggable mode)
   * e.g., "tenant-detail", "property-detail"
   */
  layoutKey?: string
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
  /**
   * Whether to show the customize button (draggable mode only)
   * Default: true
   */
  editable?: boolean
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
 * Provides multiple layout modes:
 * - "grid": Traditional CSS grid (predictable, gaps possible)
 * - "masonry": CSS columns for auto-balancing (fills gaps, vertical ordering)
 * - "draggable": Drag-and-drop grid with user customization (most flexible)
 *
 * @example
 * ```tsx
 * // Traditional grid (default)
 * <DetailPageContent>
 *   <DetailSection>...</DetailSection>
 * </DetailPageContent>
 *
 * // Draggable layout with customization
 * <DetailPageContent layout="draggable" layoutKey="tenant-detail">
 *   <GridItem id="room-details" defaultHeight={3}>
 *     <DetailSection>...</DetailSection>
 *   </GridItem>
 * </DetailPageContent>
 * ```
 */
export function DetailPageContent({
  children,
  layout = "grid",
  layoutKey,
  columns = 2,
  gap = "md",
  editable = true,
  className,
}: DetailPageContentProps) {
  if (layout === "draggable" && layoutKey) {
    return (
      <DraggableGrid
        layoutKey={layoutKey}
        columns={columns}
        editable={editable}
        className={className}
      >
        {children}
      </DraggableGrid>
    )
  }

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
        "items-start",
        className
      )}
    >
      {children}
    </div>
  )
}

// Re-export GridItem for convenience
export { GridItem }
