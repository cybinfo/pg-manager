import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export async function POST(request: NextRequest) {
  try {
    const { userId, newEmail, tenantId } = await request.json()

    if (!userId || !newEmail) {
      return NextResponse.json(
        { error: "userId and newEmail are required" },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      )
    }

    // Check if new email is already in use by another user
    const { data: existingUser } = await supabaseAdmin
      .from("user_profiles")
      .select("user_id")
      .eq("email", newEmail)
      .neq("user_id", userId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already in use by another account" },
        { status: 409 }
      )
    }

    // Update auth.users email using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (authError) {
      console.error("Error updating auth.users email:", authError)
      return NextResponse.json(
        { error: `Failed to update auth email: ${authError.message}` },
        { status: 500 }
      )
    }

    // Update user_profiles email
    const { error: profileError } = await supabaseAdmin
      .from("user_profiles")
      .update({ email: newEmail })
      .eq("user_id", userId)

    if (profileError) {
      console.error("Error updating user_profiles email:", profileError)
      // Don't fail completely, auth email is already updated
    }

    // Update tenants email if tenantId provided
    if (tenantId) {
      const { error: tenantError } = await supabaseAdmin
        .from("tenants")
        .update({ email: newEmail })
        .eq("id", tenantId)

      if (tenantError) {
        console.error("Error updating tenants email:", tenantError)
        // Don't fail completely
      }
    }

    return NextResponse.json({
      success: true,
      message: "Email updated successfully across all tables",
    })
  } catch (error) {
    console.error("Error in update-user-email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
