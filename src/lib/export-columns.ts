/**
 * Export Column Helpers
 *
 * Reusable format functions for CSV export columns.
 * All dates are formatted as DD/MM/YYYY (Indian format).
 * All currency values are prefixed with ₹.
 */

import type { CSVColumn } from "@/lib/download-utils"
import { formatCurrency as _formatCurrency, formatTime as _formatTime } from "@/lib/format"

// ============================================
// Format Helpers
// ============================================

/** Format a date value as DD/MM/YYYY */
export function formatDateForExport(value: unknown): string {
  if (!value) return ""
  const d = new Date(value as string)
  if (isNaN(d.getTime())) return String(value)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

/** Format a datetime value as DD/MM/YYYY HH:MM */
export function formatDateTimeForExport(value: unknown): string {
  if (!value) return ""
  const d = new Date(value as string)
  if (isNaN(d.getTime())) return String(value)
  const day = String(d.getDate()).padStart(2, "0")
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const year = d.getFullYear()
  const hours = String(d.getHours()).padStart(2, "0")
  const mins = String(d.getMinutes()).padStart(2, "0")
  return `${day}/${month}/${year} ${hours}:${mins}`
}

/** Format a time value as HH:MM AM/PM */
export function formatTimeForExport(value: unknown): string {
  if (!value) return ""
  const d = new Date(value as string)
  if (isNaN(d.getTime())) return String(value)
  return _formatTime(d)
}

/** Format currency with ₹ symbol */
export function formatCurrencyForExport(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return _formatCurrency(num)
}

/** Format a number to 1 decimal place */
export function formatDecimalForExport(value: unknown): string {
  if (value === null || value === undefined || value === "") return ""
  const num = Number(value)
  if (isNaN(num)) return String(value)
  return num.toFixed(1)
}

/** Resolve nested object value by dot-notation path */
export function resolveNestedValue(row: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".")
  let current: unknown = row
  for (const part of parts) {
    if (current === null || current === undefined) return ""
    current = (current as Record<string, unknown>)[part]
  }
  return current ?? ""
}

// ============================================
// Column Builder Helpers
// ============================================

/**
 * Create a CSV column that resolves a nested value (e.g., "member.person.name")
 */
export function nestedColumn<T extends Record<string, unknown>>(
  key: string,
  header: string,
  path: string,
  format?: (value: unknown, row: T) => string
): CSVColumn<T> {
  return {
    key: key as keyof T,
    header,
    format: (_, row) => {
      const val = resolveNestedValue(row as Record<string, unknown>, path)
      return format ? format(val, row) : String(val ?? "")
    },
  }
}

/**
 * Create a CSV date column with DD/MM/YYYY formatting
 */
export function dateExportColumn<T extends Record<string, unknown>>(
  key: keyof T,
  header: string
): CSVColumn<T> {
  return { key, header, format: (v) => formatDateForExport(v) }
}

/**
 * Create a CSV datetime column with DD/MM/YYYY HH:MM formatting
 */
export function dateTimeExportColumn<T extends Record<string, unknown>>(
  key: keyof T,
  header: string
): CSVColumn<T> {
  return { key, header, format: (v) => formatDateTimeForExport(v) }
}

/**
 * Create a CSV currency column with ₹ formatting
 */
export function currencyExportColumn<T extends Record<string, unknown>>(
  key: keyof T,
  header: string
): CSVColumn<T> {
  return { key, header, format: (v) => formatCurrencyForExport(v) }
}

/**
 * Create a CSV column with a label map (e.g., status codes to display names)
 */
export function labelMapColumn<T extends Record<string, unknown>>(
  key: keyof T,
  header: string,
  labelMap: Record<string, string>
): CSVColumn<T> {
  return { key, header, format: (v) => labelMap[String(v)] || String(v ?? "") }
}
