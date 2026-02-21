"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

export interface PortalStatCardProps {
  /** Icon to display */
  icon: LucideIcon
  /** Label/title for the stat */
  label: string
  /** Value to display */
  value: string | number
  /** Tailwind bg class for the icon container, e.g. "bg-primary/10" or "bg-emerald-50" */
  bgColor: string
  /** Tailwind text color class for the icon, e.g. "text-primary" or "text-emerald-600" */
  iconColor: string
}

export function PortalStatCard({
  icon: Icon,
  label,
  value,
  bgColor,
  iconColor,
}: PortalStatCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 ${bgColor} rounded-lg`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="font-semibold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
