/**
 * Standardized API Response Utilities
 *
 * This module provides consistent response formats across all API routes.
 *
 * Standard Response Format:
 * Success: { success: true, data?: T, message?: string }
 * Error:   { success: false, error: { code: string, message: string, details?: unknown } }
 */

import { NextResponse } from "next/server"

// Standard error codes
export const ErrorCodes = {
  // Authentication errors (401)
  UNAUTHORIZED: "UNAUTHORIZED",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  INVALID_TOKEN: "INVALID_TOKEN",

  // Authorization errors (403)
  FORBIDDEN: "FORBIDDEN",
  INSUFFICIENT_PERMISSIONS: "INSUFFICIENT_PERMISSIONS",
  WORKSPACE_ACCESS_DENIED: "WORKSPACE_ACCESS_DENIED",

  // Validation errors (400)
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",
  INVALID_INPUT: "INVALID_INPUT",

  // Not found errors (404)
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  TENANT_NOT_FOUND: "TENANT_NOT_FOUND",

  // Rate limiting errors (429)
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors (500)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",

  // Business logic errors (400/422)
  BUSINESS_LOGIC_ERROR: "BUSINESS_LOGIC_ERROR",
  WORKFLOW_ERROR: "WORKFLOW_ERROR",
  CSRF_VALIDATION_FAILED: "CSRF_VALIDATION_FAILED",
} as const

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes]

// Response types
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data?: T
  message?: string
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    hasMore?: boolean
  }
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: ErrorCode | string
    message: string
    details?: unknown
  }
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// Success response helpers
export function apiSuccess<T>(
  data?: T,
  options?: {
    message?: string
    meta?: ApiSuccessResponse["meta"]
    status?: number
    headers?: HeadersInit
  }
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
  }

  if (data !== undefined) {
    response.data = data
  }

  if (options?.message) {
    response.message = options.message
  }

  if (options?.meta) {
    response.meta = options.meta
  }

  return NextResponse.json(response, {
    status: options?.status || 200,
    headers: options?.headers,
  })
}

// Error response helpers
export function apiError(
  code: ErrorCode | string,
  message: string,
  options?: {
    details?: unknown
    status?: number
    headers?: HeadersInit
  }
): NextResponse<ApiErrorResponse> {
  const status = options?.status || getStatusFromCode(code)

  const errorObj: ApiErrorResponse["error"] = {
    code,
    message,
  }

  if (options?.details) {
    errorObj.details = options.details
  }

  return NextResponse.json(
    {
      success: false,
      error: errorObj,
    },
    {
      status,
      headers: options?.headers,
    }
  )
}

// Map error codes to HTTP status codes
function getStatusFromCode(code: string): number {
  if (code === ErrorCodes.UNAUTHORIZED ||
      code === ErrorCodes.SESSION_EXPIRED ||
      code === ErrorCodes.INVALID_TOKEN) {
    return 401
  }

  if (code === ErrorCodes.FORBIDDEN ||
      code === ErrorCodes.INSUFFICIENT_PERMISSIONS ||
      code === ErrorCodes.WORKSPACE_ACCESS_DENIED) {
    return 403
  }

  if (code === ErrorCodes.NOT_FOUND ||
      code === ErrorCodes.RESOURCE_NOT_FOUND ||
      code === ErrorCodes.TENANT_NOT_FOUND) {
    return 404
  }

  if (code === ErrorCodes.TOO_MANY_REQUESTS ||
      code === ErrorCodes.RATE_LIMITED) {
    return 429
  }

  if (code === ErrorCodes.INTERNAL_ERROR ||
      code === ErrorCodes.DATABASE_ERROR ||
      code === ErrorCodes.SERVICE_UNAVAILABLE) {
    return 500
  }

  // Default to 400 for validation and business logic errors
  return 400
}

// Convenience methods for common responses

export function unauthorized(message = "Authentication required"): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.UNAUTHORIZED, message, { status: 401 })
}

export function forbidden(message = "Access denied"): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.FORBIDDEN, message, { status: 403 })
}

export function notFound(message = "Resource not found"): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.NOT_FOUND, message, { status: 404 })
}

export function badRequest(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.BAD_REQUEST, message, { status: 400, details })
}

export function validationError(message: string, details?: unknown): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.VALIDATION_ERROR, message, { status: 400, details })
}

export function rateLimited(
  message = "Too many requests. Please try again later.",
  retryAfter?: number,
  headers?: HeadersInit
): NextResponse<ApiErrorResponse> {
  const responseHeaders: Record<string, string> = {
    ...(headers as Record<string, string>),
  }

  if (retryAfter) {
    responseHeaders["Retry-After"] = String(retryAfter)
  }

  return apiError(ErrorCodes.TOO_MANY_REQUESTS, message, {
    status: 429,
    details: retryAfter ? { retryAfter } : undefined,
    headers: responseHeaders,
  })
}

export function internalError(
  message = "An unexpected error occurred",
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.INTERNAL_ERROR, message, { status: 500, details })
}

export function csrfError(message = "CSRF validation failed"): NextResponse<ApiErrorResponse> {
  return apiError(ErrorCodes.CSRF_VALIDATION_FAILED, message, { status: 403 })
}
