"use client"

import { useState } from "react"
import { Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface InfoBannerProps {
  children: React.ReactNode
  storageKey?: string
  className?: string
  variant?: "info" | "tip" | "warning"
}

export function InfoBanner({ children, storageKey, className, variant = "info" }: InfoBannerProps) {
  const [dismissed, setDismissed] = useState(() => {
    if (storageKey && typeof window !== "undefined") {
      return localStorage.getItem(`info-banner-${storageKey}`) === "dismissed"
    }
    return false
  })

  const handleDismiss = () => {
    setDismissed(true)
    if (storageKey) {
      localStorage.setItem(`info-banner-${storageKey}`, "dismissed")
    }
  }

  if (dismissed) return null

  const variantStyles = {
    info: "bg-info/10 border-info/20 text-info",
    tip: "bg-success/10 border-success/20 text-success",
    warning: "bg-warning/10 border-warning/20 text-warning",
  }

  return (
    <div className={cn(
      "flex items-start gap-3 px-4 py-3 rounded-lg border text-sm animate-fade-in",
      variantStyles[variant],
      className
    )}>
      <Info className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1">{children}</div>
      <button
        onClick={handleDismiss}
        className="shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
