import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { authLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import { authLogger, extractErrorMeta } from "@/lib/logger"
import { validateCsrf } from "@/lib/csrf"
import {
  apiSuccess,
  apiError,
  badRequest,
  internalError,
  csrfError,
  ErrorCodes,
} from "@/lib/api-response"
import { transformJoin } from "@/lib/supabase/transforms"

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting - 5 requests per minute for auth operations
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await authLimiter.check(clientId)

    if (!rateLimitResult.success) {
      return apiError(
        ErrorCodes.TOO_MANY_REQUESTS,
        "Too many verification attempts. Please try again later.",
        {
          status: 429,
          details: { retryAfter: rateLimitResult.retryAfter },
          headers: rateLimitHeaders(rateLimitResult),
        }
      )
    }

    // SECURITY: CSRF validation for state-changing requests
    const csrfResult = validateCsrf(request)
    if (!csrfResult.valid) {
      return csrfError(csrfResult.error || "CSRF validation failed")
    }

    const { token } = await request.json()

    if (!token) {
      return badRequest("Missing token")
    }

    // Verify the token
    const { data, error } = await supabaseAdmin.rpc("verify_token", {
      p_token: token,
      p_type: "email",
    })

    if (error) {
      authLogger.error("Failed to verify token", extractErrorMeta(error))
      return internalError("Failed to verify token")
    }

    // The RPC returns a table, get the first row
    const result = transformJoin(data)

    if (!result?.success) {
      return badRequest(result?.message || "Invalid or expired token")
    }

    return apiSuccess(
      { email: result.value },
      { message: result.message }
    )
  } catch (error) {
    authLogger.error("Error in verify email", extractErrorMeta(error))
    return internalError("Internal server error")
  }
}
