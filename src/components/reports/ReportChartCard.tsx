/**
 * Report Chart Card Component
 * Wrapper for chart sections with title, description, and optional export button
 */

"use client"

import { ReactNode } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface ReportChartCardProps {
  title: string
  description?: string
  onExport?: () => void
  exportLabel?: string
  children: ReactNode
  emptyMessage?: string
  isEmpty?: boolean
  height?: number
}

export function ReportChartCard({
  title,
  description,
  onExport,
  exportLabel,
  children,
  emptyMessage = "No data available",
  isEmpty = false,
  height = 300,
}: ReportChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {onExport && (
            <Button variant="ghost" size="sm" onClick={onExport}>
              <Download className="h-4 w-4" />
              {exportLabel && <span className="ml-2">{exportLabel}</span>}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        {isEmpty ? (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            {emptyMessage}
          </div>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  )
}
