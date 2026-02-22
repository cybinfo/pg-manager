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
