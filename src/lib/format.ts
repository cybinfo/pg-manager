/**
 * Formatting Utilities
 *
 * Centralized formatting functions for currency, dates, text, and filenames.
 * Use these throughout the application for consistent display of raw values.
 *
 * NOTE: For entity-level display resolution (e.g., resolving a tenant's name
 * from person.name with fallbacks, or getting avatar URLs from joined data),
 * see `@/lib/display-helpers` instead. This module handles raw value formatting;
 * display-helpers handles entity data resolution with fallback chains.
 */

// Phone utilities re-exported from centralized module
import { formatPhoneDisplay } from "./phone"

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
 * Format currency for chart axis ticks (compact, no decimals on K)
 * @example formatCurrencyTick(10000000) => "₹1.0Cr"
 * @example formatCurrencyTick(150000)   => "₹1.5L"
 * @example formatCurrencyTick(5000)     => "₹5k"
 */
export const formatCurrencyTick = (value: number): string => {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)}Cr`
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}k`
  return `₹${value}`
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

/**
 * Calculate occupancy rate as a rounded percentage.
 * Returns 0 if totalBeds is 0 to avoid division by zero.
 * @example calculateOccupancyRate(80, 100) => 80
 */
export const calculateOccupancyRate = (occupiedBeds: number, totalBeds: number): number => {
  if (totalBeds === 0) return 0
  return Math.round((occupiedBeds / totalBeds) * 100)
}

/**
 * Parse a value as a positive number.
 * Returns the number if it is finite and > 0, or null otherwise.
 *
 * @example parsePositiveNumber(150)        => 150
 * @example parsePositiveNumber("99.5")     => 99.5
 * @example parsePositiveNumber(0)          => null
 * @example parsePositiveNumber(-10)        => null
 * @example parsePositiveNumber("abc")      => null
 * @example parsePositiveNumber(null)       => null
 */
export const parsePositiveNumber = (value: unknown): number | null => {
  const num = Number(value)
  if (isNaN(num) || num <= 0) return null
  return num
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
 * Format time in 12-hour format (HH:MM AM/PM)
 * @example formatTime("2024-01-15T10:30:00") => "10:30 AM"
 */
export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
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
// PHONE FORMATTING (delegated to @/lib/phone)
// ============================================

/**
 * Format Indian phone number for display.
 * Re-exported from @/lib/phone for backward compatibility.
 *
 * @example formatPhone("9876543210") => "+91 98765 43210"
 */
export const formatPhone = formatPhoneDisplay

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
// NUMBER TO WORDS (Indian system: Lakh, Crore)
// ============================================

/**
 * Convert a number to Indian English words (for cheque/receipt printing)
 * @example numberToWords(150000) => "One Lakh Fifty Thousand"
 */
export const numberToWords = (num: number): string => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  if (num === 0) return 'Zero'

  const convertLessThanThousand = (n: number): string => {
    if (n === 0) return ''
    if (n < 20) return ones[n]
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '')
    return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + convertLessThanThousand(n % 100) : '')
  }

  if (num < 1000) return convertLessThanThousand(num)
  if (num < 100000) {
    return convertLessThanThousand(Math.floor(num / 1000)) + ' Thousand' +
      (num % 1000 ? ' ' + convertLessThanThousand(num % 1000) : '')
  }
  if (num < 10000000) {
    return convertLessThanThousand(Math.floor(num / 100000)) + ' Lakh' +
      (num % 100000 ? ' ' + numberToWords(num % 100000) : '')
  }
  return convertLessThanThousand(Math.floor(num / 10000000)) + ' Crore' +
    (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '')
}

// ============================================
// GREETING
// ============================================

/**
 * Returns a time-appropriate greeting string based on the current hour.
 * @example getGreeting() => "Good morning" | "Good afternoon" | "Good evening"
 */
export function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
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

