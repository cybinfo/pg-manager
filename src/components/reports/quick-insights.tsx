/**
 * Quick Insights Component
 * ARCH-002: Extracted from Reports page
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"

interface Insight {
  id: string
  title: string
  message: string
  icon: LucideIcon
  type: "success" | "warning" | "error" | "info"
  condition: boolean
}

interface QuickInsightsProps {
  insights: Insight[]
}

const typeStyles = {
  success: {
    bg: "bg-success/5",
    icon: "text-success",
    title: "text-success",
    message: "text-success/80",
  },
  warning: {
    bg: "bg-warning/5",
    icon: "text-warning",
    title: "text-warning",
    message: "text-warning/80",
  },
  error: {
    bg: "bg-destructive/5",
    icon: "text-destructive",
    title: "text-destructive",
    message: "text-destructive/80",
  },
  info: {
    bg: "bg-info/5",
    icon: "text-info",
    title: "text-info",
    message: "text-info/80",
  },
}

export function QuickInsights({ insights }: QuickInsightsProps) {
  const activeInsights = insights.filter((insight) => insight.condition)

  if (activeInsights.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Insights</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-4">
          {activeInsights.map((insight) => {
            const styles = typeStyles[insight.type]
            const Icon = insight.icon

            return (
              <div
                key={insight.id}
                className={`flex items-start gap-3 p-3 ${styles.bg} rounded-lg`}
              >
                <Icon className={`h-5 w-5 ${styles.icon} mt-0.5`} />
                <div>
                  <p className={`font-medium ${styles.title}`}>{insight.title}</p>
                  <p className={`text-sm ${styles.message}`}>{insight.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
