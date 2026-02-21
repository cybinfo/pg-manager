import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { RentReceiptPDF, type ReceiptData } from "@/lib/pdf-receipt"
import { createContentDisposition, sanitizeFilename } from "@/lib/format"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  badRequest,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"
import { transformJoin } from "@/lib/supabase/transforms"
import { checkStaffPermission } from "@/lib/supabase/auth-helpers"
import { isValidUUID } from "@/lib/validators"
import { apiLogger, extractErrorMeta } from "@/lib/logger"

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

    const { id } = await params

    // Validate UUID format before querying database
    if (!isValidUUID(id)) {
      return badRequest("Invalid payment ID format")
    }

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized()
    }

    // Fetch payment with related data (no owner filter - we'll check access below)
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(
          id,
          name,
          phone,
          email,
          user_id,
          room:rooms(
            room_number,
            property:properties(
              name,
              address
            )
          )
        )
      `)
      .eq("id", id)
      .single()

    if (paymentError || !payment) {
      return notFound("Payment not found")
    }

    // Check access: Owner, Staff with permission, or Tenant who owns this payment
    const isOwner = payment.owner_id === user.id

    // Check if user is the tenant for this payment
    const tenant = transformJoin(payment.tenant)
    const isTenantOwner = tenant?.user_id === user.id

    // Check if user is staff with payments.view permission in this workspace
    let isAuthorizedStaff = false
    if (!isOwner && !isTenantOwner) {
      isAuthorizedStaff = await checkStaffPermission(supabase, user.id, payment.workspace_id, "payments.view")
    }

    if (!isOwner && !isTenantOwner && !isAuthorizedStaff) {
      return forbidden("Access denied")
    }

    // Fetch owner details (use payment's owner_id, not current user)
    const { data: owner } = await supabase
      .from("owners")
      .select("name, phone, email, business_name")
      .eq("id", payment.owner_id)
      .single()

    // Transform nested data (tenant already extracted above)
    const room = tenant?.room ? transformJoin(tenant.room) : null
    const property = room?.property ? transformJoin(room.property) : null

    // Generate receipt number
    const receiptNumber = `RCP-${new Date(payment.payment_date).getFullYear()}-${String(payment.id).slice(0, 8).toUpperCase()}`

    // Prepare receipt data
    const receiptData: ReceiptData = {
      receiptNumber,
      paymentDate: payment.payment_date,
      tenantName: tenant?.name || "Unknown",
      tenantPhone: tenant?.phone || "",
      tenantEmail: tenant?.email || undefined,
      propertyName: property?.name || "Property",
      propertyAddress: property?.address || undefined,
      roomNumber: room?.room_number || "N/A",
      amount: Number(payment.amount),
      paymentMethod: payment.payment_method || "Cash",
      forPeriod: payment.for_month
        ? new Date(payment.for_month + "-01").toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })
        : undefined,
      description: payment.notes || undefined,
      ownerName: owner?.business_name || owner?.name || "Property Owner",
      ownerPhone: owner?.phone || undefined,
      ownerEmail: owner?.email || undefined,
    }

    // Generate PDF
    const pdfElement = RentReceiptPDF({ data: receiptData })
    const pdfBuffer = await renderToBuffer(pdfElement)

    // SEC-018: Return PDF response with sanitized filename using createContentDisposition
    const safeReceiptNumber = sanitizeFilename(receiptNumber)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": createContentDisposition(`receipt-${safeReceiptNumber}.pdf`),
      },
    })
  } catch (error) {
    apiLogger.error("Error generating PDF", extractErrorMeta(error))
    return internalError("Failed to generate PDF")
  }
}
