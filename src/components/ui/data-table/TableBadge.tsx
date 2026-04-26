"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function TableBadge({
  variant = "default",
  children,
}: {
  variant?: "default" | "success" | "warning" | "error" | "muted"
  children?: React.ReactNode
}) {
  const variants = {
    default: "bg-muted text-foreground",
    success: "bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300",
    warning: "bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300",
    error: "bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-300",
    muted: "bg-muted text-muted-foreground",
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
      variants[variant]
    )}>
      {children}
    </span>
  )
}
