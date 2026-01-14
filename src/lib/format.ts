/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, dates, and other values.
 * Use these throughout the application for consistent display.
 */

// UTIL-003: Import phone formatter from validators for consolidation
import { formatIndianMobile } from "./validators"

// ============================================
// CURRENCY FORMATTING
// ============================================

// CQ-008: Memoize Intl.NumberFormat instances for performance
// Creating formatters once instead of on every function call
const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

const currencyPreciseFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Format a number as Indian Rupees (₹)
 * Uses Indian number system (lakhs, crores)
 * @example formatCurrency(150000) => "₹1,50,000"
 */
export const formatCurrency = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "₹0"
  return currencyFormatter.format(amount)
}

/**
 * Format currency with decimals (for calculations)
 * @example formatCurrencyPrecise(1500.50) => "₹1,500.50"
 */
export const formatCurrencyPrecise = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "₹0.00"
  return currencyPreciseFormatter.format(amount)
}

/**
 * Format currency compactly (for large amounts)
 * @example formatCurrencyCompact(1500000) => "₹15L"
 */
export const formatCurrencyCompact = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return "₹0"

  if (amount >= 10000000) {
    // Crores
    return `₹${(amount / 10000000).toFixed(1)}Cr`
  } else if (amount >= 100000) {
    // Lakhs
    return `₹${(amount / 100000).toFixed(1)}L`
  } else if (amount >= 1000) {
    // Thousands
    return `₹${(amount / 1000).toFixed(1)}K`
  }

  return formatCurrency(amount)
}

/**
 * Parse currency string to number
 * @example parseCurrency("₹1,50,000") => 150000
 */
export const parseCurrency = (value: string): number => {
  const cleaned = value.replace(/[₹,\s]/g, "")
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? 0 : parsed
}

// ============================================
// NUMBER FORMATTING
// ============================================

/**
 * Format a number with Indian number system
 * @example formatNumber(150000) => "1,50,000"
 */
export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return "0"

  return new Intl.NumberFormat("en-IN").format(num)
}

/**
 * Format a percentage
 * @example formatPercent(0.856) => "85.6%"
 */
export const formatPercent = (value: number | null | undefined, decimals = 1): string => {
  if (value === null || value === undefined) return "0%"

  return `${(value * 100).toFixed(decimals)}%`
}

// ============================================
// DATE FORMATTING
// ============================================

/**
 * Format date in Indian format (DD MMM YYYY)
 * @example formatDate("2024-01-15") => "15 Jan 2024"
 */
export const formatDate = (date: string | Date | null | undefined): string => {
  if (!date) return "-"

  const d = new Date(date)
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

/**
 * Format date with time
 * @example formatDateTime("2024-01-15T10:30:00") => "15 Jan 2024, 10:30 AM"
 */
export const formatDateTime = (date: string | Date | null | undefined): string => {
  if (!date) return "-"

  const d = new Date(date)
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

/**
 * Format relative time (time ago)
 * @example formatTimeAgo("2024-01-10") => "5 days ago"
 */
export const formatTimeAgo = (date: string | Date | null | undefined): string => {
  if (!date) return "-"

  const d = new Date(date)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMins = Math.floor(diffMs / (1000 * 60))

  if (diffDays > 30) {
    return formatDate(date)
  } else if (diffDays > 0) {
    return `${diffDays}d ago`
  } else if (diffHours > 0) {
    return `${diffHours}h ago`
  } else if (diffMins > 0) {
    return `${diffMins}m ago`
  }

  return "Just now"
}

/**
 * Format month year (for billing periods)
 * @example formatMonthYear("2024-01-15") => "January 2024"
 */
export const formatMonthYear = (date: string | Date | null | undefined): string => {
  if (!date) return "-"

  const d = new Date(date)
  return d.toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  })
}

// ============================================
// PHONE FORMATTING (UTIL-003: Consolidated with validators.ts)
// ============================================

