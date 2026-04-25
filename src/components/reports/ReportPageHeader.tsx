/**
 * Report Page Header Component
 * Shared header with date range picker, entity filter dropdown, and export button
 */

"use client"

import { LucideIcon, Download, BarChart3 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker"
import { PrintButton } from "@/components/ui/print-button"
import { Select } from "@/components/ui/form-components"

interface FilterOption {
  id: string
  name: string
}

interface ReportPageHeaderProps {
  title: string
  description: string
  icon?: LucideIcon
  breadcrumbLabel: string
  dateRange: DateRange
  onDateRangeChange: (range: DateRange) => void
  /** Filter dropdown options (properties, libraries, etc.) */
  filterOptions?: FilterOption[]
  filterValue?: string
  onFilterChange?: (value: string) => void
  filterAllLabel?: string
  onExport?: () => void
  showPrint?: boolean
}

export function ReportPageHeader({
  title,
  description,
  icon = BarChart3,
  breadcrumbLabel,
  dateRange,
  onDateRangeChange,
  filterOptions = [],
  filterValue = "all",
  onFilterChange,
  filterAllLabel = "All",
  onExport,
  showPrint = false,
}: ReportPageHeaderProps) {
  return (
    <PageHeader
      title={title}
      description={description}
      icon={icon}
      breadcrumbs={[{ label: breadcrumbLabel }]}
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <DateRangePicker value={dateRange} onChange={onDateRangeChange} />
          {filterOptions.length > 0 && onFilterChange && (
            <Select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              options={[
                { value: "all", label: filterAllLabel },
                ...filterOptions.map((o) => ({ value: o.id, label: o.name })),
              ]}
              className="w-auto"
            />
          )}
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          )}
          {showPrint && <PrintButton label="Print Report" />}
        </div>
      }
    />
  )
}
