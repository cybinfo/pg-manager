/**
 * Tests for service layer types and helpers
 */

import {
  createServiceError,
  createSuccessResult,
  createErrorResult,
  ERROR_CODES,
} from '@/lib/services/types'

describe('Service Layer Helpers', () => {
  describe('createServiceError', () => {
    it('creates error with code and message', () => {
      const error = createServiceError(
        ERROR_CODES.VALIDATION_ERROR,
        'Invalid input'
      )

      expect(error).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: undefined,
        originalError: undefined,
      })
    })

    it('includes details when provided', () => {
      const error = createServiceError(
        ERROR_CODES.NOT_FOUND,
        'Tenant not found',
        { tenantId: '123' }
      )

      expect(error.details).toEqual({ tenantId: '123' })
    })

    it('includes original error when provided', () => {
      const originalError = new Error('Database connection failed')
      const error = createServiceError(
        ERROR_CODES.UNKNOWN_ERROR,
        'Operation failed',
        undefined,
        originalError
      )

      expect(error.originalError).toBe(originalError)
    })
  })

  describe('createSuccessResult', () => {
    it('creates success result with data', () => {
      const result = createSuccessResult({ id: 1, name: 'Test' })

      expect(result).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      })
    })

    it('handles null data', () => {
      const result = createSuccessResult(null)

      expect(result).toEqual({
        success: true,
        data: null,
      })
    })

    it('handles array data', () => {
      const result = createSuccessResult([1, 2, 3])

      expect(result).toEqual({
        success: true,
        data: [1, 2, 3],
      })
    })
  })

  describe('createErrorResult', () => {
    it('creates error result with service error', () => {
      const error = createServiceError(
        ERROR_CODES.PERMISSION_DENIED,
        'Access denied'
      )
      const result = createErrorResult(error)

      expect(result).toEqual({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Access denied',
          details: undefined,
          originalError: undefined,
        },
      })
    })
  })
})

describe('ERROR_CODES', () => {
  describe('General errors', () => {
    it('has UNKNOWN_ERROR', () => {
      expect(ERROR_CODES.UNKNOWN_ERROR).toBe('UNKNOWN_ERROR')
    })

    it('has VALIDATION_ERROR', () => {
      expect(ERROR_CODES.VALIDATION_ERROR).toBe('VALIDATION_ERROR')
    })

    it('has NOT_FOUND', () => {
      expect(ERROR_CODES.NOT_FOUND).toBe('NOT_FOUND')
    })

    it('has PERMISSION_DENIED', () => {
      expect(ERROR_CODES.PERMISSION_DENIED).toBe('PERMISSION_DENIED')
    })

    it('has DUPLICATE_ENTRY', () => {
      expect(ERROR_CODES.DUPLICATE_ENTRY).toBe('DUPLICATE_ENTRY')
    })
  })

  describe('Tenant errors', () => {
    it('has TENANT_HAS_DUES', () => {
      expect(ERROR_CODES.TENANT_HAS_DUES).toBe('TENANT_HAS_DUES')
    })

    it('has TENANT_ALREADY_EXITED', () => {
      expect(ERROR_CODES.TENANT_ALREADY_EXITED).toBe('TENANT_ALREADY_EXITED')
    })

    it('has ROOM_AT_CAPACITY', () => {
      expect(ERROR_CODES.ROOM_AT_CAPACITY).toBe('ROOM_AT_CAPACITY')
    })

    it('has ROOM_TRANSFER_INVALID', () => {
      expect(ERROR_CODES.ROOM_TRANSFER_INVALID).toBe('ROOM_TRANSFER_INVALID')
    })
  })

  describe('Payment errors', () => {
    it('has PAYMENT_EXCEEDS_DUE', () => {
      expect(ERROR_CODES.PAYMENT_EXCEEDS_DUE).toBe('PAYMENT_EXCEEDS_DUE')
    })

    it('has INVALID_PAYMENT_METHOD', () => {
      expect(ERROR_CODES.INVALID_PAYMENT_METHOD).toBe('INVALID_PAYMENT_METHOD')
    })

    it('has BILL_ALREADY_PAID', () => {
      expect(ERROR_CODES.BILL_ALREADY_PAID).toBe('BILL_ALREADY_PAID')
    })
  })

  describe('Refund errors', () => {
    it('has REFUND_EXCEEDS_BALANCE', () => {
      expect(ERROR_CODES.REFUND_EXCEEDS_BALANCE).toBe('REFUND_EXCEEDS_BALANCE')
    })

    it('has REFUND_ALREADY_PROCESSED', () => {
      expect(ERROR_CODES.REFUND_ALREADY_PROCESSED).toBe('REFUND_ALREADY_PROCESSED')
    })
  })

  describe('Exit clearance errors', () => {
    it('has EXIT_ALREADY_INITIATED', () => {
      expect(ERROR_CODES.EXIT_ALREADY_INITIATED).toBe('EXIT_ALREADY_INITIATED')
    })

    it('has PENDING_DUES', () => {
      expect(ERROR_CODES.PENDING_DUES).toBe('PENDING_DUES')
    })
  })

  describe('Workflow errors', () => {
    it('has WORKFLOW_STEP_FAILED', () => {
      expect(ERROR_CODES.WORKFLOW_STEP_FAILED).toBe('WORKFLOW_STEP_FAILED')
    })

    it('has WORKFLOW_CANCELLED', () => {
      expect(ERROR_CODES.WORKFLOW_CANCELLED).toBe('WORKFLOW_CANCELLED')
    })
  })

  describe('Approval errors', () => {
    it('has APPROVAL_EXPIRED', () => {
      expect(ERROR_CODES.APPROVAL_EXPIRED).toBe('APPROVAL_EXPIRED')
    })

    it('has APPROVAL_ALREADY_PROCESSED', () => {
      expect(ERROR_CODES.APPROVAL_ALREADY_PROCESSED).toBe('APPROVAL_ALREADY_PROCESSED')
    })
  })

  describe('Concurrency errors', () => {
    it('has CONCURRENT_MODIFICATION', () => {
      expect(ERROR_CODES.CONCURRENT_MODIFICATION).toBe('CONCURRENT_MODIFICATION')
    })
  })
})
