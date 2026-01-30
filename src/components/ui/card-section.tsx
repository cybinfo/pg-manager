"use client"

/**
 * CardSection Component
 *
 * Card with icon header pattern commonly used in form pages.
 * Combines Card, CardHeader, and CardContent with consistent styling.
 *
 * @example
 * <CardSection
 *   title="Personal Details"
 *   description="Enter your basic information"
 *   icon={User}
 * >
 *   <form>...</form>
 * </CardSection>
 */

import { type LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface CardSectionProps {
  /** Section title */
  title: string
  /** Optional description */
  description?: string
  /** Optional icon */
  icon?: LucideIcon
  /** Card content */
  children: React.ReactNode
  /** Additional CSS classes for Card */
  className?: string
  /** Additional CSS classes for CardContent */
  contentClassName?: string
  /** Icon background color class (default: bg-primary/10) */
  iconBgClassName?: string
  /** Icon color class (default: text-primary) */
  iconClassName?: string
}

export function CardSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  contentClassName,
  iconBgClassName = "bg-primary/10",
  iconClassName = "text-primary",
}: CardSectionProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center gap-3">
          {Icon && (
            <div className={cn("p-2 rounded-lg", iconBgClassName)}>
              <Icon className={cn("h-5 w-5", iconClassName)} />
            </div>
          )}
          <div>
            <CardTitle>{title}</CardTitle>
            {description && (
              <CardDescription>{description}</CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}

/**
 * CardSectionSimple Component
 *
 * Simpler variant without the icon header.
 *
 * @example
 * <CardSectionSimple title="Notes">
 *   <Textarea />
 * </CardSectionSimple>
 */
interface CardSectionSimpleProps {
  /** Section title */
  title: string
  /** Optional description */
  description?: string
  /** Card content */
  children: React.ReactNode
  /** Additional CSS classes */
  className?: string
  /** Additional CSS classes for CardContent */
  contentClassName?: string
}

export function CardSectionSimple({
  title,
  description,
  children,
  className,
  contentClassName,
}: CardSectionSimpleProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className={cn("space-y-4", contentClassName)}>
        {children}
      </CardContent>
    </Card>
  )
}
