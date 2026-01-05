/**
 * Workflow Engine
 *
 * Central orchestrator for multi-step operations.
 * Ensures all entity changes cascade properly with:
 * - Audit logging
 * - Notifications
 * - Related entity updates
 * - Transaction-like behavior
 */

import { createClient } from "@/lib/supabase/client"
import {
  WorkflowContext,
  WorkflowStep,
  WorkflowResult,
  WorkflowStatus,
  ServiceResult,
  ServiceError,
  CascadeEffect,
  NotificationPayload,
  AuditEvent,
  createServiceError,
  ERROR_CODES,
} from "./types"
import { logAuditEvent, logAuditEvents, createAuditEvent } from "./audit.service"
import { sendNotification, sendNotifications } from "./notification.service"

// ============================================
// Workflow Context Management
// ============================================

export function createWorkflowContext(
  workflowType: string,
  actorId: string,
  actorType: "owner" | "staff" | "tenant" | "system",
  workspaceId: string,
  metadata?: Record<string, unknown>
): WorkflowContext {
  return {
    workflow_id: `wf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    workflow_type: workflowType,
    actor_id: actorId,
    actor_type: actorType,
    workspace_id: workspaceId,
    started_at: new Date(),
    steps: [],
    metadata: metadata || {},
  }
}

// ============================================
// Workflow Step Execution
// ============================================

export type StepExecutor<T> = (context: WorkflowContext) => Promise<ServiceResult<T>>

export async function executeStep<T>(
  context: WorkflowContext,
  stepName: string,
  executor: StepExecutor<T>
): Promise<ServiceResult<T>> {
  const step: WorkflowStep = {
    id: `step_${context.steps.length + 1}`,
    name: stepName,
    status: "in_progress",
    started_at: new Date(),
  }

  context.steps.push(step)

  try {
    const result = await executor(context)

    if (result.success) {
      step.status = "completed"
      step.completed_at = new Date()
      step.result = result.data
    } else {
      step.status = "failed"
      step.completed_at = new Date()
      step.error = result.error
    }

    return result
  } catch (err) {
    step.status = "failed"
    step.completed_at = new Date()
    step.error = createServiceError(
      ERROR_CODES.WORKFLOW_STEP_FAILED,
      `Step "${stepName}" failed with exception`,
      undefined,
      err
    )

    return {
      success: false,
      error: step.error,
    }
  }
}

// ============================================
// Workflow Execution
// ============================================

export interface WorkflowDefinition<TInput, TOutput> {
  name: string
  steps: Array<{
    name: string
    execute: (context: WorkflowContext, input: TInput, previousResults: Record<string, unknown>) => Promise<ServiceResult<unknown>>
    rollback?: (context: WorkflowContext, input: TInput, stepResult: unknown) => Promise<void>
    optional?: boolean
  }>
  cascades?: (context: WorkflowContext, input: TInput, results: Record<string, unknown>) => CascadeEffect[]
  notifications?: (context: WorkflowContext, input: TInput, results: Record<string, unknown>) => NotificationPayload[]
  auditEvents?: (context: WorkflowContext, input: TInput, results: Record<string, unknown>) => AuditEvent[]
  buildOutput: (results: Record<string, unknown>) => TOutput
}

export async function executeWorkflow<TInput, TOutput>(
  definition: WorkflowDefinition<TInput, TOutput>,
  input: TInput,
  actorId: string,
  actorType: "owner" | "staff" | "tenant" | "system",
  workspaceId: string,
  options?: {
    skip_audit?: boolean
    skip_notifications?: boolean
    metadata?: Record<string, unknown>
  }
): Promise<WorkflowResult<TOutput>> {
  const context = createWorkflowContext(
    definition.name,
    actorId,
    actorType,
    workspaceId,
    options?.metadata
  )

  const results: Record<string, unknown> = {}
  const errors: ServiceError[] = []
  const completedSteps: Array<{ step: typeof definition.steps[0]; result: unknown }> = []
  let auditEventIds: string[] = []
  let notificationIds: string[] = []

  console.log(`[Workflow] Starting: ${definition.name} (${context.workflow_id})`)

  // Execute each step
  for (const stepDef of definition.steps) {
    const stepResult = await executeStep(context, stepDef.name, async () => {
      return stepDef.execute(context, input, results)
    })

    if (stepResult.success) {
      results[stepDef.name] = stepResult.data
      completedSteps.push({ step: stepDef, result: stepResult.data })
    } else {
      if (!stepDef.optional) {
        errors.push(stepResult.error!)

        // Rollback completed steps
        console.log(`[Workflow] Step "${stepDef.name}" failed, rolling back...`)
        for (const completed of completedSteps.reverse()) {
          if (completed.step.rollback) {
            try {
              await completed.step.rollback(context, input, completed.result)
              console.log(`[Workflow] Rolled back step: ${completed.step.name}`)
            } catch (rollbackErr) {
              console.error(`[Workflow] Rollback failed for ${completed.step.name}:`, rollbackErr)
            }
          }
        }

        return {
          success: false,
          workflow_id: context.workflow_id,
          steps_completed: completedSteps.length,
          steps_total: definition.steps.length,
          errors,
        }
      } else {
        console.log(`[Workflow] Optional step "${stepDef.name}" failed, continuing...`)
      }
    }
  }

  // Execute cascades
  if (definition.cascades) {
    const cascades = definition.cascades(context, input, results)
    for (const cascade of cascades) {
      await applyCascadeEffect(cascade)
    }
  }

  // Log audit events
  if (!options?.skip_audit && definition.auditEvents) {
    const events = definition.auditEvents(context, input, results)
    if (events.length > 0) {
      const auditResult = await logAuditEvents(events)
      if (auditResult.success && auditResult.data) {
        auditEventIds = auditResult.data
      }
    }
  }

  // Send notifications
  if (!options?.skip_notifications && definition.notifications) {
    const notifications = definition.notifications(context, input, results)
    if (notifications.length > 0) {
      const notifResult = await sendNotifications(notifications)
      if (notifResult.success && notifResult.data) {
        notificationIds = notifResult.data
      }
    }
  }

  console.log(`[Workflow] Completed: ${definition.name} (${context.workflow_id})`)

  return {
    success: true,
    data: definition.buildOutput(results),
    workflow_id: context.workflow_id,
    steps_completed: context.steps.filter((s) => s.status === "completed").length,
    steps_total: definition.steps.length,
    audit_events: auditEventIds,
    notifications_sent: notificationIds,
  }
}

// ============================================
// Cascade Effect Application
// ============================================

async function applyCascadeEffect(effect: CascadeEffect): Promise<void> {
  const supabase = createClient()

  try {
    switch (effect.action) {
      case "update":
        await supabase
          .from(entityTypeToTable(effect.entity_type))
          .update(effect.data || {})
          .eq("id", effect.entity_id)
        break

      case "status_change":
        await supabase
          .from(entityTypeToTable(effect.entity_type))
          .update({ status: effect.data?.status, updated_at: new Date().toISOString() })
          .eq("id", effect.entity_id)
        break

      case "delete":
        await supabase
          .from(entityTypeToTable(effect.entity_type))
          .delete()
          .eq("id", effect.entity_id)
        break

      default:
        console.log(`[Workflow] Cascade action "${effect.action}" not implemented`)
    }
  } catch (err) {
    console.error(`[Workflow] Cascade effect failed:`, err)
  }
}

function entityTypeToTable(entityType: string): string {
  const mapping: Record<string, string> = {
    tenant: "tenants",
    property: "properties",
    room: "rooms",
    bill: "bills",
    payment: "payments",
    expense: "expenses",
    complaint: "complaints",
    notice: "notices",
    visitor: "visitors",
    staff: "staff_members",
    exit_clearance: "exit_clearance",
    approval: "approvals",
    meter_reading: "meter_readings",
    charge: "charges",
    role: "roles",
    workspace: "workspaces",
  }
  return mapping[entityType] || entityType
}

// ============================================
// Simple Operation Wrapper
// ============================================

export interface SimpleOperationOptions {
  entityType: string
  entityId: string
  action: "create" | "update" | "delete" | "status_change"
  actorId: string
  actorType: "owner" | "staff" | "tenant" | "system"
  workspaceId: string
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  metadata?: Record<string, unknown>
  notifications?: NotificationPayload[]
  skipAudit?: boolean
  skipNotifications?: boolean
}

export async function wrapOperation<T>(
  operation: () => Promise<ServiceResult<T>>,
  options: SimpleOperationOptions
): Promise<ServiceResult<T>> {
  // Execute the operation
  const result = await operation()

  if (!result.success) {
    return result
  }

  // Log audit event
  if (!options.skipAudit) {
    const auditEvent = createAuditEvent(
      options.entityType as any,
      options.entityId,
      options.action,
      {
        actor_id: options.actorId,
        actor_type: options.actorType,
        workspace_id: options.workspaceId,
      },
      {
        before: options.before,
        after: options.after,
        metadata: options.metadata,
      }
    )
    await logAuditEvent(auditEvent)
  }

  // Send notifications
  if (!options.skipNotifications && options.notifications) {
    await sendNotifications(options.notifications)
  }

  return result
}

// ============================================
// Export Helpers
// ============================================

export { createAuditEvent } from "./audit.service"
export {
  buildBillNotification,
  buildPaymentNotification,
  buildApprovalRequestNotification,
  buildApprovalDecisionNotification,
  buildExitClearanceNotification,
  buildWelcomeNotification,
} from "./notification.service"
