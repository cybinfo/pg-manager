/**
 * KPI Card Component
 * ARCH-002: Extracted from Reports page for reusability
 */

import { Card, CardContent } from "@/components/ui/card"
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface KPICardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: "green" | "red" | "blue" | "purple" | "amber" | "rose"
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  dynamicColor?: boolean
  positiveThreshold?: number
}

const colorClasses = {
  green: { bg: "bg-green-100", text: "text-green-600", icon: "text-green-600" },
  red: { bg: "bg-red-100", text: "text-red-600", icon: "text-red-600" },
  blue: { bg: "bg-blue-100", text: "text-blue-600", icon: "text-blue-600" },
  purple: { bg: "bg-purple-100", text: "text-purple-600", icon: "text-purple-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-600", icon: "text-amber-600" },
  rose: { bg: "bg-rose-100", text: "text-rose-600", icon: "text-rose-600" },
}

export function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  iconColor = "green",
  trend,
  dynamicColor = false,
  positiveThreshold = 0,
}: KPICardProps) {
  // Determine color based on value if dynamicColor is enabled
  let effectiveColor = iconColor
  if (dynamicColor && typeof value === "number") {
    effectiveColor = value >= positiveThreshold ? "green" : "red"
  }

  const colors = colorClasses[effectiveColor]

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div
                className={`flex items-center text-xs ${
                  trend.isPositive ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3 mr-1" />
                ) : (
                  <ArrowDownRight className="h-3 w-3 mr-1" />
                )}
                {Math.abs(trend.value).toFixed(1)}%{trend.label && ` ${trend.label}`}
              </div>
            )}
          </div>
          <div className={`p-3 rounded-full ${colors.bg}`}>
            <Icon className={`h-5 w-5 ${colors.icon}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
