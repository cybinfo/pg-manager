/**
 * Payment Workflow
 *
 * Handles payment recording with all cascading effects:
 * 1. Creates payment record
 * 2. Updates bill status (pending → partial → paid)
 * 3. Updates tenant advance balance (if advance payment)
 * 4. Generates receipt
 * 5. Logs audit events
 * 6. Sends notifications (receipt via email/WhatsApp)
 */

import { createClient } from "@/lib/supabase/client"
import {
  WorkflowDefinition,
  executeWorkflow,
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
  NotificationPayload,
} from "@/lib/services"
import { buildPaymentNotification } from "@/lib/services/notification.service"
import { createAuditEvent } from "@/lib/services/audit.service"
import { formatCurrency } from "@/lib/format"

// ============================================
// Types
// ============================================

export interface PaymentRecordInput {
  tenant_id: string
  property_id: string
  bill_id: string
  amount: number
  payment_date: string
  payment_method: "cash" | "upi" | "bank_transfer" | "card" | "cheque" | "other"
  reference_number?: string
  notes?: string
  is_advance?: boolean
  send_receipt?: boolean
}

export interface PaymentRecordOutput {
  payment_id: string
  receipt_number: string
  bill_status: string
  remaining_balance: number
  receipt_sent: boolean
}

export interface BulkPaymentInput {
  payments: Array<{
    tenant_id: string
    property_id: string
    bill_id: string
    amount: number
    payment_method: "cash" | "upi" | "bank_transfer" | "card" | "cheque" | "other"
  }>
  payment_date: string
  send_receipts?: boolean
}

export interface BulkPaymentOutput {
  total_payments: number
  total_amount: number
  payment_ids: string[]
}

// ============================================
// Payment Recording Workflow
// ============================================

