import { NextRequest } from "next/server"
import { sendVerificationEmail } from "@/lib/email"
import crypto from "crypto"
import { z } from "zod"
import {
  apiSuccess,
  forbidden,
  internalError,
} from "@/lib/api-response"
import { withApiMiddleware, getAdminSupabaseClient } from "@/lib/api-middleware"
import { authLogger, extractErrorMeta } from "@/lib/logger"
import { CONTACT } from "@/lib/constants/contact"

const SendVerificationSchema = z.object({
  userId: z.string().uuid("Invalid user ID format"),
  email: z.string().email("Invalid email format"),
  userName: z.string().min(1, "User name must not be empty").optional(),
})

type SendVerificationBody = z.infer<typeof SendVerificationSchema>

export async function POST(request: NextRequest) {
  return withApiMiddleware(request, {
    requireAuth: true,
    requireCsrf: true,
    limiter: "auth",
    bodySchema: SendVerificationSchema,
  }, async (ctx) => {
    const { userId, email, userName } = ctx.body as SendVerificationBody

    // SEC-015: Validate that the authenticated user is requesting their own verification
    if (ctx.user.id !== userId) {
      return forbidden("You can only request verification for your own account")
    }

    // Additional security: verify the email matches the authenticated user's email
    if (ctx.user.email !== email) {
      return forbidden("Email does not match your account")
    }

    // Service role client for database operations (validated env vars)
    const supabaseAdmin = getAdminSupabaseClient()

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
      authLogger.error("Failed to create verification token", extractErrorMeta(tokenError))
      return internalError("Failed to create verification token")
    }

    // Build the verification URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || CONTACT.APP_URL
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
  })
}
