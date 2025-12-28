import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

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
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create admin client for cron jobs
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const today = new Date()
    const currentDay = today.getDate()
    const currentMonth = today.toLocaleString("en-US", { month: "long", year: "numeric" })

    console.log(`[Auto-Billing] Running for ${currentMonth}, day ${currentDay}`)

    // Get all owners with auto-billing enabled
    const { data: configs, error: configError } = await supabaseAdmin
      .from("owner_config")
      .select("owner_id, auto_billing_settings")
      .not("auto_billing_settings", "is", null)

    if (configError) {
      console.error("[Auto-Billing] Error fetching configs:", configError)
      return NextResponse.json({ error: "Failed to fetch configs" }, { status: 500 })
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
        console.log(`[Auto-Billing] Already generated for ${config.owner_id} this month`)
        continue
      }

      totalOwners++
      const ownerId = config.owner_id

      console.log(`[Auto-Billing] Processing owner: ${ownerId}`)

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
        console.error(`[Auto-Billing] Error fetching tenants for ${ownerId}:`, tenantsError)
        continue
      }

      for (const tenant of tenants || []) {
        try {
          // Build line items
          const lineItems: LineItem[] = []

          // Add monthly rent
          lineItems.push({
            type: "Rent",
            description: `Monthly Rent - ${currentMonth}`,
            amount: Number(tenant.monthly_rent),
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
              const chargeType = Array.isArray(charge.charge_type)
                ? charge.charge_type[0]
                : charge.charge_type
              lineItems.push({
                type: chargeType?.name || "Charge",
                description: charge.for_period || currentMonth,
                amount: Number(charge.amount),
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

          const previousBalance = (unpaidBills || []).reduce(
            (sum, bill) => sum + Number(bill.balance_due),
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
            console.error(`[Auto-Billing] Error creating bill for tenant ${tenant.id}:`, billError)
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

          console.log(`[Auto-Billing] Generated bill for ${tenant.name}: ₹${totalAmountDue}`)
        } catch (err) {
          console.error(`[Auto-Billing] Error processing tenant ${tenant.id}:`, err)
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

      console.log(
        `[Auto-Billing] Owner ${ownerId}: Generated ${billsGenerated} bills, Failed: ${billsFailed}`
      )
    }

    console.log(
      `[Auto-Billing] Complete. Processed ${totalOwners} owners, generated ${totalBillsGenerated} bills`
    )

    return NextResponse.json({
      success: true,
      message: `Generated ${totalBillsGenerated} bills for ${totalOwners} owners`,
      date: currentMonth,
    })
  } catch (error) {
    console.error("[Auto-Billing] Cron error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
