import { createClient } from "@supabase/supabase-js"
import { sendDailySummary } from "@/lib/email"
import { formatCurrency, formatDate } from "@/lib/notifications"
import { cronLimiter, getClientIdentifier, rateLimitHeaders } from "@/lib/rate-limit"
import { transformJoin } from "@/lib/supabase/transforms"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { apiSuccess, apiError, unauthorized, internalError, ErrorCodes } from "@/lib/api-response"

interface Owner {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
}

interface OwnerConfig {
  owner_id: string
  notification_settings: {
    daily_summary_enabled?: boolean
    summary_send_time?: string // "09:00" format
  } | null
  owner: Owner
}

interface DailySummaryData {
  ownerName: string
  businessName: string | null
  date: Date
  paymentsReceived: {
    count: number
    total: number
    breakdown: { method: string; amount: number }[]
  }
  expensesRecorded: {
    count: number
    total: number
    breakdown: { category: string; amount: number }[]
  }
  newTenants: number
  exits: number
  pendingDues: {
    total: number
    count: number
  }
  occupancyRate: number
  openComplaints: number
}

export async function GET(request: Request) {
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

  // SECURITY: Always verify cron secret - no dev bypass
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized("Invalid cron secret")
  }

  // SECURITY: Require service role key - fail loudly if missing
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceRoleKey) {
    cronLogger.error("SUPABASE_SERVICE_ROLE_KEY is required for cron jobs")
    return internalError("Server configuration error")
  }

  // Create admin Supabase client
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  )

  const results = {
    processed: 0,
    sent: 0,
    errors: [] as string[],
  }

  try {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())
    const yesterdayEnd = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59)

    // Fetch all owners with their notification settings
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
      const ownerConfig = config as unknown as OwnerConfig
      // Use transformJoin for consistent handling of Supabase joins
      const owner = transformJoin(ownerConfig.owner) as Owner | null

      if (!owner) continue

      // Check if daily summary is enabled (default: true)
      const settings = ownerConfig.notification_settings
      if (settings?.daily_summary_enabled === false) continue

      results.processed++

      try {
        // Fetch payments from yesterday
        const { data: payments } = await supabase
          .from("payments")
          .select("amount, payment_method")
          .eq("owner_id", owner.id)
          .gte("created_at", yesterdayStart.toISOString())
          .lte("created_at", yesterdayEnd.toISOString())

        const paymentsTotal = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0)
        const paymentsByMethod: Record<string, number> = {}
        for (const p of payments || []) {
          const method = p.payment_method || "other"
          paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(p.amount)
        }

        // Fetch expenses from yesterday
        const { data: expensesRaw } = await supabase
          .from("expenses")
          .select("amount, expense_type:expense_types(name)")
          .eq("owner_id", owner.id)
          .gte("expense_date", yesterdayStart.toISOString().split("T")[0])
          .lte("expense_date", yesterdayEnd.toISOString().split("T")[0])

        // Transform expenses using transformJoin for consistent handling
        const expenses = (expensesRaw || []).map((e: { amount: number; expense_type: { name: string } | { name: string }[] | null }) => ({
          amount: e.amount,
          expense_type: transformJoin(e.expense_type) as { name: string } | null,
        }))

        const expensesTotal = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
        const expensesByCategory: Record<string, number> = {}
        for (const e of expenses) {
          const category = e.expense_type?.name || "Other"
          expensesByCategory[category] = (expensesByCategory[category] || 0) + Number(e.amount)
        }

        // Fetch new tenants from yesterday
        const { data: newTenants } = await supabase
          .from("tenants")
          .select("id")
          .eq("owner_id", owner.id)
          .gte("created_at", yesterdayStart.toISOString())
          .lte("created_at", yesterdayEnd.toISOString())

        // Fetch exits from yesterday
        const { data: exits } = await supabase
          .from("tenants")
          .select("id")
          .eq("owner_id", owner.id)
          .gte("check_out_date", yesterdayStart.toISOString().split("T")[0])
          .lte("check_out_date", yesterdayEnd.toISOString().split("T")[0])

        // Fetch pending dues
        const { data: pendingBills } = await supabase
          .from("bills")
          .select("balance_due")
          .eq("owner_id", owner.id)
          .neq("status", "paid")
          .neq("status", "cancelled")

        const pendingTotal = (pendingBills || []).reduce((sum, b) => sum + Number(b.balance_due || 0), 0)

        // Fetch occupancy stats
        const { data: rooms } = await supabase
          .from("rooms")
          .select("total_beds")
          .eq("owner_id", owner.id)

        const { data: activeTenants } = await supabase
          .from("tenants")
          .select("id")
          .eq("owner_id", owner.id)
          .eq("status", "active")

        const totalBeds = (rooms || []).reduce((sum, r) => sum + (r.total_beds || 1), 0)
        const occupiedBeds = (activeTenants || []).length
        const occupancyRate = totalBeds > 0 ? (occupiedBeds / totalBeds) * 100 : 0

        // Fetch open complaints
        const { data: complaints } = await supabase
          .from("complaints")
          .select("id")
          .eq("owner_id", owner.id)
          .in("status", ["open", "acknowledged", "in_progress"])

        // Build summary data
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
          pendingDues: {
            total: pendingTotal,
            count: (pendingBills || []).length,
          },
          occupancyRate,
          openComplaints: (complaints || []).length,
        }

        // Generate WhatsApp-ready message
        const whatsappMessage = generateWhatsAppSummary(summaryData)

        // Send email summary
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
          occupancyRate: Math.round(occupancyRate),
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

    // API-011: Add audit logging for daily summaries cron
    if (results.sent > 0) {
      // Log one audit event for the batch operation
      for (const config of ownerConfigs || []) {
        const ownerConfig = config as unknown as OwnerConfig
        const owner = transformJoin(ownerConfig.owner) as Owner | null
        if (!owner) continue

        const { data: workspace } = await supabase
          .from("workspaces")
          .select("id")
          .eq("owner_id", owner.id)
          .single()

        if (workspace) {
          await supabase.from("audit_events").insert({
            entity_type: "notice",
            entity_id: "batch-summaries",
            action: "create",
            actor_id: "system",
            actor_type: "system",
            workspace_id: workspace.id,
            metadata: {
              operation: "daily_summaries",
              summaries_sent: results.sent,
              processed_owners: results.processed,
              date: yesterday.toISOString().split("T")[0],
            },
            created_at: new Date().toISOString(),
          })
          break // Only need one audit event for the batch operation
        }
      }
    }

    cronLogger.info("Daily summaries processed", results)
    return apiSuccess(results, { message: "Daily summaries processed" })
  } catch (error) {
    cronLogger.error("Cron job error", extractErrorMeta(error))
    return apiError(
      ErrorCodes.INTERNAL_ERROR,
      String(error),
      { status: 500, details: results }
    )
  }
}

