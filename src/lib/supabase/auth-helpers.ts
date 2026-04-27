/**
 * Supabase Auth Helpers
 *
 * Centralized helpers for authentication operations.
 * Eliminates duplicate auth.getUser() patterns across 70+ files.
 *
 * @example
 * import { getCurrentUser, requireUser } from "@/lib/supabase/auth-helpers"
 *
 * // Get user without throwing
 * const user = await getCurrentUser()
 *
 * // Get user or return error response (for API routes)
 * const result = await requireUser()
 * if (!result.user) return result.response
 */

import { logger } from "@/lib/logger"
import { createClient as createBrowserClient } from "@supabase/supabase-js"
import { createClient } from "./client"
import { unauthorized, internalError } from "@/lib/api-response"
import type { User, SupabaseClient } from "@supabase/supabase-js"

/**
 * Create admin client with service role key
 * Only use server-side for privileged operations
 */
function createAdminClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    logger.error("Missing Supabase admin credentials")
    return null
  }

  return createBrowserClient(supabaseUrl, serviceRoleKey)
}

// ============================================================================
// TYPES
// ============================================================================

interface GetUserResult {
  user: User | null
  error: Error | null
}

interface RequireUserResult {
  user: User | null
  response: Response | null
}

interface RequireUserWithClientResult extends RequireUserResult {
  supabase: SupabaseClient | null
}

// ============================================================================
// CLIENT-SIDE HELPERS
// ============================================================================

/**
 * Get current user from client-side Supabase
 * Returns null if not authenticated (no error thrown)
 *
 * @example
 * const user = await getCurrentUser()
 * if (!user) {
 *   router.push("/login")
 *   return
 * }
 */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Get current user with error details
 *
 * @example
 * const { user, error } = await getCurrentUserWithError()
 * if (error) console.error("Auth error:", error)
 */
export async function getCurrentUserWithError(): Promise<GetUserResult> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// ============================================================================
// API ROUTE HELPERS
// ============================================================================

/**
 * Get current user or return unauthorized response
 * Use this in API routes to check authentication
 *
 * @example
 * export async function GET(request: Request) {
 *   const { user, response } = await requireUser()
 *   if (!user) return response
 *
 *   // Continue with authenticated user...
 * }
 */
export async function requireUser(): Promise<RequireUserResult> {
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      response: unauthorized("Authentication required"),
    }
  }

  return { user, response: null }
}

/**
 * Get current user and Supabase client or return unauthorized response
 * Combines auth check with client access for convenience
 *
 * @example
 * export async function GET(request: Request) {
 *   const { user, supabase, response } = await requireUserWithClient()
 *   if (!user || !supabase) return response!
 *
 *   const { data } = await supabase.from("table").select()
 * }
 */
export async function requireUserWithClient(): Promise<RequireUserWithClientResult> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return {
      user: null,
      supabase: null,
      response: unauthorized("Authentication required"),
    }
  }

  return { user, supabase, response: null }
}

// ============================================================================
// ADMIN CLIENT HELPERS
// ============================================================================

/**
 * Get admin client with user verification
 * Use this in API routes that need service role access
 *
 * @example
 * export async function POST(request: Request) {
 *   const { user, supabase, response } = await requireAdminClient()
 *   if (!user || !supabase) return response!
 *
 *   // Use admin client for privileged operations
 * }
 */
export async function requireAdminClient(): Promise<RequireUserWithClientResult> {
  // First verify user is authenticated
  const user = await getCurrentUser()

  if (!user) {
    return {
      user: null,
      supabase: null,
      response: unauthorized("Authentication required"),
    }
  }

  // Create admin client for privileged operations
  const supabaseAdmin = createAdminClient()

  if (!supabaseAdmin) {
    return {
      user: null,
      supabase: null,
      response: internalError("Server configuration error"),
    }
  }

  return { user, supabase: supabaseAdmin, response: null }
}

// ============================================================================
// STAFF PERMISSION HELPERS
// ============================================================================

/**
 * Check if a user has a specific permission in a workspace via staff role.
 * Centralizes the get_user_permissions RPC call used across API routes.
 *
 * @example
 * const hasAccess = await checkStaffPermission(supabase, user.id, workspaceId, "payments.view")
 * if (!hasAccess) return forbidden("Access denied")
 */
export async function checkStaffPermission(
  supabase: SupabaseClient,
  userId: string,
  workspaceId: string,
  requiredPermission: string
): Promise<boolean> {
  // Get user's context for this workspace
  const { data: userContext } = await supabase
    .from("user_contexts")
    .select("id, context_type")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .single()

  if (userContext?.context_type !== "staff") {
    return false
  }

  // Check staff permissions via RPC
  const { data: permissions } = await (supabase.rpc as unknown as (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>)("get_user_permissions", {
    p_user_id: userId,
    p_workspace_id: workspaceId,
  })

  return Array.isArray(permissions) && permissions.includes(requiredPermission)
}

// ============================================================================
// USER ID HELPERS
// ============================================================================

/**
 * Get current user ID only
 * Lighter weight than full user object when only ID is needed
 *
 * @example
 * const userId = await getCurrentUserId()
 * if (!userId) return unauthorized()
 */
export async function getCurrentUserId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.id ?? null
}

/**
 * Check if current user has a specific ID
 * Useful for ownership verification
 *
 * @example
 * if (!await isCurrentUser(resourceOwnerId)) {
 *   return unauthorized("You can only access your own resources")
 * }
 */
export async function isCurrentUser(userId: string): Promise<boolean> {
  const currentUserId = await getCurrentUserId()
  return currentUserId === userId
}
