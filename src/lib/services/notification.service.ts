/**
 * Notification Service
 *
 * Centralized notification dispatch for all channels.
 * Supports email, WhatsApp, in-app, and push notifications.
 */

import { createClient } from "@/lib/supabase/client"
import {
  NotificationPayload,
  NotificationChannel,
  NotificationType,
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
} from "./types"
import { logger, extractErrorMeta } from "@/lib/logger"

const notificationLogger = logger.child("notification")

// ============================================
// Notification Templates
// ============================================

interface NotificationTemplate {
  subject?: string // For email
  title: string
  body: string
  action_url?: string
  action_label?: string
}

const NOTIFICATION_TEMPLATES: Record<NotificationType, (data: Record<string, unknown>) => NotificationTemplate> = {
  bill_generated: (data) => ({
    subject: `New Bill Generated - ${data.bill_number}`,
    title: "New Bill Generated",
    body: `Your bill #${data.bill_number} for ${data.month} has been generated. Amount: ${data.amount}`,
    action_url: `/tenant/bills/${data.bill_id}`,
    action_label: "View Bill",
  }),

  payment_received: (data) => ({
    subject: `Payment Received - ${data.amount}`,
    title: "Payment Confirmed",
    body: `We received your payment of ${data.amount} for bill #${data.bill_number}. Thank you!`,
    action_url: `/tenant/payments/${data.payment_id}`,
    action_label: "View Receipt",
  }),

  payment_reminder: (data) => ({
    subject: `Payment Reminder - ${data.amount} due`,
    title: "Payment Reminder",
    body: `Your payment of ${data.amount} for bill #${data.bill_number} is due on ${data.due_date}. Please pay to avoid late fees.`,
    action_url: `/tenant/bills/${data.bill_id}`,
    action_label: "Pay Now",
  }),

  complaint_update: (data) => ({
    subject: `Complaint Update - ${data.complaint_title}`,
    title: "Complaint Status Updated",
    body: `Your complaint "${data.complaint_title}" status has been updated to: ${data.new_status}`,
    action_url: `/tenant/complaints/${data.complaint_id}`,
    action_label: "View Details",
  }),

  approval_required: (data) => ({
    subject: `Approval Required - ${data.request_type}`,
    title: "New Approval Request",
    body: `${data.tenant_name} has requested a ${data.request_type}. Please review and approve/reject.`,
    action_url: `/approvals/${data.approval_id}`,
    action_label: "Review Request",
  }),

  approval_decision: (data) => ({
    subject: `Request ${data.decision} - ${data.request_type}`,
    title: `Request ${data.decision}`,
    body: `Your ${data.request_type} request has been ${String(data.decision).toLowerCase()}. ${data.notes || ""}`,
    action_url: `/tenant/approvals/${data.approval_id}`,
    action_label: "View Details",
  }),

  exit_clearance_initiated: (data) => ({
    subject: `Exit Clearance Initiated - ${data.tenant_name}`,
    title: "Exit Clearance Started",
    body: `Exit clearance has been initiated for ${data.tenant_name}. Expected exit: ${data.exit_date}`,
    action_url: `/exit-clearance/${data.clearance_id}`,
    action_label: "View Clearance",
  }),

  exit_clearance_completed: (data) => ({
    subject: `Exit Clearance Completed - ${data.tenant_name}`,
    title: "Exit Clearance Complete",
    body: `Exit clearance for ${data.tenant_name} has been completed. Final settlement: ${data.settlement_amount}`,
    action_url: `/exit-clearance/${data.clearance_id}`,
    action_label: "View Summary",
  }),

  welcome: (data) => ({
    subject: `Welcome to ${data.property_name}!`,
    title: "Welcome!",
    body: `Welcome to ${data.property_name}! Your tenant portal is now active. You can view bills, raise complaints, and more.`,
    action_url: "/tenant/dashboard",
    action_label: "Get Started",
  }),

  invitation: (data) => ({
    subject: `You're invited to join ${data.workspace_name}`,
    title: "Invitation",
    body: `${data.inviter_name} has invited you to join ${data.workspace_name} as a ${data.role}. Click below to accept.`,
    action_url: `/accept-invite?token=${data.token}`,
    action_label: "Accept Invitation",
  }),
}

// ============================================
// Send Notification
// ============================================

export async function sendNotification(payload: NotificationPayload): Promise<ServiceResult<string>> {
  try {
    const template = NOTIFICATION_TEMPLATES[payload.type](payload.data)
    const results: string[] = []
    const failedChannels: string[] = []

    // Queue notifications for each channel
    for (const channel of payload.channels) {
      const result = await queueNotification(channel, {
        ...payload,
        template,
      })
      if (result.success && result.data) {
        results.push(result.data)
      } else {
        failedChannels.push(channel)
      }
    }

    // Create in-app notification record
    if (payload.channels.includes("in_app")) {
      const inAppResult = await createInAppNotification(payload, template)
      if (!inAppResult.success) {
        failedChannels.push("in_app_record")
      }
    }

    // If all channels failed, return error
    if (results.length === 0 && failedChannels.length > 0) {
      return createErrorResult(
        createServiceError(
          ERROR_CODES.UNKNOWN_ERROR,
          "All notification channels failed",
          { failedChannels, type: payload.type }
        )
      )
    }

    // If some channels failed, return success with partial failure info in the data
    if (failedChannels.length > 0) {
      notificationLogger.warn("Some notification channels failed", { failedChannels, type: payload.type })
    }

    return createSuccessResult(results.join(","))
  } catch (err) {
    notificationLogger.error("Exception sending notification", extractErrorMeta(err))
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Exception sending notification", undefined, err)
    )
  }
}