export const paymentRecordWorkflow: WorkflowDefinition<PaymentRecordInput, PaymentRecordOutput> = {
  name: "payment_record",

  steps: [
    // Step 1: Validate bill and tenant
    {
      name: "validate",
      execute: async (context, input) => {
        // BL-011: Validate amount is positive
        if (input.amount <= 0) {
          return createErrorResult(
            createServiceError(ERROR_CODES.VALIDATION_ERROR, "Payment amount must be greater than zero")
          )
        }

        const supabase = createClient()

        // Get bill with tenant info
        const { data: bill, error: billError } = await supabase
          .from("bills")
          .select(`
            *,
            tenant:tenants(id, name, email, phone, user_id)
          `)
          .eq("id", input.bill_id)
          .single()

        if (billError || !bill) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Bill not found")
          )
        }

        // BL-014: Verify bill belongs to the specified tenant
        if (bill.tenant_id !== input.tenant_id) {
          return createErrorResult(
            createServiceError(ERROR_CODES.VALIDATION_ERROR, "Bill does not belong to the specified tenant")
          )
        }

        // Check if bill is already fully paid
        if (bill.status === "paid") {
          return createErrorResult(
            createServiceError(ERROR_CODES.BILL_ALREADY_PAID, "Bill is already fully paid")
          )
        }

        // Check if payment exceeds balance
        const remainingBalance = bill.balance_due || (bill.total_amount - (bill.paid_amount || 0))
        if (input.amount > remainingBalance && !input.is_advance) {
          return createErrorResult(
            createServiceError(
              ERROR_CODES.PAYMENT_EXCEEDS_DUE,
              `Payment amount (${formatCurrency(input.amount)}) exceeds remaining balance (${formatCurrency(remainingBalance)})`
            )
          )
        }

        return createSuccessResult({
          bill,
          tenant: bill.tenant,
          remaining_balance: remainingBalance,
        })
      },
    },

    // Step 2: Generate receipt number
    {
      name: "generate_receipt_number",
      execute: async (context, input) => {
        const supabase = createClient()

        // Get count of existing receipts
        const { count } = await supabase
          .from("payments")
          .select("*", { count: "exact", head: true })
          .eq("owner_id", context.actor_id)

        const receiptNumber = `RCP-${String((count || 0) + 1).padStart(6, "0")}`

        return createSuccessResult({ receipt_number: receiptNumber })
      },
    },

    // Step 3: Create payment record
    {
      name: "create_payment",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { receipt_number } = previousResults.generate_receipt_number as Record<string, unknown>

        const paymentData = {
          tenant_id: input.tenant_id,
          property_id: input.property_id,
          bill_id: input.bill_id,
          amount: input.amount,
          payment_date: input.payment_date,
          payment_method: input.payment_method,
          reference_number: input.reference_number || null,
          receipt_number,
          notes: input.notes || null,
          is_advance: input.is_advance || false,
          status: "completed",
          owner_id: context.actor_id,
          created_at: new Date().toISOString(),
        }

        const { data: payment, error } = await supabase
          .from("payments")
          .insert(paymentData)
          .select()
          .single()

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to create payment", { error })
          )
        }

        return createSuccessResult(payment)
      },
      rollback: async (context, input, stepResult) => {
        const supabase = createClient()
        const payment = stepResult as Record<string, unknown>
        if (payment?.id) {
          await supabase.from("payments").delete().eq("id", payment.id)
        }
      },
    },

    // Step 4: Update bill status
    {
      name: "update_bill",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { bill, remaining_balance } = previousResults.validate as Record<string, unknown>
        const billData = bill as Record<string, unknown>

        const newPaidAmount = (billData.paid_amount as number || 0) + input.amount
        const newBalance = (billData.total_amount as number) - newPaidAmount

        let newStatus = billData.status
        if (newBalance <= 0) {
          newStatus = "paid"
        } else if (newPaidAmount > 0) {
          newStatus = "partial"
        }

        const { error } = await supabase
          .from("bills")
          .update({
            paid_amount: newPaidAmount,
            balance_due: Math.max(0, newBalance),
            status: newStatus,
            last_payment_date: input.payment_date,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.bill_id)

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update bill", { error })
          )
        }

        return createSuccessResult({
          new_status: newStatus,
          new_paid_amount: newPaidAmount,
          new_balance: Math.max(0, newBalance),
        })
      },
    },

    // Step 5: Update tenant advance balance (if advance payment)
    {
      name: "update_advance_balance",
      execute: async (context, input, previousResults) => {
        if (!input.is_advance) {
          return createSuccessResult({ updated: false })
        }

        const supabase = createClient()

        // Get current advance balance
        const { data: tenant } = await supabase
          .from("tenants")
          .select("advance_balance")
          .eq("id", input.tenant_id)
          .single()

        const currentBalance = tenant?.advance_balance || 0
        const newBalance = currentBalance + input.amount

        const { error } = await supabase
          .from("tenants")
          .update({
            advance_balance: newBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.tenant_id)

        if (error) {
          console.warn("[PaymentRecord] Failed to update advance balance:", error)
        }

        return createSuccessResult({ updated: true, new_balance: newBalance })
      },
      optional: true,
    },

    // Step 6: Clear overdue status if bill was overdue
    {
      name: "clear_overdue",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const { bill } = previousResults.validate as Record<string, unknown>
        const billData = bill as Record<string, unknown>
        const billStatus = previousResults.update_bill as Record<string, unknown>

        // If bill was overdue and is now paid, check if we need to clear late fees
        if (billData.status === "overdue" && billStatus.new_status === "paid") {
          // Log that late payment was cleared
          console.log(`[PaymentRecord] Late payment cleared for bill ${input.bill_id}`)
        }

        return createSuccessResult({ checked: true })
      },
      optional: true,
    },
  ],

  // Audit events
  auditEvents: (context, input, results) => {
    const payment = results.create_payment as Record<string, unknown>
    const billResult = results.update_bill as Record<string, unknown>
    const { bill } = results.validate as Record<string, unknown>

    return [
      createAuditEvent(
        "payment",
        payment?.id as string,
        "create",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            amount: input.amount,
            payment_method: input.payment_method,
            bill_id: input.bill_id,
            receipt_number: payment?.receipt_number,
          },
        }
      ),
      createAuditEvent(
        "bill",
        input.bill_id,
        "update",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          before: { status: (bill as Record<string, unknown>)?.status, paid_amount: (bill as Record<string, unknown>)?.paid_amount },
          after: { status: billResult?.new_status, paid_amount: billResult?.new_paid_amount },
          metadata: { payment_id: payment?.id },
        }
      ),
    ]
  },

  // Notifications
  notifications: (context, input, results) => {
    if (!input.send_receipt) {
      return []
    }

    const payment = results.create_payment as Record<string, unknown>
    const { tenant, bill } = results.validate as Record<string, unknown>
    const tenantData = tenant as Record<string, unknown>

    const notifications: NotificationPayload[] = []

    // Send receipt notification to tenant
    if (tenantData?.user_id || tenantData?.email) {
      notifications.push(
        buildPaymentNotification(
          (tenantData?.user_id || tenantData?.id) as string,
          {
            payment_id: payment?.id as string,
            amount: formatCurrency(input.amount),
            bill_number: (bill as Record<string, unknown>)?.bill_number as string,
          }
        )
      )
    }

    return notifications
  },

  buildOutput: (results) => {
    const payment = results.create_payment as Record<string, unknown>
    const billResult = results.update_bill as Record<string, unknown>
    const receiptResult = results.generate_receipt_number as Record<string, unknown>

    return {
      payment_id: payment?.id as string,
      receipt_number: receiptResult?.receipt_number as string,
      bill_status: billResult?.new_status as string,
      remaining_balance: billResult?.new_balance as number,
      receipt_sent: false, // Will be true when notification is sent
    }
  },
}

// ============================================
// Refund Payment Workflow
// ============================================

