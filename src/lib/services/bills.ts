/**
 * Bills Service
 *
 * Handles bill creation DB operations extracted from the new-bill page.
 * The page retains UI state, line-item management, and pro-rata calculation;
 * this service handles number generation, period parsing, and DB writes.
 */

import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { parseMonthIndex, startOfMonth, endOfMonth, getNowISO } from "@/lib/date-helpers"
import { logger, extractErrorMeta } from "@/lib/logger"

export interface BillLineItem {
  type: string
  description: string
  amount: number
}

export interface CreateBillParams {
  ownerId: string
  tenantId: string
  propertyId: string | undefined
  /** e.g. "January 2024" */
  forMonth: string
  billDate: string
  dueDate: string
  subtotal: number
  discountAmount: number
  previousBalance: number
  totalAmount: number
  lineItems: BillLineItem[]
  notes: string | null
  /** IDs of pending charges to link to the new bill */
  pendingChargeIds: string[]
  userId: string
}

/**
 * Generates a bill number, creates the bill record, and links any pending charges.
 * Returns the new bill's ID on success, or throws on DB error.
 */
export async function createBillWithCharges(params: CreateBillParams): Promise<{ billId: string }> {
  const {
    ownerId,
    tenantId,
    propertyId,
    forMonth,
    billDate,
    dueDate,
    subtotal,
    discountAmount,
    previousBalance,
    totalAmount,
    lineItems,
    notes,
    pendingChargeIds,
    userId,
  } = params

  const supabase = createClient()

  // Generate sequential bill number within the owner's account for this year
  const year = new Date(billDate).getFullYear()
  const { count } = await supabase
    .from("bills")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId)

  const billNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`

  // Parse "Month YYYY" → period_start / period_end
  const [monthName, yearStr] = forMonth.split(" ")
  const refDate = new Date(parseInt(yearStr), parseMonthIndex(monthName), 1)
  const periodStart = startOfMonth(refDate)
  const periodEnd = endOfMonth(refDate)

  const { data: bill, error: billError } = await (supabase
    .from("bills") as ReturnType<typeof supabase.from>)
    .insert(
      withCreatedBy({
        owner_id: ownerId,
        tenant_id: tenantId,
        property_id: propertyId,
        bill_number: billNumber,
        bill_date: billDate,
        due_date: dueDate,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        for_month: forMonth,
        subtotal,
        discount_amount: discountAmount,
        previous_balance: previousBalance,
        total_amount: totalAmount,
        balance_due: totalAmount,
        status: "pending",
        line_items: lineItems.map((item) => ({
          type: item.type,
          description: item.description,
          amount: item.amount,
        })),
        notes: notes || null,
        generated_at: getNowISO(),
      }, userId)
    )
    .select()
    .single()

  if (billError) {
    logger.error("Bills service: error creating bill", { detail: billError })
    throw billError
  }

  const billData = bill as { id: string }

  // Link any pending charges to the newly created bill
  if (pendingChargeIds.length > 0) {
    await (supabase
      .from("charges") as ReturnType<typeof supabase.from>)
      .update({ bill_id: billData.id } as Record<string, unknown>)
      .in("id", pendingChargeIds)
  }

  return { billId: billData.id }
}
