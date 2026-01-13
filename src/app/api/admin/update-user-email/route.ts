import { NextRequest } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { createClient as createServerClient } from "@/lib/supabase/server"
import { sensitiveLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import { validateCsrf } from "@/lib/csrf"
import {
  apiSuccess,
  apiError,
  unauthorized,
  forbidden,
  badRequest,
  internalError,
  csrfError,
  ErrorCodes,
} from "@/lib/api-response"

// Create admin client with service role key
function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for admin operations")
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: Rate limiting - 3 requests per minute for sensitive operations
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await sensitiveLimiter.check(clientId)

    if (!rateLimitResult.success) {
      return apiError(
        ErrorCodes.TOO_MANY_REQUESTS,
        "Rate limit exceeded. Please try again later.",
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

    // SECURITY: Verify authentication first
    const supabase = await createServerClient()
    const { data: { user: currentUser } } = await supabase.auth.getUser()

    if (!currentUser) {
      return unauthorized("Authentication required")
    }

    const { userId, newEmail, tenantId } = await request.json()

    if (!userId || !newEmail) {
      return badRequest("userId and newEmail are required")
    }

    // SECURITY: Get admin client after auth check
    const supabaseAdmin = getAdminClient()

    // SECURITY: Verify requester has permission to update this user's email
    // Must be either: 1) Platform admin, or 2) Owner of the tenant record
    const { data: platformAdmin } = await supabaseAdmin
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", currentUser.id)
      .single()

    const isPlatformAdmin = !!platformAdmin

    // If not platform admin, check if they own the tenant
    if (!isPlatformAdmin) {
      if (!tenantId) {
        return forbidden("Only platform admins can update user emails without tenant context")
      }

      // Check if current user owns the tenant record
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("owner_id")
        .eq("id", tenantId)
        .single()

      if (!tenant || tenant.owner_id !== currentUser.id) {
        return forbidden("You do not have permission to update this user's email")
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newEmail)) {
      return badRequest("Invalid email format")
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
        return internalError("Failed to update tenant email")
      }
    }

    // If user has owner/staff context, ONLY update tenants.email (done above)
    // Do NOT change their login credentials!
    if (hasOwnerOrStaffContext) {
      return apiSuccess(
        { loginEmailUpdated: false },
        { message: "Tenant record email updated. Login email unchanged (user has owner/staff access)." }
      )
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
      return apiError("CONFLICT", "Email is already in use by another account", { status: 409 })
    }

    // Update auth.users email using admin API
    const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { email: newEmail }
    )

    if (authError) {
      console.error("Error updating auth.users email:", authError)
      return internalError(`Failed to update auth email: ${authError.message}`)
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

    return apiSuccess(
      { loginEmailUpdated: true },
      { message: "Email updated successfully across all tables" }
    )
  } catch (error) {
    console.error("Error in update-user-email:", error)
    return internalError("Internal server error")
  }
}
