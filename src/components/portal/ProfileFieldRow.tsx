"use client"

import { Button } from "@/components/ui/button"
import { Flag } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface ProfileFieldRowProps {
  /** Icon displayed to the left */
  icon: LucideIcon
  /** Field label */
  label: string
  /** Field value */
  value: string
  /** Optional callback when user clicks the report/flag button */
  onReport?: () => void
}

export function ProfileFieldRow({
  icon: Icon,
  label,
  value,
  onReport,
}: ProfileFieldRowProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
      <Icon className="h-5 w-5 text-muted-foreground" />
      <div className="flex-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
      {onReport && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-50"
          onClick={onReport}
          title={`Report issue with ${label.toLowerCase()}`}
        >
          <Flag className="h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
