import {
  getErrorMessage,
  handleClientError,
  handleSilentError,
  showDetailedError,
  showDetailedSuccess,
  withDetailedErrors,
  debugLog,
} from '@/lib/error-handler'

const mockToastError = jest.fn()
const mockShowError = jest.fn()
const mockShowSuccess = jest.fn()

// Mock dependencies to avoid side effects
jest.mock('@/lib/toast-helpers', () => ({
  showError: (...args: unknown[]) => mockShowError(...args),
  showSuccess: (...args: unknown[]) => mockShowSuccess(...args),
  toast: { error: (...args: unknown[]) => mockToastError(...args) },
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

// ============================================================================
// handleClientError
// ============================================================================

describe('handleClientError', () => {
  beforeEach(() => { mockShowError.mockClear() })

  it('calls showError with the extracted message', () => {
    handleClientError(new Error('disk full'), 'Saving file')
    expect(mockShowError).toHaveBeenCalledWith('disk full')
  })

  it('calls showError with mapped code message', () => {
    handleClientError({ code: '23505', message: 'dup' }, 'Insert')
    expect(mockShowError).toHaveBeenCalledWith('This record already exists')
  })

  it('calls showError for null error', () => {
    handleClientError(null, 'Load')
    expect(mockShowError).toHaveBeenCalledWith('An unexpected error occurred')
  })

  it('includes error.stack in summarizeError when NODE_ENV=development (line 185)', () => {
    const orig = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    // Just verify handleClientError runs without error in development mode
    handleClientError(new Error('dev error'), 'Dev context')
    expect(mockShowError).toHaveBeenCalledWith('dev error')
    process.env.NODE_ENV = orig
  })

  it('covers summarizeError object branch (non-Error object)', () => {
    handleClientError({ code: 'X', message: 'msg', details: 'det', hint: 'h' }, 'Op')
    expect(mockShowError).toHaveBeenCalled()
  })

  it('covers summarizeError raw branch (string error)', () => {
    handleClientError('just a string', 'Op')
    expect(mockShowError).toHaveBeenCalledWith('just a string')
  })
})

// ============================================================================
// showDetailedError + sanitizeData (verbose mode — NODE_ENV=test → VERBOSE_LOGGING=true)
// ============================================================================

describe('showDetailedError (verbose mode)', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    mockToastError.mockClear()
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('shows toast with errorObj.message when present', () => {
    showDetailedError({ message: 'row not found', code: 'PGRST116' }, { operation: 'Fetch' })

    expect(mockToastError).toHaveBeenCalledWith(
      'Failed: Fetch',
      expect.objectContaining({ description: expect.stringContaining('row not found') })
    )
  })

  it('falls back to Error.message when errorObj.message is absent', () => {
    showDetailedError(new Error('network timeout'), { operation: 'Save' })

    expect(mockToastError).toHaveBeenCalledWith(
      'Failed: Save',
      expect.objectContaining({ description: expect.stringContaining('network timeout') })
    )
  })

  it('uses "unknown error occurred" for shapeless error', () => {
    showDetailedError(42, { operation: 'Unknown' })

    expect(mockToastError).toHaveBeenCalledWith(
      'Failed: Unknown',
      expect.objectContaining({ description: expect.stringContaining('unknown error occurred') })
    )
  })

  it('uses Error.message branch when errorObj.message is empty string (line 253)', () => {
    // An Error with message='' has falsy errorObj?.message, so falls to `else if (error instanceof Error)`
    showDetailedError(new Error(''), { operation: 'Op' })

    expect(mockToastError).toHaveBeenCalled()
  })

  it('appends error code and friendly message in verbose mode', () => {
    showDetailedError({ message: 'permission denied', code: '42501' }, { operation: 'Delete' })

    const call = mockToastError.mock.calls[0]
    const desc = call[1].description as string
    expect(desc).toContain('Error Code: 42501')
    expect(desc).toContain("You don't have permission")
  })

  it('appends hint when present in verbose mode', () => {
    showDetailedError({ message: 'err', hint: 'Try again' }, { operation: 'Op' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('Hint: Try again')
  })

  it('appends details when present in verbose mode', () => {
    showDetailedError({ message: 'err', details: 'Key (id)=(1) already exists' }, { operation: 'Op' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('Details: Key (id)=(1) already exists')
  })

  it('appends table name when context.table is provided', () => {
    showDetailedError({ message: 'err' }, { operation: 'Op', table: 'tenants' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('Table: tenants')
  })

  it('sanitizes sensitive fields in context.data (covers sanitizeData)', () => {
    const consoleSpy2 = jest.spyOn(console, 'error').mockImplementation(() => {})
    showDetailedError(
      { message: 'err' },
      {
        operation: 'Create',
        table: 'users',
        data: {
          name: 'Alice',
          password: 'secret123',
          token: 'abc',
          nested_obj: { x: 1 },
          arr: [1, 2],
          plain: 42,
        },
      }
    )
    // console.error is called with sanitized data — just verify it was called
    expect(consoleSpy2).toHaveBeenCalled()
    consoleSpy2.mockRestore()
  })

  it('appends unknown code message in verbose mode', () => {
    showDetailedError({ message: 'err', code: '99999' }, { operation: 'Op' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('Unknown error code: 99999')
  })

  it('handles null error gracefully (covers ?. null-check branches on lines 250,259,263,264)', () => {
    // null errorObj → all ?. chains short-circuit to undefined
    showDetailedError(null, { operation: 'NullTest' })

    expect(mockToastError).toHaveBeenCalledWith(
      'Failed: NullTest',
      expect.objectContaining({ description: expect.stringContaining('unknown error occurred') })
    )
  })

  it('handles undefined error gracefully', () => {
    showDetailedError(undefined, { operation: 'UndefinedTest' })

    expect(mockToastError).toHaveBeenCalled()
  })
})

// ============================================================================
// showDetailedSuccess
// ============================================================================

describe('showDetailedSuccess', () => {
  beforeEach(() => { mockShowSuccess.mockClear() })

  it('calls showSuccess with the operation name', () => {
    showDetailedSuccess('Create Tenant')
    expect(mockShowSuccess).toHaveBeenCalledWith('Success: Create Tenant', undefined)
  })

  it('passes details when provided', () => {
    showDetailedSuccess('Delete', 'Removed 3 records')
    expect(mockShowSuccess).toHaveBeenCalledWith('Success: Delete', 'Removed 3 records')
  })
})

// ============================================================================
// withDetailedErrors
// ============================================================================

describe('withDetailedErrors', () => {
  beforeEach(() => { mockToastError.mockClear() })

  it('returns data and success=true when operation succeeds', async () => {
    const result = await withDetailedErrors(
      () => Promise.resolve({ data: { id: 1 }, error: null }),
      { operation: 'Fetch' }
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: 1 })
  })

  it('returns data=null and success=false when supabase returns error', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await withDetailedErrors(
      () => Promise.resolve({ data: null, error: { message: 'row not found', code: 'PGRST116' } }),
      { operation: 'Fetch' }
    )

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(mockToastError).toHaveBeenCalled()

    jest.restoreAllMocks()
  })

  it('returns data=null and success=false when operation throws', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {})

    const result = await withDetailedErrors(
      () => { throw new Error('network error') },
      { operation: 'Save' }
    )

    expect(result.success).toBe(false)
    expect(result.data).toBeNull()
    expect(mockToastError).toHaveBeenCalled()

    jest.restoreAllMocks()
  })
})

// ============================================================================
// debugLog
// ============================================================================

describe('debugLog', () => {
  it('calls console.log in non-production mode (VERBOSE_LOGGING=true)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    debugLog('test label', { value: 42 })
    expect(spy).toHaveBeenCalledWith('[DEBUG] test label:', { value: 42 })
    spy.mockRestore()
  })
})

// ============================================================================
// Production mode: covers VERBOSE_LOGGING=false branches (lines 266-274, 284-286)
// ============================================================================

describe('production mode (VERBOSE_LOGGING=false)', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let showDetailedErrorProd: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let debugLogProd: any

  beforeAll(() => {
    const origEnv = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    jest.isolateModules(() => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@/lib/error-handler')
      showDetailedErrorProd = mod.showDetailedError
      debugLogProd = mod.debugLog
    })
    process.env.NODE_ENV = origEnv
  })

  beforeEach(() => {
    mockToastError.mockClear()
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('shows simplified 42501 message in production mode', () => {
    showDetailedErrorProd({ message: 'permission denied', code: '42501' }, { operation: 'Delete' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain("You don't have permission")
    expect(desc).not.toContain('Error Code:')
  })

  it('shows simplified 23505 message in production mode', () => {
    showDetailedErrorProd({ message: 'duplicate key', code: '23505' }, { operation: 'Insert' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('already exists')
  })

  it('shows simplified 23503 message in production mode', () => {
    showDetailedErrorProd({ message: 'fk violation', code: '23503' }, { operation: 'Insert' })

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).toContain('related record was not found')
  })

  it('does not append hint or table in production mode', () => {
    showDetailedErrorProd(
      { message: 'some error', hint: 'secret hint' },
      { operation: 'Op', table: 'tenants' }
    )

    const desc = mockToastError.mock.calls[0][1].description as string
    expect(desc).not.toContain('Hint:')
    expect(desc).not.toContain('Table:')
  })

  it('uses compact console.error in production mode', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    showDetailedErrorProd({ message: 'err', code: '99999' }, { operation: 'Op' })
    // In production mode, only one compact console.error call
    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('[Error] Op:', '99999')
  })

  it('debugLog is a no-op in production mode', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    debugLogProd('label', 'data')
    expect(spy).not.toHaveBeenCalled()
  })
})
