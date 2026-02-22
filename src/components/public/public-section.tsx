"use client"

import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface PublicSectionProps {
  badge?: { icon: LucideIcon; text: string; colorClass?: string }
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  maxWidth?: string
  background?: string
  id?: string
}

/**
 * Reusable section component for public pages.
 * Provides consistent badge -> heading -> description -> content structure
 * with standard spacing (py-20 px-4, container mx-auto).
 */
export function PublicSection({
  badge,
  title,
  description,
  children,
  className,
  maxWidth = "max-w-4xl",
  background,
  id,
}: PublicSectionProps) {
  return (
    <section id={id} className={cn("py-20 px-4", background, className)}>
      <div className="container mx-auto">
        <div className="text-center mb-16">
          {badge && (
            <div
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium mb-4",
                badge.colorClass ||
                  "bg-gradient-to-r from-teal-100 to-emerald-100 dark:from-teal-900 dark:to-emerald-900 text-teal-700 dark:text-teal-300"
              )}
            >
              <badge.icon className="h-4 w-4" />
              {badge.text}
            </div>
          )}
          <h2 className="text-3xl md:text-5xl font-bold mb-4">{title}</h2>
          {description && (
            <p className={cn("text-muted-foreground text-lg", maxWidth !== "none" ? `${maxWidth} mx-auto` : "")}>{description}</p>
          )}
        </div>
        {children}
      </div>
    </section>
  )
}
