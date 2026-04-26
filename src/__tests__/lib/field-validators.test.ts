import {
  requiredField,
  requiredSelect,
  requiredAmount,
  optionalAmount,
  requiredDate,
  requiredPhone,
  optionalEmail,
  requiredPositiveInt,
} from '@/lib/validation/field-validators'

describe('requiredField', () => {
  const validate = requiredField('Name')

  it('returns null for a non-empty string', () => {
    expect(validate('Alice')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
    expect(validate('')?.error).toContain('Name')
  })

  it('returns error for whitespace-only string', () => {
    expect(validate('   ')?.isValid).toBe(false)
  })

  it('returns error for null', () => {
    expect(validate(null)?.isValid).toBe(false)
  })

  it('returns error for undefined', () => {
    expect(validate(undefined)?.isValid).toBe(false)
  })

  it('includes label in error message', () => {
    const v = requiredField('Tenant Name')
    expect(v('')?.error).toBe('Tenant Name is required')
  })
})

describe('requiredSelect', () => {
  const validate = requiredSelect('Property')

  it('returns null when a value is selected', () => {
    expect(validate('prop_123')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
  })

  it('returns error for undefined', () => {
    expect(validate(undefined)?.isValid).toBe(false)
  })

  it('returns error for null', () => {
    expect(validate(null)?.isValid).toBe(false)
  })

  it('error message references the select label', () => {
    expect(validate('')?.error).toContain('property')
  })
})

describe('requiredAmount', () => {
  const validate = requiredAmount('Rent')

  it('returns null for valid positive amount', () => {
    expect(validate('1000')).toBeNull()
  })

  it('returns null for decimal amount', () => {
    expect(validate('99.99')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
    expect(validate('')?.error).toContain('required')
  })

  it('returns error for zero', () => {
    expect(validate('0')?.isValid).toBe(false)
    expect(validate('0')?.error).toContain('greater than zero')
  })

  it('returns error for negative amount', () => {
    expect(validate('-100')?.isValid).toBe(false)
  })

  it('returns error for non-numeric string', () => {
    expect(validate('abc')?.isValid).toBe(false)
  })

  it('uses default label "Amount" when none provided', () => {
    expect(requiredAmount()('')?.error).toContain('Amount')
  })

  it('uses custom label in error', () => {
    expect(validate('')?.error).toContain('Rent')
  })
})

describe('optionalAmount', () => {
  const validate = optionalAmount('Deposit')

  it('returns null when empty (optional)', () => {
    expect(validate('')).toBeNull()
    expect(validate(null)).toBeNull()
    expect(validate(undefined)).toBeNull()
  })

  it('returns null for valid positive amount', () => {
    expect(validate('500')).toBeNull()
  })

  it('returns null for zero (allowed for optional)', () => {
    expect(validate('0')).toBeNull()
  })

  it('returns error for negative amount', () => {
    expect(validate('-50')?.isValid).toBe(false)
    expect(validate('-50')?.error).toContain('negative')
  })

  it('returns error for non-numeric string', () => {
    expect(validate('abc')?.isValid).toBe(false)
  })
})

describe('requiredDate', () => {
  const validate = requiredDate('Join Date')

  it('returns null for a date string', () => {
    expect(validate('2024-01-15')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
    expect(validate('')?.error).toContain('required')
  })

  it('returns error for undefined', () => {
    expect(validate(undefined)?.isValid).toBe(false)
  })

  it('uses provided label in error', () => {
    expect(validate('')?.error).toContain('Join Date')
  })
})

describe('requiredPhone', () => {
  const validate = requiredPhone()

  it('returns null for valid 10-digit number', () => {
    expect(validate('9876543210')).toBeNull()
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
    expect(validate('')?.error).toContain('required')
  })

  it('returns error for 9-digit number', () => {
    expect(validate('987654321')?.isValid).toBe(false)
    expect(validate('987654321')?.error).toContain('10 digits')
  })

  it('returns error for 11-digit number', () => {
    expect(validate('98765432100')?.isValid).toBe(false)
  })

  it('returns error for non-numeric characters', () => {
    expect(validate('98765abcde')?.isValid).toBe(false)
  })

  it('returns error for number with spaces', () => {
    expect(validate('9876 543210')?.isValid).toBe(false)
  })

  it('uses custom label in error', () => {
    const v = requiredPhone('Mobile')
    expect(v('')?.error).toContain('Mobile')
  })
})

describe('optionalEmail', () => {
  const validate = optionalEmail()

  it('returns null when empty (optional)', () => {
    expect(validate('')).toBeNull()
    expect(validate(null)).toBeNull()
    expect(validate(undefined)).toBeNull()
  })

  it('returns null for valid email', () => {
    expect(validate('user@example.com')).toBeNull()
  })

  it('returns error for email without @', () => {
    expect(validate('userexample.com')?.isValid).toBe(false)
    expect(validate('userexample.com')?.error).toContain('invalid')
  })

  it('returns error for email without domain', () => {
    expect(validate('user@')?.isValid).toBe(false)
  })

  it('uses custom label in error', () => {
    const v = optionalEmail('Work Email')
    expect(v('bad')?.error).toContain('Work Email')
  })
})

describe('requiredPositiveInt', () => {
  const validate = requiredPositiveInt('Beds')

  it('returns null for positive integer string', () => {
    expect(validate('1')).toBeNull()
    expect(validate('10')).toBeNull()
  })

  it('returns null for positive integer number', () => {
    expect(validate(5)).toBeNull()
  })

  it('returns error for zero', () => {
    expect(validate('0')?.isValid).toBe(false)
    expect(validate('0')?.error).toContain('at least 1')
  })

  it('returns error for negative number', () => {
    expect(validate('-1')?.isValid).toBe(false)
  })

  it('returns error for empty string', () => {
    expect(validate('')?.isValid).toBe(false)
    expect(validate('')?.error).toContain('required')
  })

  it('returns error for non-numeric string', () => {
    expect(validate('abc')?.isValid).toBe(false)
  })

  it('includes label in error', () => {
    expect(validate('')?.error).toContain('Beds')
  })
})
