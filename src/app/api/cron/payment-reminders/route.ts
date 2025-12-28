import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { sendPaymentReminder, sendOverdueAlert } from "@/lib/email"

// Create admin Supabase client for cron job
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface NotificationSettings {
  email_reminders_enabled: boolean
  reminder_days_before: number
  send_on_due_date: boolean
  send_overdue_alerts: boolean
  overdue_alert_frequency: "daily" | "weekly"
}

interface OwnerConfig {
  owner_id: string
  default_rent_due_day: number
  notification_settings: NotificationSettings | null
  owner: {
    id: string
    name: string
    email: string
    phone: string | null
    business_name: string | null
  }
}

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  monthly_rent: number
  check_in_date: string
  property: {
    name: string
  }
  room: {
    room_number: string
  }
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron
  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // In development, allow without auth
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  const results = {
    processed: 0,
    reminders_sent: 0,
    overdue_sent: 0,
    errors: [] as string[],
  }

  try {
    const today = new Date()
    const dayOfMonth = today.getDate()

    // Fetch all owners with their notification settings
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
      const ownerConfig = config as unknown as OwnerConfig
      const owner = Array.isArray(ownerConfig.owner) ? ownerConfig.owner[0] : ownerConfig.owner

      if (!owner) continue

      const settings = ownerConfig.notification_settings
      if (!settings?.email_reminders_enabled) continue

      results.processed++

      const rentDueDay = ownerConfig.default_rent_due_day || 1

      // Calculate if we should send reminders today
      const daysUntilDue = calculateDaysUntilDue(dayOfMonth, rentDueDay)
      const shouldSendReminder = daysUntilDue === settings.reminder_days_before
      const shouldSendDueDateReminder = settings.send_on_due_date && daysUntilDue === 0

      // Fetch active tenants for this owner
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

      // Get payment data to calculate pending dues
      const tenantIds = tenants?.map(t => t.id) || []
      const { data: payments } = await supabase
        .from("payments")
        .select("tenant_id, amount")
        .in("tenant_id", tenantIds)

      for (const tenantData of tenants || []) {
        const tenant = tenantData as unknown as Tenant
        const property = Array.isArray(tenant.property) ? tenant.property[0] : tenant.property
        const room = Array.isArray(tenant.room) ? tenant.room[0] : tenant.room

        if (!tenant.email) continue // Skip tenants without email

        // Calculate pending dues
        const tenantPayments = payments?.filter(p => p.tenant_id === tenant.id) || []
        const totalPaid = tenantPayments.reduce((sum, p) => sum + Number(p.amount), 0)
        const monthsActive = Math.max(1, Math.ceil(
          (today.getTime() - new Date(tenant.check_in_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
        ))
        const expectedRent = monthsActive * Number(tenant.monthly_rent)
        const pendingDues = Math.max(0, expectedRent - totalPaid)

        if (pendingDues <= 0) continue // No pending dues

        // Calculate due date for this month
        const dueDate = new Date(today.getFullYear(), today.getMonth(), rentDueDay)
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1)
        }

        // Send reminder if applicable
        if (shouldSendReminder || shouldSendDueDateReminder) {
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

        // Send overdue alert if applicable
        if (settings.send_overdue_alerts && daysUntilDue < 0) {
          const daysOverdue = Math.abs(daysUntilDue)

          // Check frequency - daily or weekly (on Mondays)
          const shouldSendOverdue =
            settings.overdue_alert_frequency === "daily" ||
            (settings.overdue_alert_frequency === "weekly" && today.getDay() === 1)

          if (shouldSendOverdue) {
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
    }

    return NextResponse.json({
      success: true,
      message: "Payment reminders processed",
      ...results,
    })
  } catch (error) {
    console.error("Cron job error:", error)
    return NextResponse.json(
      {
        success: false,
        error: String(error),
        ...results,
      },
      { status: 500 }
    )
  }
}

// Calculate days until due date
function calculateDaysUntilDue(currentDay: number, dueDay: number): number {
  if (currentDay <= dueDay) {
    return dueDay - currentDay
  } else {
    // Due day is in next month
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    return daysInMonth - currentDay + dueDay
  }
}
