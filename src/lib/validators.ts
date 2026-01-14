/**
 * Indian Phone Number Validator
 * Handles +91, 91, 0, or direct 10-digit formats
 * Indian mobile numbers start with 6-9
 */

// Regex for Indian mobile: Optional +91/91/0 prefix + 10 digits starting with 6-9
const INDIAN_MOBILE_REGEX = /^(?:\+?91|0)?([6-9]\d{9})$/

/**
 * Validates an Indian mobile number
 * @param phone - Phone number to validate
 * @returns Object with isValid flag, normalized number, and error message
 */
export function validateIndianMobile(phone: string): {
  isValid: boolean
  normalized: string | null
  error: string | null
} {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, normalized: null, error: "Phone number is required" }
  }

  // Remove all spaces, dashes, and dots
  const cleaned = phone.replace(/[\s\-\.]/g, '')

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
    const firstDigit = cleaned.replace(/^(?:\+?91|0)/, '')[0]
    if (firstDigit && !['6', '7', '8', '9'].includes(firstDigit)) {
      return { isValid: false, normalized: null, error: "Indian mobile numbers must start with 6, 7, 8, or 9" }
    }
    return { isValid: false, normalized: null, error: "Invalid Indian mobile number format" }
  }

  // Return normalized format: +91XXXXXXXXXX
  const normalized = `+91${match[1]}`

  return { isValid: true, normalized, error: null }
}

/**
 * Formats an Indian mobile number for display
 * @param phone - Normalized phone number (+91XXXXXXXXXX)
 * @returns Formatted string like +91 98765 43210
 */
