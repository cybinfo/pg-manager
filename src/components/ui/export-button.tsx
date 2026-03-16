/**
 * ExportButton Component
 *
 * Reusable button for exporting data as CSV.
 * Uses the centralized download-utils for CSV generation with BOM support.
 *
 * @example
 * <ExportButton
 *   data={filteredItems}
 *   filename="library-attendance"
 *   columns={[
 *     { key: "name", header: "Name" },
 *     { key: "amount", header: "Amount", format: (v) => `₹${v}` },
 *   ]}
 * />
 */

"use client"

import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCSV, CSVColumn, entityExportFilename } from "@/lib/download-utils"
import { showSuccess } from "@/lib/toast-helpers"

export interface ExportButtonProps<T extends Record<string, unknown>> {
  /** Data array to export */
  data: T[]
  /** Base filename (date will be appended automatically) */
  filename: string
  /** Column definitions for CSV export */
  columns: CSVColumn<T>[]
  /** Button variant (default: "outline") */
  variant?: "outline" | "ghost" | "secondary"
  /** Button size (default: "sm") */
  size?: "sm" | "default"
  /** Custom label (default: "Export CSV") */
  label?: string
}

export function ExportButton<T extends Record<string, unknown>>({
  data,
  filename,
  columns,
  variant = "outline",
  size = "sm",
  label = "Export CSV",
}: ExportButtonProps<T>) {
  const handleExport = () => {
    const exportFilename = entityExportFilename(filename, "csv")
    downloadCSV(data, columns, exportFilename)
    showSuccess(`Exported ${data.length} records to CSV`)
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={data.length === 0}
    >
      <Download className="h-4 w-4 mr-2" />
      {label}
    </Button>
  )
}

export default ExportButton
