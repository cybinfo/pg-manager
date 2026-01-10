import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantJourney } from "@/lib/services/journey.service"
import { EventCategoryType } from "@/types/journey.types"

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
    const supabase = await createClient()

    // Verify authentication
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Please log in to access this resource" },
        { status: 401 }
      )
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get("limit") || "50")
    const offset = parseInt(searchParams.get("offset") || "0")
    const categoriesParam = searchParams.get("categories")
    const dateFrom = searchParams.get("from") || undefined
    const dateTo = searchParams.get("to") || undefined
    const includeAnalytics = searchParams.get("analytics") !== "false"
    const includeFinancial = searchParams.get("financial") !== "false"
    const includeInsights = searchParams.get("insights") !== "false"
    const includeVisitors = searchParams.get("visitors") !== "false"

    // Parse categories
    const categories = categoriesParam
      ? (categoriesParam.split(",") as EventCategoryType[])
      : undefined

    // Fetch journey data
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: user.id,
      events_limit: Math.min(limit, 100), // Cap at 100 events per request
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
      return NextResponse.json(
        { error: result.error?.code, message: result.error?.message },
        { status: result.error?.code === "NOT_FOUND" ? 404 : 500 }
      )
    }

    return NextResponse.json(result.data)
  } catch (error) {
    console.error("[Journey API] Unexpected error:", error)
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: "An unexpected error occurred" },
      { status: 500 }
    )
  }
}
