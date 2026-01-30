"use client"

/**
 * EmptyStateInline Component
 *
 * Lightweight inline empty state for lists and cards.
 * Use this for small empty states within sections.
 * For full-page empty states, use the EmptyState component.
 *
 * @example
 * {items.length === 0 ? (
 *   <EmptyStateInline message="No items found" icon={Package} />
 * ) : (
 *   <div className="space-y-2">{items.map(...)}</div>
 * )}
 */

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface EmptyStateInlineProps {
  /** Message to display */
  message?: string
  /** Optional icon component */
  icon?: LucideIcon
  /** Additional CSS classes */
  className?: string
  /** Size variant */
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: {
    wrapper: "py-4",
    icon: "h-6 w-6",
    text: "text-sm",
  },
  md: {
    wrapper: "py-6",
    icon: "h-8 w-8",
    text: "text-sm",
  },
  lg: {
    wrapper: "py-8",
    icon: "h-10 w-10",
    text: "text-base",
  },
}

export function EmptyStateInline({
  message = "No items found",
  icon: Icon,
  className,
  size = "md",
}: EmptyStateInlineProps) {
  const sizes = sizeClasses[size]

  return (
    <div
      className={cn(
        "text-center text-muted-foreground",
        sizes.wrapper,
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn("mx-auto mb-2 opacity-50", sizes.icon)}
        />
      )}
      <p className={sizes.text}>{message}</p>
    </div>
  )
}
