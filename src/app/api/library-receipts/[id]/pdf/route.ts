import { NextRequest } from "next/server"
import { LibraryReceiptPDF, type LibraryReceiptData } from "@/lib/pdf/library-receipt"
import { transformJoin } from "@/lib/supabase/transforms"
import { handlePdfGeneration, type PdfRouteConfig } from "@/lib/pdf/handler"
import { PAYMENT_METHODS } from "@/lib/status"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

const LIBRARY_PDF_CONFIG: PdfRouteConfig<LibraryReceiptData> = {
  table: "entity_payments",
  select: `
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
    membership:library_memberships!library_payments_membership_id_fkey(
      id,
      plan_name,
      hours_included,
      time_slot,
      start_date,
      end_date
    )
  `,
  permission: "library_payments.view",
  filenamePrefix: "library-receipt",

  buildReceiptData: (payment: AnyRecord, owner) => {
    const member = transformJoin(payment.member)
    const library = member ? transformJoin(member.library) : null
    const membership = transformJoin(payment.membership)

    const receiptNumber = payment.receipt_number ||
      `PYMT-LIB-${new Date(payment.payment_date).getFullYear()}-${String(payment.id).slice(0, 8).toUpperCase()}`

    return {
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
      paymentMethod: PAYMENT_METHODS[payment.payment_method] || payment.payment_method,
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
  },

  renderPdf: (data: LibraryReceiptData) => LibraryReceiptPDF({ data }),
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return handlePdfGeneration(request, params, LIBRARY_PDF_CONFIG)
}
