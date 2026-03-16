/**
 * Download Utilities
 *
 * Centralized utilities for all download operations:
 * - Client-side: Blob downloads, CSV/JSON/text file downloads
 * - Server-side: API Response helpers for PDF, CSV, JSON, and streaming downloads
 *
 * Previously split across download-utils.ts and api-download-helpers.ts,
 * now consolidated into a single module.
 *
 * @example
 * // Client-side downloads
 * import { downloadBlob, downloadCSV, downloadJSON } from "@/lib/download-utils"
 * downloadBlob(pdfBlob, "report.pdf")
 * downloadCSV(data, columns, "export.csv")
 *
 * // Server-side API responses
 * import { createPDFResponse, createCSVResponse } from "@/lib/download-utils"
 * return createPDFResponse(pdfBytes, "receipt.pdf")
 */

import { sanitizeFilename } from "./format"
import { getTodayISO } from "@/lib/date-helpers"

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

export type ContentDisposition = "attachment" | "inline"

interface DownloadResponseOptions {
  /** Content disposition (default: "attachment") */
  disposition?: ContentDisposition
  /** Additional headers */
  headers?: Record<string, string>
}

// ============================================================================
// CLIENT-SIDE: BLOB DOWNLOAD
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
// CLIENT-SIDE: CSV UTILITIES
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
  // Add BOM for Excel compatibility with Unicode (Indian names, ₹ symbol)
  const csvWithBOM = "\uFEFF" + csv
  const blob = new Blob([csvWithBOM], { type: "text/csv;charset=utf-8" })
  downloadBlob(blob, sanitizeFilename(filename))
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
// CLIENT-SIDE: JSON UTILITIES
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
// CLIENT-SIDE: TEXT UTILITIES
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
  const datePart = getTodayISO()
  const base = prefix ? `${prefix}-${safeName}` : `${safeName}-export`
  return `${base}-${datePart}.${extension}`
}

// ============================================================================
// SERVER-SIDE: PDF RESPONSE
// ============================================================================

/**
 * Create a PDF download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const pdfBytes = await generateReceipt(data)
 *   return createPDFResponse(pdfBytes, "receipt-123.pdf")
 * }
 */
export function createPDFResponse(
  content: Uint8Array | ArrayBuffer | Buffer,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  // Convert to Uint8Array if needed
  const bytes = content instanceof Uint8Array
    ? content
    : new Uint8Array(content)

  return new Response(bytes as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Content-Length": bytes.length.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// SERVER-SIDE: CSV RESPONSE
// ============================================================================

/**
 * Create a CSV download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const csvContent = buildCSV(data, columns)
 *   return createCSVResponse(csvContent, "export.csv")
 * }
 */
export function createCSVResponse(
  content: string,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  // Add BOM for Excel compatibility
  const contentWithBOM = "\uFEFF" + content

  return new Response(contentWithBOM, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// SERVER-SIDE: JSON RESPONSE
// ============================================================================

/**
 * Create a JSON download response with proper headers
 *
 * @example
 * export async function GET() {
 *   const data = await fetchExportData()
 *   return createJSONResponse(data, "backup.json")
 * }
 */
export function createJSONResponse(
  content: unknown,
  filename: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)
  const jsonString = JSON.stringify(content, null, 2)

  return new Response(jsonString, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// SERVER-SIDE: GENERIC FILE RESPONSE
// ============================================================================

/**
 * Create a generic file download response
 *
 * @example
 * return createFileResponse(content, "report.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
 */
export function createFileResponse(
  content: Uint8Array | ArrayBuffer | string,
  filename: string,
  mimeType: string,
  options: DownloadResponseOptions = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {} } = options
  const safeFilename = sanitizeFilename(filename)

  const body = typeof content === "string"
    ? content
    : content instanceof Uint8Array
      ? content
      : new Uint8Array(content)

  const contentLength = typeof content === "string"
    ? new TextEncoder().encode(content).length
    : content instanceof Uint8Array
      ? content.length
      : content.byteLength

  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
      "Content-Length": contentLength.toString(),
      "Cache-Control": "no-cache, no-store, must-revalidate",
      ...extraHeaders,
    },
  })
}

// ============================================================================
// SERVER-SIDE: STREAMING RESPONSE
// ============================================================================

/**
 * Create a streaming download response for large files
 *
 * @example
 * const stream = createReadStream(filePath)
 * return createStreamingResponse(stream, "large-file.zip", "application/zip")
 */
export function createStreamingResponse(
  stream: ReadableStream,
  filename: string,
  mimeType: string,
  options: DownloadResponseOptions & { contentLength?: number } = {}
): Response {
  const { disposition = "attachment", headers: extraHeaders = {}, contentLength } = options
  const safeFilename = sanitizeFilename(filename)

  const headers: Record<string, string> = {
    "Content-Type": mimeType,
    "Content-Disposition": `${disposition}; filename="${safeFilename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    ...extraHeaders,
  }

  if (contentLength !== undefined) {
    headers["Content-Length"] = contentLength.toString()
  }

  return new Response(stream, {
    status: 200,
    headers,
  })
}
