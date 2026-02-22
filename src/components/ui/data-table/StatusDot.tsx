"use client"

import { cn } from "@/lib/utils"
import { STATUS_DOT_COLORS } from "@/lib/status-colors"

// Status dot component for tables
export function StatusDot({
  status,
  label
}: {
  status: "success" | "warning" | "error" | "muted"
  label?: string
}) {
  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", STATUS_DOT_COLORS[status])} />
      {label && <span className="text-sm truncate">{label}</span>}
    </div>
  )
}
