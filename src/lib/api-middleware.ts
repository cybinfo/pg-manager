/**
 * API Middleware Utilities
 *
 * Centralized helpers for common API route patterns:
 * - Rate limiting
 * - Cron secret validation
 * - Admin Supabase client
 * - CSRF validation
 *
 * These eliminate repetitive code blocks in API routes.
 */

import { NextRequest } from "next/server"
import { createClient, SupabaseClient } from "@supabase/supabase-js"
import { getClientIdentifier, rateLimitHeaders, RateLimitResult } from "./rate-limit"
import { cronLimiter, apiLimiter, sensitiveLimiter, adminLimiter } from "./rate-limit"
import { timingSafeEqual, validateCsrf as validateCsrfToken } from "./csrf"
import { apiError, unauthorized, forbidden, notFound, ErrorCodes } from "./api-response"
import { createClient as createServerClient } from "./supabase/server"

// Re-export rate limiters for convenience
export { cronLimiter, apiLimiter, sensitiveLimiter, adminLimiter }

// ============================================================================
// TYPES
// ============================================================================

export interface RateLimitCheckResult {
  success: boolean
  response?: Response
  result?: RateLimitResult
}

export interface CronValidationResult {
  success: boolean
  response?: Response
}

export interface CsrfValidationResult {
  success: boolean
  response?: Response
}

// ============================================================================
// RATE LIMITING
// ============================================================================

/**
 * Check rate limit and return error response if exceeded
 *
 * @example
 * const { success, response } = await checkRateLimit(request, cronLimiter, "cron endpoint")
 * if (!success) return response!
 */
export async function checkRateLimit(
  request: Request,
  limiter: { check: (id: string) => Promise<RateLimitResult> },
  endpointDescription = "this endpoint"
): Promise<RateLimitCheckResult> {
  const clientId = getClientIdentifier(request)
  const result = await limiter.check(clientId)

  if (!result.success) {
    return {
      success: false,
      result,
      response: apiError(
        ErrorCodes.TOO_MANY_REQUESTS,
        `Rate limit exceeded for ${endpointDescription}`,
        {
          status: 429,
          details: { retryAfter: result.retryAfter },
          headers: rateLimitHeaders(result),
        }
      ),
    }
  }

  return { success: true, result }
}

/**
 * Check rate limit for cron endpoints (2 req/min)
 */
export async function checkCronRateLimit(request: Request): Promise<RateLimitCheckResult> {
  return checkRateLimit(request, cronLimiter, "cron endpoint")
}

/**
 * Check rate limit for API endpoints (100 req/min)
 */
export async function checkApiRateLimit(request: Request): Promise<RateLimitCheckResult> {
  return checkRateLimit(request, apiLimiter, "API endpoint")
}

/**
 * Check rate limit for sensitive endpoints (3 req/min)
 */
export async function checkSensitiveRateLimit(request: Request): Promise<RateLimitCheckResult> {
  return checkRateLimit(request, sensitiveLimiter, "sensitive endpoint")
}

/**
 * Check rate limit for admin endpoints (20 req/min)
 */
export async function checkAdminRateLimit(request: Request): Promise<RateLimitCheckResult> {
  return checkRateLimit(request, adminLimiter, "admin endpoint")
}

// ============================================================================
// CRON SECURITY
// ============================================================================

/**
 * Validate cron secret from Authorization header
 * Uses constant-time comparison to prevent timing attacks
 *
 * @example
 * const { success, response } = validateCronSecret(request)
 * if (!success) return response!
 */
export function validateCronSecret(request: Request): CronValidationResult {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return {
      success: false,
      response: apiError(
        ErrorCodes.INTERNAL_ERROR,
        "CRON_SECRET environment variable is not configured",
        { status: 500 }
      ),
    }
  }

  const authHeader = request.headers.get("authorization")
  const expectedSecret = `Bearer ${cronSecret}`

  if (!timingSafeEqual(authHeader, expectedSecret)) {
    return {
      success: false,
      response: unauthorized("Invalid cron secret"),
    }
  }

  return { success: true }
}

/**
 * Combined check for cron endpoints: rate limit + secret validation
 *
 * @example
 * const { success, response, supabase } = await validateCronRequest(request)
 * if (!success) return response!
 * // Use supabase admin client...
 */
export async function validateCronRequest(request: Request): Promise<{
  success: boolean
  response?: Response
  supabase?: SupabaseClient
}> {
  // Check rate limit first
  const rateLimitCheck = await checkCronRateLimit(request)
  if (!rateLimitCheck.success) {
    return { success: false, response: rateLimitCheck.response }
  }

  // Then validate secret
  const secretCheck = validateCronSecret(request)
  if (!secretCheck.success) {
    return { success: false, response: secretCheck.response }
  }

  // Return admin client for convenience
  return {
    success: true,
    supabase: getAdminSupabaseClient(),
  }
}

