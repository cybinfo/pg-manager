/**
 * Centralized Cron Job Handler
 *
 * Provides shared boilerplate for all cron routes:
 * - Request validation (rate limiting + cron secret)
 * - Date initialization
 * - Start/complete logging
 * - Error handling with structured logging
 * - Consistent API response formatting
 * - Audit event logging helper
 *
 * Usage:
 * ```typescript
 * import { baseCronHandler } from "@/lib/cron-handler"
 *
 * export const GET = (request: Request) =>
 *   baseCronHandler(request, {
 *     name: "my-cron-job",
 *     execute: async (supabase, today) => {
 *       // Business logic here...
 *       return {
 *         data: { processed: 10 },
 *         message: "Processed 10 items",
 *       }
 *     },
 *   })
 * ```
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { validateCronRequest } from "@/lib/api-middleware"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { apiSuccess, internalError } from "@/lib/api-response"
import { getNowISO } from "@/lib/date-helpers"
import { sendCronFailureAlert } from "@/lib/email"

// ============================================================================
// TYPES
// ============================================================================

/**
 * Result returned by a cron job's execute function.
 * The `data` field is included in the API success response.
 * The `message` field is the human-readable summary.
 */
export interface CronResult<T = Record<string, unknown>> {
  data: T
  message: string
}

/**
 * Configuration for a cron job handler.
 */
export interface CronHandlerConfig<T = Record<string, unknown>> {
  /** A short name for this cron job, used in log messages (e.g., "auto-billing", "expire-memberships") */
  name: string
  /**
   * The business logic for the cron job.
   * Receives a Supabase admin client and the current date.
   * Should return a CronResult with data and a summary message.
   */
  execute: (supabase: SupabaseClient, today: Date) => Promise<CronResult<T>>
}

// ============================================================================
// BASE CRON HANDLER
// ============================================================================

/**
 * Wraps a cron route handler with common boilerplate:
 * 1. validateCronRequest() - rate limiting + cron secret validation
 * 2. Date initialization
 * 3. cronLogger.info start logging
 * 4. Execute the business logic
 * 5. cronLogger.info completion logging
 * 6. Error handling with cronLogger.error + extractErrorMeta
 * 7. apiSuccess response formatting
 */
export async function baseCronHandler<T = Record<string, unknown>>(
  request: Request,
  config: CronHandlerConfig<T>
): Promise<Response> {
  try {
    // SECURITY: Rate limiting + cron secret validation
    const { success, response, supabase } = await validateCronRequest(request)
    if (!success || !supabase) return response!

    const today = new Date()

    cronLogger.info(`${config.name} started`, {
      date: today.toISOString().split("T")[0],
    })

    // Execute the cron job's business logic
    const result = await config.execute(supabase, today)

    cronLogger.info(`${config.name} complete`, result.data as Record<string, unknown>)

    return apiSuccess(result.data, { message: result.message })
  } catch (error) {
    cronLogger.error(`${config.name} cron error`, extractErrorMeta(error))
    // Non-blocking admin alert — ignore if email fails
    sendCronFailureAlert({
      cronName: config.name,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    }).catch(() => {})
    return internalError("Internal server error")
  }
}

// ============================================================================
// AUDIT LOGGING HELPER
// ============================================================================

/**
 * Log an audit event for a cron operation.
 *
 * Looks up the workspace by owner_id, then inserts an audit_events record
 * with actor_type: "system".
 *
 * @param supabase - Admin Supabase client
 * @param ownerId - The owner whose workspace to log against
 * @param params - Audit event parameters
 */
export async function logCronAudit(
  supabase: SupabaseClient,
  ownerId: string,
  params: {
    entityType: string
    entityId: string | null
    action: string
    metadata: Record<string, unknown>
  }
): Promise<void> {
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", ownerId)
    .single()

  if (workspace) {
    await supabase.from("audit_events").insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: params.action,
      actor_id: "system",
      actor_type: "system",
      workspace_id: workspace.id,
      metadata: params.metadata,
      created_at: getNowISO(),
    })
  }
}
