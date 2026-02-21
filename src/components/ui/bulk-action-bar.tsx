"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface BulkAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "destructive"
  action: (selectedIds: string[]) => void | Promise<void>
}

interface BulkActionBarProps {
  selectedCount: number
  actions: BulkAction[]
  onClearSelection: () => void
  className?: string
}

export function BulkActionBar({ selectedCount, actions, onClearSelection, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null

  return (
    <div className={cn(
      "fixed bottom-6 left-1/2 -translate-x-1/2 z-50",
      "bg-card border rounded-xl shadow-2xl px-4 py-3",
      "flex items-center gap-3 animate-slide-up",
      "lg:left-[calc(50%+8rem)]",
      className
    )}>
      <div className="flex items-center gap-2 pr-3 border-r">
        <span className="inline-flex items-center justify-center h-6 min-w-[24px] px-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
          {selectedCount}
        </span>
        <span className="text-sm font-medium whitespace-nowrap">selected</span>
      </div>

      <div className="flex items-center gap-2">
        {actions.map((action) => (
          <Button
            key={action.id}
            variant={action.variant === "destructive" ? "destructive" : "outline"}
            size="sm"
            onClick={() => action.action([])}
            className="gap-2"
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <Button
        variant="ghost"
        size="icon"
        onClick={onClearSelection}
        className="ml-1 h-8 w-8"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  )
}
