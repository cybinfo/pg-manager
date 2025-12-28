import * as React from "react"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface SectionDividerProps {
  label: string
  icon?: LucideIcon
  description?: string
  className?: string
}

export function SectionDivider({
  label,
  icon: Icon,
  description,
  className,
}: SectionDividerProps) {
  return (
    <div className={cn("relative py-4", className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="p-1.5 rounded-lg bg-slate-100">
            <Icon className="h-4 w-4 text-slate-600" />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-700">{label}</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Simple line divider
export function Divider({ className }: { className?: string }) {
  return <div className={cn("h-px bg-slate-200 my-4", className)} />
}

// Section wrapper with optional label
export function Section({
  title,
  description,
  children,
  className,
}: {
  title?: string
  description?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("space-y-4", className)}>
      {title && (
        <div>
          <h3 className="text-sm font-medium text-slate-700">{title}</h3>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      {children}
    </div>
  )
}
