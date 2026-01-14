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

// BL-009: Database-backed idempotency to prevent duplicate workflow execution
// This replaces the in-memory cache which didn't work across serverless instances
const IDEMPOTENCY_TTL_MINUTES = 5

// Check idempotency using database (works across all instances)
async function checkIdempotency(
  key: string,
  actorId: string
): Promise<{ isDuplicate: boolean; cachedResult: WorkflowResult<unknown> | null }> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc('check_idempotency_key', {
      p_key: key,
      p_workflow_name: 'workflow',
      p_actor_id: actorId,
      p_workspace_id: null,
      p_ttl_minutes: IDEMPOTENCY_TTL_MINUTES,
    })

    if (error) {
      // If RPC doesn't exist, fall back gracefully (no idempotency check)
      console.warn('[Workflow] Idempotency check failed (RPC may not exist):', error.message)
      return { isDuplicate: false, cachedResult: null }
    }

    const result = data?.[0]
    if (result?.is_duplicate) {
      return { isDuplicate: true, cachedResult: result.cached_result as WorkflowResult<unknown> }
    }

    return { isDuplicate: false, cachedResult: null }
  } catch (err) {
    console.warn('[Workflow] Idempotency check error:', err)
    return { isDuplicate: false, cachedResult: null }
  }
}

// Store idempotency result in database
async function storeIdempotencyResult(
  key: string,
  workflowName: string,
  result: WorkflowResult<unknown>,
  actorId: string,
  workspaceId: string
): Promise<void> {
  try {
    const supabase = createClient()
    await supabase.rpc('store_idempotency_result', {
      p_key: key,
      p_workflow_name: workflowName,
      p_result: result,
      p_actor_id: actorId,
      p_workspace_id: workspaceId || null,
      p_ttl_minutes: IDEMPOTENCY_TTL_MINUTES,
    })
  } catch (err) {
    // Non-fatal - just log and continue
    console.warn('[Workflow] Failed to store idempotency result:', err)
  }
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
    idempotency_key?: string // BL-009: Optional idempotency key to prevent duplicate execution
  }
): Promise<WorkflowResult<TOutput>> {
  // BL-009: Check database-backed idempotency
  if (options?.idempotency_key) {
    const { isDuplicate, cachedResult } = await checkIdempotency(options.idempotency_key, actorId)
    if (isDuplicate && cachedResult) {
      console.log(`[Workflow] Returning cached result for idempotency key: ${options.idempotency_key}`)
      return cachedResult as WorkflowResult<TOutput>
    }
  }

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
  // BL-004: Track failed optional steps for visibility
  const failedOptionalSteps: Array<{ step_name: string; error: ServiceError }> = []
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
        // BL-004: Track failed optional steps instead of silently continuing
        console.warn(`[Workflow] Optional step "${stepDef.name}" failed:`, stepResult.error)
        failedOptionalSteps.push({
          step_name: stepDef.name,
          error: stepResult.error!,
        })
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

  // BL-004: Log audit event for failed optional steps (important for debugging)
  if (!options?.skip_audit && failedOptionalSteps.length > 0) {
    const failedStepsAudit = createAuditEvent(
      "workflow" as any,
      context.workflow_id,
      "update",
      {
        actor_id: actorId,
        actor_type: actorType,
        workspace_id: workspaceId,
      },
      {
        metadata: {
          event_subtype: "optional_steps_failed",
          workflow_name: definition.name,
          failed_steps: failedOptionalSteps.map(f => ({
            step: f.step_name,
            error_code: f.error.code,
            error_message: f.error.message,
          })),
        },
      }
    )
    await logAuditEvent(failedStepsAudit)
    console.warn(`[Workflow] ${failedOptionalSteps.length} optional step(s) failed in ${definition.name}`)
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

  const result: WorkflowResult<TOutput> = {
    success: true,
    data: definition.buildOutput(results),
    workflow_id: context.workflow_id,
    steps_completed: context.steps.filter((s) => s.status === "completed").length,
    steps_total: definition.steps.length,
    audit_events: auditEventIds,
    notifications_sent: notificationIds,
    // BL-004: Include failed optional steps in result for visibility
    failed_optional_steps: failedOptionalSteps.length > 0
      ? failedOptionalSteps.map(f => f.step_name)
      : undefined,
  }

  // BL-009: Store result in database for idempotency (async, non-blocking)
  if (options?.idempotency_key) {
    storeIdempotencyResult(
      options.idempotency_key,
      definition.name,
      result,
      actorId,
      workspaceId
    ).catch(err => console.warn('[Workflow] Idempotency store failed:', err))
  }

  return result
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
