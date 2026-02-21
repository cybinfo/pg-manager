/**
 * Status Breakdown Card Component
 * Shows colored dot + label + value rows
 * Used for Room Status, Seat Status, Member Status etc.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatusItem {
  label: string
  value: string | number
  color: string
}

interface StatusBreakdownCardProps {
  title: string
  items: StatusItem[]
  /** Optional summary row at the bottom with a top border */
  summary?: {
    label: string
    value: string | number
    highlight?: "positive" | "negative" | "bold"
  }
}

export function StatusBreakdownCard({ title, items, summary }: StatusBreakdownCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.label}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
          {summary && (
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">{summary.label}</span>
              <span
                className={`font-bold ${
                  summary.highlight === "positive"
                    ? "text-green-600"
                    : summary.highlight === "negative"
                    ? "text-red-600"
                    : ""
                }`}
              >
                {summary.value}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
