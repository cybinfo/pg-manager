/**
 * Dues Aging Card Component
 * ARCH-002: Extracted from Reports page
 */

"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface DuesAging {
  current: number
  days30: number
  days60: number
  days90Plus: number
}

interface DuesAgingCardProps {
  data: DuesAging
  onExport?: () => void
  formatCurrency?: (amount: number) => string
}

export function DuesAgingCard({
  data,
  onExport,
  formatCurrency = (v) => `₹${v.toLocaleString("en-IN")}`,
}: DuesAgingCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Dues Aging Report</CardTitle>
            <CardDescription>Outstanding amounts by age</CardDescription>
          </div>
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="font-medium">Current (Not Due)</span>
            </div>
            <span className="font-bold text-green-700">
              {formatCurrency(data.current)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="font-medium">1-30 Days Overdue</span>
            </div>
            <span className="font-bold text-yellow-700">
              {formatCurrency(data.days30)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-orange-500" />
              <span className="font-medium">31-60 Days Overdue</span>
            </div>
            <span className="font-bold text-orange-700">
              {formatCurrency(data.days60)}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="font-medium">60+ Days Overdue</span>
            </div>
            <span className="font-bold text-red-700">
              {formatCurrency(data.days90Plus)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
