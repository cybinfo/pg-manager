/**
 * Indian Phone Number Validator
 *
 * Re-exported from @/lib/phone for backward compatibility.
 * New code should import directly from @/lib/phone.
 */
export { validateIndianMobile, formatIndianMobile } from "./phone"

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

// ============================================================================
// PASSWORD VALIDATION
// ============================================================================

interface ValidatePasswordOptions {
  /** Minimum length (default: 6) */
  minLength?: number
  /** Maximum length (default: 100) */
  maxLength?: number
  /** Require at least one uppercase letter */
  requireUppercase?: boolean
  /** Require at least one lowercase letter */
  requireLowercase?: boolean
  /** Require at least one number */
  requireNumber?: boolean
  /** Require at least one special character */
  requireSpecial?: boolean
}

interface PasswordValidationResult {
  isValid: boolean
  error: string | null
  strength: "weak" | "fair" | "good" | "strong"
}

/**
 * Validate password strength and requirements
 *
 * @example
 * const result = validatePassword("MyPass123!")
 * if (!result.isValid) {
 *   toast.error(result.error)
 * }
 */
export function validatePassword(
  password: string,
  options: ValidatePasswordOptions = {}
): PasswordValidationResult {
  const {
    minLength = 6,
    maxLength = 100,
    requireUppercase = false,
    requireLowercase = false,
    requireNumber = false,
    requireSpecial = false,
  } = options

  // Check length
  if (password.length < minLength) {
    return {
      isValid: false,
      error: `Password must be at least ${minLength} characters`,
      strength: "weak",
    }
  }

  if (password.length > maxLength) {
    return {
      isValid: false,
      error: `Password must be at most ${maxLength} characters`,
      strength: "weak",
    }
  }

  // Check requirements
  if (requireUppercase && !/[A-Z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one uppercase letter",
      strength: "weak",
    }
  }

  if (requireLowercase && !/[a-z]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one lowercase letter",
      strength: "weak",
    }
  }

  if (requireNumber && !/\d/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one number",
      strength: "weak",
    }
  }

  if (requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    return {
      isValid: false,
      error: "Password must contain at least one special character",
      strength: "weak",
    }
  }

  // Calculate strength
  let strength: "weak" | "fair" | "good" | "strong" = "weak"
  let score = 0

  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

  if (score >= 5) strength = "strong"
  else if (score >= 4) strength = "good"
  else if (score >= 2) strength = "fair"

  return { isValid: true, error: null, strength }
}

/**
 * Validate that password and confirm password match
 *
 * @example
 * const result = validatePasswordMatch(password, confirmPassword)
 * if (!result.isValid) {
 *   toast.error(result.error)
 * }
 */
export function validatePasswordMatch(
  password: string,
  confirmPassword: string
): { isValid: boolean; error: string | null } {
  if (password !== confirmPassword) {
    return { isValid: false, error: "Passwords do not match" }
  }
  return { isValid: true, error: null }
}

// ============================================================================
// REQUIRED FIELDS VALIDATION
// ============================================================================

type FieldValue = string | number | boolean | null | undefined

/**
 * Check if a value is considered "filled"
 */
function isFilled(value: FieldValue): boolean {
  if (value === null || value === undefined) return false
  if (typeof value === "string") return value.trim().length > 0
  if (typeof value === "number") return !isNaN(value)
  if (typeof value === "boolean") return true
  return false
}

/**
 * Validate that all required fields are filled
 *
 * @example
 * const result = validateRequired(
 *   { name: "John", email: "", phone: "123" },
 *   ["name", "email"]
 * )
 * if (!result.isValid) {
 *   toast.error(result.error) // "email is required"
 * }
 */
export function validateRequired<T extends Record<string, FieldValue>>(
  data: T,
  requiredFields: (keyof T)[],
  options: { errorMessage?: string; fieldLabels?: Record<keyof T, string> } = {}
): { isValid: boolean; error: string | null; missingFields: (keyof T)[] } {
  const { errorMessage, fieldLabels } = options
  const missing: (keyof T)[] = []

  for (const field of requiredFields) {
    if (!isFilled(data[field])) {
      missing.push(field)
    }
  }

  if (missing.length > 0) {
    const error =
      errorMessage ||
      (missing.length === 1
        ? `${fieldLabels?.[missing[0]] || String(missing[0])} is required`
        : "Please fill in all required fields")

    return { isValid: false, error, missingFields: missing }
  }

  return { isValid: true, error: null, missingFields: [] }
}

/**
 * Simple check if all required fields are present
 *
 * @example
 * if (!hasRequiredFields(formData, ["name", "email"])) {
 *   toast.error("Please fill in all required fields")
 *   return
 * }
 */
export function hasRequiredFields<T extends Record<string, FieldValue>>(
  data: T,
  requiredFields: (keyof T)[]
): boolean {
  return requiredFields.every((field) => isFilled(data[field]))
}
