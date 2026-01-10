import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getTenantJourney } from "@/lib/services/journey.service"
import { renderToBuffer } from "@react-pdf/renderer"
import { TenantJourneyReportPDF, JourneyReportData } from "@/lib/pdf-journey-report"

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

    // Fetch complete journey data for PDF
    const result = await getTenantJourney({
      tenant_id: tenantId,
      workspace_id: user.id,
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
