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
 * <InfoRow label="Address" value="123 Main St" icon={MapPin} />
 */

import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface InfoRowProps {
  /** Label text */
  label: string
  /** Value to display (can be string or React element) */
  value: React.ReactNode
  /** Optional icon displayed next to the label */
  icon?: LucideIcon
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
  icon: Icon,
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
          {Icon && <Icon className="inline h-4 w-4 mr-1" />}
          {label}
        </p>
        <div className={cn("font-medium", valueClassName)}>
          {value || <span className="text-muted-foreground">-</span>}
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between py-2.5",
        bordered && "border-b border-dashed last:border-0",
        className
      )}
    >
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", labelClassName)}>
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div className={cn("text-sm font-medium text-right", valueClassName)}>
        {value || <span className="text-muted-foreground">-</span>}
      </div>
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
