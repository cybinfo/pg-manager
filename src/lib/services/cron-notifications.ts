import type { SupabaseClient } from "@supabase/supabase-js"
import { cronLogger } from "@/lib/logger"
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

// ============================================================================
// Daily Summaries
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
// Payment Reminders
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
