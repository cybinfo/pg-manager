"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"

type ColorVariant = "blue" | "green" | "red" | "amber" | "purple" | "teal" | "orange" | "rose" | "slate"

const colorClasses: Record<ColorVariant, { bg: string; text: string }> = {
  blue: { bg: "bg-blue-100", text: "text-blue-600" },
  green: { bg: "bg-green-100", text: "text-green-600" },
  red: { bg: "bg-red-100", text: "text-red-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600" },
  teal: { bg: "bg-teal-100", text: "text-teal-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-600" },
}

interface StatCardProps {
  /** Icon to display */
  icon: LucideIcon
  /** Label/title for the stat */
  label: string
  /** Value to display */
  value: string | number
  /** Color variant */
  color?: ColorVariant
  /** Additional className for the card */
  className?: string
  /** Optional subtitle/description */
  subtitle?: string
}

export function StatCard({
  icon: Icon,
  label,
  value,
  color = "blue",
  className,
  subtitle,
}: StatCardProps) {
  const colors = colorClasses[color]

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn("p-2 rounded-lg", colors.bg)}>
            <Icon className={cn("h-5 w-5", colors.text)} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

/** Inline stat without card wrapper - for use inside existing cards */
interface StatItemProps {
  icon: LucideIcon
  label: string
  value: string | number
  color?: ColorVariant
  className?: string
}

export function StatItem({
  icon: Icon,
  label,
  value,
  color = "blue",
  className,
}: StatItemProps) {
  const colors = colorClasses[color]

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn("p-2 rounded-lg", colors.bg)}>
        <Icon className={cn("h-5 w-5", colors.text)} />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-semibold">{value}</p>
      </div>
    </div>
  )
}
