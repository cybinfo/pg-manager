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
