import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantJourney } from "@/lib/services/journey.service"
import { renderToBuffer } from "@react-pdf/renderer"
import { TenantJourneyReportPDF, JourneyReportData } from "@/lib/pdf-journey-report"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"

/**
 * GET /api/tenants/[id]/journey-report
 *
 * Generates and returns a PDF report of the tenant's complete journey.
 * The PDF includes:
 * - Summary page with profile, scores, and financial overview
 * - Financial history (payments and bills)
 * - Interactions (stay history, transfers, complaints)
 * - Event timeline with visitor linkage
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
      return NextResponse.json(
        {
          error: "TOO_MANY_REQUESTS",
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: rateLimitResult.retryAfter,
        },
        {
          status: 429,
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

    // Fetch complete journey data for PDF (use tenant's owner_id as workspace_id)
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: tenant.owner_id,
      events_limit: 100, // Include more events for PDF
      events_offset: 0,
      include_analytics: true,
      include_financial: true,
      include_insights: true,
      include_visitors: true,
    })

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error?.code, message: result.error?.message },
        { status: result.error?.code === "NOT_FOUND" ? 404 : 500 }
      )
    }

    // Prepare data for PDF
    const reportData: JourneyReportData = {
      ...result.data,
      report_generated_by: user.email || undefined,
    }

    // Generate PDF buffer
    const pdfBuffer = await renderToBuffer(TenantJourneyReportPDF({ data: reportData }))

    // Create safe filename
    const tenantNameSlug = result.data.tenant_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `tenant-journey-${tenantNameSlug}-${dateStr}.pdf`

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer)

    // Return PDF as response
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[Journey Report API] Error generating PDF:", error)
    return NextResponse.json(
      { error: "PDF_GENERATION_FAILED", message: "Failed to generate journey report PDF" },
      { status: 500 }
    )
  }
}
