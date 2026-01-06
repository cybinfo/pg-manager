/**
 * Approval Workflow
 *
 * Comprehensive workflow for all 11 approval types:
 * 1. name_change       - Update tenant name
 * 2. address_change    - Update tenant address
 * 3. phone_change      - Update tenant phone
 * 4. email_change      - Update tenant email + auth.users
 * 5. room_change       - Transfer tenant to new room
 * 6. complaint         - Resolve/acknowledge complaint
 * 7. bill_dispute      - Review and adjust bill
 * 8. payment_dispute   - Review payment issues
 * 9. tenancy_issue     - Handle tenancy-related concerns
 * 10. room_issue       - Handle room maintenance/issues
 * 11. other            - Generic requests
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
import { buildApprovalDecisionNotification } from "@/lib/services/notification.service"
import { createAuditEvent } from "@/lib/services/audit.service"
import { transferRoom } from "./tenant.workflow"

// ============================================
// Types
// ============================================

export type ApprovalType =
  | "name_change"
  | "address_change"
  | "phone_change"
  | "email_change"
  | "room_change"
  | "complaint"
  | "bill_dispute"
  | "payment_dispute"
  | "tenancy_issue"
  | "room_issue"
  | "other"

export interface ApprovalDecisionInput {
  approval_id: string
  decision: "approved" | "rejected"
  decision_notes?: string
  // Additional data for specific types
  adjustment_amount?: number // For bill_dispute
  new_due_date?: string // For bill_dispute
  resolution_action?: string // For complaints/issues
  waive_late_fee?: boolean // For payment_dispute
}

export interface ApprovalDecisionOutput {
  approval_id: string
  decision: string
  change_applied: boolean
  cascading_actions: string[]
  notification_sent: boolean
}

export interface CreateApprovalInput {
  tenant_id: string
  workspace_id: string
  owner_id: string
  type: ApprovalType
  title: string
  description?: string
  payload: Record<string, unknown>
  priority?: "low" | "normal" | "high" | "urgent"
  document_ids?: string[]
}

export interface CreateApprovalOutput {
  approval_id: string
  status: string
}

// ============================================
// Approval Type Handlers
// ============================================

interface ApprovalHandler {
  validate?: (approval: Record<string, unknown>, input: ApprovalDecisionInput) => Promise<ServiceResult<void>>
  apply: (approval: Record<string, unknown>, input: ApprovalDecisionInput, context: { actor_id: string; workspace_id: string }) => Promise<ServiceResult<{ actions: string[] }>>
  buildNotificationData?: (approval: Record<string, unknown>) => Record<string, unknown>
}

const approvalHandlers: Record<ApprovalType, ApprovalHandler> = {
  // ============================================
  // 1. Name Change
  // ============================================
  name_change: {
    apply: async (approval, input) => {
      const supabase = createClient()
      const payload = approval.payload as Record<string, string>
      const newName = payload.new_name

      // Update tenant name
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ name: newName, updated_at: new Date().toISOString() })
        .eq("id", approval.requester_tenant_id)

      if (tenantError) {
        return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update tenant name"))
      }

      // Also update user_profiles if tenant has user_id
      const tenant = approval.tenant as Record<string, unknown>
      if (tenant?.user_id) {
        await supabase
          .from("user_profiles")
          .update({ name: newName, updated_at: new Date().toISOString() })
          .eq("user_id", tenant.user_id)
      }

      return createSuccessResult({ actions: ["tenant_name_updated", "user_profile_updated"] })
    },
  },

  // ============================================
  // 2. Address Change
  // ============================================
  address_change: {
    apply: async (approval) => {
      const supabase = createClient()
      const payload = approval.payload as Record<string, unknown>
      const newAddress = payload.new_address

      // Update tenant address (stored in addresses JSONB array)
      const { data: tenant } = await supabase
        .from("tenants")
        .select("addresses")
        .eq("id", approval.requester_tenant_id)
        .single()

      const addresses = (tenant?.addresses as Record<string, unknown>[]) || []

      // If new_address is a full address object, replace primary; otherwise update first
      let updatedAddresses
      if (typeof newAddress === "object") {
        // Replace or add as primary address
        updatedAddresses = [{ ...newAddress, is_primary: true }, ...addresses.filter((a) => !a.is_primary)]
      } else {
        // Simple string - update the address field
        await supabase
          .from("tenants")
          .update({ address: newAddress as string, updated_at: new Date().toISOString() })
          .eq("id", approval.requester_tenant_id)

        return createSuccessResult({ actions: ["tenant_address_updated"] })
      }

      const { error } = await supabase
        .from("tenants")
        .update({ addresses: updatedAddresses, updated_at: new Date().toISOString() })
        .eq("id", approval.requester_tenant_id)

      if (error) {
        return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update address"))
      }

      return createSuccessResult({ actions: ["tenant_addresses_updated"] })
    },
  },

  // ============================================
  // 3. Phone Change
  // ============================================
  phone_change: {
    apply: async (approval) => {
      const supabase = createClient()
      const payload = approval.payload as Record<string, string>
      const newPhone = payload.new_phone

      // Update tenant phone
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ phone: newPhone, updated_at: new Date().toISOString() })
        .eq("id", approval.requester_tenant_id)

      if (tenantError) {
        return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update phone"))
      }

      // Update user_profiles if tenant has user_id
      const tenant = approval.tenant as Record<string, unknown>
      if (tenant?.user_id) {
        await supabase
          .from("user_profiles")
          .update({ phone: newPhone, updated_at: new Date().toISOString() })
          .eq("user_id", tenant.user_id)
      }

      return createSuccessResult({ actions: ["tenant_phone_updated", "user_profile_phone_updated"] })
    },
  },

  // ============================================
  // 4. Email Change
  // ============================================
  email_change: {
    apply: async (approval) => {
      const supabase = createClient()
      const payload = approval.payload as Record<string, string>
      const newEmail = payload.new_email
      const actions: string[] = []

      // Update tenant email
      const { error: tenantError } = await supabase
        .from("tenants")
        .update({ email: newEmail, updated_at: new Date().toISOString() })
        .eq("id", approval.requester_tenant_id)

      if (tenantError) {
        return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update tenant email"))
      }
      actions.push("tenant_email_updated")

      // Update user_profiles if tenant has user_id
      const tenant = approval.tenant as Record<string, unknown>
      if (tenant?.user_id) {
        await supabase
          .from("user_profiles")
          .update({ email: newEmail, updated_at: new Date().toISOString() })
          .eq("user_id", tenant.user_id)
        actions.push("user_profile_email_updated")

        // Note: auth.users email update requires admin API - handled separately
        actions.push("auth_email_requires_admin_api")
      }

      return createSuccessResult({ actions })
    },
  },

  // ============================================
  // 5. Room Change (Room Transfer)
  // ============================================
  room_change: {
    validate: async (approval) => {
      const payload = approval.payload as Record<string, string>
      if (!payload.requested_room_id) {
        return createErrorResult(createServiceError(ERROR_CODES.VALIDATION_ERROR, "Missing requested room ID"))
      }

      // Check room availability
      const supabase = createClient()
      const { data: room, error } = await supabase
        .from("rooms")
        .select("id, total_beds, occupied_beds")
        .eq("id", payload.requested_room_id)
        .single()

      if (error || !room) {
        return createErrorResult(createServiceError(ERROR_CODES.NOT_FOUND, "Requested room not found"))
      }

      if ((room.occupied_beds || 0) >= (room.total_beds || 1)) {
        return createErrorResult(createServiceError(ERROR_CODES.ROOM_AT_CAPACITY, "Requested room is full"))
      }

      return createSuccessResult(undefined)
    },
    apply: async (approval, input, context) => {
      const payload = approval.payload as Record<string, string>
      const tenant = approval.tenant as Record<string, unknown>

      // Use the room transfer workflow
      const result = await transferRoom(
        {
          tenant_id: approval.requester_tenant_id as string,
          new_room_id: payload.requested_room_id,
          new_bed_id: payload.requested_bed_id || undefined,
          transfer_date: new Date().toISOString().split("T")[0],
          reason: payload.reason || `Approved room change request (Approval #${approval.id})`,
          adjust_rent: payload.adjust_rent === "true",
          new_rent: payload.new_rent ? parseFloat(payload.new_rent) : undefined,
        },
        context.actor_id,
        "owner",
        context.workspace_id
      )

      if (!result.success) {
        return createErrorResult(createServiceError(ERROR_CODES.WORKFLOW_STEP_FAILED, "Room transfer failed"))
      }

      return createSuccessResult({
        actions: [
          "room_transfer_completed",
          "old_room_released",
          "new_room_assigned",
          result.data?.rent_adjusted ? "rent_adjusted" : "rent_unchanged",
        ],
      })
    },
  },

  // ============================================
  // 6. Complaint Resolution
  // ============================================
  complaint: {
    apply: async (approval, input) => {
      const payload = approval.payload as Record<string, string>
      const complaintId = payload.complaint_id
      const actions: string[] = []

      if (complaintId) {
        const supabase = createClient()

        // Update complaint status to resolved
        const { error } = await supabase
          .from("complaints")
          .update({
            status: "resolved",
            resolution_notes: input.decision_notes || "Resolved via approval workflow",
            resolved_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", complaintId)

        if (!error) {
          actions.push("complaint_resolved")
        }
      }

      // Mark as acknowledged regardless
      actions.push("complaint_acknowledged")
      return createSuccessResult({ actions })
    },
  },

  // ============================================
  // 7. Bill Dispute
  // ============================================
  bill_dispute: {
    apply: async (approval, input) => {
      const payload = approval.payload as Record<string, string>
      const billId = payload.bill_id
      const actions: string[] = []

      if (!billId) {
        return createSuccessResult({ actions: ["bill_dispute_acknowledged_manual_review"] })
      }

      const supabase = createClient()

      // Get current bill
      const { data: bill } = await supabase
        .from("bills")
        .select("*")
        .eq("id", billId)
        .single()

      if (!bill) {
        return createSuccessResult({ actions: ["bill_not_found_manual_review"] })
      }

      const updates: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      // Apply adjustment if provided
      if (input.adjustment_amount !== undefined) {
        const newTotal = (bill.total_amount || 0) + input.adjustment_amount
        const newBalance = newTotal - (bill.paid_amount || 0)

        updates.total_amount = newTotal
        updates.balance_due = newBalance

        // Add adjustment to notes
        updates.notes = `${bill.notes || ""}\nAdjustment: ${input.adjustment_amount > 0 ? "+" : ""}${input.adjustment_amount} (Approval #${approval.id})`

        actions.push(`bill_adjusted_by_${input.adjustment_amount}`)
      }

      // Update due date if provided
      if (input.new_due_date) {
        updates.due_date = input.new_due_date
        actions.push("due_date_updated")
      }

      // Waive late fee if requested
      if (input.waive_late_fee) {
        const lateFee = bill.late_fee || 0
        if (lateFee > 0) {
          updates.late_fee = 0
          updates.total_amount = (updates.total_amount as number || bill.total_amount) - lateFee
          updates.balance_due = (updates.balance_due as number || bill.balance_due) - lateFee
          actions.push("late_fee_waived")
        }
      }

      // Clear overdue status if applicable
      if (bill.status === "overdue" && input.new_due_date) {
        const newDueDate = new Date(input.new_due_date)
        if (newDueDate > new Date()) {
          updates.status = "pending"
          actions.push("overdue_status_cleared")
        }
      }

      const { error } = await supabase
        .from("bills")
        .update(updates)
        .eq("id", billId)

      if (error) {
        return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update bill"))
      }

      actions.push("bill_dispute_resolved")
      return createSuccessResult({ actions })
    },
    buildNotificationData: (approval) => {
      const payload = approval.payload as Record<string, string>
      return {
        bill_number: payload.bill_number,
        dispute_reason: payload.dispute_reason,
      }
    },
  },

  // ============================================
  // 8. Payment Dispute
  // ============================================
  payment_dispute: {
    apply: async (approval, input) => {
      const payload = approval.payload as Record<string, string>
      const paymentId = payload.payment_id
      const actions: string[] = []

      if (!paymentId) {
        return createSuccessResult({ actions: ["payment_dispute_acknowledged_manual_review"] })
      }

      const supabase = createClient()

      // Get payment details
      const { data: payment } = await supabase
        .from("payments")
        .select("*, bill:bills(*)")
        .eq("id", paymentId)
        .single()

      if (!payment) {
        return createSuccessResult({ actions: ["payment_not_found_manual_review"] })
      }

      // Handle based on dispute type
      const disputeType = payload.dispute_type

      switch (disputeType) {
        case "payment_not_received":
          // Mark payment as disputed/under review
          await supabase
            .from("payments")
            .update({
              notes: `${payment.notes || ""}\nDISPUTE: Payment not received claim - ${input.decision_notes || "Under review"}`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId)
          actions.push("payment_marked_disputed")
          break

        case "wrong_amount":
          // Note the discrepancy
          await supabase
            .from("payments")
            .update({
              notes: `${payment.notes || ""}\nDISPUTE: Amount discrepancy - ${payload.claimed_amount} claimed vs ${payment.amount} recorded`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId)
          actions.push("amount_discrepancy_noted")
          break

        case "duplicate_payment":
          // Flag for refund review
          await supabase
            .from("payments")
            .update({
              notes: `${payment.notes || ""}\nDISPUTE: Duplicate payment claim - Review for refund`,
              updated_at: new Date().toISOString(),
            })
            .eq("id", paymentId)
          actions.push("duplicate_payment_flagged")
          break

        default:
          actions.push("payment_dispute_acknowledged")
      }

      return createSuccessResult({ actions })
    },
  },

  // ============================================
  // 9. Tenancy Issue
  // ============================================
  tenancy_issue: {
    apply: async (approval, input) => {
      const payload = approval.payload as Record<string, string>
      const issueType = payload.issue_type
      const actions: string[] = []

      const supabase = createClient()

      // Log the issue resolution
      await supabase
        .from("tenants")
        .update({
          notes: `${(approval.tenant as Record<string, unknown>)?.notes || ""}\nISSUE RESOLVED [${new Date().toLocaleDateString()}]: ${issueType} - ${input.decision_notes || "Resolved"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", approval.requester_tenant_id)

      actions.push("tenancy_issue_logged")

      // Handle specific issue types
      switch (issueType) {
        case "rent_revision":
          if (payload.new_rent) {
            await supabase
              .from("tenants")
              .update({ monthly_rent: parseFloat(payload.new_rent) })
              .eq("id", approval.requester_tenant_id)
            actions.push("rent_revised")
          }
          break

        case "deposit_dispute":
          actions.push("deposit_dispute_acknowledged")
          break

        case "agreement_modification":
          if (payload.new_end_date) {
            await supabase
              .from("tenants")
              .update({ agreement_end_date: payload.new_end_date })
              .eq("id", approval.requester_tenant_id)
            actions.push("agreement_end_date_updated")
          }
          break

        default:
          actions.push("issue_resolved")
      }

      return createSuccessResult({ actions })
    },
  },

  // ============================================
  // 10. Room Issue
  // ============================================
  room_issue: {
    apply: async (approval, input) => {
      const payload = approval.payload as Record<string, string>
      const roomId = payload.room_id
      const issueType = payload.issue_type
      const actions: string[] = []

      if (!roomId) {
        return createSuccessResult({ actions: ["room_issue_acknowledged_no_room_specified"] })
      }

      const supabase = createClient()

      // Log issue on room
      const { data: room } = await supabase
        .from("rooms")
        .select("notes")
        .eq("id", roomId)
        .single()

      await supabase
        .from("rooms")
        .update({
          notes: `${room?.notes || ""}\nISSUE RESOLVED [${new Date().toLocaleDateString()}]: ${issueType} - ${input.decision_notes || "Resolved"}`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", roomId)

      actions.push("room_issue_logged")

      // Handle specific room issues
      switch (issueType) {
        case "maintenance":
          // Could trigger maintenance workflow
          actions.push("maintenance_acknowledged")
          break

        case "amenity_request":
          actions.push("amenity_request_processed")
          break

        case "cleanliness":
          actions.push("cleanliness_issue_addressed")
          break

        default:
          actions.push("room_issue_resolved")
      }

      return createSuccessResult({ actions })
    },
  },

  // ============================================
  // 11. Other (Generic)
  // ============================================
  other: {
    apply: async (approval, input) => {
      // Generic handler - just mark as processed
      return createSuccessResult({
        actions: ["other_request_processed", input.resolution_action || "manual_review_complete"],
      })
    },
  },
}

// ============================================
// Process Approval Workflow
// ============================================

export const processApprovalWorkflow: WorkflowDefinition<ApprovalDecisionInput, ApprovalDecisionOutput> = {
  name: "process_approval",

  steps: [
    // Step 1: Fetch and validate approval
    {
      name: "fetch_approval",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: approval, error } = await supabase
          .from("approvals")
          .select(`
            *,
            tenant:tenants(id, name, email, phone, user_id, addresses, notes, monthly_rent, room_id)
          `)
          .eq("id", input.approval_id)
          .single()

        if (error || !approval) {
          return createErrorResult(createServiceError(ERROR_CODES.NOT_FOUND, "Approval not found"))
        }

        if (approval.status !== "pending") {
          return createErrorResult(
            createServiceError(ERROR_CODES.APPROVAL_ALREADY_PROCESSED, `Approval already ${approval.status}`)
          )
        }

        // Transform join
        const tenant = Array.isArray(approval.tenant) ? approval.tenant[0] : approval.tenant

        return createSuccessResult({ ...approval, tenant })
      },
    },

    // Step 2: Validate type-specific requirements (for approvals only)
    {
      name: "validate_type",
      execute: async (context, input, previousResults) => {
        if (input.decision === "rejected") {
          return createSuccessResult({ validated: true })
        }

        const approval = previousResults.fetch_approval as Record<string, unknown>
        const handler = approvalHandlers[approval.type as ApprovalType]

        if (handler?.validate) {
          const validationResult = await handler.validate(approval, input)
          if (!validationResult.success) {
            return validationResult
          }
        }

        return createSuccessResult({ validated: true })
      },
    },

    // Step 3: Update approval status
    {
      name: "update_approval",
      execute: async (context, input) => {
        const supabase = createClient()

        const { error } = await supabase
          .from("approvals")
          .update({
            status: input.decision,
            decided_by: context.actor_id,
            decided_at: new Date().toISOString(),
            decision_notes: input.decision_notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.approval_id)

        if (error) {
          return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update approval"))
        }

        return createSuccessResult({ status_updated: true })
      },
    },

    // Step 4: Apply changes (for approved only)
    {
      name: "apply_changes",
      execute: async (context, input, previousResults) => {
        if (input.decision === "rejected") {
          return createSuccessResult({ actions: ["rejected_no_changes"] })
        }

        const approval = previousResults.fetch_approval as Record<string, unknown>
        const handler = approvalHandlers[approval.type as ApprovalType]

        if (!handler) {
          return createSuccessResult({ actions: ["unknown_type_manual_handling"] })
        }

        const result = await handler.apply(approval, input, {
          actor_id: context.actor_id,
          workspace_id: context.workspace_id,
        })

        if (!result.success) {
          return result
        }

        return createSuccessResult(result.data)
      },
    },

    // Step 5: Mark as applied
    {
      name: "mark_applied",
      execute: async (context, input, previousResults) => {
        if (input.decision === "rejected") {
          return createSuccessResult({ applied: false })
        }

        const supabase = createClient()
        const applyResult = previousResults.apply_changes as Record<string, unknown>

        await supabase
          .from("approvals")
          .update({
            change_applied: true,
            applied_at: new Date().toISOString(),
          })
          .eq("id", input.approval_id)

        return createSuccessResult({ applied: true, actions: applyResult?.actions || [] })
      },
    },
  ],

  // Audit events
  auditEvents: (context, input, results) => {
    const approval = results.fetch_approval as Record<string, unknown>
    const applyResult = results.apply_changes as Record<string, unknown>

    return [
      createAuditEvent(
        "approval",
        input.approval_id,
        input.decision === "approved" ? "approve" : "reject",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            decision: input.decision,
            decision_notes: input.decision_notes,
            actions_taken: applyResult?.actions,
          },
          metadata: {
            approval_type: approval?.type,
            requester_tenant_id: approval?.requester_tenant_id,
          },
        }
      ),
    ]
  },

  // Notifications
  notifications: (context, input, results) => {
    const approval = results.fetch_approval as Record<string, unknown>
    const tenant = approval?.tenant as Record<string, unknown>
    const notifications: NotificationPayload[] = []

    // Notify tenant of decision
    if (tenant?.user_id || tenant?.id) {
      notifications.push(
        buildApprovalDecisionNotification(
          (tenant?.user_id || tenant?.id) as string,
          {
            approval_id: input.approval_id,
            request_type: getTypeLabel(approval?.type as string),
            decision: input.decision === "approved" ? "Approved" : "Rejected",
            notes: input.decision_notes,
          }
        )
      )
    }

    return notifications
  },

  buildOutput: (results) => {
    const applyResult = results.apply_changes as Record<string, unknown>
    const markResult = results.mark_applied as Record<string, unknown>

    return {
      approval_id: "",
      decision: "",
      change_applied: markResult?.applied as boolean || false,
      cascading_actions: (applyResult?.actions as string[]) || [],
      notification_sent: true,
    }
  },
}

// ============================================
// Create Approval Workflow
// ============================================

export const createApprovalWorkflow: WorkflowDefinition<CreateApprovalInput, CreateApprovalOutput> = {
  name: "create_approval",

  steps: [
    {
      name: "validate_tenant",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: tenant, error } = await supabase
          .from("tenants")
          .select("id, name, status")
          .eq("id", input.tenant_id)
          .single()

        if (error || !tenant) {
          return createErrorResult(createServiceError(ERROR_CODES.NOT_FOUND, "Tenant not found"))
        }

        if (tenant.status === "checked_out") {
          return createErrorResult(createServiceError(ERROR_CODES.VALIDATION_ERROR, "Cannot create approval for checked-out tenant"))
        }

        return createSuccessResult(tenant)
      },
    },
    {
      name: "create_approval",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: approval, error } = await supabase
          .from("approvals")
          .insert({
            requester_tenant_id: input.tenant_id,
            workspace_id: input.workspace_id,
            owner_id: input.owner_id,
            type: input.type,
            title: input.title,
            description: input.description || null,
            payload: input.payload,
            priority: input.priority || "normal",
            document_ids: input.document_ids || null,
            status: "pending",
            created_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (error) {
          return createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to create approval", { error }))
        }

        return createSuccessResult(approval)
      },
    },
  ],

  auditEvents: (context, input, results) => {
    const approval = results.create_approval as Record<string, unknown>

    return [
      createAuditEvent(
        "approval",
        approval?.id as string,
        "create",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            type: input.type,
            title: input.title,
            priority: input.priority,
          },
        }
      ),
    ]
  },

  notifications: (context, input) => {
    // Notify owner of new approval request
    return [
      {
        type: "approval_required" as const,
        recipient_id: input.owner_id,
        recipient_type: "owner" as const,
        channels: ["email" as const, "in_app" as const],
        data: {
          approval_type: getTypeLabel(input.type),
          title: input.title,
          priority: input.priority,
        },
        priority: input.priority === "urgent" ? "high" as const : "normal" as const,
      },
    ]
  },

  buildOutput: (results) => {
    const approval = results.create_approval as Record<string, unknown>
    return {
      approval_id: approval?.id as string,
      status: "pending",
    }
  },
}

// ============================================
// Helper Functions
// ============================================

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    name_change: "Name Change",
    address_change: "Address Change",
    phone_change: "Phone Change",
    email_change: "Email Change",
    room_change: "Room Transfer",
    complaint: "Complaint Resolution",
    bill_dispute: "Bill Dispute",
    payment_dispute: "Payment Dispute",
    tenancy_issue: "Tenancy Issue",
    room_issue: "Room Issue",
    other: "Other Request",
  }
  return labels[type] || type
}

// ============================================
// Exported Functions
// ============================================

export async function processApproval(
  input: ApprovalDecisionInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(processApprovalWorkflow, input, actorId, actorType, workspaceId)
}

export async function createApproval(
  input: CreateApprovalInput,
  actorId: string,
  actorType: "owner" | "staff" | "tenant",
  workspaceId: string
) {
  return executeWorkflow(createApprovalWorkflow, input, actorId, actorType, workspaceId)
}

// ============================================
// Bulk Operations
// ============================================

export async function bulkApprove(
  approvalIds: string[],
  decisionNotes: string,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
): Promise<{ success: number; failed: number; results: Array<{ id: string; success: boolean; error?: string }> }> {
  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const id of approvalIds) {
    const result = await processApproval(
      { approval_id: id, decision: "approved", decision_notes: decisionNotes },
      actorId,
      actorType,
      workspaceId
    )

    results.push({
      id,
      success: result.success,
      error: result.success ? undefined : result.errors?.[0]?.message,
    })
  }

  return {
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}

export async function bulkReject(
  approvalIds: string[],
  decisionNotes: string,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
): Promise<{ success: number; failed: number; results: Array<{ id: string; success: boolean; error?: string }> }> {
  const results: Array<{ id: string; success: boolean; error?: string }> = []

  for (const id of approvalIds) {
    const result = await processApproval(
      { approval_id: id, decision: "rejected", decision_notes: decisionNotes },
      actorId,
      actorType,
      workspaceId
    )

    results.push({
      id,
      success: result.success,
      error: result.success ? undefined : result.errors?.[0]?.message,
    })
  }

  return {
    success: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    results,
  }
}
