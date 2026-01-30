import { NextRequest, NextResponse } from "next/server"
import { getTenantJourney } from "@/lib/services/journey.service"
import { createContentDisposition, sanitizeFilename } from "@/lib/format"
import { renderToBuffer } from "@react-pdf/renderer"
import { TenantJourneyReportPDF, JourneyReportData } from "@/lib/pdf-journey-report"
import { validateTenantRequest } from "@/lib/api-middleware"
import {
  apiError,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"

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

    // SECURITY: Rate limiting + tenant access validation
    const { success, response, tenant, user } = await validateTenantRequest(request, tenantId)
    if (!success || !tenant || !user) return response!

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
      const errorCode = result.error?.code || ErrorCodes.INTERNAL_ERROR
      const errorMessage = result.error?.message || "Failed to fetch journey data"
      return apiError(errorCode, errorMessage, {
        status: errorCode === "NOT_FOUND" ? 404 : 500,
      })
    }

    // Prepare data for PDF
    const reportData: JourneyReportData = {
      ...result.data,
      report_generated_by: user.email || undefined,
    }

    // API-006: Add timeout for PDF generation (30 seconds)
    const PDF_TIMEOUT_MS = 30000
    const pdfPromise = renderToBuffer(TenantJourneyReportPDF({ data: reportData }))
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("PDF generation timed out")), PDF_TIMEOUT_MS)
    })

    // Generate PDF buffer with timeout
    const pdfBuffer = await Promise.race([pdfPromise, timeoutPromise])

    // SEC-018: Create safe filename using sanitizeFilename utility
    // SEC-018: Use createContentDisposition for safe filename handling
    const tenantNameSlug = sanitizeFilename(result.data.tenant_name)
    const dateStr = new Date().toISOString().split("T")[0]
    const filename = `tenant-journey-${tenantNameSlug}-${dateStr}.pdf`

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const uint8Array = new Uint8Array(pdfBuffer)

    // Return PDF as response
    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": createContentDisposition(filename),
        "Content-Length": pdfBuffer.length.toString(),
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    })
  } catch (error) {
    console.error("[Journey Report API] Error generating PDF:", error)
    return internalError("Failed to generate journey report PDF")
  }
}
