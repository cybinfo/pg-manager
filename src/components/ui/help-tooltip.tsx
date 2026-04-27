"use client"

import { useState } from "react"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface HelpTooltipProps {
  content: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
  iconClassName?: string
}

export function HelpTooltip({ content, side = "top", className, iconClassName }: HelpTooltipProps) {
  const [show, setShow] = useState(false)

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        className={cn(
          "text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-full",
          iconClassName
        )}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        aria-label="Help"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {show && (
        <div
          role="tooltip"
          className={cn(
            "absolute z-[var(--z-dropdown)] px-3 py-2 text-xs bg-popover text-popover-foreground",
            "border rounded-lg shadow-lg max-w-[250px] whitespace-normal",
            "animate-fade-in pointer-events-none",
            // Positioning
            side === "top" && "bottom-full left-1/2 -translate-x-1/2 mb-2",
            side === "bottom" && "top-full left-1/2 -translate-x-1/2 mt-2",
            side === "left" && "right-full top-1/2 -translate-y-1/2 mr-2",
            side === "right" && "left-full top-1/2 -translate-y-1/2 ml-2",
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}
