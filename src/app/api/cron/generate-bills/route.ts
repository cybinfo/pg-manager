import { baseCronHandler, logCronAudit } from "@/lib/cron-handler"
import { transformJoin } from "@/lib/supabase/transforms"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { SYSTEM_ACTOR_ID } from "@/lib/constants"
import { getNowISO } from "@/lib/date-helpers"
import { formatMonthYear } from "@/lib/format"
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

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "auto-billing",
    execute: async (supabaseAdmin, today) => {
      const currentDay = today.getDate()
      const currentMonth = formatMonthYear(today)

      // Get all owners with auto-billing settings
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

        // Skip if not enabled, wrong day, or already generated this month
        if (!settings?.enabled) continue
        if (shouldSkipBillingDay(currentDay, settings.billing_day)) continue
        if (alreadyGeneratedThisMonth(settings.last_generated_month, currentMonth)) {
          cronLogger.debug("Already generated this month", { ownerId: config.owner_id })
          continue
        }

        totalOwners++
        const ownerId = config.owner_id

        cronLogger.info("Processing owner", { ownerId })

        // Create log entry
        const { data: logEntry } = await supabaseAdmin
          .from("bill_generation_log")
          .insert({
            owner_id: ownerId,
            for_month: currentMonth,
          })
          .select()
          .single()

        let billsGenerated = 0
        let billsFailed = 0
        let totalAmount = 0
        const errors: { tenant_id: string; error: string }[] = []

        // Get all active tenants for this owner
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
            // Build line items — rent first, then pending charges
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

            // Append pending charges if enabled
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

            // Calculate totals
            const subtotal = sumLineItems(lineItems)

            // Get previous balance from unpaid bills
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

            // Generate bill number
            const { data: billNumber } = await supabaseAdmin.rpc("get_next_bill_number", {
              p_owner_id: ownerId,
            })

            // Create bill
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

            // Link pending charges to this bill
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

        // Update log entry
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

        // Update last generated month
        await supabaseAdmin
          .from("owner_config")
          .update({
            auto_billing_settings: {
              ...settings,
              last_generated_month: currentMonth,
            },
          })
          .eq("owner_id", ownerId)

        totalBillsGenerated += billsGenerated

        // API-011: Add audit logging for cron operations
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

      return {
        data: { billsGenerated: totalBillsGenerated, ownersProcessed: totalOwners },
        message: `Generated ${totalBillsGenerated} bills for ${totalOwners} owners`,
      }
    },
  })
