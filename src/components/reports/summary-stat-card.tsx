/**
 * Summary Stat Card Component
 * ARCH-002: Extracted from Reports page
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatItem {
  label: string
  value: string | number
  highlight?: "positive" | "negative" | "warning" | "neutral"
}

interface SummaryStatCardProps {
  title: string
  stats: StatItem[]
}

const highlightClasses = {
  positive: "text-green-600",
  negative: "text-red-600",
  warning: "text-yellow-600",
  neutral: "",
}

export function SummaryStatCard({ title, stats }: SummaryStatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span
                className={`font-medium ${
                  stat.highlight ? highlightClasses[stat.highlight] : ""
                }`}
              >
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
