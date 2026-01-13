import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sendVerificationEmail } from "@/lib/email"
import crypto from "crypto"
import { authLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import { validateCsrf } from "@/lib/csrf"
import {
  apiSuccess,
  apiError,
  badRequest,
  unauthorized,
  forbidden,
  internalError,
  csrfError,
  ErrorCodes,
} from "@/lib/api-response"

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
        "Too many verification emails requested. Please try again later.",
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

    // SEC-015: Verify authentication and token ownership
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return unauthorized("Authentication required to request verification email")
    }

    const { userId, email, userName } = await request.json()

    if (!userId || !email) {
      return badRequest("Missing required fields: userId and email are required")
    }

    // SEC-015: Validate that the authenticated user is requesting their own verification
    // Users can only request verification emails for their own account
    if (currentUser.id !== userId) {
      return forbidden("You can only request verification for your own account")
    }

    // Additional security: verify the email matches the authenticated user's email
    if (currentUser.email !== email) {
      return forbidden("Email does not match your account")
    }

    // Generate a secure random token
    const token = crypto.randomBytes(32).toString("hex")
    const expiresInMinutes = 60 // 1 hour

    // Create the verification token in the database
    const { error: tokenError } = await supabaseAdmin.rpc("create_verification_token", {
      p_user_id: userId,
      p_type: "email",
      p_value: email,
      p_token: token,
      p_expires_in_minutes: expiresInMinutes,
    })

    if (tokenError) {
      console.error("Failed to create verification token:", tokenError)
      return internalError("Failed to create verification token")
    }

    // Build the verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://managekar.com"
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`

    // Send the verification email
    const emailResult = await sendVerificationEmail({
      to: email,
      userName: userName || email.split("@")[0],
      email,
      verificationUrl,
      expiresInMinutes,
    })

    if (!emailResult.success) {
      return internalError(emailResult.error || "Failed to send verification email")
    }

    return apiSuccess(undefined, { message: "Verification email sent successfully" })
  } catch (error) {
    console.error("Error in send verification email:", error)
    return internalError("Internal server error")
  }
}
