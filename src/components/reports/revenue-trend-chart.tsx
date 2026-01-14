/**
 * Revenue Trend Chart Component
 * ARCH-002: Extracted from Reports page
 */

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Download } from "lucide-react"

interface MonthlyRevenue {
  month: string
  collected: number
  billed: number
}

interface RevenueTrendChartProps {
  data: MonthlyRevenue[]
  onExport?: () => void
  formatCurrency?: (amount: number) => string
}

export function RevenueTrendChart({
  data,
  onExport,
  formatCurrency = (v) => `₹${v.toLocaleString("en-IN")}`,
}: RevenueTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Revenue Trend</CardTitle>
            <CardDescription>Collected vs Billed (Last 6 months)</CardDescription>
          </div>
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(Number(value)), ""]}
              labelStyle={{ fontWeight: "bold" }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="collected"
              name="Collected"
              stroke="#10B981"
              strokeWidth={2}
              dot={{ fill: "#10B981", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="billed"
              name="Billed"
              stroke="#6366F1"
              strokeWidth={2}
              dot={{ fill: "#6366F1", strokeWidth: 2 }}
              strokeDasharray="5 5"
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
