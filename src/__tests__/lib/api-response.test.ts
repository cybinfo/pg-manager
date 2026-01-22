/**
 * Tests for API response utilities
 */

import {
  ErrorCodes,
  apiSuccess,
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  validationError,
  rateLimited,
  internalError,
  csrfError,
} from '@/lib/api-response'

// Response body types for testing
interface SuccessBody {
  success: true
  data: unknown
  message?: string
  meta?: unknown
}

interface ErrorBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

// Helper to extract JSON body from NextResponse
async function getResponseBody(response: Response): Promise<SuccessBody | ErrorBody> {
  return response.json() as Promise<SuccessBody | ErrorBody>
}

// Type-safe helper for error responses
async function getErrorBody(response: Response): Promise<ErrorBody> {
  return response.json() as Promise<ErrorBody>
}

describe('API Response Utilities', () => {
  describe('apiSuccess', () => {
    it('returns success response with data', async () => {
      const response = apiSuccess({ id: 1, name: 'Test' })
      const body = await getResponseBody(response)

      expect(response.status).toBe(200)
      expect(body).toEqual({
        success: true,
        data: { id: 1, name: 'Test' },
      })
    })

    it('returns success response with message', async () => {
      const response = apiSuccess(null, { message: 'Operation completed' })
      const body = await getResponseBody(response)

      expect(body).toEqual({
        success: true,
        data: null,
        message: 'Operation completed',
      })
    })

    it('returns success response with meta', async () => {
      const response = apiSuccess([1, 2, 3], {
        meta: { page: 1, pageSize: 10, total: 100 },
      })
      const body = await getResponseBody(response)

      expect(body).toEqual({
        success: true,
        data: [1, 2, 3],
        meta: { page: 1, pageSize: 10, total: 100 },
      })
    })

    it('supports custom status codes', async () => {
      const response = apiSuccess({ created: true }, { status: 201 })
      expect(response.status).toBe(201)
    })

    it('handles undefined data', async () => {
      const response = apiSuccess()
      const body = await getResponseBody(response)

      expect(body).toEqual({ success: true })
    })
  })

  describe('apiError', () => {
    it('returns error response with code and message', async () => {
      const response = apiError(ErrorCodes.BAD_REQUEST, 'Invalid input')
      const body = await getResponseBody(response)

      expect(response.status).toBe(400)
      expect(body).toEqual({
        success: false,
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid input',
        },
      })
    })

    it('includes details when provided', async () => {
      const response = apiError(ErrorCodes.VALIDATION_ERROR, 'Validation failed', {
        details: { field: 'email', issue: 'invalid format' },
      })
      const body = await getResponseBody(response)

      expect(body).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          details: { field: 'email', issue: 'invalid format' },
        },
      })
    })

    it('maps error codes to correct HTTP status', async () => {
      expect(apiError(ErrorCodes.UNAUTHORIZED, 'test').status).toBe(401)
      expect(apiError(ErrorCodes.FORBIDDEN, 'test').status).toBe(403)
      expect(apiError(ErrorCodes.NOT_FOUND, 'test').status).toBe(404)
      expect(apiError(ErrorCodes.TOO_MANY_REQUESTS, 'test').status).toBe(429)
      expect(apiError(ErrorCodes.INTERNAL_ERROR, 'test').status).toBe(500)
    })

    it('allows status override', async () => {
      const response = apiError(ErrorCodes.BAD_REQUEST, 'test', { status: 422 })
      expect(response.status).toBe(422)
    })
  })

  describe('Convenience methods', () => {
    describe('unauthorized', () => {
      it('returns 401 with default message', async () => {
        const response = unauthorized()
        const body = await getResponseBody(response)

        expect(response.status).toBe(401)
        expect(body).toEqual({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
          },
        })
      })

      it('allows custom message', async () => {
        const response = unauthorized('Session expired')
        const body = await getErrorBody(response)

        expect(body.error.message).toBe('Session expired')
      })
    })

    describe('forbidden', () => {
      it('returns 403 with default message', async () => {
        const response = forbidden()
        const body = await getErrorBody(response)

        expect(response.status).toBe(403)
        expect(body.error.code).toBe('FORBIDDEN')
        expect(body.error.message).toBe('Access denied')
      })
    })

    describe('notFound', () => {
      it('returns 404 with default message', async () => {
        const response = notFound()
        const body = await getErrorBody(response)

        expect(response.status).toBe(404)
        expect(body.error.code).toBe('NOT_FOUND')
        expect(body.error.message).toBe('Resource not found')
      })

      it('allows custom message for specific resources', async () => {
        const response = notFound('Tenant not found')
        const body = await getErrorBody(response)

        expect(body.error.message).toBe('Tenant not found')
      })
    })

    describe('badRequest', () => {
      it('returns 400 with message and details', async () => {
        const response = badRequest('Invalid parameters', { field: 'amount' })
        const body = await getErrorBody(response)

        expect(response.status).toBe(400)
        expect(body.error.code).toBe('BAD_REQUEST')
        expect(body.error.details).toEqual({ field: 'amount' })
      })
    })

    describe('validationError', () => {
      it('returns 400 with validation details', async () => {
        const response = validationError('Validation failed', {
          errors: [{ field: 'email', message: 'Invalid email' }],
        })
        const body = await getErrorBody(response)

        expect(response.status).toBe(400)
        expect(body.error.code).toBe('VALIDATION_ERROR')
      })
    })

    describe('rateLimited', () => {
      it('returns 429 with default message', async () => {
        const response = rateLimited()
        const body = await getErrorBody(response)

        expect(response.status).toBe(429)
        expect(body.error.code).toBe('TOO_MANY_REQUESTS')
      })

      it('includes Retry-After header when provided', async () => {
        const response = rateLimited('Too many requests', 60)

        expect(response.headers.get('Retry-After')).toBe('60')
      })
    })

    describe('internalError', () => {
      it('returns 500 with default message', async () => {
        const response = internalError()
        const body = await getErrorBody(response)

        expect(response.status).toBe(500)
        expect(body.error.code).toBe('INTERNAL_ERROR')
        expect(body.error.message).toBe('An unexpected error occurred')
      })
    })

    describe('csrfError', () => {
      it('returns 403 for CSRF failures', async () => {
        const response = csrfError()
        const body = await getErrorBody(response)

        expect(response.status).toBe(403)
        expect(body.error.code).toBe('CSRF_VALIDATION_FAILED')
      })
    })
  })
})

