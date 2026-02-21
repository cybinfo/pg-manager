import { NextRequest } from "next/server"
import { z } from "zod"
import { getTenantJourney } from "@/lib/services/journey.service"
import { EventCategoryType, EventCategory } from "@/types/journey.types"
import { validateTenantRequest } from "@/lib/api-middleware"
import {
  apiSuccess,
  apiError,
  badRequest,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"
import { validateQuery } from "@/lib/validation"
import { apiLogger } from "@/lib/logger"

// Valid category values for input validation
const VALID_CATEGORIES: Set<string> = new Set(Object.values(EventCategory))

// Zod schema for journey query parameters
const JourneyQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().int().min(1, "Limit must be at least 1").max(100, "Limit must be at most 100")),
  offset: z
    .string()
    .optional()
    .transform((val: string | undefined) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().int().min(0, "Offset must be non-negative")),
  categories: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val) return true
        const cats = val.split(",").map((c: string) => c.trim().toLowerCase())
        return cats.every((c: string) => VALID_CATEGORIES.has(c))
      },
      {
        message: `Invalid categories. Valid values are: ${Array.from(VALID_CATEGORIES).join(", ")}`,
      }
    ),
  from: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val) return true
        const date = new Date(val)
        return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(val)
      },
      { message: "Invalid 'from' date format. Use ISO 8601 format (YYYY-MM-DD)" }
    ),
  to: z
    .string()
    .optional()
    .refine(
      (val: string | undefined) => {
        if (!val) return true
        const date = new Date(val)
        return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}/.test(val)
      },
      { message: "Invalid 'to' date format. Use ISO 8601 format (YYYY-MM-DD)" }
    ),
  analytics: z.string().optional(),
  financial: z.string().optional(),
  insights: z.string().optional(),
  visitors: z.string().optional(),
}).refine(
  (data) => {
    if (data.from && data.to) {
      return new Date(data.from) <= new Date(data.to)
    }
    return true
  },
  { message: "'from' date must be before or equal to 'to' date" }
)

// Helper to validate UUID format
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
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
    const { id: tenantId } = await params

    // SECURITY: Rate limiting + tenant access validation
    const { success, response, tenant } = await validateTenantRequest(request, tenantId)
    if (!success || !tenant) return response!

    // Validate tenant ID format
    if (!isValidUUID(tenantId)) {
      return badRequest("Invalid tenant ID format")
    }

    // Validate query parameters with Zod schema
    const queryValidation = validateQuery(JourneyQuerySchema, request.nextUrl.searchParams)
    if (!queryValidation.success) return queryValidation.response

    const queryData = queryValidation.data
    const limit = queryData.limit
    const offset = queryData.offset

    // Parse categories from validated string
    let categories: EventCategoryType[] | undefined
    if (queryData.categories) {
      categories = queryData.categories.split(",").map((c: string) => c.trim().toLowerCase()) as EventCategoryType[]
    }

    const dateFrom = queryData.from || undefined
    const dateTo = queryData.to || undefined
    const includeAnalytics = queryData.analytics !== "false"
    const includeFinancial = queryData.financial !== "false"
    const includeInsights = queryData.insights !== "false"
    const includeVisitors = queryData.visitors !== "false"

    // Fetch journey data (use tenant's owner_id as workspace_id for proper data access)
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: tenant.owner_id,
      events_limit: limit,
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
