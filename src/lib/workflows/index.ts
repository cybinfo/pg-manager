/**
 * Workflows Module
 *
 * Centralized workflow definitions for all multi-step operations.
 * Import from here for consistent access to all workflows.
 *
 * @example
 * import { createTenant, recordPayment, initiateExitClearance, processApproval } from '@/lib/workflows'
 */

// Tenant Workflows
export {
  createTenant,
  transferRoom,
  tenantCreateWorkflow,
  roomTransferWorkflow,
} from "./tenant.workflow"
export type {
  TenantCreateInput,
  TenantCreateOutput,
  RoomTransferInput,
  RoomTransferOutput,
} from "./tenant.workflow"

// Payment Workflows
export {
  recordPayment,
  refundPayment,
  recordBulkPayments,
  paymentRecordWorkflow,
  refundPaymentWorkflow,
} from "./payment.workflow"
export type {
  PaymentRecordInput,
  PaymentRecordOutput,
  RefundPaymentInput,
  RefundPaymentOutput,
  BulkPaymentInput,
  BulkPaymentOutput,
} from "./payment.workflow"

// Exit Clearance Workflows
export {
  initiateExitClearance,
  completeExitClearance,
  exitClearanceWorkflow,
  completeExitWorkflow,
} from "./exit.workflow"
export type {
  ExitClearanceInput,
  ExitClearanceOutput,
  CompleteExitInput,
  CompleteExitOutput,
} from "./exit.workflow"

// Approval Workflows
export {
  processApproval,
  createApproval,
  bulkApprove,
  bulkReject,
  processApprovalWorkflow,
  createApprovalWorkflow,
} from "./approval.workflow"
export type {
  ApprovalType,
  ApprovalDecisionInput,
  ApprovalDecisionOutput,
  CreateApprovalInput,
  CreateApprovalOutput,
} from "./approval.workflow"
