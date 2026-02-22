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