// Generate WhatsApp-friendly summary message
function generateWhatsAppSummary(data: DailySummaryData): string {
  const lines: string[] = []
  const dateStr = formatDate(data.date)
  const bizName = data.businessName || data.ownerName

  lines.push(`📊 *Daily Summary - ${bizName}*`)
  lines.push(`📅 ${dateStr}`)
  lines.push("")

  // Payments
  if (data.paymentsReceived.count > 0) {
    lines.push(`💰 *Payments Received*`)
    lines.push(`   ${data.paymentsReceived.count} payments = ${formatCurrency(data.paymentsReceived.total)}`)
    for (const { method, amount } of data.paymentsReceived.breakdown) {
      lines.push(`   • ${method}: ${formatCurrency(amount)}`)
    }
    lines.push("")
  } else {
    lines.push(`💰 No payments received`)
    lines.push("")
  }

  // Expenses
  if (data.expensesRecorded.count > 0) {
    lines.push(`📉 *Expenses*`)
    lines.push(`   ${data.expensesRecorded.count} expenses = ${formatCurrency(data.expensesRecorded.total)}`)
    for (const { category, amount } of data.expensesRecorded.breakdown.slice(0, 3)) {
      lines.push(`   • ${category}: ${formatCurrency(amount)}`)
    }
    lines.push("")
  }

  // Net
  const net = data.paymentsReceived.total - data.expensesRecorded.total
  lines.push(`📈 *Net*: ${net >= 0 ? "+" : ""}${formatCurrency(net)}`)
  lines.push("")

  // Status
  lines.push(`🏠 Occupancy: ${data.occupancyRate.toFixed(0)}%`)
  if (data.pendingDues.total > 0) {
    lines.push(`⏰ Pending: ${formatCurrency(data.pendingDues.total)} (${data.pendingDues.count} bills)`)
  }
  if (data.openComplaints > 0) {
    lines.push(`⚠️ Complaints: ${data.openComplaints} open`)
  }

  // Activity
  if (data.newTenants > 0 || data.exits > 0) {
    lines.push("")
    if (data.newTenants > 0) lines.push(`👥 +${data.newTenants} new tenant${data.newTenants > 1 ? "s" : ""}`)
    if (data.exits > 0) lines.push(`👋 -${data.exits} exit${data.exits > 1 ? "s" : ""}`)
  }

  lines.push("")
  lines.push(`_Generated by ManageKar_`)

  return lines.join("\n")
}
