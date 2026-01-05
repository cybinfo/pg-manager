/**
 * Centralized Service Layer
 *
 * This module exports all service layer functionality.
 * Import from here for consistent access to all services.
 *
 * @example
 * import { logAuditEvent, sendNotification, executeWorkflow } from '@/lib/services'
 */

// Types
export * from "./types"

// Audit Service
export {
  logAuditEvent,
  logAuditEvents,
  createAuditEvent,
  diffObjects,
  queryAuditEvents,
  getEntityHistory,
} from "./audit.service"
export type { AuditQueryOptions } from "./audit.service"

// Notification Service
export {
  sendNotification,
  sendNotifications,
  buildBillNotification,
  buildPaymentNotification,
  buildApprovalRequestNotification,
  buildApprovalDecisionNotification,
  buildExitClearanceNotification,
  buildWelcomeNotification,
} from "./notification.service"

// Workflow Engine
export {
  createWorkflowContext,
  executeStep,
  executeWorkflow,
  wrapOperation,
} from "./workflow.engine"
export type { WorkflowDefinition, SimpleOperationOptions, StepExecutor } from "./workflow.engine"
