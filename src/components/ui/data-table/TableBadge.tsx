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
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-destructive/10 text-destructive",
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
