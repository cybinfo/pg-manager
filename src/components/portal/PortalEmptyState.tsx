"use client"

import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

export interface PortalEmptyStateProps {
  /** Icon to display */
  icon: LucideIcon
  /** Title text */
  title: string
  /** Description message */
  message: string
}

export function PortalEmptyState({ icon: Icon, title, message }: PortalEmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <Icon className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium mb-2">{title}</h3>
        <p className="text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}
