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
