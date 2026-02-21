/**
 * Payment Methods Pie Chart Component
 * Shared donut chart showing payment method breakdown
 * Used identically in both PG and Library reports
 */

"use client"

import {
  PieChart,
  Pie,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"
import { ReportChartCard } from "./ReportChartCard"
import { CHART_COLORS, formatCurrency } from "./report-utils"

interface PaymentMethodData {
  name: string
  value: number
  count: number
  [key: string]: string | number
}

interface PaymentMethodsChartProps {
  data: PaymentMethodData[]
  colors?: string[]
}

export function PaymentMethodsChart({
  data,
  colors = CHART_COLORS,
}: PaymentMethodsChartProps) {
  return (
    <ReportChartCard
      title="Payment Methods"
      description="Breakdown by payment type"
      isEmpty={data.length === 0}
      emptyMessage="No payments in selected period"
    >
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={100}
            paddingAngle={2}
            label={({ name, percent }) =>
              `${name || ""} ${(((percent as number) || 0) * 100).toFixed(0)}%`
            }
            labelLine={false}
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => formatCurrency(Number(value))} />
        </PieChart>
      </ResponsiveContainer>
    </ReportChartCard>
  )
}