export interface RefundPaymentInput {
  payment_id: string
  refund_amount: number
  refund_reason: string
  refund_method: "cash" | "upi" | "bank_transfer"
  refund_reference?: string
}

export interface RefundPaymentOutput {
  refund_id: string
  original_payment_id: string
  bill_updated: boolean
}

export const refundPaymentWorkflow: WorkflowDefinition<RefundPaymentInput, RefundPaymentOutput> = {
  name: "payment_refund",

  steps: [
    // Step 1: Validate payment
    {
      name: "validate_payment",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: payment, error } = await supabase
          .from("payments")
          .select("*, bill:bills(*)")
          .eq("id", input.payment_id)
          .single()

        if (error || !payment) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Payment not found")
          )
        }

        if (input.refund_amount > payment.amount) {
          return createErrorResult(
            createServiceError(ERROR_CODES.VALIDATION_ERROR, "Refund amount exceeds payment amount")
          )
        }

        return createSuccessResult(payment)
      },
    },

    // Step 2: Create refund record
    {
      name: "create_refund",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const payment = previousResults.validate_payment as Record<string, unknown>

        const { data: refund, error } = await supabase
          .from("payment_refunds")
          .insert({
            payment_id: input.payment_id,
            amount: input.refund_amount,
            reason: input.refund_reason,
            refund_method: input.refund_method,
            reference_number: input.refund_reference || null,
            processed_by: context.actor_id,
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          // Table might not exist, create inline refund note
          console.warn("[RefundPayment] Refund table not found, updating payment notes")
          await supabase
            .from("payments")
            .update({
              notes: `${payment.notes || ""}\nREFUND: ${formatCurrency(input.refund_amount)} on ${new Date().toLocaleDateString()} - ${input.refund_reason}`,
              status: "refunded",
              updated_at: new Date().toISOString(),
            })
            .eq("id", input.payment_id)

          return createSuccessResult({ refund_id: `refund-${input.payment_id}` })
        }

        return createSuccessResult({ refund_id: refund.id })
      },
    },

    // Step 3: Update bill
    {
      name: "update_bill",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const payment = previousResults.validate_payment as Record<string, unknown>
        const bill = payment.bill as Record<string, unknown>

        if (!bill) {
          return createSuccessResult({ updated: false })
        }

        const newPaidAmount = (bill.paid_amount as number) - input.refund_amount
        const newBalance = (bill.total_amount as number) - newPaidAmount

        let newStatus = bill.status
        if (newPaidAmount <= 0) {
          newStatus = "pending"
        } else if (newBalance > 0) {
          newStatus = "partial"
        }

        const { error } = await supabase
          .from("bills")
          .update({
            paid_amount: Math.max(0, newPaidAmount),
            balance_due: newBalance,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", bill.id)

        if (error) {
          console.warn("[RefundPayment] Failed to update bill:", error)
        }

        return createSuccessResult({ updated: true, new_status: newStatus })
      },
      optional: true,
    },
  ],

  auditEvents: (context, input, results) => {
    const refundResult = results.create_refund as Record<string, unknown>
    const payment = results.validate_payment as Record<string, unknown>

    return [
      createAuditEvent(
        "payment",
        input.payment_id,
        "update",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            refund_amount: input.refund_amount,
            refund_reason: input.refund_reason,
            refund_id: refundResult?.refund_id,
          },
          metadata: { action: "refund" },
        }
      ),
    ]
  },

  notifications: () => [],

  buildOutput: (results) => {
    const refundResult = results.create_refund as Record<string, unknown>
    const billResult = results.update_bill as Record<string, unknown>
    // BL-013: Fix refund-payment linkage by getting payment_id from validate step
    const paymentResult = results.validate_payment as Record<string, unknown>

    return {
      refund_id: refundResult?.refund_id as string,
      original_payment_id: (paymentResult?.id as string) || "",
      bill_updated: billResult?.updated as boolean || false,
    }
  },
}

// ============================================
// Exported Functions
// ============================================

export async function recordPayment(
  input: PaymentRecordInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    paymentRecordWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}

export async function refundPayment(
  input: RefundPaymentInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    refundPaymentWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}

// ============================================
// Bulk Payment Helper
// ============================================

export async function recordBulkPayments(
  input: BulkPaymentInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
): Promise<BulkPaymentOutput> {
  const paymentIds: string[] = []
  let totalAmount = 0

  for (const payment of input.payments) {
    const result = await recordPayment(
      {
        ...payment,
        payment_date: input.payment_date,
        send_receipt: input.send_receipts,
      },
      actorId,
      actorType,
      workspaceId
    )

    if (result.success && result.data) {
      paymentIds.push(result.data.payment_id)
      totalAmount += payment.amount
    }
  }

  return {
    total_payments: paymentIds.length,
    total_amount: totalAmount,
    payment_ids: paymentIds,
  }
}
