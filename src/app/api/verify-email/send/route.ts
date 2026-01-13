import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendVerificationEmail } from "@/lib/email"
import crypto from "crypto"
import { authLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"

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
      return NextResponse.json(
        {
          error: "TOO_MANY_REQUESTS",
          message: "Too many verification emails requested. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
          headers: rateLimitHeaders(rateLimitResult),
        }
      )
    }

    const { userId, email, userName } = await request.json()

    if (!userId || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
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
      return NextResponse.json(
        { error: "Failed to create verification token" },
        { status: 500 }
      )
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
      return NextResponse.json(
        { error: emailResult.error || "Failed to send verification email" },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in send verification email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
