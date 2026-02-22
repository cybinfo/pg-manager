import { NextRequest } from "next/server"
import { RentReceiptPDF, type ReceiptData } from "@/lib/pdf/receipt"
import { transformJoin } from "@/lib/supabase/transforms"
import { handlePdfGeneration, type PdfRouteConfig } from "@/lib/pdf/handler"
import type { User } from "@supabase/supabase-js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

const PG_PDF_CONFIG: PdfRouteConfig<ReceiptData> = {
  table: "payments",
  select: `
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
  `,
  permission: "payments.view",
  filenamePrefix: "receipt",

  checkEndUserAccess: (payment: AnyRecord, user: User) => {
    const tenant = transformJoin(payment.tenant)
    return tenant?.user_id === user.id
  },

  buildReceiptData: (payment: AnyRecord, owner) => {
    const tenant = transformJoin(payment.tenant)
    const room = tenant?.room ? transformJoin(tenant.room) : null
    const property = room?.property ? transformJoin(room.property) : null

    const receiptNumber = `RCP-${new Date(payment.payment_date).getFullYear()}-${String(payment.id).slice(0, 8).toUpperCase()}`

    return {
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
  },

  renderPdf: (data: ReceiptData) => RentReceiptPDF({ data }),
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePdfGeneration(request, params, PG_PDF_CONFIG)
}
