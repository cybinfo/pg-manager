import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { LibraryReceiptPDF, type LibraryReceiptData } from "@/lib/library-pdf-receipt"
import { createContentDisposition, sanitizeFilename } from "@/lib/format"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import {
  apiError,
  unauthorized,
  forbidden,
  notFound,
  internalError,
  ErrorCodes,
} from "@/lib/api-response"
import { transformJoin } from "@/lib/supabase/transforms"

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
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return unauthorized()
    }

    // Fetch library payment with related data
    const { data: payment, error: paymentError } = await supabase
      .from("library_payments")
      .select(`
        *,
        member:library_members!library_payments_member_id_fkey(
          id,
          name,
          phone,
          email,
          member_code,
          library:libraries(
            id,
            name,
            address,
            city
          )
        ),
        membership:library_memberships(
          id,
          plan_name,
          hours_included,
          time_slot,
          start_date,
          end_date
        )
      `)
      .eq("id", id)
      .single()

    if (paymentError || !payment) {
      return notFound("Payment not found")
    }

    // Check access: Owner or Staff with permission
    const isOwner = payment.owner_id === user.id

    let isAuthorizedStaff = false
    if (!isOwner) {
      // Get user's context for this workspace
      const { data: userContext } = await supabase
        .from("user_contexts")
        .select("id, context_type")
        .eq("user_id", user.id)
        .eq("workspace_id", payment.workspace_id)
        .eq("is_active", true)
        .single()

      if (userContext?.context_type === "staff") {
        // Check staff permissions
        const { data: permissions } = await (supabase.rpc as Function)("get_user_permissions", {
          p_user_id: user.id,
          p_workspace_id: payment.workspace_id,
        })

        if (permissions && Array.isArray(permissions) && permissions.includes("library_payments.view")) {
          isAuthorizedStaff = true
        }
      }
    }

    if (!isOwner && !isAuthorizedStaff) {
      return forbidden("Access denied")
    }

    // Fetch owner details
    const { data: owner } = await supabase
      .from("owners")
      .select("name, phone, email, business_name")
      .eq("id", payment.owner_id)
      .single()

    // Transform nested data
    const member = transformJoin(payment.member)
    const library = member ? transformJoin(member.library) : null
    const membership = transformJoin(payment.membership)

    // Generate receipt number
    const receiptNumber = payment.receipt_number ||
      `LIB-${new Date(payment.payment_date).getFullYear()}-${String(payment.id).slice(0, 8).toUpperCase()}`

    // Prepare receipt data
    const receiptData: LibraryReceiptData = {
      receiptNumber,
      paymentDate: payment.payment_date,
      memberName: member?.name || "Unknown",
      memberPhone: member?.phone || "",
      memberEmail: member?.email || undefined,
      memberCode: member?.member_code || undefined,
      libraryName: library?.name || "Library",
      libraryAddress: library?.address
        ? `${library.address}${library.city ? `, ${library.city}` : ""}`
        : undefined,
      amount: Number(payment.amount),
      paymentMethod: formatPaymentMethod(payment.payment_method),
      paymentType: payment.payment_type,
      paymentReference: payment.payment_reference || undefined,
      subscription: membership ? {
        planName: membership.plan_name,
        hoursIncluded: membership.hours_included || undefined,
        timeSlot: membership.time_slot || undefined,
        startDate: membership.start_date,
        endDate: membership.end_date,
      } : undefined,
      ownerName: owner?.business_name || owner?.name || "Library Owner",
      ownerPhone: owner?.phone || undefined,
      ownerEmail: owner?.email || undefined,
      notes: payment.notes || undefined,
    }

    // Generate PDF
    const pdfElement = LibraryReceiptPDF({ data: receiptData })
    const pdfBuffer = await renderToBuffer(pdfElement)

    // Return PDF response with sanitized filename
    const safeReceiptNumber = sanitizeFilename(receiptNumber)
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": createContentDisposition(`library-receipt-${safeReceiptNumber}.pdf`),
      },
    })
  } catch (error) {
    console.error("Error generating library PDF:", error)
    return internalError("Failed to generate PDF")
  }
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    card: "Card",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    paytm: "Paytm",
    other: "Other",
  }
  return methods[method] || method
}