export function formatIndianMobile(phone: string): string {
  if (!phone) return ''

  // Remove +91 prefix for formatting
  const digits = phone.replace(/^\+91/, '')

  if (digits.length !== 10) return phone

  // Format as: +91 XXXXX XXXXX
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`
}

/**
 * Email Validator
 * RFC 5322 compliant with optional disposable domain blocklist
 */

// Common disposable email domains
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'tempmail.com', 'throwaway.email',
  '10minutemail.com', 'temp-mail.org', 'fakeinbox.com', 'trashmail.com',
  'yopmail.com', 'maildrop.cc', 'getairmail.com', 'dispostable.com',
])

// RFC 5322 simplified email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/

/**
 * Validates an email address
 * @param email - Email to validate
 * @param options - Validation options
 * @returns Object with isValid flag and error message
 */
export function validateEmail(
  email: string,
  options: { blockDisposable?: boolean } = {}
): {
  isValid: boolean
  error: string | null
} {
  if (!email || typeof email !== 'string') {
    return { isValid: false, error: "Email is required" }
  }

  const trimmed = email.trim().toLowerCase()

  if (!EMAIL_REGEX.test(trimmed)) {
    return { isValid: false, error: "Invalid email format" }
  }

  // Extract domain
  const domain = trimmed.split('@')[1]

  if (options.blockDisposable && DISPOSABLE_DOMAINS.has(domain)) {
    return { isValid: false, error: "Disposable email addresses are not allowed" }
  }

  return { isValid: true, error: null }
}

/**
 * PAN Card Validator (India)
 * Format: AAAAA1234A (5 letters + 4 digits + 1 letter)
 */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/

export function validatePAN(pan: string): {
  isValid: boolean
  error: string | null
} {
  if (!pan || typeof pan !== 'string') {
    return { isValid: false, error: "PAN is required" }
  }

  const cleaned = pan.toUpperCase().replace(/\s/g, '')

  if (!PAN_REGEX.test(cleaned)) {
    return { isValid: false, error: "Invalid PAN format. Expected: AAAAA1234A" }
  }

  return { isValid: true, error: null }
}

/**
 * Aadhaar Card Validator (India)
 * Format: 12-digit number
 */
const AADHAAR_REGEX = /^\d{12}$/

export function validateAadhaar(aadhaar: string): {
  isValid: boolean
  formatted: string | null
  error: string | null
} {
  if (!aadhaar || typeof aadhaar !== 'string') {
    return { isValid: false, formatted: null, error: "Aadhaar number is required" }
  }

  const cleaned = aadhaar.replace(/[\s\-]/g, '')

  if (!AADHAAR_REGEX.test(cleaned)) {
    if (cleaned.length !== 12) {
      return { isValid: false, formatted: null, error: "Aadhaar must be 12 digits" }
    }
    return { isValid: false, formatted: null, error: "Aadhaar must contain only digits" }
  }

  // Format as XXXX XXXX XXXX
  const formatted = `${cleaned.slice(0, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`

  return { isValid: true, formatted, error: null }
}

/**
 * Indian Pincode Validator
 * Format: 6 digits, first digit 1-9
 */
const PINCODE_REGEX = /^[1-9][0-9]{5}$/

export function validatePincode(pincode: string): {
  isValid: boolean
  error: string | null
} {
  if (!pincode || typeof pincode !== 'string') {
    return { isValid: false, error: "Pincode is required" }
  }

  const cleaned = pincode.replace(/\s/g, '')

  if (!PINCODE_REGEX.test(cleaned)) {
    if (cleaned.length !== 6) {
      return { isValid: false, error: "Pincode must be 6 digits" }
    }
    if (cleaned[0] === '0') {
      return { isValid: false, error: "Pincode cannot start with 0" }
    }
    return { isValid: false, error: "Invalid pincode format" }
  }

  return { isValid: true, error: null }
}

/**
 * GST Number Validator (India)
 * Format: 22AAAAA0000A1Z5 (15 characters)
 */
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[A-Z0-9]{1}Z[A-Z0-9]{1}$/

export function validateGST(gst: string): {
  isValid: boolean
  error: string | null
} {
  if (!gst || typeof gst !== 'string') {
    return { isValid: false, error: "GST number is required" }
  }

  const cleaned = gst.toUpperCase().replace(/\s/g, '')

  if (!GST_REGEX.test(cleaned)) {
    if (cleaned.length !== 15) {
      return { isValid: false, error: "GST number must be 15 characters" }
    }
    return { isValid: false, error: "Invalid GST number format" }
  }

  return { isValid: true, error: null }
}

/**
 * UUID Validator
 * Validates UUID v4 format (xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx)
 * Also accepts UUIDs without dashes
 */
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const UUID_NO_DASHES_REGEX = /^[0-9a-f]{32}$/i

export function validateUUID(uuid: string): {
  isValid: boolean
  normalized: string | null
  error: string | null
} {
  if (!uuid || typeof uuid !== 'string') {
    return { isValid: false, normalized: null, error: "UUID is required" }
  }

  const trimmed = uuid.trim().toLowerCase()

  // Check standard format with dashes
  if (UUID_REGEX.test(trimmed)) {
    return { isValid: true, normalized: trimmed, error: null }
  }

  // Check format without dashes and normalize
  if (UUID_NO_DASHES_REGEX.test(trimmed)) {
    const normalized = `${trimmed.slice(0, 8)}-${trimmed.slice(8, 12)}-${trimmed.slice(12, 16)}-${trimmed.slice(16, 20)}-${trimmed.slice(20)}`
    // Verify it matches UUID v4 pattern after normalization
    if (UUID_REGEX.test(normalized)) {
      return { isValid: true, normalized, error: null }
    }
  }

  // Provide specific error messages
  if (trimmed.length < 32) {
    return { isValid: false, normalized: null, error: "UUID is too short" }
  }
  if (trimmed.length > 36) {
    return { isValid: false, normalized: null, error: "UUID is too long" }
  }

  return { isValid: false, normalized: null, error: "Invalid UUID format" }
}

/**
 * Quick UUID check (non-strict, accepts any valid-looking UUID)
 * Useful for quick validation where strict v4 compliance isn't required
 */
const UUID_LOOSE_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidUUID(uuid: string): boolean {
  if (!uuid || typeof uuid !== 'string') return false
  return UUID_LOOSE_REGEX.test(uuid.trim())
}

/**
 * Date Range Validator
 * Validates that start date is before end date
 * Optionally validates against min/max bounds
 */
export function validateDateRange(
  startDate: string | Date,
  endDate: string | Date,
  options: {
    allowSameDay?: boolean
    minDate?: string | Date
    maxDate?: string | Date
    startLabel?: string
    endLabel?: string
  } = {}
): {
  isValid: boolean
  error: string | null
} {
  const {
    allowSameDay = true,
    minDate,
    maxDate,
    startLabel = "Start date",
    endLabel = "End date",
  } = options

  // Parse dates
  const start = startDate instanceof Date ? startDate : new Date(startDate)
  const end = endDate instanceof Date ? endDate : new Date(endDate)

  // Validate dates are valid
  if (isNaN(start.getTime())) {
    return { isValid: false, error: `${startLabel} is invalid` }
  }
  if (isNaN(end.getTime())) {
    return { isValid: false, error: `${endLabel} is invalid` }
  }

  // Compare dates (at day level for date-only comparison)
  const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())

  if (allowSameDay) {
    if (startDay > endDay) {
      return { isValid: false, error: `${startLabel} must be on or before ${endLabel.toLowerCase()}` }
    }
  } else {
    if (startDay >= endDay) {
      return { isValid: false, error: `${startLabel} must be before ${endLabel.toLowerCase()}` }
    }
  }

  // Validate against min/max bounds
  if (minDate) {
    const min = minDate instanceof Date ? minDate : new Date(minDate)
    if (!isNaN(min.getTime()) && startDay < min) {
      return { isValid: false, error: `${startLabel} cannot be before ${min.toLocaleDateString()}` }
    }
  }

  if (maxDate) {
    const max = maxDate instanceof Date ? maxDate : new Date(maxDate)
    if (!isNaN(max.getTime()) && endDay > max) {
      return { isValid: false, error: `${endLabel} cannot be after ${max.toLocaleDateString()}` }
    }
  }

  return { isValid: true, error: null }
}

/**
 * Single Date Validator
 * Validates a date string or Date object
 */
export function validateDate(
  date: string | Date | null | undefined,
  options: {
    required?: boolean
    minDate?: string | Date
    maxDate?: string | Date
    label?: string
  } = {}
): {
  isValid: boolean
  parsed: Date | null
  error: string | null
} {
  const { required = true, minDate, maxDate, label = "Date" } = options

  if (!date) {
    if (required) {
      return { isValid: false, parsed: null, error: `${label} is required` }
    }
    return { isValid: true, parsed: null, error: null }
  }

  const parsed = date instanceof Date ? date : new Date(date)

  if (isNaN(parsed.getTime())) {
    return { isValid: false, parsed: null, error: `${label} is invalid` }
  }

  if (minDate) {
    const min = minDate instanceof Date ? minDate : new Date(minDate)
    if (!isNaN(min.getTime()) && parsed < min) {
      return { isValid: false, parsed: null, error: `${label} cannot be before ${min.toLocaleDateString()}` }
    }
  }

  if (maxDate) {
    const max = maxDate instanceof Date ? maxDate : new Date(maxDate)
    if (!isNaN(max.getTime()) && parsed > max) {
      return { isValid: false, parsed: null, error: `${label} cannot be after ${max.toLocaleDateString()}` }
    }
  }

  return { isValid: true, parsed, error: null }
}

/**
 * Amount/Currency Validator
 * Validates monetary amounts with various constraints
 */
export function validateAmount(
  amount: number | string | null | undefined,
  options: {
    required?: boolean
    min?: number
    max?: number
    allowZero?: boolean
    allowNegative?: boolean
    maxDecimals?: number
    label?: string
  } = {}
): {
  isValid: boolean
  value: number | null
  error: string | null
} {
  const {
    required = true,
    min,
    max,
    allowZero = true,
    allowNegative = false,
    maxDecimals = 2,
    label = "Amount",
  } = options

  // Handle null/undefined
  if (amount === null || amount === undefined || amount === '') {
    if (required) {
      return { isValid: false, value: null, error: `${label} is required` }
    }
    return { isValid: true, value: null, error: null }
  }

  // Parse to number
  const value = typeof amount === 'string' ? parseFloat(amount.replace(/,/g, '')) : amount

  if (isNaN(value)) {
    return { isValid: false, value: null, error: `${label} must be a valid number` }
  }

  // Check negative
  if (!allowNegative && value < 0) {
    return { isValid: false, value: null, error: `${label} cannot be negative` }
  }

  // Check zero
  if (!allowZero && value === 0) {
    return { isValid: false, value: null, error: `${label} cannot be zero` }
  }

  // Check minimum
  if (min !== undefined && value < min) {
    return { isValid: false, value: null, error: `${label} must be at least ${min}` }
  }

  // Check maximum
  if (max !== undefined && value > max) {
    return { isValid: false, value: null, error: `${label} cannot exceed ${max}` }
  }

  // Check decimal places
  const decimalPart = value.toString().split('.')[1]
  if (decimalPart && decimalPart.length > maxDecimals) {
    return { isValid: false, value: null, error: `${label} cannot have more than ${maxDecimals} decimal places` }
  }

  return { isValid: true, value, error: null }
}

/**
 * Positive Amount Validator (convenience function)
 * Validates that an amount is positive (greater than zero)
 */
export function validatePositiveAmount(
  amount: number | string | null | undefined,
  label = "Amount"
): {
  isValid: boolean
  value: number | null
  error: string | null
} {
  return validateAmount(amount, {
    required: true,
    allowZero: false,
    allowNegative: false,
    label,
  })
}

/**
 * Non-negative Amount Validator (convenience function)
 * Validates that an amount is zero or positive
 */
export function validateNonNegativeAmount(
  amount: number | string | null | undefined,
  label = "Amount"
): {
  isValid: boolean
  value: number | null
  error: string | null
} {
  return validateAmount(amount, {
    required: true,
    allowZero: true,
    allowNegative: false,
    label,
  })
}

/**
 * Percentage Validator
 * Validates that a value is a valid percentage (0-100)
 */
export function validatePercentage(
  value: number | string | null | undefined,
  options: {
    required?: boolean
    allowDecimals?: boolean
    label?: string
  } = {}
): {
  isValid: boolean
  value: number | null
  error: string | null
} {
  const { required = true, allowDecimals = true, label = "Percentage" } = options

  const result = validateAmount(value, {
    required,
    min: 0,
    max: 100,
    allowZero: true,
    allowNegative: false,
    maxDecimals: allowDecimals ? 2 : 0,
    label,
  })

  if (!result.isValid) return result

  if (!allowDecimals && result.value !== null && !Number.isInteger(result.value)) {
    return { isValid: false, value: null, error: `${label} must be a whole number` }
  }

  return result
}
