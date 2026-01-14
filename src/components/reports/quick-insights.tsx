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
    bg: "bg-green-50",
    icon: "text-green-600",
    title: "text-green-800",
    message: "text-green-700",
  },
  warning: {
    bg: "bg-yellow-50",
    icon: "text-yellow-600",
    title: "text-yellow-800",
    message: "text-yellow-700",
  },
  error: {
    bg: "bg-red-50",
    icon: "text-red-600",
    title: "text-red-800",
    message: "text-red-700",
  },
  info: {
    bg: "bg-blue-50",
    icon: "text-blue-600",
    title: "text-blue-800",
    message: "text-blue-700",
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
