/**
 * Rate Limiting Utility
 *
 * Uses Upstash Redis (sliding window) in production when UPSTASH_REDIS_REST_URL is set.
 * Falls back to in-memory for local development and tests.
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

export interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number // Unix timestamp (seconds) when the limit resets
  retryAfter?: number // Seconds until retry is allowed
}

// ---- In-memory fallback (local dev / tests) ----

interface RateLimitEntry {
  count: number
  resetTime: number
}

const store = new Map<string, RateLimitEntry>()
const CLEANUP_INTERVAL = 60000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) store.delete(key)
  }
}

function createInMemoryLimiter(config: RateLimitConfig) {
  const { windowMs, max, prefix = "" } = config

  return {
    check: async (identifier: string): Promise<RateLimitResult> => {
      cleanup()
      const key = prefix ? `${prefix}:${identifier}` : identifier
      const now = Date.now()
      const entry = store.get(key)

      if (!entry || entry.resetTime < now) {
        const resetTime = now + windowMs
        store.set(key, { count: 1, resetTime })
        return { success: true, limit: max, remaining: max - 1, reset: Math.ceil(resetTime / 1000) }
      }

      entry.count++
      store.set(key, entry)
      const remaining = Math.max(0, max - entry.count)
      const reset = Math.ceil(entry.resetTime / 1000)

      if (entry.count > max) {
        return {
          success: false,
          limit: max,
          remaining: 0,
          reset,
          retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        }
      }

      return { success: true, limit: max, remaining, reset }
    },

    reset: async (identifier: string): Promise<void> => {
      const key = prefix ? `${prefix}:${identifier}` : identifier
      store.delete(key)
    },
  }
}

// ---- Upstash Redis-backed limiter (production) ----

type UpstashDuration = `${number} ${"ms" | "s" | "m" | "h" | "d"}`

function msToUpstashDuration(ms: number): UpstashDuration {
  if (ms % (24 * 60 * 60 * 1000) === 0) return `${ms / (24 * 60 * 60 * 1000)} d`
  if (ms % (60 * 60 * 1000) === 0) return `${ms / (60 * 60 * 1000)} h`
  if (ms % (60 * 1000) === 0) return `${ms / (60 * 1000)} m`
  if (ms % 1000 === 0) return `${ms / 1000} s`
  return `${ms} ms`
}

function createUpstashLimiter(config: RateLimitConfig) {
  const { windowMs, max, prefix = "rl" } = config

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ratelimit: any = null

  function getRatelimit() {
    if (ratelimit) return ratelimit
    // Lazy require so the module loads cleanly without env vars (tests use in-memory path)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Ratelimit } = require("@upstash/ratelimit")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Redis } = require("@upstash/redis")
    ratelimit = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(max, msToUpstashDuration(windowMs)),
      prefix,
      analytics: false,
    })
    return ratelimit
  }

  return {
    check: async (identifier: string): Promise<RateLimitResult> => {
      const rl = getRatelimit()
      const result = await rl.limit(identifier)
      const now = Date.now()
      // Upstash reset is a Unix timestamp in milliseconds; convert to seconds
      const resetSec = Math.ceil(result.reset / 1000)
      return {
        success: result.success,
        limit: result.limit,
        remaining: result.remaining,
        reset: resetSec,
        retryAfter: result.success ? undefined : Math.ceil((result.reset - now) / 1000),
      }
    },

    reset: async (identifier: string): Promise<void> => {
      // Upstash sliding window uses multiple keys internally; clear via pattern scan
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { Redis } = require("@upstash/redis")
      const redis = Redis.fromEnv()
      const keys: string[] = await redis.keys(`${prefix}:${identifier}*`)
      if (keys.length > 0) await redis.del(...keys)
    },
  }
}

// ---- Public API ----

const USE_UPSTASH = Boolean(
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
)

/**
 * Creates a rate limiter with the specified configuration.
 * Uses Upstash Redis when env vars are present, in-memory otherwise.
 */
export function createRateLimiter(config: RateLimitConfig) {
  return USE_UPSTASH ? createUpstashLimiter(config) : createInMemoryLimiter(config)
}

// Pre-configured rate limiters for different use cases

/** Strict limiter for auth endpoints (login, register, password reset) */
export const authLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 5,
  prefix: "auth",
})

/** Moderate limiter for admin endpoints */
export const adminLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 20,
  prefix: "admin",
})

/** Standard limiter for regular API endpoints */
export const apiLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 100,
  prefix: "api",
})

/** Strict limiter for sensitive operations (email update, password change) */
export const sensitiveLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 3,
  prefix: "sensitive",
})

/** Limiter for cron jobs */
export const cronLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 2,
  prefix: "cron",
})

/**
 * Get client identifier from request.
 * Uses X-Forwarded-For for proxied requests, falls back to IP.
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()

  const realIp = request.headers.get("x-real-ip")
  if (realIp) return realIp

  const cfIp = request.headers.get("cf-connecting-ip")
  if (cfIp) return cfIp

  // Fingerprint from headers when no IP is available
  const userAgent = request.headers.get("user-agent") || ""
  const acceptLang = request.headers.get("accept-language") || ""
  const acceptEnc = request.headers.get("accept-encoding") || ""
  const fingerprint = `${userAgent.slice(0, 50)}|${acceptLang.slice(0, 10)}|${acceptEnc.slice(0, 10)}`

  if (fingerprint.length > 3) {
    let hash = 0
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return `fp_${Math.abs(hash).toString(36)}`
  }

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

  const response = await handler()

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
