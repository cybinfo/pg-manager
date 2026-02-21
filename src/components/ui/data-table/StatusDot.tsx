"use client"

import { cn } from "@/lib/utils"

// Status dot component for tables
export function StatusDot({
  status,
  label
}: {
  status: "success" | "warning" | "error" | "muted"
  label?: string
}) {
  const colors = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-rose-500",
    muted: "bg-slate-400",
  }

  return (
    <div className="flex items-center gap-2">
      <span className={cn("h-2 w-2 rounded-full shrink-0", colors[status])} />
      {label && <span className="text-sm truncate">{label}</span>}
    </div>
  )
}
