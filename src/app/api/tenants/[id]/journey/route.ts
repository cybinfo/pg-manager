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

    // SECURITY: Verify user has access to this tenant's workspace
    const { data: tenant, error: tenantError } = await supabase
      .from("tenants")
      .select("id, owner_id")
      .eq("id", tenantId)
      .single()

    if (tenantError || !tenant) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Tenant not found" },
        { status: 404 }
      )
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
          return NextResponse.json(
            { error: "FORBIDDEN", message: "You do not have access to this tenant's data" },
            { status: 403 }
          )
        }
      }
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

    // Fetch journey data (use tenant's owner_id as workspace_id for proper data access)
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: tenant.owner_id,
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
