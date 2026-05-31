"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export function TableBadge({
  variant = "default",
  className,
  children,
}: {
  variant?: "default" | "success" | "warning" | "error" | "muted" | "info"
  className?: string
  children?: React.ReactNode
}) {
  const variants = {
    default: "bg-muted text-foreground",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    error: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
    info: "bg-info/10 text-info",
  }

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap",
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}