// ============================================
// Queue Notification (for async processing)
// ============================================

async function queueNotification(
  channel: NotificationChannel,
  payload: NotificationPayload & { template: NotificationTemplate }
): Promise<ServiceResult<string>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("notification_queue")
      .insert({
        channel,
        recipient_id: payload.recipient_id,
        recipient_type: payload.recipient_type,
        notification_type: payload.type,
        subject: payload.template.subject,
        title: payload.template.title,
        body: payload.template.body,
        action_url: payload.template.action_url,
        action_label: payload.template.action_label,
        data: payload.data,
        priority: payload.priority || "normal",
        scheduled_at: payload.scheduled_at?.toISOString() || new Date().toISOString(),
        status: "pending",
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      notificationLogger.warn("Queue insert failed", { channel, errorMessage: error.message })
      return createErrorResult(
        createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Queue insert failed for channel ${channel}`, { errorMessage: error.message })
      )
    }

    return createSuccessResult(data.id)
  } catch (err) {
    notificationLogger.error("Queue exception", { channel, ...extractErrorMeta(err) })
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, `Queue exception for channel ${channel}`, undefined, err)
    )
  }
}

// ============================================
// Create In-App Notification
// ============================================

async function createInAppNotification(
  payload: NotificationPayload,
  template: NotificationTemplate
): Promise<ServiceResult<string>> {
  try {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: payload.recipient_id,
        type: payload.type,
        title: template.title,
        body: template.body,
        action_url: template.action_url,
        data: payload.data,
        read: false,
        created_at: new Date().toISOString(),
      })
      .select("id")
      .single()

    if (error) {
      notificationLogger.warn("In-app notification failed", { errorMessage: error.message })
      return createErrorResult(
        createServiceError(ERROR_CODES.UNKNOWN_ERROR, "In-app notification insert failed", { errorMessage: error.message })
      )
    }

    return createSuccessResult(data.id)
  } catch (err) {
    notificationLogger.error("In-app exception", extractErrorMeta(err))
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "In-app notification exception", undefined, err)
    )
  }
}

// ============================================
// Batch Send Notifications
// ============================================

export async function sendNotifications(payloads: NotificationPayload[]): Promise<ServiceResult<string[]>> {
  const results: string[] = []
  const failures: { type: string; error?: string }[] = []

  for (const payload of payloads) {
    const result = await sendNotification(payload)
    if (result.success && result.data) {
      results.push(result.data)
    } else {
      failures.push({ type: payload.type, error: result.error?.message })
    }
  }

  // If all notifications failed, return error
  if (results.length === 0 && failures.length > 0) {
    notificationLogger.error("All batch notifications failed", { failureCount: failures.length, failures })
    return createErrorResult(
      createServiceError(
        ERROR_CODES.UNKNOWN_ERROR,
        `All ${failures.length} notification(s) failed to send`,
        { failures }
      )
    )
  }

  // If some notifications failed, log warning but return success with sent results
  if (failures.length > 0) {
    notificationLogger.warn("Some batch notifications failed", {
      sentCount: results.length,
      failureCount: failures.length,
      failures,
    })
  }

  return createSuccessResult(results)
}

// ============================================
// Notification Builders
// ============================================

export function buildBillNotification(
  tenantId: string,
  billData: {
    bill_id: string
    bill_number: string
    amount: string
    month: string
  }
): NotificationPayload {
  return {
    type: "bill_generated",
    recipient_id: tenantId,
    recipient_type: "tenant",
    channels: ["email", "in_app"],
    data: billData,
    priority: "normal",
  }
}

export function buildPaymentNotification(
  tenantId: string,
  paymentData: {
    payment_id: string
    amount: string
    bill_number: string
  }
): NotificationPayload {
  return {
    type: "payment_received",
    recipient_id: tenantId,
    recipient_type: "tenant",
    channels: ["email", "whatsapp", "in_app"],
    data: paymentData,
    priority: "normal",
  }
}

export function buildApprovalRequestNotification(
  ownerId: string,
  approvalData: {
    approval_id: string
    tenant_name: string
    request_type: string
  }
): NotificationPayload {
  return {
    type: "approval_required",
    recipient_id: ownerId,
    recipient_type: "owner",
    channels: ["email", "in_app"],
    data: approvalData,
    priority: "high",
  }
}

export function buildApprovalDecisionNotification(
  tenantId: string,
  decisionData: {
    approval_id: string
    request_type: string
    decision: "Approved" | "Rejected"
    notes?: string
  }
): NotificationPayload {
  return {
    type: "approval_decision",
    recipient_id: tenantId,
    recipient_type: "tenant",
    channels: ["email", "in_app"],
    data: decisionData,
    priority: "high",
  }
}

export function buildExitClearanceNotification(
  recipientId: string,
  recipientType: "owner" | "tenant",
  stage: "initiated" | "completed",
  clearanceData: {
    clearance_id: string
    tenant_name: string
    exit_date?: string
    settlement_amount?: string
  }
): NotificationPayload {
  return {
    type: stage === "initiated" ? "exit_clearance_initiated" : "exit_clearance_completed",
    recipient_id: recipientId,
    recipient_type: recipientType,
    channels: ["email", "in_app"],
    data: clearanceData,
    priority: "high",
  }
}

export function buildWelcomeNotification(
  tenantId: string,
  welcomeData: {
    property_name: string
    tenant_name: string
  }
): NotificationPayload {
  return {
    type: "welcome",
    recipient_id: tenantId,
    recipient_type: "tenant",
    channels: ["email", "in_app"],
    data: welcomeData,
    priority: "normal",
  }
}
