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

    // SECURITY CHECK: Does this user have owner or staff contexts?
    // If so, we should NOT update auth.users.email or user_profiles.email
    // because that would affect their owner/staff login!
    const { data: contexts } = await supabaseAdmin
      .from("user_contexts")
      .select("context_type")
      .eq("user_id", userId)

    const hasOwnerOrStaffContext = contexts?.some(
      (ctx) => ctx.context_type === "owner" || ctx.context_type === "staff"
    )

    // Always update tenants email (the record) if tenantId provided
    if (tenantId) {
      const { error: tenantError } = await supabaseAdmin
        .from("tenants")
        .update({ email: newEmail })
        .eq("id", tenantId)

      if (tenantError) {
        console.error("Error updating tenants email:", tenantError)
        return NextResponse.json(
          { error: "Failed to update tenant email" },
          { status: 500 }
        )
      }
    }

    // If user has owner/staff context, ONLY update tenants.email (done above)
    // Do NOT change their login credentials!
    if (hasOwnerOrStaffContext) {
      return NextResponse.json({
        success: true,
        message: "Tenant record email updated. Login email unchanged (user has owner/staff access).",
        loginEmailUpdated: false,
      })
    }

    // User is ONLY a tenant, safe to update login credentials

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

    return NextResponse.json({
      success: true,
      message: "Email updated successfully across all tables",
      loginEmailUpdated: true,
    })
  } catch (error) {
    console.error("Error in update-user-email:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
