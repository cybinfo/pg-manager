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