/**
 * Format Indian phone number
 * UTIL-003: Delegates to formatIndianMobile for consistency
 * @example formatPhone("9876543210") => "+91 98765 43210"
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return "-"

  // Normalize the input: remove all non-digits first
  const digits = phone.replace(/\D/g, "")

  // Handle various formats and normalize to 10-digit form
  let tenDigits: string | null = null

  if (digits.length === 10 && /^[6-9]/.test(digits)) {
    // Already 10 digits starting with 6-9 (valid Indian mobile)
    tenDigits = digits
  } else if (digits.length === 12 && digits.startsWith("91") && /^[6-9]/.test(digits.slice(2))) {
    // 91XXXXXXXXXX format (12 digits with country code)
    tenDigits = digits.slice(2)
  } else if (digits.length === 11 && digits.startsWith("0") && /^[6-9]/.test(digits.slice(1))) {
    // 0XXXXXXXXXX format (11 digits with leading zero)
    tenDigits = digits.slice(1)
  }

  // If we extracted valid 10 digits, format them
  if (tenDigits) {
    return `+91 ${tenDigits.slice(0, 5)} ${tenDigits.slice(5)}`
  }

  // Fallback: try the canonical formatter
  const formatted = formatIndianMobile(phone)

  // If formatter returns something different and valid, use it
  if (formatted && formatted !== phone) {
    return formatted
  }

  // Return original if no formatting could be done
  return phone
}

// ============================================
// TEXT FORMATTING
// ============================================

/**
 * Truncate text with ellipsis
 * @example truncate("Hello World", 5) => "Hello..."
 */
export const truncate = (text: string | null | undefined, maxLength: number): string => {
  if (!text) return ""
  if (text.length <= maxLength) return text
  return `${text.slice(0, maxLength)}...`
}

/**
 * Capitalize first letter
 * @example capitalize("hello") => "Hello"
 */
export const capitalize = (text: string | null | undefined): string => {
  if (!text) return ""
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase()
}

/**
 * Convert snake_case or kebab-case to Title Case
 * @example toTitleCase("room_type") => "Room Type"
 */
export const toTitleCase = (text: string | null | undefined): string => {
  if (!text) return ""
  return text
    .replace(/[-_]/g, " ")
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ")
}

// ============================================
// FILENAME FORMATTING (SEC-018)
// ============================================

/** Maximum filename length (without extension) */
const MAX_FILENAME_LENGTH = 100

/**
 * SEC-018: Sanitize a string for use in filenames
 * Prevents header injection and ensures cross-platform compatibility
 *
 * @example sanitizeFilename("John's Report") => "johns-report"
 * @example sanitizeFilename("Report<script>") => "reportscript"
 */
export const sanitizeFilename = (text: string): string => {
  if (!text) return "file"

  return text
    .toLowerCase()
    // Remove or replace potentially dangerous characters
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "")
    // Replace whitespace and special chars with dashes
    .replace(/[^a-z0-9.-]+/g, "-")
    // Remove consecutive dashes
    .replace(/-+/g, "-")
    // Remove leading/trailing dashes
    .replace(/^-|-$/g, "")
    // Limit length
    .slice(0, MAX_FILENAME_LENGTH)
    // Default if empty after sanitization
    || "file"
}

/**
 * SEC-018: Create a safe Content-Disposition header value
 * Uses RFC 5987 encoding for non-ASCII characters
 *
 * @example createContentDisposition("report.pdf") => 'attachment; filename="report.pdf"'
 */
export const createContentDisposition = (filename: string, inline = false): string => {
  const disposition = inline ? "inline" : "attachment"
  const sanitized = sanitizeFilename(filename.replace(/\.[^.]+$/, ""))
  const ext = filename.match(/\.[^.]+$/)?.[0] || ""

  const safeFilename = `${sanitized}${ext}`

  // Use simple ASCII filename for Content-Disposition
  return `${disposition}; filename="${safeFilename}"`
}
