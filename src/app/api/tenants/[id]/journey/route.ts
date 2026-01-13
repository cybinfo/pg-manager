import { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantJourney } from "@/lib/services/journey.service"
import { EventCategoryType, EventCategory } from "@/types/journey.types"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import {
  apiSuccess,
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"
import { apiLogger } from "@/lib/logger"

// Valid category values for input validation
const VALID_CATEGORIES: Set<string> = new Set(Object.values(EventCategory))

// Helper to validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Helper to validate date format (ISO 8601)
function isValidISODate(str: string): boolean {
  const date = new Date(str)
  return !isNaN(date.getTime()) && str.match(/^\d{4}-\d{2}-\d{2}/) !== null
}

/**
 * GET /api/tenants/[id]/journey
 *
 * Fetches the complete journey data for a tenant including:
 * - Timeline events from multiple data sources
 * - Analytics metrics
 * - Financial summary
 * - Predictive insights
 * - Visitor linkage
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // SECURITY: Rate limiting - 100 requests per minute for API
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await apiLimiter.check(clientId)

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

    const { id: tenantId } = await params
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized("Please log in to access this resource")
    }

    // SECURITY: Verify user has access to this tenant's workspace
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, owner_id")
      .eq("id", tenantId)
      .single()

    if (tenantError || !tenant) {
      return notFound("Tenant not found")
    }

    // Check access: user must be owner, platform admin, or have staff context for this workspace
    const isOwner = tenant.owner_id === user.id

    if (!isOwner) {
      // Check if platform admin
      const { data: platformAdmin } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()

      if (!platformAdmin) {
        // Check if staff with access to this workspace
        const { data: staffContext } = await supabase
          .from("user_contexts")
          .select("id")
          .eq("user_id", user.id)
          .eq("workspace_id", tenant.owner_id)
          .eq("is_active", true)
          .single()

        if (!staffContext) {
          return forbidden("You do not have access to this tenant's data")
        }
      }
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams

    // Validate tenant ID format
    if (!isValidUUID(tenantId)) {
      return badRequest("Invalid tenant ID format")
    }

    // Validate and parse limit (1-100)
    const limitParam = searchParams.get("limit")
    const limit = limitParam ? parseInt(limitParam, 10) : 50
    if (isNaN(limit) || limit < 1 || limit > 100) {
      return badRequest("Limit must be a number between 1 and 100")
    }

    // Validate and parse offset (>= 0)
    const offsetParam = searchParams.get("offset")
    const offset = offsetParam ? parseInt(offsetParam, 10) : 0
    if (isNaN(offset) || offset < 0) {
      return badRequest("Offset must be a non-negative number")
    }

    // Validate and parse categories
    const categoriesParam = searchParams.get("categories")
    let categories: EventCategoryType[] | undefined

    if (categoriesParam) {
      const categoryList = categoriesParam.split(",").map(c => c.trim().toLowerCase())
      const invalidCategories = categoryList.filter(c => !VALID_CATEGORIES.has(c))

      if (invalidCategories.length > 0) {
        return badRequest(`Invalid categories: ${invalidCategories.join(", ")}. Valid values are: ${Array.from(VALID_CATEGORIES).join(", ")}`)
      }

      categories = categoryList as EventCategoryType[]
    }

    // Validate date parameters
    const dateFrom = searchParams.get("from") || undefined
    const dateTo = searchParams.get("to") || undefined

    if (dateFrom && !isValidISODate(dateFrom)) {
      return badRequest("Invalid 'from' date format. Use ISO 8601 format (YYYY-MM-DD)")
    }

    if (dateTo && !isValidISODate(dateTo)) {
      return badRequest("Invalid 'to' date format. Use ISO 8601 format (YYYY-MM-DD)")
    }

    if (dateFrom && dateTo && new Date(dateFrom) > new Date(dateTo)) {
      return badRequest("'from' date must be before or equal to 'to' date")
    }

    const includeAnalytics = searchParams.get("analytics") !== "false"
    const includeFinancial = searchParams.get("financial") !== "false"
    const includeInsights = searchParams.get("insights") !== "false"
    const includeVisitors = searchParams.get("visitors") !== "false"

    // Fetch journey data (use tenant's owner_id as workspace_id for proper data access)
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: tenant.owner_id,
      events_limit: limit, // Already validated to be 1-100
      events_offset: offset,
      event_categories: categories,
      date_from: dateFrom,
      date_to: dateTo,
      include_analytics: includeAnalytics,
      include_financial: includeFinancial,
      include_insights: includeInsights,
      include_visitors: includeVisitors,
    })

    if (!result.success) {
      const errorCode = result.error?.code || ErrorCodes.INTERNAL_ERROR
      const errorMessage = result.error?.message || "An unexpected error occurred"
      return apiError(errorCode, errorMessage, {
        status: errorCode === "NOT_FOUND" ? 404 : 500,
      })
    }

    return apiSuccess(result.data)
  } catch (error) {
    apiLogger.error("[Journey API] Unexpected error", { error: error instanceof Error ? error.message : String(error) })
    return internalError("An unexpected error occurred")
  }
}
