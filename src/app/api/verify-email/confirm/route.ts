import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Service role client for database operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Missing token" },
        { status: 400 }
      )
    }

    // Verify the token
    const { data, error } = await supabaseAdmin.rpc("verify_token", {
      p_token: token,
      p_type: "email",
    })

    if (error) {
      console.error("Failed to verify token:", error)
      return NextResponse.json(
        { error: "Failed to verify token" },
        { status: 500 }
      )
    }

    // The RPC returns a table, get the first row
    const result = Array.isArray(data) ? data[0] : data

    if (!result?.success) {
      return NextResponse.json(
        { error: result?.message || "Invalid or expired token" },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      email: result.value,
      message: result.message,
    })
  } catch (error) {
    console.error("Error in verify email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
