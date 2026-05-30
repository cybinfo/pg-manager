"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { DetailSection } from "@/components/ui/detail-components"
import { LucideIcon, ChevronDown, ChevronUp, ExternalLink, Inbox } from "lucide-react"

interface DetailListSectionProps<T> {
  title: string
  description?: string
  icon?: LucideIcon

  // List data
  items: T[]
  renderItem: (item: T, index: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string

  // List behavior
  initialLimit?: number         // Default: 3
  maxInlineExpand?: number      // Default: 10

  // View All behavior
  viewAllMode?: "link" | "expand" | "auto"
  viewAllHref?: string
  viewAllLabel?: string

  // Empty state
  emptyIcon?: LucideIcon
  emptyText?: string
  emptyAction?: { label: string; href: string }

  // Additional actions (shown in header)
  actions?: React.ReactNode
  // Spacing between items: "none" for border-row style, "sm"/"md" for card style
  itemSpacing?: "none" | "sm" | "md"
  className?: string
}

export function DetailListSection<T>({
  title,
  description,
  icon,
  items,
  renderItem,
  keyExtractor,
  initialLimit = 3,
  maxInlineExpand = 10,
  viewAllMode = "auto",
  viewAllHref,
  viewAllLabel,
  emptyIcon: EmptyIcon = Inbox,
  emptyText = "No items yet",
  emptyAction,
  actions,
  itemSpacing = "none",
  className,
}: DetailListSectionProps<T>) {
  const [isExpanded, setIsExpanded] = React.useState(false)

  const totalItems = items.length
  const hasMoreItems = totalItems > initialLimit
  const remainingCount = totalItems - initialLimit

  // Determine actual view all mode
  const effectiveViewAllMode = React.useMemo(() => {
    if (viewAllMode === "auto") {
      // Auto: expand if total items <= maxInlineExpand, otherwise link
      return totalItems <= maxInlineExpand ? "expand" : "link"
    }
    return viewAllMode
  }, [viewAllMode, totalItems, maxInlineExpand])

  // Items to display
  const displayedItems = React.useMemo(() => {
    if (!hasMoreItems || isExpanded) {
      return items
    }
    return items.slice(0, initialLimit)
  }, [items, hasMoreItems, isExpanded, initialLimit])

  // View All button label
  const viewAllButtonLabel = viewAllLabel || (
    effectiveViewAllMode === "expand"
      ? (isExpanded ? "Show Less" : `View All (${remainingCount} more)`)
      : `View All (${totalItems})`
  )

  const handleViewAllClick = () => {
    if (effectiveViewAllMode === "expand") {
      setIsExpanded(!isExpanded)
    }
  }

  // Build the View All button - always show if viewAllHref is provided for unified UX
  const showViewAllButton = hasMoreItems || (viewAllHref && totalItems > 0)

  const viewAllButton = showViewAllButton && (
    effectiveViewAllMode === "link" && viewAllHref ? (
      <Link href={viewAllHref}>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5">
          {hasMoreItems ? viewAllButtonLabel : `View All (${totalItems})`}
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    ) : hasMoreItems ? (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleViewAllClick}
        className="text-primary hover:text-primary/80 hover:bg-primary/5"
      >
        {viewAllButtonLabel}
        {isExpanded ? (
          <ChevronUp className="ml-1 h-4 w-4" />
        ) : (
          <ChevronDown className="ml-1 h-4 w-4" />
        )}
      </Button>
    ) : viewAllHref ? (
      <Link href={viewAllHref}>
        <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80 hover:bg-primary/5">
          View All ({totalItems})
          <ExternalLink className="ml-1 h-3 w-3" />
        </Button>
      </Link>
    ) : null
  )

  return (
    <DetailSection
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      className={className}
    >
      {totalItems === 0 ? (
        // Empty state
        <div className="text-center py-6">
          <EmptyIcon className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
          <p className="text-muted-foreground">{emptyText}</p>
          {emptyAction && (
            <Link href={emptyAction.href}>
              <Button variant="outline" size="sm" className="mt-3">
                {emptyAction.label}
              </Button>
            </Link>
          )}
        </div>
      ) : (
        // List with items
        <div className={itemSpacing === "none" ? "space-y-0" : itemSpacing === "sm" ? "space-y-2" : "space-y-3"}>
          <div
            className={cn(
              itemSpacing === "none" ? "space-y-0" : itemSpacing === "sm" ? "space-y-2" : "space-y-3",
              "transition-all duration-200",
              isExpanded && "animate-fade-in"
            )}
          >
            {displayedItems.map((item, index) => (
              <React.Fragment key={keyExtractor(item, index)}>
                {renderItem(item, index)}
              </React.Fragment>
            ))}
          </div>

          {/* View All / Show Less button */}
          {viewAllButton && (
            <div className="pt-3 flex justify-center border-t border-dashed mt-3">
              {viewAllButton}
            </div>
          )}
        </div>
      )}
    </DetailSection>
  )
}
