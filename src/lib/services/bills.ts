/**
 * Bills Service
 *
 * Handles bill creation DB operations extracted from the new-bill page.
 * The page retains UI state, line-item management, and pro-rata calculation;
 * this service handles number generation, period parsing, and DB writes.
 *
 * Also contains generateAutoBills — the business logic extracted from the
 * generate-bills cron route.
 */

import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { parseMonthIndex, startOfMonth, endOfMonth, getNowISO } from "@/lib/date-helpers"
import { cronLogger, logger, extractErrorMeta } from "@/lib/logger"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { formatMonthYear } from "@/lib/format"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"
import { logCronAudit } from "@/lib/cron-handler"
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
import { transformJoin } from "@/lib/supabase/transforms"

export interface BillLineItem {
  type: string
  description: string
  amount: number
}

export interface CreateBillParams {
  ownerId: string
  tenantId: string
  propertyId: string | undefined
  /** e.g. "January 2024" */
  forMonth: string
  billDate: string
  dueDate: string
  subtotal: number
  discountAmount: number
  previousBalance: number
  totalAmount: number
  lineItems: BillLineItem[]
  notes: string | null
  /** IDs of pending charges to link to the new bill */
  pendingChargeIds: string[]
  userId: string
}

/**
 * Generates a bill number, creates the bill record, and links any pending charges.
 * Returns the new bill's ID on success, or throws on DB error.
 */
export async function createBillWithCharges(params: CreateBillParams): Promise<{ billId: string }> {
  const {
    ownerId,
    tenantId,
    propertyId,
    forMonth,
    billDate,
    dueDate,
    subtotal,
    discountAmount,
    previousBalance,
    totalAmount,
    lineItems,
    notes,
    pendingChargeIds,
    userId,
  } = params

  const supabase = createClient()

  // Generate sequential bill number within the owner's account for this year
  const year = new Date(billDate).getFullYear()
  const { count } = await supabase
    .from("bills")
    .select("*", { count: "exact", head: true })
    .eq("owner_id", ownerId)

  const billNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`

  // Parse "Month YYYY" → period_start / period_end
  const [monthName, yearStr] = forMonth.split(" ")
  const refDate = new Date(parseInt(yearStr), parseMonthIndex(monthName), 1)
  const periodStart = startOfMonth(refDate)
  const periodEnd = endOfMonth(refDate)

  const { data: bill, error: billError } = await (supabase
    .from("bills") as ReturnType<typeof supabase.from>)
    .insert(
      withCreatedBy({
        owner_id: ownerId,
        tenant_id: tenantId,
        property_id: propertyId,
        bill_number: billNumber,
        bill_date: billDate,
        due_date: dueDate,
        period_start: periodStart.toISOString().split("T")[0],
        period_end: periodEnd.toISOString().split("T")[0],
        for_month: forMonth,
        subtotal,
        discount_amount: discountAmount,
        previous_balance: previousBalance,
        total_amount: totalAmount,
        balance_due: totalAmount,
        status: "pending",
        line_items: lineItems.map((item) => ({
          type: item.type,
          description: item.description,
          amount: item.amount,
        })),
        notes: notes || null,
        generated_at: getNowISO(),
      }, userId)
    )
    .select()
    .single()

  if (billError) {
    logger.error("Bills service: error creating bill", { detail: billError })
    throw billError
  }

  const billData = bill as { id: string }

  // Link any pending charges to the newly created bill
  if (pendingChargeIds.length > 0) {
    await (supabase
      .from("charges") as ReturnType<typeof supabase.from>)
      .update({ bill_id: billData.id } as Record<string, unknown>)
      .in("id", pendingChargeIds)
  }

  return { billId: billData.id }
}

// ============================================================================
// Auto Bill Generation (extracted from generate-bills cron route)
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
