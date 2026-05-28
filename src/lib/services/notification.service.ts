/**
 * Notification Service
 *
 * Centralized notification dispatch for all channels.
 * Supports email, WhatsApp, in-app, and push notifications.
 *
 * Also contains sendDailySummaries and sendPaymentReminders — business logic
 * extracted from the daily-summaries and payment-reminders cron routes.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
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
import { logger, cronLogger, extractErrorMeta } from "@/lib/logger"
import { getNowISO } from "@/lib/date-helpers"
import { transformJoin } from "@/lib/supabase/transforms"
import { calculateOccupancyRate } from "@/lib/format"
import { sendDailySummary, sendPaymentReminder, sendOverdueAlert } from "@/lib/email"
import { logCronAudit } from "@/lib/cron-handler"
import {
  generateWhatsAppSummary,
  type DailySummaryData,
} from "@/lib/billing/daily-summaries.helpers"
import {
  calculateDaysUntilDue,
  calculatePendingDues,
  shouldSendReminder,
  shouldSendOverdueAlert,
  type ReminderNotificationSettings,
} from "@/lib/billing/payment-reminders.helpers"

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
        scheduled_at: payload.scheduled_at?.toISOString() || getNowISO(),
        status: "pending",
        created_at: getNowISO(),
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
        created_at: getNowISO(),
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

// ============================================================================
// Daily Summaries (extracted from daily-summaries cron route)
// ============================================================================

interface DailySummaryOwner {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
}

interface DailySummaryOwnerConfig {
  owner_id: string
  notification_settings: {
    daily_summary_enabled?: boolean
    summary_send_time?: string
  } | null
  owner: DailySummaryOwner
}

export interface DailySummariesResult {
  processed: number
  sent: number
  errors: string[]
}

export async function sendDailySummaries(
  supabase: SupabaseClient,
  today: Date
): Promise<DailySummariesResult> {
  const results: DailySummariesResult = { processed: 0, sent: 0, errors: [] }

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
  const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)

  const { data: ownerConfigs, error: configError } = await supabase
    .from("owner_config")
    .select(`
      owner_id,
      notification_settings,
      owner:owners(id, name, email, phone, business_name)
    `)

  if (configError) {
    throw new Error(`Failed to fetch owner configs: ${configError.message}`)
  }

  for (const config of ownerConfigs || []) {
    const ownerConfig = config as unknown as DailySummaryOwnerConfig
    const owner = transformJoin(ownerConfig.owner) as DailySummaryOwner | null

    if (!owner) continue

    const settings = ownerConfig.notification_settings
    if (settings?.daily_summary_enabled === false) continue

    results.processed++

    try {
      const { data: payments } = await supabase
        .from("payments")
        .select("amount, payment_method")
        .eq("owner_id", owner.id)
        .gte("created_at", yesterdayStart.toISOString())
        .lte("created_at", yesterdayEnd.toISOString())

      const paymentsTotal = (payments || []).reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
      const paymentsByMethod: Record<string, number> = {}
      for (const p of payments || []) {
        const method = p.payment_method || "other"
        paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(p.amount)
      }

      const { data: expensesRaw } = await supabase
        .from("expenses")
        .select("amount, expense_type:expense_types(name)")
        .eq("owner_id", owner.id)
        .gte("expense_date", yesterdayStart.toISOString().split("T")[0])
        .lte("expense_date", yesterdayEnd.toISOString().split("T")[0])

      const expenses = (expensesRaw || []).map((e: { amount: number; expense_type: { name: string } | { name: string }[] | null }) => ({
        amount: e.amount,
        expense_type: transformJoin(e.expense_type) as { name: string } | null,
      }))

      const expensesTotal = expenses.reduce((sum: number, e: { amount: number }) => sum + Number(e.amount), 0)
      const expensesByCategory: Record<string, number> = {}
      for (const e of expenses) {
        const category = e.expense_type?.name || "Other"
        expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(e.amount)
      }

      const { data: newTenants } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", owner.id)
        .gte("created_at", yesterdayStart.toISOString())
        .lte("created_at", yesterdayEnd.toISOString())

      const { data: exits } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", owner.id)
        .gte("check_out_date", yesterdayStart.toISOString().split("T")[0])
        .lte("check_out_date", yesterdayEnd.toISOString().split("T")[0])

      const { data: pendingBills } = await supabase
        .from("bills")
        .select("balance_due")
        .eq("owner_id", owner.id)
        .neq("status", "paid")
        .neq("status", "cancelled")

      const pendingTotal = (pendingBills || []).reduce(
        (sum: number, b: { balance_due: number | null }) => sum + Number(b.balance_due || 0),
        0
      )

      const { data: rooms } = await supabase
        .from("rooms")
        .select("total_beds")
        .eq("owner_id", owner.id)

      const { data: activeTenants } = await supabase
        .from("tenants")
        .select("id")
        .eq("owner_id", owner.id)
        .eq("status", "active")

      const totalBeds = (rooms || []).reduce((sum: number, r: { total_beds: number | null }) => sum + (r.total_beds || 1), 0)
      const occupiedBeds = (activeTenants || []).length
      const occupancyRate = calculateOccupancyRate(occupiedBeds, totalBeds)

      const { data: complaints } = await supabase
        .from("complaints")
        .select("id")
        .eq("owner_id", owner.id)
        .in("status", ["open", "acknowledged", "in_progress"])

      const summaryData: DailySummaryData = {
        ownerName: owner.name,
        businessName: owner.business_name,
        date: yesterday,
        paymentsReceived: {
          count: (payments || []).length,
          total: paymentsTotal,
          breakdown: Object.entries(paymentsByMethod).map(([method, amount]) => ({ method, amount })),
        },
        expensesRecorded: {
          count: (expenses || []).length,
          total: expensesTotal,
          breakdown: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
        },
        newTenants: (newTenants || []).length,
        exits: (exits || []).length,
        pendingDues: { total: pendingTotal, count: (pendingBills || []).length },
        occupancyRate,
        openComplaints: (complaints || []).length,
      }

      const whatsappMessage = generateWhatsAppSummary(summaryData)

      const result = await sendDailySummary({
        to: owner.email,
        ownerName: owner.name,
        businessName: owner.business_name || undefined,
        date: yesterday,
        paymentsReceived: summaryData.paymentsReceived.total,
        paymentsCount: summaryData.paymentsReceived.count,
        expensesTotal: summaryData.expensesRecorded.total,
        expensesCount: summaryData.expensesRecorded.count,
        pendingDues: summaryData.pendingDues.total,
        pendingCount: summaryData.pendingDues.count,
        occupancyRate,
        newTenants: summaryData.newTenants,
        exits: summaryData.exits,
        openComplaints: summaryData.openComplaints,
        whatsappMessage,
      })

      if (result.success) {
        results.sent++
      } else {
        results.errors.push(`Failed to send summary to ${owner.email}: ${result.error}`)
      }
    } catch (err) {
      results.errors.push(`Error processing ${owner.email}: ${String(err)}`)
    }
  }

  if (results.sent > 0) {
    for (const config of ownerConfigs || []) {
      const ownerConfig = config as unknown as DailySummaryOwnerConfig
      const owner = transformJoin(ownerConfig.owner) as DailySummaryOwner | null
      if (!owner) continue

      await logCronAudit(supabase, owner.id, {
        entityType: "notice",
        entityId: "batch-summaries",
        action: "create",
        metadata: {
          operation: "daily_summaries",
          summaries_sent: results.sent,
          processed_owners: results.processed,
          date: yesterday.toISOString().split("T")[0],
        },
      })
      break
    }
  }

  cronLogger.info("Daily summaries processed", { ...results })
  return results
}

// ============================================================================
// Payment Reminders (extracted from payment-reminders cron route)
// ============================================================================

interface PaymentReminderOwner {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
}

interface PaymentReminderOwnerConfig {
  owner_id: string
  default_rent_due_day: number
  notification_settings: ReminderNotificationSettings | null
  owner: PaymentReminderOwner
}

interface ReminderTenant {
  id: string
  name: string
  email: string | null
  phone: string
  monthly_rent: number
  check_in_date: string
  property: { name: string }
  room: { room_number: string }
}

export interface PaymentRemindersResult {
  processed: number
  reminders_sent: number
  overdue_sent: number
  errors: string[]
}

export async function sendPaymentReminders(
  supabase: SupabaseClient,
  today: Date
): Promise<PaymentRemindersResult> {
  const results: PaymentRemindersResult = {
    processed: 0,
    reminders_sent: 0,
    overdue_sent: 0,
    errors: [],
  }

  const dayOfMonth = today.getDate()

  const { data: ownerConfigs, error: configError } = await supabase
    .from("owner_config")
    .select(`
      owner_id,
      default_rent_due_day,
      notification_settings,
      owner:owners(id, name, email, phone, business_name)
    `)

  if (configError) {
    throw new Error(`Failed to fetch owner configs: ${configError.message}`)
  }

  for (const config of ownerConfigs || []) {
    const ownerConfig = config as unknown as PaymentReminderOwnerConfig
    const owner = transformJoin(ownerConfig.owner) as PaymentReminderOwner | null

    if (!owner) continue

    const settings = ownerConfig.notification_settings
    if (!settings?.email_reminders_enabled) continue

    results.processed++

    const rentDueDay = ownerConfig.default_rent_due_day || 1
    const daysUntilDue = calculateDaysUntilDue(dayOfMonth, rentDueDay)
    const sendReminder = shouldSendReminder(daysUntilDue, settings)

    const { data: tenants, error: tenantsError } = await supabase
      .from("tenants")
      .select(`
        id,
        name,
        email,
        phone,
        monthly_rent,
        check_in_date,
        property:properties(name),
        room:rooms(room_number)
      `)
      .eq("owner_id", owner.id)
      .eq("status", "active")

    if (tenantsError) {
      results.errors.push(`Failed to fetch tenants for ${owner.email}: ${tenantsError.message}`)
      continue
    }

    const tenantIds = tenants?.map((t: { id: string }) => t.id) || []
    const { data: payments } = await supabase
      .from("payments")
      .select("tenant_id, amount")
      .in("tenant_id", tenantIds)

    for (const tenantData of tenants || []) {
      const tenant = tenantData as unknown as ReminderTenant
      const property = transformJoin(tenant.property) as ReminderTenant["property"] | null
      const room = transformJoin(tenant.room) as ReminderTenant["room"] | null

      if (!tenant.email) continue

      const tenantPayments = payments?.filter((p: { tenant_id: string }) => p.tenant_id === tenant.id) || []
      const totalPaid = tenantPayments.reduce((sum: number, p: { amount: number }) => sum + Number(p.amount), 0)
      const pendingDues = calculatePendingDues(tenant.check_in_date, Number(tenant.monthly_rent), totalPaid, today)

      if (pendingDues <= 0) continue

      const dueDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay)
      if (dueDate < today) dueDate.setMonth(dueDate.getMonth() + 1)

      if (sendReminder) {
        try {
          const result = await sendPaymentReminder({
            to: tenant.email,
            tenantName: tenant.name,
            amount: pendingDues,
            propertyName: property?.name || "Property",
            roomNumber: room?.room_number || "N/A",
            dueDate,
            ownerName: owner.business_name || owner.name,
            ownerPhone: owner.phone || undefined,
          })

          if (result.success) {
            results.reminders_sent++
          } else {
            results.errors.push(`Failed to send reminder to ${tenant.email}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error sending reminder to ${tenant.email}: ${String(err)}`)
        }
      }

      if (shouldSendOverdueAlert(daysUntilDue, today, settings)) {
        const daysOverdue = Math.abs(daysUntilDue)
        try {
          const result = await sendOverdueAlert({
            to: tenant.email,
            tenantName: tenant.name,
            amount: Number(tenant.monthly_rent),
            totalDue: pendingDues,
            propertyName: property?.name || "Property",
            roomNumber: room?.room_number || "N/A",
            dueDate: new Date(today.getFullYear(), today.getMonth(), rentDueDay),
            daysOverdue,
            ownerName: owner.business_name || owner.name,
            ownerPhone: owner.phone || undefined,
          })

          if (result.success) {
            results.overdue_sent++
          } else {
            results.errors.push(`Failed to send overdue alert to ${tenant.email}: ${result.error}`)
          }
        } catch (err) {
          results.errors.push(`Error sending overdue alert to ${tenant.email}: ${String(err)}`)
        }
      }
    }
  }

  if (results.reminders_sent > 0 || results.overdue_sent > 0) {
    for (const config of ownerConfigs || []) {
      const ownerConfig = config as unknown as PaymentReminderOwnerConfig
      const owner = transformJoin(ownerConfig.owner) as PaymentReminderOwner | null
      if (!owner) continue

      await logCronAudit(supabase, owner.id, {
        entityType: "payment",
        entityId: "batch-reminders",
        action: "update",
        metadata: {
          operation: "payment_reminders",
          reminders_sent: results.reminders_sent,
          overdue_sent: results.overdue_sent,
          processed_owners: results.processed,
        },
      })
      break
    }
  }

  cronLogger.info("Payment reminders processed", { ...results })
  return results
}