describe('ErrorCodes', () => {
  it('has all expected error codes', () => {
    // Authentication
    expect(ErrorCodes.UNAUTHORIZED).toBe('UNAUTHORIZED')
    expect(ErrorCodes.SESSION_EXPIRED).toBe('SESSION_EXPIRED')

    // Authorization
    expect(ErrorCodes.FORBIDDEN).toBe('FORBIDDEN')
    expect(ErrorCodes.INSUFFICIENT_PERMISSIONS).toBe('INSUFFICIENT_PERMISSIONS')

    // Validation
    expect(ErrorCodes.BAD_REQUEST).toBe('BAD_REQUEST')
    expect(ErrorCodes.VALIDATION_ERROR).toBe('VALIDATION_ERROR')

    // Not found
    expect(ErrorCodes.NOT_FOUND).toBe('NOT_FOUND')
    expect(ErrorCodes.TENANT_NOT_FOUND).toBe('TENANT_NOT_FOUND')

    // Rate limiting
    expect(ErrorCodes.TOO_MANY_REQUESTS).toBe('TOO_MANY_REQUESTS')

    // Server errors
    expect(ErrorCodes.INTERNAL_ERROR).toBe('INTERNAL_ERROR')
    expect(ErrorCodes.DATABASE_ERROR).toBe('DATABASE_ERROR')
  })
})
