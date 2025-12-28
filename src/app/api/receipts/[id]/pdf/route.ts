import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { renderToBuffer } from "@react-pdf/renderer"
import { RentReceiptPDF, type ReceiptData } from "@/lib/pdf-receipt"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Fetch payment with related data
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .select(`
        *,
        tenant:tenants(
          id,
          name,
          phone,
          email,
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
      .eq("owner_id", user.id)
      .single()

    if (paymentError || !payment) {
      return NextResponse.json(
        { error: "Payment not found" },
        { status: 404 }
      )
    }

    // Fetch owner details
    const { data: owner } = await supabase
      .from("owners")
      .select("name, phone, email, business_name")
      .eq("id", user.id)
      .single()

    // Transform nested data
    const tenant = Array.isArray(payment.tenant)
      ? payment.tenant[0]
      : payment.tenant
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
