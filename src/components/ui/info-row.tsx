"use client"

/**
 * InfoRow Component
 *
 * Displays label/value pairs in a consistent format.
 * Commonly used in detail pages and info cards.
 *
 * @example
 * <InfoRow label="Status" value={<StatusBadge status="active" />} />
 * <InfoRow label="Amount" value="₹5,000" valueClassName="text-primary font-bold" />
 */

import { cn } from "@/lib/utils"

interface InfoRowProps {
  /** Label text */
  label: string
  /** Value to display (can be string or React element) */
  value: React.ReactNode
  /** Additional CSS classes for wrapper */
  className?: string
  /** Additional CSS classes for label */
  labelClassName?: string
  /** Additional CSS classes for value */
  valueClassName?: string
  /** Show border at bottom (default: true) */
  bordered?: boolean
  /** Layout direction */
  direction?: "horizontal" | "vertical"
}

export function InfoRow({
  label,
  value,
  className,
  labelClassName,
  valueClassName,
  bordered = true,
  direction = "horizontal",
}: InfoRowProps) {
  if (direction === "vertical") {
    return (
      <div
        className={cn(
          bordered && "border-b last:border-0",
          "py-2",
          className
        )}
      >
        <p className={cn("text-xs text-muted-foreground mb-1", labelClassName)}>
          {label}
        </p>
        <div className={cn("font-medium", valueClassName)}>{value}</div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex justify-between items-center py-2",
        bordered && "border-b last:border-0",
        className
      )}
    >
      <span className={cn("text-muted-foreground", labelClassName)}>
        {label}
      </span>
      <span className={cn("font-medium text-right", valueClassName)}>
        {value}
      </span>
    </div>
  )
}

/**
 * InfoRowGroup Component
 *
 * Groups multiple InfoRow components together.
 *
 * @example
 * <InfoRowGroup>
 *   <InfoRow label="Name" value="John Doe" />
 *   <InfoRow label="Email" value="john@example.com" />
 * </InfoRowGroup>
 */
interface InfoRowGroupProps {
  children: React.ReactNode
  className?: string
  /** Add dividers between rows */
  divided?: boolean
}

export function InfoRowGroup({
  children,
  className,
  divided = true,
}: InfoRowGroupProps) {
  return (
    <div
      className={cn(
        "space-y-0",
        divided && "[&>*]:border-b [&>*:last-child]:border-0",
        className
      )}
    >
      {children}
    </div>
  )
}
