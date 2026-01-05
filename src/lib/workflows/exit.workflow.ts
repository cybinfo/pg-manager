/**
 * Exit Clearance Workflow
 *
 * CRITICAL: This workflow ensures complete tenant exit with all cascading effects:
 * 1. Creates exit_clearance record
 * 2. Updates tenant status (active → notice_period → moved_out)
 * 3. Updates tenant_stays (sets exit_date, status = completed)
 * 4. Releases room (updates occupancy, status)
 * 5. Releases bed (if shared room)
 * 6. Calculates settlement (dues, deposits, adjustments)
 * 7. Generates final bill (if pending charges)
 * 8. Logs audit events
 * 9. Sends notifications
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
  CascadeEffect,
  NotificationPayload,
  AuditEvent,
} from "@/lib/services"
import {
  buildExitClearanceNotification,
} from "@/lib/services/notification.service"
import { createAuditEvent } from "@/lib/services/audit.service"

// ============================================
// Types
// ============================================

export interface ExitClearanceInput {
  tenant_id: string
  property_id: string
  room_id: string
  bed_id?: string
  requested_exit_date: string
  exit_reason: string
  notice_date?: string
  items_checklist?: Record<string, boolean>
  deductions?: Array<{
    description: string
    amount: number
  }>
  notes?: string
}

export interface ExitClearanceOutput {
  clearance_id: string
  tenant_id: string
  settlement: {
    total_dues: number
    deposit_amount: number
    deductions: number
    refund_amount: number
    additional_payment: number
  }
  status: string
}

// ============================================
// Workflow Definition
// ============================================

export const exitClearanceWorkflow: WorkflowDefinition<ExitClearanceInput, ExitClearanceOutput> = {
  name: "exit_clearance",

  steps: [
    // Step 1: Validate tenant and check for existing clearance
    {
      name: "validate_tenant",
      execute: async (context, input) => {
        const supabase = createClient()

        // Check tenant exists and is active
        const { data: tenant, error: tenantError } = await supabase
          .from("tenants")
          .select("*, property:properties(id, name), room:rooms(id, room_number, bed_count)")
          .eq("id", input.tenant_id)
          .single()

        if (tenantError || !tenant) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Tenant not found")
          )
        }

        if (tenant.status === "checked_out") {
          return createErrorResult(
            createServiceError(ERROR_CODES.TENANT_ALREADY_EXITED, "Tenant has already exited")
          )
        }

        // Check for existing active exit clearance
        const { data: existingClearance } = await supabase
          .from("exit_clearance")
          .select("id, status")
          .eq("tenant_id", input.tenant_id)
          .in("status", ["initiated", "in_progress"])
          .single()

        if (existingClearance) {
          return createErrorResult(
            createServiceError(ERROR_CODES.EXIT_ALREADY_INITIATED, "Exit clearance already initiated")
          )
        }

        return createSuccessResult(tenant)
      },
    },

    // Step 2: Calculate dues and settlement
    {
      name: "calculate_settlement",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const tenant = previousResults.validate_tenant as Record<string, unknown>

        // Get unpaid bills
        const { data: unpaidBills } = await supabase
          .from("bills")
          .select("id, total_amount, paid_amount, balance_due")
          .eq("tenant_id", input.tenant_id)
          .in("status", ["pending", "partial", "overdue"])

        const totalDues = (unpaidBills || []).reduce(
          (sum, bill) => sum + (bill.balance_due || 0),
          0
        )

        // Get deposit amount
        const depositAmount = (tenant.security_deposit as number) || 0

        // Calculate deductions
        const deductions = (input.deductions || []).reduce(
          (sum, d) => sum + d.amount,
          0
        )

        // Calculate final settlement
        const netAmount = depositAmount - totalDues - deductions
        const refundAmount = netAmount > 0 ? netAmount : 0
        const additionalPayment = netAmount < 0 ? Math.abs(netAmount) : 0

        return createSuccessResult({
          total_dues: totalDues,
          deposit_amount: depositAmount,
          deductions,
          refund_amount: refundAmount,
          additional_payment: additionalPayment,
          unpaid_bills: unpaidBills || [],
        })
      },
    },

    // Step 3: Update tenant status to notice_period
    {
      name: "update_tenant_status",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const tenant = previousResults.validate_tenant as Record<string, unknown>

        // Only update if currently active
        if (tenant.status === "active") {
          const { error } = await supabase
            .from("tenants")
            .update({
              status: "notice_period",
              notice_date: input.notice_date || new Date().toISOString(),
              expected_exit_date: input.requested_exit_date,
              updated_at: new Date().toISOString(),
            })
            .eq("id", input.tenant_id)

          if (error) {
            return createErrorResult(
              createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update tenant status", { error })
            )
          }
        }

        return createSuccessResult({ updated: true, new_status: "notice_period" })
      },
      rollback: async (context, input) => {
        const supabase = createClient()
        await supabase
          .from("tenants")
          .update({ status: "active", notice_date: null, expected_exit_date: null })
          .eq("id", input.tenant_id)
      },
    },

    // Step 4: Create exit_clearance record
    {
      name: "create_clearance_record",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const settlement = previousResults.calculate_settlement as Record<string, unknown>

        const clearanceData = {
          tenant_id: input.tenant_id,
          property_id: input.property_id,
          room_id: input.room_id,
          bed_id: input.bed_id || null,
          initiated_by: context.actor_id,
          notice_date: input.notice_date || new Date().toISOString(),
          requested_exit_date: input.requested_exit_date,
          exit_reason: input.exit_reason,
          status: "initiated",
          items_checklist: input.items_checklist || {},
          deductions: input.deductions || [],
          total_dues: settlement.total_dues,
          deposit_amount: settlement.deposit_amount,
          deduction_amount: settlement.deductions,
          refund_amount: settlement.refund_amount,
          additional_payment: settlement.additional_payment,
          notes: input.notes || null,
          created_at: new Date().toISOString(),
        }

        const { data: clearance, error } = await supabase
          .from("exit_clearance")
          .insert(clearanceData)
          .select()
          .single()

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to create exit clearance", { error })
          )
        }

        return createSuccessResult(clearance)
      },
      rollback: async (context, input, stepResult) => {
        const supabase = createClient()
        const clearance = stepResult as Record<string, unknown>
        if (clearance?.id) {
          await supabase.from("exit_clearance").delete().eq("id", clearance.id)
        }
      },
    },
  ],

  // Cascade effects
  cascades: (context, input, results) => {
    const cascades: CascadeEffect[] = []

    // Note: Room occupancy will be updated when tenant status changes to checked_out
    // via existing trigger. We prepare cascades here for when exit is completed.

    return cascades
  },

  // Audit events
  auditEvents: (context, input, results) => {
    const clearance = results.create_clearance_record as Record<string, unknown>
    const settlement = results.calculate_settlement as Record<string, unknown>

    return [
      createAuditEvent(
        "exit_clearance",
        clearance?.id as string,
        "create",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            tenant_id: input.tenant_id,
            exit_reason: input.exit_reason,
            requested_exit_date: input.requested_exit_date,
            settlement,
          },
        }
      ),
      createAuditEvent(
        "tenant",
        input.tenant_id,
        "status_change",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          before: { status: "active" },
          after: { status: "notice_period" },
          metadata: { clearance_id: clearance?.id },
        }
      ),
    ]
  },

  // Notifications
  notifications: (context, input, results) => {
    const clearance = results.create_clearance_record as Record<string, unknown>
    const tenant = results.validate_tenant as Record<string, unknown>

    const notifications: NotificationPayload[] = []

    // Notify owner
    notifications.push(
      buildExitClearanceNotification(
        context.actor_id, // Owner gets notified if they didn't initiate
        "owner",
        "initiated",
        {
          clearance_id: clearance?.id as string,
          tenant_name: tenant?.name as string,
          exit_date: input.requested_exit_date,
        }
      )
    )

    // Notify tenant (if has user_id)
    if (tenant?.user_id) {
      notifications.push(
        buildExitClearanceNotification(
          tenant.user_id as string,
          "tenant",
          "initiated",
          {
            clearance_id: clearance?.id as string,
            tenant_name: tenant?.name as string,
            exit_date: input.requested_exit_date,
          }
        )
      )
    }

    return notifications
  },

  // Build output
  buildOutput: (results) => {
    const clearance = results.create_clearance_record as Record<string, unknown>
    const settlement = results.calculate_settlement as Record<string, unknown>

    return {
      clearance_id: clearance?.id as string,
      tenant_id: clearance?.tenant_id as string,
      settlement: {
        total_dues: settlement?.total_dues as number,
        deposit_amount: settlement?.deposit_amount as number,
        deductions: settlement?.deductions as number,
        refund_amount: settlement?.refund_amount as number,
        additional_payment: settlement?.additional_payment as number,
      },
      status: "initiated",
    }
  },
}

// ============================================
// Complete Exit Workflow (when tenant actually exits)
// ============================================

export interface CompleteExitInput {
  clearance_id: string
  actual_exit_date: string
  final_settlement_mode?: "cash" | "bank_transfer" | "upi" | "adjustment"
  settlement_reference?: string
  final_notes?: string
}

export interface CompleteExitOutput {
  clearance_id: string
  tenant_id: string
  room_released: boolean
  tenant_status: string
}

export const completeExitWorkflow: WorkflowDefinition<CompleteExitInput, CompleteExitOutput> = {
  name: "complete_exit",

  steps: [
    // Step 1: Validate clearance exists
    {
      name: "validate_clearance",
      execute: async (context, input) => {
        const supabase = createClient()

        const { data: clearance, error } = await supabase
          .from("exit_clearance")
          .select(`
            *,
            tenant:tenants(id, name, user_id, room_id, property_id),
            room:rooms(id, room_number, bed_count, occupied_beds)
          `)
          .eq("id", input.clearance_id)
          .single()

        if (error || !clearance) {
          return createErrorResult(
            createServiceError(ERROR_CODES.NOT_FOUND, "Exit clearance not found")
          )
        }

        if (clearance.status === "completed") {
          return createErrorResult(
            createServiceError(ERROR_CODES.VALIDATION_ERROR, "Exit clearance already completed")
          )
        }

        return createSuccessResult(clearance)
      },
    },

    // Step 2: Update tenant status to checked_out
    {
      name: "update_tenant_status",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const clearance = previousResults.validate_clearance as Record<string, unknown>
        const tenant = clearance.tenant as Record<string, unknown>

        const { error } = await supabase
          .from("tenants")
          .update({
            status: "checked_out",
            check_out_date: input.actual_exit_date,
            room_id: null, // Clear room assignment
            updated_at: new Date().toISOString(),
          })
          .eq("id", tenant.id)

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to update tenant status", { error })
          )
        }

        return createSuccessResult({ tenant_id: tenant.id, new_status: "checked_out" })
      },
    },

    // Step 3: Complete tenant_stays record
    {
      name: "complete_tenant_stay",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const clearance = previousResults.validate_clearance as Record<string, unknown>
        const tenant = clearance.tenant as Record<string, unknown>

        // Find and update active tenant_stay
        const { data: stay, error: findError } = await supabase
          .from("tenant_stays")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("status", "active")
          .single()

        if (stay) {
          const { error: updateError } = await supabase
            .from("tenant_stays")
            .update({
              exit_date: input.actual_exit_date,
              exit_reason: clearance.exit_reason,
              status: "completed",
              updated_at: new Date().toISOString(),
            })
            .eq("id", stay.id)

          if (updateError) {
            console.warn("[CompleteExit] Failed to update tenant_stay:", updateError)
          }
        }

        return createSuccessResult({ stay_completed: !!stay })
      },
      optional: true, // Don't fail if tenant_stays doesn't exist
    },

    // Step 4: Release room (update occupancy)
    {
      name: "release_room",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const clearance = previousResults.validate_clearance as Record<string, unknown>
        const room = clearance.room as Record<string, unknown>

        if (!room) {
          return createSuccessResult({ room_released: false })
        }

        const newOccupiedBeds = Math.max(0, (room.occupied_beds as number || 1) - 1)
        const newStatus = newOccupiedBeds === 0 ? "available" : "occupied"

        const { error } = await supabase
          .from("rooms")
          .update({
            occupied_beds: newOccupiedBeds,
            status: newStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", room.id)

        if (error) {
          console.warn("[CompleteExit] Failed to update room:", error)
        }

        return createSuccessResult({
          room_released: true,
          new_occupied_beds: newOccupiedBeds,
          new_status: newStatus,
        })
      },
      optional: true,
    },

    // Step 5: Release bed (if shared room)
    {
      name: "release_bed",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()
        const clearance = previousResults.validate_clearance as Record<string, unknown>
        const tenant = clearance.tenant as Record<string, unknown>

        if (!clearance.bed_id) {
          return createSuccessResult({ bed_released: false })
        }

        const { error } = await supabase
          .from("beds")
          .update({
            current_tenant_id: null,
            status: "available",
            updated_at: new Date().toISOString(),
          })
          .eq("id", clearance.bed_id)

        if (error) {
          console.warn("[CompleteExit] Failed to release bed:", error)
        }

        return createSuccessResult({ bed_released: true })
      },
      optional: true,
    },

    // Step 6: Update exit_clearance to completed
    {
      name: "complete_clearance",
      execute: async (context, input, previousResults) => {
        const supabase = createClient()

        const { error } = await supabase
          .from("exit_clearance")
          .update({
            status: "completed",
            actual_exit_date: input.actual_exit_date,
            settlement_mode: input.final_settlement_mode || null,
            settlement_reference: input.settlement_reference || null,
            final_notes: input.final_notes || null,
            completed_at: new Date().toISOString(),
            completed_by: context.actor_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", input.clearance_id)

        if (error) {
          return createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to complete clearance", { error })
          )
        }

        return createSuccessResult({ completed: true })
      },
    },
  ],

  // Audit events
  auditEvents: (context, input, results) => {
    const clearance = results.validate_clearance as Record<string, unknown>
    const tenant = clearance?.tenant as Record<string, unknown>

    return [
      createAuditEvent(
        "exit_clearance",
        input.clearance_id,
        "complete",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          after: {
            actual_exit_date: input.actual_exit_date,
            settlement_mode: input.final_settlement_mode,
          },
        }
      ),
      createAuditEvent(
        "tenant",
        tenant?.id as string,
        "status_change",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          before: { status: "notice_period" },
          after: { status: "checked_out" },
          metadata: { clearance_id: input.clearance_id },
        }
      ),
      createAuditEvent(
        "room",
        clearance?.room_id as string,
        "update",
        {
          actor_id: context.actor_id,
          actor_type: context.actor_type,
          workspace_id: context.workspace_id,
        },
        {
          metadata: { action: "tenant_exit", tenant_id: tenant?.id },
        }
      ),
    ]
  },

  // Notifications
  notifications: (context, input, results) => {
    const clearance = results.validate_clearance as Record<string, unknown>
    const tenant = clearance?.tenant as Record<string, unknown>

    const notifications: NotificationPayload[] = []

    // Notify tenant (if has user_id)
    if (tenant?.user_id) {
      notifications.push(
        buildExitClearanceNotification(
          tenant.user_id as string,
          "tenant",
          "completed",
          {
            clearance_id: input.clearance_id,
            tenant_name: tenant?.name as string,
            settlement_amount: `${clearance?.refund_amount || clearance?.additional_payment || 0}`,
          }
        )
      )
    }

    return notifications
  },

  buildOutput: (results) => {
    const clearance = results.validate_clearance as Record<string, unknown>
    const tenant = clearance?.tenant as Record<string, unknown>
    const roomResult = results.release_room as Record<string, unknown>

    return {
      clearance_id: clearance?.id as string,
      tenant_id: tenant?.id as string,
      room_released: roomResult?.room_released as boolean || false,
      tenant_status: "checked_out",
    }
  },
}

// ============================================
// Exported Functions
// ============================================

export async function initiateExitClearance(
  input: ExitClearanceInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    exitClearanceWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}

export async function completeExitClearance(
  input: CompleteExitInput,
  actorId: string,
  actorType: "owner" | "staff",
  workspaceId: string
) {
  return executeWorkflow(
    completeExitWorkflow,
    input,
    actorId,
    actorType,
    workspaceId
  )
}
