import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { RentReceiptPDF, type ReceiptData } from "@/lib/pdf-receipt"
import { apiLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"

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

    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Check access: Owner, Staff with permission, or Tenant who owns this payment
    const isOwner = payment.owner_id === user.id

    // Check if user is the tenant for this payment
    const tenant = Array.isArray(payment.tenant) ? payment.tenant[0] : payment.tenant
    const isTenantOwner = tenant?.user_id === user.id

    // Check if user is staff with payments.view permission in this workspace
    let isAuthorizedStaff = false
    if (!isOwner && !isTenantOwner) {
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

        if (permissions && Array.isArray(permissions) && permissions.includes("payments.view")) {
          isAuthorizedStaff = true
        }
      }
    }

    if (!isOwner && !isTenantOwner && !isAuthorizedStaff) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      )
    }

    // Fetch owner details (use payment's owner_id, not current user)
    const { data: owner } = await supabase
      .from("owners")
      .select("name, phone, email, business_name")
      .eq("id", payment.owner_id)
      .single()

    // Transform nested data (tenant already extracted above)
    const room = tenant?.room
      ? Array.isArray(tenant.room)
        ? tenant.room[0]
        : tenant.room
      : null
    const property = room?.property
      ? Array.isArray(room.property)
        ? room.property[0]
        : room.property
      : null

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

    // Return PDF response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="receipt-${receiptNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    )
  }
}
