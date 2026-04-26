import { getErrorMessage, handleSilentError } from '@/lib/error-handler'

// Mock dependencies to avoid side effects
jest.mock('@/lib/toast-helpers', () => ({
  showError: jest.fn(),
  showSuccess: jest.fn(),
  toast: jest.fn(),
}))
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}))

describe('getErrorMessage', () => {
  it('returns fallback for null', () => {
    expect(getErrorMessage(null)).toBe('An unexpected error occurred')
  })

  it('returns fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe('An unexpected error occurred')
  })

  it('returns the string directly when error is a string', () => {
    expect(getErrorMessage('custom error message')).toBe('custom error message')
  })

  it('extracts message from standard Error objects', () => {
    const err = new Error('Something went wrong')
    expect(getErrorMessage(err)).toBe('Something went wrong')
  })

  it('maps known Postgres error code 23505 (duplicate)', () => {
    const err = { code: '23505', message: 'duplicate key value violates unique constraint' }
    expect(getErrorMessage(err)).toBe('This record already exists')
  })

  it('maps known Postgres error code 23503 (FK violation)', () => {
    const err = { code: '23503', message: 'foreign key violation' }
    expect(getErrorMessage(err)).toBe('A required related record was not found')
  })

  it('maps known Postgres error code 42501 (permission denied)', () => {
    const err = { code: '42501', message: 'permission denied' }
    expect(getErrorMessage(err)).toBe("You don't have permission to perform this action")
  })

  it('maps PGRST116 (record not found)', () => {
    const err = { code: 'PGRST116', message: 'The result contains 0 rows' }
    expect(getErrorMessage(err)).toBe('Record not found')
  })

  it('maps PGRST301 (session expired)', () => {
    const err = { code: 'PGRST301', message: 'JWT expired' }
    expect(getErrorMessage(err)).toBe('Session expired — please log in again')
  })

  it('uses raw message for unmapped Postgres codes', () => {
    const err = { code: '99999', message: 'some unknown postgres error' }
    expect(getErrorMessage(err)).toBe('some unknown postgres error')
  })

  it('extracts message from our API error shape', () => {
    const err = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Name is required',
      },
    }
    expect(getErrorMessage(err)).toBe('Name is required')
  })

  it('falls back to details field when message is missing', () => {
    const err = { details: 'Additional context here' }
    expect(getErrorMessage(err)).toBe('Additional context here')
  })

  it('returns fallback for empty object', () => {
    expect(getErrorMessage({})).toBe('An unexpected error occurred')
  })

  it('handles Supabase error with message field', () => {
    const err = { message: 'Invalid email format', hint: 'Use a valid email' }
    expect(getErrorMessage(err)).toBe('Invalid email format')
  })

  it('returns fallback for unknown object shape with no useful fields', () => {
    expect(getErrorMessage({ someRandomKey: 'value' })).toBe('An unexpected error occurred')
  })
})

describe('handleSilentError', () => {
  it('returns the error message without throwing', () => {
    const err = new Error('network failure')
    const result = handleSilentError(err, 'Fetching data')
    expect(result).toBe('network failure')
  })

  it('returns mapped message for known Supabase codes', () => {
    const err = { code: '23505', message: 'duplicate' }
    const result = handleSilentError(err, 'Insert operation')
    expect(result).toBe('This record already exists')
  })

  it('returns fallback for null error', () => {
    const result = handleSilentError(null, 'Some context')
    expect(result).toBe('An unexpected error occurred')
  })
})
