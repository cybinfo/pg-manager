/**
 * Consolidated Phone Utilities
 *
 * Single source of truth for all Indian phone number operations:
 * - Validation (with detailed error messages)
 * - Display formatting (+91 XXXXX XXXXX)
 * - Normalization (for WhatsApp, SMS, and comparison)
 *
 * Indian mobile numbers: 10 digits starting with 6-9, country code +91
 */

// ============================================
// CONSTANTS
// ============================================

/** Regex for Indian mobile: Optional +91/91/0 prefix + 10 digits starting with 6-9 */
const INDIAN_MOBILE_REGEX = /^(?:\+?91|0)?([6-9]\d{9})$/

// ============================================
// VALIDATION
// ============================================

export interface PhoneValidationResult {
  isValid: boolean
  /** Normalized to +91XXXXXXXXXX format, or null if invalid */
  normalized: string | null
  error: string | null
}

/**
 * Validate an Indian mobile number.
 *
 * Accepts various input formats:
 * - 10-digit: 9876543210
 * - With country code: +919876543210, 919876543210
 * - With leading zero: 09876543210
 * - With separators: 98765 43210, 98765-43210
 *
 * @param phone - Phone number to validate
 * @returns Validation result with normalized +91XXXXXXXXXX format
 *
 * @example
 * validatePhone("9876543210")
 * // => { isValid: true, normalized: "+919876543210", error: null }
 *
 * validatePhone("5876543210")
 * // => { isValid: false, normalized: null, error: "Indian mobile numbers must start with 6, 7, 8, or 9" }
 */
export function validatePhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== "string") {
    return { isValid: false, normalized: null, error: "Phone number is required" }
  }

  // Remove all spaces, dashes, and dots
  const cleaned = phone.replace(/[\s\-\.]/g, "")

  // Check against regex
  const match = cleaned.match(INDIAN_MOBILE_REGEX)

  if (!match) {
    // Provide specific error messages
    if (cleaned.length < 10) {
      return { isValid: false, normalized: null, error: "Phone number must be at least 10 digits" }
    }
    if (cleaned.length > 13) {
      return { isValid: false, normalized: null, error: "Phone number is too long" }
    }
    const firstDigit = cleaned.replace(/^(?:\+?91|0)/, "")[0]
    if (firstDigit && !["6", "7", "8", "9"].includes(firstDigit)) {
      return {
        isValid: false,
        normalized: null,
        error: "Indian mobile numbers must start with 6, 7, 8, or 9",
      }
    }
    return { isValid: false, normalized: null, error: "Invalid Indian mobile number format" }
  }

  // Return normalized format: +91XXXXXXXXXX
  const normalized = `+91${match[1]}`

  return { isValid: true, normalized, error: null }
}

// ============================================
// DISPLAY FORMATTING
// ============================================

/**
 * Format an Indian phone number for display.
 *
 * Accepts various input formats and outputs: +91 XXXXX XXXXX
 * Returns "-" for null/undefined, or the original string if it cannot be formatted.
 *
 * @param phone - Phone number in any format (or null/undefined)
 * @returns Formatted display string
 *
 * @example
 * formatPhoneDisplay("9876543210")     // => "+91 98765 43210"
 * formatPhoneDisplay("+919876543210")  // => "+91 98765 43210"
 * formatPhoneDisplay("919876543210")   // => "+91 98765 43210"
 * formatPhoneDisplay(null)             // => "-"
 * formatPhoneDisplay("12345")          // => "12345"
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
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

  // Return original if no formatting could be done
  return phone
}

/**
 * Format a normalized phone number (+91XXXXXXXXXX) for display.
 *
 * This is a lighter version that expects already-normalized input.
 * For raw/unknown input, prefer `formatPhoneDisplay` which handles all formats.
 *
 * @param phone - Normalized phone number (+91XXXXXXXXXX)
 * @returns Formatted string like +91 98765 43210
 *
 * @example
 * formatNormalizedPhone("+919876543210") // => "+91 98765 43210"
 * formatNormalizedPhone("")              // => ""
 * formatNormalizedPhone("12345")         // => "12345" (returned as-is)
 */
export function formatNormalizedPhone(phone: string): string {
  if (!phone) return ""

  // Remove +91 prefix for formatting
  const digits = phone.replace(/^\+91/, "")

  if (digits.length !== 10) return phone

  // Format as: +91 XXXXX XXXXX
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}

// ============================================
// NORMALIZATION (for WhatsApp, SMS, comparison)
// ============================================

/**
 * Normalize a phone number for WhatsApp/SMS APIs.
 *
 * Returns digits-only format with country code: 91XXXXXXXXXX
 * (No "+" prefix - WhatsApp wa.me links require this format)
 *
 * @param phone - Phone number in any format
 * @returns Digits-only string like "919876543210"
 *
 * @example
 * normalizePhone("+91 98765 43210") // => "919876543210"
 * normalizePhone("09876543210")     // => "919876543210"
 * normalizePhone("9876543210")      // => "919876543210"
 */
export function normalizePhone(phone: string): string {
  if (!phone) return ""

  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "")

  // If number starts with 0, remove it
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1)
  }

  // If number doesn't have country code, add India's 91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned
  }

  return cleaned
}

/**
 * Normalize a phone number to bare 10 digits for comparison.
 *
 * Strips country code and leading zero, returning just the 10-digit number.
 * Useful for matching phone numbers stored in different formats.
 *
 * @param phone - Phone number in any format
 * @returns 10-digit string, or empty string if invalid
 *
 * @example
 * normalizePhoneForComparison("+919876543210")  // => "9876543210"
 * normalizePhoneForComparison("09876543210")    // => "9876543210"
 * normalizePhoneForComparison("9876543210")     // => "9876543210"
 */
export function normalizePhoneForComparison(phone: string): string {
  if (!phone) return ""

  const digits = phone.replace(/\D/g, "")

  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1)
  }

  return digits.slice(-10)
}

