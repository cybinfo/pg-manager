import { createClient } from "@supabase/supabase-js"
import { cronLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import { transformJoin } from "@/lib/supabase/transforms"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { apiSuccess, apiError, unauthorized, internalError, ErrorCodes } from "@/lib/api-response"

interface AutoBillingSettings {
  enabled: boolean
  billing_day: number
  due_day_offset: number
  include_pending_charges: boolean
  auto_send_notification: boolean
  last_generated_month: string | null
}

interface LineItem {
  type: string
  description: string
  amount: number
}

export async function GET(request: Request) {
  try {
    // SECURITY: Rate limiting - 2 requests per minute for cron jobs
    const clientId = getClientIdentifier(request)
    const rateLimitResult = await cronLimiter.check(clientId)

    if (!rateLimitResult.success) {
      return apiError(
        ErrorCodes.TOO_MANY_REQUESTS,
        "Rate limit exceeded for cron endpoint",
        {
          status: 429,
          details: { retryAfter: rateLimitResult.retryAfter },
          headers: rateLimitHeaders(rateLimitResult),
        }
      )
    }

    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return unauthorized("Invalid cron secret")
    }

    // Create admin client for cron jobs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.toLocaleString("en-US", { month: "long", year: "numeric" })

    cronLogger.info("Auto-billing started", { month: currentMonth, day: currentDay })

    // Get all owners with auto-billing settings
    const { data: configs, error: configError } = await supabaseAdmin
      .from("owner_config")
      .select("owner_id, auto_billing_settings")

    if (configError) {
      cronLogger.error("Error fetching configs", extractErrorMeta(configError))
      return internalError("Failed to fetch configs")
    }

    let totalBillsGenerated = 0
    let totalOwners = 0

    for (const config of configs || []) {
      const settings = config.auto_billing_settings as AutoBillingSettings

      // Skip if not enabled
      if (!settings?.enabled) continue

      // Check if today is the billing day
      if (currentDay !== settings.billing_day) continue

      // Check if already generated for this month
      if (settings.last_generated_month === currentMonth) {
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
          // CQ-006: Validate tenant has monthly rent set
          const monthlyRent = Number(tenant.monthly_rent)
          if (!tenant.monthly_rent || isNaN(monthlyRent) || monthlyRent <= 0) {
            cronLogger.warn("Tenant missing valid monthly rent, skipping", {
              tenantId: tenant.id,
              tenantName: tenant.name,
              monthlyRent: tenant.monthly_rent,
            })
            errors.push({
              tenant_id: tenant.id,
              error: "Missing or invalid monthly rent",
            })
            billsFailed++
            continue
          }

          // Build line items
          const lineItems: LineItem[] = []

          // Add monthly rent
          lineItems.push({
            type: "Rent",
            description: `Monthly Rent - ${currentMonth}`,
            amount: monthlyRent,
          })

          // Get pending charges if enabled
          if (settings.include_pending_charges) {
            const { data: charges } = await supabaseAdmin
              .from("charges")
              .select("amount, charge_type:charge_types(name), for_period")
              .eq("tenant_id", tenant.id)
              .eq("status", "pending")
              .is("bill_id", null)

            for (const charge of charges || []) {
              // CQ-006: Skip charges with invalid amounts
              const chargeAmount = Number(charge.amount)
              if (isNaN(chargeAmount) || chargeAmount <= 0) {
                cronLogger.debug("Skipping charge with invalid amount", {
                  tenantId: tenant.id,
                  chargeAmount: charge.amount,
                })
                continue
              }
              // Use transformJoin for consistent handling of Supabase joins
              const chargeType = transformJoin(charge.charge_type) as { name?: string } | null
              lineItems.push({
                type: chargeType?.name || "Charge",
                description: charge.for_period || currentMonth,
                amount: chargeAmount,
              })
            }
          }

          // Calculate totals
          const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0)

          // Get previous balance from unpaid bills
          const { data: unpaidBills } = await supabaseAdmin
            .from("bills")
            .select("balance_due")
            .eq("tenant_id", tenant.id)
            .gt("balance_due", 0)
            .neq("status", "paid")

          // CQ-006: Safely calculate previous balance with null checks
          const previousBalance = (unpaidBills || []).reduce(
            (sum, bill) => {
              const balanceDue = Number(bill.balance_due)
              return sum + (isNaN(balanceDue) ? 0 : balanceDue)
            },
            0
          )

          const totalAmountDue = subtotal + previousBalance

          // Calculate due date
          const dueDate = new Date(today)
          dueDate.setDate(dueDate.getDate() + settings.due_day_offset)

          // Calculate period
          const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)

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
            due_date: dueDate.toISOString().split("T")[0],
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            for_month: currentMonth,
            subtotal: subtotal,
            previous_balance: previousBalance,
            total_amount: totalAmountDue,
            balance_due: totalAmountDue,
            status: "pending",
            line_items: lineItems,
            is_auto_generated: true,
            generated_at: new Date().toISOString(),
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
            completed_at: new Date().toISOString(),
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
      // Get workspace_id for this owner
      const { data: workspace } = await supabaseAdmin
        .from("workspaces")
        .select("id")
        .eq("owner_id", ownerId)
        .single()

      if (workspace) {
        await supabaseAdmin.from("audit_events").insert({
          entity_type: "bill",
          entity_id: logEntry?.id || "batch",
          action: "create",
          actor_id: "system",
          actor_type: "system",
          workspace_id: workspace.id,
          metadata: {
            operation: "auto_billing",
            for_month: currentMonth,
            bills_generated: billsGenerated,
            bills_failed: billsFailed,
            total_amount: totalAmount,
          },
          created_at: new Date().toISOString(),
        })
      }

      cronLogger.info("Owner billing complete", { ownerId, billsGenerated, billsFailed })
    }

    cronLogger.info("Auto-billing complete", { totalOwners, totalBillsGenerated })

    return apiSuccess(
      { billsGenerated: totalBillsGenerated, ownersProcessed: totalOwners },
      { message: `Generated ${totalBillsGenerated} bills for ${totalOwners} owners` }
    )
  } catch (error) {
    cronLogger.error("Cron error", extractErrorMeta(error))
    return internalError("Internal server error")
  }
}
