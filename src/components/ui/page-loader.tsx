"use client"

import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface PageLoaderProps {
  /** Height of the loader container */
  height?: "sm" | "md" | "lg" | "full"
  /** Optional message to display below spinner */
  message?: string
  /** Additional className */
  className?: string
}

const heightClasses = {
  sm: "h-32",
  md: "h-64",
  lg: "h-96",
  full: "h-screen",
}

export function PageLoader({
  height = "md",
  message,
  className
}: PageLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center",
        heightClasses[height],
        className
      )}
      role="status"
      aria-live="polite"
      aria-label={message || "Loading content"}
    >
      <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground">{message}</p>
      )}
      <span className="sr-only">{message || "Loading..."}</span>
    </div>
  )
}
