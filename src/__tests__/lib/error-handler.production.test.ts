/**
 * Production-mode tests for showDetailedError (VERBOSE_LOGGING=false).
 * Must be in a separate file so the module loads with NODE_ENV=production.
 */

const mockToastErrorProd = jest.fn()
const mockShowErrorProd = jest.fn()
const mockShowSuccessProd = jest.fn()

jest.mock('@/lib/toast-helpers', () => ({
  showError: (...args: unknown[]) => mockShowErrorProd(...args),
  showSuccess: (...args: unknown[]) => mockShowSuccessProd(...args),
  toast: { error: (...args: unknown[]) => mockToastErrorProd(...args) },
}))
jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() },
}))

// Set NODE_ENV=production BEFORE requiring the module so VERBOSE_LOGGING=false
const origEnv = process.env.NODE_ENV
process.env.NODE_ENV = 'production'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showDetailedError, debugLog } = require('@/lib/error-handler') as {
  showDetailedError: (error: unknown, context: { operation: string; table?: string; data?: Record<string, unknown> }) => void
  debugLog: (label: string, data: unknown) => void
}

process.env.NODE_ENV = origEnv

describe('showDetailedError (production mode — VERBOSE_LOGGING=false)', () => {
  let consoleSpy: jest.SpyInstance

  beforeEach(() => {
    mockToastErrorProd.mockClear()
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleSpy.mockRestore()
  })

  it('shows simplified 42501 message without verbose detail (line 267-268)', () => {
    showDetailedError({ message: 'permission denied', code: '42501' }, { operation: 'Delete' })

    const desc = mockToastErrorProd.mock.calls[0][1].description as string
    expect(desc).toContain("You don't have permission")
    expect(desc).not.toContain('Error Code:')
  })

  it('shows simplified 23505 message in production mode (line 269-270)', () => {
    showDetailedError({ message: 'duplicate key', code: '23505' }, { operation: 'Insert' })

    const desc = mockToastErrorProd.mock.calls[0][1].description as string
    expect(desc).toContain('already exists')
  })

  it('shows simplified 23503 message in production mode (line 271-272)', () => {
    showDetailedError({ message: 'fk violation', code: '23503' }, { operation: 'Insert' })

    const desc = mockToastErrorProd.mock.calls[0][1].description as string
    expect(desc).toContain('related record was not found')
  })

  it('does not override description for unknown codes in production (else-if falls through)', () => {
    showDetailedError({ message: 'some error', code: '99999' }, { operation: 'Op' })

    // Description stays as-is (not overridden for unknown codes)
    const desc = mockToastErrorProd.mock.calls[0][1].description as string
    expect(desc).toBe('some error')
  })

  it('uses compact console.error in production mode (line 285)', () => {
    showDetailedError({ message: 'err', code: '99999' }, { operation: 'Op' })

    expect(consoleSpy).toHaveBeenCalledTimes(1)
    expect(consoleSpy).toHaveBeenCalledWith('[Error] Op:', '99999')
  })

  it('uses "unknown" when errorObj.code is absent in production console.error', () => {
    showDetailedError({ message: 'err' }, { operation: 'Op' })

    expect(consoleSpy).toHaveBeenCalledWith('[Error] Op:', 'unknown')
  })
})

describe('debugLog (production mode — no-op)', () => {
  it('does not call console.log when VERBOSE_LOGGING=false', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {})
    debugLog('label', 'data')
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
