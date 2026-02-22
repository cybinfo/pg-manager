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
