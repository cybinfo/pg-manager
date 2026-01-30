/**
 * Download Utilities
 *
 * Centralized utilities for file downloads (blobs, CSVs, PDFs).
 * Eliminates duplicate download patterns across 4+ files.
 *
 * @example
 * import { downloadBlob, downloadCSV, downloadJSON } from "@/lib/download-utils"
 *
 * // Download any blob
 * downloadBlob(pdfBlob, "report.pdf")
 *
 * // Download CSV from array of objects
 * downloadCSV(data, columns, "export.csv")
 */

import { sanitizeFilename } from "./format"

// ============================================================================
// TYPES
// ============================================================================

export interface CSVColumn<T> {
  /** Key in the data object */
  key: keyof T
  /** Header label in CSV */
  header: string
  /** Optional formatter function */
  format?: (value: T[keyof T], row: T) => string
}

export type MimeType =
  | "text/csv"
  | "application/json"
  | "application/pdf"
  | "text/plain"
  | "application/octet-stream"

// ============================================================================
// BLOB DOWNLOAD
// ============================================================================

/**
 * Download a blob as a file
 * Handles creating temporary link, clicking, and cleanup
 *
 * @example
 * const blob = new Blob([pdfBytes], { type: "application/pdf" })
 * downloadBlob(blob, "receipt.pdf")
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")

  link.href = url
  link.download = sanitizeFilename(filename)
  link.style.display = "none"

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  // Clean up the URL after a short delay
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

/**
 * Download content as a file with specified MIME type
 *
 * @example
 * downloadContent(csvString, "text/csv", "export.csv")
 */
export function downloadContent(
  content: string | BlobPart,
  mimeType: MimeType,
  filename: string
): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` })
  downloadBlob(blob, filename)
}

// ============================================================================
// CSV UTILITIES
// ============================================================================

/**
 * Escape a value for CSV (handles quotes and commas)
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  const stringValue = String(value)

  // If value contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (stringValue.includes(",") || stringValue.includes('"') || stringValue.includes("\n")) {
    return `"${stringValue.replace(/"/g, '""')}"`
  }

  return stringValue
}

/**
 * Build CSV string from data and column definitions
 *
 * @example
 * const csv = buildCSV(tenants, [
 *   { key: "name", header: "Tenant Name" },
 *   { key: "phone", header: "Phone" },
 *   { key: "monthly_rent", header: "Rent", format: (v) => `₹${v}` },
 * ])
 */
export function buildCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CSVColumn<T>[]
): string {
  // Build header row
  const headers = columns.map((col) => escapeCSVValue(col.header))
  const rows = [headers.join(",")]

  // Build data rows
  for (const row of data) {
    const values = columns.map((col) => {
      const rawValue = row[col.key]
      const formattedValue = col.format ? col.format(rawValue, row) : rawValue
      return escapeCSVValue(formattedValue)
    })
    rows.push(values.join(","))
  }

  return rows.join("\n")
}

/**
 * Download data as CSV file
 *
 * @example
 * downloadCSV(payments, [
 *   { key: "tenant_name", header: "Tenant" },
 *   { key: "amount", header: "Amount", format: (v) => formatCurrency(v) },
 *   { key: "payment_date", header: "Date", format: (v) => formatDate(v) },
 * ], "payments-export.csv")
 */
export function downloadCSV<T extends Record<string, unknown>>(
  data: T[],
  columns: CSVColumn<T>[],
  filename: string
): void {
  const csv = buildCSV(data, columns)
  downloadContent(csv, "text/csv", filename)
}

/**
 * Download simple array of objects as CSV with auto-detected columns
 * Useful for quick exports where column customization isn't needed
 *
 * @example
 * downloadSimpleCSV(data, "export.csv")
 */
export function downloadSimpleCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string
): void {
  if (data.length === 0) {
    downloadContent("", "text/csv", filename)
    return
  }

  // Auto-detect columns from first row
  const keys = Object.keys(data[0]) as (keyof T)[]
  const columns: CSVColumn<T>[] = keys.map((key) => ({
    key,
    header: String(key)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase()),
  }))

  downloadCSV(data, columns, filename)
}

// ============================================================================
// JSON UTILITIES
// ============================================================================

/**
 * Download data as JSON file
 *
 * @example
 * downloadJSON(config, "settings-backup.json")
 */
export function downloadJSON(data: unknown, filename: string, pretty = true): void {
  const content = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data)
  downloadContent(content, "application/json", filename)
}

// ============================================================================
// TEXT UTILITIES
// ============================================================================

/**
 * Download text content as a file
 *
 * @example
 * downloadText(logContent, "debug-log.txt")
 */
export function downloadText(content: string, filename: string): void {
  downloadContent(content, "text/plain", filename)
}

// ============================================================================
// FILENAME HELPERS
// ============================================================================

/**
 * Generate a timestamped filename
 *
 * @example
 * timestampedFilename("report", "csv") // "report-2026-01-30.csv"
 * timestampedFilename("backup", "json", true) // "backup-2026-01-30-14-30-45.json"
 */
export function timestampedFilename(
  baseName: string,
  extension: string,
  includeTime = false
): string {
  const now = new Date()
  const datePart = now.toISOString().split("T")[0]

  if (includeTime) {
    const timePart = now.toISOString().split("T")[1].slice(0, 8).replace(/:/g, "-")
    return `${sanitizeFilename(baseName)}-${datePart}-${timePart}.${extension}`
  }

  return `${sanitizeFilename(baseName)}-${datePart}.${extension}`
}

/**
 * Generate entity-specific export filename
 *
 * @example
 * entityExportFilename("payments", "csv") // "payments-export-2026-01-30.csv"
 * entityExportFilename("John Doe", "pdf", "receipt") // "receipt-john-doe-2026-01-30.pdf"
 */
export function entityExportFilename(
  entityName: string,
  extension: string,
  prefix?: string
): string {
  const safeName = sanitizeFilename(entityName.toLowerCase())
  const datePart = new Date().toISOString().split("T")[0]
  const base = prefix ? `${prefix}-${safeName}` : `${safeName}-export`
  return `${base}-${datePart}.${extension}`
}
