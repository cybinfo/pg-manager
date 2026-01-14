/**
 * Rate Limiting Utility
 *
 * Implements sliding window rate limiting for API protection.
 * Uses in-memory storage by default, can be swapped to Redis for distributed deployments.
 *
 * Usage:
 *   const limiter = createRateLimiter({ windowMs: 60000, max: 10 })
 *   const result = await limiter.check(identifier)
 *   if (!result.success) { return Response 429 }
 */

interface RateLimitConfig {
  /** Time window in milliseconds */
  windowMs: number
  /** Maximum requests per window */
  max: number
  /** Optional key prefix for namespacing */
  prefix?: string
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp when the limit resets
  retryAfter?: number // Seconds until retry is allowed
}

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// NOTE: This works for single-instance deployments
// For multi-instance/serverless, use Redis or Upstash
const store = new Map<string, RateLimitEntry>()

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL = 60000 // 1 minute
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return

  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}

/**
 * Creates a rate limiter with the specified configuration
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { windowMs, max, prefix = "" } = config

  return {
    /**
     * Check if a request should be allowed
     * @param identifier - Unique identifier (IP, user ID, API key, etc.)
     */
    check: async (identifier: string): Promise<RateLimitResult> => {
      cleanup()

      const key = prefix ? `${prefix}:${identifier}` : identifier
      const now = Date.now()
      const entry = store.get(key)

      // If no entry or window expired, create new entry
      if (!entry || entry.resetTime < now) {
        const resetTime = now + windowMs
        store.set(key, { count: 1, resetTime })
        return {
          success: true,
          limit: max,
          remaining: max - 1,
          reset: Math.ceil(resetTime / 1000),
        }
      }

      // Increment count
      entry.count++
      store.set(key, entry)

      const remaining = Math.max(0, max - entry.count)
      const reset = Math.ceil(entry.resetTime / 1000)

      if (entry.count > max) {
        const retryAfter = Math.ceil((entry.resetTime - now) / 1000)
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset,
          retryAfter,
        }
      }

      return {
        success: true,
        limit: max,
        remaining,
        reset,
      }
    },

    /**
     * Reset the rate limit for an identifier
     */
    reset: async (identifier: string): Promise<void> => {
      const key = prefix ? `${prefix}:${identifier}` : identifier
      store.delete(key)
    },
  }
}

// Pre-configured rate limiters for different use cases

/** Strict limiter for auth endpoints (login, register, password reset) */
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  prefix: "auth",
})

/** Moderate limiter for admin endpoints */
export const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 requests per minute
  prefix: "admin",
})

/** Standard limiter for regular API endpoints */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  prefix: "api",
})

/** Strict limiter for sensitive operations (email update, password change) */
export const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 requests per minute
  prefix: "sensitive",
})

/** Limiter for cron jobs */
export const cronLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 2, // 2 requests per minute (crons shouldn't hit more than once)
  prefix: "cron",
})

/**
 * Get client identifier from request
 * Uses X-Forwarded-For for proxied requests, falls back to IP
 * SEC-002: Improved fallback to generate unique identifier from request fingerprint
 */
export function getClientIdentifier(request: Request): string {
  // Check for forwarded IP (from proxy/load balancer)
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) {
    // Take the first IP in the chain (original client)
    return forwarded.split(",")[0].trim()
  }

  // Check for real IP header (Cloudflare, etc.)
  const realIp = request.headers.get("x-real-ip")
  if (realIp) {
    return realIp
  }

  // Check for CF-Connecting-IP (Cloudflare specific)
  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) {
    return cfIp
  }

  // SEC-002: Generate fingerprint from available headers when no IP available
  // This creates a somewhat unique identifier for rate limiting purposes
  const userAgent = request.headers.get("user-agent") || ""
  const acceptLang = request.headers.get("accept-language") || ""
  const acceptEnc = request.headers.get("accept-encoding") || ""

  // Create a simple hash-like string from available headers
  // This isn't cryptographically secure but provides differentiation for rate limiting
  const fingerprint = `${userAgent.slice(0, 50)}|${acceptLang.slice(0, 10)}|${acceptEnc.slice(0, 10)}`

  // If we have some fingerprint data, use it with prefix
  if (fingerprint.length > 3) {
    // Simple string-based hash for consistent identifier
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return `fp_${Math.abs(hash).toString(36)}`
  }

  // Ultimate fallback - should rarely happen in real requests
  return `unknown_${Date.now().toString(36)}`
}

/**
 * Creates rate limit response headers
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  const headers: HeadersInit = {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
  }

  if (result.retryAfter) {
    headers["Retry-After"] = result.retryAfter.toString()
  }

  return headers
}

/**
 * Helper to apply rate limiting to an API route
 */
export async function withRateLimit(
  request: Request,
  limiter: ReturnType<typeof createRateLimiter>,
  handler: () => Promise<Response>
): Promise<Response> {
  const identifier = getClientIdentifier(request)
  const result = await limiter.check(identifier)

  if (!result.success) {
    return new Response(
      JSON.stringify({
        error: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: result.retryAfter,
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...rateLimitHeaders(result),
        },
      }
    )
  }

  // Execute the handler and add rate limit headers to response
  const response = await handler()

  // Clone response to add headers
  const newHeaders = new Headers(response.headers)
  Object.entries(rateLimitHeaders(result)).forEach(([key, value]) => {
    newHeaders.set(key, value)
  })

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  })
}