// ============================================================================
// SUPABASE ADMIN CLIENT
// ============================================================================

/**
 * Get Supabase admin client with service role key
 * Use this for cron jobs and admin operations that bypass RLS
 *
 * @example
 * const supabase = getAdminSupabaseClient()
 * const { data } = await supabase.from("tenants").select("*")
 */
export function getAdminSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
  }
  return createClient(supabaseUrl, serviceRoleKey)
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

/**
 * Validate CSRF token from request
 * Note: Requires NextRequest for cookie access
 *
 * @example
 * const { success, response } = validateCsrf(request)
 * if (!success) return response!
 */
export function validateCsrf(request: NextRequest): CsrfValidationResult {
  const csrfResult = validateCsrfToken(request)

  if (!csrfResult.valid) {
    return {
      success: false,
      response: apiError(
        ErrorCodes.VALIDATION_ERROR,
        csrfResult.error || "CSRF validation failed",
        { status: 403 }
      ),
    }
  }

  return { success: true }
}

// ============================================================================
// COMBINED VALIDATIONS
// ============================================================================

/**
 * Standard API validation: rate limit + optional CSRF
 * Use NextRequest when csrf: true, otherwise Request is sufficient
 *
 * @example
 * const { success, response } = await validateApiRequest(request, { csrf: true })
 * if (!success) return response!
 */
export async function validateApiRequest(
  request: Request | NextRequest,
  options: { csrf?: boolean; limiter?: { check: (id: string) => Promise<RateLimitResult> } } = {}
): Promise<{ success: boolean; response?: Response }> {
  const { csrf = false, limiter = apiLimiter } = options

  // Rate limit check
  const rateLimitCheck = await checkRateLimit(request, limiter)
  if (!rateLimitCheck.success) {
    return { success: false, response: rateLimitCheck.response }
  }

  // CSRF check if required (requires NextRequest)
  if (csrf) {
    const csrfCheck = validateCsrf(request as NextRequest)
    if (!csrfCheck.success) {
      return { success: false, response: csrfCheck.response }
    }
  }

  return { success: true }
}

/**
 * Sensitive API validation: strict rate limit + CSRF
 * Requires NextRequest for CSRF validation
 *
 * @example
 * const { success, response } = await validateSensitiveRequest(request)
 * if (!success) return response!
 */
export async function validateSensitiveRequest(
  request: NextRequest
): Promise<{ success: boolean; response?: Response }> {
  return validateApiRequest(request, { csrf: true, limiter: sensitiveLimiter })
}

// ============================================================================
// TENANT ACCESS AUTHORIZATION
// ============================================================================

export interface TenantAccessResult {
  success: boolean
  response?: Response
  tenant?: { id: string; owner_id: string }
  user?: { id: string; email?: string }
}

/**
 * Validate user has access to a tenant's data
 * Checks: authentication, tenant exists, access rights (owner/admin/staff)
 *
 * @example
 * const { success, response, tenant, user } = await checkTenantAccess(tenantId)
 * if (!success) return response!
 * // Use tenant and user...
 */
export async function checkTenantAccess(tenantId: string): Promise<TenantAccessResult> {
  const supabase = await createServerClient()

  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      success: false,
      response: unauthorized("Please log in to access this resource"),
    }
  }

  // Fetch tenant and verify it exists
  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .select("id, owner_id")
    .eq("id", tenantId)
    .single()

  if (tenantError || !tenant) {
    return {
      success: false,
      response: notFound("Tenant not found"),
    }
  }

  // Check access: user must be owner, platform admin, or staff with context
  const isOwner = tenant.owner_id === user.id

  if (!isOwner) {
    // Check if platform admin
    const { data: platformAdmin } = await supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", user.id)
      .single()

    if (!platformAdmin) {
      // Check if staff with access to this workspace
      const { data: staffContext } = await supabase
        .from("user_contexts")
        .select("id")
        .eq("user_id", user.id)
        .eq("workspace_id", tenant.owner_id)
        .eq("is_active", true)
        .single()

      if (!staffContext) {
        return {
          success: false,
          response: forbidden("You do not have access to this tenant's data"),
        }
      }
    }
  }

  return { success: true, tenant, user: { id: user.id, email: user.email } }
}

/**
 * Combined validation for tenant API endpoints: rate limit + tenant access
 *
 * @example
 * const { success, response, tenant, user } = await validateTenantRequest(request, tenantId)
 * if (!success) return response!
 */
export async function validateTenantRequest(
  request: Request,
  tenantId: string
): Promise<TenantAccessResult> {
  // Check rate limit first
  const rateLimitCheck = await checkApiRateLimit(request)
  if (!rateLimitCheck.success) {
    return { success: false, response: rateLimitCheck.response }
  }

  // Then check tenant access
  return checkTenantAccess(tenantId)
}
