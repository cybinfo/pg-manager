"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MetricItem {
  label: string
  value: string | number
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  highlight?: boolean
  href?: string
}

interface MetricsBarProps {
  items: MetricItem[]
  className?: string
}

export function MetricsBar({ items, className }: MetricsBarProps) {
  const router = useRouter()

  const handleClick = (href: string | undefined) => {
    if (href) {
      router.push(href)
    }
  }

  return (
    <div
      className={cn(
        "flex flex-wrap items-stretch bg-white rounded-xl border shadow-sm overflow-hidden",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex-1 min-w-[140px] px-4 py-3 flex items-center gap-3",
            index !== items.length - 1 && "border-r border-dashed",
            item.highlight && "bg-amber-50/50",
            item.href && "cursor-pointer hover:bg-slate-50 transition-colors"
          )}
          onClick={() => handleClick(item.href)}
        >
          {item.icon && (
            <div className={cn(
              "p-2 rounded-lg",
              item.highlight
                ? "bg-amber-100 text-amber-600"
                : "bg-slate-100 text-slate-600"
            )}>
              <item.icon className="h-4 w-4" />
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium">
              {item.label}
            </span>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-lg font-bold tabular-nums",
                item.highlight && "text-amber-600"
              )}>
                {item.value}
              </span>
              {item.trend && (
                <span className={cn(
                  "text-xs font-medium",
                  item.trend.isPositive ? "text-emerald-600" : "text-rose-600"
                )}>
                  {item.trend.isPositive ? "↑" : "↓"} {Math.abs(item.trend.value)}%
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Compact variant for smaller spaces
export function MetricsBarCompact({ items, className }: MetricsBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-4 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border",
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            "flex items-center gap-2",
            index !== items.length - 1 && "pr-4 border-r"
          )}
        >
          <span className="text-xs text-muted-foreground">{item.label}:</span>
          <span className={cn(
            "text-sm font-semibold tabular-nums",
            item.highlight && "text-amber-600"
          )}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  )
}
