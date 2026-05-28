import type { SupabaseClient } from "@supabase/supabase-js"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { transformJoin } from "@/lib/supabase/transforms"
import { calculateOccupancyRate, formatMonthYear } from "@/lib/format"
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
import {
  buildRentLineItem,
  buildChargeLineItem,
  shouldIncludeCharge,
  sumLineItems,
  calculatePreviousBalance,
  calculateDueDate,
  calculateBillingPeriod,
  shouldSkipBillingDay,
  alreadyGeneratedThisMonth,
  type LineItem,
} from "@/lib/billing/generate-bills.helpers"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { getNowISO } from "@/lib/date-helpers"

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

// ============================================================================
// Auto Bill Generation
// ============================================================================

interface AutoBillingSettings {
  enabled: boolean
  billing_day: number
  due_day_offset: number
  include_pending_charges: boolean
  included_charge_types?: Record<string, boolean>
  grace_period_days?: number
  auto_send_notification: boolean
  auto_reminder_enabled?: boolean
  reminder_days_before?: number
  last_generated_month: string | null
}

export interface GenerateAutoBillsResult {
  billsGenerated: number
  ownersProcessed: number
}

export async function generateAutoBills(
  supabaseAdmin: SupabaseClient,
  today: Date
): Promise<GenerateAutoBillsResult> {
  const currentDay = today.getDate()
  const currentMonth = formatMonthYear(today)

  const { data: configs, error: configError } = await supabaseAdmin
    .from("owner_config")
    .select("owner_id, auto_billing_settings")

  if (configError) {
    cronLogger.error("Error fetching configs", extractErrorMeta(configError))
    throw new Error("Failed to fetch configs")
  }

  let totalBillsGenerated = 0
  let totalOwners = 0

  for (const config of configs || []) {
    const settings = config.auto_billing_settings as AutoBillingSettings

    if (!settings?.enabled) continue

    const { data: ws } = await supabaseAdmin
      .from("workspaces")
      .select("module_config")
      .eq("owner_user_id", config.owner_id)
      .single()
    const wsConfig = ws?.module_config as WorkspaceModuleConfig | null
    if (!isFeatureEnabled(wsConfig, "billing", "autoBilling")) continue

    if (shouldSkipBillingDay(currentDay, settings.billing_day)) continue
    if (alreadyGeneratedThisMonth(settings.last_generated_month, currentMonth)) {
      cronLogger.debug("Already generated this month", { ownerId: config.owner_id })
      continue
    }

    totalOwners++
    const ownerId = config.owner_id

    cronLogger.info("Processing owner", { ownerId })

    const { data: logEntry } = await supabaseAdmin
      .from("bill_generation_log")
      .insert({ owner_id: ownerId, for_month: currentMonth })
      .select()
      .single()

    let billsGenerated = 0
    let billsFailed = 0
    let totalAmount = 0
    const errors: { tenant_id: string; error: string }[] = []

    const { data: tenants, error: tenantsError } = await supabaseAdmin
      .from("tenants")
      .select(`
        id, name, phone, email, monthly_rent, security_deposit,
        property_id, room_id,
        property:properties(name),
        room:rooms(room_number)
      `)
      .eq("owner_id", ownerId)
      .eq("status", "active")

    if (tenantsError) {
      cronLogger.error("Error fetching tenants", { ownerId, ...extractErrorMeta(tenantsError) })
      continue
    }

    for (const tenant of tenants || []) {
      try {
        const { data: existingBill } = await supabaseAdmin
          .from("bills")
          .select("id")
          .eq("tenant_id", tenant.id)
          .eq("for_month", currentMonth)
          .eq("is_auto_generated", true)
          .maybeSingle()

        if (existingBill) {
          cronLogger.debug("Bill already exists for tenant this month, skipping", {
            tenantId: tenant.id,
            forMonth: currentMonth,
          })
          billsGenerated++
          continue
        }

        const rentItem = buildRentLineItem(tenant.monthly_rent, currentMonth)
        if (!rentItem) {
          cronLogger.warn("Tenant missing valid monthly rent, skipping", {
            tenantId: tenant.id,
            tenantName: tenant.name,
            monthlyRent: tenant.monthly_rent,
          })
          errors.push({ tenant_id: tenant.id, error: "Missing or invalid monthly rent" })
          billsFailed++
          continue
        }
        const lineItems: LineItem[] = [rentItem]

        if (settings.include_pending_charges) {
          const { data: charges } = await supabaseAdmin
            .from("charges")
            .select("amount, charge_type:charge_types(name, code), for_period")
            .eq("tenant_id", tenant.id)
            .eq("status", "pending")
            .is("bill_id", null)

          for (const charge of charges || []) {
            const chargeType = transformJoin(charge.charge_type) as { name?: string; code?: string } | null

            if (!shouldIncludeCharge(chargeType, settings.included_charge_types)) {
              cronLogger.debug("Skipping excluded charge type", {
                tenantId: tenant.id,
                chargeTypeCode: chargeType?.code,
              })
              continue
            }

            const chargeItem = buildChargeLineItem(charge.amount, chargeType, charge.for_period, currentMonth)
            if (!chargeItem) {
              cronLogger.debug("Skipping charge with invalid amount", {
                tenantId: tenant.id,
                chargeAmount: charge.amount,
              })
              continue
            }
            lineItems.push(chargeItem)
          }
        }

        const subtotal = sumLineItems(lineItems)

        const { data: unpaidBills } = await supabaseAdmin
          .from("bills")
          .select("balance_due")
          .eq("tenant_id", tenant.id)
          .gt("balance_due", 0)
          .neq("status", "paid")

        const previousBalance = calculatePreviousBalance(unpaidBills || [])
        const totalAmountDue = subtotal + previousBalance
        const dueDateStr = calculateDueDate(today, settings.due_day_offset)
        const { periodStart, periodEnd } = calculateBillingPeriod(today)

        const { data: billNumber } = await supabaseAdmin.rpc("get_next_bill_number", {
          p_owner_id: ownerId,
        })

        const { error: billError } = await supabaseAdmin.from("bills").insert({
          owner_id: ownerId,
          tenant_id: tenant.id,
          property_id: tenant.property_id,
          bill_number: billNumber || `INV-${Date.now()}`,
          bill_date: today.toISOString().split("T")[0],
          due_date: dueDateStr,
          period_start: periodStart,
          period_end: periodEnd,
          for_month: currentMonth,
          subtotal: subtotal,
          previous_balance: previousBalance,
          total_amount: totalAmountDue,
          balance_due: totalAmountDue,
          status: "pending",
          line_items: lineItems,
          is_auto_generated: true,
          generated_at: getNowISO(),
          created_by: SYSTEM_ACTOR_ID,
        })

        if (billError) {
          cronLogger.error("Error creating bill", { tenantId: tenant.id, ...extractErrorMeta(billError) })
          errors.push({ tenant_id: tenant.id, error: billError.message })
          billsFailed++
          continue
        }

        if (settings.include_pending_charges) {
          const { data: newBill } = await supabaseAdmin
            .from("bills")
            .select("id")
            .eq("tenant_id", tenant.id)
            .eq("for_month", currentMonth)
            .single()

          if (newBill) {
            await supabaseAdmin
              .from("charges")
              .update({ bill_id: newBill.id })
              .eq("tenant_id", tenant.id)
              .eq("status", "pending")
              .is("bill_id", null)
          }
        }

        billsGenerated++
        totalAmount += totalAmountDue

        cronLogger.debug("Generated bill", { tenantName: tenant.name, amount: totalAmountDue })
      } catch (err) {
        cronLogger.error("Error processing tenant", { tenantId: tenant.id, ...extractErrorMeta(err) })
        errors.push({
          tenant_id: tenant.id,
          error: err instanceof Error ? err.message : "Unknown error",
        })
        billsFailed++
      }
    }

    if (logEntry) {
      await supabaseAdmin
        .from("bill_generation_log")
        .update({
          bills_generated: billsGenerated,
          bills_failed: billsFailed,
          total_amount: totalAmount,
          error_details: errors.length > 0 ? errors : null,
          completed_at: getNowISO(),
        })
        .eq("id", logEntry.id)
    }

    await supabaseAdmin
      .from("owner_config")
      .update({
        auto_billing_settings: { ...settings, last_generated_month: currentMonth },
      })
      .eq("owner_id", ownerId)

    totalBillsGenerated += billsGenerated

    await logCronAudit(supabaseAdmin, ownerId, {
      entityType: "bill",
      entityId: logEntry?.id || "batch",
      action: "create",
      metadata: {
        operation: "auto_billing",
        for_month: currentMonth,
        bills_generated: billsGenerated,
        bills_failed: billsFailed,
        total_amount: totalAmount,
      },
    })

    cronLogger.info("Owner billing complete", { ownerId, billsGenerated, billsFailed })
  }

  return { billsGenerated: totalBillsGenerated, ownersProcessed: totalOwners }
}
